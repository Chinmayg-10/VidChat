import Peer from 'simple-peer'
export interface UserProfile {
  id: string;
  fullName: string | null;
  imageUrl: string;
}

export interface SocketUser {
  socketId: string;
  userId: string;
  profile: UserProfile;
}

export type OngoingCall = {
  caller: SocketUser;
  callee: SocketUser;
  callType?: "video" | "audio";
  isRinging: boolean;
};
export type incomingCall={
  caller:SocketUser,
  callee:SocketUser
}
export type PeerData={
  peerConnection:Peer.Instance;
  stream?:MediaStream | undefined;
  participantUser:SocketUser
}