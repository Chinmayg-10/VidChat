const onCall = ({ io, caller, callee }) => {
  if (!callee?.socketId) return;

  io.to(callee.socketId).emit("incomingCall", {
    caller,
    callee,
  });
};

export default onCall;