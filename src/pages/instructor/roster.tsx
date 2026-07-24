import { useState } from "react";
import InstructorLayout from "@/components/layout/instructor-layout";
import {
  useGetInstructorProfile,
  useListCohorts,
  useCreateCohort,
  useListRosterStudents,
  useUpdateRosterEntry,
} from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Copy, Plus, Users, UserCheck, KeyRound, Check, X, ShieldAlert, BookOpen } from "lucide-react";

export default function RosterManagement() {
  const { toast } = useToast();
  const { data: profile, isLoading: isLoadingProfile } = useGetInstructorProfile();
  const { data: cohorts = [], isLoading: isLoadingCohorts } = useListCohorts();
  const { data: students = [], isLoading: isLoadingStudents } = useListRosterStudents();
  const updateRosterEntry = useUpdateRosterEntry();
  const createCohort = useCreateCohort();

  const [copied, setCopied] = useState(false);
  const [selectedCohortFilter, setSelectedCohortFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // New cohort dialog state
  const [cohortDialogOpen, setCohortDialogOpen] = useState(false);
  const [newCohortName, setNewCohortName] = useState("");
  const [newCohortSubject, setNewCohortSubject] = useState("");
  const [newCohortYear, setNewCohortYear] = useState(new Date().getFullYear().toString());

  const handleCopyCode = () => {
    if (!profile?.instructorCode) return;
    navigator.clipboard.writeText(profile.instructorCode);
    setCopied(true);
    toast({ title: "Instructor code copied to clipboard!" });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCreateCohort = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCohortName.trim()) return;

    try {
      await createCohort.mutateAsync({
        name: newCohortName,
        subject: newCohortSubject || undefined,
        year: newCohortYear || undefined,
      });
      toast({ title: "Cohort created", description: `"${newCohortName}" has been added.` });
      setCohortDialogOpen(false);
      setNewCohortName("");
      setNewCohortSubject("");
    } catch (err: any) {
      toast({ title: "Failed to create cohort", description: err.message, variant: "destructive" });
    }
  };

  const handleApprove = (entryId: number, cohortId?: number) => {
    updateRosterEntry.mutate(
      { entryId, status: "approved", cohortId },
      {
        onSuccess: () => toast({ title: "Student approved and added to roster." }),
        onError: (err) => toast({ title: "Action failed", description: err.message, variant: "destructive" }),
      }
    );
  };

  const handleDecline = (entryId: number) => {
    updateRosterEntry.mutate(
      { entryId, status: "declined" },
      {
        onSuccess: () => toast({ title: "Join request declined." }),
        onError: (err) => toast({ title: "Action failed", description: err.message, variant: "destructive" }),
      }
    );
  };

  const pendingStudents = students.filter((s) => s.status === "pending");
  const approvedStudents = students.filter((s) => s.status === "approved");

  const filteredApprovedStudents = approvedStudents.filter((s) => {
    const matchesSearch =
      (s.studentName || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.studentEmail || "").toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCohort =
      selectedCohortFilter === "all" ||
      (selectedCohortFilter === "unassigned" && !s.cohortId) ||
      s.cohortId === Number(selectedCohortFilter);

    return matchesSearch && matchesCohort;
  });

  return (
    <InstructorLayout>
      <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-display font-bold tracking-tight text-foreground">
              Student Rosters & Cohorts
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              Organize your contest students into cohorts and manage join requests.
            </p>
          </div>

          {/* Instructor Code Badge Card */}
          <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-lg p-3 flex items-center gap-3 shrink-0 shadow-sm">
            <div>
              <div className="text-[10px] uppercase font-bold text-indigo-700 tracking-wider">Your Instructor Code</div>
              <div className="font-mono text-lg font-bold text-indigo-900">
                {isLoadingProfile ? "..." : profile?.instructorCode || "COACH-XXXXX"}
              </div>
            </div>
            <Button size="icon" variant="outline" className="h-8 w-8 shrink-0 bg-white" onClick={handleCopyCode}>
              {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4 text-slate-600" />}
            </Button>
          </div>
        </div>

        {/* Tabs for Roster management */}
        <Tabs defaultValue="students" className="w-full">
          <TabsList className="grid w-full grid-cols-3 md:w-auto">
            <TabsTrigger value="students" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Roster ({approvedStudents.length})
            </TabsTrigger>
            <TabsTrigger value="pending" className="flex items-center gap-2 relative">
              <UserCheck className="h-4 w-4" />
              Pending Requests
              {pendingStudents.length > 0 && (
                <Badge className="ml-1 bg-red-600 hover:bg-red-700 px-1.5 py-0.2 text-[10px]">
                  {pendingStudents.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="cohorts" className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              Cohorts ({cohorts.length})
            </TabsTrigger>
          </TabsList>

          {/* Tab 1: Enrolled Students Roster */}
          <TabsContent value="students" className="mt-6 space-y-4">
            <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
              <Input
                placeholder="Search students by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="max-w-md"
              />
              <Select value={selectedCohortFilter} onValueChange={setSelectedCohortFilter}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Filter by Cohort" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Cohorts</SelectItem>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {cohorts.map((c) => (
                    <SelectItem key={c.id} value={c.id.toString()}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {isLoadingStudents ? (
              <div className="py-12 text-center text-muted-foreground">Loading roster...</div>
            ) : filteredApprovedStudents.length === 0 ? (
              <div className="text-center py-16 border border-dashed rounded-lg bg-slate-50">
                <Users className="h-10 w-10 text-slate-400 mx-auto mb-3" />
                <h3 className="text-base font-medium text-slate-800">No students found</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  Share your instructor code <code className="bg-slate-200 px-1 rounded">{profile?.instructorCode}</code> with your students to have them join your roster.
                </p>
              </div>
            ) : (
              <div className="border rounded-md bg-white overflow-hidden shadow-sm">
                <div className="grid grid-cols-12 gap-4 p-4 border-b bg-slate-50 font-medium text-xs text-slate-500">
                  <div className="col-span-5">Student</div>
                  <div className="col-span-4">Cohort</div>
                  <div className="col-span-3 text-right">Assign Cohort</div>
                </div>
                <div className="divide-y">
                  {filteredApprovedStudents.map((student) => {
                    const studentCohort = cohorts.find((c) => c.id === student.cohortId);

                    return (
                      <div key={student.id} className="grid grid-cols-12 gap-4 p-4 items-center hover:bg-slate-50">
                        <div className="col-span-5">
                          <div className="font-semibold text-sm text-slate-900">{student.studentName || "Student"}</div>
                          <div className="text-xs text-slate-500">{student.studentEmail}</div>
                        </div>
                        <div className="col-span-4">
                          {studentCohort ? (
                            <Badge variant="secondary" className="bg-indigo-50 text-indigo-700 border-indigo-200">
                              {studentCohort.name}
                            </Badge>
                          ) : (
                            <span className="text-xs text-slate-400 italic">Unassigned</span>
                          )}
                        </div>
                        <div className="col-span-3 text-right">
                          <Select
                            value={student.cohortId ? student.cohortId.toString() : "none"}
                            onValueChange={(val) =>
                              updateRosterEntry.mutate({
                                entryId: student.id,
                                status: "approved",
                                cohortId: val === "none" ? undefined : Number(val),
                              })
                            }
                          >
                            <SelectTrigger className="h-8 text-xs w-full sm:w-[160px] ml-auto">
                              <SelectValue placeholder="Move cohort" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">No Cohort</SelectItem>
                              {cohorts.map((c) => (
                                <SelectItem key={c.id} value={c.id.toString()}>
                                  {c.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </TabsContent>

          {/* Tab 2: Pending Requests */}
          <TabsContent value="pending" className="mt-6 space-y-4">
            {pendingStudents.length === 0 ? (
              <div className="text-center py-16 border border-dashed rounded-lg bg-slate-50">
                <UserCheck className="h-10 w-10 text-slate-400 mx-auto mb-3" />
                <h3 className="text-base font-medium text-slate-800">No pending join requests</h3>
                <p className="text-xs text-slate-500 mt-1">
                  When students enter your instructor code on their homepage, their requests will appear here for your approval.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingStudents.map((student) => (
                  <Card key={student.id} className="border bg-amber-50/20 border-amber-200 shadow-sm">
                    <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div>
                        <div className="font-semibold text-slate-900">{student.studentName || "Student"}</div>
                        <div className="text-xs text-slate-600">{student.studentEmail}</div>
                        <div className="text-[11px] text-slate-400 mt-1">Requested join via instructor code</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Select
                          onValueChange={(cohortIdVal) => handleApprove(student.id, Number(cohortIdVal))}
                        >
                          <SelectTrigger className="h-9 text-xs w-[160px]">
                            <SelectValue placeholder="Approve & Assign..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="0">Unassigned</SelectItem>
                            {cohorts.map((c) => (
                              <SelectItem key={c.id} value={c.id.toString()}>
                                {c.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700 h-9"
                          onClick={() => handleApprove(student.id)}
                        >
                          <Check className="h-4 w-4 mr-1" /> Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 border-red-200 hover:bg-red-50 h-9"
                          onClick={() => handleDecline(student.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Tab 3: Cohort Management */}
          <TabsContent value="cohorts" className="mt-6 space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-xs text-slate-500">
                Group your students (e.g. IOI 2025 Team, Physics Olympiad Group) for easy targeted exam distribution.
              </p>
              <Dialog open={cohortDialogOpen} onOpenChange={setCohortDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="h-9 text-xs">
                    <Plus className="h-4 w-4 mr-1" /> Create Cohort
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create Student Cohort</DialogTitle>
                    <DialogDescription>
                      Create a named cohort to easily invite groups of students to contests.
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleCreateCohort} className="space-y-4 py-2">
                    <div className="space-y-2">
                      <Label htmlFor="cName">Cohort Name</Label>
                      <Input
                        id="cName"
                        placeholder="e.g., IOI 2025 Training Group"
                        value={newCohortName}
                        onChange={(e) => setNewCohortName(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cSub">Subject / Category (Optional)</Label>
                      <Input
                        id="cSub"
                        placeholder="e.g., Informatics, Mathematics, Physics"
                        value={newCohortSubject}
                        onChange={(e) => setNewCohortSubject(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cYear">Year / Batch (Optional)</Label>
                      <Input
                        id="cYear"
                        placeholder="2025"
                        value={newCohortYear}
                        onChange={(e) => setNewCohortYear(e.target.value)}
                      />
                    </div>
                    <DialogFooter>
                      <Button type="button" variant="outline" onClick={() => setCohortDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button type="submit" disabled={createCohort.isPending}>
                        {createCohort.isPending ? "Creating..." : "Create Cohort"}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {cohorts.map((cohort) => {
                const count = approvedStudents.filter((s) => s.cohortId === cohort.id).length;

                return (
                  <Card key={cohort.id} className="border shadow-sm">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base font-bold text-slate-900 flex items-center justify-between">
                        {cohort.name}
                        <Badge variant="secondary">{count} students</Badge>
                      </CardTitle>
                      {cohort.subject && (
                        <CardDescription className="text-xs">{cohort.subject} {cohort.year ? `(${cohort.year})` : ""}</CardDescription>
                      )}
                    </CardHeader>
                    <CardContent className="pt-2 text-xs text-slate-500">
                      Target group for publishing olympiad contests and training sets.
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </InstructorLayout>
  );
}
