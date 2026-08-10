"use client";

import {
  useEffect,
  useRef,
} from "react";

interface VideoContainerProps {
  stream: MediaStream | null;
  isLocalStream: boolean;
}

const VideoContainer = ({
  stream,
  isLocalStream,
}: VideoContainerProps) => {
  const videoRef =
    useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (
      videoRef.current &&
      stream
    ) {
      videoRef.current.srcObject =
        stream;
    }
  }, [stream]);

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted={isLocalStream}
      className={
        isLocalStream
          ? "absolute bottom-6 right-6 z-10 h-40 w-56 rounded-xl border-2 border-white object-cover shadow-xl"
          : "h-full min-h-[500px] w-full rounded-xl bg-black object-cover"
      }
    />
  );
};

export default VideoContainer;
