"use client";

import { useSocket } from "@/context/SocketContext";
import { MdCall, MdCallEnd } from "react-icons/md";

const CallNotification = () => {
  const { ongoingCall , handleJoinCall} = useSocket();

  if (!ongoingCall?.isRinging) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="w-[350px] rounded-xl bg-white p-6 text-center shadow-xl">

        {/* Caller Image */}
        <img
          src={ongoingCall.caller.profile.imageUrl}
          alt={
            ongoingCall.caller.profile.fullName ??
            "Caller"
          }
          className="mx-auto h-20 w-20 rounded-full"
        />

        {/* Call Information */}
        <h2 className="mt-4 text-xl font-semibold">
          Incoming Call
        </h2>

        <p className="mt-2 text-gray-600">
          {ongoingCall.caller.profile.fullName} is calling you...
        </p>

        {/* Buttons */}
        <div className="mt-6 flex justify-center gap-6">

          {/* Reject */}
          <button
            type="button"
            className="flex h-12 w-12 items-center justify-center rounded-full bg-red-500 text-white transition hover:bg-red-600"
          >
            <MdCallEnd size={24} />
          </button>

          {/* Accept */}
          <button onClick={()=>handleJoinCall(ongoingCall)}
            type="button"
            className="flex h-12 w-12 items-center justify-center rounded-full bg-green-500 text-white transition hover:bg-green-600"
          >
            <MdCall size={24} />
          </button>

        </div>
      </div>
    </div>
  );
};

export default CallNotification;