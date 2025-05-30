import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  Users, 
  Search, 
  Filter, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  BookOpen, 
  PenTool,
  MessageSquare,
  BarChart3,
  Target,
  Award,
  Calendar
} from "lucide-react";

interface StudentManagementProps {
  teacherId: number;
}

export function StudentManagement({ teacherId }: StudentManagementProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedClass, setSelectedClass] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedStudent, setSelectedStudent] = useState<any>(null);

  // Get teacher's students with detailed analytics
  const { data: students } = useQuery({
    queryKey: [`/api/teacher/${teacherId}/students`],
  });

  // Get teacher's classrooms for filtering
  const { data: classrooms } = useQuery({
    queryKey: ["/api/teacher/classrooms"],
  });

  const demoStudents = [
    {
      id: 1,
      name: "Alice Johnson",
      email: "alice.j@school.edu",
      avatar: "AJ",
      classroomId: 1,
      classroomName: "Creative Writing 101",
      status: "active",
      lastActive: "2 hours ago",
      totalWords: 2847,
      assignmentsCompleted: 8,
      assignmentsPending: 2,
      currentStreak: 12,
      writingQuality: 87,
      grammarAccuracy: 91,
      vocabularyScore: 82,
      aiInteractions: 23,
      improvementTrend: "+15%",
      recentActivity: [
        { type: "submission", title: "Personal Narrative Essay", date: "2025-05-30", grade: "A-" },
        { type: "ai_help", title: "Grammar Check Session", date: "2025-05-29" },
        { type: "achievement", title: "Writing Streak: 12 Days", date: "2025-05-28" }
      ],
      goals: [
        { title: "Daily Writing Goal", progress: 85, target: "250 words/day" },
        { title: "Grammar Improvement", progress: 91, target: "90% accuracy" }
      ]
    },
    {
      id: 2,
      name: "Bob Smith",
      email: "bob.s@school.edu",
      avatar: "BS",
      classroomId: 1,
      classroomName: "Creative Writing 101",
      status: "needs_attention",
      lastActive: "3 days ago",
      totalWords: 1234,
      assignmentsCompleted: 4,
      assignmentsPending: 6,
      currentStreak: 0,
      writingQuality: 62,
      grammarAccuracy: 73,
      vocabularyScore: 68,
      aiInteractions: 45,
      improvementTrend: "-8%",
      recentActivity: [
        { type: "overdue", title: "Character Development Essay", date: "2025-05-27", status: "3 days overdue" },
        { type: "ai_help", title: "Brainstorming Session", date: "2025-05-27" },
        { type: "submission", title: "Short Story Draft", date: "2025-05-25", grade: "C+" }
      ],
      goals: [
        { title: "Daily Writing Goal", progress: 32, target: "250 words/day" },
        { title: "Weekly Sessions", progress: 50, target: "4 sessions/week" }
      ]
    },
    {
      id: 3,
      name: "Maria Rodriguez",
      email: "maria.r@school.edu",
      avatar: "MR",
      classroomId: 1,
      classroomName: "Creative Writing 101",
      status: "excellent",
      lastActive: "1 hour ago",
      totalWords: 4521,
      assignmentsCompleted: 12,
      assignmentsPending: 0,
      currentStreak: 24,
      writingQuality: 94,
      grammarAccuracy: 96,
      vocabularyScore: 89,
      aiInteractions: 18,
      improvementTrend: "+22%",
      recentActivity: [
        { type: "submission", title: "Research Paper Final", date: "2025-05-30", grade: "A+" },
        { type: "achievement", title: "Perfect Assignment Streak", date: "2025-05-29" },
        { type: "ai_help", title: "Citation Review", date: "2025-05-28" }
      ],
      goals: [
        { title: "Advanced Vocabulary", progress: 89, target: "500 new words" },
        { title: "Research Skills", progress: 100, target: "Complete research module" }
      ]
    },
    {
      id: 4,
      name: "David Kim",
      email: "david.k@school.edu",
      avatar: "DK",
      classroomId: 1,
      classroomName: "Creative Writing 101",
      status: "improving",
      lastActive: "5 hours ago",
      totalWords: 1876,
      assignmentsCompleted: 6,
      assignmentsPending: 3,
      currentStreak: 7,
      writingQuality: 78,
      grammarAccuracy: 84,
      vocabularyScore: 75,
      aiInteractions: 31,
      improvementTrend: "+18%",
      recentActivity: [
        { type: "submission", title: "Poetry Collection", date: "2025-05-29", grade: "B+" },
        { type: "ai_help", title: "Style Improvement", date: "2025-05-29" },
        { type: "achievement", title: "Most Improved Writer", date: "2025-05-26" }
      ],
      goals: [
        { title: "Writing Quality", progress: 78, target: "80% quality score" },
        { title: "Consistent Practice", progress: 70, target: "Daily writing habit" }
      ]
    },
    {
      id: 5,
      name: "Sarah Chen",
      email: "sarah.c@school.edu",
      avatar: "SC",
      classroomId: 1,
      classroomName: "Creative Writing 101",
      status: "at_risk",
      lastActive: "1 week ago",
      totalWords: 567,
      assignmentsCompleted: 2,
      assignmentsPending: 8,
      currentStreak: 0,
      writingQuality: 54,
      grammarAccuracy: 67,
      vocabularyScore: 59,
      aiInteractions: 12,
      improvementTrend: "-12%",
      recentActivity: [
        { type: "missed", title: "Weekly Writing Assignment", date: "2025-05-23", status: "No submission" },
        { type: "ai_help", title: "Getting Started Help", date: "2025-05-22" },
        { type: "submission", title: "Introduction Paragraph", date: "2025-05-20", grade: "D+" }
      ],
      goals: [
        { title: "Basic Writing Skills", progress: 25, target: "Foundation level" },
        { title: "Regular Engagement", progress: 15, target: "Weekly participation" }
      ]
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "excellent": return "bg-green-100 text-green-800 border-green-200";
      case "active": return "bg-blue-100 text-blue-800 border-blue-200";
      case "improving": return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "needs_attention": return "bg-orange-100 text-orange-800 border-orange-200";
      case "at_risk": return "bg-red-100 text-red-800 border-red-200";
      default: return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "excellent": return <Award className="h-4 w-4 text-green-600" />;
      case "active": return <CheckCircle className="h-4 w-4 text-blue-600" />;
      case "improving": return <TrendingUp className="h-4 w-4 text-yellow-600" />;
      case "needs_attention": return <Clock className="h-4 w-4 text-orange-600" />;
      case "at_risk": return <AlertTriangle className="h-4 w-4 text-red-600" />;
      default: return <Users className="h-4 w-4 text-gray-600" />;
    }
  };

  const filteredStudents = demoStudents.filter(student => {
    if (searchTerm && !student.name.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    if (selectedClass !== "all" && student.classroomId !== parseInt(selectedClass)) return false;
    if (statusFilter !== "all" && student.status !== statusFilter) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header with Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <Users className="h-8 w-8 text-blue-500 mx-auto mb-2" />
            <div className="text-2xl font-bold">{demoStudents.length}</div>
            <p className="text-sm text-gray-600">Total Students</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
            <div className="text-2xl font-bold">{demoStudents.filter(s => s.status === "active" || s.status === "excellent").length}</div>
            <p className="text-sm text-gray-600">On Track</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <TrendingUp className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
            <div className="text-2xl font-bold">{demoStudents.filter(s => s.status === "improving").length}</div>
            <p className="text-sm text-gray-600">Improving</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <AlertTriangle className="h-8 w-8 text-orange-500 mx-auto mb-2" />
            <div className="text-2xl font-bold">{demoStudents.filter(s => s.status === "needs_attention").length}</div>
            <p className="text-sm text-gray-600">Needs Attention</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <Clock className="h-8 w-8 text-red-500 mx-auto mb-2" />
            <div className="text-2xl font-bold">{demoStudents.filter(s => s.status === "at_risk").length}</div>
            <p className="text-sm text-gray-600">At Risk</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle>Student Management</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search students..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <Select value={selectedClass} onValueChange={setSelectedClass}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All Classes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Classes</SelectItem>
                <SelectItem value="1">Creative Writing 101</SelectItem>
                <SelectItem value="2">Advanced Writing</SelectItem>
                <SelectItem value="3">Essay Writing</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="excellent">Excellent</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="improving">Improving</SelectItem>
                <SelectItem value="needs_attention">Needs Attention</SelectItem>
                <SelectItem value="at_risk">At Risk</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Student List */}
          <div className="space-y-4">
            {filteredStudents.map((student) => (
              <Card key={student.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <Avatar>
                        <AvatarFallback>{student.avatar}</AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <h3 className="font-medium">{student.name}</h3>
                          <Badge className={`${getStatusColor(student.status)} text-xs`}>
                            {getStatusIcon(student.status)}
                            <span className="ml-1 capitalize">{student.status.replace('_', ' ')}</span>
                          </Badge>
                        </div>
                        
                        <div className="flex items-center space-x-4 text-sm text-gray-600 mt-1">
                          <span className="flex items-center">
                            <BookOpen className="h-3 w-3 mr-1" />
                            {student.classroomName}
                          </span>
                          <span className="flex items-center">
                            <Clock className="h-3 w-3 mr-1" />
                            Active {student.lastActive}
                          </span>
                          <span className="flex items-center">
                            <PenTool className="h-3 w-3 mr-1" />
                            {student.totalWords} words
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <div className="text-right text-sm">
                        <div className="font-medium">Quality: {student.writingQuality}%</div>
                        <div className="text-gray-600 flex items-center">
                          {student.improvementTrend.startsWith('+') ? (
                            <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
                          ) : (
                            <TrendingDown className="h-3 w-3 text-red-500 mr-1" />
                          )}
                          {student.improvementTrend}
                        </div>
                      </div>
                      
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm" onClick={() => setSelectedStudent(student)}>
                            View Details
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-4xl">
                          <DialogHeader>
                            <DialogTitle>Student Profile: {student.name}</DialogTitle>
                          </DialogHeader>
                          {selectedStudent && (
                            <div className="space-y-6">
                              {/* Student Overview */}
                              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <Card>
                                  <CardContent className="p-4 text-center">
                                    <BookOpen className="h-6 w-6 text-blue-500 mx-auto mb-2" />
                                    <div className="text-xl font-bold">{selectedStudent.assignmentsCompleted}</div>
                                    <p className="text-xs text-gray-600">Completed</p>
                                  </CardContent>
                                </Card>
                                
                                <Card>
                                  <CardContent className="p-4 text-center">
                                    <Target className="h-6 w-6 text-orange-500 mx-auto mb-2" />
                                    <div className="text-xl font-bold">{selectedStudent.assignmentsPending}</div>
                                    <p className="text-xs text-gray-600">Pending</p>
                                  </CardContent>
                                </Card>
                                
                                <Card>
                                  <CardContent className="p-4 text-center">
                                    <Award className="h-6 w-6 text-green-500 mx-auto mb-2" />
                                    <div className="text-xl font-bold">{selectedStudent.currentStreak}</div>
                                    <p className="text-xs text-gray-600">Day Streak</p>
                                  </CardContent>
                                </Card>
                                
                                <Card>
                                  <CardContent className="p-4 text-center">
                                    <BarChart3 className="h-6 w-6 text-purple-500 mx-auto mb-2" />
                                    <div className="text-xl font-bold">{selectedStudent.aiInteractions}</div>
                                    <p className="text-xs text-gray-600">AI Helps</p>
                                  </CardContent>
                                </Card>
                              </div>

                              {/* Performance Metrics */}
                              <Card>
                                <CardHeader>
                                  <CardTitle>Performance Metrics</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                  <div className="space-y-2">
                                    <div className="flex justify-between items-center">
                                      <span className="text-sm font-medium">Writing Quality</span>
                                      <span className="text-sm">{selectedStudent.writingQuality}%</span>
                                    </div>
                                    <Progress value={selectedStudent.writingQuality} />
                                  </div>
                                  
                                  <div className="space-y-2">
                                    <div className="flex justify-between items-center">
                                      <span className="text-sm font-medium">Grammar Accuracy</span>
                                      <span className="text-sm">{selectedStudent.grammarAccuracy}%</span>
                                    </div>
                                    <Progress value={selectedStudent.grammarAccuracy} />
                                  </div>
                                  
                                  <div className="space-y-2">
                                    <div className="flex justify-between items-center">
                                      <span className="text-sm font-medium">Vocabulary Score</span>
                                      <span className="text-sm">{selectedStudent.vocabularyScore}%</span>
                                    </div>
                                    <Progress value={selectedStudent.vocabularyScore} />
                                  </div>
                                </CardContent>
                              </Card>

                              {/* Goals Progress */}
                              <Card>
                                <CardHeader>
                                  <CardTitle>Goal Progress</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                  {selectedStudent.goals.map((goal: any, index: number) => (
                                    <div key={index} className="space-y-2">
                                      <div className="flex justify-between items-center">
                                        <span className="text-sm font-medium">{goal.title}</span>
                                        <span className="text-sm text-gray-600">{goal.target}</span>
                                      </div>
                                      <Progress value={goal.progress} />
                                      <div className="text-xs text-gray-500">{goal.progress}% complete</div>
                                    </div>
                                  ))}
                                </CardContent>
                              </Card>

                              {/* Recent Activity */}
                              <Card>
                                <CardHeader>
                                  <CardTitle>Recent Activity</CardTitle>
                                </CardHeader>
                                <CardContent>
                                  <div className="space-y-3">
                                    {selectedStudent.recentActivity.map((activity: any, index: number) => (
                                      <div key={index} className="flex items-center space-x-3 p-2 rounded-lg bg-gray-50">
                                        <div className={`w-2 h-2 rounded-full ${
                                          activity.type === 'submission' ? 'bg-green-500' :
                                          activity.type === 'ai_help' ? 'bg-blue-500' :
                                          activity.type === 'achievement' ? 'bg-yellow-500' :
                                          activity.type === 'overdue' ? 'bg-red-500' : 'bg-gray-500'
                                        }`} />
                                        <div className="flex-1">
                                          <div className="text-sm font-medium">{activity.title}</div>
                                          <div className="text-xs text-gray-600">{activity.date}</div>
                                        </div>
                                        {activity.grade && (
                                          <Badge variant="outline">{activity.grade}</Badge>
                                        )}
                                        {activity.status && (
                                          <Badge variant="destructive">{activity.status}</Badge>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </CardContent>
                              </Card>
                            </div>
                          )}
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}