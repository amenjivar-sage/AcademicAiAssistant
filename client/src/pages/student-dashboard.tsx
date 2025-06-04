import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookOpen, PenTool, Target, Trophy, Clock, Users, Plus, MessageSquare, LogOut } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import SageLogo from "@/components/sage-logo";
import { useAuth } from "@/hooks/useAuth";

import JoinClass from "@/components/join-class";
import MessagingSystem from "@/components/messaging-system";
import AchievementSystem from "@/components/achievement-system";
import WritingAnalytics from "@/components/writing-analytics";
import { AnalyticsDashboard } from "@/components/analytics-dashboard";
import type { Assignment, WritingSession, Classroom } from "@shared/schema";

export default function StudentDashboard() {
  const [activeTab, setActiveTab] = useState("classes");
  const [selectedClassroom, setSelectedClassroom] = useState<Classroom | null>(null);
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

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

  // Get student's enrolled classes with aggressive refresh for immediate updates
  const { data: classes = [], isLoading: classesLoading, error: classesError } = useQuery<Classroom[]>({
    queryKey: ["/api/student/classes"],
    staleTime: 0, // Always refetch to ensure fresh data
    gcTime: 0, // Don't cache stale data
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    refetchInterval: 5000, // Refresh every 5 seconds to catch new enrollments
  });

  // Debug logging for classes
  console.log("=== STUDENT DASHBOARD DEBUG ===");
  console.log("Classes data:", classes, "Loading:", classesLoading, "Error:", classesError);
  console.log("Number of classes:", classes?.length || 0);
  console.log("Current user:", user);
  console.log("=== END DASHBOARD DEBUG ===");

  // Get student's assignments across all classes with aggressive refresh
  const { data: assignments = [], isLoading: assignmentsLoading } = useQuery<Assignment[]>({
    queryKey: ["/api/student/assignments"],
    staleTime: 0, // Always consider stale for immediate updates
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    refetchInterval: 5000, // Refresh every 5 seconds to catch new assignments
  });

  // Get student's writing sessions
  const { data: sessions = [], isLoading: sessionsLoading } = useQuery<WritingSession[]>({
    queryKey: ["/api/student/writing-sessions"],
    staleTime: 0, // Always refetch to ensure fresh data
    gcTime: 0, // Don't cache stale data
  });

  // Calculate stats for achievements
  const totalWordCount = sessions.reduce((total, session) => total + (session.wordCount || 0), 0);
  const completedAssignments = sessions.filter(s => s.status === 'submitted' || s.status === 'graded').length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <SageLogo className="h-8 w-8" />
              <div>
                <h1 className="text-xl font-bold text-gray-900">Student Dashboard</h1>
                <p className="text-sm text-gray-600">Welcome back, {user?.firstName || 'Student'}!</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Badge variant="outline" className="hidden sm:flex">
                <Trophy className="h-3 w-3 mr-1" />
                Level {Math.floor(totalWordCount / 500) + 1}
              </Badge>
              <MessagingSystem currentUserId={2} currentUserRole="student">
                <Button variant="outline" className="relative">
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Messages
                </Button>
              </MessagingSystem>
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
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <BookOpen className="h-8 w-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Words</p>
                  <p className="text-2xl font-bold text-gray-900">{totalWordCount.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Trophy className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Completed</p>
                  <p className="text-2xl font-bold text-gray-900">{completedAssignments}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Clock className="h-8 w-8 text-orange-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Due</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {assignments.filter(a => {
                      if (!a.dueDate) return false;
                      const dueDate = new Date(a.dueDate);
                      const today = new Date();
                      const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
                      return dueDate >= today && dueDate <= nextWeek && !sessions.some(s => s.assignmentId === a.id && (s.status === 'submitted' || s.status === 'graded'));
                    }).length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Users className="h-8 w-8 text-purple-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Classes</p>
                  <p className="text-2xl font-bold text-gray-900">{classes.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="classes">Classes</TabsTrigger>
            <TabsTrigger value="achievements">Achievements</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="classes" className="space-y-6">
            {!selectedClassroom ? (
              // Show all classes with option to select one
              <>
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-gray-900">My Classes</h2>
                  <JoinClass studentId={user?.id || 1}>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Join New Class
                    </Button>
                  </JoinClass>
                </div>
                
                {classes?.length === 0 ? (
                  <Card>
                    <CardContent className="p-12 text-center">
                      <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No classes joined</h3>
                      <p className="text-gray-500 mb-6">Enter a class code from your teacher to get started</p>
                      <JoinClass studentId={user?.id || 1}>
                        <Button>
                          <Plus className="h-4 w-4 mr-2" />
                          Join Your First Class
                        </Button>
                      </JoinClass>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {classes?.map((classroom) => {
                      const classAssignments = assignments?.filter(a => 
                        a.classroomId === classroom.id || (a.classroomId === null && a.teacherId === classroom.teacherId)
                      ) || [];
                      const pendingCount = classAssignments.filter(a => {
                        const session = sessions?.find(s => s.assignmentId === a.id);
                        return !session || (session.status !== 'submitted' && session.status !== 'graded');
                      }).length;

                      return (
                        <Card key={classroom.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setSelectedClassroom(classroom)}>
                          <CardHeader>
                            <CardTitle className="text-lg">{classroom.name}</CardTitle>
                            <div className="flex gap-2">
                              <Badge variant="outline">{classroom.subject}</Badge>
                              {classroom.gradeLevel && <Badge variant="secondary">{classroom.gradeLevel}</Badge>}
                            </div>
                          </CardHeader>
                          <CardContent>
                            <p className="text-gray-600 text-sm mb-3">{classroom.description}</p>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center text-sm text-gray-500">
                                <BookOpen className="h-4 w-4 mr-1" />
                                {classAssignments.length} assignments
                              </div>
                              {pendingCount > 0 && (
                                <Badge variant="destructive">{pendingCount} pending</Badge>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </>
            ) : (
              // Show selected classroom with its assignments
              <>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Button variant="ghost" onClick={() => setSelectedClassroom(null)}>
                      ← Back to Classes
                    </Button>
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900">{selectedClassroom.name}</h2>
                      <p className="text-gray-600">{selectedClassroom.subject}</p>
                    </div>
                  </div>
                  <Badge variant="outline">
                    {assignments?.filter(a => 
                      a.classroomId === selectedClassroom.id
                    ).length || 0} assignments
                  </Badge>
                </div>
                
                {/* Show assignments for the selected classroom */}
                <div className="space-y-4">
                  {(() => {
                    const classAssignments = assignments?.filter(a => 
                      a.classroomId === selectedClassroom.id
                    ) || [];
                    
                    if (classAssignments.length === 0) {
                      return (
                        <Card>
                          <CardContent className="p-12 text-center">
                            <BookOpen className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                            <h3 className="text-lg font-medium text-gray-900 mb-2">No assignments yet</h3>
                            <p className="text-gray-500">Your teacher hasn't posted any assignments for this class yet</p>
                          </CardContent>
                        </Card>
                      );
                    }
                    
                    return (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {classAssignments.map((assignment) => {
                          const session = sessions?.find(s => s.assignmentId === assignment.id);
                          // Determine status based on session data
                          let status = 'not_started';
                          if (session) {
                            if (session.status === 'graded') {
                              status = 'graded';
                            } else if (session.status === 'submitted') {
                              status = 'submitted';
                            } else if (session.content && session.content.trim().length > 0) {
                              status = 'in_progress';
                            }
                          }
                          const isOverdue = assignment.dueDate && new Date(assignment.dueDate) < new Date() && status !== 'submitted';
                          
                          return (
                            <Card key={assignment.id} className="hover:shadow-md transition-shadow">
                              <CardHeader>
                                <div className="flex items-start justify-between">
                                  <CardTitle className="text-lg line-clamp-2">{assignment.title}</CardTitle>
                                  <Badge variant={
                                    status === 'graded' ? 'default' :
                                    status === 'submitted' ? 'secondary' :
                                    status === 'in_progress' ? 'outline' :
                                    isOverdue ? 'destructive' : 'outline'
                                  }>
                                    {status === 'graded' ? 'Graded' :
                                     status === 'submitted' ? 'Submitted' :
                                     status === 'in_progress' ? 'In Progress' :
                                     isOverdue ? 'Overdue' : 'Not Started'}
                                  </Badge>
                                </div>
                                <p className="text-sm text-gray-600 line-clamp-3">{assignment.description}</p>
                              </CardHeader>
                              <CardContent>
                                <div className="space-y-3">
                                  <div className="space-y-2">
                                    {assignment.dueDate && (
                                      <div className="flex items-center text-sm text-gray-500">
                                        <Clock className="h-4 w-4 mr-2" />
                                        Due {new Date(assignment.dueDate).toLocaleDateString()}
                                      </div>
                                    )}
                                    {session && (
                                      <div className="flex items-center text-sm text-gray-500">
                                        <Target className="h-4 w-4 mr-2" />
                                        {session.wordCount} words written
                                      </div>
                                    )}
                                    {session?.grade && (
                                      <div className="flex items-center text-sm font-medium text-green-600">
                                        <Trophy className="h-4 w-4 mr-2" />
                                        Grade: {session.grade}
                                      </div>
                                    )}
                                    {session?.teacherFeedback && (
                                      <div className="text-sm text-gray-600 bg-blue-50 p-2 rounded">
                                        <strong>Teacher Feedback:</strong> {session.teacherFeedback}
                                      </div>
                                    )}
                                  </div>
                                  
                                  <Button 
                                    className="w-full" 
                                    variant={status === 'submitted' ? 'outline' : status === 'graded' ? 'secondary' : 'default'}
                                    onClick={() => {
                                      // Navigate to writing page
                                      window.location.href = `/writing/${assignment.id}`;
                                    }}
                                  >
                                    <PenTool className="h-4 w-4 mr-2" />
                                    {status === 'graded' ? 'Review Feedback' : 
                                     status === 'submitted' ? 'View Submission' : 
                                     status === 'in_progress' ? 'Continue Writing' : 
                                     'Start Writing'}
                                  </Button>
                                </div>
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>
              </>
            )}
          </TabsContent>



          {/* Achievements tab */}
          <TabsContent value="achievements" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">Achievements & Goals</h2>
              <Badge variant="outline">Level up your writing!</Badge>
            </div>
            
            <AchievementSystem 
              userId={user?.id || 1} 
              totalWordCount={totalWordCount}
              completedAssignments={completedAssignments}
            />
          </TabsContent>

          {/* Analytics tab */}
          <TabsContent value="analytics" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">Writing Analytics</h2>
              <Badge variant="outline">Track your improvement</Badge>
            </div>
            
            <AnalyticsDashboard userId={user?.id || 1} />
          </TabsContent>
        </Tabs>


      </main>
    </div>
  );
}