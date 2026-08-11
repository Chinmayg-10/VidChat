"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef
} from "react";

import { io, Socket } from "socket.io-client";
import { useUser } from "@clerk/nextjs";

import {
  SocketUser,
  OngoingCall,
  IncomingCall,
  PeerData,
} from "@/types";

import Peer, { SignalData } from "simple-peer";

interface ISocketContext {
  socket: Socket | null;
  onlineUsers: SocketUser[] | null;
  ongoingCall: OngoingCall | null;
  localStream: MediaStream | null;

  handleCall: (
    user: SocketUser,
    callType?: "video" | "audio"
  ) => void;

  handleJoinCall: (
    ongoingCall: OngoingCall
  ) => void;

  handleHangup: (data: {
    ongoingCall?: OngoingCall;
    isEmitHangup?: boolean;
  }) => void;

  peer: PeerData | null;
  isCallEnded: boolean;
}

export const SocketContext =
  createContext<ISocketContext | null>(null);

export const SocketContextProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const { user } = useUser();

  const [socket, setSocket] =
    useState<Socket | null>(null);

  const [isConnected, setIsConnected] =
    useState(false);

  const [onlineUsers, setOnlineUsers] =
    useState<SocketUser[] | null>(null);

  const [ongoingCall, setOngoingCall] =
    useState<OngoingCall | null>(null);

  const [localStream, setLocalStream] =
    useState<MediaStream | null>(null);
  const localStreamRef =
  useRef<MediaStream | null>(null);
  const [peer, setPeer] =
    useState<PeerData | null>(null);

  const [isCallEnded, setIsCallEnded] =
    useState(false);

  // ==========================================
  // CURRENT SOCKET USER
  // ==========================================

  const currSocketUser =
    onlineUsers?.find(
      (onlineUser) =>
        onlineUser.userId === user?.id
    );

  // ==========================================
  // GET MEDIA STREAM
  // ==========================================

  const getMediaStream = useCallback(
    async (faceMode?: string) => {
      if (localStreamRef.current) {
        return localStreamRef.current;
      }

      try {
        const stream =
          await navigator.mediaDevices.getUserMedia({
            audio: true,

            video: {
              width: {
                min: 640,
                ideal: 1280,
                max: 1920,
              },

              height: {
                min: 360,
                ideal: 720,
                max: 1080,
              },

              frameRate: {
                min: 16,
                ideal: 30,
                max: 30,
              },

              facingMode: faceMode,
            },
          });
        localStreamRef.current=stream;
        setLocalStream(stream);

        return stream;
      } catch (error) {
        console.error(
          "❌ Failed to get media stream:",
          error
        );
        localStreamRef.current=null;
        setLocalStream(null);

        return null;
      }
    },
    []
  );

  // ==========================================
  // HANGUP
  // ==========================================

  const handleHangup = useCallback(
    ({
      ongoingCall: call,
      isEmitHangup = false,
    }: {
      ongoingCall?: OngoingCall;
      isEmitHangup?: boolean;
    }) => {
      console.log("📴 Ending call");

      // Tell the other user
      if (
        isEmitHangup &&
        socket &&
        user &&
        call
      ) {
        socket.emit("hangup", {
          ongoingCall: call,
          userHangingupId: user.id,
        });
      }

      // Destroy peer
      if (peer?.peerConnection) {
        try {
          peer.peerConnection.destroy();
        } catch (error) {
          console.error(
            "Peer destroy error:",
            error
          );
        }
      }

      // Stop camera + microphone
      if (localStreamRef.current) {
        localStreamRef.current
          .getTracks()
          .forEach((track) => track.stop());
      }

      setPeer(null);
      setLocalStream(null);
      setOngoingCall(null);
      setIsCallEnded(true);
    },
    [socket, user, peer]
  );

  // ==========================================
  // CREATE PEER
  // ==========================================

  const createPeer = useCallback(
    (
      stream: MediaStream,
      initiator: boolean
    ) => {
      const iceServers: RTCIceServer[] = [
        {
          urls: [
            "stun:stun.l.google.com:19302",
            "stun:stun1.l.google.com:19302",
            "stun:stun2.l.google.com:19302",
            "stun:stun3.l.google.com:19302",
            "stun:stun4.l.google.com:19302",
          ],
        },
      ];

      const newPeer = new Peer({
        stream,
        initiator,
        trickle: true,
        config: {
          iceServers,
        },
      });

      // Remote stream
      newPeer.on(
        "stream",
        (remoteStream) => {
          setPeer((prevPeer) => {
            if (!prevPeer) {
              return null;
            }

            return {
              ...prevPeer,
              stream: remoteStream,
            };
          });
        }
      );

      newPeer.on(
        "error",
        (error) => {
          console.error(
            "❌ Peer error:",
            error
          );
        }
      );

      newPeer.on(
        "close",
        () => {
          console.log(
            "📴 Peer connection closed"
          );
        }
      );

      return newPeer;
    },
    []
  );

  // ==========================================
  // OUTGOING CALL
  // ==========================================

  const handleCall = useCallback(
    async (
      callee: SocketUser,
      callType: "video" | "audio" = "video"
    ) => {
      if (
        !currSocketUser ||
        !socket
      ) {
        console.log(
          "❌ Cannot make call"
        );
        return;
      }

      setIsCallEnded(false);

      const stream =
        await getMediaStream();

      if (!stream) {
        return;
      }

      const call: OngoingCall = {
        caller: currSocketUser,
        callee,
        callType,
        isRinging: false,
      };

      setOngoingCall(call);

      console.log(
        `📞 Calling ${callee.profile.fullName}`
      );

      socket.emit("call", {
        caller: currSocketUser,
        callee,
      });
    },
    [
      socket,
      currSocketUser,
      getMediaStream,
    ]
  );

  // ==========================================
  // INCOMING CALL
  // ==========================================

  const onIncomingCall =
    useCallback(
      ({
        caller,
        callee,
      }: IncomingCall) => {
        console.log(
          "📞 Incoming call from:",
          caller.profile.fullName
        );

        setIsCallEnded(false);

        setOngoingCall({
          caller,
          callee,
          callType: "video",
          isRinging: true,
        });
      },
      []
    );

  // ==========================================
  // ACCEPT CALL
  // ==========================================

  const handleJoinCall = useCallback(
    async (call: OngoingCall) => {
      if (!socket) {
        return;
      }

      console.log(
        "✅ Accepting call"
      );

      setIsCallEnded(false);

      setOngoingCall({
        ...call,
        isRinging: false,
      });

      const stream =
        await getMediaStream();

      if (!stream) {
        handleHangup({
                  ongoingCall:
                    call,
                  isEmitHangup: true,
                })
        return;
      }

      // IMPORTANT:
      // CALLEE MUST NOT BE INITIATOR
      const newPeer = createPeer(
        stream,
        false
      );

      setPeer({
        peerConnection: newPeer,
        participantUser:
          call.caller,
        stream: undefined,
      });

      newPeer.on(
        "signal",
        (data: SignalData) => {
          socket.emit(
            "webrtcSignal",
            {
              sdp: data,
              ongoingCall: call,
              isCaller: false,
            }
          );
        }
      );
      socket.emit("callAccepted",{
        ongoingCall:call,
      })
    },
    [
      socket,
      getMediaStream,
      createPeer,
    ]
  );

  //call accepted
  const handleCallAccepted = useCallback(
  ({
    ongoingCall: call,
  }: {
    ongoingCall: OngoingCall;
  }) => {
    console.log("✅ Call accepted");

    if (!socket || !localStreamRef.current) {
      return;
    }

    const newPeer = createPeer(
      localStreamRef.current,
      true
    );

    setPeer({
      peerConnection: newPeer,
      participantUser: call.callee,
      stream: undefined,
    });

    newPeer.on(
      "signal",
      (data: SignalData) => {
        socket.emit("webrtcSignal", {
          sdp: data,
          ongoingCall: call,
          isCaller: true,
        });
      }
    );
  },
  [socket, createPeer]
);
  // ==========================================
  // HANDLE WEBRTC SIGNAL
  // ==========================================

  const completePeerConnection =
    useCallback(
      ({
        sdp,
        ongoingCall: call,
        isCaller,
      }: {
        sdp: SignalData;
        ongoingCall: OngoingCall;
        isCaller: boolean;
      }) => {
        console.log(
          "📡 Processing WebRTC signal"
        );

        if (!peer) {
          console.log(
            "❌ Peer not ready"
          );
          return;
        }

        try {
          peer.peerConnection.signal(
            sdp
          );
        } catch (error) {
          console.error(
            "❌ Signal error:",
            error
          );
        }
      },
      [peer]
    );

  // ==========================================
  // INITIALIZE SOCKET
  // ==========================================

  useEffect(() => {
    const newSocket = io();

    setSocket(newSocket);

    newSocket.on(
      "connect",
      () => {
        console.log(
          "✅ Socket connected:",
          newSocket.id
        );

        setIsConnected(true);
      }
    );

    newSocket.on(
      "disconnect",
      () => {
        console.log(
          "❌ Socket disconnected"
        );

        setIsConnected(false);
      }
    );

    newSocket.on(
      "connect_error",
      (error) => {
        console.error(
          "❌ Socket connection error:",
          error.message
        );
      }
    );

    return () => {
      newSocket.disconnect();
    };
  }, []);

  // ==========================================
  // REGISTER USER
  // ==========================================

  useEffect(() => {
    if (
      !socket ||
      !isConnected ||
      !user
    ) {
      return;
    }

    socket.emit(
      "addNewUser",
      {
        id: user.id,

        fullName:
          user.fullName ||
          user.firstName ||
          user.username ||
          "User",

        imageUrl: user.imageUrl,
      }
    );

    const handleOnlineUsers =
      (users: SocketUser[]) => {
        setOnlineUsers(users);
      };

    socket.on(
      "getOnlineUsers",
      handleOnlineUsers
    );

    return () => {
      socket.off(
        "getOnlineUsers",
        handleOnlineUsers
      );
    };
  }, [
    socket,
    isConnected,
    user,
  ]);

  // ==========================================
  // SOCKET CALL EVENTS
  // ==========================================

  useEffect(() => {
    if (
      !socket ||
      !isConnected
    ) {
      return;
    }

    socket.on(
      "incomingCall",
      onIncomingCall
    );
    socket.on(
      "callAccepted",
      handleCallAccepted
    );
    socket.on(
      "webrtcSignal",
      completePeerConnection
    );

    const onRemoteHangup = () => {
      console.log(
        "📴 Remote user ended call"
      );

      handleHangup({
        isEmitHangup: false,
      });
    };

    socket.on(
      "hangUp",
      onRemoteHangup
    );

    return () => {
      socket.off(
        "incomingCall",
        onIncomingCall
      );

      socket.off(
        "webrtcSignal",
        completePeerConnection
      );
      socket.off(
        "callAccepted",
        handleCallAccepted
      )
      socket.off(
        "hangUp",
        onRemoteHangup
      );
    };
  }, [
    socket,
    isConnected,
    onIncomingCall,
    completePeerConnection,
    handleHangup,
    handleCallAccepted
  ]);

  // ==========================================
  // RESET CALL ENDED MESSAGE
  // ==========================================

  useEffect(() => {
    if (!isCallEnded) {
      return;
    }

    const timeout =
      setTimeout(() => {
        setIsCallEnded(false);
      }, 2000);

    return () =>
      clearTimeout(timeout);
  }, [isCallEnded]);

  // ==========================================
  // PROVIDER
  // ==========================================

  return (
    <SocketContext.Provider
      value={{
        socket,
        onlineUsers,
        handleCall,
        ongoingCall,
        localStream,
        handleJoinCall,
        peer,
        handleHangup,
        isCallEnded,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};

// ==========================================
// HOOK
// ==========================================

export const useSocket = () => {
  const context =
    useContext(SocketContext);

  if (!context) {
    throw new Error(
      "useSocket must be used within SocketContextProvider"
    );
  }

  return context;
};