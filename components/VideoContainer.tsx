"use client";

import {
  useEffect,
  useRef,
} from "react";

interface VideoContainerProps {
  stream: MediaStream | null;
  isLocalStream: boolean;
  userImage?: string;
  userName?: string;
}

const VideoContainer = ({
  stream,
  isLocalStream,
  userImage,
  userName,
}: VideoContainerProps) => {
  const videoRef =
    useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }

    // Remove old stream when stream becomes null
    if (videoRef.current && !stream) {
      videoRef.current.srcObject = null;
    }
  }, [stream]);

  // ==========================================
  // LOCAL VIDEO
  // ==========================================

  if (isLocalStream) {
    return (
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="absolute bottom-6 right-6 z-10 h-40 w-56 rounded-xl border-2 border-white object-cover shadow-xl"
      />
    );
  }

  // ==========================================
  // REMOTE VIDEO
  // ==========================================

  return (
    <div className="relative h-full min-h-[500px] w-full overflow-hidden rounded-xl bg-gradient-to-br from-gray-800 via-gray-900 to-black">

      {/* Remote video */}
      {stream && (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          className="absolute inset-0 h-full w-full object-cover"
        />
      )}

      {/* Avatar when remote video is unavailable */}
      {!stream && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">

          {userImage ? (
            <img
              src={userImage}
              alt={userName ?? "User"}
              className="h-32 w-32 rounded-full border-4 border-white/20 object-cover shadow-2xl"
            />
          ) : (
            <div className="flex h-32 w-32 items-center justify-center rounded-full bg-purple-600 text-5xl font-semibold text-white">
              {userName?.charAt(0).toUpperCase() ?? "U"}
            </div>
          )}

          <p className="mt-5 text-lg font-medium text-white">
            {userName ?? "User"}
          </p>

        </div>
      )}

    </div>
  );
};

export default VideoContainer;