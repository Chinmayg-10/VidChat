"use client";

import { createContext, useContext, useEffect, useState,useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { useUser } from "@clerk/nextjs";
import { SocketUser } from "@/types";
import { OngoingCall,incomingCall } from "@/types";
interface ISocketContext {
  socket: Socket | null;
  onlineUsers: SocketUser[] | null;
  ongoingCall: OngoingCall | null;
  handleCall: (
    user: SocketUser,
    callType?: "video" | "audio"

  ) => void;
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

  // Current Socket User
    const currSocketUser=onlineUsers?.find((onlineUser =>onlineUser.userId ===user?.id))

    //Handle Outgoing Call
  const handleCall = useCallback(
    (
      callee: SocketUser,
      callType: "video" | "audio" = "video"
    ) => {
      if (!currSocketUser || !socket) {
        console.log(
          "❌ Cannot make call: socket/user unavailable"
        );
        return;
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
        ongoingCall
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