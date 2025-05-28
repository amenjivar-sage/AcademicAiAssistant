import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, Copy, Settings, Eye, MoreHorizontal } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import ClassroomForm from "./classroom-form";
import type { Classroom } from "@shared/schema";

interface ClassroomManagementProps {
  teacherId: number;
}

export default function ClassroomManagement({ teacherId }: ClassroomManagementProps) {
  const { toast } = useToast();

  const { data: classrooms, isLoading, error } = useQuery<Classroom[]>({
    queryKey: [`/api/teacher/${teacherId}/classrooms`],
    queryFn: async () => {
      const response = await fetch(`/api/teacher/${teacherId}/classrooms`, {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error('Failed to fetch classrooms');
      }
      const data = await response.json();
      console.log("Raw classroom API response:", data);
      return data;
    },
  });

  // Debug logging
  console.log("Classroom data:", classrooms);
  console.log("Is loading:", isLoading);
  console.log("Error:", error);
  console.log("Classroom count:", classrooms?.length);

  const copyJoinCode = (joinCode: string, className: string) => {
    navigator.clipboard.writeText(joinCode);
    toast({
      title: "Join Code Copied!",
      description: `Share code "${joinCode}" with students for ${className}`,
    });
  };

  const getClassroomStats = (classroom: Classroom) => {
    // In real implementation, these would come from the API
    return {
      enrolledStudents: Math.floor(Math.random() * classroom.classSize!),
      activeAssignments: Math.floor(Math.random() * 5) + 1,
      pendingSubmissions: Math.floor(Math.random() * 10),
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
              <Card key={classroom.id} className="border-l-4 border-l-blue-500">
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
                        <div className="text-lg font-bold text-blue-600">{stats.enrolledStudents}</div>
                        <p className="text-xs text-gray-600">Students Enrolled</p>
                      </div>
                      <div className="text-center p-3 bg-green-50 rounded-lg">
                        <div className="text-lg font-bold text-green-600">{stats.activeAssignments}</div>
                        <p className="text-xs text-gray-600">Active Assignments</p>
                      </div>
                      <div className="text-center p-3 bg-orange-50 rounded-lg">
                        <div className="text-lg font-bold text-orange-600">{stats.pendingSubmissions}</div>
                        <p className="text-xs text-gray-600">Pending Reviews</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t">
                      <div className="text-sm text-gray-500">
                        Created {new Date(classroom.createdAt).toLocaleDateString()}
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm">
                          <Eye className="h-4 w-4 mr-1" />
                          View Students
                        </Button>
                        <ClassroomForm teacherId={teacherId} classroom={classroom} mode="edit">
                          <Button variant="outline" size="sm">
                            <Settings className="h-4 w-4 mr-1" />
                            Edit
                          </Button>
                        </ClassroomForm>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}