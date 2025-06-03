import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, Copy, Settings, Eye, MoreHorizontal, ArrowRight, ArrowLeft, FileText, PlusCircle, Calendar, BarChart3, Archive, AlertTriangle } from "lucide-react";
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
  const queryClient = useQueryClient();

  const { data: classrooms, isLoading } = useQuery<Classroom[]>({
    queryKey: ["/api/teacher/classrooms"],
  });

  // Get assignments for the selected classroom
  const { data: assignments } = useQuery<Assignment[]>({
    queryKey: ["/api/teacher/assignments"],
  });

  // Get enrolled students for the teacher
  const { data: enrolledStudents } = useQuery<Array<{
    id: number;
    name: string;
    email: string;
    classrooms: string[];
  }>>({
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

  // Filter assignments for the selected classroom (include both classroom-specific and general assignments)
  const classroomAssignments = selectedClassroom 
    ? assignments?.filter(assignment => 
        assignment.classroomId === selectedClassroom.id || assignment.classroomId === null
      ) || []
    : [];

  // Debug logging
  console.log("Classroom data:", classrooms);
  console.log("Is loading:", isLoading);
  console.log("Classroom count:", classrooms?.length);

  const copyJoinCode = (joinCode: string, className: string) => {
    navigator.clipboard.writeText(joinCode);
    toast({
      title: "Join Code Copied!",
      description: `Share code "${joinCode}" with students for ${className}`,
    });
  };

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
        description: "The class is now active and visible to students again.",
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
      student.classrooms && student.classrooms.some(cls => cls.trim() === classroomName)
    ).length || 0;
    
    return {
      enrolledStudents: studentsInClass,
      activeAssignments: assignments?.filter(a => a.status === 'active' && (a.classroomId === classroom.id || a.classroomId === null)).length || 0,
      pendingSubmissions: 0, // Will be updated when we get real submission data
    };
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
        <div className="grid gap-6">
          {classrooms?.map((classroom) => {
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
                      <div className="text-right">
                        <div className="text-2xl font-bold text-blue-600">{classroom.joinCode}</div>
                        <p className="text-xs text-gray-500">Join Code</p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyJoinCode(classroom.joinCode, classroom.name)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {classroom.description && (
                      <p className="text-gray-600 text-sm">{classroom.description}</p>
                    )}
                    
                    <div className="grid grid-cols-3 gap-4">
                      <div className="text-center p-3 bg-blue-50 rounded-lg">
                        <div className="text-lg font-bold text-blue-600">{stats.enrolledStudents || 0}</div>
                        <p className="text-xs text-gray-600">Students Enrolled</p>
                      </div>
                      <div className="text-center p-3 bg-green-50 rounded-lg">
                        <div className="text-lg font-bold text-green-600">{stats.activeAssignments || 0}</div>
                        <p className="text-xs text-gray-600">Active Assignments</p>
                      </div>
                      <div className="text-center p-3 bg-orange-50 rounded-lg">
                        <div className="text-lg font-bold text-orange-600">{stats.pendingSubmissions || 0}</div>
                        <p className="text-xs text-gray-600">Pending Reviews</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t">
                      <div className="text-sm text-gray-500">
                        Created {new Date(classroom.createdAt).toLocaleDateString()}
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setSelectedClassroom(classroom)}
                        >
                          <ArrowRight className="h-4 w-4 mr-1" />
                          View Class
                        </Button>
                        <ClassroomForm teacherId={teacherId} classroom={classroom} mode="edit">
                          <Button variant="outline" size="sm">
                            <Settings className="h-4 w-4 mr-1" />
                            Edit
                          </Button>
                        </ClassroomForm>
                        {classroom.isActive ? (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => archiveClassroomMutation.mutate(classroom.id)}
                            disabled={archiveClassroomMutation.isPending}
                            className="text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                          >
                            <Archive className="h-4 w-4 mr-1" />
                            Archive
                          </Button>
                        ) : (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => reactivateClassroomMutation.mutate(classroom.id)}
                            disabled={reactivateClassroomMutation.isPending}
                            className="text-green-600 hover:text-green-700 hover:bg-green-50"
                          >
                            <Archive className="h-4 w-4 mr-1" />
                            Reactivate
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
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
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">Class Assignments</h2>
                <AssignmentForm teacherId={teacherId} classroomId={selectedClassroom.id}>
                  <Button>
                    <PlusCircle className="h-4 w-4 mr-2" />
                    Create Assignment for {selectedClassroom.name}
                  </Button>
                </AssignmentForm>
              </div>

              {classroomAssignments.length === 0 ? (
                <Card>
                  <CardContent className="p-12 text-center">
                    <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No assignments yet</h3>
                    <p className="text-gray-500 mb-6">Create your first assignment for this class</p>
                    <AssignmentForm teacherId={teacherId} classroomId={selectedClassroom.id}>
                      <Button>
                        <PlusCircle className="h-4 w-4 mr-2" />
                        Create First Assignment
                      </Button>
                    </AssignmentForm>
                  </CardContent>
                </Card>
              ) : (
                <div className="flex flex-col gap-4">
                  {classroomAssignments.map((assignment) => (
                    <Card key={assignment.id} className="border-l-4 border-l-blue-500">
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle className="text-lg">{assignment.title}</CardTitle>
                            <p className="text-gray-600 mt-1">{assignment.description}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge 
                              variant={assignment.status === 'active' ? 'default' : 
                                     assignment.status === 'completed' ? 'secondary' : 'destructive'}
                            >
                              {assignment.status.charAt(0).toUpperCase() + assignment.status.slice(1)}
                            </Badge>
                            <Badge variant="outline">
                              AI: {assignment.aiPermissions}
                            </Badge>
                            {assignment.dueDate && (
                              <Badge variant="outline">
                                Due: {new Date(assignment.dueDate).toLocaleDateString()}
                              </Badge>
                            )}
                          </div>
                        </div>
                        
                        {/* AI Permissions Details */}
                        <div className="mt-3 flex flex-wrap gap-2">
                          {assignment.allowBrainstorming && (
                            <Badge variant="secondary" className="text-xs">Brainstorming</Badge>
                          )}
                          {assignment.allowOutlining && (
                            <Badge variant="secondary" className="text-xs">Outlining</Badge>
                          )}
                          {assignment.allowGrammarCheck && (
                            <Badge variant="secondary" className="text-xs">Grammar Check</Badge>
                          )}
                          {assignment.allowResearchHelp && (
                            <Badge variant="secondary" className="text-xs">Research Help</Badge>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center justify-between">
                          <div className="text-sm text-gray-500">
                            Created {new Date(assignment.createdAt).toLocaleDateString()}
                          </div>
                          <div className="flex gap-2">
                            {assignment.status === 'active' && (
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => markCompleteMutation.mutate(assignment.id)}
                                disabled={markCompleteMutation.isPending}
                                className="text-green-600 hover:text-green-700"
                              >
                                Mark Complete
                              </Button>
                            )}
                            <GradingInterface assignmentId={assignment.id}>
                              <Button variant="outline" size="sm">
                                Grade
                              </Button>
                            </GradingInterface>
                            <AssignmentForm teacherId={teacherId} assignment={assignment} mode="edit">
                              <Button variant="outline" size="sm">
                                <Settings className="h-4 w-4 mr-1" />
                                Edit
                              </Button>
                            </AssignmentForm>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}