import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  Eye, 
  User, 
  Calendar, 
  MessageSquare, 
  Copy, 
  Bot, 
  GraduationCap,
  FileText,
  Clock,
  CheckCircle
} from "lucide-react";

interface SubmissionViewerProps {
  sessionId: number;
  onClose: () => void;
}

export default function SubmissionViewer({ sessionId, onClose }: SubmissionViewerProps) {
  // Get writing session details
  const { data: session, isLoading: sessionLoading } = useQuery({
    queryKey: [`/api/writing-sessions/${sessionId}`],
  });

  // Get assignment details
  const { data: assignment } = useQuery({
    queryKey: [`/api/assignments/${session?.assignmentId}`],
    enabled: !!session?.assignmentId,
  });

  // Get student details
  const { data: student } = useQuery({
    queryKey: [`/api/users/${session?.userId}`],
    enabled: !!session?.userId,
  });

  // Get AI interactions for this session
  const { data: interactions = [] } = useQuery({
    queryKey: [`/api/session/${sessionId}/interactions`],
  });

  // Get inline comments from teacher
  const { data: comments = [] } = useQuery({
    queryKey: [`/api/sessions/${sessionId}/comments`],
  });

  if (sessionLoading || !session) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <Card className="w-full max-w-4xl max-h-[90vh] m-4">
          <CardContent className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p>Loading submission...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Function to highlight copy-pasted content
  const renderContentWithHighlights = (content: string, pastedContent: any[]) => {
    if (!pastedContent || pastedContent.length === 0) {
      return <div className="whitespace-pre-wrap">{content}</div>;
    }

    let highlightedContent = content;
    const highlights: { start: number; end: number; type: string }[] = [];

    // Add copy-paste highlights
    pastedContent.forEach((paste) => {
      if (paste.startIndex !== undefined && paste.endIndex !== undefined) {
        highlights.push({
          start: paste.startIndex,
          end: paste.endIndex,
          type: 'paste'
        });
      }
    });

    // Sort highlights by start position
    highlights.sort((a, b) => a.start - b.start);

    // Build highlighted JSX
    const parts = [];
    let lastIndex = 0;

    highlights.forEach((highlight, index) => {
      // Add text before highlight
      if (highlight.start > lastIndex) {
        parts.push(
          <span key={`text-${index}`}>
            {content.slice(lastIndex, highlight.start)}
          </span>
        );
      }

      // Add highlighted text with enhanced styling
      parts.push(
        <span
          key={`highlight-${index}`}
          className={`${
            highlight.type === 'paste' 
              ? 'bg-red-200 border-2 border-red-500 px-2 py-1 rounded font-semibold text-red-900' 
              : 'bg-yellow-100'
          }`}
          title={highlight.type === 'paste' ? 'Copy-pasted content detected' : ''}
          style={{
            backgroundColor: highlight.type === 'paste' ? '#fecaca' : undefined,
            borderColor: highlight.type === 'paste' ? '#ef4444' : undefined
          }}
        >
          {content.slice(highlight.start, highlight.end)}
        </span>
      );

      lastIndex = highlight.end;
    });

    // Add remaining text
    if (lastIndex < content.length) {
      parts.push(
        <span key="text-end">
          {content.slice(lastIndex)}
        </span>
      );
    }

    return <div className="whitespace-pre-wrap">{parts}</div>;
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-6xl max-h-[95vh] overflow-hidden">
        <CardHeader className="border-b">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl">Submission Review</CardTitle>
              <p className="text-gray-600 mt-1">
                {assignment?.title} - {student?.firstName} {student?.lastName}
              </p>
            </div>
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </CardHeader>

        <div className="flex h-[calc(95vh-120px)]">
          {/* Main Content */}
          <div className="flex-1 p-6 overflow-y-auto">
            <div className="space-y-6">
              {/* Submission Metadata */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="flex items-center space-x-2">
                  <User className="h-4 w-4 text-gray-500" />
                  <span className="text-sm">{student?.firstName} {student?.lastName}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  <span className="text-sm">
                    {session.submittedAt ? new Date(session.submittedAt).toLocaleDateString() : 'Draft'}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <FileText className="h-4 w-4 text-gray-500" />
                  <span className="text-sm">{session.wordCount || 0} words</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge variant={
                    session.status === 'graded' ? 'default' :
                    session.status === 'submitted' ? 'secondary' : 'outline'
                  }>
                    {session.status === 'graded' ? 'Graded' :
                     session.status === 'submitted' ? 'Submitted' : 'Draft'}
                  </Badge>
                </div>
              </div>

              <Separator />

              {/* Student's Document */}
              <div>
                <h3 className="text-lg font-semibold mb-3 flex items-center">
                  <FileText className="h-5 w-5 mr-2" />
                  Student Submission
                </h3>
                <Card>
                  <CardContent className="p-4">
                    {session.content ? (
                      renderContentWithHighlights(session.content, session.pastedContent || [])
                    ) : (
                      <p className="text-gray-500 italic">No content submitted</p>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Copy-Paste Detection */}
              {session.pastedContent && session.pastedContent.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-3 flex items-center text-red-600">
                    <Copy className="h-5 w-5 mr-2" />
                    Copy-Paste Detection ({session.pastedContent.length} instances)
                  </h3>
                  
                  {/* Summary Card */}
                  <Card className="border-red-200 bg-red-50 mb-4">
                    <CardContent className="p-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <span className="text-sm font-medium text-red-700">Total Pasted Instances:</span>
                          <div className="text-2xl font-bold text-red-800">{session.pastedContent.length}</div>
                        </div>
                        <div>
                          <span className="text-sm font-medium text-red-700">Total Characters Pasted:</span>
                          <div className="text-2xl font-bold text-red-800">
                            {session.pastedContent.reduce((total: number, paste: any) => total + (paste.text?.length || 0), 0)}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  {/* Individual Paste Instances */}
                  <div className="space-y-2">
                    {session.pastedContent.map((paste: any, index: number) => (
                      <Card key={index} className="border-red-200">
                        <CardContent className="p-3">
                          <div className="flex justify-between items-start mb-2">
                            <div className="text-sm text-gray-600">
                              Pasted at {new Date(paste.timestamp).toLocaleString()}
                            </div>
                            <div className="text-sm font-medium text-red-600">
                              {paste.text?.length || 0} characters
                            </div>
                          </div>
                          <div className="bg-red-50 p-2 rounded text-sm border-l-4 border-red-400">
                            "{paste.text?.slice(0, 150) || ''}{(paste.text?.length || 0) > 150 ? '...' : ''}"
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Show message if no copy-paste detected */}
              {(!session.pastedContent || session.pastedContent.length === 0) && (
                <div>
                  <h3 className="text-lg font-semibold mb-3 flex items-center text-green-600">
                    <Copy className="h-5 w-5 mr-2" />
                    Copy-Paste Detection
                  </h3>
                  <Card className="border-green-200 bg-green-50">
                    <CardContent className="p-4">
                      <div className="text-green-700 text-center">
                        ✓ No copy-paste activity detected in this submission
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Teacher Feedback */}
              {session.status === 'graded' && (
                <div>
                  <h3 className="text-lg font-semibold mb-3 flex items-center">
                    <GraduationCap className="h-5 w-5 mr-2" />
                    Teacher Feedback
                  </h3>
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <Badge variant="default" className="text-lg px-3 py-1">
                          Grade: {session.grade}
                        </Badge>
                        <div className="text-sm text-gray-600">
                          Graded on {new Date(session.updatedAt).toLocaleDateString()}
                        </div>
                      </div>
                      {session.teacherFeedback && (
                        <div className="mt-3">
                          <p className="text-sm font-medium mb-2">Teacher Comments:</p>
                          <p className="text-gray-700">{session.teacherFeedback}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Inline Comments */}
              {comments.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-3 flex items-center">
                    <MessageSquare className="h-5 w-5 mr-2" />
                    Inline Comments ({comments.length})
                  </h3>
                  <div className="space-y-2">
                    {comments.map((comment: any) => (
                      <Card key={comment.id}>
                        <CardContent className="p-3">
                          <div className="text-sm text-gray-600 mb-1">
                            On: "{comment.highlightedText}"
                          </div>
                          <p className="text-sm">{comment.comment}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar - AI Interactions */}
          <div className="w-80 border-l bg-gray-50 p-4 overflow-y-auto">
            <h3 className="text-lg font-semibold mb-3 flex items-center">
              <Bot className="h-5 w-5 mr-2" />
              AI Interactions ({interactions.length})
            </h3>
            
            {interactions.length > 0 ? (
              <ScrollArea className="h-full">
                <div className="space-y-3">
                  {interactions.map((interaction: any, index: number) => (
                    <Card key={interaction.id} className="text-sm">
                      <CardContent className="p-3">
                        <div className="text-xs text-gray-500 mb-2">
                          {new Date(interaction.createdAt).toLocaleString()}
                        </div>
                        <div className="mb-2">
                          <strong>Student:</strong>
                          <p className="mt-1 text-gray-700">{interaction.prompt}</p>
                        </div>
                        <div>
                          <strong>AI Response:</strong>
                          <p className="mt-1 text-gray-700">{interaction.response}</p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <p className="text-gray-500 text-sm">No AI interactions for this submission</p>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}