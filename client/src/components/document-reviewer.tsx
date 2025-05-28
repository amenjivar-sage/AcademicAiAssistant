import React, { useState, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
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
import { MessageCircle, X, Plus, Edit3 } from "lucide-react";
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
  const [selectedText, setSelectedText] = useState<{ text: string; start: number; end: number } | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [showCommentForm, setShowCommentForm] = useState(false);
  const [activeComment, setActiveComment] = useState<string | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

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
      
      // Calculate position relative to the content
      const preCaretRange = range.cloneRange();
      preCaretRange.selectNodeContents(contentRef.current!);
      preCaretRange.setEnd(range.startContainer, range.startOffset);
      const startIndex = preCaretRange.toString().length;
      const endIndex = startIndex + selectedText.length;

      setSelectedText({
        text: selectedText,
        start: startIndex,
        end: endIndex,
      });
      setShowCommentForm(true);
    }
  };

  // Add a new comment
  const handleAddComment = (data: CommentForm) => {
    if (!selectedText) return;

    const newComment: Comment = {
      id: Math.random().toString(36).substr(2, 9),
      text: data.comment,
      startIndex: selectedText.start,
      endIndex: selectedText.end,
      highlightedText: selectedText.text,
      createdAt: new Date(),
    };

    setComments(prev => [...prev, newComment]);
    setSelectedText(null);
    setShowCommentForm(false);
    commentForm.reset();

    toast({
      title: "Comment Added",
      description: "Your feedback has been added to the document.",
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
        {/* Document Content */}
        <div className="lg:col-span-3">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Edit3 className="h-5 w-5" />
                Student Writing
              </CardTitle>
              <p className="text-sm text-gray-600">
                Select any text to add specific feedback comments
              </p>
            </CardHeader>
            <CardContent>
              <div
                ref={contentRef}
                className="bg-gray-50 p-4 rounded-lg min-h-96 cursor-text"
                onMouseUp={handleTextSelection}
                style={{ userSelect: 'text' }}
              >
                {renderContentWithHighlights()}
              </div>

              {/* Comment Form */}
              {showCommentForm && selectedText && (
                <Card className="mt-4 border-blue-200">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">
                      Add Feedback Comment
                    </CardTitle>
                    <div className="bg-blue-50 p-2 rounded text-sm">
                      <strong>Selected text:</strong> "{selectedText.text}"
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Form {...commentForm}>
                      <form onSubmit={commentForm.handleSubmit(handleAddComment)} className="space-y-3">
                        <FormField
                          control={commentForm.control}
                          name="comment"
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <Textarea
                                  placeholder="Provide specific feedback about this section..."
                                  className="min-h-20"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <div className="flex gap-2">
                          <Button type="submit" size="sm">
                            <Plus className="h-4 w-4 mr-1" />
                            Add Comment
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setShowCommentForm(false);
                              setSelectedText(null);
                            }}
                          >
                            Cancel
                          </Button>
                        </div>
                      </form>
                    </Form>
                  </CardContent>
                </Card>
              )}
            </CardContent>
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
                    className="w-full mt-1 p-2 border rounded min-h-24"
                    placeholder="Provide comprehensive feedback about the student's work..."
                  />
                </div>

                <Button 
                  className="w-full"
                  onClick={() => onGradeSubmit("A", "Great work!")}
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
    </div>
  );
}