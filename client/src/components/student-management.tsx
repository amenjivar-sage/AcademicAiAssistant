import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { 
  Users, 
  Search, 
  MessageSquare, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  Clock, 
  CheckCircle,
  Award,
  Target,
  BookOpen,
  BarChart3
} from "lucide-react";
import MessagingSystem from "./messaging-system";

interface StudentManagementProps {
  teacherId: number;
}

function StudentManagement({ teacherId }: StudentManagementProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedClass, setSelectedClass] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // Get classrooms for filter dropdown
  const { data: classrooms } = useQuery({
    queryKey: ["/api/teacher/classrooms"],
  });

  // Get students from API instead of using demo data
  const { data: studentData } = useQuery({
    queryKey: [`/api/teacher/1/students`],
  });

  const students = studentData || [];

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

  const filteredStudents = students.filter((student: any) => {
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
            <div className="text-2xl font-bold">{students.length}</div>
            <p className="text-sm text-gray-600">Total Students</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
            <div className="text-2xl font-bold">0</div>
            <p className="text-sm text-gray-600">On Track</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <TrendingUp className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
            <div className="text-2xl font-bold">0</div>
            <p className="text-sm text-gray-600">Improving</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <AlertTriangle className="h-8 w-8 text-orange-500 mx-auto mb-2" />
            <div className="text-2xl font-bold">0</div>
            <p className="text-sm text-gray-600">Needs Attention</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <Clock className="h-8 w-8 text-red-500 mx-auto mb-2" />
            <div className="text-2xl font-bold">0</div>
            <p className="text-sm text-gray-600">At Risk</p>
          </CardContent>
        </Card>
      </div>

      {/* Student Management Card */}
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
                {classrooms?.map((classroom: any) => (
                  <SelectItem key={classroom.id} value={classroom.id.toString()}>
                    {classroom.name}
                  </SelectItem>
                ))}
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
          {filteredStudents.length > 0 ? (
            <div className="space-y-4">
              {filteredStudents.map((student: any) => (
                <Card key={student.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <Avatar>
                          <AvatarFallback>{student.avatar || student.name?.charAt(0) || 'S'}</AvatarFallback>
                        </Avatar>
                        
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium">{student.name}</h3>
                            <Badge 
                              variant="outline" 
                              className={`text-xs ${getStatusColor(student.status || 'active')}`}
                            >
                              {getStatusIcon(student.status || 'active')}
                              <span className="ml-1 capitalize">{student.status || 'Active'}</span>
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600">{student.email}</p>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <div className="flex gap-2">
                          <MessagingSystem 
                            currentUserId={teacherId} 
                            currentUserRole="teacher"
                            recipientId={student.id}
                            recipientName={student.name}
                          >
                            <Button variant="outline" size="sm">
                              <MessageSquare className="h-4 w-4 mr-1" />
                              Message
                            </Button>
                          </MessagingSystem>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No students found</h3>
              <p className="text-gray-500">
                {students.length === 0 
                  ? "No students have been added to your classes yet." 
                  : "No students match your current filters."}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default StudentManagement;