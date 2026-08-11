import { createServer } from "node:http";
import next from "next";
import { Server } from "socket.io";

import onCall from "./socket-events/onCall.js";
import onWebrtcSignal from "./socket-events/onWebrtcSignal.js";
import onHangup from "./socket-events/onHangup.js";

const dev = process.env.NODE_ENV !== "production";
const hostname = "localhost";
const port = process.env.PORT || 3000;

const app = next({
  dev,
  hostname,
  port,
});

const handler = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer(handler);

  const io = new Server(httpServer);

  let onlineUsers = [];

  io.on("connection", (socket) => {
    console.log("✅ Client Connected:", socket.id);

    // ========================================
    // ADD NEW USER
    // ========================================

    socket.on("addNewUser", (user) => {
      if (!user?.id) {
        console.log("❌ Invalid user received");
        return;
      }

      const existingUser = onlineUsers.find(
        (u) => u.userId === user.id
      );

      if (existingUser) {
        existingUser.socketId = socket.id;
        existingUser.profile = {
          id: user.id,
          fullName: user.fullName,
          imageUrl: user.imageUrl,
        };
      } else {
        onlineUsers.push({
          userId: user.id,
          socketId: socket.id,
          profile: {
            id: user.id,
            fullName: user.fullName,
            imageUrl: user.imageUrl,
          },
        });
      }

      console.log("👥 Online Users:", onlineUsers);

      io.emit("getOnlineUsers", onlineUsers);
    });

    // ========================================
    // CALL
    // ========================================

    socket.on("call", ({ caller, callee }) => {
      console.log(
        `📞 Call: ${caller?.profile?.fullName} → ${callee?.profile?.fullName}`
      );

      onCall({
        io,
        caller,
        callee,
      });
    });

    // ========================================
    // WEBRTC SIGNAL
    // ========================================

    socket.on("webrtcSignal", (data) => {
      console.log("📡 WebRTC signal received");

      onWebrtcSignal({
        io,
        ...data,
      });
    });

    // ========================================
    // HANG UP
    // ========================================

    socket.on("hangup", (data) => {
      console.log("📴 Hangup received");

      onHangup({
        io,
        ...data,
      });
    });
    socket.on("callAccepted",({ongoingCall})=>{
      if(!ongoingCall?.caller?.socketId){
        return;
      }
      io.to(ongoingCall.caller.socketId).emit(
        "callAccepted",{
          ongoingCall,
        }
      )
    })
    // ========================================
    // DISCONNECT
    // ========================================

    socket.on("disconnect", () => {
      console.log(
        "❌ Client Disconnected:",
        socket.id
      );

      onlineUsers = onlineUsers.filter(
        (user) => user.socketId !== socket.id
      );

      console.log(
        "👥 Updated Online Users:",
        onlineUsers
      );

      io.emit(
        "getOnlineUsers",
        onlineUsers
      );
    });
  });

  httpServer
    .once("error", (error) => {
      console.error("❌ Server error:", error);
      process.exit(1);
    })
    .listen(port, () => {
      console.log(
        `🚀 Ready on http://${hostname}:${port}`
      );
    });
});