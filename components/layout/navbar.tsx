'use client'
import { UserButton,useAuth } from "@clerk/nextjs";
import Container from "./Container"
import { Video } from "lucide-react"
import { useRouter } from "next/navigation"
import { Button } from "../ui/button";
const Navbar=()=>{
    const router = useRouter();
    const {userId}= useAuth();
    return(
        <div className="sticky top-0 z-50 w-full bg-background/80 backdrop-blur-sm border-b border-border">
            <Container>
                <div className="flex justify-between items-center py-2">
                    <div className="flex items-center gap-1 cursor-pointer" onClick={()=>router.push("/")}>
                        <Video/>
                        <div className="font-bold text-xl">VidChat</div>
                    </div>
                    <div className="flex gap-3 items-center">
                        <UserButton/>
                        {!userId && <>
                        <Button onClick={() => router.push("/Signin")} size='sm' variant='outline'>
                            Sign in
                        </Button>
                        <Button onClick={() => router.push("/SignUp")} size='sm' variant='outline'>
                            Sign Up
                        </Button>
                        </>}
                    </div>
                </div> 
            </Container>
        </div>
    );
};
export default Navbar;