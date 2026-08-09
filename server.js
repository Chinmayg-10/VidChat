import { createServer } from "node:http";
import next from "next";
import { Server } from "socket.io";
import onCall from "./socket-events/onCall.js";
import onWebrtcSignal from "./socket-events/onWebrtcSignal.js";

const dev = process.env.NODE_ENV !== "production";
const hostname = "localhost";
const port = 3000;

const app = next({ dev, hostname, port });
const handler = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer(handler);

  const io = new Server(httpServer);

  let onlineUsers = [];

  io.on("connection", (socket) => {
    console.log("✅ Client Connected:", socket.id);
    // Add new user
    socket.on("addNewUser", (user) => {
      if (!user) return;

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
      }

      console.log("Online Users:", onlineUsers);

      io.emit("getOnlineUsers", onlineUsers);
    });
    
    //Disconnect
    socket.on("disconnect", () => {
      console.log("❌ Client Disconnected:", socket.id);

      onlineUsers = onlineUsers.filter(
        (user) => user.socketId !== socket.id
      );

      io.emit("getOnlineUsers", onlineUsers);
    });

    // Call events
    socket.on("call", ({ caller, callee }) => {
      onCall({
        io,
        caller,
        callee,
      });
    });
    socket.on('webrtcSignal',onWebrtcSignal);

  }); // ✅ Close io.on()

  httpServer.listen(port, () => {
    console.log(`🚀 Ready on http://${hostname}:${port}`);
  });
});