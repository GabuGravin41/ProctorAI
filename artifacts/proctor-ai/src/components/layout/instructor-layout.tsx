import { Link, useLocation } from "wouter";
import { useClerk, useUser, useAuth } from "@clerk/react";
import { LayoutDashboard, FileText, Settings, LogOut, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useGetMe, getGetMeQueryKey } from "@workspace/api-client-react";

interface InstructorLayoutProps {
  children: React.ReactNode;
}

export default function InstructorLayout({ children }: InstructorLayoutProps) {
  const [location, setLocation] = useLocation();
  const { signOut } = useClerk();
  const { isSignedIn, isLoaded: isAuthLoaded } = useAuth();
  const { user } = useUser();
  const { data: me, isLoading } = useGetMe({
    query: {
      queryKey: getGetMeQueryKey(),
      enabled: !!isSignedIn
    }
  });

  if (isAuthLoaded && !isSignedIn) {
    setLocation("/");
    return null;
  }

  // Route-guard: Redirect to onboarding if profile is incomplete, or student home if role is student
  if (!isLoading && me) {
    const isProfileComplete = 
      me.name && 
      me.role && 
      me.institutionName && 
      me.subjectArea && 
      me.trafficSource;

    if (!isProfileComplete) {
      setLocation("/onboarding");
      return null;
    }
    if (me.role !== "instructor") {
      setLocation("/student");
      return null;
    }
  }

  const navigation = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Exams", href: "/exams", icon: FileText },
  ];

  const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

  const Sidebar = () => (
    <div className="flex h-full flex-col bg-sidebar border-r border-sidebar-border text-sidebar-foreground">
      <div className="flex h-16 items-center px-6 border-b border-sidebar-border bg-sidebar/50">
        <img src="/logo.svg" alt="ProctorAI" className="h-8 w-8 text-sidebar-primary" />
        <span className="ml-3 font-display font-bold text-xl tracking-tight">ProctorAI</span>
      </div>
      
      <div className="flex-1 py-6 px-4 space-y-1 overflow-y-auto">
        {navigation.map((item) => {
          const isActive = location === item.href || location.startsWith(`${item.href}/`);
          return (
            <Link key={item.name} href={item.href}>
              <span className={`flex items-center px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${isActive ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"}`}>
                <item.icon className="mr-3 h-5 w-5" />
                {item.name}
              </span>
            </Link>
          );
        })}
      </div>

      <div className="p-4 border-t border-sidebar-border bg-sidebar/50 space-y-2">
        <Link href="/profile">
          <div className="flex items-center px-2 py-1.5 rounded cursor-pointer hover:bg-sidebar-accent/40 transition-colors">
            <div className="h-8 w-8 rounded-full bg-sidebar-primary/20 flex items-center justify-center text-sidebar-primary font-bold">
              {user?.firstName?.charAt(0) || "U"}
            </div>
            <div className="ml-3 truncate flex-1">
              <p className="text-sm font-medium truncate">{user?.fullName || "Instructor"}</p>
              <p className="text-xs text-sidebar-foreground/60 truncate">{user?.primaryEmailAddress?.emailAddress}</p>
            </div>
          </div>
        </Link>
        <Button 
          variant="ghost" 
          className="w-full justify-start text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 border-sidebar-border"
          onClick={() => signOut({ redirectUrl: basePath || "/" })}
        >
          <LogOut className="mr-3 h-5 w-5" />
          Sign out
        </Button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop sidebar */}
      <div className="hidden md:flex md:w-64 md:flex-col">
        <Sidebar />
      </div>

      {/* Mobile wrapper */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-16 items-center justify-between border-b bg-white px-4 md:hidden">
          <div className="flex items-center">
            <img src="/logo.svg" alt="ProctorAI" className="h-8 w-8 text-primary" />
            <span className="ml-2 font-display font-bold text-lg text-primary">ProctorAI</span>
          </div>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden">
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-64 bg-sidebar">
              <Sidebar />
            </SheetContent>
          </Sheet>
        </header>

        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}