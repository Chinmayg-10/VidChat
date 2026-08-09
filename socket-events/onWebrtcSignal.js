const onWebrtcSignal=async(data)=>{
    if(data.isCaller){
        if(data.ongoingCall.callee.socketId){
            io.to(data.ongoingCall.callee.socketId).emit(
                "webrtcSignal",
                data
            );
        }
    }
    else{
        if(data.ongoingCall.caller.socketId){
            io.to(data.ongoingCall.caller.socketId).emit(
                "webrtcSignal",data
            );
        }
    }
}
export default onWebrtcSignal