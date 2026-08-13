const onHangup = async({ io, ongoingCall, userHangingupId }) => {
  if (!ongoingCall || !userHangingupId) {
    console.log("❌ Invalid hangup data");
    return;
  }

  let socketIdToEmitTo;

  if (ongoingCall.caller.userId === userHangingupId) {
    socketIdToEmitTo = ongoingCall.callee.socketId;
  }
  else if (
    ongoingCall.callee.userId ===
    userHangingupId
  ) {
    socketIdToEmitTo =
      ongoingCall.caller.socketId;
  }
  if (!socketIdToEmitTo) {
    console.log(
      "❌ Could not find other user's socket"
    );
    return;
  }
  console.log(
      "📨 Sending hangUp to:",
      socketIdToEmitTo
    );
    io.to(socketIdToEmitTo).emit("hangUp");
};

export default onHangup;