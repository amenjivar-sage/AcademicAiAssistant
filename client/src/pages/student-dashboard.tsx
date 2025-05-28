import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookOpen, PenTool, Target, Trophy, Clock, Users, Plus } from "lucide-react";
import SageLogo from "@/components/sage-logo";
import WritingWorkspace from "@/components/writing-workspace";
import AiAssistant from "@/components/ai-assistant";
import JoinClass from "@/components/join-class";
import type { Assignment, WritingSession, Classroom } from "@shared/schema";

export default function StudentDashboard() {
  const [activeTab, setActiveTab] = useState("assignments");
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);

  // Get student's assignments across all classes
  const { data: assignments, isLoading: assignmentsLoading } = useQuery<Assignment[]>({
    queryKey: ["/api/student/assignments"],
  });

  // Get student's writing sessions
  const { data: writingSessions } = useQuery<WritingSession[]>({
    queryKey: ["/api/student/writing-sessions"],
  });

  // Get student's enrolled classes
  const { data: classes } = useQuery<Classroom[]>({
    queryKey: ["/api/student/classes"],
  });

  // Calculate stats
  const totalWordCount = writingSessions?.reduce((sum, session) => sum + session.wordCount, 0) || 0;
  const completedAssignments = writingSessions?.filter(s => s.status === "submitted").length || 0;
  const activeAssignments = assignments?.filter(a => a.status === "active").length || 0;

  if (assignmentsLoading) {
    return (
      <div className="min-h-screen bg-edu-light flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-edu-blue border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-edu-neutral">Loading your writing workspace...</p>
        </div>
      </div>
    );
  }

  // If student has selected an assignment to work on
  if (selectedAssignment) {
    return (
      <div className="min-h-screen bg-white">
        <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-14">
              <div className="flex items-center space-x-3">
                <Button 
                  variant="ghost" 
                  onClick={() => setSelectedAssignment(null)}
                  className="text-sm"
                >
                  ← Back to Dashboard
                </Button>
                <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm border">
                  <SageLogo size={20} className="text-blue-700" />
                </div>
                <div>
                  <h1 className="text-lg font-semibold text-edu-neutral">{selectedAssignment.title}</h1>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <Badge variant="outline">
                  {selectedAssignment.dueDate ? 
                    `Due ${new Date(selectedAssignment.dueDate).toLocaleDateString()}` : 
                    "No due date"
                  }
                </Badge>
              </div>
            </div>
          </div>
        </header>

        <div className="flex">
          {/* Main Writing Area */}
          <div className="flex-1">
            <WritingWorkspace 
              session={null} 
              onContentUpdate={() => {}} 
              onTitleUpdate={() => {}} 
              isUpdating={false} 
            />
          </div>
          
          {/* AI Assistant Sidebar */}
          <div className="w-80 border-l bg-gray-50">
            <AiAssistant sessionId={undefined} />
          </div>
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
                <h1 className="text-xl font-semibold text-edu-neutral">My Writing Dashboard</h1>
                <p className="text-sm text-gray-500">Welcome back, keep up the great work!</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <JoinClass studentId={1}>
                <Button variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Join Class
                </Button>
              </JoinClass>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <PenTool className="h-8 w-8 text-edu-blue" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Words Written</p>
                  <p className="text-2xl font-bold text-gray-900">{totalWordCount.toLocaleString()}</p>
                  <p className="text-xs text-gray-400 mt-1">Keep writing!</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Trophy className="h-8 w-8 text-edu-success" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Completed</p>
                  <p className="text-2xl font-bold text-gray-900">{completedAssignments}</p>
                  <p className="text-xs text-gray-400 mt-1">assignments done</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Clock className="h-8 w-8 text-edu-warning" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Active Work</p>
                  <p className="text-2xl font-bold text-gray-900">{activeAssignments}</p>
                  <p className="text-xs text-gray-400 mt-1">assignments to do</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Users className="h-8 w-8 text-purple-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">My Classes</p>
                  <p className="text-2xl font-bold text-gray-900">{classes?.length || 0}</p>
                  <p className="text-xs text-gray-400 mt-1">enrolled</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="assignments">My Assignments</TabsTrigger>
            <TabsTrigger value="classes">My Classes</TabsTrigger>
            <TabsTrigger value="portfolio">Writing Portfolio</TabsTrigger>
            <TabsTrigger value="progress">My Progress</TabsTrigger>
          </TabsList>

          <TabsContent value="assignments" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">Current Assignments</h2>
            </div>
            
            {assignments?.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <BookOpen className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No assignments yet</h3>
                  <p className="text-gray-500 mb-6">Join a class to start receiving writing assignments</p>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Join Your First Class
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-6">
                {assignments?.map((assignment) => (
                  <Card key={assignment.id} className="hover:shadow-md transition-shadow">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-lg">{assignment.title}</CardTitle>
                          <p className="text-gray-600 text-sm mt-1">{assignment.description}</p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge variant={assignment.dueDate ? "outline" : "secondary"}>
                            {assignment.dueDate ? 
                              `Due ${new Date(assignment.dueDate).toLocaleDateString()}` : 
                              "No due date"
                            }
                          </Badge>
                          <Button onClick={() => setSelectedAssignment(assignment)}>
                            <PenTool className="h-4 w-4 mr-2" />
                            Start Writing
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="classes" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">My Classes</h2>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Join New Class
              </Button>
            </div>
            
            {classes?.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No classes joined</h3>
                  <p className="text-gray-500 mb-6">Enter a class code from your teacher to get started</p>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Join Your First Class
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {classes?.map((classroom) => (
                  <Card key={classroom.id}>
                    <CardHeader>
                      <CardTitle className="text-lg">{classroom.name}</CardTitle>
                      <div className="flex gap-2">
                        <Badge variant="outline">{classroom.subject}</Badge>
                        {classroom.gradeLevel && (
                          <Badge variant="outline">{classroom.gradeLevel}</Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      {classroom.description && (
                        <p className="text-gray-600 text-sm">{classroom.description}</p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="portfolio" className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">Writing Portfolio</h2>
            <Card>
              <CardContent className="p-12 text-center">
                <BookOpen className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Your Portfolio</h3>
                <p className="text-gray-500">Completed writing assignments will appear here</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="progress" className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">My Writing Progress</h2>
            <Card>
              <CardContent className="p-12 text-center">
                <Target className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Progress Analytics</h3>
                <p className="text-gray-500">Track your writing improvement over time</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}