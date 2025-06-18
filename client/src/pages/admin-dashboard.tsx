import AdminUserManagement from "@/components/admin-user-management";
import StudentAnalyticsManagement from "@/components/student-analytics-management";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Shield, Users, TrendingUp, Clock, BookOpen, Brain, Target, Award, Settings, LogOut, BarChart3, MessageSquare, Bug, Lightbulb, Star, CheckCircle, AlertTriangle } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import SageLogo from "@/components/sage-logo";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { useState } from "react";
import type { Feedback } from "@shared/schema";

export default function AdminDashboard() {
  const [selectedTab, setSelectedTab] = useState("all");
  const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(null);
  const [adminResponse, setAdminResponse] = useState("");
  const [statusUpdate, setStatusUpdate] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

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

  // Fetch all feedback
  const { data: feedback = [], isLoading: feedbackLoading } = useQuery({
    queryKey: ["/api/feedback"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/feedback");
      return response.json();
    },
  });

  // Fetch feedback statistics
  const { data: feedbackStats } = useQuery({
    queryKey: ["/api/admin/feedback-stats"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/admin/feedback-stats");
      return response.json();
    },
  });

  // Update feedback mutation
  const updateFeedback = useMutation({
    mutationFn: async ({ id, updates }: { id: number; updates: any }) => {
      const response = await apiRequest("PATCH", `/api/feedback/${id}`, updates);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Feedback Updated",
        description: "The feedback has been successfully updated.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/feedback"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/feedback-stats"] });
      setSelectedFeedback(null);
      setAdminResponse("");
      setStatusUpdate("");
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update feedback.",
        variant: "destructive",
      });
    },
  });

  const handleResponseSubmit = () => {
    if (!selectedFeedback || (!adminResponse && !statusUpdate)) return;

    const updates: any = {};
    if (adminResponse) updates.adminResponse = adminResponse;
    if (statusUpdate) updates.status = statusUpdate;

    updateFeedback.mutate({ id: selectedFeedback.id, updates });
  };

  const getFeedbackIcon = (type: string) => {
    switch (type) {
      case 'bug': return <Bug className="h-4 w-4 text-red-500" />;
      case 'feature': return <Lightbulb className="h-4 w-4 text-yellow-500" />;
      case 'assignment': return <Star className="h-4 w-4 text-blue-500" />;
      default: return <MessageSquare className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'open':
        return <Badge variant="outline" className="text-orange-600 border-orange-600">Open</Badge>;
      case 'in_progress':
        return <Badge variant="outline" className="text-blue-600 border-blue-600">In Progress</Badge>;
      case 'resolved':
        return <Badge variant="outline" className="text-green-600 border-green-600">Resolved</Badge>;
      case 'closed':
        return <Badge variant="outline" className="text-gray-600 border-gray-600">Closed</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'high':
        return <Badge variant="destructive">High Priority</Badge>;
      case 'medium':
        return <Badge variant="outline" className="text-yellow-600 border-yellow-600">Medium Priority</Badge>;
      case 'low':
        return <Badge variant="outline" className="text-green-600 border-green-600">Low Priority</Badge>;
      default:
        return <Badge variant="outline">Normal</Badge>;
    }
  };

  const filteredFeedback = feedback.filter((item: Feedback) => {
    if (selectedTab === "all") return true;
    if (selectedTab === "open") return item.status === "open";
    if (selectedTab === "in_progress") return item.status === "in_progress";
    if (selectedTab === "resolved") return item.status === "resolved";
    return item.type === selectedTab;
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

        {/* Management Sections */}
        <Tabs defaultValue="users" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              User Management
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Student Analytics
            </TabsTrigger>
            <TabsTrigger value="feedback" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              User Feedback
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users">
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
          </TabsContent>

          <TabsContent value="analytics">
            <StudentAnalyticsManagement />
          </TabsContent>

          <TabsContent value="feedback">
            <div className="space-y-6">
              {/* Feedback Statistics */}
              {feedbackStats && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center">
                        <BarChart3 className="h-8 w-8 text-blue-600" />
                        <div className="ml-4">
                          <p className="text-sm font-medium text-gray-600">Total Feedback</p>
                          <p className="text-2xl font-bold text-gray-900">{feedbackStats.total}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center">
                        <Clock className="h-8 w-8 text-orange-600" />
                        <div className="ml-4">
                          <p className="text-sm font-medium text-gray-600">Open Issues</p>
                          <p className="text-2xl font-bold text-gray-900">{feedbackStats.open}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center">
                        <AlertTriangle className="h-8 w-8 text-red-600" />
                        <div className="ml-4">
                          <p className="text-sm font-medium text-gray-600">High Priority</p>
                          <p className="text-2xl font-bold text-gray-900">{feedbackStats.byPriority?.high || 0}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center">
                        <CheckCircle className="h-8 w-8 text-green-600" />
                        <div className="ml-4">
                          <p className="text-sm font-medium text-gray-600">Resolved</p>
                          <p className="text-2xl font-bold text-gray-900">{feedbackStats.resolved}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Feedback Management */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5" />
                    User Feedback Management
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Tabs value={selectedTab} onValueChange={setSelectedTab}>
                    <TabsList className="grid w-full grid-cols-7">
                      <TabsTrigger value="all">All ({feedback.length})</TabsTrigger>
                      <TabsTrigger value="open">Open ({feedbackStats?.open || 0})</TabsTrigger>
                      <TabsTrigger value="in_progress">In Progress ({feedbackStats?.inProgress || 0})</TabsTrigger>
                      <TabsTrigger value="resolved">Resolved ({feedbackStats?.resolved || 0})</TabsTrigger>
                      <TabsTrigger value="bug">Bugs ({feedbackStats?.byType?.bug || 0})</TabsTrigger>
                      <TabsTrigger value="feature">Features ({feedbackStats?.byType?.feature || 0})</TabsTrigger>
                      <TabsTrigger value="general">General ({feedbackStats?.byType?.general || 0})</TabsTrigger>
                    </TabsList>

                    <TabsContent value={selectedTab} className="mt-6">
                      {feedbackLoading ? (
                        <div className="space-y-4">
                          {[...Array(3)].map((_, i) => (
                            <div key={i} className="animate-pulse p-6 bg-gray-100 rounded-lg">
                              <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
                              <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                            </div>
                          ))}
                        </div>
                      ) : filteredFeedback.length === 0 ? (
                        <div className="p-12 text-center">
                          <MessageSquare className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                          <h3 className="text-lg font-medium text-gray-900 mb-2">No feedback found</h3>
                          <p className="text-gray-500">No feedback matches the current filter criteria.</p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {filteredFeedback.map((item: Feedback) => (
                            <Card key={item.id} className="hover:shadow-md transition-shadow">
                              <CardContent className="p-6">
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <div className="flex items-center space-x-3 mb-2">
                                      {getFeedbackIcon(item.type)}
                                      <h3 className="text-lg font-semibold text-gray-900">{item.title}</h3>
                                      {getStatusBadge(item.status)}
                                      {getPriorityBadge(item.priority)}
                                      {item.rating && (
                                        <div className="flex items-center">
                                          <Star className="h-4 w-4 text-yellow-500 mr-1" />
                                          <span className="text-sm text-gray-600">{item.rating}/5</span>
                                        </div>
                                      )}
                                    </div>
                                    
                                    <p className="text-gray-600 mb-3 line-clamp-2">{item.description}</p>
                                    
                                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                                      <span>Type: {item.type}</span>
                                      {item.category && <span>Category: {item.category}</span>}
                                      <span>Created: {format(new Date(item.createdAt), "MMM d, yyyy")}</span>
                                      <span>User ID: {item.userId}</span>
                                    </div>

                                    {item.adminResponse && (
                                      <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                                        <h4 className="font-medium text-blue-900 mb-2">Admin Response:</h4>
                                        <p className="text-blue-800">{item.adminResponse}</p>
                                        {item.adminResponseAt && (
                                          <p className="text-sm text-blue-600 mt-2">
                                            Responded: {format(new Date(item.adminResponseAt), "MMM d, yyyy 'at' h:mm a")}
                                          </p>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                  
                                  <div className="ml-6">
                                    <Dialog>
                                      <DialogTrigger asChild>
                                        <Button 
                                          variant="outline" 
                                          size="sm"
                                          onClick={() => {
                                            setSelectedFeedback(item);
                                            setAdminResponse(item.adminResponse || "");
                                            setStatusUpdate(item.status);
                                          }}
                                        >
                                          Respond
                                        </Button>
                                      </DialogTrigger>
                                      <DialogContent className="max-w-2xl">
                                        <DialogHeader>
                                          <DialogTitle className="flex items-center gap-2">
                                            {getFeedbackIcon(item.type)}
                                            Respond to Feedback
                                          </DialogTitle>
                                        </DialogHeader>
                                        
                                        <div className="space-y-6">
                                          {/* Feedback Details */}
                                          <div className="p-4 bg-gray-50 rounded-lg">
                                            <h3 className="font-semibold text-gray-900 mb-2">{item.title}</h3>
                                            <p className="text-gray-700 mb-3">{item.description}</p>
                                            <div className="flex items-center space-x-4 text-sm text-gray-500">
                                              <span>Type: {item.type}</span>
                                              {item.category && <span>Category: {item.category}</span>}
                                              {item.rating && <span>Rating: {item.rating}/5 stars</span>}
                                            </div>
                                          </div>

                                          {/* Status Update */}
                                          <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                              Update Status
                                            </label>
                                            <Select value={statusUpdate} onValueChange={setStatusUpdate}>
                                              <SelectTrigger>
                                                <SelectValue placeholder="Select status" />
                                              </SelectTrigger>
                                              <SelectContent>
                                                <SelectItem value="open">Open</SelectItem>
                                                <SelectItem value="in_progress">In Progress</SelectItem>
                                                <SelectItem value="resolved">Resolved</SelectItem>
                                                <SelectItem value="closed">Closed</SelectItem>
                                              </SelectContent>
                                            </Select>
                                          </div>

                                          {/* Admin Response */}
                                          <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                              Admin Response
                                            </label>
                                            <Textarea
                                              value={adminResponse}
                                              onChange={(e) => setAdminResponse(e.target.value)}
                                              placeholder="Provide a response to the user..."
                                              className="min-h-[120px]"
                                            />
                                          </div>

                                          {/* Actions */}
                                          <div className="flex justify-end space-x-3">
                                            <Button 
                                              variant="outline" 
                                              onClick={() => setSelectedFeedback(null)}
                                            >
                                              Cancel
                                            </Button>
                                            <Button 
                                              onClick={handleResponseSubmit}
                                              disabled={updateFeedback.isPending || (!adminResponse && statusUpdate === item.status)}
                                            >
                                              {updateFeedback.isPending ? "Updating..." : "Update Feedback"}
                                            </Button>
                                          </div>
                                        </div>
                                      </DialogContent>
                                    </Dialog>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      )}
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}