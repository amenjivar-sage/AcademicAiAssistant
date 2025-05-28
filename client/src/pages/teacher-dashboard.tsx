import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import AssignmentForm from "@/components/assignment-form";
import { PlusCircle, Users, FileText, BarChart3, Settings, Eye, Edit, CheckCircle, Clock, AlertTriangle, GraduationCap } from "lucide-react";
import SageLogo from "@/components/sage-logo";
import GradingInterface from "@/components/grading-interface";
import type { Assignment, WritingSession } from "@shared/schema";

export default function TeacherDashboard() {
  const [activeTab, setActiveTab] = useState("assignments");

  // Get teacher's assignments
  const { data: assignments, isLoading: assignmentsLoading } = useQuery<Assignment[]>({
    queryKey: ["/api/teacher/assignments"],
  });

  // Mark assignment as complete mutation
  const markCompleteMutation = useMutation({
    mutationFn: async (assignmentId: number) => {
      const response = await apiRequest("POST", `/api/assignments/${assignmentId}/complete`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/teacher/assignments"] });
    },
  });

  const getStatusIcon = (status: string, dueDate: Date | null) => {
    const now = new Date();
    const isOverdue = dueDate && new Date(dueDate) < now && status === "active";
    
    if (status === "completed") {
      return <CheckCircle className="h-4 w-4 text-green-600" />;
    }
    if (isOverdue || status === "overdue") {
      return <AlertTriangle className="h-4 w-4 text-red-600" />;
    }
    return <Clock className="h-4 w-4 text-blue-600" />;
  };

  const getStatusBadge = (status: string, dueDate: Date | null) => {
    const now = new Date();
    const isOverdue = dueDate && new Date(dueDate) < now && status === "active";
    
    if (status === "completed") {
      return <Badge className="bg-green-100 text-green-800">Completed</Badge>;
    }
    if (isOverdue || status === "overdue") {
      return <Badge className="bg-red-100 text-red-800">Overdue</Badge>;
    }
    return <Badge className="bg-blue-100 text-blue-800">Active</Badge>;
  };

  if (assignmentsLoading) {
    return (
      <div className="min-h-screen bg-edu-light flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-edu-blue border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-edu-neutral">Loading teacher dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-edu-light">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm border">
                <SageLogo size={24} className="text-blue-700" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-edu-neutral">Sage Teacher Portal</h1>
                <p className="text-sm text-gray-500">Welcome, Prof. Johnson</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <AssignmentForm teacherId={1}>
                <Button className="bg-edu-blue hover:bg-blue-700">
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Create Assignment
                </Button>
              </AssignmentForm>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <FileText className="h-8 w-8 text-edu-blue" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Active Assignments</p>
                  <p className="text-2xl font-bold text-gray-900">{assignments?.length || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Users className="h-8 w-8 text-edu-success" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Students Enrolled</p>
                  <p className="text-2xl font-bold text-gray-900">24</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <BarChart3 className="h-8 w-8 text-edu-warning" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Submissions Pending</p>
                  <p className="text-2xl font-bold text-gray-900">8</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Settings className="h-8 w-8 text-edu-neutral" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">AI Interactions</p>
                  <p className="text-2xl font-bold text-gray-900">156</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="assignments">Assignments</TabsTrigger>
            <TabsTrigger value="submissions">Submissions</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="assignments" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">Assignments</h2>
            </div>
            
            <div className="grid gap-6">
              {assignments?.map((assignment) => (
                <Card key={assignment.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        {getStatusIcon(assignment.status || "active", assignment.dueDate)}
                        <CardTitle className="text-lg">{assignment.title}</CardTitle>
                      </div>
                      <div className="flex items-center space-x-2">
                        {getStatusBadge(assignment.status || "active", assignment.dueDate)}
                        <Badge variant={assignment.aiPermissions === "full" ? "default" : "secondary"}>
                          AI: {assignment.aiPermissions}
                        </Badge>
                        {assignment.status !== "completed" && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => markCompleteMutation.mutate(assignment.id)}
                            disabled={markCompleteMutation.isPending}
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            {markCompleteMutation.isPending ? "Marking..." : "Mark Complete"}
                          </Button>
                        )}
                        <AssignmentForm teacherId={1} assignment={assignment} mode="edit">
                          <Button variant="outline" size="sm">
                            <Edit className="h-4 w-4 mr-1" />
                            Edit
                          </Button>
                        </AssignmentForm>
                        <GradingInterface assignmentId={assignment.id}>
                          <Button variant="outline" size="sm">
                            <GraduationCap className="h-4 w-4 mr-1" />
                            Grade
                          </Button>
                        </GradingInterface>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm">
                              <Eye className="h-4 w-4 mr-1" />
                              View
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle className="flex items-center gap-2">
                                <FileText className="h-5 w-5" />
                                Assignment Details
                              </DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div>
                                <h3 className="font-semibold text-lg mb-2">{assignment.title}</h3>
                                <p className="text-gray-600 mb-4">{assignment.description}</p>
                              </div>
                              
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <label className="text-sm font-medium text-gray-500">Due Date</label>
                                  <p className="text-sm">{assignment.dueDate ? new Date(assignment.dueDate).toLocaleDateString() : "No due date"}</p>
                                </div>
                                <div>
                                  <label className="text-sm font-medium text-gray-500">AI Permissions</label>
                                  <p className="text-sm capitalize">{assignment.aiPermissions}</p>
                                </div>
                                <div>
                                  <label className="text-sm font-medium text-gray-500">AI Permissions</label>
                                  <p className="text-sm capitalize">{assignment.aiPermissions}</p>
                                </div>
                                <div>
                                  <label className="text-sm font-medium text-gray-500">Status</label>
                                  <p className="text-sm capitalize">{assignment.status || "active"}</p>
                                </div>
                              </div>

                              <div>
                                <label className="text-sm font-medium text-gray-500">AI Features Enabled</label>
                                <div className="text-sm space-y-1 mt-1">
                                  <div>• Brainstorming: {assignment.allowBrainstorming ? "Allowed" : "Disabled"}</div>
                                  <div>• Outlining: {assignment.allowOutlining ? "Allowed" : "Disabled"}</div>
                                  <div>• Grammar Check: {assignment.allowGrammarCheck ? "Allowed" : "Disabled"}</div>
                                  <div>• Research Help: {assignment.allowResearchHelp ? "Allowed" : "Disabled"}</div>
                                </div>
                              </div>

                              <div>
                                <label className="text-sm font-medium text-gray-500">Created</label>
                                <p className="text-sm">{new Date(assignment.createdAt).toLocaleDateString()}</p>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600 mb-4">{assignment.description}</p>
                    <div className="flex items-center justify-between text-sm text-gray-500">
                      <span>Created: {new Date(assignment.createdAt).toLocaleDateString()}</span>
                      <span>Due: {assignment.dueDate ? new Date(assignment.dueDate).toLocaleDateString() : "No due date"}</span>
                    </div>
                  </CardContent>
                </Card>
              )) || (
                <Card>
                  <CardContent className="p-12 text-center">
                    <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No assignments yet</h3>
                    <p className="text-gray-500 mb-6">Create your first assignment to get started with Sage.</p>
                    <AssignmentForm teacherId={1}>
                      <Button className="bg-edu-blue hover:bg-blue-700">
                        <PlusCircle className="h-4 w-4 mr-2" />
                        Create Your First Assignment
                      </Button>
                    </AssignmentForm>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="submissions" className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">Student Submissions</h2>
            <Card>
              <CardContent className="p-12 text-center">
                <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No submissions yet</h3>
                <p className="text-gray-500">Student submissions will appear here once assignments are created.</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">AI Usage Analytics</h2>
            <Card>
              <CardContent className="p-12 text-center">
                <BarChart3 className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Analytics Dashboard</h3>
                <p className="text-gray-500">View student AI interaction patterns and learning progress.</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">AI Controls & Settings</h2>
            <Card>
              <CardContent className="p-12 text-center">
                <Settings className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">AI Permission Settings</h3>
                <p className="text-gray-500">Configure AI assistance levels and restrictions for your assignments.</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}