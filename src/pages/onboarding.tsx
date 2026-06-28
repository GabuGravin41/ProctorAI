import { useEffect, useState } from "react";
import { useGetMe, useUpdateMe, UserProfileUpdateRole, getGetMeQueryKey } from "@/lib/api-client";
import { useLocation } from "wouter";
import { useUser } from "@clerk/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { GraduationCap, BookOpen, User, School, ArrowRight, BookMarked, Sparkles, Loader2 } from "lucide-react";

export default function Onboarding() {
  const [, setLocation] = useLocation();
  const { user, isLoaded: isUserLoaded, isSignedIn } = useUser();
  const { data: me, isLoading: isLoadingMe, error } = useGetMe({
    query: {
      queryKey: getGetMeQueryKey(),
      enabled: !!isSignedIn,
      retry: (failureCount: number, error: any) => {
        if (error?.status === 401 && failureCount < 3) return true;
        return false;
      }
    }
  });
  const updateMe = useUpdateMe();

  useEffect(() => {
    if (isUserLoaded && !user) {
      setLocation("/");
    }
  }, [user, isUserLoaded, setLocation]);

  const [name, setName] = useState("");
  const [institutionName, setInstitutionName] = useState("");
  const [subjectArea, setSubjectArea] = useState("");
  const [trafficSource, setTrafficSource] = useState("");
  const [selectedRole, setSelectedRole] = useState<UserProfileUpdateRole | null>(null);
  
  const [step, setStep] = useState(1); // Step 1: Identity & School, Step 2: Role & Subject, Step 3: Traffic & Survey
  const [hasInitialized, setHasInitialized] = useState(false);

  useEffect(() => {
    if (isLoadingMe || hasInitialized) return;

    if (me) {
      setName(me.name || user?.fullName || "");
      setInstitutionName(me.institutionName || "");
      setSubjectArea(me.subjectArea || "");
      setTrafficSource(me.trafficSource || "");
      setSelectedRole((me.role as UserProfileUpdateRole) || null);
      setHasInitialized(true);
    } else if (user) {
      setName(user.fullName || "");
      setHasInitialized(true);
    }
  }, [me, user, isLoadingMe, hasInitialized]);

  useEffect(() => {
    const isProfileComplete = 
      me && 
      me.name && 
      me.role && 
      me.institutionName && 
      me.subjectArea && 
      me.trafficSource;

    if (!isLoadingMe && isProfileComplete) {
      setLocation(me.role === "instructor" ? "/dashboard" : "/student");
    }
  }, [me, isLoadingMe, setLocation]);

  const handleComplete = () => {
    console.log("[Onboarding] handleComplete called", {
      selectedRole,
      name: name.trim(),
      institutionName: institutionName.trim(),
      subjectArea: subjectArea.trim(),
      trafficSource,
    });

    if (!selectedRole) { console.warn("[Onboarding] BLOCKED: no role selected"); return; }
    if (!name.trim()) { console.warn("[Onboarding] BLOCKED: name is empty"); return; }
    if (!institutionName.trim()) { console.warn("[Onboarding] BLOCKED: institutionName is empty"); return; }
    if (!subjectArea.trim()) { console.warn("[Onboarding] BLOCKED: subjectArea is empty"); return; }
    if (!trafficSource) { console.warn("[Onboarding] BLOCKED: trafficSource is empty"); return; }

    console.log("[Onboarding] All fields valid — calling updateMe.mutate");

    updateMe.mutate({
      data: {
        role: selectedRole,
        name: name.trim(),
        institutionName: institutionName.trim(),
        subjectArea: subjectArea.trim(),
        trafficSource: trafficSource,
      }
    }, {
      onSuccess: (data) => {
        console.log("[Onboarding] updateMe succeeded", data);
        setLocation(selectedRole === "instructor" ? "/dashboard" : "/student");
      },
      onError: (err: any) => {
        console.error("[Onboarding] updateMe FAILED", err);
        alert(`Registration failed: ${err?.message || "Unknown error — check console for details"}`);
      }
    });
  };


  if (isLoadingMe) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-3 sm:p-4">
      <Card className="w-full max-w-xl shadow-lg border-2 border-slate-100 bg-white">
        <CardHeader className="text-center pb-4 sm:pb-6 px-4 sm:px-6">
          <img src="/logo.svg" alt="ProctorAI" className="h-10 sm:h-12 w-10 sm:w-12 mx-auto mb-3 sm:mb-4 text-primary" />
          <CardTitle className="text-2xl sm:text-3xl font-display font-bold text-primary tracking-tight">Set Up Your Profile</CardTitle>
          <CardDescription className="text-sm sm:text-base mt-1">Step {step} of 3: Provide account configurations</CardDescription>
          {/* Progress Bar */}
          <div className="w-full bg-slate-100 h-2 rounded-full mt-4 overflow-hidden">
            <div 
              className="bg-primary h-full transition-all duration-300" 
              style={{ width: `${(step / 3) * 100}%` }}
            />
          </div>
        </CardHeader>
        <CardContent className="p-6 pt-0">
          {step === 1 && (
            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="fullname" className="text-sm font-semibold flex items-center gap-1.5">
                  <User className="h-4 w-4 text-muted-foreground" /> Full Name
                </Label>
                <Input 
                  id="fullname" 
                  placeholder="e.g. Dalton Omondi" 
                  value={name} 
                  onChange={(e) => setName(e.target.value)} 
                  className="h-12 text-base"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="school" className="text-sm font-semibold flex items-center gap-1.5">
                  <School className="h-4 w-4 text-muted-foreground" /> School / Institution Name
                </Label>
                <Input 
                  id="school" 
                  placeholder="e.g. Stanford University" 
                  value={institutionName} 
                  onChange={(e) => setInstitutionName(e.target.value)} 
                  className="h-12 text-base"
                />
              </div>

              <Button 
                onClick={() => { if (name.trim() && institutionName.trim()) setStep(2); }} 
                className="w-full h-12 text-base font-semibold"
                disabled={!name.trim() || !institutionName.trim()}
              >
                Continue <ArrowRight className="h-4 w-4 ml-1.5" />
              </Button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Account Role</Label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setSelectedRole("instructor")}
                    className={`flex flex-col items-center p-4 rounded-xl border-2 transition-all text-left w-full ${
                      selectedRole === "instructor" 
                        ? "border-primary bg-primary/5" 
                        : "border-slate-200 bg-white"
                    }`}
                  >
                    <BookOpen className="h-6 w-6 text-primary mb-2" />
                    <span className="font-bold text-sm text-primary">Instructor</span>
                    <span className="text-[10px] text-muted-foreground text-center mt-1">Manage tests & review proofs</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedRole("student")}
                    className={`flex flex-col items-center p-4 rounded-xl border-2 transition-all text-left w-full ${
                      selectedRole === "student" 
                        ? "border-primary bg-primary/5" 
                        : "border-slate-200 bg-white"
                    }`}
                  >
                    <GraduationCap className="h-6 w-6 text-primary mb-2" />
                    <span className="font-bold text-sm text-primary">Student</span>
                    <span className="text-[10px] text-muted-foreground text-center mt-1">Join exam rooms & type answers</span>
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="subject" className="text-sm font-semibold flex items-center gap-1.5">
                  <BookMarked className="h-4 w-4 text-muted-foreground" /> Topic / Field of Expertise
                </Label>
                <Select value={subjectArea} onValueChange={setSubjectArea}>
                  <SelectTrigger className="h-12 text-base">
                    <SelectValue placeholder="Select topic area..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mathematics">Mathematics (Olympiads/Contests)</SelectItem>
                    <SelectItem value="programming">Computer Programming & Dev</SelectItem>
                    <SelectItem value="engineering">Engineering & Physical Sciences</SelectItem>
                    <SelectItem value="physics">Physics & Cosmology</SelectItem>
                    <SelectItem value="chemistry">Chemistry & Biochemistry</SelectItem>
                    <SelectItem value="biology">Biology & Life Sciences</SelectItem>
                    <SelectItem value="medicine">Medicine & Clinical studies</SelectItem>
                    <SelectItem value="other">Other / General</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-4">
                <Button variant="outline" onClick={() => setStep(1)} className="flex-1 h-12">
                  Back
                </Button>
                <Button 
                  onClick={() => { if (selectedRole && subjectArea) setStep(3); }} 
                  className="flex-1 h-12 font-semibold"
                  disabled={!selectedRole || !subjectArea}
                >
                  Continue <ArrowRight className="h-4 w-4 ml-1.5" />
                </Button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="source" className="text-sm font-semibold flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4 text-amber-500 animate-pulse" /> How did you hear about us?
                </Label>
                <Select value={trafficSource} onValueChange={setTrafficSource}>
                  <SelectTrigger className="h-12 text-base">
                    <SelectValue placeholder="Choose source..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="google">Google Search</SelectItem>
                    <SelectItem value="linkedin">LinkedIn</SelectItem>
                    <SelectItem value="youtube">YouTube video</SelectItem>
                    <SelectItem value="tiktok">TikTok video</SelectItem>
                    <SelectItem value="instagram">Instagram post</SelectItem>
                    <SelectItem value="referral">Referral / Friends recommendation</SelectItem>
                    <SelectItem value="other">Other channels</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-4">
                <Button variant="outline" onClick={() => setStep(2)} className="flex-1 h-12">
                  Back
                </Button>
                <Button 
                  onClick={handleComplete} 
                  className="flex-1 h-12 font-semibold bg-green-600 hover:bg-green-700 text-white"
                  disabled={!trafficSource || updateMe.isPending}
                >
                  {updateMe.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Finish Registration
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}