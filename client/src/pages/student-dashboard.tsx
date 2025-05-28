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
              <h2 className="text-2xl font-bold text-gray-900">My Assignments</h2>
            </div>
            
            {assignments?.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <BookOpen className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No assignments yet</h3>
                  <p className="text-gray-500 mb-6">Join a class to start receiving writing assignments</p>
                  <JoinClass studentId={1}>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Join Your First Class
                    </Button>
                  </JoinClass>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                {/* Group assignments by class */}
                {classes?.map((classroom) => {
                  const classAssignments = assignments?.filter(a => a.teacherId === classroom.teacherId) || [];
                  if (classAssignments.length === 0) return null;
                  
                  return (
                    <div key={classroom.id} className="space-y-4">
                      <div className="flex items-center gap-3 pb-2 border-b">
                        <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                        <h3 className="text-lg font-semibold">{classroom.name}</h3>
                        <Badge variant="outline">{classroom.subject}</Badge>
                      </div>
                      
                      <div className="grid gap-4">
                        {classAssignments.map((assignment) => {
                          const session = writingSessions?.find(s => s.assignmentId === assignment.id);
                          const isOverdue = assignment.dueDate && new Date() > new Date(assignment.dueDate);
                          
                          return (
                            <Card key={assignment.id} className="hover:shadow-md transition-shadow">
                              <CardHeader>
                                <div className="flex items-center justify-between">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                      <CardTitle className="text-lg">{assignment.title}</CardTitle>
                                      {session?.status === "submitted" && (
                                        <Badge className="bg-green-100 text-green-800">Submitted</Badge>
                                      )}
                                      {session?.grade && (
                                        <Badge variant="outline">Grade: {session.grade}</Badge>
                                      )}
                                    </div>
                                    <p className="text-gray-600 text-sm mb-2">{assignment.description}</p>
                                    
                                    {session?.wordCount && (
                                      <p className="text-sm text-gray-500">
                                        Progress: {session.wordCount} words written
                                      </p>
                                    )}
                                    
                                    {session?.teacherFeedback && (
                                      <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                                        <p className="text-sm font-medium text-blue-900 mb-1">Teacher Feedback:</p>
                                        <p className="text-sm text-blue-800">{session.teacherFeedback}</p>
                                      </div>
                                    )}
                                  </div>
                                  
                                  <div className="flex flex-col items-end gap-2">
                                    <Badge variant={isOverdue ? "destructive" : assignment.dueDate ? "outline" : "secondary"}>
                                      {assignment.dueDate ? 
                                        (isOverdue ? "Overdue" : `Due ${new Date(assignment.dueDate).toLocaleDateString()}`) : 
                                        "No due date"
                                      }
                                    </Badge>
                                    
                                    {session?.status === "submitted" ? (
                                      <Button variant="outline" onClick={() => setSelectedAssignment(assignment)}>
                                        <BookOpen className="h-4 w-4 mr-2" />
                                        View Work
                                      </Button>
                                    ) : (
                                      <Button onClick={() => setSelectedAssignment(assignment)}>
                                        <PenTool className="h-4 w-4 mr-2" />
                                        {session?.wordCount ? "Continue Writing" : "Start Writing"}
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              </CardHeader>
                            </Card>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
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
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">Writing Portfolio</h2>
              <Badge variant="outline">
                {writingSessions?.filter(s => s.status === "submitted" || s.grade).length || 0} completed
              </Badge>
            </div>
            
            {writingSessions?.filter(s => s.status === "submitted" || s.grade).length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <BookOpen className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Your Portfolio</h3>
                  <p className="text-gray-500">Completed writing assignments will appear here</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {writingSessions
                  ?.filter(s => s.status === "submitted" || s.grade)
                  .map((session) => {
                    const assignment = assignments?.find(a => a.id === session.assignmentId);
                    const classroom = classes?.find(c => c.teacherId === assignment?.teacherId);
                    
                    return (
                      <Card key={session.id} className="hover:shadow-md transition-shadow">
                        <CardHeader>
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <CardTitle className="text-lg">{session.title}</CardTitle>
                                {session.grade && (
                                  <Badge className={
                                    session.grade.startsWith('A') ? "bg-green-100 text-green-800" :
                                    session.grade.startsWith('B') ? "bg-blue-100 text-blue-800" :
                                    session.grade.startsWith('C') ? "bg-yellow-100 text-yellow-800" :
                                    "bg-gray-100 text-gray-800"
                                  }>
                                    Grade: {session.grade}
                                  </Badge>
                                )}
                                <Badge variant="outline">{classroom?.name || "Unknown Class"}</Badge>
                              </div>
                              
                              <div className="grid grid-cols-3 gap-4 my-3 text-sm">
                                <div>
                                  <p className="text-gray-500">Word Count</p>
                                  <p className="font-medium">{session.wordCount.toLocaleString()} words</p>
                                </div>
                                <div>
                                  <p className="text-gray-500">Submitted</p>
                                  <p className="font-medium">
                                    {session.submittedAt ? new Date(session.submittedAt).toLocaleDateString() : "Draft"}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-gray-500">Status</p>
                                  <p className="font-medium capitalize">
                                    {session.grade ? "Graded" : session.status}
                                  </p>
                                </div>
                              </div>
                              
                              {session.teacherFeedback && (
                                <div className="mt-3 p-4 bg-green-50 rounded-lg">
                                  <p className="text-sm font-medium text-green-900 mb-2">✅ Teacher Feedback:</p>
                                  <p className="text-sm text-green-800">{session.teacherFeedback}</p>
                                </div>
                              )}
                            </div>
                            
                            <div className="flex flex-col gap-2">
                              <Button 
                                variant="outline" 
                                onClick={() => setSelectedAssignment(assignment!)}
                              >
                                <BookOpen className="h-4 w-4 mr-2" />
                                View Essay
                              </Button>
                            </div>
                          </div>
                        </CardHeader>
                      </Card>
                    );
                  })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="progress" className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">My Writing Progress</h2>
            
            {/* Writing Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardContent className="p-6 text-center">
                  <PenTool className="h-8 w-8 text-blue-600 mx-auto mb-3" />
                  <div className="text-2xl font-bold text-gray-900">{totalWordCount.toLocaleString()}</div>
                  <p className="text-sm text-gray-600">Total Words Written</p>
                  <p className="text-xs text-gray-500 mt-1">Keep up the amazing work!</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6 text-center">
                  <Trophy className="h-8 w-8 text-green-600 mx-auto mb-3" />
                  <div className="text-2xl font-bold text-gray-900">{completedAssignments}</div>
                  <p className="text-sm text-gray-600">Assignments Completed</p>
                  <p className="text-xs text-gray-500 mt-1">Great progress!</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6 text-center">
                  <Target className="h-8 w-8 text-purple-600 mx-auto mb-3" />
                  <div className="text-2xl font-bold text-gray-900">
                    {writingSessions?.length ? Math.round(totalWordCount / writingSessions.length) : 0}
                  </div>
                  <p className="text-sm text-gray-600">Avg Words per Assignment</p>
                  <p className="text-xs text-gray-500 mt-1">You're improving!</p>
                </CardContent>
              </Card>
            </div>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Writing Activity</CardTitle>
              </CardHeader>
              <CardContent>
                {writingSessions?.length === 0 ? (
                  <div className="text-center py-8">
                    <PenTool className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">Start writing to see your progress here</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {writingSessions?.slice(0, 5).map((session) => {
                      const assignment = assignments?.find(a => a.id === session.assignmentId);
                      const classroom = classes?.find(c => c.teacherId === assignment?.teacherId);
                      
                      return (
                        <div key={session.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div>
                            <p className="font-medium text-sm">{session.title}</p>
                            <p className="text-xs text-gray-600">{classroom?.name} • {session.wordCount} words</p>
                          </div>
                          <div className="text-right">
                            <Badge variant={session.status === "submitted" ? "default" : "outline"}>
                              {session.status === "submitted" ? "Submitted" : "In Progress"}
                            </Badge>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Grade Overview */}
            {writingSessions?.some(s => s.grade) && (
              <Card>
                <CardHeader>
                  <CardTitle>Grade Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {writingSessions
                      ?.filter(s => s.grade)
                      .map((session) => {
                        const assignment = assignments?.find(a => a.id === session.assignmentId);
                        const classroom = classes?.find(c => c.teacherId === assignment?.teacherId);
                        
                        return (
                          <div key={session.id} className="flex items-center justify-between p-3 border rounded-lg">
                            <div>
                              <p className="font-medium text-sm">{session.title}</p>
                              <p className="text-xs text-gray-600">{classroom?.name}</p>
                            </div>
                            <Badge className={
                              session.grade!.startsWith('A') ? "bg-green-100 text-green-800" :
                              session.grade!.startsWith('B') ? "bg-blue-100 text-blue-800" :
                              session.grade!.startsWith('C') ? "bg-yellow-100 text-yellow-800" :
                              "bg-gray-100 text-gray-800"
                            }>
                              {session.grade}
                            </Badge>
                          </div>
                        );
                      })}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}