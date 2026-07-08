import { useState, useCallback, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import InstructorLayout from "@/components/layout/instructor-layout";
import { Button } from "@/components/ui/button";
import {
  useGetExam,
  useListQuestions,
  useUpdateExam,
  useGenerateQuestions,
  usePublishExam,
  useCreateQuestion,
  useDeleteQuestion,
  useUpdateQuestion,
  getGetExamQueryKey,
  getListQuestionsQueryKey,
  GenerateQuestionsInputDifficulty,
  GenerateQuestionsInputQuestionTypesItem
} from "@/lib/api-client";
import { ArrowLeft, Loader2, Plus, Sparkles, Send, Copy, CheckCheck, Archive, Trash2, RefreshCw, Settings, ArrowUp, ArrowDown } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { useQueryClient } from "@tanstack/react-query";
import LatexRenderer from "@/components/latex-renderer";
import { Checkbox } from "@/components/ui/checkbox";

// ── Types ───────────────────────────────────────────────────────────────────
type QuestionType = "multiple_choice" | "true_false" | "short_answer" | "essay";

interface NewQuestionForm {
  type: QuestionType;
  text: string;
  options: string[];
  correctAnswer: string;
  referenceSolution: string;
  points: string;
}

const DEFAULT_FORM: NewQuestionForm = {
  type: "multiple_choice",
  text: "",
  options: ["", "", "", ""],
  correctAnswer: "",
  referenceSolution: "",
  points: "1",
};

const QUESTION_TYPES: { value: QuestionType; label: string }[] = [
  { value: "multiple_choice", label: "Multiple Choice" },
  { value: "true_false", label: "True/False" },
  { value: "short_answer", label: "Short Answer" },
  { value: "essay", label: "Essay/Proof" },
];

interface OpenRouterModel {
  id: string;
  name: string;
  description: string;
  pricing: {
    prompt: number;
    completion: number;
  };
  context_length: number;
}

const FALLBACK_OPENROUTER_MODELS: OpenRouterModel[] = [
  { id: "openai/gpt-4o-mini", name: "GPT-4o mini", description: "Fast general-purpose model", pricing: { prompt: 0.15, completion: 0.6 }, context_length: 128000 },
  { id: "anthropic/claude-3.5-haiku", name: "Claude 3.5 Haiku", description: "Low-latency reasoning", pricing: { prompt: 0.8, completion: 4 }, context_length: 200000 },
  { id: "deepseek/deepseek-chat", name: "DeepSeek Chat", description: "Strong value model", pricing: { prompt: 0.14, completion: 0.28 }, context_length: 128000 },
  { id: "google/gemini-2.0-flash-001", name: "Gemini 2.0 Flash", description: "Fast multimodal model", pricing: { prompt: 0.1, completion: 0.4 }, context_length: 1000000 },
];

export default function ExamBuilder() {
  const params = useParams();
  const examId = Number(params.examId);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: exam, isLoading: isLoadingExam } = useGetExam(examId, { query: { enabled: !!examId, queryKey: getGetExamQueryKey(examId) } });
  const { data: questions, isLoading: isLoadingQuestions, refetch: refetchQuestions } = useListQuestions(examId, { query: { enabled: !!examId, queryKey: getListQuestionsQueryKey(examId) } });

  const publishExam = usePublishExam();
  const generateQuestions = useGenerateQuestions();
  const createQuestion = useCreateQuestion();
  const deleteQuestion = useDeleteQuestion();
  const updateQuestion = useUpdateQuestion();
  const updateExam = useUpdateExam();

  const [aiPrompt, setAiPrompt] = useState("");
  const [aiCount, setAiCount] = useState("5");
  const [aiDifficulty, setAiDifficulty] = useState<GenerateQuestionsInputDifficulty>("medium");
  const [aiGenerateOpen, setAiGenerateOpen] = useState(false);
  const [selectedQuestionTypes, setSelectedQuestionTypes] = useState<QuestionType[]>(["essay"]);
  const [publishOpen, setPublishOpen] = useState(false);
  const [accessCode, setAccessCode] = useState("");
  const [codesOpen, setCodesOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [addQuestionOpen, setAddQuestionOpen] = useState(false);
  const [questionForm, setQuestionForm] = useState<NewQuestionForm>(DEFAULT_FORM);
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);
  const [deleteAllOpen, setDeleteAllOpen] = useState(false);
  const [regenerateOpen, setRegenerateOpen] = useState(false);
  const [regenerateTargetId, setRegenerateTargetId] = useState<number | null>(null);
  const [aiSettingsOpen, setAiSettingsOpen] = useState(false);
  const [aiProvider, setAiProvider] = useState<"free" | "custom_openrouter" | "custom_gemini">("free");
  const [aiModel, setAiModel] = useState("deepseek/deepseek-chat");
  const [customApiKey, setCustomApiKey] = useState("");
  const [openRouterModels, setOpenRouterModels] = useState<OpenRouterModel[]>(FALLBACK_OPENROUTER_MODELS);
  const [loadingOpenRouterModels, setLoadingOpenRouterModels] = useState(false);
  const [openRouterModelError, setOpenRouterModelError] = useState("");
  
  // Edit Question State
  const [editQuestionOpen, setEditQuestionOpen] = useState(false);
  const [editTargetId, setEditTargetId] = useState<number | null>(null);
  const [editQuestionForm, setEditQuestionForm] = useState<NewQuestionForm>(DEFAULT_FORM);
  const [proctoringEnabled, setProctoringEnabled] = useState(true);
  
  // Enhanced AI generation state
  const [learningObjectives, setLearningObjectives] = useState("");
  const [assessmentStyle, setAssessmentStyle] = useState<"conceptual" | "practical" | "mixed">("mixed");
  const [easyPercentage, setEasyPercentage] = useState("20");
  const [mediumPercentage, setMediumPercentage] = useState("60");
  const [hardPercentage, setHardPercentage] = useState("20");
  const [contentGuidelines, setContentGuidelines] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleGenerate = () => {
    if (!aiPrompt.trim()) {
      toast({ title: "Please provide course material or topic", variant: "destructive" });
      return;
    }
    if (selectedQuestionTypes.length === 0) {
      toast({ title: "Select at least one question type", variant: "destructive" });
      return;
    }

    // Validate difficulty distribution
    const easy = parseInt(easyPercentage) || 0;
    const medium = parseInt(mediumPercentage) || 0;
    const hard = parseInt(hardPercentage) || 0;
    const total = easy + medium + hard;
    
    if (total !== 100) {
      toast({ 
        title: "Difficulty distribution must equal 100%", 
        description: `Current total: ${total}%`,
        variant: "destructive" 
      });
      return;
    }

    // Build comprehensive exam generation prompt
    const comprehensivePrompt = `
EXAM GENERATION TASK:
Generate educational questions based on the following specifications:

COURSE MATERIAL:
${aiPrompt}

LEARNING OBJECTIVES:
${learningObjectives || "(Not specified - infer from material above)"}

ASSESSMENT STYLE: ${assessmentStyle === "conceptual" ? "Focus on understanding concepts and theory" : assessmentStyle === "practical" ? "Focus on application and problem-solving" : "Balance between theory and application"}

QUESTION TYPES TO GENERATE: ${selectedQuestionTypes.map(t => t.replace(/_/g, ' ')).join(", ")}

DIFFICULTY DISTRIBUTION:
- Easy (remembering/understanding): ${easy}%
- Medium (applying/analyzing): ${medium}%
- Hard (evaluating/creating): ${hard}%

${contentGuidelines ? `CONTENT GUIDELINES:\n${contentGuidelines}\n` : ""}

QUALITY REQUIREMENTS:
- Questions must be clear, unambiguous, and educationally sound
- Answers must be factually accurate
- Questions should test different aspects of the material
- For multiple choice: all options should be plausible distractors
- For essay: include clear grading rubric or reference solution
- Avoid trick questions or overly ambiguous wording

Generate ${aiCount} questions that follow these specifications exactly.
    `.trim();

    generateQuestions.mutate({
      examId,
      data: {
        topic: comprehensivePrompt,
        count: parseInt(aiCount, 10),
        difficulty: aiDifficulty,
        questionTypes: selectedQuestionTypes as GenerateQuestionsInputQuestionTypesItem[],
      }
    }, {
      onSuccess: () => {
        toast({ title: "Questions Generated", description: "Successfully added AI generated questions." });
        setAiGenerateOpen(false);
        // Reset form
        setAiPrompt("");
        setLearningObjectives("");
        setContentGuidelines("");
        setEasyPercentage("20");
        setMediumPercentage("60");
        setHardPercentage("20");
        refetchQuestions();
        queryClient.invalidateQueries({ queryKey: getGetExamQueryKey(examId) });
      },
      onError: (error: any) => {
        toast({ 
          title: "Generation Failed", 
          description: error?.message || "Could not generate questions. Please check your input and try again.",
          variant: "destructive" 
        });
      }
    });
  };

  const handleAddQuestion = () => {
    const { type, text, options, correctAnswer, referenceSolution, points } = questionForm;
    if (!text.trim()) {
      toast({ title: "Question text is required", variant: "destructive" });
      return;
    }
    if (type === "multiple_choice" && options.some(o => !o.trim())) {
      toast({ title: "All 4 options are required for multiple choice", variant: "destructive" });
      return;
    }
    if ((type === "multiple_choice" || type === "true_false") && !correctAnswer) {
      toast({ title: "Please select the correct answer", variant: "destructive" });
      return;
    }

    const payload: any = {
      type,
      text: text.trim(),
      points: parseInt(points, 10) || 1,
    };

    if (type === "multiple_choice") {
      payload.options = options.map(o => o.trim());
      payload.correctAnswer = correctAnswer;
    } else if (type === "true_false") {
      payload.options = ["True", "False"];
      payload.correctAnswer = correctAnswer;
    } else if (type === "short_answer") {
      payload.correctAnswer = correctAnswer || null;
    } else if (type === "essay") {
      payload.referenceSolution = referenceSolution.trim() || null;
    }

    createQuestion.mutate({ examId, data: payload }, {
      onSuccess: () => {
        toast({ title: "Question added" });
        setAddQuestionOpen(false);
        setQuestionForm(DEFAULT_FORM);
        refetchQuestions();
        queryClient.invalidateQueries({ queryKey: getGetExamQueryKey(examId) });
      },
      onError: () => {
        toast({ title: "Failed to add question", variant: "destructive" });
      }
    });
  };

  const handleDeleteQuestion = (questionId: number) => {
    deleteQuestion.mutate({ examId, questionId }, {
      onSuccess: () => {
        toast({ title: "Question deleted" });
        setDeleteTargetId(null);
        refetchQuestions();
        queryClient.invalidateQueries({ queryKey: getGetExamQueryKey(examId) });
      },
      onError: () => {
        toast({ title: "Failed to delete question", variant: "destructive" });
        setDeleteTargetId(null);
      }
    });
  };

  const handleEditQuestion = () => {
    if (!editTargetId) return;
    const { type, text, options, correctAnswer, referenceSolution, points } = editQuestionForm;
    if (!text.trim()) {
      toast({ title: "Question text is required", variant: "destructive" });
      return;
    }
    if (type === "multiple_choice" && options.some(o => !o.trim())) {
      toast({ title: "All 4 options are required for multiple choice", variant: "destructive" });
      return;
    }
    if ((type === "multiple_choice" || type === "true_false") && !correctAnswer) {
      toast({ title: "Please select the correct answer", variant: "destructive" });
      return;
    }

    let payload: any;
    if (exam?.status !== "draft") {
      payload = {
        referenceSolution: referenceSolution.trim() || null,
      };
    } else {
      payload = {
        type,
        text: text.trim(),
        points: parseInt(points, 10) || 1,
        referenceSolution: referenceSolution.trim() || null,
      };

      if (type === "multiple_choice") {
        payload.options = options.map(o => o.trim());
        payload.correctAnswer = correctAnswer;
      } else if (type === "true_false") {
        payload.options = ["True", "False"];
        payload.correctAnswer = correctAnswer;
      } else if (type === "short_answer") {
        payload.correctAnswer = correctAnswer || null;
      }
    }

    updateQuestion.mutate({ examId: String(examId), questionId: editTargetId, data: payload }, {
      onSuccess: () => {
        toast({ title: "Question updated successfully" });
        setEditQuestionOpen(false);
        setEditTargetId(null);
        refetchQuestions();
        queryClient.invalidateQueries({ queryKey: getGetExamQueryKey(examId) });
      },
      onError: () => {
        toast({ title: "Failed to update question", variant: "destructive" });
      }
    });
  };

  const handleMoveQuestion = async (index: number, direction: "up" | "down") => {
    if (!questions) return;
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= questions.length) return;

    const q1 = questions[index];
    const q2 = questions[targetIndex];

    try {
      const order1 = q1.order;
      const order2 = q2.order;

      await Promise.all([
        updateQuestion.mutateAsync({
          examId: String(examId),
          questionId: q1.id,
          data: { order: order2 }
        }),
        updateQuestion.mutateAsync({
          examId: String(examId),
          questionId: q2.id,
          data: { order: order1 }
        })
      ]);

      toast({ title: "Question order updated" });
      refetchQuestions();
      queryClient.invalidateQueries({ queryKey: getGetExamQueryKey(examId) });
    } catch (err) {
      toast({ title: "Failed to update order", variant: "destructive" });
    }
  };

  const toggleQuestionType = (type: QuestionType) => {
    setSelectedQuestionTypes(prev => 
      prev.includes(type) 
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };

  const handleDeleteAll = () => {
    if (!questions || questions.length === 0) return;
    
    const deletePromises = questions.map(q => 
      new Promise((resolve, reject) => {
        deleteQuestion.mutate({ examId, questionId: q.id }, {
          onSuccess: resolve,
          onError: reject
        });
      })
    );

    Promise.all(deletePromises)
      .then(() => {
        toast({ title: "All questions deleted" });
        setDeleteAllOpen(false);
        refetchQuestions();
        queryClient.invalidateQueries({ queryKey: getGetExamQueryKey(examId) });
      })
      .catch(() => {
        toast({ title: "Failed to delete some questions", variant: "destructive" });
      });
  };

  const handleRegenerateOne = (questionId: number) => {
    const question = questions?.find(q => q.id === questionId);
    if (!question) return;

    // Delete the question first
    deleteQuestion.mutate({ examId, questionId }, {
      onSuccess: () => {
        // Generate a replacement
        generateQuestions.mutate({
          examId,
          data: {
            topic: aiPrompt || question.text.substring(0, 100),
            count: 1,
            difficulty: aiDifficulty,
            questionTypes: [question.type as GenerateQuestionsInputQuestionTypesItem],
          }
        }, {
          onSuccess: () => {
            toast({ title: "Question regenerated" });
            setRegenerateOpen(false);
            setRegenerateTargetId(null);
            refetchQuestions();
            queryClient.invalidateQueries({ queryKey: getGetExamQueryKey(examId) });
          },
          onError: () => {
            toast({ title: "Regeneration failed", variant: "destructive" });
          }
        });
      },
      onError: () => {
        toast({ title: "Failed to delete question for regeneration", variant: "destructive" });
      }
    });
  };

  const handleRegenerateAll = () => {
    if (!questions || questions.length === 0) return;
    
    // Delete all questions first
    handleDeleteAll();
    
    // Then regenerate
    setTimeout(() => {
      generateQuestions.mutate({
        examId,
        data: {
          topic: aiPrompt || exam?.subject || "General",
          count: questions.length,
          difficulty: aiDifficulty,
          questionTypes: selectedQuestionTypes as GenerateQuestionsInputQuestionTypesItem[],
        }
      }, {
        onSuccess: () => {
          toast({ title: "All questions regenerated" });
          setRegenerateOpen(false);
          refetchQuestions();
          queryClient.invalidateQueries({ queryKey: getGetExamQueryKey(examId) });
        },
        onError: () => {
          toast({ title: "Regeneration failed", variant: "destructive" });
        }
      });
    }, 500);
  };

  const handleUpdateAiSettings = () => {
    updateExam.mutate({
      examId,
      data: {
        aiConfig: {
          provider: aiProvider,
          model: aiModel,
          customApiKey: customApiKey || undefined,
          proctoringEnabled: proctoringEnabled,
        }
      }
    }, {
      onSuccess: () => {
        toast({ title: "Exam settings updated" });
        setAiSettingsOpen(false);
        queryClient.invalidateQueries({ queryKey: getGetExamQueryKey(examId) });
      },
      onError: () => {
        toast({ title: "Failed to update exam settings", variant: "destructive" });
      }
    });
  };

  // Initialize AI settings from exam when dialog opens
  useEffect(() => {
    if (aiSettingsOpen && exam?.aiConfig) {
      setAiProvider(exam.aiConfig.provider as any);
      setAiModel(exam.aiConfig.model);
      setCustomApiKey(exam.aiConfig.customApiKey || "");
      setProctoringEnabled(exam.aiConfig.proctoringEnabled !== false);
    }
  }, [aiSettingsOpen, exam?.aiConfig]);

  useEffect(() => {
    if (!aiSettingsOpen || aiProvider !== "custom_openrouter") return;

    let isActive = true;
    const loadModels = async () => {
      setLoadingOpenRouterModels(true);
      setOpenRouterModelError("");
      try {
        const response = await fetch("https://openrouter.ai/api/v1/models?sort=intelligence-high-to-low");
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        const fetchedModels = Array.isArray(data?.data) ? data.data : [];
        if (isActive) {
          setOpenRouterModels(fetchedModels.length > 0 ? fetchedModels : FALLBACK_OPENROUTER_MODELS);
          if (fetchedModels.length === 0) {
            setOpenRouterModelError("Using common presets because the live catalog was empty.");
          }
        }
      } catch (error) {
        console.error("Failed to fetch OpenRouter models:", error);
        if (isActive) {
          setOpenRouterModels(FALLBACK_OPENROUTER_MODELS);
          setOpenRouterModelError("Live model list unavailable. You can still paste any OpenRouter model ID.");
        }
      } finally {
        if (isActive) setLoadingOpenRouterModels(false);
      }
    };

    loadModels();
    return () => {
      isActive = false;
    };
  }, [aiSettingsOpen, aiProvider]);

  const handlePublish = () => {
    publishExam.mutate({
      examId
    }, {
      onSuccess: (data) => {
        setPublishOpen(false);
        setAccessCode(data.accessCode || "");
        setCodesOpen(true);
        queryClient.invalidateQueries({ queryKey: getGetExamQueryKey(examId) });
      }
    });
  };

  if (isLoadingExam) return <InstructorLayout><div className="p-4 md:p-8">Loading...</div></InstructorLayout>;
  if (!exam) return <InstructorLayout><div className="p-4 md:p-8">Exam not found</div></InstructorLayout>;

  return (
    <InstructorLayout>
      <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6">
        {/* Header - Mobile Responsive */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-2 sm:gap-4 min-w-0">
            <Button variant="ghost" size="icon" asChild className="shrink-0">
              <Link href="/exams"><ArrowLeft className="h-4 w-4" /></Link>
            </Button>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-display font-bold tracking-tight text-foreground truncate">{exam.title}</h1>
                <Badge variant={exam.status === 'published' ? 'default' : exam.status === 'archived' ? 'outline' : 'secondary'} className="capitalize shrink-0">{exam.status}</Badge>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                {exam.subject} • {exam.durationMinutes} min
                {exam.accessCode && (
                  <>
                    <span className="mx-2">•</span>
                    <span className="font-semibold text-primary">Access Code: </span>
                    <code className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-800 font-mono text-xs select-all">{exam.accessCode}</code>
                  </>
                )}
              </p>
            </div>
          </div>
          
          {/* Action Buttons - Mobile Responsive */}
          <div className="flex flex-wrap gap-2 w-full sm:w-auto">
            {exam.status === 'draft' && (
              <>
                <Button
                  variant="outline"
                  className="gap-1 text-xs sm:text-sm px-2 sm:px-3 py-1 sm:py-2 flex-1 sm:flex-none"
                  onClick={() => setAiSettingsOpen(true)}
                  disabled={updateExam.isPending}
                >
                  <Settings className="h-3 w-3 sm:h-4 sm:w-4" /> <span className="hidden sm:inline">Exam Settings</span><span className="sm:hidden">Settings</span>
                </Button>
                <Button
                  variant="outline"
                  className="gap-1 text-xs sm:text-sm px-2 sm:px-3 py-1 sm:py-2 text-destructive hover:text-destructive flex-1 sm:flex-none"
                  onClick={() => setDeleteAllOpen(true)}
                  disabled={!questions || questions.length === 0}
                >
                  <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" /> <span className="hidden sm:inline">Delete All</span><span className="sm:hidden">Delete</span>
                </Button>
                <Button
                  variant="outline"
                  className="gap-1 text-xs sm:text-sm px-2 sm:px-3 py-1 sm:py-2 flex-1 sm:flex-none"
                  onClick={() => setRegenerateOpen(true)}
                  disabled={!questions || questions.length === 0}
                >
                  <RefreshCw className="h-3 w-3 sm:h-4 sm:w-4" /> <span className="hidden sm:inline">Regenerate</span><span className="sm:hidden">Regen</span>
                </Button>
              </>
            )}
            {exam.status === 'published' && (
              <Button
                variant="outline"
                className="gap-1 text-xs sm:text-sm px-2 sm:px-3 py-1 sm:py-2 text-muted-foreground flex-1 sm:flex-none"
                onClick={() => setArchiveOpen(true)}
                disabled={updateExam.isPending}
              >
                <Archive className="h-3 w-3 sm:h-4 sm:w-4" /> <span className="hidden sm:inline">Archive</span>
              </Button>
            )}
            {exam.status === 'draft' && (
              <Dialog open={publishOpen} onOpenChange={setPublishOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-1 text-xs sm:text-sm px-2 sm:px-3 py-1 sm:py-2 flex-1 sm:flex-none">
                    <Send className="h-3 w-3 sm:h-4 sm:w-4" /> <span className="hidden sm:inline">Publish</span><span className="sm:hidden">Pub</span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Publish Exam</DialogTitle>
                    <DialogDescription>
                      Publishing will lock questions and generate a single access code. Students will use this code to join and take the exam.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="py-4 text-sm text-muted-foreground">
                    Are you sure you want to publish this exam? You will not be able to edit or delete questions once the exam is published.
                  </div>
                  <DialogFooter className="flex gap-2 flex-col sm:flex-row">
                    <Button variant="outline" onClick={() => setPublishOpen(false)} className="w-full sm:w-auto">Cancel</Button>
                    <Button onClick={handlePublish} disabled={publishExam.isPending} className="w-full sm:w-auto">
                      {publishExam.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Publish Exam
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
            {(exam.status === 'published' || exam.status === 'archived') && (
              <Button variant="secondary" asChild className="flex-1 sm:flex-none text-xs sm:text-sm">
                <Link href={`/exams/${exam.id}/results`}>View Results</Link>
              </Button>
            )}
          </div>
        </div>

        {/* Questions Section */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-8">
          <h2 className="text-lg sm:text-xl font-bold">Questions ({questions?.length || 0})</h2>
          
          {exam.status === 'draft' && (
            <div className="flex gap-2">
              <Dialog open={aiGenerateOpen} onOpenChange={setAiGenerateOpen}>
                <DialogTrigger asChild>
                  <Button variant="secondary" className="gap-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200">
                    <Sparkles className="h-4 w-4" /> Auto-Generate
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-indigo-600" />
                      Generate Questions with AI
                    </DialogTitle>
                    <DialogDescription>
                      Provide detailed specifications to ensure the AI generates exactly what you need. The more information you provide, the better the results.
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="space-y-6 py-4">
                    {/* Course Material */}
                    <div className="space-y-2 border-b pb-4">
                      <Label className="font-semibold flex items-center gap-2">
                        📚 Course Material or Topic <span className="text-red-500">*</span>
                      </Label>
                      <p className="text-xs text-muted-foreground mb-2">Paste the content students should be tested on</p>
                      <Textarea 
                        placeholder="Paste textbook excerpts, lecture notes, or specific topics here. Be as detailed as possible.

Example: Chapter 3 covers photosynthesis...
- The light-dependent reactions occur in the thylakoid membrane
- The Calvin cycle occurs in the stroma..."
                        value={aiPrompt}
                        onChange={(e) => setAiPrompt(e.target.value)}
                        className="min-h-28 font-mono text-xs"
                      />
                    </div>

                    {/* Learning Objectives */}
                    <div className="space-y-2 border-b pb-4">
                      <Label className="font-semibold flex items-center gap-2">
                        🎯 Learning Objectives
                      </Label>
                      <p className="text-xs text-muted-foreground mb-2">What should students be able to do after learning this material?</p>
                      <Textarea 
                        placeholder="Examples:
- Students should understand the difference between...
- Students should be able to calculate...
- Students should apply concepts to real-world scenarios..."
                        value={learningObjectives}
                        onChange={(e) => setLearningObjectives(e.target.value)}
                        className="min-h-20 text-sm"
                      />
                    </div>

                    {/* Assessment Style */}
                    <div className="space-y-3 border-b pb-4">
                      <Label className="font-semibold">Assessment Style</Label>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        {[
                          { id: "conceptual", label: "Conceptual", desc: "Test understanding of theory" },
                          { id: "practical", label: "Practical", desc: "Test problem-solving skills" },
                          { id: "mixed", label: "Mixed", desc: "Balance of both" },
                        ].map((style) => (
                          <button
                            key={style.id}
                            onClick={() => setAssessmentStyle(style.id as any)}
                            className={`p-3 rounded-lg border-2 transition-all text-left ${
                              assessmentStyle === style.id
                                ? "border-indigo-600 bg-indigo-50"
                                : "border-slate-200 hover:border-slate-300"
                            }`}
                          >
                            <p className="font-medium text-sm">{style.label}</p>
                            <p className="text-xs text-muted-foreground">{style.desc}</p>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Question Configuration */}
                    <div className="space-y-3 border-b pb-4">
                      <div className="flex items-center justify-between">
                        <Label className="font-semibold">Question Configuration</Label>
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="space-y-2">
                          <Label className="text-sm">Number of Questions</Label>
                          <Input 
                            type="number" 
                            min="1" 
                            max="20" 
                            value={aiCount}
                            onChange={(e) => setAiCount(e.target.value)}
                            className="text-center text-lg font-semibold"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Difficulty Distribution */}
                    <div className="space-y-3 border-b pb-4">
                      <Label className="font-semibold">Difficulty Distribution (must equal 100%)</Label>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="space-y-2">
                          <Label className="text-sm text-muted-foreground">Easy (Remembering/Understanding)</Label>
                          <div className="flex gap-2 items-center">
                            <Input 
                              type="number" 
                              min="0" 
                              max="100" 
                              value={easyPercentage}
                              onChange={(e) => setEasyPercentage(e.target.value)}
                              className="text-center font-semibold"
                            />
                            <span className="text-sm font-medium">%</span>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm text-muted-foreground">Medium (Applying/Analyzing)</Label>
                          <div className="flex gap-2 items-center">
                            <Input 
                              type="number" 
                              min="0" 
                              max="100" 
                              value={mediumPercentage}
                              onChange={(e) => setMediumPercentage(e.target.value)}
                              className="text-center font-semibold"
                            />
                            <span className="text-sm font-medium">%</span>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm text-muted-foreground">Hard (Evaluating/Creating)</Label>
                          <div className="flex gap-2 items-center">
                            <Input 
                              type="number" 
                              min="0" 
                              max="100" 
                              value={hardPercentage}
                              onChange={(e) => setHardPercentage(e.target.value)}
                              className="text-center font-semibold"
                            />
                            <span className="text-sm font-medium">%</span>
                          </div>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Current total: {(parseInt(easyPercentage)||0) + (parseInt(mediumPercentage)||0) + (parseInt(hardPercentage)||0)}%
                      </p>
                    </div>

                    {/* Question Types */}
                    <div className="space-y-2 border-b pb-4">
                      <Label className="font-semibold">Question Types (select all that apply)</Label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {QUESTION_TYPES.map((qt) => (
                          <div
                            key={qt.value}
                            onClick={() => toggleQuestionType(qt.value)}
                            className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                              selectedQuestionTypes.includes(qt.value)
                                ? "border-indigo-600 bg-indigo-50"
                                : "border-slate-200 hover:border-slate-300"
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <Checkbox
                                checked={selectedQuestionTypes.includes(qt.value)}
                                onCheckedChange={() => {}}
                              />
                              <span className="font-medium text-sm">{qt.label}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Content Guidelines */}
                    <div className="space-y-2">
                      <Label className="font-semibold">Content Guidelines (Optional)</Label>
                      <p className="text-xs text-muted-foreground mb-2">Any specific requirements or restrictions for questions?</p>
                      <Textarea 
                        placeholder="Examples:
- Avoid questions about X topic
- Include real-world examples
- Focus on numerical calculations
- Emphasize vocabulary terms..."
                        value={contentGuidelines}
                        onChange={(e) => setContentGuidelines(e.target.value)}
                        className="min-h-16 text-sm"
                      />
                    </div>
                  </div>

                  <DialogFooter className="flex gap-2 mt-6">
                    <Button variant="outline" onClick={() => setAiGenerateOpen(false)}>Cancel</Button>
                    <Button 
                      onClick={handleGenerate} 
                      disabled={generateQuestions.isPending}
                      className="gap-2"
                    >
                      {generateQuestions.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                      <Sparkles className="h-4 w-4" />
                      Generate Questions
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <Dialog open={addQuestionOpen} onOpenChange={(open) => { setAddQuestionOpen(open); if (!open) setQuestionForm(DEFAULT_FORM); }}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="gap-2 text-xs sm:text-sm w-full sm:w-auto">
                    <Plus className="h-3 w-3 sm:h-4 sm:w-4" /> <span className="hidden sm:inline">Add Question</span><span className="sm:hidden">Add</span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg sm:max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Add Question Manually</DialogTitle>
                    <DialogDescription>Create a custom question for your exam.</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Question Type</Label>
                        <Select
                          value={questionForm.type}
                          onValueChange={(v: QuestionType) => {
                            const defaults: Partial<NewQuestionForm> = {};
                            if (v === "multiple_choice") defaults.options = ["", "", "", ""];
                            else if (v === "true_false") { defaults.options = ["True", "False"]; defaults.correctAnswer = "True"; }
                            else { defaults.options = []; defaults.correctAnswer = ""; }
                            setQuestionForm(f => ({ ...f, type: v, correctAnswer: "", referenceSolution: "", ...defaults }));
                          }}
                        >
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="multiple_choice">Multiple Choice</SelectItem>
                            <SelectItem value="true_false">True / False</SelectItem>
                            <SelectItem value="short_answer">Short Answer</SelectItem>
                            <SelectItem value="essay">Essay / Proof</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Points</Label>
                        <Input
                          type="number"
                          min="1"
                          max="100"
                          value={questionForm.points}
                          onChange={(e) => setQuestionForm(f => ({ ...f, points: e.target.value }))}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Question Text</Label>
                      <Textarea
                        placeholder="Write your question here..."
                        value={questionForm.text}
                        onChange={(e) => setQuestionForm(f => ({ ...f, text: e.target.value }))}
                        className="min-h-20"
                      />
                    </div>

                    {questionForm.type === "multiple_choice" && (
                      <div className="space-y-3">
                        <Label>Answer Options</Label>
                        {questionForm.options.map((opt, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <input
                              type="radio"
                              name="correctAnswer"
                              id={`opt-${i}`}
                              checked={questionForm.correctAnswer === opt && opt !== ""}
                              onChange={() => setQuestionForm(f => ({ ...f, correctAnswer: f.options[i] }))}
                              className="shrink-0"
                            />
                            <Input
                              placeholder={`Option ${String.fromCharCode(65 + i)}`}
                              value={opt}
                              onChange={(e) => {
                                const newOpts = [...questionForm.options];
                                newOpts[i] = e.target.value;
                                setQuestionForm(f => ({
                                  ...f,
                                  options: newOpts,
                                  correctAnswer: f.correctAnswer === f.options[i] ? e.target.value : f.correctAnswer,
                                }));
                              }}
                            />
                          </div>
                        ))}
                        <p className="text-xs text-muted-foreground">Select the radio button next to the correct answer.</p>
                      </div>
                    )}

                    {questionForm.type === "true_false" && (
                      <div className="space-y-2">
                        <Label>Correct Answer</Label>
                        <Select
                          value={questionForm.correctAnswer}
                          onValueChange={(v) => setQuestionForm(f => ({ ...f, correctAnswer: v }))}
                        >
                          <SelectTrigger><SelectValue placeholder="Select correct answer" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="True">True</SelectItem>
                            <SelectItem value="False">False</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {questionForm.type === "short_answer" && (
                      <div className="space-y-2">
                        <Label>Expected Answer (optional)</Label>
                        <Input
                          placeholder="Model answer for grading reference..."
                          value={questionForm.correctAnswer}
                          onChange={(e) => setQuestionForm(f => ({ ...f, correctAnswer: e.target.value }))}
                        />
                      </div>
                    )}

                    {questionForm.type === "essay" && (
                      <div className="space-y-2">
                        <Label>Reference Solution / Proof Rubric (LaTeX supported)</Label>
                        <Textarea
                          placeholder="Write the expected proof, mathematical derivations, or rubrics using LaTeX (e.g. $\sum_{i=1}^n i = \frac{n(n+1)}{2}$)..."
                          value={questionForm.referenceSolution}
                          onChange={(e) => setQuestionForm(f => ({ ...f, referenceSolution: e.target.value }))}
                          className="min-h-32 font-mono"
                        />
                      </div>
                    )}
                  </div>
                  <DialogFooter className="flex gap-2 flex-col sm:flex-row">
                    <Button variant="outline" onClick={() => setAddQuestionOpen(false)} className="w-full sm:w-auto">Cancel</Button>
                    <Button onClick={handleAddQuestion} disabled={createQuestion.isPending} className="w-full sm:w-auto">
                      {createQuestion.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Add Question
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          )}
        </div>

        {isLoadingQuestions ? (
          <div className="py-12 text-center text-muted-foreground">Loading questions...</div>
        ) : !questions?.length ? (
          <Card className="border-dashed bg-slate-50">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <p className="text-muted-foreground mb-4">No questions added yet.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {questions.map((q, index) => (
              <Card key={q.id} className="group relative overflow-hidden">
                <CardHeader className="py-3 md:py-4 flex flex-col sm:flex-row sm:items-start sm:justify-between space-y-2 sm:space-y-0">
                  <div className="space-y-1 flex-1 min-w-0 pr-2">
                    <CardTitle className="text-sm md:text-base flex items-start gap-2 break-words">
                      <span className="text-muted-foreground shrink-0 font-normal">{index + 1}.</span> 
                      <LatexRenderer text={q.text} className="leading-relaxed" />
                    </CardTitle>
                    <CardDescription className="capitalize flex items-center gap-1 text-xs md:text-sm flex-wrap">
                      <span>{q.type.replace(/_/g, ' ')}</span>
                      <span className="text-xs bg-slate-100 rounded px-1.5 py-0.5 shrink-0">{q.points || 1} pt{(q.points || 1) !== 1 ? "s" : ""}</span>
                    </CardDescription>
                  </div>
                  {exam.status === 'draft' && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 opacity-0 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive shrink-0 active:opacity-100"
                      onClick={() => setDeleteTargetId(q.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </CardHeader>
                {q.options && q.options.length > 0 && (
                  <CardContent className="py-0 pb-4">
                    <div className="space-y-2 pl-6">
                      {q.options.map((opt, i) => (
                        <div key={i} className={`text-sm p-2 rounded border ${q.correctAnswer === opt ? 'bg-green-50 border-green-200 font-medium text-green-800' : 'bg-slate-50 border-transparent'}`}>
                          {String.fromCharCode(65 + i)}. <LatexRenderer text={opt} />
                          {q.correctAnswer === opt && <span className="ml-2 text-xs text-green-600">✓ Correct</span>}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                )}
                {q.type !== 'multiple_choice' && q.correctAnswer && (
                  <CardContent className="py-0 pb-4">
                    <div className="text-sm pl-6 text-muted-foreground">
                      <span className="font-medium text-foreground">Answer: </span> <LatexRenderer text={q.correctAnswer} />
                    </div>
                  </CardContent>
                )}
                {q.referenceSolution && (
                  <CardContent className="py-0 pb-4 border-t pt-3 mt-1 bg-slate-50/50">
                    <div className="text-sm pl-6 text-muted-foreground space-y-1">
                      <span className="font-semibold text-foreground text-xs uppercase tracking-wider block">Reference Solution:</span>
                      <LatexRenderer text={q.referenceSolution} className="text-slate-800 italic leading-relaxed font-mono" />
                    </div>
                  </CardContent>
                )}
                {exam.status === 'draft' ? (
                  <CardContent className="py-2 flex gap-2 justify-between items-center border-t bg-slate-50/20">
                    <div className="flex gap-1.5">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        disabled={index === 0 || updateQuestion.isPending}
                        onClick={() => handleMoveQuestion(index, "up")}
                        title="Move Up"
                      >
                        <ArrowUp className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        disabled={index === questions.length - 1 || updateQuestion.isPending}
                        onClick={() => handleMoveQuestion(index, "down")}
                        title="Move Down"
                      >
                        <ArrowDown className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-muted-foreground hover:text-foreground"
                        onClick={() => {
                          setEditTargetId(q.id);
                          setEditQuestionForm({
                            type: q.type as QuestionType,
                            text: q.text,
                            options: q.options || (q.type === "multiple_choice" ? ["", "", "", ""] : q.type === "true_false" ? ["True", "False"] : []),
                            correctAnswer: q.correctAnswer || "",
                            referenceSolution: q.referenceSolution || "",
                            points: String(q.points || 1),
                          });
                          setEditQuestionOpen(true);
                        }}
                      >
                        <Settings className="h-3 w-3 mr-1" /> Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-muted-foreground hover:text-foreground"
                        onClick={() => {
                          setRegenerateTargetId(q.id);
                          setRegenerateOpen(true);
                        }}
                      >
                        <RefreshCw className="h-3 w-3 mr-1" /> Regenerate
                      </Button>
                    </div>
                  </CardContent>
                ) : (
                  <CardContent className="py-2 flex gap-2 justify-end items-center border-t bg-slate-50/20">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground hover:text-foreground"
                      onClick={() => {
                        setEditTargetId(q.id);
                        setEditQuestionForm({
                          type: q.type as QuestionType,
                          text: q.text,
                          options: q.options || (q.type === "multiple_choice" ? ["", "", "", ""] : q.type === "true_false" ? ["True", "False"] : []),
                          correctAnswer: q.correctAnswer || "",
                          referenceSolution: q.referenceSolution || "",
                          points: String(q.points || 1),
                        });
                        setEditQuestionOpen(true);
                      }}
                    >
                      <Settings className="h-3 w-3 mr-1" /> Edit Reference Solution
                    </Button>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Edit Question Overlay Dialog */}
      <Dialog open={editQuestionOpen} onOpenChange={(open) => { setEditQuestionOpen(open); if (!open) setEditTargetId(null); }}>
        <DialogContent className="max-w-lg sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Question</DialogTitle>
            <DialogDescription>
              {exam?.status === "draft"
                ? "Update details for this question."
                : "The exam is published. You can only edit the reference solution or explanation below."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Question Type</Label>
                <Select
                  disabled={exam?.status !== "draft"}
                  value={editQuestionForm.type}
                  onValueChange={(v: QuestionType) => {
                    const defaults: Partial<NewQuestionForm> = {};
                    if (v === "multiple_choice") defaults.options = ["", "", "", ""];
                    else if (v === "true_false") { defaults.options = ["True", "False"]; defaults.correctAnswer = "True"; }
                    else { defaults.options = []; defaults.correctAnswer = ""; }
                    setEditQuestionForm(f => ({ ...f, type: v, correctAnswer: "", referenceSolution: "", ...defaults }));
                  }}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="multiple_choice">Multiple Choice</SelectItem>
                    <SelectItem value="true_false">True / False</SelectItem>
                    <SelectItem value="short_answer">Short Answer</SelectItem>
                    <SelectItem value="essay">Essay / Proof</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Points</Label>
                <Input
                  disabled={exam?.status !== "draft"}
                  type="number"
                  min="1"
                  max="100"
                  value={editQuestionForm.points}
                  onChange={(e) => setEditQuestionForm(f => ({ ...f, points: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Question Text</Label>
              <Textarea
                disabled={exam?.status !== "draft"}
                placeholder="Write your question here..."
                value={editQuestionForm.text}
                onChange={(e) => setEditQuestionForm(f => ({ ...f, text: e.target.value }))}
                className="min-h-20"
              />
            </div>

            {editQuestionForm.type === "multiple_choice" && (
              <div className="space-y-3">
                <Label>Answer Options</Label>
                {editQuestionForm.options.map((opt, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      disabled={exam?.status !== "draft"}
                      type="radio"
                      name="editCorrectAnswer"
                      id={`edit-opt-${i}`}
                      checked={editQuestionForm.correctAnswer === opt && opt !== ""}
                      onChange={() => setEditQuestionForm(f => ({ ...f, correctAnswer: f.options[i] }))}
                      className="shrink-0"
                    />
                    <Input
                      disabled={exam?.status !== "draft"}
                      placeholder={`Option ${String.fromCharCode(65 + i)}`}
                      value={opt}
                      onChange={(e) => {
                        const newOpts = [...editQuestionForm.options];
                        newOpts[i] = e.target.value;
                        setEditQuestionForm(f => ({
                          ...f,
                          options: newOpts,
                          correctAnswer: f.correctAnswer === f.options[i] ? e.target.value : f.correctAnswer,
                        }));
                      }}
                    />
                  </div>
                ))}
                <p className="text-xs text-muted-foreground">Select the radio button next to the correct answer.</p>
              </div>
            )}

            {editQuestionForm.type === "true_false" && (
              <div className="space-y-2">
                <Label>Correct Answer</Label>
                <Select
                  disabled={exam?.status !== "draft"}
                  value={editQuestionForm.correctAnswer}
                  onValueChange={(v) => setEditQuestionForm(f => ({ ...f, correctAnswer: v }))}
                >
                  <SelectTrigger><SelectValue placeholder="Select correct answer" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="True">True</SelectItem>
                    <SelectItem value="False">False</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {editQuestionForm.type === "short_answer" && (
              <div className="space-y-2">
                <Label>Expected Answer (optional)</Label>
                <Input
                  disabled={exam?.status !== "draft"}
                  placeholder="Model answer for grading reference..."
                  value={editQuestionForm.correctAnswer}
                  onChange={(e) => setEditQuestionForm(f => ({ ...f, correctAnswer: e.target.value }))}
                />
              </div>
            )}

            {(editQuestionForm.type === "essay" || exam?.status !== "draft") && (
              <div className="space-y-2">
                <Label>Reference Solution / Proof Rubric (LaTeX supported)</Label>
                <Textarea
                  placeholder="Write the expected proof, mathematical derivations, or rubrics using LaTeX..."
                  value={editQuestionForm.referenceSolution}
                  onChange={(e) => setEditQuestionForm(f => ({ ...f, referenceSolution: e.target.value }))}
                  className="min-h-32 font-mono"
                />
              </div>
            )}
          </div>
          <DialogFooter className="flex gap-2 flex-col sm:flex-row">
            <Button variant="outline" onClick={() => setEditQuestionOpen(false)} className="w-full sm:w-auto">Cancel</Button>
            <Button onClick={handleEditQuestion} disabled={updateQuestion.isPending} className="w-full sm:w-auto">
              {updateQuestion.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Question Confirmation */}
      <AlertDialog open={deleteTargetId !== null} onOpenChange={(open) => { if (!open) setDeleteTargetId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this question?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={() => deleteTargetId && handleDeleteQuestion(deleteTargetId)}
              disabled={deleteQuestion.isPending}
            >
              {deleteQuestion.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Archive Confirmation */}
      <AlertDialog open={archiveOpen} onOpenChange={setArchiveOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive this exam?</AlertDialogTitle>
            <AlertDialogDescription>
              Archiving will close the exam immediately. No new sessions can be started.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={() => {
                updateExam.mutate(
                  { examId, data: { status: "archived" } },
                  {
                    onSuccess: () => {
                      setArchiveOpen(false);
                      toast({ title: "Exam archived" });
                      queryClient.invalidateQueries({ queryKey: getGetExamQueryKey(examId) });
                    },
                  }
                );
              }}
              disabled={updateExam.isPending}
            >
              {updateExam.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Archive Exam
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Access Codes Dialog */}
      <Dialog open={codesOpen} onOpenChange={setCodesOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-700">
               <CheckCheck className="h-5 w-5" /> Exam Published Successfully!
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 my-4 text-center">
            <p className="text-sm text-muted-foreground">
              Share this access code with your students. Anyone with this code can sign in and take the exam.
            </p>
            <div className="flex items-center justify-center gap-2 bg-slate-100 p-4 rounded-lg border border-slate-200">
              <span className="font-mono text-2xl font-bold tracking-wider text-indigo-600 selection:bg-indigo-100">
                {accessCode}
              </span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  navigator.clipboard.writeText(accessCode);
                  toast({ title: "Copied code to clipboard!" });
                }}
                title="Copy Code"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button className="w-full" onClick={() => setCodesOpen(false)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete All Confirmation */}
      <AlertDialog open={deleteAllOpen} onOpenChange={setDeleteAllOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete all questions?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete all {questions?.length || 0} questions. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={handleDeleteAll}
              disabled={deleteQuestion.isPending}
            >
              {deleteQuestion.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Regenerate Confirmation */}
      <AlertDialog open={regenerateOpen} onOpenChange={setRegenerateOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {regenerateTargetId ? "Regenerate this question?" : "Regenerate all questions?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {regenerateTargetId 
                ? "The selected question will be deleted and replaced with a newly generated one." 
                : `All ${questions?.length || 0} questions will be deleted and regenerated using the same settings.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-indigo-600 text-white hover:bg-indigo-700"
              onClick={() => {
                if (regenerateTargetId) {
                  handleRegenerateOne(regenerateTargetId);
                } else {
                  handleRegenerateAll();
                }
              }}
              disabled={generateQuestions.isPending || deleteQuestion.isPending}
            >
              {(generateQuestions.isPending || deleteQuestion.isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Regenerate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* AI Settings Dialog */}
      <Dialog open={aiSettingsOpen} onOpenChange={setAiSettingsOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" /> Exam Settings
            </DialogTitle>
            <DialogDescription>
              Configure AI generation and proctoring controls for this exam.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-5 py-4 divide-y divide-slate-100">
            {/* AI Settings Section */}
            <div className="space-y-4">
              <h4 className="font-semibold text-sm text-foreground">AI Question Generation Settings</h4>
              <div className="space-y-2">
                <Label>AI Provider</Label>
                <Select value={aiProvider} onValueChange={(v: any) => setAiProvider(v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="free">Free (Deepseek via OpenRouter)</SelectItem>
                    <SelectItem value="custom_openrouter">Custom OpenRouter API</SelectItem>
                    <SelectItem value="custom_gemini">Custom Google Gemini API</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">Switch between free tier and custom paid APIs</p>
              </div>

              {aiProvider === "free" && (
                <div className="space-y-2 p-3 rounded-md bg-indigo-50 border border-indigo-200">
                  <p className="text-sm font-medium text-indigo-900">Free Tier</p>
                  <p className="text-xs text-indigo-800">Using Deepseek model via OpenRouter API (free tier)</p>
                </div>
              )}

              {aiProvider !== "free" && (
                <>
                  <div className="space-y-2">
                    <Label>Model ID</Label>
                    {aiProvider === "custom_openrouter" && (
                      loadingOpenRouterModels ? (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin" /> Loading models...
                        </div>
                      ) : (
                        <Select value={aiModel} onValueChange={setAiModel}>
                          <SelectTrigger className="bg-white">
                            <SelectValue placeholder="Pick a model" />
                          </SelectTrigger>
                          <SelectContent>
                            {openRouterModels.map((model) => (
                              <SelectItem key={model.id} value={model.id}>
                                <div className="flex flex-col">
                                  <span className="font-medium">{model.name}</span>
                                  <span className="text-xs text-muted-foreground">{model.id}</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )
                    )}
                    <Input 
                      placeholder={aiProvider === "custom_openrouter" ? "Or paste any OpenRouter model ID" : "e.g. gemini-pro"}
                      value={aiModel} 
                      onChange={(e) => setAiModel(e.target.value)}
                      className={aiProvider === "custom_openrouter" ? "mt-2" : ""}
                    />
                    <p className="text-xs text-muted-foreground">
                      {aiProvider === "custom_openrouter" 
                        ? "Pick a recommended model or paste any compatible OpenRouter model ID."
                        : "See cloud.google.com/vertex-ai for available models"}
                    </p>
                    {aiProvider === "custom_openrouter" && openRouterModelError ? (
                      <p className="text-xs text-amber-600">{openRouterModelError}</p>
                    ) : null}
                  </div>

                  <div className="space-y-2">
                    <Label>API Key</Label>
                    <Input 
                      type="password"
                      placeholder={aiProvider === "custom_openrouter" ? "sk-..." : "AIza..."}
                      value={customApiKey} 
                      onChange={(e) => setCustomApiKey(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">Your API key is only used for this exam</p>
                  </div>
                </>
              )}
            </div>

            {/* Proctoring Settings Section */}
            <div className="space-y-2 pt-4">
              <h4 className="font-semibold text-sm text-slate-900 mt-2">Anti-Cheating Proctoring Rules</h4>
              <div className="flex items-start gap-3 mt-3">
                <input
                  type="checkbox"
                  id="proctoringEnabled"
                  checked={proctoringEnabled}
                  onChange={(e) => setProctoringEnabled(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 mt-1 cursor-pointer"
                />
                <div className="space-y-1">
                  <Label htmlFor="proctoringEnabled" className="text-sm font-medium text-slate-700 cursor-pointer">
                    Enable Web Camera & Microphone Proctoring
                  </Label>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Insist that students grant camera/microphone permissions to begin taking the exam. If disabled, students can write their exam without webcam surveillance.
                  </p>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAiSettingsOpen(false)}>Cancel</Button>
            <Button onClick={handleUpdateAiSettings} disabled={updateExam.isPending}>
              {updateExam.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Settings
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </InstructorLayout>
  );
}

function AccessCodeRow({ code, studentEmail }: { code: string; studentEmail: string }) {
  const [copied, setCopied] = useState(false);
  const copy = useCallback(() => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [code]);

  return (
    <div className="flex items-center justify-between gap-3 p-3 rounded-md border bg-slate-50">
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground truncate">{studentEmail}</p>
        <p className="font-mono font-bold tracking-widest text-primary text-lg leading-tight">{code}</p>
      </div>
      <button
        onClick={copy}
        className="shrink-0 p-2 rounded hover:bg-slate-200 transition-colors text-muted-foreground hover:text-foreground"
        title="Copy code"
      >
        {copied ? <CheckCheck className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
      </button>
    </div>
  );
}