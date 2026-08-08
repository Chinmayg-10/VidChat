"use client";

import Image from "next/image";

import { useSocket } from "@/context/SocketContext";
import { useUser } from "@clerk/nextjs";

const ListOnlineUsers = () => {
  const { user } = useUser();

  const {
    onlineUsers,
    handleCall,
  } = useSocket();

  const otherUsers = onlineUsers?.filter(
    (onlineUser) =>
      onlineUser.userId !== user?.id
  );

  return (
    <div className="flex w-full items-center gap-4 border-b border-primary/10 pb-2">
      {otherUsers?.map((onlineUser) => (
        <div
          key={onlineUser.userId}
          onClick={() =>
            handleCall(
              onlineUser,
              "video"
            )
          }
          className="flex cursor-pointer flex-col items-center gap-1"
        >
          <Image
            src={onlineUser.profile.imageUrl}
            alt={
              onlineUser.profile.fullName ??
              "User"
            }
            width={40}
            height={40}
            className="h-10 w-10 rounded-full"
          />

          <div className="text-sm">
            {onlineUser.profile.fullName
              ?.split(" ")[0]}
          </div>
        </div>
      ))}
    </div>
  );
};

export default ListOnlineUsers;