import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AssignmentForm from "@/components/assignment-form";
import { PlusCircle, Users, FileText, BarChart3, Settings, Eye } from "lucide-react";
import type { Assignment, WritingSession } from "@shared/schema";

export default function TeacherDashboard() {
  const [activeTab, setActiveTab] = useState("assignments");

  // Get teacher's assignments
  const { data: assignments, isLoading: assignmentsLoading } = useQuery<Assignment[]>({
    queryKey: ["/api/teacher/assignments"],
  });

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
              <div className="w-10 h-10 bg-edu-blue rounded-lg flex items-center justify-center">
                <FileText className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-edu-neutral">Sage Teacher Portal</h1>
                <p className="text-sm text-gray-500">Welcome, Prof. Johnson</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <AssignmentForm teacherId={1}>
                <Button className="bg-edu-blue hover:bg-blue-700">
                  <PlusCircle className="h-4 w-4 mr-2" />
                  New Assignment
                </Button>
              </AssignmentForm>
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
                  <p className="text-2xl font-bold text-gray-900">{assignments?.length || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Users className="h-8 w-8 text-edu-success" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Students Enrolled</p>
                  <p className="text-2xl font-bold text-gray-900">24</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <BarChart3 className="h-8 w-8 text-edu-warning" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Submissions Pending</p>
                  <p className="text-2xl font-bold text-gray-900">8</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Settings className="h-8 w-8 text-edu-neutral" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">AI Interactions</p>
                  <p className="text-2xl font-bold text-gray-900">156</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="assignments">Assignments</TabsTrigger>
            <TabsTrigger value="submissions">Submissions</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="assignments" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">Assignments</h2>
              <AssignmentForm teacherId={1}>
                <Button className="bg-edu-blue hover:bg-blue-700">
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Create Assignment
                </Button>
              </AssignmentForm>
            </div>
            
            <div className="grid gap-6">
              {assignments?.map((assignment) => (
                <Card key={assignment.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{assignment.title}</CardTitle>
                      <div className="flex items-center space-x-2">
                        <Badge variant={assignment.aiPermissions === "full" ? "default" : "secondary"}>
                          AI: {assignment.aiPermissions}
                        </Badge>
                        <Button variant="outline" size="sm">
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600 mb-4">{assignment.description}</p>
                    <div className="flex items-center justify-between text-sm text-gray-500">
                      <span>Created: {new Date(assignment.createdAt).toLocaleDateString()}</span>
                      <span>Due: {assignment.dueDate ? new Date(assignment.dueDate).toLocaleDateString() : "No due date"}</span>
                    </div>
                  </CardContent>
                </Card>
              )) || (
                <Card>
                  <CardContent className="p-12 text-center">
                    <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No assignments yet</h3>
                    <p className="text-gray-500 mb-6">Create your first assignment to get started with ZOEEDU.</p>
                    <AssignmentForm teacherId={1}>
                      <Button className="bg-edu-blue hover:bg-blue-700">
                        <PlusCircle className="h-4 w-4 mr-2" />
                        Create Your First Assignment
                      </Button>
                    </AssignmentForm>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="submissions" className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">Student Submissions</h2>
            <Card>
              <CardContent className="p-12 text-center">
                <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No submissions yet</h3>
                <p className="text-gray-500">Student submissions will appear here once assignments are created.</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">AI Usage Analytics</h2>
            <Card>
              <CardContent className="p-12 text-center">
                <BarChart3 className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Analytics Dashboard</h3>
                <p className="text-gray-500">View student AI interaction patterns and learning progress.</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">AI Controls & Settings</h2>
            <Card>
              <CardContent className="p-12 text-center">
                <Settings className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">AI Permission Settings</h3>
                <p className="text-gray-500">Configure AI assistance levels and restrictions for your assignments.</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}