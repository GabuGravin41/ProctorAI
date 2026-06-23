import { Link, useLocation } from "wouter";
import { useClerk, useUser } from "@clerk/react";
import { LogOut, LayoutDashboard, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";

interface StudentLayoutProps {
  children: React.ReactNode;
}

export default function StudentLayout({ children }: StudentLayoutProps) {
  const [location] = useLocation();
  const { signOut } = useClerk();
  const { user } = useUser();
  const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

  // Don't show nav if actively taking an exam
  const isTakingExam = location.startsWith("/exam/") && !location.endsWith("/results");

  if (isTakingExam) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="px-6 h-16 flex items-center justify-between border-b bg-white sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-6">
          <Link href="/student" className="flex items-center gap-2">
            <img src="/logo.svg" alt="ProctorAI" className="h-8 w-8 text-primary" />
            <span className="font-display font-bold text-xl tracking-tight text-primary">ProctorAI</span>
          </Link>
          
          <nav className="hidden md:flex items-center gap-1">
            <Link href="/student">
              <span className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${location === "/student" ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"}`}>
                Dashboard
              </span>
            </Link>
            <Link href="/join">
              <span className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${location === "/join" ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"}`}>
                Join Exam
              </span>
            </Link>
          </nav>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-2 text-sm font-medium">
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
              {user?.firstName?.charAt(0) || "S"}
            </div>
            <span className="text-foreground">{user?.firstName || "Student"}</span>
          </div>
          <Button variant="ghost" size="sm" onClick={() => signOut({ redirectUrl: basePath || "/" })} className="text-muted-foreground">
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </header>

      {/* Mobile nav */}
      <div className="md:hidden bg-white border-b px-4 py-2 flex gap-2 overflow-x-auto">
        <Link href="/student">
          <span className={`px-3 py-1.5 rounded-md text-sm font-medium whitespace-nowrap ${location === "/student" ? "bg-accent text-accent-foreground" : "text-muted-foreground"}`}>
            <LayoutDashboard className="h-4 w-4 inline-block mr-1.5" /> Dashboard
          </span>
        </Link>
        <Link href="/join">
          <span className={`px-3 py-1.5 rounded-md text-sm font-medium whitespace-nowrap ${location === "/join" ? "bg-accent text-accent-foreground" : "text-muted-foreground"}`}>
            <KeyRound className="h-4 w-4 inline-block mr-1.5" /> Join Exam
          </span>
        </Link>
      </div>
      
      <main className="flex-1 p-4 md:p-8 max-w-6xl mx-auto w-full">
        {children}
      </main>
    </div>
  );
}