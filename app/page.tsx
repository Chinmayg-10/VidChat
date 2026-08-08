import ListOnlineUsers from "@/components/ListOnlineUsers";
import CallNotification from "@/components/CallNotification";
export default function Home(){
  return(
    <div>
      <ListOnlineUsers />
      <CallNotification/>
    </div>
  )
}