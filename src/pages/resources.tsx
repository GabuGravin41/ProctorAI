import { useState } from "react";
import { Link } from "wouter";
import InstructorLayout from "@/components/layout/instructor-layout";
import StudentLayout from "@/components/layout/student-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { 
  useGetMe, 
  getGetMeQueryKey, 
  useGetResources, 
  useCreateResource, 
  useDeleteResource, 
  useListCohorts 
} from "@/lib/api-client";
import { 
  Loader2, 
  FileText, 
  ExternalLink, 
  Plus, 
  Search, 
  Trash2, 
  Globe, 
  Users, 
  BookOpen,
  ArrowRight,
  Sparkles
} from "lucide-react";

export default function Resources() {
  const { toast } = useToast();

  // Queries
  const { data: me, isLoading: isMeLoading } = useGetMe({
    query: { queryKey: getGetMeQueryKey() }
  });

  const { data: resources, isLoading: isResourcesLoading } = useGetResources();
  const { data: cohorts } = useListCohorts();

  // Mutations
  const createResource = useCreateResource();
  const deleteResource = useDeleteResource();

  // State
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSubjectTab, setSelectedSubjectTab] = useState("all");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newResourceData, setNewResourceData] = useState({
    title: "",
    description: "",
    url: "",
    type: "pdf",
    subject: "Machine Learning",
    cohortId: "all" // "all" for visible to anyone with an account
  });

  if (isMeLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 text-primary animate-spin" />
          <span className="text-sm text-muted-foreground font-medium">Loading resources dashboard…</span>
        </div>
      </div>
    );
  }

  if (!me) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 gap-4">
        <p className="text-destructive font-semibold">User session not found.</p>
        <Link href="/">
          <Button>Return Home</Button>
        </Link>
      </div>
    );
  }

  const Layout = me.role === "student" ? StudentLayout : InstructorLayout;
  const isInstructor = me.role === "instructor";

  // Filter resources based on search and selected category tab
  const filteredResources = (resources || []).filter((resource) => {
    const matchesSearch = 
      resource.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (resource.description || "").toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesTab = 
      selectedSubjectTab === "all" || 
      resource.subject.toLowerCase() === selectedSubjectTab.toLowerCase();

    return matchesSearch && matchesTab;
  });

  const handleCreateResource = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newResourceData.title.trim()) {
      toast({ title: "Title is required", variant: "destructive" });
      return;
    }
    if (!newResourceData.url.trim()) {
      toast({ title: "Resource URL is required", variant: "destructive" });
      return;
    }

    try {
      await createResource.mutateAsync({
        data: {
          title: newResourceData.title,
          description: newResourceData.description || null,
          url: newResourceData.url,
          type: newResourceData.type as 'pdf' | 'link',
          subject: newResourceData.subject,
          cohortId: newResourceData.cohortId === "all" ? null : Number(newResourceData.cohortId)
        }
      });

      toast({
        title: "Resource published",
        description: `Successfully published "${newResourceData.title}"`
      });

      setIsCreateOpen(false);
      setNewResourceData({
        title: "",
        description: "",
        url: "",
        type: "pdf",
        subject: "Machine Learning",
        cohortId: "all"
      });
    } catch (err: any) {
      toast({
        title: "Failed to publish resource",
        description: err.message || "An unexpected error occurred.",
        variant: "destructive"
      });
    }
  };

  const handleDeleteResource = async (id: number) => {
    if (!confirm("Are you sure you want to delete this resource?")) return;

    try {
      await deleteResource.mutateAsync(id);
      toast({
        title: "Resource deleted",
        description: "The resource has been removed successfully."
      });
    } catch (err: any) {
      toast({
        title: "Failed to delete resource",
        description: err.message || "An unexpected error occurred.",
        variant: "destructive"
      });
    }
  };

  const getSubjectColor = (subject: string) => {
    switch (subject) {
      case "Machine Learning":
        return "border-t-indigo-600 bg-indigo-50/10 text-indigo-700 hover:border-indigo-600";
      case "Mathematics":
        return "border-t-purple-600 bg-purple-50/10 text-purple-700 hover:border-purple-600";
      case "Informatics":
        return "border-t-emerald-600 bg-emerald-50/10 text-emerald-700 hover:border-emerald-600";
      default:
        return "border-t-slate-600 bg-slate-50/10 text-slate-700 hover:border-slate-600";
    }
  };

  const getSubjectBadgeGradients = (subject: string) => {
    switch (subject) {
      case "Machine Learning":
        return "bg-indigo-100 text-indigo-800 border-indigo-200/50";
      case "Mathematics":
        return "bg-purple-100 text-purple-800 border-purple-200/50";
      case "Informatics":
        return "bg-emerald-100 text-emerald-800 border-emerald-200/50";
      default:
        return "bg-slate-100 text-slate-800 border-slate-200/50";
    }
  };

  return (
    <Layout>
      <div className="space-y-8 pb-12">
        {/* Header Block */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b pb-6">
          <div>
            <h1 className="text-3xl font-display font-bold tracking-tight text-slate-900 flex items-center gap-2">
              <BookOpen className="h-8 w-8 text-primary" /> Study Resources &amp; Material
            </h1>
            <p className="text-muted-foreground mt-1.5">
              Access solved Olympiad problem sheets, Machine Learning worksheets, and official study aids.
            </p>
          </div>

          {isInstructor && (
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button className="font-semibold shadow-md flex items-center gap-2 shrink-0">
                  <Plus className="h-5 w-5" /> Add Resource
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 font-display text-lg">
                    <Sparkles className="h-5 w-5 text-indigo-600" /> Share New Resource
                  </DialogTitle>
                  <DialogDescription>
                    Fill in details below to publish solved problem sheets, worksheets, or reference links.
                  </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleCreateResource} className="space-y-4 pt-2">
                  <div className="space-y-2">
                    <Label htmlFor="title">Title *</Label>
                    <Input 
                      id="title"
                      placeholder="e.g., IOI 2024 Solved Solutions - Practice Set 1" 
                      value={newResourceData.title}
                      onChange={(e) => setNewResourceData(d => ({ ...d, title: e.target.value }))}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea 
                      id="description"
                      placeholder="Explain what study goals this worksheet helps students achieve..." 
                      value={newResourceData.description}
                      onChange={(e) => setNewResourceData(d => ({ ...d, description: e.target.value }))}
                      rows={3}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="url">Resource URL / PDF Link *</Label>
                    <Input 
                      id="url"
                      placeholder="https://drive.google.com/..." 
                      value={newResourceData.url}
                      onChange={(e) => setNewResourceData(d => ({ ...d, url: e.target.value }))}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="type">Resource Type</Label>
                      <Select 
                        value={newResourceData.type}
                        onValueChange={(val) => setNewResourceData(d => ({ ...d, type: val }))}
                      >
                        <SelectTrigger id="type">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pdf">PDF Worksheet</SelectItem>
                          <SelectItem value="link">External Link</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="subject">Subject Category</Label>
                      <Select 
                        value={newResourceData.subject}
                        onValueChange={(val) => setNewResourceData(d => ({ ...d, subject: val }))}
                      >
                        <SelectTrigger id="subject">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Machine Learning">Machine Learning</SelectItem>
                          <SelectItem value="Mathematics">Mathematics</SelectItem>
                          <SelectItem value="Informatics">Informatics</SelectItem>
                          <SelectItem value="General">General</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="cohort">Visibility Group</Label>
                    <Select 
                      value={newResourceData.cohortId}
                      onValueChange={(val) => setNewResourceData(d => ({ ...d, cohortId: val }))}
                    >
                      <SelectTrigger id="cohort">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Visible to anyone with an account</SelectItem>
                        {cohorts?.map((cohort) => (
                          <SelectItem key={cohort.id} value={String(cohort.id)}>
                            Restrict to: {cohort.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <DialogFooter className="pt-4 border-t">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setIsCreateOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={createResource.isPending}>
                      {createResource.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Publish Material
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Filter Toolbar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <Tabs 
            value={selectedSubjectTab} 
            onValueChange={setSelectedSubjectTab}
            className="w-full md:w-auto"
          >
            <TabsList className="bg-slate-100/80 p-1 border">
              <TabsTrigger value="all">All Subjects</TabsTrigger>
              <TabsTrigger value="machine learning">Machine Learning</TabsTrigger>
              <TabsTrigger value="mathematics">Mathematics</TabsTrigger>
              <TabsTrigger value="informatics">Informatics</TabsTrigger>
              <TabsTrigger value="general">General</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="relative w-full md:w-72 shrink-0">
            <Search className="absolute left-3 top-2.5 h-4.5 w-4.5 text-muted-foreground" />
            <Input 
              placeholder="Search resource topics..." 
              className="pl-9 h-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Resources Grid */}
        {isResourcesLoading ? (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="h-8 w-8 text-primary animate-spin" />
          </div>
        ) : filteredResources.length === 0 ? (
          <Card className="border-dashed py-16 text-center">
            <CardContent className="flex flex-col items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                <BookOpen className="h-6 w-6" />
              </div>
              <h3 className="font-bold text-slate-700 text-lg">No resources available</h3>
              <p className="text-muted-foreground text-sm max-w-sm mx-auto leading-normal">
                {searchTerm 
                  ? "No resources match your search queries. Try refining your keywords." 
                  : "No reference materials or worksheets have been published for this subject area yet."}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredResources.map((resource) => {
              const cohortName = cohorts?.find(c => c.id === resource.cohortId)?.name;
              
              return (
                <Card 
                  key={resource.id} 
                  className={`border-t-4 shadow-sm flex flex-col justify-between hover:shadow-md transition-all hover:scale-[1.01] ${getSubjectColor(resource.subject)}`}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <Badge className={getSubjectBadgeGradients(resource.subject)} variant="outline">
                        {resource.subject}
                      </Badge>

                      {resource.cohortId ? (
                        <Badge variant="outline" className="flex items-center gap-1 text-slate-500 border-slate-200 bg-slate-50">
                          <Users className="h-3 w-3" /> {cohortName || "Cohort Restricted"}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="flex items-center gap-1 text-blue-600 border-blue-200 bg-blue-50/50">
                          <Globe className="h-3 w-3" /> All Accounts
                        </Badge>
                      )}
                    </div>

                    <CardTitle className="text-lg font-bold text-slate-900 leading-snug line-clamp-2">
                      {resource.title}
                    </CardTitle>
                    
                    {resource.description && (
                      <CardDescription className="text-slate-600 text-xs mt-1.5 line-clamp-3 leading-relaxed">
                        {resource.description}
                      </CardDescription>
                    )}
                  </CardHeader>

                  <CardContent className="pt-0">
                    <div className="flex items-center gap-2 py-2 text-xs text-muted-foreground border-t mt-2">
                      <span>Published: {new Date(resource.createdAt).toLocaleDateString()}</span>
                    </div>
                  </CardContent>

                  <CardFooter className="bg-slate-50/60 p-4 border-t flex items-center justify-between gap-3">
                    <Button 
                      asChild 
                      variant="outline" 
                      size="sm"
                      className="flex items-center gap-1.5 font-semibold text-xs text-primary"
                    >
                      <a href={resource.url} target="_blank" rel="noopener noreferrer">
                        {resource.type === "pdf" ? (
                          <>
                            <FileText className="h-3.5 w-3.5" /> Download PDF
                          </>
                        ) : (
                          <>
                            <ExternalLink className="h-3.5 w-3.5" /> Open Website
                          </>
                        )}
                        <ArrowRight className="h-3 w-3 opacity-60 ml-0.5" />
                      </a>
                    </Button>

                    {isInstructor && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => handleDeleteResource(resource.id)}
                        disabled={deleteResource.isPending}
                      >
                        {deleteResource.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    )}
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
}
