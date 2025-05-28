import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import AssignmentForm from "@/components/assignment-form";
import ClassroomManagement from "@/components/classroom-management";
import MessagingSystem from "@/components/messaging-system";
import TeacherInsights from "@/components/teacher-insights";
import { PlusCircle, Users, FileText, BarChart3, Settings, Eye, Edit, CheckCircle, Clock, AlertTriangle, GraduationCap, MessageSquare, Target } from "lucide-react";
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
              <MessagingSystem currentUserId={1} currentUserRole="teacher">
                <Button variant="outline" className="relative">
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Messages
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full text-xs"></div>
                </Button>
              </MessagingSystem>
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
                  <p className="text-2xl font-bold text-gray-900">{assignments?.filter(a => a.status !== "completed").length || 0}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {assignments?.filter(a => a.status === "completed").length || 0} completed
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Users className="h-8 w-8 text-edu-success" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Student Progress</p>
                  <p className="text-2xl font-bold text-gray-900">18/24</p>
                  <p className="text-xs text-gray-400 mt-1">actively writing</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <BarChart3 className="h-8 w-8 text-edu-warning" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Needs Grading</p>
                  <p className="text-2xl font-bold text-gray-900">12</p>
                  <p className="text-xs text-gray-400 mt-1">submissions ready</p>
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
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="classes">My Classes</TabsTrigger>
            <TabsTrigger value="assignments">Assignments</TabsTrigger>
            <TabsTrigger value="submissions">Students</TabsTrigger>
            <TabsTrigger value="insights">Student Insights</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="settings">Communication</TabsTrigger>
          </TabsList>

          <TabsContent value="classes" className="space-y-6">
            <ClassroomManagement teacherId={1} />
          </TabsContent>

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

          <TabsContent value="insights" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">Student Insights & Achievements</h2>
              <Badge variant="outline">Real-time monitoring</Badge>
            </div>
            
            <TeacherInsights teacherId={1} />
          </TabsContent>

          <TabsContent value="submissions" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">Student Management</h2>
              <div className="flex gap-2">
                <Button variant="outline">
                  <Users className="h-4 w-4 mr-2" />
                  Export Grades
                </Button>
                <Button>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Bulk Grade
                </Button>
              </div>
            </div>
            
            {/* Student Progress Table */}
            <Card>
              <CardHeader>
                <CardTitle>Class Roster & Progress</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-6 gap-4 p-3 bg-gray-50 rounded-lg font-medium text-sm">
                    <div>Student Name</div>
                    <div>Current Assignment</div>
                    <div>Progress</div>
                    <div>AI Usage</div>
                    <div>Last Active</div>
                    <div>Actions</div>
                  </div>
                  
                  <div className="grid grid-cols-6 gap-4 p-3 border rounded-lg items-center">
                    <div className="font-medium">Maria Garcia</div>
                    <div className="text-sm text-gray-600">Personal Narrative Essay</div>
                    <div>
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-gray-200 rounded-full h-2">
                          <div className="bg-green-600 h-2 rounded-full" style={{width: '95%'}}></div>
                        </div>
                        <span className="text-sm">95%</span>
                      </div>
                    </div>
                    <div><Badge className="bg-blue-100 text-blue-800">High</Badge></div>
                    <div className="text-sm text-gray-500">2 hours ago</div>
                    <div>
                      <Button variant="outline" size="sm">Message</Button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-6 gap-4 p-3 border rounded-lg items-center">
                    <div className="font-medium">Alex Kim</div>
                    <div className="text-sm text-gray-600">Personal Narrative Essay</div>
                    <div>
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-gray-200 rounded-full h-2">
                          <div className="bg-blue-600 h-2 rounded-full" style={{width: '75%'}}></div>
                        </div>
                        <span className="text-sm">75%</span>
                      </div>
                    </div>
                    <div><Badge className="bg-green-100 text-green-800">Medium</Badge></div>
                    <div className="text-sm text-gray-500">1 day ago</div>
                    <div>
                      <Button variant="outline" size="sm">Message</Button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-6 gap-4 p-3 border rounded-lg items-center">
                    <div className="font-medium">Sarah Johnson</div>
                    <div className="text-sm text-gray-600">Personal Narrative Essay</div>
                    <div>
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-gray-200 rounded-full h-2">
                          <div className="bg-yellow-600 h-2 rounded-full" style={{width: '30%'}}></div>
                        </div>
                        <span className="text-sm">30%</span>
                      </div>
                    </div>
                    <div><Badge className="bg-red-100 text-red-800">Low</Badge></div>
                    <div className="text-sm text-gray-500">3 days ago</div>
                    <div>
                      <Button variant="outline" size="sm">Remind</Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardContent className="p-6 text-center">
                  <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-3" />
                  <h3 className="font-medium mb-2">Grade Similar Work</h3>
                  <p className="text-sm text-gray-600 mb-4">Apply same feedback to multiple submissions</p>
                  <Button variant="outline" size="sm">Bulk Grade</Button>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6 text-center">
                  <FileText className="h-8 w-8 text-blue-600 mx-auto mb-3" />
                  <h3 className="font-medium mb-2">Comment Templates</h3>
                  <p className="text-sm text-gray-600 mb-4">Save frequently used feedback</p>
                  <Button variant="outline" size="sm">Manage Templates</Button>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6 text-center">
                  <BarChart3 className="h-8 w-8 text-purple-600 mx-auto mb-3" />
                  <h3 className="font-medium mb-2">Export Gradebook</h3>
                  <p className="text-sm text-gray-600 mb-4">Download grades for school system</p>
                  <Button variant="outline" size="sm">Export CSV</Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">Classroom Analytics</h2>
            </div>
            
            {/* Writing Progress Analytics */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Student Writing Progress
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center p-3 bg-green-50 rounded">
                      <div>
                        <p className="font-medium">Maria Garcia</p>
                        <p className="text-sm text-gray-600">Personal Narrative Essay</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-green-600">847 words</p>
                        <p className="text-sm text-gray-500">95% complete</p>
                      </div>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-blue-50 rounded">
                      <div>
                        <p className="font-medium">Alex Kim</p>
                        <p className="text-sm text-gray-600">Personal Narrative Essay</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-blue-600">623 words</p>
                        <p className="text-sm text-gray-500">75% complete</p>
                      </div>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-yellow-50 rounded">
                      <div>
                        <p className="font-medium">Sarah Johnson</p>
                        <p className="text-sm text-gray-600">Personal Narrative Essay</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-yellow-600">234 words</p>
                        <p className="text-sm text-gray-500">30% complete</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    AI Feature Usage
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Grammar Check</span>
                      <div className="flex items-center gap-2">
                        <div className="w-24 bg-gray-200 rounded-full h-2">
                          <div className="bg-blue-600 h-2 rounded-full" style={{width: '85%'}}></div>
                        </div>
                        <span className="text-sm text-gray-600">85%</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Brainstorming Help</span>
                      <div className="flex items-center gap-2">
                        <div className="w-24 bg-gray-200 rounded-full h-2">
                          <div className="bg-green-600 h-2 rounded-full" style={{width: '67%'}}></div>
                        </div>
                        <span className="text-sm text-gray-600">67%</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Outline Assistance</span>
                      <div className="flex items-center gap-2">
                        <div className="w-24 bg-gray-200 rounded-full h-2">
                          <div className="bg-purple-600 h-2 rounded-full" style={{width: '52%'}}></div>
                        </div>
                        <span className="text-sm text-gray-600">52%</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Research Help</span>
                      <div className="flex items-center gap-2">
                        <div className="w-24 bg-gray-200 rounded-full h-2">
                          <div className="bg-orange-600 h-2 rounded-full" style={{width: '43%'}}></div>
                        </div>
                        <span className="text-sm text-gray-600">43%</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Class Performance Overview */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Class Performance Insights
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">72%</div>
                    <p className="text-sm text-gray-600">Students on track</p>
                    <p className="text-xs text-gray-500 mt-1">Meeting word count goals</p>
                  </div>
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">8.5 min</div>
                    <p className="text-sm text-gray-600">Avg. daily writing</p>
                    <p className="text-xs text-gray-500 mt-1">Time spent per session</p>
                  </div>
                  <div className="text-center p-4 bg-purple-50 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">94%</div>
                    <p className="text-sm text-gray-600">AI effectiveness</p>
                    <p className="text-xs text-gray-500 mt-1">Students improving with AI</p>
                  </div>
                </div>
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