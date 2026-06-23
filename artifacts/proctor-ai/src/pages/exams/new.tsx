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
import { ArrowLeft, Loader2 } from "lucide-react";
import { Link } from "wouter";

const formSchema = z.object({
  title: z.string().min(1, "Title is required"),
  subject: z.string().optional(),
  description: z.string().optional(),
  durationMinutes: z.coerce.number().min(5, "Duration must be at least 5 minutes"),
});

type FormValues = z.infer<typeof formSchema>;

export default function NewExam() {
  const [, setLocation] = useLocation();
  const createExam = useCreateExam();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      subject: "",
      description: "",
      durationMinutes: 60,
    },
  });

  const onSubmit = (data: FormValues) => {
    createExam.mutate({ data }, {
      onSuccess: (exam) => {
        setLocation(`/exams/${exam.id}/build`);
      }
    });
  };

  return (
    <InstructorLayout>
      <div className="p-8 max-w-3xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/exams"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div>
            <h1 className="text-3xl font-display font-bold tracking-tight text-foreground">Create New Exam</h1>
            <p className="text-muted-foreground mt-1">Set up the basic details for your assessment.</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Exam Details</CardTitle>
            <CardDescription>You can add questions and publish after creating.</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title</FormLabel>
                      <FormControl>
                        <Input placeholder="Midterm Exam 1" {...field} />
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
                          <Input placeholder="Computer Science 101" {...field} value={field.value || ""} />
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
                          <Input type="number" min="5" {...field} />
                        </FormControl>
                        <FormDescription>Time limit for the exam</FormDescription>
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
                          placeholder="Provide instructions for the students..." 
                          className="min-h-32"
                          {...field} 
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end pt-4">
                  <Button type="submit" disabled={createExam.isPending}>
                    {createExam.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Create Exam & Continue
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </InstructorLayout>
  );
}