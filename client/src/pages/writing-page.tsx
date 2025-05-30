import { useQuery } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Clock, Target } from "lucide-react";
import WritingWorkspace from "@/components/writing-workspace";

export default function WritingPage() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const assignmentId = parseInt(id || "0");

  // Fetch assignment details
  const { data: assignment, isLoading: assignmentLoading } = useQuery({
    queryKey: [`/api/assignments/${assignmentId}`],
    enabled: !!assignmentId,
  });

  // Fetch existing writing session for this assignment
  const { data: userSessions, isLoading: sessionsLoading } = useQuery({
    queryKey: ['/api/student/writing-sessions'],
  });

  // Find session for this specific assignment
  const session = userSessions?.find((s: any) => s.assignmentId === assignmentId);
  
  console.log('Writing page - Assignment ID:', assignmentId);
  console.log('Writing page - Assignment data:', assignment);
  console.log('Writing page - Assignment loading:', assignmentLoading);
  console.log('Writing page - Sessions loading:', sessionsLoading);
  console.log('Writing page - User sessions:', userSessions);
  console.log('Writing page - Found session:', session);

  if (assignmentLoading || sessionsLoading || !assignment) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading assignment...</p>
        </div>
      </div>
    );
  }

  const isOverdue = assignment.dueDate && new Date(assignment.dueDate) < new Date() && session?.status !== 'submitted';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Fixed Navigation Header */}
      <div className="bg-white border-b sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Button 
                variant="outline" 
                size="default"
                onClick={() => setLocation("/student")}
                className="bg-blue-600 text-white hover:bg-blue-700 border-blue-600 font-medium px-4 py-2"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
              
              <div className="border-l border-gray-200 pl-4">
                <h1 className="text-xl font-semibold text-gray-900">
                  {assignment.title}
                </h1>
                <div className="flex items-center space-x-4 text-sm text-gray-500">
                  {assignment.dueDate && (
                    <div className="flex items-center">
                      <Clock className="h-4 w-4 mr-1" />
                      Due {new Date(assignment.dueDate).toLocaleDateString()}
                      {isOverdue && <span className="text-red-600 ml-1">(Overdue)</span>}
                    </div>
                  )}
                  {session && (
                    <div className="flex items-center">
                      <Target className="h-4 w-4 mr-1" />
                      {session.wordCount} words written
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Assignment Details */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Assignment Instructions</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700 mb-4">{assignment.description}</p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="bg-gray-50 p-3 rounded-lg">
                <div className="font-medium text-gray-900">AI Assistance</div>
                <div className="text-gray-600 capitalize">{assignment.aiPermissions}</div>
              </div>
              
              <div className="bg-gray-50 p-3 rounded-lg">
                <div className="font-medium text-gray-900">Copy & Paste</div>
                <div className="text-gray-600">
                  {assignment.allowCopyPaste ? 'Allowed' : 'Not Allowed'}
                </div>
              </div>
              
              <div className="bg-gray-50 p-3 rounded-lg">
                <div className="font-medium text-gray-900">Status</div>
                <div className="text-gray-600 capitalize">
                  {session?.status || 'Not Started'}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Writing Workspace */}
        <WritingWorkspace 
          sessionId={session?.id || 0}
          assignmentId={assignmentId}
          initialSession={session} // Pass the session data directly
        />
      </div>
    </div>
  );
}