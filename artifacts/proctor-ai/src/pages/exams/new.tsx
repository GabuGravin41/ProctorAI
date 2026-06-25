import { useState } from "react";
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
import { useCreateExam } from "@workspace/api-client-react";
import { ArrowLeft, Loader2, Sparkles, Key, Check, Shield } from "lucide-react";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";

const formSchema = z.object({
  title: z.string().min(1, "Title is required"),
  subject: z.string().optional(),
  description: z.string().optional(),
  durationMinutes: z.coerce.number().min(5, "Duration must be at least 5 minutes"),
  aiProvider: z.enum(["free", "custom_openrouter", "custom_gemini", "hosted"]),
  aiModel: z.string(),
  customApiKey: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export default function NewExam() {
  const [, setLocation] = useLocation();
  const createExam = useCreateExam();
  const [selectedProvider, setSelectedProvider] = useState<"free" | "custom_openrouter" | "custom_gemini" | "hosted">("free");

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      subject: "",
      description: "",
      durationMinutes: 60,
      aiProvider: "free",
      aiModel: "google/gemma-2-9b-it:free",
      customApiKey: "",
    },
  });

  const onSubmit = (data: FormValues) => {
    const payload = {
      title: data.title,
      subject: data.subject || "",
      description: data.description || "",
      durationMinutes: data.durationMinutes,
      aiConfig: {
        provider: data.aiProvider,
        model: data.aiModel,
        customApiKey: data.customApiKey || undefined,
        hostedPaid: data.aiProvider === "hosted" ? true : undefined,
      }
    };

    createExam.mutate({ data: payload }, {
      onSuccess: (exam) => {
        setLocation(`/exams/${exam.id}/build`);
      }
    });
  };

  const handleProviderSelect = (provider: "free" | "custom_openrouter" | "custom_gemini" | "hosted") => {
    setSelectedProvider(provider);
    form.setValue("aiProvider", provider);
    if (provider === "free") {
      form.setValue("aiModel", "google/gemma-2-9b-it:free");
    } else if (provider === "custom_openrouter") {
      form.setValue("aiModel", "google/gemma-2-9b-it:free");
    } else if (provider === "custom_gemini") {
      form.setValue("aiModel", "gemini-2.5-flash");
    } else if (provider === "hosted") {
      form.setValue("aiModel", "deepseek/deepseek-chat");
    }
  };

  return (
    <InstructorLayout>
      <div className="p-8 max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/exams"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div>
            <h1 className="text-3xl font-display font-bold tracking-tight text-foreground">Create New Exam</h1>
            <p className="text-muted-foreground mt-1">Set up exam specifications and AI configuration.</p>
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Card className="border border-slate-100 shadow-sm backdrop-blur-md bg-white/95">
              <CardHeader>
                <CardTitle>Exam Details</CardTitle>
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
                        <Input placeholder="IMO Mock Olympiad - Geometry" {...field} className="bg-slate-50/50 focus:bg-white" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="grid grid-cols-2 gap-6">
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
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Duration (Minutes)</FormLabel>
                        <FormControl>
                          <Input type="number" min="5" {...field} className="bg-slate-50/50 focus:bg-white" />
                        </FormControl>
                        <FormDescription>Duration of exam window</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

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
                  <CardTitle>AI Settings</CardTitle>
                </div>
                <CardDescription>Select the AI configuration for Olympiad proof evaluation and question generation.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Free Default */}
                  <div 
                    onClick={() => handleProviderSelect("free")}
                    className={`cursor-pointer p-5 rounded-xl border-2 transition-all relative flex flex-col justify-between h-40 ${
                      selectedProvider === "free" 
                        ? "border-primary bg-primary/5 shadow-md shadow-primary/5" 
                        : "border-slate-200 hover:border-slate-300 bg-white"
                    }`}
                  >
                    {selectedProvider === "free" && <Check className="absolute top-3 right-3 text-primary h-5 w-5" />}
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Default Free</Badge>
                      </div>
                      <h4 className="font-bold text-lg mt-2">Gemma 9B (Free)</h4>
                      <p className="text-xs text-muted-foreground mt-1">Excellent for fast, standard proof checks and question generation at zero cost.</p>
                    </div>
                  </div>

                  {/* Hosted Paid */}
                  <div 
                    onClick={() => handleProviderSelect("hosted")}
                    className={`cursor-pointer p-5 rounded-xl border-2 transition-all relative flex flex-col justify-between h-40 ${
                      selectedProvider === "hosted" 
                        ? "border-primary bg-primary/5 shadow-md shadow-primary/5" 
                        : "border-slate-200 hover:border-slate-300 bg-white"
                    }`}
                  >
                    {selectedProvider === "hosted" && <Check className="absolute top-3 right-3 text-primary h-5 w-5" />}
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200">Premium Hosted</Badge>
                        <span className="text-xs font-semibold text-primary">$10 Setup Fee</span>
                      </div>
                      <h4 className="font-bold text-lg mt-2">DeepSeek V3 / Gemini Pro</h4>
                      <p className="text-xs text-muted-foreground mt-1">Advanced Olympiad proofs support. Fully managed, with billing and setups automated by us.</p>
                    </div>
                  </div>

                  {/* Custom OpenRouter */}
                  <div 
                    onClick={() => handleProviderSelect("custom_openrouter")}
                    className={`cursor-pointer p-5 rounded-xl border-2 transition-all relative flex flex-col justify-between h-40 ${
                      selectedProvider === "custom_openrouter" 
                        ? "border-primary bg-primary/5 shadow-md shadow-primary/5" 
                        : "border-slate-200 hover:border-slate-300 bg-white"
                    }`}
                  >
                    {selectedProvider === "custom_openrouter" && <Check className="absolute top-3 right-3 text-primary h-5 w-5" />}
                    <div>
                      <div className="flex items-center gap-2">
                        <Key className="h-4 w-4 text-muted-foreground" />
                        <span className="text-xs font-medium">Custom API</span>
                      </div>
                      <h4 className="font-bold text-lg mt-2">OpenRouter API</h4>
                      <p className="text-xs text-muted-foreground mt-1">Bring your own key. Choose Gemma, DeepSeek, ChatGPT, or Llama and pay for tokens directly.</p>
                    </div>
                  </div>

                  {/* Custom Gemini */}
                  <div 
                    onClick={() => handleProviderSelect("custom_gemini")}
                    className={`cursor-pointer p-5 rounded-xl border-2 transition-all relative flex flex-col justify-between h-40 ${
                      selectedProvider === "custom_gemini" 
                        ? "border-primary bg-primary/5 shadow-md shadow-primary/5" 
                        : "border-slate-200 hover:border-slate-300 bg-white"
                    }`}
                  >
                    {selectedProvider === "custom_gemini" && <Check className="absolute top-3 right-3 text-primary h-5 w-5" />}
                    <div>
                      <div className="flex items-center gap-2">
                        <Key className="h-4 w-4 text-muted-foreground" />
                        <span className="text-xs font-medium">Custom API</span>
                      </div>
                      <h4 className="font-bold text-lg mt-2">Google Gemini API</h4>
                      <p className="text-xs text-muted-foreground mt-1">Bring your own Google AI Studio key. Call Gemini 2.5 Flash / Pro models directly.</p>
                    </div>
                  </div>
                </div>

                {/* Conditional Fields based on selection */}
                {selectedProvider === "hosted" && (
                  <div className="p-4 rounded-lg bg-indigo-50/50 border border-indigo-100 flex gap-3 items-start">
                    <Shield className="h-5 w-5 text-indigo-600 shrink-0 mt-0.5" />
                    <div>
                      <h5 className="font-semibold text-indigo-900 text-sm">One-Click Setup</h5>
                      <p className="text-xs text-indigo-700 mt-0.5">We will host and configure the system using DeepSeek V3 and Gemini 2.5. By proceeding, a $10 setup configuration fee is simulated (un-enforced in testing phase).</p>
                    </div>
                  </div>
                )}

                {selectedProvider !== "free" && selectedProvider !== "hosted" && (
                  <div className="space-y-4 p-4 border rounded-xl bg-slate-50/50">
                    <FormField
                      control={form.control}
                      name="customApiKey"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Custom API Key</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="sk-..." {...field} className="bg-white font-mono" />
                          </FormControl>
                          <FormDescription>This key is saved securely and is only called to evaluate proofs for this exam.</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="aiModel"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>LLM Model Identifier</FormLabel>
                          <FormControl>
                            <Input placeholder={selectedProvider === "custom_gemini" ? "gemini-2.5-flash" : "google/gemma-2-9b-it:free"} {...field} className="bg-white font-mono" />
                          </FormControl>
                          <FormDescription>Choose any valid model name supported by the api provider.</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
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