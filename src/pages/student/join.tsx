import { useState, useEffect } from "react";
import StudentLayout from "@/components/layout/student-layout";
import { useJoinExam, customFetch } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLocation, Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Loader2, KeyRound, Sparkles } from "lucide-react";

export default function JoinExam() {
  const [accessCode, setAccessCode] = useState("");
  const joinExam = useJoinExam();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessCode.trim()) return;

    joinExam.mutate({ data: { accessCode: accessCode.trim() } }, {
      onSuccess: (data) => {
        toast({ title: "Successfully joined exam" });
        setLocation(`/exam/${data.session.id}`);
      },
      onError: (err: any) => {
        toast({ 
          title: "Failed to join", 
          description: err?.message || "Invalid access code. Please check and try again.", 
          variant: "destructive" 
        });
      }
    });
  };

  return (
    <StudentLayout>
      <div className="flex flex-col items-center justify-center min-h-[70vh] py-8 gap-8">
        <Card className="w-full max-w-md shadow-lg border-primary/20">
          <CardHeader className="text-center pb-6">
            <div className="mx-auto bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mb-4">
              <KeyRound className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-2xl font-display font-bold">Join an Exam</CardTitle>
            <CardDescription>Enter the access code provided by your instructor.</CardDescription>
          </CardHeader>
          <form onSubmit={handleJoin}>
            <CardContent>
              <div className="space-y-4">
                <Input 
                  placeholder="e.g. A1B2C3D4" 
                  value={accessCode}
                  onChange={(e) => setAccessCode(e.target.value)}
                  className="text-center text-xl tracking-widest font-mono h-14"
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button type="submit" className="w-full h-12 text-lg" disabled={!accessCode.trim() || joinExam.isPending}>
                {joinExam.isPending && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                Enter Exam Room
              </Button>
            </CardFooter>
          </form>
        </Card>

      </div>
    </StudentLayout>
  );
}