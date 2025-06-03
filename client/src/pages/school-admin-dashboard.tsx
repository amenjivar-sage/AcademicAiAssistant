import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import SubmissionViewer from "@/components/submission-viewer";
import { 
  Users, 
  GraduationCap, 
  BookOpen, 
  BarChart3, 
  FileText, 
  Calendar,
  Search,
  Eye,
  TrendingUp,
  AlertCircle,
  Filter
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface User {
  id: number;
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  department?: string;
  grade?: string;
  isActive: boolean;
  createdAt: string;
}

interface Assignment {
  id: number;
  teacherId: number;
  classroomId?: number;
  title: string;
  description: string;
  status: string;
  createdAt: string;
  dueDate?: string;
}

interface WritingSession {
  id: number;
  userId: number;
  assignmentId: number;
  title: string;
  wordCount: number;
  status: string;
  grade?: string;
  submittedAt?: string;
  createdAt: string;
}

interface Classroom {
  id: number;
  teacherId: number;
  name: string;
  subject: string;
  gradeLevel: string;
  classSize: number;
  joinCode: string;
}

export default function SchoolAdminDashboard() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTeacher, setSelectedTeacher] = useState<number | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<number | null>(null);
  const [selectedSubmission, setSelectedSubmission] = useState<number | null>(null);
  
  // Search and filter states
  const [teacherSearch, setTeacherSearch] = useState('');
  const [teacherDepartmentFilter, setTeacherDepartmentFilter] = useState('all');
  const [studentSearch, setStudentSearch] = useState('');
  const [studentGradeFilter, setStudentGradeFilter] = useState('all');
  const [assignmentSearch, setAssignmentSearch] = useState('');
  const [assignmentStatusFilter, setAssignmentStatusFilter] = useState('all');
  const [assignmentDateFilter, setAssignmentDateFilter] = useState('all');
  const [classroomSearch, setClassroomSearch] = useState('');
  const [classroomSubjectFilter, setClassroomSubjectFilter] = useState('all');

  // Fetch all system data
  const { data: allUsers = [] } = useQuery({
    queryKey: ["/api/admin/users"],
  });

  const { data: allAssignments = [] } = useQuery({
    queryKey: ["/api/admin/assignments"],
  });

  const { data: allSessions = [] } = useQuery({
    queryKey: ["/api/admin/writing-sessions"],
  });

  const { data: allClassrooms = [] } = useQuery({
    queryKey: ["/api/admin/classrooms"],
  });

  const teachers = allUsers.filter((user: User) => user.role === 'teacher');
  const students = allUsers.filter((user: User) => user.role === 'student');

  // Filter and search logic
  const filteredTeachers = teachers.filter((teacher: User) => {
    const matchesSearch = !teacherSearch || 
      `${teacher.firstName} ${teacher.lastName}`.toLowerCase().includes(teacherSearch.toLowerCase()) ||
      teacher.email.toLowerCase().includes(teacherSearch.toLowerCase());
    const matchesDepartment = teacherDepartmentFilter === 'all' || teacher.department === teacherDepartmentFilter;
    return matchesSearch && matchesDepartment;
  });

  const filteredStudents = students.filter((student: User) => {
    const matchesSearch = !studentSearch ||
      `${student.firstName} ${student.lastName}`.toLowerCase().includes(studentSearch.toLowerCase()) ||
      student.email.toLowerCase().includes(studentSearch.toLowerCase());
    const matchesGrade = studentGradeFilter === 'all' || student.grade === studentGradeFilter;
    return matchesSearch && matchesGrade;
  });

  const filteredAssignments = (allAssignments as any[]).filter((assignment: any) => {
    const matchesSearch = !assignmentSearch ||
      assignment.title.toLowerCase().includes(assignmentSearch.toLowerCase()) ||
      assignment.description.toLowerCase().includes(assignmentSearch.toLowerCase());
    const matchesStatus = assignmentStatusFilter === 'all' || assignment.status === assignmentStatusFilter;
    const matchesDate = assignmentDateFilter === 'all' || (() => {
      const now = new Date();
      const assignmentDate = new Date(assignment.createdAt);
      switch (assignmentDateFilter) {
        case 'today': return assignmentDate.toDateString() === now.toDateString();
        case 'week': return (now.getTime() - assignmentDate.getTime()) <= 7 * 24 * 60 * 60 * 1000;
        case 'month': return (now.getTime() - assignmentDate.getTime()) <= 30 * 24 * 60 * 60 * 1000;
        default: return true;
      }
    })();
    return matchesSearch && matchesStatus && matchesDate;
  });

  const filteredClassrooms = (allClassrooms as any[]).filter((classroom: any) => {
    const matchesSearch = !classroomSearch ||
      classroom.name.toLowerCase().includes(classroomSearch.toLowerCase()) ||
      classroom.joinCode.toLowerCase().includes(classroomSearch.toLowerCase());
    const matchesSubject = classroomSubjectFilter === 'all' || classroom.subject === classroomSubjectFilter;
    return matchesSearch && matchesSubject;
  });

  // Get unique values for filter options
  const uniqueDepartments = [...new Set(teachers.map((t: User) => t.department).filter(Boolean))];
  const uniqueGrades = [...new Set(students.map((s: User) => s.grade).filter(Boolean))];
  const uniqueSubjects = [...new Set((allClassrooms as any[]).map((c: any) => c.subject).filter(Boolean))];

  // Calculate system statistics
  const totalAssignments = allAssignments.length;
  const completedAssignments = allSessions.filter((s: WritingSession) => s.status === 'submitted' || s.status === 'graded').length;
  const activeClassrooms = allClassrooms.filter((c: Classroom) => c.classSize > 0).length;
  const averageGrades = allSessions.filter((s: WritingSession) => s.grade).length;

  const getTeacherAssignments = (teacherId: number) => {
    return allAssignments.filter((a: Assignment) => a.teacherId === teacherId);
  };

  const getTeacherClassrooms = (teacherId: number) => {
    return allClassrooms.filter((c: Classroom) => c.teacherId === teacherId);
  };

  const getStudentSessions = (studentId: number) => {
    return allSessions.filter((s: WritingSession) => s.userId === studentId);
  };

  const getAssignmentSubmissions = (assignmentId: number) => {
    return allSessions.filter((s: WritingSession) => s.assignmentId === assignmentId);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">School Administration Dashboard</h1>
            <p className="text-gray-600">Complete oversight of educational activities and performance</p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search teachers, students..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-64"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Overview Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Users className="h-8 w-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Teachers</p>
                  <p className="text-2xl font-bold text-gray-900">{teachers.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <GraduationCap className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Students</p>
                  <p className="text-2xl font-bold text-gray-900">{students.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <BookOpen className="h-8 w-8 text-purple-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Active Classrooms</p>
                  <p className="text-2xl font-bold text-gray-900">{activeClassrooms}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <FileText className="h-8 w-8 text-orange-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Assignments</p>
                  <p className="text-2xl font-bold text-gray-900">{totalAssignments}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="teachers" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="teachers">Teachers</TabsTrigger>
            <TabsTrigger value="students">Students</TabsTrigger>
            <TabsTrigger value="assignments">Assignments</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          {/* Teachers Overview */}
          <TabsContent value="teachers" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-1">
                <Card>
                  <CardHeader>
                    <CardTitle>Teachers ({filteredTeachers.length})</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-96">
                      <div className="space-y-2">
                        {filteredTeachers.map((teacher: User) => {
                          const teacherAssignments = getTeacherAssignments(teacher.id);
                          const teacherClassrooms = getTeacherClassrooms(teacher.id);
                          
                          return (
                            <div
                              key={teacher.id}
                              className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                                selectedTeacher === teacher.id 
                                  ? 'bg-blue-50 border-blue-200' 
                                  : 'bg-white border-gray-200 hover:bg-gray-50'
                              }`}
                              onClick={() => setSelectedTeacher(teacher.id)}
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="font-medium text-gray-900">
                                    {teacher.firstName} {teacher.lastName}
                                  </p>
                                  <p className="text-sm text-gray-600">{teacher.email}</p>
                                  <div className="flex items-center space-x-2 mt-1">
                                    <Badge variant="outline" className="text-xs">
                                      {teacherClassrooms.length} classes
                                    </Badge>
                                    <Badge variant="outline" className="text-xs">
                                      {teacherAssignments.length} assignments
                                    </Badge>
                                  </div>
                                </div>
                                <Eye className="h-4 w-4 text-gray-400" />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </div>

              <div className="lg:col-span-2">
                {selectedTeacher ? (
                  <TeacherDetailView 
                    teacher={allUsers.find((u: User) => u.id === selectedTeacher)!}
                    assignments={getTeacherAssignments(selectedTeacher)}
                    classrooms={getTeacherClassrooms(selectedTeacher)}
                    allSessions={allSessions}
                    allUsers={allUsers}
                  />
                ) : (
                  <Card>
                    <CardContent className="p-12 text-center">
                      <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600">Select a teacher to view detailed information</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </TabsContent>

          {/* Students Overview */}
          <TabsContent value="students" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-1">
                <Card>
                  <CardHeader>
                    <CardTitle>Students ({filteredStudents.length})</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-96">
                      <div className="space-y-2">
                        {filteredStudents.map((student: User) => {
                          const studentSessions = getStudentSessions(student.id);
                          const completedSessions = studentSessions.filter(s => s.status === 'submitted' || s.status === 'graded');
                          
                          return (
                            <div
                              key={student.id}
                              className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                                selectedStudent === student.id 
                                  ? 'bg-green-50 border-green-200' 
                                  : 'bg-white border-gray-200 hover:bg-gray-50'
                              }`}
                              onClick={() => setSelectedStudent(student.id)}
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="font-medium text-gray-900">
                                    {student.firstName} {student.lastName}
                                  </p>
                                  <p className="text-sm text-gray-600">{student.email}</p>
                                  <div className="flex items-center space-x-2 mt-1">
                                    <Badge variant="outline" className="text-xs">
                                      {studentSessions.length} assignments
                                    </Badge>
                                    <Badge variant="outline" className="text-xs">
                                      {completedSessions.length} completed
                                    </Badge>
                                  </div>
                                </div>
                                <Eye className="h-4 w-4 text-gray-400" />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </div>

              <div className="lg:col-span-2">
                {selectedStudent ? (
                  <StudentDetailView 
                    student={allUsers.find((u: User) => u.id === selectedStudent)!}
                    sessions={getStudentSessions(selectedStudent)}
                    allAssignments={allAssignments}
                    allUsers={allUsers}
                    allClassrooms={allClassrooms}
                  />
                ) : (
                  <Card>
                    <CardContent className="p-12 text-center">
                      <GraduationCap className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600">Select a student to view detailed information</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </TabsContent>

          {/* Assignments Overview */}
          <TabsContent value="assignments" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Assignments & Student Work</CardTitle>
                <p className="text-gray-600">View all assignments with student submissions, drafts, and grades</p>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {(allAssignments as any[]).map((assignment: any) => {
                    const teacher = (allUsers as any[]).find((u: any) => u.id === assignment.teacherId);
                    const assignmentSessions = (allSessions as any[]).filter((s: any) => s.assignmentId === assignment.id);
                    const submittedSessions = assignmentSessions.filter((s: any) => s.status === 'submitted' || s.status === 'graded');
                    const draftSessions = assignmentSessions.filter((s: any) => s.status === 'draft' && s.content && s.content.trim().length > 0);
                    
                    return (
                      <Card key={assignment.id} className="border-l-4 border-l-blue-500">
                        <CardHeader>
                          <div className="flex items-center justify-between">
                            <div>
                              <CardTitle className="text-lg">{assignment.title}</CardTitle>
                              <p className="text-sm text-gray-600">
                                Teacher: {teacher?.firstName} {teacher?.lastName} | 
                                Status: {assignment.status} | 
                                Due: {assignment.dueDate ? new Date(assignment.dueDate).toLocaleDateString() : 'No due date'}
                              </p>
                            </div>
                            <div className="flex space-x-2">
                              <Badge variant="secondary">
                                {submittedSessions.length} submitted
                              </Badge>
                              <Badge variant="outline">
                                {draftSessions.length} drafts
                              </Badge>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            {/* Show all student work for this assignment */}
                            {assignmentSessions
                              .filter((session: any) => session.content && session.content.trim().length > 0)
                              .map((session: any) => {
                                const student = (allUsers as any[]).find((u: any) => u.id === session.userId);
                                
                                return (
                                  <div
                                    key={session.id}
                                    className="border rounded p-3 hover:bg-gray-50 transition-colors"
                                  >
                                    <div className="flex items-center justify-between">
                                      <div className="flex-1">
                                        <div className="flex items-center space-x-3">
                                          <span className="font-medium text-gray-900">
                                            {student?.firstName} {student?.lastName}
                                          </span>
                                          <Badge variant={
                                            session.status === 'graded' ? 'default' :
                                            session.status === 'submitted' ? 'secondary' : 'outline'
                                          }>
                                            {session.status === 'graded' ? `Graded: ${session.grade}` :
                                             session.status === 'submitted' ? 'Submitted' : 'Draft'}
                                          </Badge>
                                        </div>
                                        <div className="mt-1 flex items-center space-x-4 text-sm text-gray-500">
                                          <span className="flex items-center">
                                            <Calendar className="h-3 w-3 mr-1" />
                                            {session.submittedAt ? 
                                              `Submitted: ${new Date(session.submittedAt).toLocaleDateString()}` : 
                                              `Last saved: ${new Date(session.updatedAt).toLocaleDateString()}`}
                                          </span>
                                          <span className="flex items-center">
                                            <FileText className="h-3 w-3 mr-1" />
                                            {session.wordCount || 0} words
                                          </span>
                                          {session.pastedContent && session.pastedContent.length > 0 && (
                                            <span className="flex items-center text-red-600">
                                              <AlertCircle className="h-3 w-3 mr-1" />
                                              Copy-paste detected
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setSelectedSubmission(session.id)}
                                      >
                                        <Eye className="h-3 w-3 mr-1" />
                                        View
                                      </Button>
                                    </div>
                                  </div>
                                );
                              })}
                            
                            {assignmentSessions.filter((s: any) => s.content && s.content.trim().length > 0).length === 0 && (
                              <p className="text-gray-500 text-sm italic">No student work yet</p>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Analytics */}
          <TabsContent value="analytics" className="space-y-6">
            <AnalyticsOverview 
              users={allUsers}
              assignments={allAssignments}
              sessions={allSessions}
              classrooms={allClassrooms}
            />
          </TabsContent>
        </Tabs>
      </div>
      
      {/* Submission Viewer Modal */}
      {selectedSubmission && (
        <SubmissionViewer
          sessionId={selectedSubmission}
          onClose={() => setSelectedSubmission(null)}
        />
      )}
    </div>
  );
}

// Teacher Detail Component
function TeacherDetailView({ teacher, assignments, classrooms, allSessions, allUsers }: any) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>{teacher.firstName} {teacher.lastName}</span>
            <Badge variant={teacher.isActive ? "default" : "secondary"}>
              {teacher.isActive ? "Active" : "Inactive"}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <Label className="text-sm font-medium text-gray-600">Email</Label>
              <p className="text-sm text-gray-900">{teacher.email}</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-gray-600">Department</Label>
              <p className="text-sm text-gray-900">{teacher.department || 'Not specified'}</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <p className="text-2xl font-bold text-blue-600">{classrooms.length}</p>
              <p className="text-sm text-blue-800">Classes</p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <p className="text-2xl font-bold text-green-600">{assignments.length}</p>
              <p className="text-sm text-green-800">Assignments</p>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <p className="text-2xl font-bold text-purple-600">
                {allSessions.filter((s: any) => assignments.some((a: any) => a.id === s.assignmentId)).length}
              </p>
              <p className="text-sm text-purple-800">Submissions</p>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Classes & Assignments</h3>
            <div className="space-y-6">
              {classrooms.map((classroom: any) => {
                const classroomAssignments = assignments.filter((a: any) => a.classroomId === classroom.id);
                
                return (
                  <Card key={classroom.id} className="border-l-4 border-l-blue-500">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-lg">{classroom.name}</CardTitle>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline">{classroom.subject}</Badge>
                            <Badge variant="outline">{classroom.gradeLevel}</Badge>
                            <Badge variant="secondary">Join Code: {classroom.joinCode}</Badge>
                          </div>
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-bold text-blue-600">{classroom.classSize}</p>
                          <p className="text-xs text-gray-500">Students</p>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <h4 className="font-medium text-gray-900">
                          Assignments ({classroomAssignments.length})
                        </h4>
                        
                        {classroomAssignments.length === 0 ? (
                          <p className="text-gray-500 text-sm italic">No assignments created yet</p>
                        ) : (
                          <div className="space-y-3">
                            {classroomAssignments.map((assignment: any) => {
                              const submissions = allSessions.filter((s: any) => s.assignmentId === assignment.id);
                              const graded = submissions.filter((s: any) => s.status === 'graded');
                              
                              return (
                                <div key={assignment.id} className="border rounded p-3 bg-gray-50">
                                  <div className="flex items-center justify-between mb-2">
                                    <h5 className="font-medium">{assignment.title}</h5>
                                    <div className="flex items-center space-x-2">
                                      <Badge variant={assignment.status === 'active' ? 'default' : 'secondary'} className="text-xs">
                                        {assignment.status}
                                      </Badge>
                                      {assignment.dueDate && (
                                        <Badge variant="outline" className="text-xs">
                                          Due: {new Date(assignment.dueDate).toLocaleDateString()}
                                        </Badge>
                                      )}
                                    </div>
                                  </div>
                                  <p className="text-sm text-gray-600 mb-2">
                                    {assignment.description.substring(0, 150)}...
                                  </p>
                                  <div className="flex items-center space-x-4 text-xs text-gray-500">
                                    <span>{submissions.length} submissions</span>
                                    <span>{graded.length} graded</span>
                                    <span>AI: {assignment.aiPermissions}</span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
              
              {/* Show assignments not assigned to any specific classroom */}
              {(() => {
                const generalAssignments = assignments.filter((a: any) => !a.classroomId);
                if (generalAssignments.length === 0) return null;
                
                return (
                  <Card className="border-l-4 border-l-gray-400">
                    <CardHeader>
                      <CardTitle className="text-lg">General Assignments</CardTitle>
                      <p className="text-sm text-gray-600">Assignments not tied to specific classes</p>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {generalAssignments.map((assignment: any) => {
                          const submissions = allSessions.filter((s: any) => s.assignmentId === assignment.id);
                          const graded = submissions.filter((s: any) => s.status === 'graded');
                          
                          return (
                            <div key={assignment.id} className="border rounded p-3 bg-gray-50">
                              <div className="flex items-center justify-between mb-2">
                                <h5 className="font-medium">{assignment.title}</h5>
                                <div className="flex items-center space-x-2">
                                  <Badge variant={assignment.status === 'active' ? 'default' : 'secondary'} className="text-xs">
                                    {assignment.status}
                                  </Badge>
                                  {assignment.dueDate && (
                                    <Badge variant="outline" className="text-xs">
                                      Due: {new Date(assignment.dueDate).toLocaleDateString()}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              <p className="text-sm text-gray-600 mb-2">
                                {assignment.description.substring(0, 150)}...
                              </p>
                              <div className="flex items-center space-x-4 text-xs text-gray-500">
                                <span>{submissions.length} submissions</span>
                                <span>{graded.length} graded</span>
                                <span>AI: {assignment.aiPermissions}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                );
              })()}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Student Detail Component
function StudentDetailView({ student, sessions, allAssignments, allUsers, allClassrooms }: any) {
  // Get unique classrooms from student's assignments
  const studentClassrooms = [...new Set(
    sessions.map((session: any) => {
      const assignment = allAssignments.find((a: any) => a.id === session.assignmentId);
      return assignment?.classroomId;
    }).filter(Boolean)
  )].map(classroomId => 
    allClassrooms.find((c: any) => c.id === classroomId)
  ).filter(Boolean);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>{student.firstName} {student.lastName}</span>
            <Badge variant={student.isActive ? "default" : "secondary"}>
              {student.isActive ? "Active" : "Inactive"}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <Label className="text-sm font-medium text-gray-600">Email</Label>
              <p className="text-sm text-gray-900">{student.email}</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-gray-600">Grade</Label>
              <p className="text-sm text-gray-900">{student.grade || 'Not specified'}</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <p className="text-2xl font-bold text-blue-600">{studentClassrooms.length}</p>
              <p className="text-sm text-blue-800">Classes</p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <p className="text-2xl font-bold text-green-600">
                {sessions.filter((s: any) => s.status === 'submitted' || s.status === 'graded').length}
              </p>
              <p className="text-sm text-green-800">Completed</p>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <p className="text-2xl font-bold text-purple-600">
                {sessions.filter((s: any) => s.grade).length}
              </p>
              <p className="text-sm text-purple-800">Graded</p>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Classes & Assignments</h3>
            <div className="space-y-6">
              {studentClassrooms.map((classroom: any) => {
                const classroomSessions = sessions.filter((session: any) => {
                  const assignment = allAssignments.find((a: any) => a.id === session.assignmentId);
                  return assignment?.classroomId === classroom.id;
                });
                
                const teacher = allUsers.find((u: any) => u.id === classroom.teacherId);
                
                return (
                  <Card key={classroom.id} className="border-l-4 border-l-green-500">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-lg">{classroom.name}</CardTitle>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline">{classroom.subject}</Badge>
                            <Badge variant="outline">{classroom.gradeLevel}</Badge>
                            <Badge variant="secondary">
                              Teacher: {teacher ? `${teacher.firstName} ${teacher.lastName}` : 'Unknown'}
                            </Badge>
                          </div>
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-bold text-green-600">{classroomSessions.length}</p>
                          <p className="text-xs text-gray-500">Assignments</p>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <h4 className="font-medium text-gray-900">
                          Student Work ({classroomSessions.length})
                        </h4>
                        
                        {classroomSessions.length === 0 ? (
                          <p className="text-gray-500 text-sm italic">No assignments worked on yet</p>
                        ) : (
                          <div className="space-y-3">
                            {classroomSessions.map((session: any) => {
                              const assignment = allAssignments.find((a: any) => a.id === session.assignmentId);
                              
                              return (
                                <div key={session.id} className="border rounded p-3 bg-gray-50">
                                  <div className="flex items-center justify-between mb-2">
                                    <h5 className="font-medium">{assignment?.title || 'Unknown Assignment'}</h5>
                                    <div className="flex items-center space-x-2">
                                      <Badge variant={
                                        session.status === 'graded' ? 'default' :
                                        session.status === 'submitted' ? 'secondary' : 'outline'
                                      } className="text-xs">
                                        {session.status}
                                      </Badge>
                                      {session.grade && (
                                        <Badge variant="outline" className="text-xs">
                                          Grade: {session.grade}
                                        </Badge>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex items-center space-x-4 text-xs text-gray-500">
                                    <span>{session.wordCount} words</span>
                                    {session.submittedAt && (
                                      <span>Submitted: {new Date(session.submittedAt).toLocaleDateString()}</span>
                                    )}
                                    <span>AI: {assignment?.aiPermissions || 'Unknown'}</span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
              
              {/* Show assignments not tied to any specific classroom */}
              {(() => {
                const generalSessions = sessions.filter((session: any) => {
                  const assignment = allAssignments.find((a: any) => a.id === session.assignmentId);
                  return !assignment?.classroomId;
                });
                
                if (generalSessions.length === 0) return null;
                
                return (
                  <Card className="border-l-4 border-l-gray-400">
                    <CardHeader>
                      <CardTitle className="text-lg">General Assignments</CardTitle>
                      <p className="text-sm text-gray-600">Work not tied to specific classes</p>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {generalSessions.map((session: any) => {
                          const assignment = allAssignments.find((a: any) => a.id === session.assignmentId);
                          const teacher = allUsers.find((u: any) => u.id === assignment?.teacherId);
                          
                          return (
                            <div key={session.id} className="border rounded p-3 bg-gray-50">
                              <div className="flex items-center justify-between mb-2">
                                <h5 className="font-medium">{assignment?.title || 'Unknown Assignment'}</h5>
                                <div className="flex items-center space-x-2">
                                  <Badge variant={
                                    session.status === 'graded' ? 'default' :
                                    session.status === 'submitted' ? 'secondary' : 'outline'
                                  } className="text-xs">
                                    {session.status}
                                  </Badge>
                                  {session.grade && (
                                    <Badge variant="outline" className="text-xs">
                                      Grade: {session.grade}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center space-x-4 text-xs text-gray-500">
                                <span>Teacher: {teacher ? `${teacher.firstName} ${teacher.lastName}` : 'Unknown'}</span>
                                <span>{session.wordCount} words</span>
                                {session.submittedAt && (
                                  <span>Submitted: {new Date(session.submittedAt).toLocaleDateString()}</span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                );
              })()}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Assignments Overview Component
function AssignmentsOverview({ assignments, sessions, users, classrooms }: any) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>All Assignments ({assignments.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-96">
            <div className="space-y-3">
              {assignments.map((assignment: any) => {
                const teacher = users.find((u: any) => u.id === assignment.teacherId);
                const classroom = classrooms.find((c: any) => c.id === assignment.classroomId);
                const assignmentSessions = sessions.filter((s: any) => s.assignmentId === assignment.id);
                
                return (
                  <div key={assignment.id} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium">{assignment.title}</h4>
                      <Badge variant={assignment.status === 'active' ? 'default' : 'secondary'}>
                        {assignment.status}
                      </Badge>
                    </div>
                    <div className="text-sm text-gray-600">
                      <p>Teacher: {teacher ? `${teacher.firstName} ${teacher.lastName}` : 'Unknown'}</p>
                      <p>Class: {classroom?.name || 'General Assignment'}</p>
                      <p>{assignmentSessions.length} submissions</p>
                      <p>Created: {new Date(assignment.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Assignment Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {assignments.slice(0, 5).map((assignment: any) => {
              const assignmentSessions = sessions.filter((s: any) => s.assignmentId === assignment.id);
              const completed = assignmentSessions.filter((s: any) => s.status === 'submitted' || s.status === 'graded');
              const completionRate = assignmentSessions.length > 0 ? (completed.length / assignmentSessions.length) * 100 : 0;
              
              return (
                <div key={assignment.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{assignment.title}</span>
                    <span className="text-sm text-gray-600">{Math.round(completionRate)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full" 
                      style={{ width: `${completionRate}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Analytics Overview Component
function AnalyticsOverview({ users, assignments, sessions, classrooms }: any) {
  const totalUsers = users.length;
  const activeUsers = users.filter((u: any) => u.isActive).length;
  const totalSessions = sessions.length;
  const completedSessions = sessions.filter((s: any) => s.status === 'submitted' || s.status === 'graded').length;
  const averageWordsPerSession = sessions.length > 0 ? 
    sessions.reduce((sum: number, s: any) => sum + s.wordCount, 0) / sessions.length : 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <TrendingUp className="h-5 w-5 mr-2" />
            System Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
              <div>
                <p className="text-sm font-medium text-blue-800">User Engagement</p>
                <p className="text-2xl font-bold text-blue-600">
                  {Math.round((activeUsers / totalUsers) * 100)}%
                </p>
              </div>
              <Users className="h-8 w-8 text-blue-600" />
            </div>

            <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
              <div>
                <p className="text-sm font-medium text-green-800">Assignment Completion</p>
                <p className="text-2xl font-bold text-green-600">
                  {Math.round((completedSessions / totalSessions) * 100)}%
                </p>
              </div>
              <FileText className="h-8 w-8 text-green-600" />
            </div>

            <div className="flex items-center justify-between p-4 bg-purple-50 rounded-lg">
              <div>
                <p className="text-sm font-medium text-purple-800">Avg. Words per Assignment</p>
                <p className="text-2xl font-bold text-purple-600">
                  {Math.round(averageWordsPerSession)}
                </p>
              </div>
              <BarChart3 className="h-8 w-8 text-purple-600" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <AlertCircle className="h-5 w-5 mr-2" />
            System Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 border-l-4 border-blue-500 bg-blue-50">
              <h4 className="font-medium text-blue-800">Active Teachers</h4>
              <p className="text-sm text-blue-700">
                {users.filter((u: any) => u.role === 'teacher' && u.isActive).length} teachers are currently active
              </p>
            </div>

            <div className="p-4 border-l-4 border-green-500 bg-green-50">
              <h4 className="font-medium text-green-800">Student Participation</h4>
              <p className="text-sm text-green-700">
                {users.filter((u: any) => u.role === 'student' && u.isActive).length} students are actively participating
              </p>
            </div>

            <div className="p-4 border-l-4 border-purple-500 bg-purple-50">
              <h4 className="font-medium text-purple-800">Classroom Activity</h4>
              <p className="text-sm text-purple-700">
                {classrooms.length} classrooms with {assignments.length} total assignments
              </p>
            </div>

            <div className="p-4 border-l-4 border-orange-500 bg-orange-50">
              <h4 className="font-medium text-orange-800">Writing Progress</h4>
              <p className="text-sm text-orange-700">
                Students have written {sessions.reduce((sum: number, s: any) => sum + s.wordCount, 0).toLocaleString()} total words
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}