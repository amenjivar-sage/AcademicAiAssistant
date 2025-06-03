import AdminUserManagement from "@/components/admin-user-management";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Shield, Users, TrendingUp, Clock, BookOpen, Brain, Target, Award, Settings, LogOut } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import SageLogo from "@/components/sage-logo";

export default function AdminDashboard() {
  // Fetch analytics data
  const { data: analytics, isLoading } = useQuery({
    queryKey: ['/api/admin/analytics'],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/admin/analytics");
      return response.json();
    },
  });

  const { data: userStats } = useQuery({
    queryKey: ['/api/admin/user-stats'],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/admin/user-stats");
      return response.json();
    },
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Admin Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm border">
                <SageLogo size={24} className="text-red-600" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">Sage Admin Portal</h1>
                <p className="text-sm text-gray-500">Educational Impact Analytics</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Badge variant="destructive" className="bg-red-600">
                <Shield className="h-3 w-3 mr-1" />
                Administrator
              </Badge>
              <Button 
                variant="outline" 
                onClick={() => window.location.href = '/api/logout'}
                className="flex items-center gap-2"
              >
                <LogOut className="h-4 w-4" />
                Log Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Educational Impact Overview */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Educational Impact Analytics</h2>
          <p className="text-gray-600">Real-time insights demonstrating platform efficacy and student learning outcomes</p>
        </div>

        {/* Key Performance Indicators */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Student Writing Growth</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                +{analytics?.averageWordGrowth || 0}%
              </div>
              <p className="text-xs text-muted-foreground">
                Average word count increase per assignment
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">AI Learning Assistance</CardTitle>
              <Brain className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {analytics?.totalAiInteractions || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                Ethical AI interactions this week
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Teacher Efficiency</CardTitle>
              <Clock className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">
                {analytics?.averageGradingTime || 0}h
              </div>
              <p className="text-xs text-muted-foreground">
                Average grading turnaround time
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Assignment Completion</CardTitle>
              <Target className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {analytics?.completionRate || 0}%
              </div>
              <p className="text-xs text-muted-foreground">
                On-time submission rate
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Analytics Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Student Learning Metrics */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-blue-600" />
                Student Learning Analytics
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {analytics?.activeStudents || 0}
                  </div>
                  <div className="text-sm text-blue-700">Active Students</div>
                </div>
                <div className="p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {analytics?.averageSessionTime || 0}m
                  </div>
                  <div className="text-sm text-green-700">Avg. Writing Time</div>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Writing Improvement Rate</span>
                  <span className="font-medium text-green-600">+{analytics?.improvementRate || 0}%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>AI Assistance Compliance</span>
                  <span className="font-medium text-blue-600">{analytics?.aiCompliance || 0}%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Original Content Ratio</span>
                  <span className="font-medium text-purple-600">{analytics?.originalContentRatio || 0}%</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Teacher Productivity */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5 text-purple-600" />
                Teacher Productivity Metrics
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-purple-50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">
                    {analytics?.activeTeachers || 0}
                  </div>
                  <div className="text-sm text-purple-700">Active Teachers</div>
                </div>
                <div className="p-4 bg-orange-50 rounded-lg">
                  <div className="text-2xl font-bold text-orange-600">
                    {analytics?.totalAssignments || 0}
                  </div>
                  <div className="text-sm text-orange-700">Assignments Created</div>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Feedback Response Time</span>
                  <span className="font-medium text-purple-600">{analytics?.feedbackTime || 0}h</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Grading Efficiency</span>
                  <span className="font-medium text-green-600">+{analytics?.gradingEfficiency || 0}%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>AI Permission Usage</span>
                  <span className="font-medium text-blue-600">{analytics?.aiPermissionUsage || 0}%</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Platform Usage Analytics */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-gray-600" />
              Platform Usage & Engagement
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-3xl font-bold text-blue-700 mb-2">
                  {analytics?.totalAssignments || 0}
                </div>
                <div className="text-sm text-blue-600">Total Assignments Created</div>
                <div className="text-xs text-blue-500 mt-1">
                  Real assignments created by teachers
                </div>
              </div>
              
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-3xl font-bold text-green-700 mb-2">
                  {analytics?.averageWordGrowth || 0}
                </div>
                <div className="text-sm text-green-600">Average Words Per Session</div>
                <div className="text-xs text-green-500 mt-1">
                  From actual student writing sessions
                </div>
              </div>
              
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <div className="text-3xl font-bold text-purple-700 mb-2">
                  {analytics?.totalAiInteractions || 0}
                </div>
                <div className="text-sm text-purple-600">AI Assistance Interactions</div>
                <div className="text-xs text-purple-500 mt-1">
                  Real AI help requests from students
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* User Management Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              School User Management
            </CardTitle>
            <p className="text-gray-600">
              Manage teacher and student accounts using any email provider - Gmail, Outlook, Yahoo, or school domains. 
              Usernames are intelligently generated to handle duplicate names automatically.
            </p>
          </CardHeader>
          <CardContent>
            <AdminUserManagement />
          </CardContent>
        </Card>
      </main>
    </div>
  );
}