import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AssignmentForm from "@/components/assignment-form";
import ClassroomManagement from "@/components/classroom-management";
import MessagingSystem from "@/components/messaging-system";
import TeacherInsights from "@/components/teacher-insights";
import { TeacherGoalManagement } from "@/components/teacher-goal-management";
import StudentManagement from "@/components/student-management";
import { PlusCircle, Users, FileText, BarChart3, MessageSquare, Target, LogOut } from "lucide-react";
import SageLogo from "@/components/sage-logo";
import type { Assignment, Classroom } from "@shared/schema";

export default function TeacherDashboard() {
  const [activeTab, setActiveTab] = useState("classes");

  // Get current user information
  const { data: currentUser } = useQuery({
    queryKey: ["/api/auth/user"],
  });

  // Get teacher's assignments
  const { data: assignments, isLoading: assignmentsLoading, error: assignmentsError } = useQuery<Assignment[]>({
    queryKey: ["/api/teacher/assignments"],
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  // Debug: Log assignments data
  console.log('Assignments data in frontend:', assignments);
  console.log('Assignments loading:', assignmentsLoading);
  console.log('Assignments error:', assignmentsError);
  console.log('Number of assignments:', assignments?.length || 0);

  // Get teacher's classrooms
  const { data: classrooms, isLoading: classroomsLoading } = useQuery<Classroom[]>({
    queryKey: ["/api/teacher/classrooms"],
  });

  // Mark assignment complete mutation
  const markCompleteMutation = useMutation({
    mutationFn: async (assignmentId: number) => {
      return apiRequest(`/api/assignments/${assignmentId}/complete`, {
        method: "POST",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/teacher/assignments"] });
    },
  });

  // Logout function
  const handleLogout = async () => {
    try {
      const response = await fetch("/api/auth/logout", { 
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });
      
      if (response.ok) {
        window.location.href = "/";
      } else {
        throw new Error("Logout failed");
      }
    } catch (error) {
      console.error("Logout error:", error);
      // Even if logout fails, redirect to home page
      window.location.href = "/";
    }
  };

  // Helper function to count completed assignments
  const getCompletedAssignments = () => {
    return assignments?.filter(a => a.status === "completed").length || 0;
  };

  // Helper function to count active assignments
  const getActiveAssignments = () => {
    return assignments?.filter(a => a.status !== "completed").length || 0;
  };

  // Helper function to count overdue assignments
  const getOverdueAssignments = () => {
    return assignments?.filter(a => {
      if (!a.dueDate || a.status === "completed") return false;
      return new Date(a.dueDate) < new Date();
    }).length || 0;
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
                <p className="text-sm text-gray-500">
                  Welcome, {currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : 'Teacher'}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <MessagingSystem currentUserId={currentUser?.id || 1} currentUserRole="teacher">
                <Button variant="outline" className="relative">
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Messages
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full text-xs"></div>
                </Button>
              </MessagingSystem>
              <AssignmentForm teacherId={currentUser?.id || 1}>
                <Button className="bg-edu-blue hover:bg-blue-700">
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Create Assignment
                </Button>
              </AssignmentForm>
              <Button 
                variant="outline" 
                onClick={handleLogout}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
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
                  <p className="text-2xl font-bold text-gray-900">{getActiveAssignments()}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {getCompletedAssignments()} completed
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
                  <p className="text-sm font-medium text-gray-500">Classes</p>
                  <p className="text-2xl font-bold text-gray-900">{classrooms?.length || 0}</p>
                  <p className="text-xs text-gray-400 mt-1">managed</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <FileText className="h-8 w-8 text-red-500" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Overdue</p>
                  <p className="text-2xl font-bold text-gray-900">{getOverdueAssignments()}</p>
                  <p className="text-xs text-gray-400 mt-1">need attention</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="assignments">Assignments</TabsTrigger>
            <TabsTrigger value="classes">Classes</TabsTrigger>
            <TabsTrigger value="submissions">Students</TabsTrigger>
            <TabsTrigger value="goals">Goals</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="assignments" className="space-y-6" style={{ maxHeight: 'none', overflow: 'visible' }}>
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">All Assignments</h2>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    console.log('Manual refresh clicked');
                    queryClient.invalidateQueries({ queryKey: ["/api/teacher/assignments"] });
                  }}
                >
                  Refresh
                </Button>
                <AssignmentForm teacherId={currentUser?.id || 1}>
                  <Button className="bg-edu-blue hover:bg-blue-700">
                    <PlusCircle className="h-4 w-4 mr-2" />
                    Create Assignment
                  </Button>
                </AssignmentForm>
              </div>
            </div>
            
            {(() => {
              console.log('About to render assignments. Total count:', assignments?.length || 0);
              if (assignments) {
                console.log('Assignment titles:', assignments.map((a: any) => `ID: ${a.id}, Title: ${a.title}`));
              }
              return null;
            })()}
            
            {assignments && Array.isArray(assignments) && assignments.length > 0 ? (
              <div className="grid gap-4" style={{ minHeight: 'auto', overflow: 'visible' }}>
                {assignments.map((assignment: any, index: number) => {
                  console.log(`Rendering assignment ${index + 1}:`, assignment.id, assignment.title);
                  console.log(`Card being created for assignment ${assignment.id}`);
                  return (
                    <Card key={assignment.id} className="border-l-4 border-l-blue-500" style={{ border: '2px solid red', marginBottom: '10px' }}>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle className="text-lg">{assignment.title}</CardTitle>
                            <p className="text-gray-600 mt-1">{assignment.description || "No description"}</p>
                            <div className="flex items-center gap-2 mt-2">
                              <Badge variant="outline">ID: {assignment.id}</Badge>
                              {assignment.classroomId ? (
                                <Badge variant="secondary">Classroom: {assignment.classroomId}</Badge>
                              ) : (
                                <Badge variant="outline">No Classroom</Badge>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={assignment.status === 'completed' ? 'default' : 'secondary'}>
                              {assignment.status || 'active'}
                            </Badge>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center justify-between">
                          <div className="text-sm text-gray-500">
                            Created {new Date(assignment.createdAt).toLocaleDateString()}
                            {assignment.dueDate && (
                              <span className="ml-4">
                                Due {new Date(assignment.dueDate).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm">
                              View Submissions
                            </Button>
                            <AssignmentForm teacherId={currentUser?.id || 1} assignment={assignment} mode="edit">
                              <Button variant="outline" size="sm">
                                Edit
                              </Button>
                            </AssignmentForm>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <Card>
                <CardContent className="p-12 text-center">
                  <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No assignments yet</h3>
                  <p className="text-gray-500 mb-6">Create your first assignment to get started</p>
                  <AssignmentForm teacherId={currentUser?.id || 1}>
                    <Button>
                      <PlusCircle className="h-4 w-4 mr-2" />
                      Create Your First Assignment
                    </Button>
                  </AssignmentForm>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="classes" className="space-y-8">
            <ClassroomManagement teacherId={currentUser?.id || 1} />
          </TabsContent>

          <TabsContent value="submissions" className="space-y-6">
            <StudentManagement teacherId={currentUser?.id || 1} />
          </TabsContent>

          <TabsContent value="goals" className="space-y-6">
            <TeacherGoalManagement teacherId={currentUser?.id || 1} />
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <TeacherInsights teacherId={currentUser?.id || 1} />
          </TabsContent>


        </Tabs>
      </main>
    </div>
  );
}