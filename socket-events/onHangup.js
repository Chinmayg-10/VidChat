const onHangup = ({ io, ongoingCall, userHangingupId }) => {
  if (!io || !ongoingCall || !userHangingupId) {
    return;
  }

  let socketIdToEmitTo;

  if (ongoingCall.caller.userId === userHangingupId) {
    socketIdToEmitTo = ongoingCall.callee.socketId;
  } else {
    socketIdToEmitTo = ongoingCall.caller.socketId;
  }

  if (socketIdToEmitTo) {
    io.to(socketIdToEmitTo).emit("hangUp");
  }
};

export default onHangup;