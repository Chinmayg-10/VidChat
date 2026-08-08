export default function ClerkLayout({ children }: {children: React.ReactNode}) {
  return (
    <div>
        <div className="h-screen flex items-center justify-center">{children}</div>
    </div>
      
  );
}