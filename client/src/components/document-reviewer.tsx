import React, { useState, useRef } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MessageCircle, X, Plus, Edit3, Bot, GripHorizontal } from "lucide-react";
import AiChatViewer from "./ai-chat-viewer";
import type { WritingSession } from "@shared/schema";

interface Comment {
  id: string;
  text: string;
  startIndex: number;
  endIndex: number;
  highlightedText: string;
  createdAt: Date;
}

interface DocumentReviewerProps {
  session: WritingSession;
  onGradeSubmit: (grade: string, feedback: string) => void;
  isSubmitting: boolean;
}

const commentSchema = z.object({
  comment: z.string().min(5, "Comment must be at least 5 characters"),
});

type CommentForm = z.infer<typeof commentSchema>;

export default function DocumentReviewer({ session, onGradeSubmit, isSubmitting }: DocumentReviewerProps) {
  const [selectedText, setSelectedText] = useState<{ text: string; start: number; end: number; x: number; y: number } | null>(null);
  const [showCommentForm, setShowCommentForm] = useState(false);
  const [activeComment, setActiveComment] = useState<string | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Fetch inline comments from database
  const { data: inlineComments = [], isLoading } = useQuery({
    queryKey: [`/api/sessions/${session.id}/comments`],
    retry: false,
  });

  // Convert database comments to display format
  const comments: Comment[] = inlineComments.map((comment: any) => ({
    id: comment.id.toString(),
    text: comment.comment,
    startIndex: comment.startIndex,
    endIndex: comment.endIndex,
    highlightedText: comment.highlightedText,
    createdAt: new Date(comment.createdAt),
  }));

  const commentForm = useForm<CommentForm>({
    resolver: zodResolver(commentSchema),
    defaultValues: {
      comment: "",
    },
  });

  // Handle text selection
  const handleTextSelection = () => {
    const selection = window.getSelection();
    if (selection && selection.toString().trim().length > 0) {
      const range = selection.getRangeAt(0);
      const selectedText = selection.toString();
      
      // Get position of selection for floating comment form
      const rect = range.getBoundingClientRect();
      const containerRect = contentRef.current!.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      
      // Calculate position relative to the content
      const preCaretRange = range.cloneRange();
      preCaretRange.selectNodeContents(contentRef.current!);
      preCaretRange.setEnd(range.startContainer, range.startOffset);
      const startIndex = preCaretRange.toString().length;
      const endIndex = startIndex + selectedText.length;

      // Calculate optimal position relative to container with safe boundaries
      const commentPanelHeight = 280; // Estimated height of comment panel
      const commentPanelWidth = 320; // Width of comment panel (w-80)
      
      // Position relative to the content container
      let x = rect.right - containerRect.left + 10;
      let y = rect.top - containerRect.top;
      
      // Check boundaries and adjust position to keep panel visible and accessible
      const containerWidth = containerRect.width;
      const containerHeight = containerRect.height;
      
      // If panel would extend beyond right edge, position to the left
      if (x + commentPanelWidth > containerWidth - 20) {
        x = rect.left - containerRect.left - commentPanelWidth - 10;
        // If still too far left, position at a safe distance from left edge
        if (x < 10) {
          x = Math.max(10, containerWidth - commentPanelWidth - 10);
        }
      }
      
      // If panel would extend beyond bottom, position above the selection
      if (y + commentPanelHeight > containerHeight - 100) { // 100px buffer for save button
        y = Math.max(10, y - commentPanelHeight - 10);
      }
      
      // Ensure panel stays within safe top boundary
      if (y < 10) {
        y = 10;
      }

      setSelectedText({
        text: selectedText,
        start: startIndex,
        end: endIndex,
        x: x,
        y: y,
      });
      setShowCommentForm(true);
    }
  };

  // Mutation to save comment to database
  const addCommentMutation = useMutation({
    mutationFn: async (commentData: any) => {
      const response = await apiRequest("POST", `/api/sessions/${session.id}/comments`, commentData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/sessions/${session.id}/comments`] });
      setSelectedText(null);
      setShowCommentForm(false);
      commentForm.reset();
      toast({
        title: "Comment Added",
        description: "Your feedback has been added to the document.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save comment. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Add a new comment
  const handleAddComment = (data: CommentForm) => {
    if (!selectedText) return;

    addCommentMutation.mutate({
      startIndex: selectedText.start,
      endIndex: selectedText.end,
      highlightedText: selectedText.text,
      comment: data.comment,
    });
  };

  // Remove a comment
  const handleRemoveComment = (commentId: string) => {
    setComments(prev => prev.filter(c => c.id !== commentId));
    setActiveComment(null);
  };

  // Render content with highlights
  const renderContentWithHighlights = () => {
    if (!session.content || comments.length === 0) {
      return <div className="whitespace-pre-wrap leading-relaxed">{session.content}</div>;
    }

    const sortedComments = [...comments].sort((a, b) => a.startIndex - b.startIndex);
    let lastIndex = 0;
    const elements: React.ReactNode[] = [];

    sortedComments.forEach((comment, index) => {
      // Add text before highlight
      if (comment.startIndex > lastIndex) {
        elements.push(
          <span key={`text-${index}`}>
            {session.content.slice(lastIndex, comment.startIndex)}
          </span>
        );
      }

      // Add highlighted text with comment
      elements.push(
        <span
          key={comment.id}
          className={`bg-yellow-200 border-b-2 border-yellow-400 cursor-pointer relative ${
            activeComment === comment.id ? 'bg-yellow-300' : ''
          }`}
          onClick={() => setActiveComment(activeComment === comment.id ? null : comment.id)}
          title={comment.text}
        >
          {comment.highlightedText}
          <MessageCircle className="inline h-3 w-3 ml-1 text-yellow-600" />
        </span>
      );

      lastIndex = comment.endIndex;
    });

    // Add remaining text
    if (lastIndex < session.content.length) {
      elements.push(
        <span key="final-text">
          {session.content.slice(lastIndex)}
        </span>
      );
    }

    return <div className="whitespace-pre-wrap leading-relaxed">{elements}</div>;
  };

  return (
    <div className="space-y-6">
      {/* Document Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl">{session.title}</CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="outline">{session.wordCount} words</Badge>
              <Badge variant="outline">
                {session.submittedAt ? `Submitted ${new Date(session.submittedAt).toLocaleDateString()}` : 'Draft'}
              </Badge>
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Document Content with AI Chat Tabs */}
        <div className="lg:col-span-3">
          <Card>
            <CardHeader>
              <Tabs defaultValue="document" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="document" className="flex items-center gap-2">
                    <Edit3 className="h-4 w-4" />
                    Student Writing
                  </TabsTrigger>
                  <TabsTrigger value="ai-chat" className="flex items-center gap-2">
                    <Bot className="h-4 w-4" />
                    AI Assistance Used
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="document" className="mt-4">
                  <div className="mb-4">
                    <p className="text-sm text-gray-600">
                      Select any text to add specific feedback comments
                    </p>
                  </div>
                  <div className="relative">
                    <div
                      ref={contentRef}
                      className="bg-gray-50 p-4 rounded-lg min-h-96 cursor-text"
                      onMouseUp={handleTextSelection}
                      style={{ userSelect: 'text' }}
                    >
                      {renderContentWithHighlights()}
                    </div>
                    
                    {/* Floating Comment Form - Compact & Repositioned */}
                    {showCommentForm && selectedText && (
                      <div 
                        className="fixed z-50 bg-white border border-blue-200 rounded-lg shadow-xl w-80 resize overflow-hidden"
                        style={{
                          left: `${Math.min(selectedText.x, window.innerWidth - 340)}px`,
                          top: `${Math.max(10, Math.min(selectedText.y, window.innerHeight - 200))}px`,
                          maxWidth: '320px',
                          minHeight: '180px',
                          maxHeight: '300px'
                        }}
                      >
                        {/* Header */}
                        <div className="bg-blue-50 px-3 py-2 border-b flex items-center justify-between">
                          <div className="text-xs text-blue-700 font-medium">Add Feedback</div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => {
                              setShowCommentForm(false);
                              setSelectedText(null);
                              window.getSelection()?.removeAllRanges();
                            }}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                        
                        {/* Content */}
                        <div className="p-3 space-y-3">
                          <div className="bg-gray-50 p-2 rounded text-xs">
                            <strong>Selected:</strong> "{selectedText.text.length > 50 ? selectedText.text.substring(0, 50) + '...' : selectedText.text}"
                          </div>
                          
                          <Form {...commentForm}>
                            <form onSubmit={commentForm.handleSubmit(handleAddComment)} className="space-y-3">
                              <FormField
                                control={commentForm.control}
                                name="comment"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormControl>
                                      <Textarea
                                        placeholder="Add your feedback here..."
                                        className="min-h-16 text-sm resize-none"
                                        autoFocus
                                        {...field}
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <Button type="submit" size="sm" className="w-full">
                                <Plus className="h-3 w-3 mr-1" />
                                Save Comment
                              </Button>
                            </form>
                          </Form>
                        </div>
                        
                        {/* Resize Handle */}
                        <div className="absolute bottom-0 right-0 w-4 h-4 cursor-nw-resize">
                          <GripHorizontal className="h-3 w-3 text-gray-400 rotate-45" />
                        </div>
                      </div>
                    )}
                  </div>
                </TabsContent>
                
                <TabsContent value="ai-chat" className="mt-4">
                  <AiChatViewer 
                    sessionId={session.id} 
                    studentName={`${(session as any).student?.firstName || 'Student'} ${(session as any).student?.lastName || ''}`}
                  />
                </TabsContent>
              </Tabs>
            </CardHeader>
          </Card>
        </div>

        {/* Fixed Comments Sidebar */}
        <div className="lg:col-span-2">
          <div className="sticky top-0 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageCircle className="h-5 w-5" />
                  Feedback Comments ({comments.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="max-h-96 overflow-y-auto">
              {comments.length === 0 ? (
                <div className="text-center py-6 text-gray-500">
                  <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No comments yet</p>
                  <p className="text-xs">Select text to add feedback</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {comments.map((comment) => (
                    <Card
                      key={comment.id}
                      className={`border-l-4 ${
                        activeComment === comment.id 
                          ? 'border-l-blue-500 bg-blue-50' 
                          : 'border-l-yellow-400'
                      }`}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <div className="text-xs text-gray-500 mb-1">
                              "{comment.highlightedText}"
                            </div>
                            <p className="text-sm">{comment.text}</p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveComment(comment.id)}
                            className="h-6 w-6 p-0"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Grading Form in Sidebar */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Submit Grade & Overall Feedback</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Grade</label>
                  <select className="w-full mt-1 p-2 border rounded">
                    <option value="">Select a grade</option>
                    <option value="A+">A+ (97-100)</option>
                    <option value="A">A (93-96)</option>
                    <option value="A-">A- (90-92)</option>
                    <option value="B+">B+ (87-89)</option>
                    <option value="B">B (83-86)</option>
                    <option value="B-">B- (80-82)</option>
                    <option value="C+">C+ (77-79)</option>
                    <option value="C">C (73-76)</option>
                    <option value="C-">C- (70-72)</option>
                    <option value="D">D (60-66)</option>
                    <option value="F">F (Below 60)</option>
                  </select>
                </div>
                
                <div>
                  <label className="text-sm font-medium">Overall Feedback</label>
                  <textarea 
                    id="feedback-textarea"
                    className="w-full mt-1 p-2 border rounded min-h-24"
                    placeholder="Provide comprehensive feedback about the student's work..."
                  />
                </div>

                <Button 
                  className="w-full"
                  onClick={() => {
                    const gradeSelect = document.querySelector('select') as HTMLSelectElement;
                    const feedbackTextarea = document.getElementById('feedback-textarea') as HTMLTextAreaElement;
                    const grade = gradeSelect?.value || "";
                    const feedback = feedbackTextarea?.value || "";
                    
                    if (!grade) {
                      alert("Please select a grade");
                      return;
                    }
                    if (!feedback.trim()) {
                      alert("Please provide feedback");
                      return;
                    }
                    
                    onGradeSubmit(grade, feedback);
                  }}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Submitting..." : "Submit Grade & Feedback"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}