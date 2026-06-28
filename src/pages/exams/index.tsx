import { useListExams, useUpdateExam, getListExamsQueryKey } from "@/lib/api-client";
import InstructorLayout from "@/components/layout/instructor-layout";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Plus, MoreHorizontal, Settings, FileBarChart, Users, Archive } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";

export default function ExamsList() {
  const { data: exams, isLoading } = useListExams();
  const updateExam = useUpdateExam();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleArchive = (examId: number) => {
    updateExam.mutate(
      { examId, data: { status: "archived" } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListExamsQueryKey() });
          toast({ title: "Exam archived", description: "The exam is now closed to new sessions." });
        },
        onError: () => toast({ title: "Failed to archive exam", variant: "destructive" }),
      }
    );
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "published": return <Badge className="bg-green-600 hover:bg-green-700">Published</Badge>;
      case "draft": return <Badge variant="secondary">Draft</Badge>;
      case "archived": return <Badge variant="outline">Archived</Badge>;
      default: return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <InstructorLayout>
      <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-display font-bold tracking-tight text-foreground">Exams</h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">Manage your assessments and question banks.</p>
          </div>
          <Button asChild className="w-full sm:w-auto h-10 sm:h-11">
            <Link href="/exams/new">
              <Plus className="mr-2 h-4 w-4" />
              Create Exam
            </Link>
          </Button>
        </div>

        {isLoading ? (
          <div className="py-12 text-center text-muted-foreground">Loading exams...</div>
        ) : !exams?.length ? (
          <div className="text-center py-24 border border-dashed rounded-lg bg-slate-50">
            <h3 className="text-lg font-medium text-foreground mb-2">No exams created</h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">Create your first exam to build questions and generate access codes for your students.</p>
            <Button asChild>
              <Link href="/exams/new">
                <Plus className="mr-2 h-4 w-4" />
                Create Exam
              </Link>
            </Button>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block border rounded-md bg-white overflow-hidden shadow-sm">
              <div className="grid grid-cols-12 gap-4 p-4 border-b bg-slate-50/80 font-medium text-sm text-muted-foreground">
                <div className="col-span-4">Exam</div>
                <div className="col-span-2">Status</div>
                <div className="col-span-2">Questions</div>
                <div className="col-span-2">Sessions</div>
                <div className="col-span-2 text-right">Actions</div>
              </div>
              <div className="divide-y">
                {exams.map((exam) => (
                  <div key={exam.id} className="grid grid-cols-12 gap-4 p-4 items-center hover:bg-slate-50 transition-colors">
                    <div className="col-span-4">
                      <Link href={`/exams/${exam.id}/build`} className="font-bold text-foreground hover:text-primary transition-colors block mb-1">
                        {exam.title}
                      </Link>
                      <div className="text-xs text-muted-foreground">
                        {exam.subject && <span className="mr-2">{exam.subject} •</span>}
                        {exam.durationMinutes} min
                      </div>
                    </div>
                    <div className="col-span-2 flex flex-col justify-center items-start gap-1">
                      <div>{getStatusBadge(exam.status)}</div>
                      {exam.status === "published" && exam.accessCode && (
                        <code 
                          className="text-xs bg-indigo-50 text-indigo-700 px-1 rounded font-mono font-semibold cursor-pointer hover:bg-indigo-100 transition-colors select-all" 
                          title="Click to copy access code"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigator.clipboard.writeText(exam.accessCode || "");
                            toast({ title: "Access code copied!" });
                          }}
                        >
                          {exam.accessCode}
                        </code>
                      )}
                    </div>
                    <div className="col-span-2 text-sm">
                      {exam.questionCount || 0} questions
                    </div>
                    <div className="col-span-2 text-sm flex items-center gap-1.5">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      {exam.sessionCount || 0}
                    </div>
                    <div className="col-span-2 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem asChild>
                            <Link href={`/exams/${exam.id}/build`} className="cursor-pointer">
                              <Settings className="mr-2 h-4 w-4" /> Edit Exam
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href={`/exams/${exam.id}/results`} className="cursor-pointer">
                              <FileBarChart className="mr-2 h-4 w-4" /> View Results
                            </Link>
                          </DropdownMenuItem>
                          {exam.status === "published" && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-muted-foreground"
                                onClick={() => handleArchive(exam.id)}
                                disabled={updateExam.isPending}
                              >
                                <Archive className="mr-2 h-4 w-4" /> Archive Exam
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-3 sm:space-y-4">
              {exams.map((exam) => (
                <div key={exam.id} className="border rounded-lg p-4 sm:p-5 bg-white hover:bg-slate-50 transition-colors">
                  <Link href={`/exams/${exam.id}/build`} className="font-bold text-sm sm:text-base text-foreground hover:text-primary transition-colors block mb-2 sm:mb-3 line-clamp-2">
                    {exam.title}
                  </Link>
                  <div className="space-y-2 sm:space-y-2.5 mb-3 sm:mb-4">
                    <div className="text-xs sm:text-sm text-muted-foreground">
                      {exam.subject && <span className="mr-2">{exam.subject} •</span>}
                      {exam.durationMinutes} min
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {getStatusBadge(exam.status)}
                      {exam.status === "published" && exam.accessCode && (
                        <code 
                          className="text-xs bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded font-mono font-semibold cursor-pointer hover:bg-indigo-100 transition-colors"
                          title="Click to copy access code"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigator.clipboard.writeText(exam.accessCode || "");
                            toast({ title: "Access code copied!" });
                          }}
                        >
                          Code: {exam.accessCode}
                        </code>
                      )}
                      <span className="text-xs sm:text-sm text-muted-foreground">{exam.questionCount || 0} questions</span>
                      <span className="text-xs sm:text-sm text-muted-foreground flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {exam.sessionCount || 0} sessions
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button asChild variant="outline" size="sm" className="flex-1 text-xs sm:text-sm h-9 sm:h-10">
                      <Link href={`/exams/${exam.id}/build`}>
                        <Settings className="mr-1.5 h-3 w-3 sm:h-4 sm:w-4" /> Edit
                      </Link>
                    </Button>
                    <Button asChild variant="outline" size="sm" className="flex-1 text-xs sm:text-sm h-9 sm:h-10">
                      <Link href={`/exams/${exam.id}/results`}>
                        <FileBarChart className="mr-1.5 h-3 w-3 sm:h-4 sm:w-4" /> Results
                      </Link>
                    </Button>
                    {exam.status === "published" && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs"
                        onClick={() => handleArchive(exam.id)}
                        disabled={updateExam.isPending}
                      >
                        <Archive className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </InstructorLayout>
  );
}