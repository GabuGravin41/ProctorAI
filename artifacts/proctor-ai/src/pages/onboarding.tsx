import { useGetMe, useUpdateMe } from "@workspace/api-client-react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { UserProfileUpdateRole } from "@workspace/api-client-react/src/generated/api.schemas";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { GraduationCap, BookOpen } from "lucide-react";

export default function Onboarding() {
  const [, setLocation] = useLocation();
  const { data: me, isLoading: isLoadingMe } = useGetMe();
  const updateMe = useUpdateMe();

  const handleRoleSelect = (role: UserProfileUpdateRole) => {
    updateMe.mutate({ data: { role } }, {
      onSuccess: () => {
        setLocation(role === "instructor" ? "/dashboard" : "/student");
      }
    });
  };

  if (isLoadingMe) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  // If role is already set, redirect
  if (me?.role) {
    setLocation(me.role === "instructor" ? "/dashboard" : "/student");
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <Card className="w-full max-w-2xl shadow-md border">
        <CardHeader className="text-center pb-8">
          <img src="/logo.svg" alt="ProctorAI" className="h-12 w-12 mx-auto mb-4 text-primary" />
          <CardTitle className="text-3xl font-bold text-primary tracking-tight">Welcome to ProctorAI</CardTitle>
          <CardDescription className="text-lg">How will you be using the platform?</CardDescription>
        </CardHeader>
        <CardContent className="grid md:grid-cols-2 gap-6 p-6 pt-0">
          <button
            onClick={() => handleRoleSelect("instructor")}
            className="group flex flex-col items-center p-8 rounded-lg border-2 border-border bg-white hover:border-primary hover:bg-primary/5 transition-all text-left w-full disabled:opacity-50"
            disabled={updateMe.isPending}
          >
            <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <BookOpen className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-xl font-bold text-primary mb-2">I'm an Instructor</h3>
            <p className="text-muted-foreground text-sm text-center">Create exams, monitor sessions, and review reports.</p>
          </button>
          
          <button
            onClick={() => handleRoleSelect("student")}
            className="group flex flex-col items-center p-8 rounded-lg border-2 border-border bg-white hover:border-primary hover:bg-primary/5 transition-all text-left w-full disabled:opacity-50"
            disabled={updateMe.isPending}
          >
            <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <GraduationCap className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-xl font-bold text-primary mb-2">I'm a Student</h3>
            <p className="text-muted-foreground text-sm text-center">Join exams, verify your identity, and complete assessments.</p>
          </button>
        </CardContent>
      </Card>
    </div>
  );
}