import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertTriangle, MessageSquare, X, FileText, Download, Star } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DocumentExportDialog } from './document-export-dialog';
import AiChatViewer from './ai-chat-viewer';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

interface Comment {
  id: number;
  sessionId: number;
  startIndex: number;
  endIndex: number;
  selectedText: string;
  comment: string;
  createdAt: Date;
}

interface WritingSession {
  id: number;
  userId: number | null;
  assignmentId: number | null;
  title: string;
  content: string;
  pastedContent: unknown;
  wordCount: number;
  status: string;
  submittedAt: Date | null;
  teacherFeedback: string | null;
  grade: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface User {
  id: number;
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  grade: string | null;
  department: string | null;
}

interface DocumentReviewerProps {
  sessionId: number;
}

export function DocumentReviewer({ sessionId }: DocumentReviewerProps) {
  const [newComment, setNewComment] = useState('');
  const [selectedText, setSelectedText] = useState('');
  const [selectionStart, setSelectionStart] = useState<number>(0);
  const [selectionEnd, setSelectionEnd] = useState<number>(0);
  const [isCommentDialogOpen, setIsCommentDialogOpen] = useState(false);
  const [activeComment, setActiveComment] = useState<number | null>(null);
  const [highlightedContent, setHighlightedContent] = useState('');
  const [grade, setGrade] = useState<string>('');
  const [feedback, setFeedback] = useState<string>('');

  const queryClient = useQueryClient();

  const { data: session, isLoading: sessionLoading } = useQuery<WritingSession>({
    queryKey: [`/api/writing-sessions/${sessionId}`],
    enabled: !!sessionId
  });

  const { data: comments = [], isLoading: commentsLoading } = useQuery<Comment[]>({
    queryKey: [`/api/writing-sessions/${sessionId}/comments`],
    enabled: !!sessionId
  });

  const { data: student } = useQuery<User>({
    queryKey: [`/api/users/${session?.userId}`],
    enabled: !!session?.userId
  });

  const addCommentMutation = useMutation({
    mutationFn: (commentData: any) => apiRequest('POST', `/api/writing-sessions/${sessionId}/comments`, commentData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/writing-sessions/${sessionId}/comments`] });
      setNewComment('');
      setSelectedText('');
      setIsCommentDialogOpen(false);
    }
  });

  const deleteCommentMutation = useMutation({
    mutationFn: (commentId: number) => apiRequest('DELETE', `/api/writing-sessions/${sessionId}/comments/${commentId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/writing-sessions/${sessionId}/comments`] });
    }
  });

  const submitGradeMutation = useMutation({
    mutationFn: (gradeData: { grade: string; feedback: string }) =>
      apiRequest('POST', `/api/writing-sessions/${sessionId}/grade`, {
        grade: gradeData.grade,
        teacherFeedback: gradeData.feedback,
        status: 'graded'
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/writing-sessions/${sessionId}`] });
      setGrade('');
      setFeedback('');
    }
  });

  // State for detection analysis
  const [detectionResults, setDetectionResults] = useState<{
    totalMatches: number;
    detectedSequences: string[];
    similarityScore: number;
  }>({ totalMatches: 0, detectedSequences: [], similarityScore: 0 });

  // Enhanced plagiarism detection with better accuracy
  const highlightPastedContent = (content: string, pastedData: any[]): string => {
    let result = content;
    let detectedSequences: string[] = [];
    let totalMatches = 0;
    
    if (!pastedData || pastedData.length === 0) {
      setDetectionResults({ totalMatches: 0, detectedSequences: [], similarityScore: 0 });
      return result;
    }

    console.log('=== DOCUMENT REVIEWER DEBUG ===');
    console.log('Session ID:', sessionId);
    console.log('Raw pastedContent type:', typeof pastedData);
    console.log('Raw pastedContent value:', pastedData);

    let parsedPastedData: any[] = [];
    try {
      if (Array.isArray(pastedData)) {
        parsedPastedData = pastedData;
      } else if (typeof pastedData === 'string') {
        parsedPastedData = JSON.parse(pastedData);
      } else {
        parsedPastedData = [pastedData];
      }
    } catch (error) {
      console.error('Error parsing pasted content:', error);
      return result;
    }

    console.log('Content length:', parsedPastedData.length);
    console.log('Parsed pasted data:', parsedPastedData);

    if (!Array.isArray(parsedPastedData)) {
      return result;
    }

    console.log('Pasted data length:', parsedPastedData.length);

    const pastedTexts = parsedPastedData
      .filter(item => item && typeof item === 'object' && item.text)
      .map(item => item.text);

    console.log('Extracted pasted texts:', pastedTexts);

    pastedTexts.forEach((pastedText: string) => {
      if (pastedText) {
        console.log('Processing pasted text:', pastedText);
        
        // Try exact match first
        if (result.includes(pastedText)) {
          const escapedText = pastedText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const regex = new RegExp(escapedText, 'gi');
          result = result.replace(regex, `<span style="background-color: #fecaca; border-bottom: 2px solid #f87171; color: #991b1b; font-weight: 600;" title="Copy-pasted content detected">${pastedText}</span>`);
        } else {
          // Split pasted text into phrases and look for similar content in document
          const phrases = pastedText.split(/[.!?]+/).filter(p => p.trim().length > 15);
          
          phrases.forEach((phrase: string) => {
            const trimmedPhrase = phrase.trim();
            if (trimmedPhrase) {
              const pastedWords = trimmedPhrase.split(/\s+/)
                .filter(w => w.length >= 3)
                .map(w => w.toLowerCase().replace(/[.,!?;]/g, ''));
              
              if (pastedWords.length >= 5) {
                // Look for sequences of 5+ consecutive words from the pasted content
                for (let i = 0; i <= pastedWords.length - 5; i++) {
                  const wordSequence = pastedWords.slice(i, i + 5).join(' ');
                  const escapedSequence = wordSequence.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                  const regex = new RegExp(escapedSequence, 'gi');
                  
                  if (regex.test(result.toLowerCase())) {
                    // Find the actual text in the document and highlight it
                    const docLower = result.toLowerCase();
                    const match = docLower.match(regex);
                    if (match) {
                      const matchIndex = docLower.indexOf(match[0]);
                      if (matchIndex !== -1) {
                        // Extract the actual text with original casing
                        const originalText = result.substring(matchIndex, matchIndex + match[0].length);
                        
                        // Check if it's not code or random text
                        const isCodeSnippet = /(\{[^}]*\}|function\s+\w+|const\s+\w+\s*=|className=|useEffect|useState)/i.test(originalText);
                        const isRandomText = /^[a-z]{3,};[a-z]{3,};[a-z]{3,};[a-z]{3,}/.test(originalText);
                        
                        if (!isCodeSnippet && !isRandomText) {
                          console.log('✓ Highlighting detected sequence:', originalText);
                          detectedSequences.push(originalText);
                          totalMatches++;
                          const highlightedText = `<span style="background-color: #fecaca; border-bottom: 2px solid #f87171; color: #991b1b; font-weight: 600;" title="Copy-pasted content detected">${originalText}</span>`;
                          result = result.substring(0, matchIndex) + highlightedText + result.substring(matchIndex + originalText.length);
                        }
                      }
                    }
                  }
                }
              }
            }
          });
        }
      }
    });

    // Calculate similarity score and update detection results
    const totalWords = content.split(/\s+/).length;
    const similarityScore = totalWords > 0 ? Math.round((totalMatches / totalWords) * 100) : 0;
    
    setDetectionResults({
      totalMatches,
      detectedSequences,
      similarityScore
    });

    return result;
  };

  useEffect(() => {
    if (session) {
      const highlighted = highlightPastedContent(session.content, session.pastedContent as any[]);
      setHighlightedContent(highlighted);
    }
  }, [session]);

  const handleTextSelection = () => {
    const selection = window.getSelection();
    if (selection && selection.toString().trim() && selection.rangeCount > 0) {
      const selectedText = selection.toString().trim();
      const range = selection.getRangeAt(0);
      
      // Get the text content without HTML tags for position calculation
      const container = range.commonAncestorContainer;
      const textContent = container.textContent || '';
      
      setSelectedText(selectedText);
      setSelectionStart(range.startOffset);
      setSelectionEnd(range.endOffset);
      setIsCommentDialogOpen(true);
      
      // Clear selection to avoid confusion
      selection.removeAllRanges();
    }
  };

  const handleAddComment = () => {
    if (newComment.trim() && selectedText.trim()) {
      addCommentMutation.mutate({
        startIndex: selectionStart,
        endIndex: selectionEnd,
        selectedText: selectedText,
        comment: newComment
      });
    }
  };

  const renderContentWithComments = (originalContent: string, highlightedContent: string) => {
    if (!comments || comments.length === 0) {
      return highlightedContent;
    }

    let result = highlightedContent;
    
    // Apply comments on top of highlighted content
    comments.forEach((comment: Comment) => {
      if (comment.selectedText && comment.selectedText.trim()) {
        // Create a more robust comment span
        const commentSpan = `<span class="bg-yellow-200 border-b-2 border-yellow-400 cursor-pointer relative comment-highlight" data-comment-id="${comment.id}" title="Comment: ${comment.comment.replace(/"/g, '&quot;')}">${comment.selectedText}</span>`;
        
        // Use a more precise replacement that handles HTML content
        const escapedText = comment.selectedText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(escapedText, 'g');
        result = result.replace(regex, commentSpan);
      }
    });
    
    return result;
  };

  if (sessionLoading || commentsLoading) {
    return <div className="p-4">Loading document...</div>;
  }

  if (!session) {
    return <div className="p-4">Document not found</div>;
  }

  const finalContent = renderContentWithComments(session.content, highlightedContent);

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{session.title}</h1>
          <p className="text-gray-600">
            Student: {student ? `${student.firstName} ${student.lastName}` : 'Unknown'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant={session.status === 'submitted' ? 'default' : 'secondary'}>
            {session.status}
          </Badge>
          <DocumentExportDialog 
            session={session} 
            student={student}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Document Content
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div 
                className="prose prose-sm max-w-full min-h-[400px] p-6 border rounded-lg bg-white overflow-y-auto whitespace-pre-wrap break-words"
                style={{ maxWidth: '100%', wordWrap: 'break-word', overflowWrap: 'break-word' }}
                onMouseUp={handleTextSelection}
                onClick={(e) => {
                  const target = e.target as HTMLElement;
                  if (target.classList.contains('comment-highlight')) {
                    const commentId = target.getAttribute('data-comment-id');
                    if (commentId) {
                      setActiveComment(parseInt(commentId));
                    }
                  }
                }}
                dangerouslySetInnerHTML={{ __html: finalContent }}
              />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <AiChatViewer 
            sessionId={sessionId} 
            studentName={student?.firstName && student?.lastName ? `${student.firstName} ${student.lastName}` : 'Student'} 
          />

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-500" />
                AI Detection Analysis
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="p-2 bg-gray-50 rounded">
                    <div className="text-lg font-semibold text-red-600">{detectionResults.totalMatches}</div>
                    <div className="text-xs text-gray-600">Matches Found</div>
                  </div>
                  <div className="p-2 bg-gray-50 rounded">
                    <div className="text-lg font-semibold text-orange-600">{detectionResults.similarityScore}%</div>
                    <div className="text-xs text-gray-600">Similarity</div>
                  </div>
                  <div className="p-2 bg-gray-50 rounded">
                    <div className="text-lg font-semibold text-blue-600">{detectionResults.detectedSequences.length}</div>
                    <div className="text-xs text-gray-600">Sequences</div>
                  </div>
                </div>
                
                {detectionResults.detectedSequences.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-2">Detected Sequences:</h4>
                    <ScrollArea className="h-32">
                      <div className="space-y-1">
                        {detectionResults.detectedSequences.map((sequence, index) => (
                          <div key={index} className="text-xs p-2 bg-red-50 border border-red-200 rounded">
                            "{sequence.substring(0, 60)}{sequence.length > 60 ? '...' : ''}"
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                )}
                
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-red-200 border border-red-400"></div>
                  <span className="text-sm">Copy-pasted content highlighted in red</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Comments ({comments.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-64">
                <div className="space-y-3">
                  {comments.map((comment: Comment) => (
                    <div key={comment.id} className="p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-blue-700">
                            "{comment.selectedText.substring(0, 50)}..."
                          </p>
                          <p className="text-sm text-gray-700 mt-1">{comment.comment}</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteCommentMutation.mutate(comment.id)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  {comments.length === 0 && (
                    <p className="text-sm text-gray-500 text-center py-4">
                      No comments yet. Select text to add a comment.
                    </p>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="h-5 w-5" />
                Grade Submission
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="grade">Grade</Label>
                  <Select value={grade} onValueChange={setGrade}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a grade" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="A+">A+ (97-100)</SelectItem>
                      <SelectItem value="A">A (93-96)</SelectItem>
                      <SelectItem value="A-">A- (90-92)</SelectItem>
                      <SelectItem value="B+">B+ (87-89)</SelectItem>
                      <SelectItem value="B">B (83-86)</SelectItem>
                      <SelectItem value="B-">B- (80-82)</SelectItem>
                      <SelectItem value="C+">C+ (77-79)</SelectItem>
                      <SelectItem value="C">C (73-76)</SelectItem>
                      <SelectItem value="C-">C- (70-72)</SelectItem>
                      <SelectItem value="D+">D+ (67-69)</SelectItem>
                      <SelectItem value="D">D (63-66)</SelectItem>
                      <SelectItem value="D-">D- (60-62)</SelectItem>
                      <SelectItem value="F">F (0-59)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="feedback">Overall Feedback</Label>
                  <Textarea
                    id="feedback"
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    placeholder="Provide overall feedback on the student's work..."
                    className="min-h-[120px]"
                  />
                </div>

                <Button
                  onClick={() => submitGradeMutation.mutate({ grade, feedback })}
                  disabled={!grade || !feedback.trim() || submitGradeMutation.isPending}
                  className="w-full"
                >
                  {submitGradeMutation.isPending ? 'Submitting Grade...' : 'Submit Grade & Feedback'}
                </Button>

                {session?.grade && (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="default" className="bg-green-600">
                        Current Grade: {session.grade}
                      </Badge>
                    </div>
                    {session.teacherFeedback && (
                      <p className="text-sm text-gray-700">
                        <strong>Previous Feedback:</strong> {session.teacherFeedback}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={isCommentDialogOpen} onOpenChange={setIsCommentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Comment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Selected Text:</label>
              <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                {selectedText}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium">Comment:</label>
              <Textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Enter your comment here..."
                className="mt-1"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setIsCommentDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddComment}
                disabled={!newComment.trim() || !selectedText.trim()}
              >
                Add Comment
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default DocumentReviewer;