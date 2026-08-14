"use client";

import { useEffect, useRef } from "react";

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
  userName = "User",
}: VideoContainerProps) => {
  const videoRef =
    useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;

    if (!video) return;

    if (stream) {
      video.srcObject = stream;

      video.play().catch((error) => {
        console.log(
          "Video autoplay prevented:",
          error
        );
      });
    } else {
      video.srcObject = null;
    }

    return () => {
      video.srcObject = null;
    };
  }, [stream]);

  // ==========================================
  // LOCAL VIDEO
  // ==========================================

  if (isLocalStream) {
    return (
      <div className="absolute bottom-6 right-6 z-10 h-40 w-56 overflow-hidden rounded-xl border-2 border-white bg-black shadow-xl">
        {stream ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="h-full w-full object-contain"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gray-900">
            {userImage ? (
              <img
                src={userImage}
                alt={userName}
                className="h-16 w-16 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-purple-600 text-2xl font-semibold text-white">
                {userName.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // ==========================================
  // REMOTE VIDEO
  // ==========================================

  return (
    <div className="flex h-full min-h-[500px] w-full items-center justify-center overflow-hidden rounded-xl bg-black">
      {stream ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          className="h-full w-full object-contain"
        />
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center bg-gray-900">
          {userImage ? (
            <img
              src={userImage}
              alt={userName}
              className="h-28 w-28 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-28 w-28 items-center justify-center rounded-full bg-purple-600 text-5xl font-semibold text-white">
              {userName.charAt(0).toUpperCase()}
            </div>
          )}

          <p className="mt-4 text-lg font-medium text-white">
            {userName}
          </p>
        </div>
      )}
    </div>
  );
};

export default VideoContainer;