"use client";

import VideoContainer from "./VideoContainer";

import {
  useSocket,
} from "@/context/SocketContext";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  MdMic,
  MdMicOff,
  MdVideocam,
  MdVideocamOff,
} from "react-icons/md";

const VideoCall = () => {
  const {
    localStream,
    peer,
    ongoingCall,
    isCallEnded,
    handleHangup,
  } = useSocket();

  const [
    isMicOn,
    setIsMicOn,
  ] = useState(true);

  const [
    isVidOn,
    setIsVidOn,
  ] = useState(true);

  useEffect(() => {
    if (!localStream) {
      setIsMicOn(false);
      setIsVidOn(false);
      return;
    }

    const videoTrack =
      localStream.getVideoTracks()[0];

    const audioTrack =
      localStream.getAudioTracks()[0];

    if (videoTrack) {
      setIsVidOn(
        videoTrack.enabled
      );
    }

    if (audioTrack) {
      setIsMicOn(
        audioTrack.enabled
      );
    }
  }, [localStream]);

  const toggleCamera =
    useCallback(() => {
      if (!localStream) return;

      const videoTrack =
        localStream.getVideoTracks()[0];

      if (!videoTrack) return;

      videoTrack.enabled =
        !videoTrack.enabled;

      setIsVidOn(
        videoTrack.enabled
      );
    }, [localStream]);

  const toggleMic =
    useCallback(() => {
      if (!localStream) return;

      const audioTrack =
        localStream.getAudioTracks()[0];

      if (!audioTrack) return;

      audioTrack.enabled =
        !audioTrack.enabled;

      setIsMicOn(
        audioTrack.enabled
      );
    }, [localStream]);

  const isOnCall =
    !!ongoingCall &&
    !isCallEnded;

  if (isCallEnded) {
    return (
      <div className="flex min-h-[500px] flex-col items-center justify-center">
        <h2 className="text-2xl font-semibold">
          Call Ended
        </h2>

        <p className="mt-2 text-gray-500">
          The call has been disconnected.
        </p>
      </div>
    );
  }

  if (!localStream && !peer) {
    return null;
  }

  return (
    <div className="relative w-full">
      {/* VIDEO AREA */}
      <div className="relative h-[600px] w-full overflow-hidden rounded-xl bg-black">
        {/* REMOTE VIDEO */}
        {peer && (
  <VideoContainer
    stream={peer.stream ?? null}
    isLocalStream={false}
    userImage={
      peer.participantUser.profile.imageUrl
    }
    userName={
      peer.participantUser.profile.fullName ??
      "User"
    }
  />
)}
        {/* LOCAL VIDEO */}
        {localStream && (
          <VideoContainer
            stream={localStream}
            isLocalStream={true}
          />
        )}

        {/* CONTROLS */}
        {isOnCall && (
          <div className="absolute bottom-6 left-1/2 z-20 flex -translate-x-1/2 items-center gap-4 rounded-full bg-black/50 px-5 py-3">
            <button
              type="button"
              onClick={toggleMic}
              className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-black"
            >
              {isMicOn ? (
                <MdMic size={25} />
              ) : (
                <MdMicOff size={25} />
              )}
            </button>

            <button
              type="button"
              onClick={() =>
                handleHangup({
                  ongoingCall:
                    ongoingCall ??
                    undefined,
                  isEmitHangup: true,
                })
              }
              className="rounded-full bg-red-500 px-6 py-3 font-medium text-white hover:bg-red-600"
            >
              End Call
            </button>

            <button
              type="button"
              onClick={toggleCamera}
              className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-black"
            >
              {isVidOn ? (
                <MdVideocam size={25} />
              ) : (
                <MdVideocamOff
                  size={25}
                />
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default VideoCall;