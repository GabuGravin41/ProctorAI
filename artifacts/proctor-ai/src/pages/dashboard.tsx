import { useGetDashboardStats } from "@workspace/api-client-react";
import InstructorLayout from "@/components/layout/instructor-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { FileText, Users, AlertTriangle, Activity } from "lucide-react";
import { format } from "date-fns";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function Dashboard() {
  const { data: stats, isLoading } = useGetDashboardStats();

  if (isLoading) {
    return (
      <InstructorLayout>
        <div className="p-8 flex items-center justify-center h-full">
          Loading dashboard...
        </div>
      </InstructorLayout>
    );
  }

  return (
    <InstructorLayout>
      <div className="p-8 max-w-7xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-display font-bold tracking-tight text-foreground">Overview</h1>
          <p className="text-muted-foreground mt-1">Real-time metrics and alerts from your exams.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">Total Exams</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalExams || 0}</div>
              <p className="text-xs text-muted-foreground">{stats?.publishedExams || 0} published</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">Total Sessions</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalSessions || 0}</div>
              <p className="text-xs text-muted-foreground">Historical total</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">Active Sessions</CardTitle>
              <Activity className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.activeSessions || 0}</div>
              <p className="text-xs text-muted-foreground">Currently taking exams</p>
            </CardContent>
          </Card>
          <Card className={stats?.pendingFlags && stats.pendingFlags > 0 ? "border-destructive/50 bg-destructive/5" : ""}>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">Pending Flags</CardTitle>
              <AlertTriangle className={`h-4 w-4 ${stats?.pendingFlags && stats.pendingFlags > 0 ? "text-destructive" : "text-muted-foreground"}`} />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${stats?.pendingFlags && stats.pendingFlags > 0 ? "text-destructive" : ""}`}>{stats?.pendingFlags || 0}</div>
              <p className="text-xs text-muted-foreground">Require your review</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          <Card>
            <CardHeader>
              <CardTitle>Recent Exams</CardTitle>
              <CardDescription>Your latest created assessments</CardDescription>
            </CardHeader>
            <CardContent>
              {stats?.recentExams?.length ? (
                <div className="space-y-4">
                  {stats.recentExams.map((exam) => (
                    <div key={exam.id} className="flex items-center justify-between p-4 border rounded-md bg-slate-50">
                      <div>
                        <Link href={`/exams/${exam.id}/build`} className="font-medium hover:text-primary hover:underline">
                          {exam.title}
                        </Link>
                        <div className="flex gap-3 text-xs text-muted-foreground mt-1">
                          <span className="capitalize px-2 py-0.5 rounded-full bg-slate-200">{exam.status}</span>
                          <span>{format(new Date(exam.createdAt), "MMM d, yyyy")}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium">{exam.sessionCount || 0} sessions</div>
                        <div className="text-xs text-muted-foreground">{exam.flagCount || 0} flags</div>
                      </div>
                    </div>
                  ))}
                  <Button variant="outline" className="w-full" asChild>
                    <Link href="/exams">View All Exams</Link>
                  </Button>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p className="mb-4">You haven't created any exams yet.</p>
                  <Button asChild>
                    <Link href="/exams/new">Create Exam</Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent Flags</CardTitle>
              <CardDescription>AI-detected anomalies needing review</CardDescription>
            </CardHeader>
            <CardContent>
              {stats?.recentFlags?.length ? (
                <div className="space-y-4">
                  {stats.recentFlags.map((flag) => (
                    <div key={flag.id} className="flex flex-col p-4 border rounded-md bg-red-50/50 border-red-100">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium capitalize text-destructive flex items-center gap-1.5">
                          <AlertTriangle className="h-4 w-4" />
                          {flag.type.replace(/_/g, " ")}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(flag.detectedAt), "MMM d, h:mm a")}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">{flag.description || "Suspicious behavior detected"}</p>
                      <Button variant="secondary" size="sm" asChild className="self-start">
                        <Link href={`/exams/${flag.sessionId}/results`}>Review Session</Link>
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground flex flex-col items-center">
                  <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center mb-3">
                    <Activity className="h-6 w-6 text-green-600" />
                  </div>
                  <p>No pending flags to review.</p>
                  <p className="text-sm">Your exams are running smoothly.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </InstructorLayout>
  );
}