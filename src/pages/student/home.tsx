import StudentLayout from "@/components/layout/student-layout";
import { useGetMe, useListSessions, getListSessionsQueryKey, useListPublicExams, useJoinPublicExam } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { KeyRound, PlayCircle, Clock, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";
import { useState } from "react";

export default function StudentHome() {
  const { data: me } = useGetMe();
  const [, setLocation] = useLocation();
  
  // Fetch sessions for this student
  const { data: sessions, isLoading } = useListSessions(undefined, { query: { queryKey: getListSessionsQueryKey(undefined), enabled: !!me?.clerkId } });

  // Fetch public exams
  const { data: publicExams, isLoading: isPublicLoading } = useListPublicExams();
  const joinPublicExam = useJoinPublicExam();
  const [joiningId, setJoiningId] = useState<number | null>(null);

  const activeSessions = sessions?.filter(s => ['pending', 'active'].includes(s.session.status)) || [];
  const completedSessions = sessions?.filter(s => s.session.status === 'submitted') || [];

  const handleTakePublicExam = async (examId: number) => {
    try {
      setJoiningId(examId);
      const res = await joinPublicExam.mutateAsync({ examId });
      // Redirect to the exam session
      setLocation(`/exam/${res.session.id}`);
    } catch (err) {
      console.error(err);
    } finally {
      setJoiningId(null);
    }
  };

  return (
    <StudentLayout>
      <div className="space-y-6 sm:space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 bg-white p-4 sm:p-6 rounded-xl border shadow-sm">
          <div>
            <h1 className="text-xl sm:text-2xl font-display font-bold tracking-tight text-primary">Welcome back, {me?.name || 'Student'}</h1>
            <p className="text-sm text-muted-foreground mt-1">Ready to take an assessment?</p>
          </div>
          <Button size="lg" asChild className="shrink-0 h-10 sm:h-12 text-sm sm:text-base">
            <Link href="/join">
              <KeyRound className="mr-2 h-4 w-4" />
              Join Exam
            </Link>
          </Button>
        </div>

        <div className="space-y-4 sm:space-y-6">
          <h2 className="text-xl font-bold border-b pb-2">Active Assessments</h2>
          
          {isLoading ? (
            <div className="text-center py-8">Loading...</div>
          ) : activeSessions.length === 0 ? (
            <div className="text-center py-12 border border-dashed rounded-lg bg-slate-50">
              <p className="text-muted-foreground">You don't have any active assessments.</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {activeSessions.map((item) => (
                <Card key={item.session.id} className="border-primary/20 shadow-md">
                  <CardHeader>
                    <CardTitle>{item.exam.title}</CardTitle>
                    <CardDescription>{item.exam.subject}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center text-sm text-muted-foreground mb-2">
                      <Clock className="h-4 w-4 mr-2" />
                      {item.exam.durationMinutes} Minutes
                    </div>
                    <div className="text-sm font-medium">
                      Status: <span className="capitalize text-primary">{item.session.status}</span>
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button className="w-full" asChild>
                      <Link href={`/exam/${item.session.id}`}>
                        <PlayCircle className="mr-2 h-4 w-4" /> 
                        {item.session.status === 'active' ? 'Resume Exam' : 'Start Exam'}
                      </Link>
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-4 sm:space-y-6 mt-12">
          <h2 className="text-xl font-bold border-b pb-2">Public Practice Exams</h2>
          {isPublicLoading ? (
            <div className="text-center py-8">Loading practice exams...</div>
          ) : !publicExams || publicExams.length === 0 ? (
            <div className="text-center py-12 border border-dashed rounded-lg bg-slate-50">
              <p className="text-muted-foreground">No public practice exams available at this time.</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {publicExams.map((exam) => {
                const activeSession = activeSessions.find(s => s.exam.id === exam.id);
                const completedSession = completedSessions.find(s => s.exam.id === exam.id);

                return (
                  <Card key={exam.id} className="border-indigo-100 shadow-sm hover:shadow-md transition-all">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700 rounded">
                          {exam.subject || 'General'}
                        </span>
                        {completedSession && (
                          <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-green-50 text-green-700 rounded">
                            Completed
                          </span>
                        )}
                      </div>
                      <CardTitle className="text-base mt-2 line-clamp-1">{exam.title}</CardTitle>
                      <CardDescription className="line-clamp-2 min-h-[2.5rem] text-xs">
                        {exam.description || 'Practice exam for olympiad training.'}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pb-3 text-xs">
                      <div className="flex items-center gap-4 text-muted-foreground">
                        <div className="flex items-center">
                          <Clock className="h-4 w-4 mr-1" />
                          {exam.durationMinutes} min
                        </div>
                        <div>
                          {exam.questionCount} {exam.questionCount === 1 ? 'Question' : 'Questions'}
                        </div>
                      </div>
                    </CardContent>
                    <CardFooter>
                      {completedSession ? (
                        <Button variant="outline" className="w-full text-xs" asChild>
                          <Link href={`/exam/${completedSession.session.id}/results`}>
                            View Past Attempt
                          </Link>
                        </Button>
                      ) : activeSession ? (
                        <Button className="w-full bg-indigo-600 hover:bg-indigo-700 text-xs" asChild>
                          <Link href={`/exam/${activeSession.session.id}`}>
                            <PlayCircle className="mr-2 h-4 w-4" />
                            Resume Attempt
                          </Link>
                        </Button>
                      ) : (
                        <Button 
                          className="w-full bg-indigo-600 hover:bg-indigo-700 text-xs"
                          disabled={joiningId !== null}
                          onClick={() => handleTakePublicExam(exam.id)}
                        >
                          <PlayCircle className="mr-2 h-4 w-4" />
                          {joiningId === exam.id ? 'Starting...' : 'Take Practice Exam'}
                        </Button>
                      )}
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {completedSessions.length > 0 && (
          <div className="space-y-6 mt-12">
            <h2 className="text-xl font-bold border-b pb-2">Completed Assessments</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {completedSessions.map((item) => (
                <Card key={item.session.id} className="bg-slate-50">
                  <CardHeader>
                    <CardTitle className="text-base">{item.exam.title}</CardTitle>
                    <CardDescription>Submitted on {item.session.submittedAt ? format(new Date(item.session.submittedAt), "MMM d, yyyy") : ''}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center text-sm font-medium text-green-600">
                        <CheckCircle2 className="h-4 w-4 mr-1.5" /> Completed
                      </div>
                      <div className="font-bold text-lg">
                        {item.session.score != null && item.session.maxScore ? (
                          `${Math.round((item.session.score / item.session.maxScore) * 100)}%`
                        ) : (
                          "Pending"
                        )}
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button variant="outline" className="w-full" asChild>
                      <Link href={`/exam/${item.session.id}/results`}>View Results</Link>
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </StudentLayout>
  );
}