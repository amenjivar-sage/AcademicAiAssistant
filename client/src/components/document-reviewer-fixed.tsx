import React, { useState, useRef } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { enhancedCopyPasteHighlight } from "./enhanced-copy-paste-highlighter";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MessageCircle, X, Plus, Edit3, Bot } from "lucide-react";
import AiChatViewer from "./ai-chat-viewer";
import DocumentExportDialog from "./document-export-dialog";
import type { WritingSession } from "@shared/schema";

interface Comment {
  id: string;
  text: string;
  startIndex: number;
  endIndex: number;
  highlightedText: string;
}

interface DocumentReviewerProps {
  session: WritingSession;
  onGradeSubmit?: (grade: string, feedback: string) => void;
  isSubmitting?: boolean;
}

const commentSchema = z.object({
  comment: z.string().min(1, "Comment is required"),
});

const gradingSchema = z.object({
  grade: z.string().min(1, "Grade is required"),
  teacherFeedback: z.string().min(1, "Feedback is required"),
});

type CommentForm = z.infer<typeof commentSchema>;
type GradingForm = z.infer<typeof gradingSchema>;

const gradeOptions = [
  { value: "A+", label: "A+ (97-100)" },
  { value: "A", label: "A (93-96)" },
  { value: "A-", label: "A- (90-92)" },
  { value: "B+", label: "B+ (87-89)" },
  { value: "B", label: "B (83-86)" },
  { value: "B-", label: "B- (80-82)" },
  { value: "C+", label: "C+ (77-79)" },
  { value: "C", label: "C (73-76)" },
  { value: "C-", label: "C- (70-72)" },
  { value: "D+", label: "D+ (67-69)" },
  { value: "D", label: "D (60-66)" },
  { value: "F", label: "F (Below 60)" },
];

