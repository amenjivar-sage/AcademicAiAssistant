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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MessageCircle, X, Plus, Edit3, Bot } from "lucide-react";
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
  comment: z.string().min(1, "Comment is required"),
});

const gradingSchema = z.object({
  grade: z.string().min(1, "Grade is required"),
  feedback: z.string().min(10, "Feedback must be at least 10 characters"),
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
    createdAt: new Date(comment.createdAt),
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
      feedback: session.teacherFeedback || "",
    },
  });

  // Add comment mutation
  const addCommentMutation = useMutation({
    mutationFn: async (commentData: any) => {
      const response = await apiRequest("POST", `/api/sessions/${session.id}/comments`, {
        ...commentData,
        teacherId: 1, // Demo teacher ID
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [`/api/sessions/${session.id}/comments`]
      });
      setShowCommentForm(false);
      setSelectedText(null);
      commentForm.reset();
      window.getSelection()?.removeAllRanges();
      toast({
        title: "Comment added",
        description: "Your feedback has been saved.",
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

  // Helper function to highlight pasted content in red
  const highlightPastedContent = (text: string) => {
    if (!session.pastedContent || !Array.isArray(session.pastedContent) || session.pastedContent.length === 0) {
      return text;
    }

    let result = text;
    console.log('Pasted content data:', session.pastedContent);
    
    const pastedTexts = session.pastedContent.map((item: any) => {
      if (typeof item === 'string') return item;
      if (item && typeof item === 'object') {
        return item.text || item.content || item.value || '';
      }
      return '';
    }).filter((pastedText: string) => pastedText && pastedText.length > 10);

    console.log('Extracted pasted texts:', pastedTexts);

    pastedTexts.forEach((pastedText: string) => {
      if (pastedText) {
        console.log('Processing pasted text:', pastedText);
        console.log('Current document content:', result);
        
        // Try exact match first
        if (result.includes(pastedText)) {
          const escapedText = pastedText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const regex = new RegExp(escapedText, 'gi');
          result = result.replace(regex, `<span style="background-color: #fecaca; border-bottom: 2px solid #f87171; color: #991b1b; font-weight: 600;" title="Copy-pasted content detected">${pastedText}</span>`);
        } else {
          // Simple but effective approach for spell-corrected content
          // Split the pasted text into overlapping phrases and look for similar content
          const sentences = pastedText.split(/[.!?]+/).filter(s => s.trim().length > 10);
          
          sentences.forEach((sentence: string) => {
            const trimmedSentence = sentence.trim();
            if (trimmedSentence) {
              console.log('Looking for sentence:', trimmedSentence);
              
              // Get significant words from the pasted sentence
              const pastedWords = trimmedSentence.split(/\s+/)
                .filter(w => w.length >= 3)
                .map(w => w.toLowerCase());
              
              console.log('Pasted words:', pastedWords);
              
              if (pastedWords.length >= 4) {
                // Get clean document text (without HTML highlighting) for accurate comparison
                const cleanDocumentText = result.replace(/<span[^>]*style="background-color: #fecaca[^>]*>([^<]*)<\/span>/gi, '$1');
                const documentSentences = cleanDocumentText.split(/[.!?]+/).filter(s => s.trim().length > 10);
                
                // Additional safeguard: only check content that comes after the paste detection area
                // This helps avoid flagging content that was written before the paste
                const pasteStart = session.copyPasteData?.[0]?.startIndex || 0;
                
                documentSentences.forEach((docSent: string) => {
                  const docSentTrimmed = docSent.trim();
                  
                  // Skip sentences that appear before the paste area (likely original work)
                  const sentencePosition = cleanDocumentText.indexOf(docSentTrimmed);
                  if (sentencePosition >= 0 && sentencePosition < pasteStart - 50) {
                    console.log('Skipping sentence before paste area:', docSentTrimmed);
                    return;
                  }
                  
                  // Skip already highlighted content
                  if (result.includes(`<span style="background-color: #fecaca`) && 
                      result.includes(docSentTrimmed.substring(0, Math.min(20, docSentTrimmed.length)))) {
                    return;
                  }
                  
                  const docWords = docSentTrimmed.split(/\s+/)
                    .filter(w => w.length >= 3)
                    .map(w => w.toLowerCase().replace(/[.,!?;]/g, ''));
                  
                  if (docWords.length >= 5) {
                    // More precise matching - require exact or very close matches for most words
                    let exactMatches = 0;
                    let closeMatches = 0;
                    
                    pastedWords.forEach((pastedWord: string) => {
                      const cleanPastedWord = pastedWord.replace(/[.,!?;]/g, '');
                      
                      docWords.forEach((docWord: string) => {
                        // Exact match (after cleaning punctuation)
                        if (cleanPastedWord === docWord) {
                          exactMatches += 1;
                        }
                        // Very close spelling match (first 4+ chars match for longer words)
                        else if (cleanPastedWord.length >= 5 && docWord.length >= 5 &&
                                cleanPastedWord.substring(0, 4) === docWord.substring(0, 4)) {
                          closeMatches += 1;
                        }
                      });
                    });
                    
                    // Calculate match strength - require mostly exact matches
                    const totalMatches = exactMatches + (closeMatches * 0.7);
                    const matchPercentage = totalMatches / pastedWords.length;
                    console.log('Match analysis for sentence:', docSentTrimmed, 
                               'Exact:', exactMatches, 'Close:', closeMatches, 'Percentage:', matchPercentage);
                    
                    // Balanced criteria: good match percentage with reasonable exact matches
                    if (matchPercentage >= 0.75 && exactMatches >= Math.floor(pastedWords.length * 0.4) && 
                        pastedWords.length >= 5 && docWords.length >= 5) {
                      
                      // Double-check this isn't original content by looking for common original writing patterns
                      const hasOriginalPatterns = /\b(sky|hello|how are you|doing|good morning|dear|sincerely)\b/i.test(docSentTrimmed);
                      
                      if (!hasOriginalPatterns && !result.includes(docSentTrimmed)) {
                        const escapedSentence = docSentTrimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                        const sentenceRegex = new RegExp(escapedSentence, 'gi');
                        
                        result = result.replace(sentenceRegex, (match) => {
                          if (!match.includes('style="background-color: #fecaca')) {
                            console.log('Highlighting high-confidence match:', match);
                            return `<span style="background-color: #fecaca; border-bottom: 2px solid #f87171; color: #991b1b; font-weight: 600;" title="Copy-pasted content detected (${Math.round(matchPercentage * 100)}% match)">${match}</span>`;
                          }
                          return match;
                        });
                      }
                    }
                  }
                });
              }
            }
          });
        }
      }
    });

    return result;
  };

  // Render content with highlights
  const renderContentWithHighlights = () => {
    if (!session.content) return <p className="text-gray-500">No content available</p>;

    const sortedComments = [...comments].sort((a, b) => a.startIndex - b.startIndex);
    const elements = [];
    let lastIndex = 0;

    sortedComments.forEach((comment, index) => {
      // Add text before the comment
      if (lastIndex < comment.startIndex) {
        const textSegment = session.content.slice(lastIndex, comment.startIndex);
        const highlightedText = highlightPastedContent(textSegment);
        elements.push(
          <span key={`text-${index}`} dangerouslySetInnerHTML={{ __html: highlightedText }} />
        );
      }

      // Add highlighted comment
      elements.push(
        <span
          key={comment.id}
          className="bg-yellow-200 hover:bg-yellow-300 cursor-pointer relative"
          onClick={() => setActiveComment(activeComment === comment.id ? null : comment.id)}
        >
          {comment.highlightedText}
          <MessageCircle className="inline h-3 w-3 ml-1 text-yellow-600" />
        </span>
      );

      lastIndex = comment.endIndex;
    });

    // Add remaining text
    if (lastIndex < session.content.length) {
      const textSegment = session.content.slice(lastIndex);
      const highlightedText = highlightPastedContent(textSegment);
      elements.push(
        <span key="final-text" dangerouslySetInnerHTML={{ __html: highlightedText }} />
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
                  {session.pastedContent && Array.isArray(session.pastedContent) && session.pastedContent.length > 0 && (
                    <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-2 bg-red-500 rounded-full"></div>
                          <p className="text-sm text-red-700 font-medium">
                            Copy-paste activity detected: {session.pastedContent.length} instance(s) highlighted in red below
                          </p>
                        </div>
                        <div className="text-sm text-red-600 font-semibold">
                          {(() => {
                            const totalWords = session.content ? session.content.split(/\s+/).filter(w => w.trim()).length : 0;
                            const originalPastedWords = session.pastedContent.reduce((total: number, item: any) => {
                              const text = item.text || item.content || item.value || '';
                              return total + (text ? text.split(/\s+/).filter((w: string) => w.trim()).length : 0);
                            }, 0);
                            
                            // Calculate percentage based on original pasted content length vs total content
                            // This gives a more accurate representation since pasted content may be spell-corrected
                            const percentage = totalWords > 0 ? Math.round((originalPastedWords / totalWords) * 100) : 0;
                            
                            // Cap at 100% to avoid over-reporting due to corrections/edits
                            const cappedPercentage = Math.min(percentage, 100);
                            
                            return `${cappedPercentage}% pasted content`;
                          })()}
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="mb-4">
                    <p className="text-sm text-gray-600">
                      Select any text to add specific feedback comments. Copy-pasted content appears highlighted in red.
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
                    
                    {/* Floating Comment Form */}
                    {showCommentForm && selectedText && (
                      <div 
                        className="absolute z-10 bg-white border border-blue-200 rounded-lg shadow-lg p-4 w-80"
                        style={{
                          left: `${selectedText.x}px`,
                          top: `${selectedText.y}px`,
                          transform: selectedText.x > 400 ? 'translateX(-100%)' : 'translateX(0)'
                        }}
                      >
                        <div className="space-y-3">
                          <div className="bg-blue-50 p-2 rounded text-sm">
                            <strong>Selected:</strong> "{selectedText.text}"
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
                                        className="min-h-16 text-sm"
                                        autoFocus
                                        {...field}
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <div className="flex gap-2">
                                <Button type="submit" size="sm" className="flex-1">
                                  <Plus className="h-3 w-3 mr-1" />
                                  Save
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setShowCommentForm(false);
                                    setSelectedText(null);
                                    window.getSelection()?.removeAllRanges();
                                  }}
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            </form>
                          </Form>
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

        {/* Comments and Grading Sidebar */}
        <div className="lg:col-span-2">
          <div className="sticky top-0 space-y-4">
            {/* Comments Panel */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageCircle className="h-5 w-5" />
                  Comments ({comments.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {comments.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">
                    No comments yet. Select text to add feedback.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {comments.map((comment) => (
                      <div
                        key={comment.id}
                        className={`p-3 rounded-lg border transition-colors ${
                          activeComment === comment.id 
                            ? 'border-blue-300 bg-blue-50' 
                            : 'border-gray-200 bg-gray-50'
                        }`}
                      >
                        <div className="text-xs text-gray-500 mb-1">
                          "{comment.highlightedText}"
                        </div>
                        <p className="text-sm">{comment.text}</p>
                        <div className="text-xs text-gray-400 mt-1">
                          {comment.createdAt.toLocaleString()}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Grading Panel */}
            <Card>
              <CardHeader>
                <CardTitle>Grade & Feedback</CardTitle>
              </CardHeader>
              <CardContent>
                <Form {...gradingForm}>
                  <form onSubmit={gradingForm.handleSubmit((data) => onGradeSubmit(data.grade, data.feedback))} className="space-y-4">
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
                      name="feedback"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Overall Feedback</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Provide constructive feedback on the student's work..."
                              className="min-h-32"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button
                      type="submit"
                      className="w-full"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? "Submitting..." : "Submit Grade & Feedback"}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}