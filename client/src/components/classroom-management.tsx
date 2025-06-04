import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Copy, Settings, Eye, MoreHorizontal, ArrowRight, ArrowLeft, FileText, PlusCircle, Calendar, BarChart3, Archive, AlertTriangle, RotateCcw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import ClassroomForm from "./classroom-form";
import AssignmentForm from "./assignment-form";
import GradingInterface from "./grading-interface";
import type { Classroom, Assignment } from "@shared/schema";

interface ClassroomManagementProps {
  teacherId: number;
}

export default function ClassroomManagement({ teacherId }: ClassroomManagementProps) {
  const { toast } = useToast();
  const [selectedClassroom, setSelectedClassroom] = useState<Classroom | null>(null);
  const [activeTab, setActiveTab] = useState<"active" | "archived">("active");
  const queryClient = useQueryClient();

  const { data: classrooms, isLoading } = useQuery<Classroom[]>({
    queryKey: ["/api/teacher/classrooms"],
  });

  const { data: assignments } = useQuery<Assignment[]>({
    queryKey: ["/api/teacher/assignments"],
    enabled: !!teacherId,
  });

  const { data: enrolledStudents } = useQuery<any[]>({
    queryKey: [`/api/teacher/${teacherId}/students`],
    enabled: !!teacherId,
  });

  // Mark assignment complete mutation
  const markCompleteMutation = useMutation({
    mutationFn: async (assignmentId: number) => {
      return apiRequest("POST", `/api/assignments/${assignmentId}/complete`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/teacher/assignments"] });
      toast({
        title: "Assignment Completed",
        description: "Assignment has been marked as completed successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to mark assignment as complete. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Filter assignments for the selected classroom (check both classroomId and classroomIds)
  const classroomAssignments = selectedClassroom 
    ? assignments?.filter(assignment => 
        assignment.classroomId === selectedClassroom.id || 
        (assignment.classroomIds && Array.isArray(assignment.classroomIds) && assignment.classroomIds.includes(selectedClassroom.id))
      ) || []
    : [];

  // Archive/close classroom mutation
  const archiveClassroomMutation = useMutation({
    mutationFn: async (classroomId: number) => {
      const response = await apiRequest("PATCH", `/api/classrooms/${classroomId}`, {
        isActive: false
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Class Archived",
        description: "The class has been archived and is no longer visible to students.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/teacher/classrooms"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to archive the class. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Reactivate classroom mutation
  const reactivateClassroomMutation = useMutation({
    mutationFn: async (classroomId: number) => {
      const response = await apiRequest("PATCH", `/api/classrooms/${classroomId}`, {
        isActive: true
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Class Reactivated",
        description: "The class has been reactivated and is now visible to students.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/teacher/classrooms"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to reactivate the class. Please try again.",
        variant: "destructive",
      });
    },
  });

  const getClassroomStats = (classroom: Classroom) => {
    // Count students enrolled in this specific classroom
    // Need to trim both classroom name and student classroom names for proper matching
    const classroomName = classroom.name.trim();
    const studentsInClass = enrolledStudents?.filter(student => 
      student.classrooms && student.classrooms.some && student.classrooms.some((cls: string) => cls.trim() === classroomName)
    ).length || 0;
    
    return {
      enrolledStudents: studentsInClass,
      activeAssignments: assignments?.filter(a => a.status === 'active' && (a.classroomId === classroom.id || a.classroomId === null)).length || 0,
      pendingSubmissions: 0, // Will be updated when we get real submission data
    };
  };

  const copyJoinCode = (joinCode: string, className: string) => {
    navigator.clipboard.writeText(joinCode);
    toast({
      title: "Join Code Copied!",
      description: `Share code "${joinCode}" with students for ${className}`,
    });
  };

  // Separate active and archived classrooms
  const activeClassrooms = classrooms?.filter(c => c.isActive) || [];
  const archivedClassrooms = classrooms?.filter(c => !c.isActive) || [];

  const renderClassroomCard = (classroom: Classroom) => {
    const stats = getClassroomStats(classroom);
    return (
      <Card key={classroom.id} className={`border-l-4 ${classroom.isActive ? 'border-l-blue-500' : 'border-l-gray-400 opacity-75'}`}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div>
                <CardTitle className="text-lg">{classroom.name}</CardTitle>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline">{classroom.subject}</Badge>
                  {classroom.gradeLevel && (
                    <Badge variant="outline">{classroom.gradeLevel}</Badge>
                  )}
                  {!classroom.isActive && (
                    <Badge variant="secondary" className="bg-gray-100 text-gray-600">
                      <Archive className="h-3 w-3 mr-1" />
                      Archived
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyJoinCode(classroom.joinCode, classroom.name)}
                className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
              >
                <Copy className="h-4 w-4 mr-1" />
                Copy Code
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedClassroom(classroom)}
                className="text-green-600 hover:text-green-700 hover:bg-green-50"
              >
                <Eye className="h-4 w-4 mr-1" />
                View Details
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-blue-600">{stats.enrolledStudents}</div>
              <p className="text-sm text-gray-600">Students</p>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">{stats.activeAssignments}</div>
              <p className="text-sm text-gray-600">Assignments</p>
            </div>
            <div>
              <div className="text-2xl font-bold text-orange-600">{stats.pendingSubmissions}</div>
              <p className="text-sm text-gray-600">Pending</p>
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between">
            <div className="text-sm text-gray-500">
              Join Code: <span className="font-mono font-medium">{classroom.joinCode}</span>
            </div>
            <div className="flex items-center space-x-2">
              {classroom.isActive ? (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => archiveClassroomMutation.mutate(classroom.id)}
                  disabled={archiveClassroomMutation.isPending}
                  className="text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                >
                  <Archive className="h-4 w-4 mr-1" />
                  {archiveClassroomMutation.isPending ? 'Archiving...' : 'Archive'}
                </Button>
              ) : (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => reactivateClassroomMutation.mutate(classroom.id)}
                  disabled={reactivateClassroomMutation.isPending}
                  className="text-green-600 hover:text-green-700 hover:bg-green-50"
                >
                  <RotateCcw className="h-4 w-4 mr-1" />
                  {reactivateClassroomMutation.isPending ? 'Reactivating...' : 'Reactivate'}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">My Classes</h3>
          <p className="text-sm text-gray-600">Manage your classes and share join codes with students</p>
        </div>
        <ClassroomForm teacherId={teacherId}>
          <Button>
            <Users className="h-4 w-4 mr-2" />
            Create New Class
          </Button>
        </ClassroomForm>
      </div>

      {classrooms?.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No classes yet</h3>
            <p className="text-gray-500 mb-6">Create your first class to start organizing your students</p>
            <ClassroomForm teacherId={teacherId}>
              <Button>
                <Users className="h-4 w-4 mr-2" />
                Create Your First Class
              </Button>
            </ClassroomForm>
          </CardContent>
        </Card>
      ) : (
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "active" | "archived")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="active">
              Active Classes ({activeClassrooms.length})
            </TabsTrigger>
            <TabsTrigger value="archived">
              Archived Classes ({archivedClassrooms.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="space-y-4 mt-6">
            {activeClassrooms.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Users className="h-8 w-8 text-gray-300 mx-auto mb-3" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No active classes</h3>
                  <p className="text-gray-500">Create a new class to get started</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-6">
                {activeClassrooms.map(renderClassroomCard)}
              </div>
            )}
          </TabsContent>

          <TabsContent value="archived" className="space-y-4 mt-6">
            {archivedClassrooms.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Archive className="h-8 w-8 text-gray-300 mx-auto mb-3" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No archived classes</h3>
                  <p className="text-gray-500">Archived classes will appear here</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-6">
                {archivedClassrooms.map(renderClassroomCard)}
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}

      {/* Detailed Classroom View */}
      {selectedClassroom && (
        <div className="fixed inset-0 bg-white z-50 overflow-y-auto">
          <div className="max-w-6xl mx-auto p-6">
            {/* Header with back button */}
            <div className="flex items-center gap-4 mb-6">
              <Button 
                variant="outline" 
                onClick={() => setSelectedClassroom(null)}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to All Classes
              </Button>
              <div className="flex-1">
                <h1 className="text-2xl font-bold">{selectedClassroom.name}</h1>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline">{selectedClassroom.subject}</Badge>
                  <Badge variant="outline">{selectedClassroom.gradeLevel}</Badge>
                  <Badge variant="secondary">Join Code: {selectedClassroom.joinCode}</Badge>
                </div>
              </div>
            </div>

            {/* Class description */}
            {selectedClassroom.description && (
              <Card className="mb-6">
                <CardContent className="p-4">
                  <p className="text-gray-700">{selectedClassroom.description}</p>
                </CardContent>
              </Card>
            )}

            {/* Class stats */}
            <div className="grid grid-cols-4 gap-4 mb-6">
              <Card>
                <CardContent className="p-4 text-center">
                  <Users className="h-8 w-8 mx-auto mb-2 text-blue-500" />
                  <div className="text-2xl font-bold">{getClassroomStats(selectedClassroom).enrolledStudents}</div>
                  <p className="text-sm text-gray-600">Students</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <FileText className="h-8 w-8 mx-auto mb-2 text-green-500" />
                  <div className="text-2xl font-bold">{classroomAssignments.length}</div>
                  <p className="text-sm text-gray-600">Assignments</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <Calendar className="h-8 w-8 mx-auto mb-2 text-orange-500" />
                  <div className="text-2xl font-bold">
                    {classroomAssignments.filter(a => a.status === 'active').length}
                  </div>
                  <p className="text-sm text-gray-600">Active</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <BarChart3 className="h-8 w-8 mx-auto mb-2 text-purple-500" />
                  <div className="text-2xl font-bold">
                    {getClassroomStats(selectedClassroom).pendingSubmissions}
                  </div>
                  <p className="text-sm text-gray-600">Pending Reviews</p>
                </CardContent>
              </Card>
            </div>

            {/* Assignments Section */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">Assignments</h2>
                <AssignmentForm teacherId={teacherId} initialClassrooms={[selectedClassroom]}>
                  <Button>
                    <PlusCircle className="h-4 w-4 mr-2" />
                    New Assignment
                  </Button>
                </AssignmentForm>
              </div>

              {classroomAssignments.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No assignments yet</h3>
                    <p className="text-gray-500 mb-4">Create your first assignment for this class</p>
                    <AssignmentForm teacherId={teacherId} initialClassrooms={[selectedClassroom]}>
                      <Button>
                        <PlusCircle className="h-4 w-4 mr-2" />
                        Create Assignment
                      </Button>
                    </AssignmentForm>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {classroomAssignments.map((assignment) => (
                    <Card key={assignment.id} className="border-l-4 border-l-blue-500">
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle className="text-lg">{assignment.title}</CardTitle>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant={assignment.status === 'active' ? 'default' : 'secondary'}>
                                {assignment.status}
                              </Badge>
                              {assignment.dueDate && (
                                <Badge variant="outline">
                                  Due: {new Date(assignment.dueDate).toLocaleDateString()}
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => {
                                // Navigate to submissions page for this assignment
                                window.location.href = `/teacher/submissions/${assignment.id}`;
                              }}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              View Submissions
                            </Button>
                            {assignment.status === 'active' && selectedClassroom?.isActive && (
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => markCompleteMutation.mutate(assignment.id)}
                                disabled={markCompleteMutation.isPending}
                                className="text-green-600 hover:text-green-700"
                              >
                                <FileText className="h-4 w-4 mr-1" />
                                Mark Complete
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardHeader>
                      {assignment.description && (
                        <CardContent>
                          <p className="text-gray-600">{assignment.description}</p>
                        </CardContent>
                      )}
                    </Card>
                  ))}
                </div>
              )}
            </div>

            {/* Grading Interface */}
            <GradingInterface teacherId={teacherId} />
          </div>
        </div>
      )}
    </div>
  );
}