export default function DocumentReviewer({ session, onGradeSubmit, isSubmitting }: DocumentReviewerProps) {
  const [selectedText, setSelectedText] = useState<{ text: string; start: number; end: number; x: number; y: number } | null>(null);
  const [showCommentForm, setShowCommentForm] = useState(false);
  const [activeComment, setActiveComment] = useState<string | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Get current user information
  const { data: currentUser } = useQuery({
    queryKey: ["/api/auth/user"],
  });

  // Get student information for the session
  const { data: studentInfo } = useQuery({
    queryKey: [`/api/users/${session.userId}`],
    enabled: !!session.userId,
  });

  // Fetch inline comments from database
  const { data: inlineComments = [], isLoading } = useQuery({
    queryKey: [`/api/sessions/${session.id}/comments`],
    retry: false,
  });

  // Convert database comments to display format
  const comments: Comment[] = Array.isArray(inlineComments) ? inlineComments.map((comment: any) => ({
    id: comment.id.toString(),
    text: comment.comment,
    startIndex: comment.startIndex,
    endIndex: comment.endIndex,
    highlightedText: comment.highlightedText,
  })) : [];

  const commentForm = useForm<CommentForm>({
    resolver: zodResolver(commentSchema),
    defaultValues: {
      comment: "",
    },
  });

  const gradingForm = useForm<GradingForm>({
    resolver: zodResolver(gradingSchema),
    defaultValues: {
      grade: session.grade || "",
      teacherFeedback: session.teacherFeedback || "",
    },
  });

  // Add comment mutation
  const addCommentMutation = useMutation({
    mutationFn: async (data: {
      startIndex: number;
      endIndex: number;
      highlightedText: string;
      comment: string;
    }) => {
      return apiRequest(`/api/sessions/${session.id}/comments`, {
        method: "POST",
        body: data,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/sessions/${session.id}/comments`] });
      toast({
        title: "Comment added",
        description: "Your comment has been added successfully.",
      });
      setShowCommentForm(false);
      setSelectedText(null);
      commentForm.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add comment",
        variant: "destructive",
      });
    },
  });

  // Delete comment mutation
  const deleteCommentMutation = useMutation({
    mutationFn: async (commentId: string) => {
      return apiRequest(`/api/sessions/${session.id}/comments/${commentId}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/sessions/${session.id}/comments`] });
      toast({
        title: "Comment deleted",
        description: "Comment has been removed.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete comment",
        variant: "destructive",
      });
    },
  });

  // Grade submission mutation
  const gradeMutation = useMutation({
    mutationFn: async (data: GradingForm) => {
      return apiRequest(`/api/sessions/${session.id}/grade`, {
        method: "POST",
        body: {
          grade: data.grade,
          teacherFeedback: data.teacherFeedback,
          status: "graded",
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/sessions/${session.id}`] });
      toast({
        title: "Grade submitted",
        description: "The grade and feedback have been saved.",
      });
      if (onGradeSubmit) {
        const formData = gradingForm.getValues();
        onGradeSubmit(formData.grade, formData.teacherFeedback);
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to submit grade",
        variant: "destructive",
      });
    },
  });

  // Enhanced function to highlight pasted content using the new highlighter
  const highlightPastedContent = (text: string) => {
    console.log('=== ENHANCED DOCUMENT REVIEWER ===');
    console.log('Session ID:', session.id);
    console.log('Raw pastedContent type:', typeof session.pastedContent);
    console.log('Raw pastedContent value:', session.pastedContent);

    // Parse the pasted content from the database (stored as JSON string)
    let pastedData = [];
    if (session.pastedContent) {
      try {
        if (typeof session.pastedContent === 'string') {
          pastedData = JSON.parse(session.pastedContent);
        } else if (Array.isArray(session.pastedContent)) {
          pastedData = session.pastedContent;
        }
      } catch (e) {
        console.error('Error parsing pasted content:', e);
        return text;
      }
    }

    console.log('Parsed pasted data:', pastedData);
    console.log('Pasted data length:', pastedData.length);

    if (!pastedData || !Array.isArray(pastedData) || pastedData.length === 0) {
      console.log('No valid pasted content found');
      return text;
    }

    // Use the enhanced copy-paste highlighter
    try {
      const highlightedContent = enhancedCopyPasteHighlight(text, pastedData);
      console.log('Enhanced highlighting applied successfully');
      return highlightedContent;
    } catch (error) {
      console.error('Error in enhanced highlighting:', error);
      return text;
    }
  };

  // Text selection handler
  const handleTextSelection = () => {
    const selection = window.getSelection();
    if (selection && selection.toString().trim()) {
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      const containerRect = contentRef.current?.getBoundingClientRect();
      
      if (containerRect) {
        const selectedText = selection.toString();
        const startOffset = range.startOffset;
        const endOffset = range.endOffset;
        
        setSelectedText({
          text: selectedText,
          start: startOffset,
          end: endOffset,
          x: rect.left - containerRect.left,
          y: rect.bottom - containerRect.top + 10,
        });
        setShowCommentForm(true);
      }
    }
  };

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

  // Handle grading submission
  const handleGradeSubmit = (data: GradingForm) => {
    gradeMutation.mutate(data);
  };

  // Render highlighted content with comments
  const renderContent = () => {
    let content = session.content || "";
    
    // Apply copy-paste highlighting first
    content = highlightPastedContent(content);

    // Apply comment highlighting
    comments.forEach((comment) => {
      const commentHTML = `<span class="comment-highlight" data-comment-id="${comment.id}" style="background-color: #fef3c7; border-bottom: 2px solid #f59e0b; cursor: pointer;" title="${comment.text}">${comment.highlightedText}</span>`;
      content = content.replace(comment.highlightedText, commentHTML);
    });

    return content;
  };

  return (
    <div className="space-y-6">
      {/* Student Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Edit3 className="h-5 w-5" />
            Document Review
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium">Student:</span>{" "}
              {studentInfo?.firstName} {studentInfo?.lastName}
            </div>
            <div>
              <span className="font-medium">Assignment:</span> {session.title}
            </div>
            <div>
              <span className="font-medium">Word Count:</span> {session.wordCount}
            </div>
            <div>
              <span className="font-medium">Status:</span>{" "}
              <Badge variant={session.status === "submitted" ? "default" : "secondary"}>
                {session.status}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="review" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="review">Review Document</TabsTrigger>
          <TabsTrigger value="ai-chat">AI Interactions</TabsTrigger>
          <TabsTrigger value="export">Export Options</TabsTrigger>
        </TabsList>

        <TabsContent value="review" className="space-y-4">
          {/* Document Content */}
          <Card>
            <CardHeader>
              <CardTitle>Document Content</CardTitle>
            </CardHeader>
            <CardContent>
              <div
                ref={contentRef}
                className="prose max-w-none p-4 border rounded-lg bg-white min-h-[400px] relative"
                onMouseUp={handleTextSelection}
                dangerouslySetInnerHTML={{ __html: renderContent() }}
              />

              {/* Comment Form Popup */}
              {showCommentForm && selectedText && (
                <div
                  className="absolute z-10 bg-white border rounded-lg shadow-lg p-4 w-80"
                  style={{
                    left: selectedText.x,
                    top: selectedText.y,
                  }}
                >
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="font-medium">Add Comment</h4>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setShowCommentForm(false);
                        setSelectedText(null);
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="text-sm text-gray-600 mb-2">
                    Selected: "{selectedText.text}"
                  </div>
                  <Form {...commentForm}>
                    <form onSubmit={commentForm.handleSubmit(handleAddComment)}>
                      <FormField
                        control={commentForm.control}
                        name="comment"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Textarea
                                {...field}
                                placeholder="Enter your comment..."
                                className="min-h-[80px]"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="flex gap-2 mt-2">
                        <Button
                          type="submit"
                          size="sm"
                          disabled={addCommentMutation.isPending}
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Add Comment
                        </Button>
                      </div>
                    </form>
                  </Form>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Comments List */}
          {comments.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageCircle className="h-5 w-5" />
                  Comments ({comments.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {comments.map((comment) => (
                  <div
                    key={comment.id}
                    className="border rounded-lg p-3 hover:bg-gray-50 cursor-pointer"
                    onClick={() => setActiveComment(activeComment === comment.id ? null : comment.id)}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="text-sm text-gray-600 mb-1">
                          "{comment.highlightedText}"
                        </div>
                        <div className="text-sm">{comment.text}</div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteCommentMutation.mutate(comment.id);
                        }}
                        disabled={deleteCommentMutation.isPending}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Grading Section */}
          <Card>
            <CardHeader>
              <CardTitle>Grade Assignment</CardTitle>
            </CardHeader>
            <CardContent>
              <Form {...gradingForm}>
                <form onSubmit={gradingForm.handleSubmit(handleGradeSubmit)} className="space-y-4">
                  <FormField
                    control={gradingForm.control}
                    name="grade"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Grade</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a grade" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {gradeOptions.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={gradingForm.control}
                    name="teacherFeedback"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Teacher Feedback</FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            placeholder="Provide detailed feedback for the student..."
                            className="min-h-[120px]"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button 
                    type="submit" 
                    disabled={gradeMutation.isPending || isSubmitting}
                    className="w-full"
                  >
                    Submit Grade & Feedback
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ai-chat">
          <AiChatViewer sessionId={session.id} />
        </TabsContent>

        <TabsContent value="export">
          <DocumentExportDialog 
            session={session} 
            comments={comments} 
            highlightedContent={renderContent()}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}