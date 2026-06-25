import { useEffect, useRef, useState, useCallback } from "react";
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
import { Loader2, Video, VideoOff, Mic, ShieldAlert, Timer, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { FlagInputType } from "@workspace/api-client-react/src/generated/api.schemas";

export default function ExamTaking() {
  const params = useParams();
  const sessionId = Number(params.sessionId);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: sessionWithExam, isLoading } = useGetSession(sessionId, { query: { enabled: !!sessionId && !isNaN(sessionId) } });
  const startSession = useStartSession();
  const submitSession = useSubmitSession();
  const reportFlag = useReportFlag();

  const [hasStarted, setHasStarted] = useState(false);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [submitConfirmOpen, setSubmitConfirmOpen] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [timerRunning, setTimerRunning] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState("");

  // Keep answers in a ref so auto-submit always sees the latest values
  const answersRef = useRef(answers);
  useEffect(() => { answersRef.current = answers; }, [answers]);

  // Keep track of which low-time toasts we've already shown
  const warned5Min = useRef(false);
  const warned1Min = useRef(false);

  const exam = sessionWithExam?.exam;
  const session = sessionWithExam?.session;
  const questions = exam?.questions || [];

  // ── Camera ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!hasStarted) return;
    let acquired: MediaStream | null = null;
    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then(s => {
        acquired = s;
        setStream(s);
        if (videoRef.current) videoRef.current.srcObject = s;
      })
      .catch(() => setCameraError("Camera access required to take this exam."));

    return () => { acquired?.getTracks().forEach(t => t.stop()); };
  }, [hasStarted]);

  // ── Timer initialisation ────────────────────────────────────────────────────
  // Run once when hasStarted becomes true AND session data is available.
  useEffect(() => {
    if (!hasStarted || !exam?.durationMinutes || !session || timerRunning) return;

    let remaining: number;
    if (session.startedAt) {
      const startMs = new Date(session.startedAt).getTime();
      const endMs = startMs + exam.durationMinutes * 60 * 1000;
      remaining = Math.max(0, Math.round((endMs - Date.now()) / 1000));
    } else {
      remaining = exam.durationMinutes * 60;
    }

    setTimeLeft(remaining);
    setTimerRunning(true);
  }, [hasStarted, exam?.durationMinutes, session, timerRunning]);

  // ── Countdown tick ──────────────────────────────────────────────────────────
  const doSubmit = useCallback((auto = false) => {
    if (auto) {
      toast({ title: "⏰ Time's up!", description: "Your exam has been submitted automatically." });
    }
    const formatted = Object.entries(answersRef.current).map(([qId, ans]) => ({
      questionId: Number(qId),
      answer: ans,
    }));
    submitSession.mutate({ sessionId, data: { answers: formatted } }, {
      onSuccess: () => {
        stream?.getTracks().forEach(t => t.stop());
        setLocation(`/exam/${sessionId}/results`);
      },
    });
  }, [sessionId, submitSession, stream, setLocation, toast]);

  const doSubmitRef = useRef(doSubmit);
  useEffect(() => { doSubmitRef.current = doSubmit; }, [doSubmit]);

  useEffect(() => {
    if (!timerRunning) return;

    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev === null) return null;

        const next = prev - 1;

        // Low-time warnings
        if (next === 300 && !warned5Min.current) {
          warned5Min.current = true;
          toast({
            title: "5 minutes remaining",
            description: "Start wrapping up — your exam will be submitted automatically.",
          });
        }
        if (next === 60 && !warned1Min.current) {
          warned1Min.current = true;
          toast({
            title: "1 minute remaining!",
            description: "Submitting automatically in 60 seconds.",
            variant: "destructive",
          });
        }

        if (next <= 0) {
          clearInterval(interval);
          doSubmitRef.current(true);
          return 0;
        }

        return next;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [timerRunning, toast]);

  // ── AI monitoring simulation ────────────────────────────────────────────────
  useEffect(() => {
    if (!hasStarted || !stream || cameraError) return;
    const id = setInterval(() => {
      if (Math.random() < 0.2) {
        const types: FlagInputType[] = ["face_not_visible", "looking_away", "multiple_faces"];
        const type = types[Math.floor(Math.random() * types.length)];
        reportFlag.mutate({
          sessionId,
          data: { type, detectedAt: new Date().toISOString(), description: `AI detected: ${type.replace(/_/g, " ")}` },
        });
      }
    }, 30000);
    return () => clearInterval(id);
  }, [hasStarted, stream, cameraError, sessionId, reportFlag]);

  // ── Redirect if already submitted ──────────────────────────────────────────
  useEffect(() => {
    if (!isLoading && session?.status === "submitted") {
      setLocation(`/exam/${sessionId}/results`);
    }
  }, [isLoading, session, sessionId, setLocation]);

  const handleStart = () => {
    startSession.mutate({ sessionId }, {
      onSuccess: () => setHasStarted(true),
      onError: () => setHasStarted(true),
    });
  };

  const formatTime = (seconds: number | null) => {
    if (seconds === null) return "--:--";
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  // ── Derived timer state ─────────────────────────────────────────────────────
  const isUrgent = timeLeft !== null && timeLeft <= 60;
  const isWarning = timeLeft !== null && timeLeft > 60 && timeLeft <= 300;

  // ── Loading / redirect states ───────────────────────────────────────────────
  if (isLoading) return <StudentLayout><div className="flex h-screen items-center justify-center">Loading exam…</div></StudentLayout>;
  if (session?.status === "submitted") return null;

  // ── Pre-start screen ────────────────────────────────────────────────────────
  if (!hasStarted) {
    return (
      <StudentLayout>
        <div className="flex items-center justify-center min-h-[80vh]">
          <Card className="w-full max-w-2xl p-8 border-primary/20 shadow-lg">
            <h1 className="text-3xl font-display font-bold text-center mb-2">{exam?.title}</h1>
            <p className="text-center text-muted-foreground mb-8">
              {exam?.durationMinutes} Minutes · {questions.length} Questions
            </p>

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
              {startSession.isPending && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
              Agree and Begin Exam
            </Button>
          </Card>
        </div>
      </StudentLayout>
    );
  }

  // ── Camera error screen ─────────────────────────────────────────────────────
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

  // ── Active exam UI ──────────────────────────────────────────────────────────
  return (
    <StudentLayout>
      <div className="relative">
        {/* Floating proctoring widget */}
        <div className="fixed bottom-6 right-6 z-50 bg-black rounded-lg shadow-2xl overflow-hidden border-2 border-border/20 w-64">
          <div className="bg-primary/90 text-white text-xs px-3 py-1.5 font-medium flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
              MONITORED
            </span>
            <span className="flex items-center gap-1 opacity-70">
              <Mic className="h-3 w-3" /> <Video className="h-3 w-3" />
            </span>
          </div>
          <div className="aspect-video bg-zinc-900 relative">
            <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover transform -scale-x-100" />
          </div>

          {/* Timer inside the widget when low */}
          {(isUrgent || isWarning) && (
            <div className={`px-3 py-2 text-center text-sm font-mono font-bold ${isUrgent ? "bg-red-600 text-white animate-pulse" : "bg-yellow-500 text-white"}`}>
              <AlertTriangle className="inline h-3.5 w-3.5 mr-1" />
              {formatTime(timeLeft)} remaining
            </div>
          )}
        </div>

        {/* Sticky top bar */}
        <div className={`sticky top-0 z-40 border-b shadow-sm mb-8 -mx-4 md:-mx-8 px-4 md:px-8 py-4 flex items-center justify-between transition-colors ${isUrgent ? "bg-red-50 border-red-200" : "bg-background"}`}>
          <div>
            <h1 className="text-xl font-bold truncate pr-4">{exam?.title}</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              {Object.keys(answers).length} of {questions.length} answered
            </p>
          </div>

          <div className="flex items-center gap-4 shrink-0">
            {/* Timer chip */}
            <div className={`flex items-center gap-2 font-mono text-xl font-bold px-4 py-2 rounded-lg border transition-all ${
              isUrgent
                ? "bg-red-600 text-white border-red-600 animate-pulse"
                : isWarning
                ? "bg-yellow-50 text-yellow-700 border-yellow-300"
                : "bg-slate-100 text-foreground border-transparent"
            }`}>
              <Timer className="h-5 w-5 shrink-0" />
              {formatTime(timeLeft)}
            </div>

            <Button
              onClick={() => setSubmitConfirmOpen(true)}
              disabled={submitSession.isPending}
              className={isUrgent ? "bg-red-600 hover:bg-red-700" : ""}
            >
              {submitSession.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Submit Exam
            </Button>
          </div>
        </div>

        {/* Urgent full-width banner */}
        {isUrgent && (
          <div className="bg-red-600 text-white text-center py-2 text-sm font-semibold -mx-4 md:-mx-8 px-4 mb-6 animate-pulse">
            ⏰ Less than 1 minute remaining — your exam will be submitted automatically!
          </div>
        )}

        {/* Questions */}
        <div className="space-y-12 pb-32 max-w-4xl">
          {questions.map((q, index) => (
            <Card
              key={q.id}
              id={`question-${q.id}`}
              className={`border shadow-sm scroll-mt-24 transition-colors ${answers[q.id] ? "border-primary/30" : ""}`}
            >
              <div className="bg-slate-50 border-b px-6 py-3 font-medium text-sm text-muted-foreground flex justify-between">
                <span>Question {index + 1} of {questions.length}</span>
                <span>{q.points || 1} point{(q.points || 1) !== 1 ? "s" : ""}</span>
              </div>
              <CardContent className="p-6">
                <p className="text-lg mb-6 leading-relaxed">{q.text}</p>

                {q.type === "multiple_choice" || q.type === "true_false" ? (
                  <RadioGroup
                    value={answers[q.id] || ""}
                    onValueChange={(val) => setAnswers(prev => ({ ...prev, [q.id]: val }))}
                    className="space-y-3"
                  >
                    {q.options?.map((opt, i) => (
                      <div key={i} className={`flex items-start space-x-3 space-y-0 p-3 rounded-md border cursor-pointer hover:bg-slate-50 transition-colors ${answers[q.id] === opt ? "bg-primary/5 border-primary/40" : ""}`}>
                        <RadioGroupItem value={opt} id={`q${q.id}-opt${i}`} className="mt-1" />
                        <Label htmlFor={`q${q.id}-opt${i}`} className="font-normal text-base cursor-pointer flex-1 leading-relaxed">
                          {opt}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                ) : q.type === "short_answer" ? (
                  <Input
                    placeholder="Your answer…"
                    value={answers[q.id] || ""}
                    onChange={(e) => setAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                    className="max-w-md"
                  />
                ) : (
                  <Textarea
                    placeholder="Write your essay here…"
                    className="min-h-48"
                    value={answers[q.id] || ""}
                    onChange={(e) => setAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                  />
                )}
              </CardContent>
            </Card>
          ))}

          <div className="flex justify-center pt-8">
            <Button size="lg" className="px-12 h-14 text-lg" onClick={() => setSubmitConfirmOpen(true)} disabled={submitSession.isPending}>
              {submitSession.isPending && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
              Finish &amp; Submit Exam
            </Button>
          </div>
        </div>

        {/* Submit confirmation dialog */}
        <AlertDialog open={submitConfirmOpen} onOpenChange={setSubmitConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Submit Exam?</AlertDialogTitle>
              <AlertDialogDescription>
                You have answered <strong>{Object.keys(answers).length}</strong> of <strong>{questions.length}</strong> questions.
                {Object.keys(answers).length < questions.length && (
                  <span className="block mt-2 text-yellow-700 font-medium">
                    {questions.length - Object.keys(answers).length} question{questions.length - Object.keys(answers).length > 1 ? "s are" : " is"} unanswered and will receive zero points.
                  </span>
                )}
                <span className="block mt-2">Once submitted, you cannot change your answers.</span>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Keep Reviewing</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => doSubmit(false)}
                className="bg-primary text-white"
                disabled={submitSession.isPending}
              >
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
