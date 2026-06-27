import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import InstructorLayout from "@/components/layout/instructor-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useGetMe, useUpdateMe, getGetMeQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, ArrowLeft, CheckCircle2, AlertCircle } from "lucide-react";
import { Link } from "wouter";

export default function UserProfile() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: me, isLoading } = useGetMe({
    query: { queryKey: getGetMeQueryKey() }
  });
  const updateMe = useUpdateMe();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    institutionName: "",
    subjectArea: "",
    trafficSource: "",
  });

  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (me) {
      setFormData({
        name: me.name || "",
        email: me.email || "",
        institutionName: me.institutionName || "",
        subjectArea: me.subjectArea || "",
        trafficSource: me.trafficSource || "",
      });
    }
  }, [me]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast({ title: "Name is required", variant: "destructive" });
      return;
    }

    if (!formData.institutionName.trim()) {
      toast({ title: "Institution name is required", variant: "destructive" });
      return;
    }

    if (!formData.subjectArea) {
      toast({ title: "Subject area is required", variant: "destructive" });
      return;
    }

    updateMe.mutate(
      {
        data: {
          name: formData.name.trim(),
          institutionName: formData.institutionName.trim(),
          subjectArea: formData.subjectArea,
          trafficSource: formData.trafficSource,
        }
      },
      {
        onSuccess: () => {
          toast({
            title: "Profile updated successfully",
            description: "Your changes have been saved.",
          });
          setIsEditing(false);
          queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
        },
        onError: () => {
          toast({
            title: "Failed to update profile",
            description: "Please try again.",
            variant: "destructive",
          });
        },
      }
    );
  };

  if (isLoading) {
    return (
      <InstructorLayout>
        <div className="p-8">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </div>
      </InstructorLayout>
    );
  }

  if (!me) {
    return (
      <InstructorLayout>
        <div className="p-8">
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-5 w-5" />
            <p>Failed to load profile</p>
          </div>
        </div>
      </InstructorLayout>
    );
  }

  const completionPercentage = Math.round(
    ((formData.name ? 1 : 0) +
      (formData.institutionName ? 1 : 0) +
      (formData.subjectArea ? 1 : 0) +
      (formData.trafficSource ? 1 : 0)) /
      4 *
      100
  );

  return (
    <InstructorLayout>
      <div className="p-4 sm:p-6 md:p-8 max-w-3xl mx-auto space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex items-center gap-2 sm:gap-4">
          <Button variant="ghost" size="icon" className="h-9 w-9 sm:h-10 sm:w-10" asChild>
            <Link href="/dashboard">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-display font-bold tracking-tight text-foreground">User Profile</h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 sm:mt-1">Manage your account and preferences</p>
          </div>
        </div>

        {/* Profile Completion */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {completionPercentage === 100 ? (
                <>
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  <span>Profile Complete</span>
                </>
              ) : (
                <>
                  <AlertCircle className="h-5 w-5 text-amber-600" />
                  <span>Profile Incomplete</span>
                </>
              )}
            </CardTitle>
            <CardDescription>
              {completionPercentage === 100
                ? "Your profile is complete!"
                : `Complete ${4 - Math.floor(completionPercentage / 25)} more fields to use all features.`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <div className="flex-1 bg-slate-200 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-green-600 h-full transition-all duration-300"
                  style={{ width: `${completionPercentage}%` }}
                />
              </div>
              <span className="text-sm font-medium text-muted-foreground">{completionPercentage}%</span>
            </div>
          </CardContent>
        </Card>

        {/* Profile Form */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>Update your personal and professional details</CardDescription>
            </div>
            {!isEditing && (
              <Button onClick={() => setIsEditing(true)} variant="outline">
                Edit Profile
              </Button>
            )}
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Name */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Full Name *</Label>
                  <Input
                    placeholder="Your full name"
                    value={formData.name}
                    onChange={(e) => setFormData(f => ({ ...f, name: e.target.value }))}
                    disabled={!isEditing}
                  />
                </div>

                {/* Email (read-only) */}
                <div className="space-y-2">
                  <Label>Email Address</Label>
                  <Input
                    type="email"
                    placeholder="your@email.com"
                    value={formData.email}
                    disabled={true}
                    className="bg-slate-50 cursor-not-allowed"
                  />
                  <p className="text-xs text-muted-foreground">Managed by Clerk authentication</p>
                </div>
              </div>

              {/* Institution */}
              <div className="space-y-2">
                <Label>Institution Name *</Label>
                <Input
                  placeholder="e.g., MIT, Stanford University"
                  value={formData.institutionName}
                  onChange={(e) => setFormData(f => ({ ...f, institutionName: e.target.value }))}
                  disabled={!isEditing}
                />
                <p className="text-xs text-muted-foreground">Your school or university name</p>
              </div>

              {/* Subject Area */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Subject Area *</Label>
                  <Select
                    value={formData.subjectArea}
                    onValueChange={(v) => setFormData(f => ({ ...f, subjectArea: v }))}
                    disabled={!isEditing}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select subject" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mathematics">Mathematics</SelectItem>
                      <SelectItem value="physics">Physics</SelectItem>
                      <SelectItem value="chemistry">Chemistry</SelectItem>
                      <SelectItem value="biology">Biology</SelectItem>
                      <SelectItem value="computer_science">Computer Science</SelectItem>
                      <SelectItem value="engineering">Engineering</SelectItem>
                      <SelectItem value="economics">Economics</SelectItem>
                      <SelectItem value="history">History</SelectItem>
                      <SelectItem value="literature">Literature</SelectItem>
                      <SelectItem value="languages">Languages</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Traffic Source */}
                <div className="space-y-2">
                  <Label>How did you hear about us? *</Label>
                  <Select
                    value={formData.trafficSource}
                    onValueChange={(v) => setFormData(f => ({ ...f, trafficSource: v }))}
                    disabled={!isEditing}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select source" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="google">Google Search</SelectItem>
                      <SelectItem value="social_media">Social Media</SelectItem>
                      <SelectItem value="friend_referral">Friend Referral</SelectItem>
                      <SelectItem value="educational_forum">Educational Forum</SelectItem>
                      <SelectItem value="university">University Portal</SelectItem>
                      <SelectItem value="hackathon">Hackathon</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Form Actions */}
              {isEditing && (
                <div className="flex gap-3 pt-6 border-t">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsEditing(false);
                      if (me) {
                        setFormData({
                          name: me.name || "",
                          email: me.email || "",
                          institutionName: me.institutionName || "",
                          subjectArea: me.subjectArea || "",
                          trafficSource: me.trafficSource || "",
                        });
                      }
                    }}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={updateMe.isPending}>
                    {updateMe.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save Changes
                  </Button>
                </div>
              )}
            </form>
          </CardContent>
        </Card>

        {/* Account Info Card */}
        <Card className="bg-slate-50 border-slate-200">
          <CardHeader>
            <CardTitle className="text-base">Account Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Role:</span>
              <span className="font-medium capitalize">{me.role}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Email:</span>
              <span className="font-medium">{me.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Account Created:</span>
              <span className="font-medium">
                {me.createdAt ? new Date(me.createdAt).toLocaleDateString() : "N/A"}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </InstructorLayout>
  );
}
