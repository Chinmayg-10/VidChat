"use client";

import Image from "next/image";

import { useSocket } from "@/context/SocketContext";

const CallNotification = () => {
  const { ongoingCall } = useSocket();

  if (!ongoingCall?.isRinging) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="w-[350px] rounded-xl bg-white p-6 text-center shadow-xl">

        <Image
          src={
            ongoingCall.caller.profile.imageUrl
          }
          alt={
            ongoingCall.caller.profile.fullName ??
            "Caller"
          }
          width={80}
          height={80}
          className="mx-auto h-20 w-20 rounded-full"
        />

        <h2 className="mt-4 text-xl font-semibold">
          Incoming Call
        </h2>

        <p className="mt-2 text-gray-600">
          {ongoingCall.caller.profile.fullName}
          {" "}is calling you...
        </p>

        <div className="mt-6 flex justify-center gap-4">

          <button
            className="rounded-lg bg-red-500 px-5 py-2 text-white"
          >
            Reject
          </button>

          <button
            className="rounded-lg bg-green-500 px-5 py-2 text-white"
          >
            Accept
          </button>

        </div>
      </div>
    </div>
  );
};

export default CallNotification;