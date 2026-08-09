"use client";

import VideoContainer from "./VideoContainer";
import { useSocket } from "@/context/SocketContext";
import { useCallback, useState, useEffect } from "react";
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
    handleHangup,
  } = useSocket();

  const [isMicOn, setIsMicOn] = useState(true);
  const [isVidOn, setIsVidOn] = useState(true);

  // ==========================================
  // UPDATE MIC / CAMERA STATE
  // ==========================================

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
      setIsVidOn(videoTrack.enabled);
    }

    if (audioTrack) {
      setIsMicOn(audioTrack.enabled);
    }
  }, [localStream]);

  // ==========================================
  // TOGGLE CAMERA
  // ==========================================

  const toggleCamera = useCallback(() => {
    if (!localStream) return;

    const videoTrack =
      localStream.getVideoTracks()[0];

    if (!videoTrack) return;

    videoTrack.enabled = !videoTrack.enabled;

    setIsVidOn(videoTrack.enabled);
  }, [localStream]);

  // ==========================================
  // TOGGLE MICROPHONE
  // ==========================================

  const toggleMic = useCallback(() => {
    if (!localStream) return;

    const audioTrack =
      localStream.getAudioTracks()[0];

    if (!audioTrack) return;

    audioTrack.enabled = !audioTrack.enabled;

    setIsMicOn(audioTrack.enabled);
  }, [localStream]);

  // ==========================================
  // CHECK IF CURRENTLY ON CALL
  // ==========================================

  const isOnCall = !!ongoingCall;

  // ==========================================
  // UI
  // ==========================================

  return (
    <div className="relative w-full">

      {/* VIDEO AREA */}

      <div className="relative flex w-full flex-wrap items-center justify-center gap-4">

        {/* LOCAL VIDEO */}

        {localStream && (
          <VideoContainer
            stream={localStream}
            isLocalStream={true}
            isOnCall={isOnCall}
          />
        )}

        {/* REMOTE VIDEO */}

        {peer?.stream && (
          <VideoContainer
            stream={peer.stream}
            isLocalStream={false}
            isOnCall={isOnCall}
          />
        )}

      </div>

      {/* CONTROLS */}

      {isOnCall && (
        <div className="mt-8 flex items-center justify-center">

          {/* MICROPHONE */}

          <button
            type="button"
            onClick={toggleMic}
            className="flex h-12 w-12 items-center justify-center rounded-full hover:bg-gray-100"
          >
            {isMicOn ? (
              <MdMic size={28} />
            ) : (
              <MdMicOff size={28} />
            )}
          </button>

          {/* END CALL */}

          <button
            type="button"
            onClick={handleHangup}
            className="mx-4 flex items-center justify-center rounded-full bg-rose-500 px-5 py-3 text-white hover:bg-rose-600"
          >
            End Call
          </button>

          {/* CAMERA */}

          <button
            type="button"
            onClick={toggleCamera}
            className="flex h-12 w-12 items-center justify-center rounded-full hover:bg-gray-100"
          >
            {isVidOn ? (
              <MdVideocam size={28} />
            ) : (
              <MdVideocamOff size={28} />
            )}
          </button>

        </div>
      )}
    </div>
  );
};

export default VideoCall;