import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useLocation } from "wouter";
import StudentLayout from "@/components/layout/student-layout";
import { useGetSession, useStartSession, useSubmitSession, useReportFlag, getGetSessionQueryKey, FlagInputType, customFetch } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Loader2, Video, VideoOff, Mic, ShieldAlert, Timer, AlertTriangle, Maximize2, UploadCloud, Paperclip, Trash2, Camera, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import LatexRenderer from "@/components/latex-renderer";


export default function ExamTaking() {
  const params = useParams();
  const sessionId = Number(params.sessionId);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: sessionWithExam, isLoading } = useGetSession(sessionId, { query: { queryKey: getGetSessionQueryKey(sessionId), enabled: !!sessionId && !isNaN(sessionId) } });
  const startSession = useStartSession();
  const submitSession = useSubmitSession();
  const reportFlag = useReportFlag();

  const [hasStarted, setHasStarted] = useState(false);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [submitConfirmOpen, setSubmitConfirmOpen] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [timerRunning, setTimerRunning] = useState(false);
  const [liveFlags, setLiveFlags] = useState(0);
  const [fullscreenWarning, setFullscreenWarning] = useState(false);

  // Upload grace period state
  const [isUploadWindow, setIsUploadWindow] = useState(false);
  const [uploadTimeLeft, setUploadTimeLeft] = useState(300); // 5 minutes (300 seconds)
  const [attachments, setAttachments] = useState<Record<number, string[]>>({});

  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState("");

  // Camera capture modal state
  const [startedAtTime, setStartedAtTime] = useState<number | null>(null);
  const [activeCaptureQId, setActiveCaptureQId] = useState<number | null>(null);
  const [captureStream, setCaptureStream] = useState<MediaStream | null>(null);
  const captureVideoRef = useRef<HTMLVideoElement | null>(null);

  const closeCameraCapture = () => {
    if (captureStream) {
      captureStream.getTracks().forEach(track => track.stop());
    }
    setCaptureStream(null);
    setActiveCaptureQId(null);
  };

  const startCameraCapture = async (qId: number) => {
    try {
      setActiveCaptureQId(qId);
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } } 
      });
      setCaptureStream(stream);
      setTimeout(() => {
        if (captureVideoRef.current) {
          captureVideoRef.current.srcObject = stream;
        }
      }, 150);
    } catch (err) {
      toast({ title: "Camera access failed", description: "Please ensure camera permissions are granted.", variant: "destructive" });
      setActiveCaptureQId(null);
    }
  };

  const capturePhoto = async () => {
    if (activeCaptureQId === null || !captureStream || !captureVideoRef.current) return;
    try {
      const video = captureVideoRef.current;
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.85);

        const res = await customFetch<{ url: string, filename: string }>(`/sessions/${sessionId}/upload`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ filename: `camera_capture_${Date.now()}.jpg`, fileData: dataUrl }),
        });

        setAttachments(prev => ({
          ...prev,
          [activeCaptureQId]: [...(prev[activeCaptureQId] || []), res.url]
        }));

        toast({ title: "Photo captured", description: "Image attached successfully." });
        closeCameraCapture();
      }
    } catch (err) {
      toast({ title: "Capture failed", description: "Could not capture image from webcam.", variant: "destructive" });
    }
  };

  // Keep answers, attachments, and upload state in refs so callbacks always see the latest values
  const answersRef = useRef(answers);
  useEffect(() => { answersRef.current = answers; }, [answers]);

  const attachmentsRef = useRef(attachments);
  useEffect(() => { attachmentsRef.current = attachments; }, [attachments]);

  const isUploadWindowRef = useRef(isUploadWindow);
  useEffect(() => { isUploadWindowRef.current = isUploadWindow; }, [isUploadWindow]);

  // Keep track of which low-time toasts we've already shown
  const warned5Min = useRef(false);
  const warned1Min = useRef(false);

  const exam = sessionWithExam?.exam;
  const session = sessionWithExam?.session;
  const questions = exam?.questions || [];
  const isProctoringEnabled = exam?.aiConfig?.proctoringEnabled !== false;

  const questionsRef = useRef(questions);
  useEffect(() => { questionsRef.current = questions; }, [questions]);

  // ── Media Recorder Buffer for clip captures ────────────────────────────────
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  // Initialize rolling recording buffer
  useEffect(() => {
    if (!stream) return;
    try {
      const options = { mimeType: "video/webm;codecs=vp8" };
      const recorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          recordedChunksRef.current.push(e.data);
          // Keep only the last 4 chunks (~12 seconds of video if timeslice is 3s)
          if (recordedChunksRef.current.length > 4) {
            recordedChunksRef.current.shift();
          }
        }
      };

      // Start recording with 3-second slices
      recorder.start(3000);
    } catch (e) {
      console.warn("MediaRecorder not fully supported or failed to initialize:", e);
    }

    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      }
    };
  }, [stream]);

  const captureVideoClip = async (): Promise<string | null> => {
    return new Promise((resolve) => {
      if (!mediaRecorderRef.current || recordedChunksRef.current.length === 0) {
        resolve(null);
        return;
      }
      // Wait 5 seconds after flag is triggered to capture the post-cheating frame buffer
      setTimeout(() => {
        try {
          const blob = new Blob(recordedChunksRef.current, { type: "video/webm" });
          const reader = new FileReader();
          reader.onloadend = () => {
            resolve(reader.result as string);
          };
          reader.readAsDataURL(blob);
        } catch (err) {
          resolve(null);
        }
      }, 5000);
    });
  };

  // Helper helper to trigger flags with clips
  const triggerFlag = async (type: FlagInputType, description: string) => {
    if (!sessionId || !Number.isInteger(sessionId) || sessionId <= 0) return;

    setLiveFlags((n) => n + 1);

    const clip = await captureVideoClip();
    reportFlag.mutate({
      sessionId,
      data: {
        type,
        detectedAt: new Date().toISOString(),
        description,
        clipData: clip || undefined,
      },
    }, {
      onError: (err) => {
        const message = err instanceof Error ? err.message : "Unable to report flag";
        if (!message.includes("cooldown") && !message.includes("Unsupported")) {
          toast({ title: "Flag reporting failed", description: message, variant: "destructive" });
        }
      }
    });
  };

  // ── Camera ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!hasStarted || !isProctoringEnabled) return;
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
    const formatted = questionsRef.current.map((q) => {
      return {
        questionId: q.id,
        answer: answersRef.current[q.id] || "",
        attachments: attachmentsRef.current[q.id] || [],
      };
    });
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
          const hasEssays = questionsRef.current.some((q: any) => q.type === "essay");
          if (hasEssays) {
            setIsUploadWindow(true);
            setTimerRunning(false);
            toast({
              title: "✍️ Exam Time Finished!",
              description: "You now have 5 minutes to upload photos of your handwritten scratchpad proofs.",
            });
          } else {
            doSubmitRef.current(true);
          }
          return 0;
        }

        return next;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [timerRunning, toast]);

  // ── Tab-switch detection ────────────────────────────────────────────────────
  useEffect(() => {
    if (!hasStarted) return;
    const handleVisibilityChange = () => {
      if (isUploadWindowRef.current) return;
      
      // 20-second grace period for camera/permission fullscreen toggles
      const elapsed = startedAtTime ? (Date.now() - startedAtTime) / 1000 : 0;
      if (elapsed < 20) return;

      if (document.hidden) {
        triggerFlag("tab_switch" as FlagInputType, "Student switched away from the exam tab");
        toast({ title: "⚠ Tab Switch Detected", description: "Leaving the exam tab has been flagged.", variant: "destructive" });
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [hasStarted, sessionId, reportFlag, toast, startedAtTime]);

  // ── Fullscreen enforcement ──────────────────────────────────────────────────
  useEffect(() => {
    if (!hasStarted) return;
    // Request fullscreen on exam start
    try { document.documentElement.requestFullscreen().catch(() => {}); } catch {}

    const handleFullscreenChange = () => {
      if (isUploadWindowRef.current) return;

      // 20-second grace period for camera/permission fullscreen toggles
      const elapsed = startedAtTime ? (Date.now() - startedAtTime) / 1000 : 0;
      if (elapsed < 20) return;

      if (!document.fullscreenElement) {
        setFullscreenWarning(true);
        triggerFlag("fullscreen_exit" as FlagInputType, "Student exited fullscreen mode");
      } else {
        setFullscreenWarning(false);
      }
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, [hasStarted, sessionId, reportFlag, startedAtTime]);

  // ── Upload Window countdown ──────────────────────────────────────────────────
  useEffect(() => {
    if (!isUploadWindow) return;

    try {
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
    } catch {}

    const interval = setInterval(() => {
      setUploadTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          doSubmitRef.current(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isUploadWindow]);

  // ── AI monitoring simulation ────────────────────────────────────────────────
  useEffect(() => {
    if (!hasStarted || !stream || cameraError || isUploadWindow || !isProctoringEnabled) return;
    const id = window.setInterval(() => {
      if (Math.random() < 0.05) {
        const types: FlagInputType[] = ["face_not_visible", "looking_away", "multiple_faces"];
        const type = types[Math.floor(Math.random() * types.length)];
        void triggerFlag(type, `AI detected: ${type.replace(/_/g, " ")}`);
      }
    }, 60000);
    return () => window.clearInterval(id);
  }, [hasStarted, stream, cameraError, sessionId, reportFlag, isUploadWindow, isProctoringEnabled]);

  // ── Redirect if already submitted ──────────────────────────────────────────
  useEffect(() => {
    if (!isLoading && session?.status === "submitted") {
      setLocation(`/exam/${sessionId}/results`);
    }
  }, [isLoading, session, sessionId, setLocation]);

  const handleStart = () => {
    startSession.mutate({ sessionId }, {
      onSuccess: () => {
        setStartedAtTime(Date.now());
        setHasStarted(true);
      },
      onError: () => {
        setStartedAtTime(Date.now());
        setHasStarted(true);
      },
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

  // ── Upload Grace Period Screen ──────────────────────────────────────────────
  if (isUploadWindow) {
    const essayQuestions = questions.filter(q => q.type === "essay");

    return (
      <StudentLayout>
        <div className="max-w-4xl mx-auto py-8 space-y-8 pb-32">
          {/* Header Card */}
          <Card className="border-amber-200 bg-amber-50/30 shadow-md">
            <CardHeader className="flex flex-row items-center justify-between gap-4">
              <div>
                <CardTitle className="text-xl text-amber-900 font-bold flex items-center gap-2">
                  <UploadCloud className="h-5 w-5 text-amber-600 animate-pulse" />
                  Handwritten Proof Image Upload Window
                </CardTitle>
                <CardDescription className="text-amber-800/80 mt-1">
                  Your text answers are frozen. You have a 5-minute window to upload images/photos of your handwritten math proofs.
                  Exit fullscreen if needed. Proctoring webcam remains active.
                </CardDescription>
              </div>
              <div className="shrink-0 font-mono text-2xl font-bold bg-amber-100 text-amber-900 border border-amber-300 px-4 py-2 rounded-lg flex items-center gap-2">
                <Timer className="h-6 w-6 animate-pulse" />
                {formatTime(uploadTimeLeft)}
              </div>
            </CardHeader>
          </Card>

          {/* Essay Questions Dropzone List */}
          <div className="space-y-6">
            {essayQuestions.map((q, idx) => {
              const qAttachments = attachments[q.id] || [];

              const handleFileDrop = async (e: React.DragEvent) => {
                e.preventDefault();
                const files = Array.from(e.dataTransfer.files);
                await uploadFiles(q.id, files);
              };

              const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
                const files = e.target.files ? Array.from(e.target.files) : [];
                await uploadFiles(q.id, files);
              };

              const uploadFiles = async (qId: number, files: File[]) => {
                for (const file of files) {
                  try {
                    const fileData = await new Promise<string>((resolve, reject) => {
                      const reader = new FileReader();
                      reader.onload = (e) => resolve(e.target?.result as string);
                      reader.onerror = (e) => reject(e);
                      reader.readAsDataURL(file);
                    });

                    const res = await customFetch<{ url: string, filename: string }>(`/sessions/${sessionId}/upload`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ filename: file.name, fileData }),
                    });
                    setAttachments(prev => ({
                      ...prev,
                      [qId]: [...(prev[qId] || []), res.url]
                    }));
                    toast({ title: "File uploaded", description: `${file.name} attached successfully.` });
                  } catch (err) {
                    toast({ title: "Upload failed", description: "Could not attach file.", variant: "destructive" });
                  }
                }
              };

              return (
                <Card key={q.id} className="border shadow-sm">
                  <CardHeader className="bg-slate-50 border-b py-3 px-6 flex flex-row items-center justify-between">
                    <CardTitle className="text-sm font-semibold text-slate-700">Question {idx + 1} Proof Attachments</CardTitle>
                    <span className="text-xs font-semibold text-muted-foreground">{q.points} points</span>
                  </CardHeader>
                  <CardContent className="p-6 space-y-4">
                    <div className="p-4 rounded-lg bg-slate-50 border">
                      <div className="text-xs font-semibold text-muted-foreground mb-1">Your Written Answer:</div>
                      <LatexRenderer text={answers[q.id] || "No response written."} />
                    </div>

                    {/* Dropzone */}
                    <div 
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={handleFileDrop}
                      className="border-2 border-dashed border-slate-300 rounded-lg p-6 flex flex-col items-center justify-center bg-slate-50 hover:bg-slate-100/50 transition-all cursor-pointer relative"
                    >
                      <input 
                        type="file" 
                        multiple 
                        accept="image/*" 
                        onChange={handleFileSelect}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                      />
                      <UploadCloud className="h-10 w-10 text-slate-400 mb-3" />
                      <p className="text-sm font-medium text-slate-700">Drag & drop your handwritten proof photos here</p>
                      <p className="text-xs text-slate-500 mt-1">or click to browse files (PNG, JPG, JPEG)</p>
                    </div>

                    <div className="flex justify-center">
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => startCameraCapture(q.id)}
                        className="flex items-center gap-2"
                      >
                        <Camera className="h-4 w-4" />
                        Take Photo with Device Camera
                      </Button>
                    </div>

                    {/* Uploaded List */}
                    {qAttachments.length > 0 && (
                      <div className="space-y-2">
                        <div className="text-xs font-semibold text-slate-500">Uploaded Attachments:</div>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                          {qAttachments.map((url, i) => (
                            <div key={i} className="flex items-center justify-between p-2 border rounded-md bg-white">
                              <span className="text-xs truncate font-mono text-slate-600 flex items-center gap-1.5">
                                <Paperclip className="h-3.5 w-3.5 shrink-0" />
                                {url.split("_").pop()}
                              </span>
                              <Button 
                                size="icon" 
                                variant="ghost" 
                                className="h-7 w-7 text-red-500 hover:text-red-700"
                                onClick={() => setAttachments(prev => ({
                                  ...prev,
                                  [q.id]: prev[q.id].filter(u => u !== url)
                                }))}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Action Button */}
          <div className="flex justify-center pt-4">
            <Button size="lg" className="px-16 h-14 text-lg" onClick={() => doSubmit(false)} disabled={submitSession.isPending}>
              {submitSession.isPending && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
              Finish &amp; Complete Submission
            </Button>
          </div>

          {/* Camera Capture Modal */}
          {activeCaptureQId !== null && (
            <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4">
              <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden max-w-lg w-full flex flex-col shadow-2xl">
                <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                  <h3 className="font-semibold text-white">Capture Proof Photo</h3>
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-400 hover:text-white" onClick={closeCameraCapture}>
                    <X className="h-5 w-5" />
                  </Button>
                </div>
                <div className="bg-black relative aspect-video flex items-center justify-center overflow-hidden">
                  <video 
                    ref={captureVideoRef} 
                    autoPlay 
                    playsInline 
                    muted 
                    className="w-full h-full object-cover scale-x-[-1]"
                  />
                  <div className="absolute bottom-3 left-3 bg-black/60 text-white text-xs px-2.5 py-1 rounded-md">
                    Webcam Active
                  </div>
                </div>
                <div className="p-4 flex items-center justify-between bg-slate-950 border-t border-slate-800">
                  <Button variant="ghost" className="text-slate-400 hover:text-white" onClick={closeCameraCapture}>
                    Cancel
                  </Button>
                  <Button className="bg-primary hover:bg-primary/90 flex items-center gap-2" onClick={capturePhoto}>
                    <Camera className="h-4 w-4" />
                    Capture &amp; Attach
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </StudentLayout>
    );
  }

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
                <ShieldAlert className="text-primary" /> {isProctoringEnabled ? "Proctoring Requirements" : "Exam Rules & Instructions"}
              </h3>
              <ul className="space-y-3 text-sm">
                {isProctoringEnabled && (
                  <>
                    <li className="flex gap-2"><div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />Camera and microphone access is strictly required throughout the exam.</li>
                    <li className="flex gap-2"><div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />Ensure your face is clearly visible and well-lit at all times.</li>
                    <li className="flex gap-2"><div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />AI monitors for looking away, multiple faces, phones, and other violations.</li>
                  </>
                )}
                <li className="flex gap-2"><div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />The exam runs in fullscreen — exiting fullscreen will be flagged.</li>
                <li className="flex gap-2"><div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />Switching browser tabs will be flagged and reported to your instructor.</li>
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
        {/* Fullscreen warning banner */}
        {fullscreenWarning && (
          <div className="fixed top-0 inset-x-0 z-[60] bg-red-600 text-white text-center py-3 text-sm font-semibold flex items-center justify-center gap-3 animate-pulse">
            <AlertTriangle className="h-4 w-4" />
            You exited fullscreen — this has been flagged!
            <button
              onClick={() => { try { document.documentElement.requestFullscreen(); } catch {} }}
              className="underline ml-2 font-bold"
            >
              Return to Fullscreen
            </button>
          </div>
        )}

        {/* Floating proctoring widget - responsive size */}
        <div className="fixed bottom-3 sm:bottom-6 right-3 sm:right-6 z-50 bg-black rounded-lg shadow-2xl overflow-hidden border-2 border-border/20 w-40 sm:w-48 md:w-64">
          <div className="bg-primary/90 text-white text-[10px] sm:text-xs px-2 sm:px-3 py-1 sm:py-1.5 font-medium flex items-center justify-between">
            <span className="flex items-center gap-1 sm:gap-1.5">
              <span className="h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-red-500 animate-pulse" />
              <span className="hidden sm:inline">MONITORED</span>
              <span className="sm:hidden">ON</span>
            </span>
            <span className="flex items-center gap-0.5 sm:gap-1 opacity-70">
              <Mic className="h-2.5 w-2.5 sm:h-3 sm:w-3" /> <Video className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
            </span>
          </div>
          <div className="aspect-video bg-zinc-900 relative">
            <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover transform -scale-x-100" />
          </div>

          {/* Live flag counter */}
          {liveFlags > 0 && (
            <div className="px-3 py-2 bg-red-900/90 text-red-200 text-xs flex items-center gap-1.5">
              <AlertTriangle className="h-3 w-3 text-red-400" />
              {liveFlags} flag{liveFlags > 1 ? "s" : ""} raised — instructor will review
            </div>
          )}

          {/* Timer inside the widget when low */}
          {(isUrgent || isWarning) && (
            <div className={`px-3 py-2 text-center text-sm font-mono font-bold ${isUrgent ? "bg-red-600 text-white animate-pulse" : "bg-yellow-500 text-white"}`}>
              <AlertTriangle className="inline h-3.5 w-3.5 mr-1" />
              {formatTime(timeLeft)} remaining
            </div>
          )}
        </div>

        {/* Sticky top bar */}
        <div className={`sticky top-0 z-40 border-b shadow-sm mb-6 sm:mb-8 -mx-3 sm:-mx-4 md:-mx-8 px-3 sm:px-4 md:px-8 py-3 sm:py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 transition-colors ${isUrgent ? "bg-red-50 border-red-200" : "bg-background"}`}>
          <div className="min-w-0">
            <h1 className="text-lg sm:text-xl font-bold truncate pr-2 sm:pr-4">{exam?.title}</h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              {Object.keys(answers).length} of {questions.length} answered
            </p>
          </div>

          <div className="flex items-center gap-2 sm:gap-4 shrink-0">
            {/* Timer chip */}
            <div className={`flex items-center gap-1 sm:gap-2 font-mono text-base sm:text-lg md:text-xl font-bold px-2 sm:px-4 py-1.5 sm:py-2 rounded-lg border transition-all ${
              isUrgent
                ? "bg-red-600 text-white border-red-600 animate-pulse"
                : isWarning
                ? "bg-yellow-50 text-yellow-700 border-yellow-300"
                : "bg-slate-100 text-foreground border-transparent"
            }`}>
              <Timer className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
              <span className="text-sm sm:text-base md:text-lg">{formatTime(timeLeft)}</span>
            </div>

            <Button
              onClick={() => setSubmitConfirmOpen(true)}
              disabled={submitSession.isPending}
              className={`h-9 sm:h-10 text-xs sm:text-sm px-2 sm:px-4 ${isUrgent ? "bg-red-600 hover:bg-red-700" : ""}`}
            >
              {submitSession.isPending && <Loader2 className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4 animate-spin" />}
              <span className="hidden sm:inline">Submit Exam</span>
              <span className="sm:hidden">Submit</span>
            </Button>
          </div>
        </div>

        {/* LaTeX & Handwritten Upload Advice Banner */}
        <div className="bg-indigo-50 border border-indigo-100 text-indigo-800 rounded-lg p-3 sm:p-4 mb-6 text-xs sm:text-sm flex items-start gap-2.5">
          <span className="shrink-0 text-base">💡</span>
          <div>
            <p className="font-semibold mb-0.5">Wrote your solutions on paper?</p>
            <p className="text-indigo-700 leading-relaxed">
              If you don't know LaTeX or have written down mathematical derivations on scratch paper, you can leave the answer fields blank (or type a brief note) and <strong>upload photos of your paper sheets after submitting this exam</strong>. You will be given a dedicated upload interface immediately after clicking submit.
            </p>
          </div>
        </div>

        {/* Urgent full-width banner */}
        {isUrgent && (
          <div className="bg-red-600 text-white text-center py-2 text-sm font-semibold -mx-4 md:-mx-8 px-4 mb-6 animate-pulse">
            ⏰ Less than 1 minute remaining — your exam will be submitted automatically!
          </div>
        )}

        {/* Questions */}
        <div className="space-y-6 sm:space-y-8 md:space-y-12 pb-24 sm:pb-32 max-w-4xl px-0">
          {questions.map((q, index) => (
            <Card
              key={q.id}
              id={`question-${q.id}`}
              className={`border shadow-sm scroll-mt-32 sm:scroll-mt-40 transition-colors ${answers[q.id] ? "border-primary/30" : ""}`}
            >
              <div className="bg-slate-50 border-b px-3 sm:px-4 md:px-6 py-2 sm:py-3 font-medium text-xs sm:text-sm text-muted-foreground flex justify-between">
                <span>Question {index + 1} of {questions.length}</span>
                <span>{q.points || 1} point{(q.points || 1) !== 1 ? "s" : ""}</span>
              </div>
              <CardContent className="p-3 sm:p-4 md:p-6">
                <LatexRenderer text={q.text} className="text-base sm:text-lg mb-4 sm:mb-6 leading-relaxed text-slate-800" />

                {q.type === "multiple_choice" || q.type === "true_false" ? (
                  <RadioGroup
                    value={answers[q.id] || ""}
                    onValueChange={(val) => setAnswers(prev => ({ ...prev, [q.id]: val }))}
                    className="space-y-2 sm:space-y-3"
                  >
                    {q.options?.map((opt, i) => (
                      <div key={i} className={`flex items-start space-x-2 sm:space-x-3 space-y-0 p-2 sm:p-3 rounded-md border cursor-pointer hover:bg-slate-50 transition-colors ${answers[q.id] === opt ? "bg-primary/5 border-primary/40" : ""}`}>
                        <RadioGroupItem value={opt} id={`q${q.id}-opt${i}`} className="mt-1" />
                        <Label htmlFor={`q${q.id}-opt${i}`} className="font-normal text-sm sm:text-base cursor-pointer flex-1 leading-relaxed">
                          <LatexRenderer text={opt} />
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
                  <div className="space-y-4">
                    <Textarea
                      placeholder="Write your essay / proof here… You can use standard LaTeX (e.g. $\int x^2 \,dx = \frac{x^3}{3} + C$)"
                      className="min-h-48 font-mono leading-relaxed"
                      value={answers[q.id] || ""}
                      onChange={(e) => setAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                    />
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                      💡 <strong>Don't know LaTeX or wrote your work on paper?</strong> You can leave this blank or type a brief note, and <strong>upload photos/scans of your handwritten paper sheets</strong> directly on the next screen after clicking submit!
                    </p>
                    {answers[q.id] && (
                      <div className="p-4 rounded-lg border bg-slate-50/50">
                        <div className="text-xs font-semibold text-muted-foreground mb-2">Real-time Mathematical Proof Preview:</div>
                        <LatexRenderer text={answers[q.id]} />
                      </div>
                    )}
                  </div>
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
              <AlertDialogDescription className="space-y-3">
                <p>
                  You have answered <strong>{Object.keys(answers).length}</strong> of <strong>{questions.length}</strong> questions.
                </p>
                {Object.keys(answers).length < questions.length && (
                  <p className="text-yellow-700 font-medium bg-yellow-50 p-2.5 rounded border border-yellow-100 text-xs">
                    ⚠️ {questions.length - Object.keys(answers).length} question{questions.length - Object.keys(answers).length > 1 ? "s are" : " is"} unanswered.
                    <strong> Note:</strong> If you wrote your derivations or proofs for these questions on scratch paper, you can upload photos of your sheets on the next screen immediately after clicking submit.
                  </p>
                )}
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Once submitted, you cannot change your typed answers. You will have 5 minutes to select and upload any images/photos of your handwritten proofs.
                </p>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Keep Reviewing</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  const hasEssays = questions.some(q => q.type === "essay");
                  if (hasEssays) {
                    setIsUploadWindow(true);
                    setTimerRunning(false);
                    setSubmitConfirmOpen(false);
                    toast({
                      title: "✍️ Exam Time Completed!",
                      description: "You now have 5 minutes to upload photos of your handwritten scratchpad proofs.",
                    });
                  } else {
                    doSubmit(false);
                  }
                }}
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
