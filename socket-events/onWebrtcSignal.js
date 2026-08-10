const onWebrtcSignal = ({ io, sdp, ongoingCall, isCaller }) => {
  if (!io || !sdp || !ongoingCall) {
    console.log("❌ Invalid WebRTC signal");
    return;
  }

  if (isCaller) {
    const calleeSocketId = ongoingCall.callee?.socketId;

    if (!calleeSocketId) {
      console.log("❌ Callee socket ID missing");
      return;
    }

    io.to(calleeSocketId).emit("webrtcSignal", {
      sdp,
      ongoingCall,
      isCaller: true,
    });
  } else {
    const callerSocketId = ongoingCall.caller?.socketId;

    if (!callerSocketId) {
      console.log("❌ Caller socket ID missing");
      return;
    }

    io.to(callerSocketId).emit("webrtcSignal", {
      sdp,
      ongoingCall,
      isCaller: false,
    });
  }
};

export default onWebrtcSignal;