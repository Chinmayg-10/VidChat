"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
} from "react";

import { io, Socket } from "socket.io-client";
import { useUser } from "@clerk/nextjs";

import Peer, { SignalData } from "simple-peer";

import {
  SocketUser,
  OngoingCall,
  IncomingCall,
  PeerData,
} from "@/types";

interface ISocketContext {
  socket: Socket | null;
  onlineUsers: SocketUser[] | null;

  ongoingCall: OngoingCall | null;

  localStream: MediaStream | null;

  peer: PeerData | null;

  handleCall: (
    user: SocketUser,
    callType?: "video" | "audio"
  ) => void;

  handleJoinCall: (
    ongoingCall: OngoingCall
  ) => void;

  handleHangup: () => void;
}

export const SocketContext =
  createContext<ISocketContext | null>(null);

export const SocketContextProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const { user } = useUser();

  // =====================================================
  // STATE
  // =====================================================

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

  const [peer, setPeer] =
    useState<PeerData | null>(null);

  // =====================================================
  // REFS
  // =====================================================

  // Ref is important because MediaStream can be requested
  // before React state finishes updating.
  const localStreamRef =
    useRef<MediaStream | null>(null);

  const peerRef =
    useRef<Peer.Instance | null>(null);

  // =====================================================
  // CURRENT USER
  // =====================================================

  const currSocketUser =
    onlineUsers?.find(
      (onlineUser) =>
        onlineUser.userId === user?.id
    );

  // =====================================================
  // GET MEDIA STREAM
  // =====================================================

  const getMediaStream = useCallback(
    async (
      callType: "video" | "audio" = "video"
    ) => {
      // Already have stream
      if (localStreamRef.current) {
        return localStreamRef.current;
      }

      try {
        console.log(
          "🎥 Requesting media stream..."
        );

        const stream =
          await navigator.mediaDevices.getUserMedia({
            audio: true,

            video:
              callType === "video"
                ? {
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

                    facingMode: "user",
                  }
                : false,
          });

        console.log(
          "✅ Media stream obtained"
        );

        // Store immediately in ref
        localStreamRef.current = stream;

        // Store for React UI
        setLocalStream(stream);

        return stream;
      } catch (error) {
        console.error(
          "❌ Failed to get media stream:",
          error
        );

        localStreamRef.current = null;
        setLocalStream(null);

        return null;
      }
    },
    []
  );

  // =====================================================
  // CREATE PEER
  // =====================================================

  const createPeer = useCallback(
    (
      stream: MediaStream,
      initiator: boolean
    ) => {
      console.log(
        "🔗 Creating peer:",
        {
          initiator,
        }
      );

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

      peerRef.current = newPeer;

      // =================================================
      // REMOTE STREAM
      // =================================================

      newPeer.on(
        "stream",
        (remoteStream) => {
          console.log(
            "🎥 Remote stream received"
          );

          setPeer((previousPeer) => {
            if (!previousPeer) {
              return previousPeer;
            }

            return {
              ...previousPeer,
              stream: remoteStream,
            };
          });
        }
      );

      // =================================================
      // PEER ERROR
      // =================================================

      newPeer.on(
        "error",
        (error) => {
          console.error(
            "❌ WebRTC Peer Error:",
            error
          );
        }
      );

      // =================================================
      // PEER CLOSE
      // =================================================

      newPeer.on("close", () => {
        console.log(
          "📴 Peer connection closed"
        );

        peerRef.current = null;
      });

      return newPeer;
    },
    []
  );

  // =====================================================
  // HANDLE OUTGOING CALL
  // =====================================================

  const handleCall = useCallback(
    async (
      callee: SocketUser,
      callType: "video" | "audio" = "video"
    ) => {
      if (!socket) {
        console.log(
          "❌ Socket unavailable"
        );
        return;
      }

      if (!currSocketUser) {
        console.log(
          "❌ Current socket user unavailable"
        );
        return;
      }

      if (!callee?.socketId) {
        console.log(
          "❌ Callee socket unavailable"
        );
        return;
      }

      if (ongoingCall) {
        console.log(
          "⚠️ Already in a call"
        );
        return;
      }

      // ---------------------------------------------
      // Get media
      // ---------------------------------------------

      const stream =
        await getMediaStream(callType);

      if (!stream) {
        return;
      }

      // ---------------------------------------------
      // Create call
      // ---------------------------------------------

      const call: OngoingCall = {
        caller: currSocketUser,

        callee,

        callType,

        isRinging: false,
      };

      setOngoingCall(call);

      console.log(
        "📞 Calling:",
        callee.profile.fullName
      );

      // ---------------------------------------------
      // Notify callee
      // ---------------------------------------------

      socket.emit("call", {
        caller: currSocketUser,
        callee,
      });

      /*
       * IMPORTANT:
       *
       * We DON'T create the Peer here.
       *
       * We wait for the callee to accept.
       */
    },
    [
      socket,
      currSocketUser,
      ongoingCall,
      getMediaStream,
    ]
  );

  // =====================================================
  // INCOMING CALL
  // =====================================================

  const onIncomingCall = useCallback(
    ({
      caller,
      callee,
    }: IncomingCall) => {
      console.log(
        "📲 Incoming call from:",
        caller.profile.fullName
      );

      setOngoingCall({
        caller,

        callee,

        callType: "video",

        isRinging: true,
      });
    },
    []
  );

  // =====================================================
  // ACCEPT CALL
  // =====================================================

  const handleJoinCall = useCallback(
    async (call: OngoingCall) => {
      if (!socket) {
        console.log(
          "❌ Socket unavailable"
        );
        return;
      }

      console.log(
        "📞 Accepting call from:",
        call.caller.profile.fullName
      );

      // ---------------------------------------------
      // Get media
      // ---------------------------------------------

      const stream =
        await getMediaStream(
          call.callType ?? "video"
        );

      if (!stream) {
        return;
      }

      // ---------------------------------------------
      // Stop ringing
      // ---------------------------------------------

      setOngoingCall({
        ...call,
        isRinging: false,
      });

      // ---------------------------------------------
      // Tell caller that call was accepted
      // ---------------------------------------------

      socket.emit("acceptCall", {
        ongoingCall: call,
      });

      /*
       * IMPORTANT:
       *
       * Callee does NOT create initiator peer.
       *
       * Caller creates initiator peer after
       * receiving "callAccepted".
       */
    },
    [
      socket,
      getMediaStream,
    ]
  );

  // =====================================================
  // CALL ACCEPTED BY CALLEE
  // =====================================================

  const onCallAccepted = useCallback(
    async (call: OngoingCall) => {
      if (!socket) {
        return;
      }

      console.log(
        "✅ Call accepted by:",
        call.callee.profile.fullName
      );

      const stream =
        localStreamRef.current ??
        (await getMediaStream(
          call.callType ?? "video"
        ));

      if (!stream) {
        return;
      }

      // ---------------------------------------------
      // Caller creates initiator
      // ---------------------------------------------

      const newPeer = createPeer(
        stream,
        true
      );

      setPeer({
        peerConnection: newPeer,

        participantUser:
          call.callee,

        stream: undefined,
      });

      // ---------------------------------------------
      // Send OFFER
      // ---------------------------------------------

      newPeer.on(
        "signal",
        (data: SignalData) => {
          console.log(
            "📡 Caller sending WebRTC signal"
          );

          socket.emit(
            "webrtcSignal",
            {
              sdp: data,

              ongoingCall: call,

              isCaller: true,
            }
          );
        }
      );
    },
    [
      socket,
      createPeer,
      getMediaStream,
    ]
  );

  // =====================================================
  // HANDLE WEBRTC SIGNAL
  // =====================================================

  const completePeerConnection =
    useCallback(
      async ({
        sdp,
        ongoingCall: call,
        isCaller,
      }: {
        sdp: SignalData;

        ongoingCall: OngoingCall;

        isCaller: boolean;
      }) => {
        console.log(
          "📡 WebRTC signal received:",
          {
            isCaller,
          }
        );

        // =================================================
        // EXISTING PEER
        // =================================================

        if (peerRef.current) {
          try {
            peerRef.current.signal(sdp);

            console.log(
              "✅ Signal passed to existing peer"
            );
          } catch (error) {
            console.error(
              "❌ Failed to pass signal:",
              error
            );
          }

          return;
        }

        // =================================================
        // CALLEE RECEIVES CALLER OFFER
        // =================================================

        if (isCaller === true) {
          console.log(
            "📥 Caller offer received"
          );

          const stream =
            localStreamRef.current ??
            (await getMediaStream(
              call.callType ?? "video"
            ));

          if (!stream) {
            return;
          }

          /*
           * CALLEE = initiator FALSE
           */

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

          // ---------------------------------------------
          // Send ANSWER
          // ---------------------------------------------

          newPeer.on(
            "signal",
            (data: SignalData) => {
              console.log(
                "📡 Callee sending WebRTC answer"
              );

              socket?.emit(
                "webrtcSignal",
                {
                  sdp: data,

                  ongoingCall: call,

                  isCaller: false,
                }
              );
            }
          );

          // ---------------------------------------------
          // Apply OFFER
          // ---------------------------------------------

          try {
            newPeer.signal(sdp);
          } catch (error) {
            console.error(
              "❌ Failed to apply caller offer:",
              error
            );
          }
        }
      },
      [
        socket,
        createPeer,
        getMediaStream,
      ]
    );

  // =====================================================
  // HANGUP
  // =====================================================

  const handleHangup = useCallback(() => {
    console.log(
      "📴 Ending call..."
    );

    // ---------------------------------------------
    // Notify remote user
    // ---------------------------------------------

    if (
      socket &&
      ongoingCall &&
      user
    ) {
      const remoteUser =
        ongoingCall.caller.userId === user.id
          ? ongoingCall.callee
          : ongoingCall.caller;

      if (remoteUser?.socketId) {
        socket.emit("hangup", {
          socketId:
            remoteUser.socketId,
        });
      }
    }

    // ---------------------------------------------
    // Destroy peer
    // ---------------------------------------------

    if (peerRef.current) {
      try {
        peerRef.current.destroy();
      } catch (error) {
        console.error(
          "❌ Failed to destroy peer:",
          error
        );
      }

      peerRef.current = null;
    }

    // ---------------------------------------------
    // Stop media
    // ---------------------------------------------

    if (localStreamRef.current) {
      localStreamRef.current
        .getTracks()
        .forEach((track) => {
          track.stop();
        });

      localStreamRef.current = null;
    }

    // ---------------------------------------------
    // Clear React state
    // ---------------------------------------------

    setPeer(null);

    setLocalStream(null);

    setOngoingCall(null);

    console.log(
      "✅ Call ended"
    );
  }, [
    socket,
    ongoingCall,
    user,
  ]);

  // =====================================================
  // SOCKET INITIALIZATION
  // =====================================================

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
          error
        );
      }
    );

    return () => {
      newSocket.disconnect();
    };
  }, []);

  // =====================================================
  // REGISTER USER
  // =====================================================

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
          user.fullName ??
          user.firstName ??
          "User",

        imageUrl:
          user.imageUrl ?? "",
      }
    );

    const handleOnlineUsers = (
      users: SocketUser[]
    ) => {
      console.log(
        "👥 Online Users:",
        users
      );

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

  // =====================================================
  // CALL + WEBRTC EVENTS
  // =====================================================

  useEffect(() => {
    if (
      !socket ||
      !isConnected
    ) {
      return;
    }

    // Incoming call
    socket.on(
      "incomingCall",
      onIncomingCall
    );

    // Caller gets acceptance
    socket.on(
      "callAccepted",
      onCallAccepted
    );

    // WebRTC signaling
    socket.on(
      "webrtcSignal",
      completePeerConnection
    );

    return () => {
      socket.off(
        "incomingCall",
        onIncomingCall
      );

      socket.off(
        "callAccepted",
        onCallAccepted
      );

      socket.off(
        "webrtcSignal",
        completePeerConnection
      );
    };
  }, [
    socket,
    isConnected,
    onIncomingCall,
    onCallAccepted,
    completePeerConnection,
  ]);

  // =====================================================
  // REMOTE HANGUP
  // =====================================================

  useEffect(() => {
    if (!socket) {
      return;
    }

    const handleRemoteHangup = () => {
      console.log(
        "📴 Remote user ended call"
      );

      if (peerRef.current) {
        try {
          peerRef.current.destroy();
        } catch (error) {
          console.error(error);
        }

        peerRef.current = null;
      }

      if (localStreamRef.current) {
        localStreamRef.current
          .getTracks()
          .forEach((track) => {
            track.stop();
          });

        localStreamRef.current = null;
      }

      setPeer(null);

      setLocalStream(null);

      setOngoingCall(null);
    };

    socket.on(
      "callEnded",
      handleRemoteHangup
    );

    return () => {
      socket.off(
        "callEnded",
        handleRemoteHangup
      );
    };
  }, [socket]);

  // =====================================================
  // CLEANUP
  // =====================================================

  useEffect(() => {
    return () => {
      if (peerRef.current) {
        try {
          peerRef.current.destroy();
        } catch {}
      }

      if (localStreamRef.current) {
        localStreamRef.current
          .getTracks()
          .forEach((track) => {
            track.stop();
          });
      }
    };
  }, []);

  // =====================================================
  // PROVIDER
  // =====================================================

  return (
    <SocketContext.Provider
      value={{
        socket,

        onlineUsers,

        ongoingCall,

        localStream,

        peer,

        handleCall,

        handleJoinCall,

        handleHangup,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};

// =====================================================
// HOOK
// =====================================================

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