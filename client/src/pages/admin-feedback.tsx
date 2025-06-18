import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { MessageSquare, Bug, Lightbulb, Star, Clock, CheckCircle, AlertTriangle, Users, BarChart3 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";
import type { Feedback } from "@shared/schema";

export default function AdminFeedback() {
  const [selectedTab, setSelectedTab] = useState("all");
  const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(null);
  const [adminResponse, setAdminResponse] = useState("");
  const [statusUpdate, setStatusUpdate] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all feedback
  const { data: feedback = [], isLoading } = useQuery({
    queryKey: ["/api/feedback"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/feedback");
      return response.json();
    },
  });

  // Fetch feedback statistics
  const { data: stats } = useQuery({
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

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Feedback Management</h1>
        <p className="text-gray-600 mt-2">Manage and respond to user feedback across the platform</p>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <BarChart3 className="h-8 w-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Feedback</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
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
                  <p className="text-2xl font-bold text-gray-900">{stats.open}</p>
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
                  <p className="text-2xl font-bold text-gray-900">{stats.byPriority?.high || 0}</p>
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
                  <p className="text-2xl font-bold text-gray-900">{stats.resolved}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Feedback Tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="all">All ({feedback.length})</TabsTrigger>
          <TabsTrigger value="open">Open ({stats?.open || 0})</TabsTrigger>
          <TabsTrigger value="in_progress">In Progress ({stats?.inProgress || 0})</TabsTrigger>
          <TabsTrigger value="resolved">Resolved ({stats?.resolved || 0})</TabsTrigger>
          <TabsTrigger value="bug">Bugs ({stats?.byType?.bug || 0})</TabsTrigger>
          <TabsTrigger value="feature">Features ({stats?.byType?.feature || 0})</TabsTrigger>
          <TabsTrigger value="general">General ({stats?.byType?.general || 0})</TabsTrigger>
        </TabsList>

        <TabsContent value={selectedTab} className="mt-6">
          {filteredFeedback.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <MessageSquare className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No feedback found</h3>
                <p className="text-gray-500">No feedback matches the current filter criteria.</p>
              </CardContent>
            </Card>
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
    </div>
  );
}