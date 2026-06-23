import { useEffect, useRef, useState, useMemo } from "react";
import { useParams, useLocation } from "wouter";
import StudentLayout from "@/components/layout/student-layout";
import { useGetSession, useStartSession, useSubmitSession, useReportFlag } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Loader2, Video, VideoOff, Mic, ShieldAlert, Timer } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { FlagInputType } from "@workspace/api-client-react/src/generated/api.schemas";

export default function ExamTaking() {
  const params = useParams();
  const sessionId = Number(params.sessionId);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: sessionWithExam, isLoading } = useGetSession(sessionId, { query: { enabled: !!sessionId } });
  const startSession = useStartSession();
  const submitSession = useSubmitSession();
  const reportFlag = useReportFlag();

  const [hasStarted, setHasStarted] = useState(false);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [submitConfirmOpen, setSubmitConfirmOpen] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState("");

  const exam = sessionWithExam?.exam;
  const questions = exam?.questions || [];

  // Initialize and handle camera
  useEffect(() => {
    if (hasStarted) {
      navigator.mediaDevices.getUserMedia({ video: true, audio: true })
        .then(s => {
          setStream(s);
          if (videoRef.current) {
            videoRef.current.srcObject = s;
          }
        })
        .catch(err => {
          console.error("Camera error:", err);
          setCameraError("Camera access required to take this exam.");
        });
      
      return () => {
        if (stream) {
          stream.getTracks().forEach(track => track.stop());
        }
      };
    }
  }, [hasStarted]);

  // Handle timer
  useEffect(() => {
    if (hasStarted && exam?.durationMinutes) {
      if (timeLeft === null) {
        // If resuming, calculate actual time left. For simplicity here, full duration.
        setTimeLeft(exam.durationMinutes * 60);
      }

      const timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev !== null && prev <= 0) {
            clearInterval(timer);
            handleAutoSubmit();
            return 0;
          }
          return prev !== null ? prev - 1 : null;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [hasStarted, exam?.durationMinutes, timeLeft]);

  // Format time
  const formatTime = (seconds: number | null) => {
    if (seconds === null) return "--:--";
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Mock AI Monitoring
  useEffect(() => {
    if (hasStarted && stream && !cameraError) {
      const monitorInterval = setInterval(() => {
        // 20% chance to report a random flag
        if (Math.random() < 0.2) {
          const types: FlagInputType[] = ["face_not_visible", "looking_away", "multiple_faces"];
          const randomType = types[Math.floor(Math.random() * types.length)];
          
          reportFlag.mutate({
            sessionId,
            data: {
              type: randomType,
              detectedAt: new Date().toISOString(),
              description: `AI detected: ${randomType.replace(/_/g, " ")}`
            }
          });
        }
      }, 30000); // Check every 30 seconds

      return () => clearInterval(monitorInterval);
    }
  }, [hasStarted, stream, cameraError, sessionId, reportFlag]);

  const handleStart = () => {
    startSession.mutate({ sessionId }, {
      onSuccess: () => {
        setHasStarted(true);
      },
      onError: () => {
        // If already started, just proceed
        setHasStarted(true);
      }
    });
  };

  const handleAutoSubmit = () => {
    toast({ title: "Time's up!", description: "Exam submitted automatically." });
    doSubmit();
  };

  const doSubmit = () => {
    const formattedAnswers = Object.entries(answers).map(([qId, ans]) => ({
      questionId: Number(qId),
      answer: ans
    }));

    submitSession.mutate({
      sessionId,
      data: { answers: formattedAnswers }
    }, {
      onSuccess: () => {
        if (stream) stream.getTracks().forEach(t => t.stop());
        setLocation(`/exam/${sessionId}/results`);
      }
    });
  };

  if (isLoading) return <StudentLayout><div className="flex h-screen items-center justify-center">Loading exam...</div></StudentLayout>;
  
  if (sessionWithExam?.session.status === 'submitted') {
    // Already submitted
    setLocation(`/exam/${sessionId}/results`);
    return null;
  }

  if (!hasStarted) {
    return (
      <StudentLayout>
        <div className="flex items-center justify-center min-h-[80vh]">
          <Card className="w-full max-w-2xl p-8 border-primary/20 shadow-lg">
            <h1 className="text-3xl font-display font-bold text-center mb-2">{exam?.title}</h1>
            <p className="text-center text-muted-foreground mb-8">{exam?.durationMinutes} Minutes • {questions.length} Questions</p>
            
            <div className="bg-slate-50 p-6 rounded-lg border mb-8">
              <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                <ShieldAlert className="text-primary" /> Proctoring Requirements
              </h3>
              <ul className="space-y-3 text-sm">
                <li className="flex gap-2"><div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" /> Camera and microphone access is strictly required.</li>
                <li className="flex gap-2"><div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" /> Ensure your face is clearly visible and well-lit.</li>
                <li className="flex gap-2"><div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" /> AI will monitor for looking away, other people, or using phones.</li>
                <li className="flex gap-2"><div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" /> Do not leave the browser tab; actions are recorded.</li>
              </ul>
            </div>

            <Button size="lg" className="w-full h-14 text-lg" onClick={handleStart} disabled={startSession.isPending}>
              {startSession.isPending ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
              Agree and Begin Exam
            </Button>
          </Card>
        </div>
      </StudentLayout>
    );
  }

  if (cameraError) {
    return (
      <StudentLayout>
        <div className="text-center p-12 bg-destructive/10 border border-destructive/20 rounded-lg max-w-2xl mx-auto mt-12">
          <VideoOff className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-bold text-destructive mb-2">Camera Access Required</h2>
          <p className="mb-6">{cameraError}</p>
          <Button onClick={() => window.location.reload()}>Refresh and Allow Access</Button>
        </div>
      </StudentLayout>
    );
  }

  return (
    <StudentLayout>
      <div className="relative">
        {/* Floating Proctor UI */}
        <div className="fixed bottom-6 right-6 z-50 bg-black rounded-lg shadow-2xl overflow-hidden border-2 border-border/20 w-64">
          <div className="bg-primary/90 text-white text-xs px-3 py-1.5 font-medium flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
              MONITORED
            </span>
            <span className="flex items-center gap-1 opacity-70">
              <Mic className="h-3 w-3" />
            </span>
          </div>
          <div className="aspect-video bg-zinc-900 relative">
            <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover transform -scale-x-100" />
          </div>
        </div>

        {/* Top Bar with Timer */}
        <div className="sticky top-0 z-40 bg-background border-b shadow-sm mb-8 -mx-4 md:-mx-8 px-4 md:px-8 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold truncate pr-4">{exam?.title}</h1>
          <div className="flex items-center gap-4 shrink-0">
            <div className={`flex items-center gap-2 font-mono text-xl font-bold px-4 py-1.5 rounded-md ${timeLeft !== null && timeLeft < 300 ? 'bg-destructive/10 text-destructive' : 'bg-slate-100'}`}>
              <Timer className="h-5 w-5" />
              {formatTime(timeLeft)}
            </div>
            <Button onClick={() => setSubmitConfirmOpen(true)}>Submit Exam</Button>
          </div>
        </div>

        {/* Exam Content */}
        <div className="space-y-12 pb-32 max-w-4xl">
          {questions.map((q, index) => (
            <Card key={q.id} className="border shadow-sm scroll-mt-24" id={`question-${q.id}`}>
              <div className="bg-slate-50 border-b px-6 py-3 font-medium text-sm text-muted-foreground flex justify-between">
                <span>Question {index + 1}</span>
                <span>{q.points || 1} points</span>
              </div>
              <CardContent className="p-6">
                <p className="text-lg mb-6 leading-relaxed">{q.text}</p>
                
                {q.type === 'multiple_choice' || q.type === 'true_false' ? (
                  <RadioGroup 
                    value={answers[q.id] || ""} 
                    onValueChange={(val) => setAnswers(prev => ({...prev, [q.id]: val}))}
                    className="space-y-3"
                  >
                    {q.options?.map((opt, i) => (
                      <div key={i} className="flex items-start space-x-3 space-y-0 p-3 rounded-md border hover:bg-slate-50 transition-colors">
                        <RadioGroupItem value={opt} id={`q${q.id}-opt${i}`} className="mt-1" />
                        <Label htmlFor={`q${q.id}-opt${i}`} className="font-normal text-base cursor-pointer flex-1 leading-relaxed">
                          {opt}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                ) : q.type === 'short_answer' ? (
                  <Input 
                    placeholder="Your answer..." 
                    value={answers[q.id] || ""}
                    onChange={(e) => setAnswers(prev => ({...prev, [q.id]: e.target.value}))}
                    className="max-w-md"
                  />
                ) : (
                  <Textarea 
                    placeholder="Write your essay here..." 
                    className="min-h-48"
                    value={answers[q.id] || ""}
                    onChange={(e) => setAnswers(prev => ({...prev, [q.id]: e.target.value}))}
                  />
                )}
              </CardContent>
            </Card>
          ))}
          
          <div className="flex justify-center pt-8">
            <Button size="lg" className="px-12 h-14 text-lg" onClick={() => setSubmitConfirmOpen(true)}>
              Finish & Submit Exam
            </Button>
          </div>
        </div>

        <AlertDialog open={submitConfirmOpen} onOpenChange={setSubmitConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Submit Exam?</AlertDialogTitle>
              <AlertDialogDescription>
                You have answered {Object.keys(answers).length} of {questions.length} questions.
                Once submitted, you cannot change your answers and your session will end.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Keep Reviewing</AlertDialogCancel>
              <AlertDialogAction onClick={doSubmit} className="bg-primary text-white" disabled={submitSession.isPending}>
                {submitSession.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Confirm Submit
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

      </div>
    </StudentLayout>
  );
}