import StudentLayout from "@/components/layout/student-layout";
import { useGetMe, useListSessions, getListSessionsQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { KeyRound, PlayCircle, Clock, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";

export default function StudentHome() {
  const { data: me } = useGetMe();
  // Fetch sessions for this student
  const { data: sessions, isLoading } = useListSessions(undefined, { query: { queryKey: getListSessionsQueryKey(undefined), enabled: !!me?.clerkId } });

  const activeSessions = sessions?.filter(s => s.session.status === 'pending' || s.session.status === 'active') || [];
  const completedSessions = sessions?.filter(s => s.session.status === 'submitted') || [];

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