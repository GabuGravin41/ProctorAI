import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import InstructorLayout from "@/components/layout/instructor-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateExam } from "@/lib/api-client";
import { ArrowLeft, Loader2, Sparkles, Key, Cpu } from "lucide-react";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";

const formSchema = z.object({
  title: z.string().min(1, "Title is required"),
  subject: z.string().optional(),
  description: z.string().optional(),
  durationMinutes: z.coerce.number().min(5, "Duration must be at least 5 minutes"),
  examType: z.enum(["mixed", "proof_only"]),
  gradingMode: z.enum(["auto", "review_release", "manual"]),
  aiProvider: z.enum(["free", "custom_openrouter", "custom_gemini"]),
  aiModel: z.string(),
  customApiKey: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

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

export default function NewExam() {
  const [, setLocation] = useLocation();
  const createExam = useCreateExam();
  const [selectedProvider, setSelectedProvider] = useState<"free" | "custom_openrouter" | "custom_gemini">("free");
  const [models, setModels] = useState<OpenRouterModel[]>(FALLBACK_OPENROUTER_MODELS);
  const [loadingModels, setLoadingModels] = useState(false);
  const [modelsError, setModelsError] = useState("");
  const [examType, setExamType] = useState<"mixed" | "proof_only">("mixed");

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      subject: "",
      description: "",
      durationMinutes: 60,
      examType: "mixed",
      gradingMode: "auto",
      aiProvider: "free",
      aiModel: "deepseek/deepseek-chat",
      customApiKey: "",
    },
  });

  // Fetch OpenRouter models
  useEffect(() => {
    const fetchModels = async () => {
      if (selectedProvider !== "custom_openrouter") return;
      setLoadingModels(true);
      setModelsError("");
      try {
        const response = await fetch("https://openrouter.ai/api/v1/models?sort=intelligence-high-to-low");
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        const fetchedModels = Array.isArray(data?.data) ? data.data : [];
        setModels(fetchedModels.length > 0 ? fetchedModels : FALLBACK_OPENROUTER_MODELS);
        if (fetchedModels.length === 0) {
          setModelsError("Live catalog was empty, so common presets are being shown.");
        }
      } catch (error) {
        console.error("Failed to fetch models:", error);
        setModels(FALLBACK_OPENROUTER_MODELS);
        setModelsError("Live model list unavailable. You can still paste any OpenRouter model ID.");
      } finally {
        setLoadingModels(false);
      }
    };
    fetchModels();
  }, [selectedProvider]);

  const onSubmit = (data: FormValues) => {
    const payload = {
      title: data.title,
      subject: data.subject || "",
      description: data.description || "",
      durationMinutes: data.durationMinutes,
      examType: data.examType,
      gradingMode: data.gradingMode,
      aiConfig: {
        provider: data.aiProvider,
        model: data.aiModel,
        customApiKey: data.customApiKey || undefined,
      }
    };

    createExam.mutate({ data: payload }, {
      onSuccess: (exam) => {
        setLocation(`/exams/${exam.id}/build`);
      }
    });
  };

  const handleProviderSelect = (provider: "free" | "custom_openrouter" | "custom_gemini") => {
    setSelectedProvider(provider);
    form.setValue("aiProvider", provider);
    if (provider === "free") {
      form.setValue("aiModel", "deepseek/deepseek-chat");
    } else if (provider === "custom_openrouter") {
      form.setValue("aiModel", "deepseek/deepseek-chat");
    } else if (provider === "custom_gemini") {
      form.setValue("aiModel", "gemini-2.5-flash");
    }
  };

  return (
    <InstructorLayout>
      <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
          <Button variant="ghost" size="icon" asChild className="w-fit">
            <Link href="/exams"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div className="min-w-0">
            <h1 className="text-2xl md:text-3xl font-display font-bold tracking-tight text-foreground">Create New Exam</h1>
            <p className="text-xs md:text-sm text-muted-foreground mt-1">Set up exam specifications and AI configuration.</p>
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Card className="border border-slate-100 shadow-sm backdrop-blur-md bg-white/95">
              <CardHeader>
                <CardTitle className="text-lg md:text-xl">Exam Details</CardTitle>
                <CardDescription>Enter primary name and testing attributes.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title</FormLabel>
                      <FormControl>
                        <Input placeholder="IMO Mock Olympiad - Geometry" {...field} className="bg-slate-50/50 focus:bg-white text-sm" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="subject"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Subject</FormLabel>
                        <FormControl>
                          <Input placeholder="Mathematics" {...field} value={field.value || ""} className="bg-slate-50/50 focus:bg-white" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="durationMinutes"
                    render={({ field }) => {
                      const hours = Math.floor((field.value || 60) / 60);
                      const mins = (field.value || 60) % 60;
                      
                      return (
                        <FormItem>
                          <FormLabel>Duration</FormLabel>
                          <FormControl>
                            <div className="flex items-center gap-4">
                              <div className="flex items-center gap-2">
                                <Input 
                                  type="number" 
                                  min="0" 
                                  value={hours} 
                                  onChange={(e) => {
                                    const h = Math.max(0, parseInt(e.target.value) || 0);
                                    field.onChange(h * 60 + mins);
                                  }}
                                  className="bg-slate-50/50 focus:bg-white w-20"
                                />
                                <span className="text-sm font-medium text-muted-foreground">hrs</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Input 
                                  type="number" 
                                  min="0" 
                                  max="59"
                                  value={mins} 
                                  onChange={(e) => {
                                    const m = Math.max(0, Math.min(59, parseInt(e.target.value) || 0));
                                    field.onChange(hours * 60 + m);
                                  }}
                                  className="bg-slate-50/50 focus:bg-white w-20"
                                />
                                <span className="text-sm font-medium text-muted-foreground">mins</span>
                              </div>
                            </div>
                          </FormControl>
                          <FormDescription>Total duration: {field.value} minutes</FormDescription>
                          <FormMessage />
                        </FormItem>
                      );
                    }}
                  />
                </div>

                <FormField
                  control={form.control}
                    name="examType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Exam Type</FormLabel>
                        <FormControl>
                          <Select value={field.value} onValueChange={(value) => { field.onChange(value); setExamType(value as "mixed" | "proof_only"); }}>
                            <SelectTrigger className="bg-slate-50/50 focus:bg-white">
                              <SelectValue placeholder="Select exam type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="mixed">Mixed (MCQ + Short Answer + Essay)</SelectItem>
                              <SelectItem value="proof_only">Proof-Only (Olympiad Style - No MCQs)</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormDescription>
                          {examType === "proof_only" 
                            ? "Olympiad-style exams with only proof-based questions. Suitable for IMO, Putnam, etc."
                            : "Standard exam with multiple choice, short answer, and essay questions."}
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
 
                <FormField
                  control={form.control}
                  name="gradingMode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Grading & Results Release Mode</FormLabel>
                      <FormControl>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger className="bg-slate-50/50 focus:bg-white">
                            <SelectValue placeholder="Select grading mode" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="auto">Auto-Mark (AI grades, results released immediately)</SelectItem>
                            <SelectItem value="review_release">AI-Assisted (AI grades, results held until coach reviews)</SelectItem>
                            <SelectItem value="manual">Manual (AI disabled, coach grades all essays manually)</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormDescription>
                        {field.value === "auto" && "The AI will automatically grade objective and essay questions. Results are immediately visible to students."}
                        {field.value === "review_release" && "The AI will grade the submissions, but results are kept hidden. You can review, adjust scores, and release them when ready."}
                        {field.value === "manual" && "All essays/proofs are marked manually by you. AI grading is disabled for this exam."}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description / Instructions</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Instructions on logic formatting, timer rules..." 
                          className="min-h-24 bg-slate-50/50 focus:bg-white" 
                          {...field} 
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <Card className="border border-slate-100 shadow-sm backdrop-blur-md bg-white/95">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  <CardTitle>AI Model Selection</CardTitle>
                </div>
                <CardDescription>Select the AI model for question generation and evaluation.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <FormField
                  control={form.control}
                  name="aiProvider"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>API Provider</FormLabel>
                      <FormControl>
                        <Select value={field.value} onValueChange={(value) => handleProviderSelect(value as any)}>
                          <SelectTrigger className="bg-slate-50/50 focus:bg-white">
                            <SelectValue placeholder="Select provider" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="free">
                              <div className="flex items-center gap-2">
                                <Cpu className="h-4 w-4" />
                                <div>
                                  <div className="font-medium">ProctorAI Hosted</div>
                                  <div className="text-xs text-muted-foreground">Using our API credits - Recommended for Olympiad</div>
                                </div>
                              </div>
                            </SelectItem>
                            <SelectItem value="custom_openrouter">
                              <div className="flex items-center gap-2">
                                <Key className="h-4 w-4" />
                                <div>
                                  <div className="font-medium">OpenRouter (Your Key)</div>
                                  <div className="text-xs text-muted-foreground">Bring your own OpenRouter API key</div>
                                </div>
                              </div>
                            </SelectItem>
                            <SelectItem value="custom_gemini">
                              <div className="flex items-center gap-2">
                                <Key className="h-4 w-4" />
                                <div>
                                  <div className="font-medium">Google Gemini (Your Key)</div>
                                  <div className="text-xs text-muted-foreground">Bring your own Google AI Studio key</div>
                                </div>
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {selectedProvider === "custom_openrouter" && (
                  <div className="space-y-4 p-4 border rounded-xl bg-slate-50/50">
                    <FormField
                      control={form.control}
                      name="customApiKey"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>OpenRouter API Key</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="sk-or-..." {...field} className="bg-white font-mono" />
                          </FormControl>
                          <FormDescription>Your OpenRouter API key for model access</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="aiModel"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Model</FormLabel>
                          <FormControl>
                            {loadingModels ? (
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Loading models...
                              </div>
                            ) : (
                              <Select value={field.value} onValueChange={field.onChange}>
                                <SelectTrigger className="bg-white font-mono">
                                  <SelectValue placeholder="Select a model" />
                                </SelectTrigger>
                                <SelectContent>
                                  {models.slice(0, 20).map((model) => (
                                    <SelectItem key={model.id} value={model.id}>
                                      <div className="flex flex-col">
                                        <span className="font-medium">{model.name}</span>
                                        <span className="text-xs text-muted-foreground">
                                          ${model.pricing.prompt}/M prompt • ${model.pricing.completion}/M completion
                                        </span>
                                      </div>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
                          </FormControl>
                          <FormDescription>
                            Choose a model from the catalog or paste a different OpenRouter model ID.
                            {modelsError ? <span className="mt-1 block text-amber-600">{modelsError}</span> : null}
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}

                {selectedProvider === "custom_gemini" && (
                  <div className="space-y-4 p-4 border rounded-xl bg-slate-50/50">
                    <FormField
                      control={form.control}
                      name="customApiKey"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Gemini API Key</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="AIza..." {...field} className="bg-white font-mono" />
                          </FormControl>
                          <FormDescription>Your Google AI Studio API key</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="aiModel"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Model</FormLabel>
                          <FormControl>
                            <Select value={field.value} onValueChange={field.onChange}>
                              <SelectTrigger className="bg-white font-mono">
                                <SelectValue placeholder="Select a model" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="gemini-2.5-flash">Gemini 2.5 Flash (Fast)</SelectItem>
                                <SelectItem value="gemini-2.5-pro">Gemini 2.5 Pro (Advanced)</SelectItem>
                              </SelectContent>
                            </Select>
                          </FormControl>
                          <FormDescription>Choose Gemini model version</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}

                {selectedProvider === "free" && (
                  <div className="p-4 rounded-lg bg-green-50/50 border border-green-100 flex gap-3 items-start">
                    <Cpu className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                    <div>
                      <h5 className="font-semibold text-green-900 text-sm">ProctorAI Hosted</h5>
                      <p className="text-xs text-green-700 mt-0.5">Using DeepSeek V3 for Olympiad-level question generation. No API key required.</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="flex justify-end pt-4">
              <Button type="submit" disabled={createExam.isPending} size="lg">
                {createExam.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Exam & Continue
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </InstructorLayout>
  );
}