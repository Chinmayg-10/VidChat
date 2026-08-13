const onHangup = ({ io, ongoingCall, userHangingupId }) => {
  if (!ongoingCall || !userHangingupId) {
    return;
  }

  let socketIdToEmitTo;

  if (ongoingCall.caller.userId === userHangingupId) {
    socketIdToEmitTo = ongoingCall.callee.socketId;
  } else {
    socketIdToEmitTo = ongoingCall.caller.socketId;
  }

  if (socketIdToEmitTo) {
    console.log(
      "📨 Sending hangUp to:",
      socketIdToEmitTo
    );
    io.to(socketIdToEmitTo).emit("hangUp");
  }
};

export default onHangup;