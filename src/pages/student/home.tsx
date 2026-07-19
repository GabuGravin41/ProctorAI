import StudentLayout from "@/components/layout/student-layout";
import { useGetMe, useListSessions, getListSessionsQueryKey, useListPublicExams, useJoinPublicExam } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { KeyRound, PlayCircle, Clock, CheckCircle2, Search, BookOpen, Layers, Award, Filter, Award as Trophy } from "lucide-react";
import { format } from "date-fns";
import { useState } from "react";

export default function StudentHome() {
  const { data: me } = useGetMe();
  const [, setLocation] = useLocation();

  // Active Tab state
  const [activeTab, setActiveTab] = useState<'assessments' | 'practice'>('assessments');

  // Public Exams filter and search state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

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
      setLocation(`/exam/${res.session.id}`);
    } catch (err) {
      console.error(err);
    } finally {
      setJoiningId(null);
    }
  };

  // Helper to extract clean round/paper labels from long titles
  const getExamCleanLabel = (title: string) => {
    if (title.includes("Bebras")) {
      const match = title.match(/Paper \d+/);
      return `Bebras Puzzles — ${match ? match[0] : 'Practice'}`;
    }
    if (title.includes("IMO Selection")) {
      const match = title.match(/Paper \d+/);
      return `IMO Prep — ${match ? match[0] : 'Practice'}`;
    }
    if (title.includes("Informatics") && title.includes("Round 2")) {
      const match = title.match(/Paper \d+/);
      return `Round 2 — ${match ? match[0] : 'Practice'}`;
    }
    if (title.includes("Mathematical")) {
      const roundMatch = title.match(/Round \d+/);
      const paperMatch = title.match(/Paper \d+/);
      if (roundMatch && paperMatch) {
        return `${roundMatch[0]} — ${paperMatch[0]}`;
      }
    }
    return title;
  };

  // Helper to categorize exams and assign theme styling
  const getCategoryDetails = (title: string) => {
    if (title.includes("Bebras")) {
      return {
        category: "Informatics Puzzles",
        badge: "Round 1: Bebras Puzzles",
        themeClass: "bg-emerald-50 text-emerald-700 border-emerald-100",
        accentClass: "border-t-4 border-t-emerald-500",
        iconColor: "text-emerald-500"
      };
    }
    if (title.includes("IMO Selection") || title.includes("IMO format")) {
      return {
        category: "IMO Prep",
        badge: "IMO Prep (Selection)",
        themeClass: "bg-rose-50 text-rose-700 border-rose-100",
        accentClass: "border-t-4 border-t-rose-500",
        iconColor: "text-rose-500"
      };
    }
    if (title.includes("Round 1") && title.includes("Mathematical")) {
      return {
        category: "KMO Round 1",
        badge: "Round 1 (Euclid Style)",
        themeClass: "bg-blue-50 text-blue-700 border-blue-100",
        accentClass: "border-t-4 border-t-blue-400",
        iconColor: "text-blue-400"
      };
    }
    if (title.includes("Round 2") && title.includes("Mathematical")) {
      return {
        category: "KMO Round 2",
        badge: "Round 2 (Intermediate)",
        themeClass: "bg-indigo-50 text-indigo-700 border-indigo-100",
        accentClass: "border-t-4 border-t-indigo-500",
        iconColor: "text-indigo-500"
      };
    }
    if (title.includes("Round 3") && title.includes("Mathematical")) {
      return {
        category: "KMO Round 3",
        badge: "Round 3 (EAMO Level)",
        themeClass: "bg-purple-50 text-purple-700 border-purple-100",
        accentClass: "border-t-4 border-t-purple-600",
        iconColor: "text-purple-600"
      };
    }
    if (title.includes("Informatics") && title.includes("Round 2")) {
      return {
        category: "Informatics Contests",
        badge: "Round 2 (Algorithmic)",
        themeClass: "bg-violet-50 text-violet-700 border-violet-100",
        accentClass: "border-t-4 border-t-violet-500",
        iconColor: "text-violet-500"
      };
    }
    return {
      category: "General",
      badge: "Practice Exam",
      themeClass: "bg-slate-50 text-slate-700 border-slate-100",
      accentClass: "border-t-4 border-t-slate-400",
      iconColor: "text-slate-400"
    };
  };

  const categories = [
    'All',
    'KMO Round 1',
    'KMO Round 2',
    'KMO Round 3',
    'IMO Prep',
    'Informatics Puzzles',
    'Informatics Contests'
  ];

  // Filter and search logic for public exams
  const filteredPublicExams = publicExams?.filter((exam) => {
    const details = getCategoryDetails(exam.title);
    const matchesCategory = selectedCategory === 'All' || details.category === selectedCategory;
    const matchesSearch = exam.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (exam.description && exam.description.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  }) || [];

  return (
    <StudentLayout>
      <div className="space-y-6 sm:space-y-8">
        {/* Welcome Hero */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 bg-white p-4 sm:p-6 rounded-xl border shadow-sm">
          <div>
            <h1 className="text-xl sm:text-2xl font-display font-bold tracking-tight text-primary">Welcome back, {me?.name || 'Student'}</h1>
            <p className="text-sm text-muted-foreground mt-1">Ready to take an assessment or practice your Olympiad skills?</p>
          </div>
          <Button size="lg" asChild className="shrink-0 h-10 sm:h-12 text-sm sm:text-base">
            <Link href="/join">
              <KeyRound className="mr-2 h-4 w-4" />
              Join with Code
            </Link>
          </Button>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-slate-200">
          <button
            onClick={() => setActiveTab('assessments')}
            className={`py-3 px-6 font-display font-bold text-sm border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'assessments'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            My Assessments
            <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
              activeTab === 'assessments' ? 'bg-indigo-100 text-indigo-800' : 'bg-slate-100 text-slate-600'
            }`}>
              {activeSessions.length + completedSessions.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('practice')}
            className={`py-3 px-6 font-display font-bold text-sm border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'practice'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Practice Exams
            <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
              activeTab === 'practice' ? 'bg-indigo-100 text-indigo-800' : 'bg-slate-100 text-slate-600'
            }`}>
              {publicExams?.length || 0}
            </span>
          </button>
        </div>

        {/* TAB CONTENTS: MY ASSESSMENTS */}
        {activeTab === 'assessments' && (
          <div className="space-y-8 animate-fadeIn">
            {/* Active section */}
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <PlayCircle className="h-5 w-5 text-indigo-600" />
                Active Assessments ({activeSessions.length})
              </h2>

              {isLoading ? (
                <div className="text-center py-8">Loading assessments...</div>
              ) : activeSessions.length === 0 ? (
                <div className="text-center py-12 border border-dashed rounded-lg bg-slate-50">
                  <p className="text-muted-foreground text-sm">You don't have any active assessments right now.</p>
                  <Button variant="outline" size="sm" className="mt-4" onClick={() => setActiveTab('practice')}>
                    Browse Practice Exams
                  </Button>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {activeSessions.map((item) => (
                    <Card key={item.session.id} className="border-indigo-100 shadow-sm hover:shadow-md transition-all">
                      <CardHeader className="pb-3">
                        <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700 rounded self-start">
                          {item.exam.subject || 'General'}
                        </span>
                        <CardTitle className="text-base mt-2">{item.exam.title}</CardTitle>
                      </CardHeader>
                      <CardContent className="pb-3 text-sm">
                        <div className="flex items-center text-muted-foreground mb-2">
                          <Clock className="h-4 w-4 mr-2" />
                          {item.exam.durationMinutes} Minutes
                        </div>
                        <div className="text-xs">
                          Status: <span className="capitalize font-semibold text-indigo-600">{item.session.status}</span>
                        </div>
                      </CardContent>
                      <CardFooter>
                        <Button className="w-full bg-indigo-600 hover:bg-indigo-700" asChild>
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

            {/* Completed section */}
            {completedSessions.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                  Past Attempts & Completed ({completedSessions.length})
                </h2>

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {completedSessions.map((item) => (
                    <Card key={item.session.id} className="bg-slate-50 border-slate-200">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base">{item.exam.title}</CardTitle>
                        <CardDescription className="text-xs">Submitted on {item.session.submittedAt ? format(new Date(item.session.submittedAt), "MMM d, yyyy") : ''}</CardDescription>
                      </CardHeader>
                      <CardContent className="pb-3">
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center text-emerald-600 font-semibold">
                            <CheckCircle2 className="h-4 w-4 mr-1.5" /> Completed
                          </div>
                          <div className="font-bold text-base bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">
                            {item.session.score != null && item.session.maxScore ? (
                              `${Math.round((item.session.score / item.session.maxScore) * 100)}%`
                            ) : (
                              "Pending"
                            )}
                          </div>
                        </div>
                      </CardContent>
                      <CardFooter>
                        <Button variant="outline" className="w-full text-xs" asChild>
                          <Link href={`/exam/${item.session.id}/results`}>View Results</Link>
                        </Button>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB CONTENTS: PRACTICE EXAMS */}
        {activeTab === 'practice' && (
          <div className="space-y-6 animate-fadeIn">
            {/* Search and Filters */}
            <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div className="relative w-full md:w-80">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search practice exams..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-4 py-2 w-full text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                />
              </div>

              {/* Category selector */}
              <div className="flex flex-wrap gap-2">
                <span className="text-xs font-semibold text-slate-500 flex items-center gap-1 self-center mr-1">
                  <Filter className="h-3 w-3" /> Filter:
                </span>
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1 text-xs font-semibold rounded-full border transition-all ${
                      selectedCategory === cat
                        ? 'bg-indigo-600 border-indigo-600 text-white'
                        : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Public exams list */}
            {isPublicLoading ? (
              <div className="text-center py-12">Loading practice exams...</div>
            ) : filteredPublicExams.length === 0 ? (
              <div className="text-center py-12 border border-dashed rounded-lg bg-slate-50">
                <p className="text-muted-foreground text-sm">No practice exams match your search or filter criteria.</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredPublicExams.map((exam) => {
                  const activeSession = activeSessions.find(s => s.exam.id === exam.id);
                  const completedSession = completedSessions.find(s => s.exam.id === exam.id);
                  const details = getCategoryDetails(exam.title);

                  return (
                    <Card key={exam.id} className={`shadow-sm hover:shadow-md transition-all ${details.accentClass}`}>
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <span className={`px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider rounded border ${details.themeClass}`}>
                            {details.badge}
                          </span>
                          {completedSession && (
                            <span className="px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-100 rounded">
                              Completed
                            </span>
                          )}
                        </div>
                        <CardTitle className="mt-2 text-slate-800 font-display" title={exam.title}>
                          <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
                            {exam.title.split(" — ")[0]}
                          </div>
                          <div className="text-base font-bold text-indigo-900 mt-0.5 whitespace-normal">
                            {getExamCleanLabel(exam.title)}
                          </div>
                        </CardTitle>
                        <CardDescription className="line-clamp-2 min-h-[2.5rem] text-xs">
                          {exam.description || 'Practice exam for olympiad training.'}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="pb-3 text-xs">
                        <div className="flex items-center gap-4 text-slate-500">
                          <div className="flex items-center">
                            <Clock className={`h-4 w-4 mr-1 ${details.iconColor}`} />
                            {exam.durationMinutes} min
                          </div>
                          <div className="flex items-center">
                            <BookOpen className={`h-4 w-4 mr-1 ${details.iconColor}`} />
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
        )}
      </div>
    </StudentLayout>
  );
}