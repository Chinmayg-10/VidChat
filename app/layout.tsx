import type { Metadata } from "next";
import { Geist, Geist_Mono,Inter } from "next/font/google";
import "./globals.css";
import {ClerkProvider} from "@clerk/nextjs";
import Navbar from "@/components/layout/navbar";
import Container from "@/components/layout/Container";
import SocketProvider from "@/providers/SocketProvide";
import {cn} from "@/lib/utils"
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});
const inter=Inter({ subsets :["latin"]});
export const metadata: Metadata = {
  title: "VidChat",
  description: "A simple video chat application",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <ClerkProvider>
      <html
        lang="en"
        className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      >
        <body className={cn(inter.className, 'relative')}>
          <SocketProvider>
          <main className="flex flex-col min-h-screen bg-secondary">
            <Navbar/>
            <Container>
              {children}
            </Container>
          </main>
          </SocketProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
