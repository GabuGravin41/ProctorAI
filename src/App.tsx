import { Switch, Route, Redirect, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { Button } from "@/components/ui/button";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useEffect, useRef } from "react";
import { SignIn, SignUp, useClerk, useAuth } from "@clerk/react";
import NotFound from "@/pages/not-found";

import Landing from "@/pages/landing";
import Onboarding from "@/pages/onboarding";
import Dashboard from "@/pages/dashboard";
import ExamsList from "@/pages/exams/index";
import NewExam from "@/pages/exams/new";
import ExamBuilder from "@/pages/exams/build";
import ExamResults from "@/pages/exams/results";
import UserProfile from "@/pages/profile";
import StudentHome from "@/pages/student/home";
import JoinExam from "@/pages/student/join";
import ExamTaking from "@/pages/student/exam-taking";
import StudentResults from "@/pages/student/results";

import { useGetMe, getGetMeQueryKey, setAuthTokenGetter } from "@/lib/api-client";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || "/"
    : path;
}

// Check if Clerk is configured
const isClerkConfigured = !!import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

function SignInPage() {
  if (!isClerkConfigured) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Authentication is not configured</p>
          <Button onClick={() => window.location.href = basePath || "/"}>Continue to App</Button>
        </div>
      </div>
    );
  }
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4">
      <SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} />
    </div>
  );
}

function SignUpPage() {
  if (!isClerkConfigured) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Authentication is not configured</p>
          <Button onClick={() => window.location.href = basePath || "/"}>Continue to App</Button>
        </div>
      </div>
    );
  }
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4">
      <SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} />
    </div>
  );
}

function ClerkQueryClientCacheInvalidator() {
  if (!isClerkConfigured) return null;
  
  const { addListener, session } = useClerk();
  const queryClient = useQueryClient();
  const prevUserIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    // Set up the token getter so all API client requests have the bearer token
    setAuthTokenGetter(() => {
      try {
        return session?.getToken() ?? null;
      } catch (e) {
        return null;
      }
    });
    return () => {
      setAuthTokenGetter(() => null);
    };
  }, [session]);

  useEffect(() => {
    const unsubscribe = addListener(({ user }) => {
      const userId = user?.id ?? null;
      if (
        prevUserIdRef.current !== undefined &&
        prevUserIdRef.current !== userId
      ) {
        queryClient.clear();
      }
      prevUserIdRef.current = userId;
    });
    return unsubscribe;
  }, [addListener, queryClient]);

  return null;
}

function HomeRedirect() {
  const { isSignedIn, isLoaded: isAuthLoaded } = useAuth();
  
  const { data: me, isLoading, error } = useGetMe();
  
  if (!isAuthLoaded || (isSignedIn && isLoading)) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!isSignedIn) {
    return <Landing />;
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-destructive font-semibold">Failed to load user profile.</p>
        <Button onClick={() => window.location.reload()}>
          Retry Connection
        </Button>
      </div>
    );
  }

  // Check if any required demographic or role onboarding details are missing
  const isProfileComplete = 
    me && 
    me.name && 
    me.role && 
    me.institutionName && 
    me.subjectArea && 
    me.trafficSource;

  if (isProfileComplete) {
    return <Redirect to={me.role === "instructor" ? "/dashboard" : "/student"} />;
  }

  return <Redirect to="/onboarding" />;
}

const queryClient = new QueryClient();

function App() {
  return (
    <TooltipProvider>
      <WouterRouter base={basePath}>
        <QueryClientProvider client={queryClient}>
          <ClerkQueryClientCacheInvalidator />
          <Switch>
            <Route path="/" component={HomeRedirect} />
            <Route path="/sign-in/*?" component={SignInPage} />
            <Route path="/sign-up/*?" component={SignUpPage} />
            <Route path="/onboarding" component={Onboarding} />
            
            {/* Instructor Routes */}
            <Route path="/dashboard" component={Dashboard} />
            <Route path="/profile" component={UserProfile} />
            <Route path="/exams" component={ExamsList} />
            <Route path="/exams/new" component={NewExam} />
            <Route path="/exams/:examId/build" component={ExamBuilder} />
            <Route path="/exams/:examId/results" component={ExamResults} />
            
            {/* Student Routes */}
            <Route path="/student" component={StudentHome} />
            <Route path="/join" component={JoinExam} />
            <Route path="/exam/:sessionId" component={ExamTaking} />
            <Route path="/exam/:sessionId/results" component={StudentResults} />
            
            <Route component={NotFound} />
          </Switch>
        </QueryClientProvider>
      </WouterRouter>
      <Toaster />
    </TooltipProvider>
  );
}

export default App;