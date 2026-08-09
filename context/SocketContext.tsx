"use client";

import { createContext, useContext, useEffect, useState,useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { useUser } from "@clerk/nextjs";
import { SocketUser } from "@/types";
import { OngoingCall,incomingCall,PeerData } from "@/types";
import Peer,{ SignalData} from 'simple-peer'
interface ISocketContext {
  socket: Socket | null;
  onlineUsers: SocketUser[] | null;
  ongoingCall: OngoingCall | null;
  localStream:MediaStream | null;
  handleCall: (
    user: SocketUser,
    callType?: "video" | "audio"

  ) => void;
  handleJoinCall: (ongoingCall:OngoingCall)=>void
}

export const SocketContext = createContext<ISocketContext | null>(null);

export const SocketContextProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const { user } = useUser();

  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<SocketUser[] | null>(null);
  const [ongoingCall, setOngoingCall] = useState<OngoingCall | null>(null);
  const [localStream,setLocalStream]=useState<MediaStream | null>(null)
  const [peer,setPeer]=useState<PeerData |null>(null)
  // Current Socket User
    const currSocketUser=onlineUsers?.find((onlineUser =>onlineUser.userId ===user?.id))

    const getMediaStream=useCallback(async(faceMode?: string)=>{
      if(localStream){
        return localStream
      }
      try{
        const devices=await navigator.mediaDevices.enumerateDevices()
        const videoDevices=devices.filter(device => device.kind === "videoinput")
        const stream=await navigator.mediaDevices.getUserMedia({
          audio:true,
          video:{
            width:{min:640 , ideal:1280,max:1920},
            height:{min:360,ideal:720,max:1080},
            frameRate:{min:16,ideal:30,max:30},
            facingMode:videoDevices.length >0 ?faceMode : undefined
          }
        })
        setLocalStream(stream)
        return stream;
      }
      catch(error){
        console.log('Failed to get the stream',error)
        setLocalStream(null);
        return null
      }
    },[localStream])
    //Handle Outgoing Call
  const handleCall =useCallback(
    async(
      callee: SocketUser,
      callType: "video" | "audio" = "video"
    ) => {
      if (!currSocketUser || !socket) {
        console.log(
          "❌ Cannot make call: socket/user unavailable"
        );
        return;
      }
      const stream=await getMediaStream()
      //if we do not have camera
      if(!stream){
        return ;
      }


      const caller = currSocketUser;

      const call: OngoingCall = {
        caller,
        callee,
        callType,
        isRinging: false,
      };

      // Store call locally
      setOngoingCall(call);

      console.log(
        "📞 Calling:",
        callee.profile.fullName
      );

      // Send call to server
      socket.emit("call", {
        caller,
        callee,
      });
    },
    [socket, currSocketUser]
  );

  //Handle Incoming Call
  const onIncomingCall = useCallback(
  ({ caller, callee }: incomingCall) => {
    setOngoingCall({
      caller,
      callee,
      callType: "video",
      isRinging: true,
    });
  },
  []
);
const handleHangup=useCallback(()=>{},[])
const createPeer=useCallback((stream:MediaStream,initiator:boolean)=>{
  const iceServers:RTCIceServer[]=[
    {
      urls:[
        "stun:stun.1.goggle.com:19302",
        "stun:stun1.1.goggle.com:19302",
        "stun:stun2.1.goggle.com:19302",
        "stun:stun3.1.goggle.com:19302",
        "stun:stun4.1.goggle.com:19302",
      ]
    }
  ]

  const peer=new Peer({
    stream,
    initiator,
    trickle:true,
    config:{iceServers}
  })
  peer.on('stream',(stream)=>{
    setPeer((prevPeer)=>{
      if(prevPeer){
        return {...prevPeer,stream}
      }
      return prevPeer
    })
  });
  peer.on("error",console.error)
  peer.on("close",()=>handleHangup())
  const rtcPeerConnection:RTCPeerConnection=(peer as any)._pc
  rtcPeerConnection.oniceconnectionstatechange=async()=>{
    if(rtcPeerConnection.iceConnectionState==="disconnected" || rtcPeerConnection.iceConnectionState==="failed"){
      handleHangup()
    }
  }
  return peer
},[ongoingCall,setPeer])

const completePeerConnection=useCallback(async(connectionData:{sdp:SignalData,ongoingCall:OngoingCall,isCaller:boolean})=>{
  if(!localStream){
    return;
  }
  if(peer){
    peer.peerConnection?.signal(connectionData.sdp)
    return;
  }
  const newPeer=createPeer(localStream,true)
  setPeer({
    peerConnection:newPeer,
    participantUser:connectionData.ongoingCall.callee,
    stream:undefined
  })
  newPeer.on('signal',async(data:SignalData)=>{
    if(socket){
      //emit offer
      socket.emit('webrtcSignal',{
        sdp:data,
        ongoingCall,
        isCaller:true
      })
    }
  })

},[localStream,createPeer,peer,ongoingCall])
const handleJoinCall=useCallback(async(ongoingCall:OngoingCall)=>{
  //join call
  setOngoingCall(prev =>{
    if(prev){
      return{...prev,isRinging:false}
    }
    return prev
  })
  const stream=await getMediaStream()
  if(!stream){
    return
  }
  const newPeer=createPeer(stream,true)
  setPeer({
    peerConnection:newPeer,
    participantUser:ongoingCall.caller,
    stream:undefined
  })
  newPeer.on('signal',async(data:SignalData)=>{
    if(socket){
      //emit offer
      socket.emit('webrtcSignal',{
        sdp:data,
        ongoingCall,
        isCaller:false
      })
    }
  })
},[socket,currSocketUser])
//Initialize Socket
  useEffect(() => {
    const newSocket = io();

    setSocket(newSocket);

    newSocket.on("connect", () => {
      console.log("✅ Connected:", newSocket.id);
      setIsConnected(true);
    });

    newSocket.on("disconnect", () => {
      console.log("❌ Disconnected");
      setIsConnected(false);
    });
    newSocket.on(
      "connect_error",
      (error) => {
        console.error(
          "❌ Socket Connection Error:",
          error
        );
      }
    );
    return () => {
      newSocket.disconnect();
    };
  }, []);

  //Register User
  useEffect(() => {
    if (!socket || !isConnected || !user) return;

    socket.emit("addNewUser", {
      id: user.id,
      fullName: user.fullName,
      imageUrl: user.imageUrl,
    });
    const handleOnlineUsers = (
      users: SocketUser[]
    ) => {
      console.log(
        "👥 Online Users:",
        users
      );

      setOnlineUsers(users);
    };
    socket.on("getOnlineUsers",handleOnlineUsers)

    return () => {
      socket.off("getOnlineUsers",handleOnlineUsers);
    };
  }, [socket, isConnected, user]);

  //Listen For Incoming Calls
  useEffect(()=>{
    if(!socket || !isConnected){
        return;
    }
    socket.on('incomingCall',onIncomingCall)
    socket.on('webrtcSignal',completePeerConnection)
    return()=>{
        socket.off("incomingCall",onIncomingCall)
    }
  },[socket,isConnected,onIncomingCall])

  return (
    <SocketContext.Provider
      value={{
        socket,
        onlineUsers,
        handleCall,
        ongoingCall,
        localStream,
        handleJoinCall
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);

  if (!context) {
    throw new Error(
      "useSocket must be used within SocketContextProvider"
    );
  }

  return context;
};