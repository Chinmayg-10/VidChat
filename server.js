import { createServer } from "node:http";
import next from "next";
import { Server } from "socket.io";

import onCall from "./socket-events/onCall.js";
import onWebrtcSignal from "./socket-events/onWebrtcSignal.js";

const dev = process.env.NODE_ENV !== "production";
const hostname = "localhost";
const port = 3000;

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

  // ==========================================
  // SOCKET CONNECTION
  // ==========================================

  io.on("connection", (socket) => {
    console.log(
      "✅ Client Connected:",
      socket.id
    );

    // ========================================
    // ADD NEW USER
    // ========================================

    socket.on("addNewUser", (user) => {
      if (!user?.id) {
        console.log(
          "❌ Invalid user received"
        );
        return;
      }

      const exists = onlineUsers.some(
        (u) => u.userId === user.id
      );

      if (!exists) {
        onlineUsers.push({
          userId: user.id,
          socketId: socket.id,

          profile: {
            id: user.id,
            fullName: user.fullName,
            imageUrl: user.imageUrl,
          },
        });
      } else {
        // If user reconnects, update socket ID
        onlineUsers = onlineUsers.map(
          (u) =>
            u.userId === user.id
              ? {
                  ...u,
                  socketId: socket.id,
                }
              : u
        );
      }

      console.log(
        "👥 Online Users:",
        onlineUsers
      );

      io.emit(
        "getOnlineUsers",
        onlineUsers
      );
    });

    // ========================================
    // CALL
    // ========================================

    socket.on(
      "call",
      ({ caller, callee }) => {
        console.log(
          `📞 Call: ${caller?.profile?.fullName} → ${callee?.profile?.fullName}`
        );

        onCall({
          io,
          caller,
          callee,
        });
      }
    );

    // ========================================
    // WEBRTC SIGNAL
    // ========================================

    socket.on(
      "webrtcSignal",
      (data) => {
        console.log(
          "📡 WebRTC signal received"
        );

        onWebrtcSignal({
          io,
          ...data,
        });
      }
    );

    // ========================================
    // HANG UP
    // ========================================

    socket.on(
      "hangup",
      ({ socketId }) => {
        if (!socketId) {
          console.log(
            "❌ No socket ID for hangup"
          );
          return;
        }

        console.log(
          "📴 Sending callEnded to:",
          socketId
        );

        io.to(socketId).emit(
          "callEnded"
        );
      }
    );

    // ========================================
    // DISCONNECT
    // ========================================

    socket.on(
      "disconnect",
      () => {
        console.log(
          "❌ Client Disconnected:",
          socket.id
        );

        onlineUsers =
          onlineUsers.filter(
            (user) =>
              user.socketId !== socket.id
          );

        console.log(
          "👥 Updated Online Users:",
          onlineUsers
        );

        io.emit(
          "getOnlineUsers",
          onlineUsers
        );
      }
    );
  });

  // ==========================================
  // START SERVER
  // ==========================================

  httpServer
    .once("error", (error) => {
      console.error(
        "❌ Server error:",
        error
      );

      process.exit(1);
    })
    .listen(port, () => {
      console.log(
        `🚀 Ready on http://${hostname}:${port}`
      );
    });
});