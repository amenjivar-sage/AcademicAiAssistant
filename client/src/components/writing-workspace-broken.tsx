import React, { useState, useEffect, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocation, useRoute } from 'wouter';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { Save, Send, Clock, FileText, Shield, AlertTriangle, Trophy, ArrowLeft, Loader2, Undo, Settings } from 'lucide-react';
import AiAssistant from './ai-assistant';
import CopyPasteDetector from './copy-paste-detector';
import EnhancedToolbar from './enhanced-toolbar';
import AiDisclosure from './ai-disclosure';
import FeedbackViewer from './feedback-viewer';
import InlineSpellCheck from './inline-spell-check';
import PageBasedEditor from './page-based-editor';
import WordStylePagesEditor from './word-style-pages-editor';
import RichTextEditor from './rich-text-editor';
import type { WritingSession, Assignment } from '@shared/schema';

interface PastedContent {
  text: string;
  startIndex: number;
  endIndex: number;
  timestamp: Date;
}

interface WritingWorkspaceProps {
  sessionId: number;
  assignmentId?: number;
  initialSession?: any; // Pre-loaded session data
}

export default function WritingWorkspace({ sessionId: initialSessionId, assignmentId, initialSession }: WritingWorkspaceProps) {
  const [sessionId, setSessionId] = useState(initialSessionId);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [pastedContents, setPastedContents] = useState<PastedContent[]>([]);
  const [wordCount, setWordCount] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [showSpellCheck, setShowSpellCheck] = useState(false);
  const [spellCheckActive, setSpellCheckActive] = useState(false);
  const [headerFooterSettings, setHeaderFooterSettings] = useState({
    header: "",
    footer: "",
    pageNumbers: false
  });
  const [viewMode, setViewMode] = useState<'pages'>('pages');

  const contentRef = useRef<HTMLTextAreaElement>(null);
  const formatRef = useRef<((command: string, value?: string) => void) | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  // Use pre-loaded session data if available, otherwise fetch from API
  const { data: session, isLoading: sessionLoading, refetch: refetchSession } = useQuery<WritingSession>({
    queryKey: ['/api/writing-sessions', sessionId, assignmentId],
    queryFn: async () => {
      if (sessionId && sessionId !== 0) {
        const response = await apiRequest("GET", `/api/writing-sessions/${sessionId}`);
        return response.json();
      } else if (assignmentId) {
        // Create or find session for this assignment
        const response = await apiRequest("GET", `/api/writing-sessions/0?assignmentId=${assignmentId}`);
        return response.json();
      }
      throw new Error('No valid session ID or assignment ID');
    },
    enabled: !!(sessionId > 0 && assignmentId && !initialSession), // Only query if valid session ID and no initial session
    initialData: initialSession, // Use pre-loaded session data if available
    retry: 3,
    retryDelay: 1000, // Wait 1 second between retries to allow database transaction to complete
  });

  // Get assignment data to check copy-paste permissions
  const { data: assignment } = useQuery<Assignment>({
    queryKey: [`/api/assignments/${assignmentId}`],
    enabled: !!assignmentId,
  });

  // Create session mutation
  const createSessionMutation = useMutation({
    mutationFn: async (data: { title: string; content: string; assignmentId: number; pastedContent: PastedContent[] }) => {
      const response = await apiRequest("POST", "/api/writing-sessions", {
        assignmentId: data.assignmentId,
        title: data.title,
        content: data.content,
        pastedContent: data.pastedContent,
        wordCount: data.content.split(/\s+/).filter(word => word.length > 0).length,
        status: "draft",
        userId: 1, // Current user ID
      });
      return response.json();
    },
    onSuccess: (newSession) => {
      console.log('New session created:', newSession.id);
      setSessionId(newSession.id);
      setLastSaved(new Date());
      setIsSaving(false);
      
      // Update URL to include the new session ID
      window.history.replaceState({}, '', `/assignment/${assignmentId}/session/${newSession.id}`);
      
      // Cache the new session data with current content to prevent retrieval issues
      const sessionWithContent = {
        ...newSession,
        title: title || newSession.title || "",
        content: content || newSession.content || "",
        pastedContent: pastedContents || []
      };
      
      // Set the cached data for multiple query keys to ensure it's available
      queryClient.setQueryData(['/api/writing-sessions', newSession.id], sessionWithContent);
      queryClient.setQueryData(['/api/writing-sessions', newSession.id, assignmentId], sessionWithContent);
      
      // Disable queries temporarily to prevent 404 race conditions
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['/api/writing-sessions'] });
        queryClient.invalidateQueries({ queryKey: ['/api/student/writing-sessions'] });
        queryClient.invalidateQueries({ queryKey: ['/api/student/assignments'] });
      }, 2000); // Wait 2 seconds before allowing fresh queries
    },
    onError: (error) => {
      console.error('Error creating session:', error);
      setIsSaving(false);
      toast({
        title: "Save failed",
        description: "There was an error saving your work. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Update session mutation
  const updateSessionMutation = useMutation({
    mutationFn: async (data: { title: string; content: string; pastedContent: PastedContent[] }) => {
      const currentSessionId = session?.id || sessionId;
      console.log('Saving to session ID:', currentSessionId);
      const response = await apiRequest("PATCH", `/api/writing-sessions/${currentSessionId}`, {
        title: data.title,
        content: data.content,
        pastedContent: data.pastedContent,
        wordCount: data.content.split(/\s+/).filter(word => word.length > 0).length,
      });
      return response.json();
    },
    onSuccess: (savedSession) => {
      setLastSaved(new Date());
      setIsSaving(false);
      console.log('✓ Save successful - Session ID:', savedSession?.id, 'Content length:', savedSession?.content?.length);
      console.log('✓ Saved content preview:', savedSession?.content?.substring(0, 100) + '...');
      
      // Force refresh all related queries to prevent stale data
      queryClient.invalidateQueries({ queryKey: ['/api/writing-sessions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/student/writing-sessions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/student/assignments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/student/classes'] });
      
      // Update local session reference if we got updated data
      if (savedSession && savedSession.id === sessionId) {
        console.log('✓ Syncing session data after save');
      }
    },
    onError: (error) => {
      setIsSaving(false);
      console.error('Save failed:', error);
      
      // Don't show error toast if it's just a network timeout or connection issue
      // The emergency save system will handle these cases
      if (!error.message.includes('fetch') && !error.message.includes('network')) {
        toast({
          title: "Save Error",
          description: "There was an issue saving your work. Your content is being preserved.",
          variant: "destructive",
        });
      }
    },
  });



  // Submit session mutation
  const submitSessionMutation = useMutation({
    mutationFn: async () => {
      console.log('Making submit API call...');
      const response = await apiRequest("PATCH", `/api/writing-sessions/${sessionId}`, {
        status: "submitted",
        submittedAt: new Date().toISOString(),
        title,
        content,
        pastedContent: pastedContents,
        wordCount,
      });
      console.log('Submit response status:', response.status);
      if (response.ok) {
        return { success: true };
      } else {
        throw new Error(`Submit failed with status ${response.status}`);
      }
    },
    onSuccess: (data) => {
      console.log('Submit successful:', data);
      toast({
        title: "Submission Successful! 🎉",
        description: "Your assignment has been delivered to your teacher for review.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/writing-sessions', sessionId] });
      queryClient.invalidateQueries({ queryKey: ['/api/student/writing-sessions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/student/assignments'] });
      
      // Redirect to dashboard after 2 seconds
      setTimeout(() => {
        console.log('Redirecting to student dashboard...');
        window.location.href = '/student';
      }, 2000);
    },
    onError: (error) => {
      console.log('Submit error:', error);
      toast({
        title: "Submission failed",
        description: "There was an error submitting your work. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Manual save function (always works regardless of auto-save state)
  const handleManualSave = React.useCallback(() => {
    console.log('Manual save triggered');
    setIsSaving(true);
    
    const currentSessionId = session?.id || sessionId;
    if (currentSessionId && currentSessionId !== 0) {
      console.log('Manually updating existing session:', currentSessionId);
      updateSessionMutation.mutate({ title, content, pastedContent: pastedContents });
    } else if (assignmentId && (title.trim() || content.trim())) {
      console.log('Manually creating new session for assignment:', assignmentId);
      createSessionMutation.mutate({ 
        assignmentId, 
        title, 
        content,
        pastedContent: pastedContents 
      });
    } else {
      setIsSaving(false);
      console.log('No valid session or assignment to save');
    }
  }, [title, content, pastedContents, session, sessionId, assignmentId, updateSessionMutation, createSessionMutation]);

  // Auto-save function (checks for changes and delays)
  const handleAutoSave = React.useCallback(() => {
    // Don't save if content is just whitespace or minimal content
    const hasSubstantialContent = title.trim().length > 0 || content.trim().length > 2;
    const hasChanges = title !== session?.title || content !== session?.content || pastedContents.length !== (session?.pastedContent as PastedContent[] || []).length;
    
    if (!isSaving && hasChanges && hasSubstantialContent) {
      setIsSaving(true);
      console.log('=== AUTO-SAVE TRIGGERED ===');
      console.log('Session ID:', session?.id, 'URL SessionId:', sessionId, 'Assignment ID:', assignmentId);
      console.log('Content stats:', {
        titleLength: title.length,
        contentLength: content.length,
        wordCount: content.split(/\s+/).filter(word => word.length > 0).length,
        pastedContentCount: pastedContents.length
      });
      console.log('Content preview (first 100 chars):', content.substring(0, 100) + '...');
      console.log('Session content preview:', session?.content?.substring(0, 100) + '...');
      
      const currentSessionId = session?.id || sessionId;
      if (currentSessionId && currentSessionId !== 0) {
        console.log('✓ Updating existing session:', currentSessionId, 'with', content.length, 'characters');
        updateSessionMutation.mutate({ title, content, pastedContent: pastedContents });
      } else if (assignmentId && hasSubstantialContent && !createSessionMutation.isPending) {
        console.log('✓ Creating new session for assignment:', assignmentId, 'with', content.length, 'characters');
        createSessionMutation.mutate({ 
          assignmentId, 
          title, 
          content,
          pastedContent: pastedContents 
        });
      } else {
        setIsSaving(false);
        console.log('✗ Save cancelled - currentSessionId:', currentSessionId, 'assignmentId:', assignmentId, 'createPending:', createSessionMutation.isPending);
      }
      console.log('=== END AUTO-SAVE DEBUG ===');
    } else {
      console.log('Auto-save skipped:', { isSaving, hasChanges, hasSubstantialContent });
    }
  }, [title, content, pastedContents, session, sessionId, assignmentId, isSaving, updateSessionMutation, createSessionMutation]);

  // Load session data and update sessionId if a new session was created
  useEffect(() => {
    if (session) {
      console.log('=== SESSION LOADING DEBUG ===');
      console.log('Session data received:', {
        id: session.id,
        title: session.title,
        contentLength: session.content?.length || 0,
        wordCount: session.wordCount,
        status: session.status,
        contentPreview: session.content?.substring(0, 100) + '...'
      });
      console.log('Current editor state:', {
        titleLength: title.length,
        contentLength: content.length,
        currentSessionId: sessionId
      });
      
      // Only load session content if this is the initial load (when we don't have any current content)
      const hasCurrentContent = title.trim() || content.trim();
      console.log('Has current content:', hasCurrentContent);
      
      // Always sync with session data to ensure we have the most current content
      console.log('✓ Syncing with session content');
      setTitle(session.title || "");
      setContent(session.content || "");
      setPastedContents(session.pastedContent as PastedContent[] || []);
      
      // Calculate actual word count from content
      const actualWordCount = (session.content || "").split(/\s+/).filter(word => word.length > 0).length;
      setWordCount(actualWordCount);
      
      console.log('Content sync complete:', {
        contentLength: (session.content || "").length,
        actualWordCount,
        dbWordCount: session.wordCount
      });
      
      // If we got a new session with a different ID, update our session ID state
      if (sessionId === 0 && session.id && session.id !== 0) {
        console.log('✓ Updating session ID from 0 to', session.id);
        setSessionId(session.id);
        window.history.replaceState({}, '', `/assignment/${assignmentId}/session/${session.id}`);
        // Invalidate queries to use new session ID
        queryClient.invalidateQueries({ queryKey: ['/api/writing-sessions'] });
      }
      console.log('=== END SESSION LOADING DEBUG ===');
    }
  }, [session, sessionId, assignmentId, queryClient]);

  // Save before page unload to prevent data loss
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      console.log('=== PAGE UNLOAD - EMERGENCY SAVE ===');
      const hasUnsavedChanges = title !== session?.title || content !== session?.content;
      
      if (hasUnsavedChanges && (title.trim() || content.trim())) {
        console.log('Triggering emergency save before page unload');
        
        // Synchronous save attempt for page unload
        const currentSessionId = session?.id || sessionId;
        if (currentSessionId && currentSessionId !== 0) {
          navigator.sendBeacon('/api/emergency-save', JSON.stringify({
            sessionId: currentSessionId,
            title,
            content,
            wordCount: content.split(/\s+/).filter(word => word.length > 0).length
          }));
        }
        
        // Show browser warning
        e.preventDefault();
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
        return 'You have unsaved changes. Are you sure you want to leave?';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [title, content, session, sessionId]);

  // Auto-save functionality with improved session handling
  useEffect(() => {
    // Don't set up auto-save timer if spell check is active
    if (spellCheckActive) {
      console.log('Auto-save disabled during spell check');
      return;
    }

    const timer = setTimeout(() => {
      if (title || content) {
        handleAutoSave();
      }
    }, 2000); // Reduced to 2 seconds for better data protection

    return () => clearTimeout(timer);
  }, [title, content, session, sessionId, assignmentId, isSaving, pastedContents, updateSessionMutation, createSessionMutation]);

  // Sync sessionId when new session is created
  useEffect(() => {
    if (session && session.id && sessionId !== session.id && session.id > 0) {
      console.log('Syncing session ID from:', sessionId, 'to:', session.id);
      setSessionId(session.id);
    }
  }, [session]);

  // Update word count
  useEffect(() => {
    const words = content.split(/\s+/).filter(word => word.length > 0).length;
    setWordCount(words);
  }, [content]);

  const handlePasteDetected = (pastedContent: PastedContent) => {
    console.log('Paste detected:', pastedContent);
    setPastedContents(prev => [...prev, pastedContent]);
    
    // Don't update content here - the textarea handles paste naturally
    // Just track it for teacher review
    
    // Highlight pasted content in red for teacher view
    if (contentRef.current) {
      // This would be enhanced with proper text highlighting
      toast({
        title: "Content Pasted",
        description: `Pasted ${pastedContent.text.length} characters - tracked for teacher review`,
        variant: "default",
      });
    }
  };

  const handleSubmit = () => {
    console.log('Submit clicked! Title:', title, 'Word count:', wordCount);
    
    if (!title.trim()) {
      toast({
        title: "Title required",
        description: "Please add a title to your work before submitting.",
        variant: "destructive",
      });
      return;
    }



    console.log('Submitting assignment...');
    submitSessionMutation.mutate();
  };



  if (sessionLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Clock className="h-8 w-8 animate-spin mx-auto mb-2" />
          <p>Loading your work...</p>
        </div>
      </div>
    );
  }

  // Wait for assignment data to load before determining permissions
  const allowCopyPaste = assignment?.allowCopyPaste === true;
  const isSubmitted = session?.status === "submitted";
  const isGraded = session?.status === "graded";

  // Debug copy-paste permissions
  console.log('Copy-paste permissions:', {
    assignment: assignment?.allowCopyPaste,
    computed: allowCopyPaste,
    assignmentData: assignment,
    assignmentLoaded: !!assignment,
    assignmentId: assignmentId
  });

  // Show feedback viewer for graded assignments
  if (isGraded && session) {
    return <FeedbackViewer session={session} />;
  }

  return (
    <div className="h-screen flex">
      {/* Main Writing Area - Horizontal Scrolling */}
      <div className="flex-1 flex flex-col h-screen">

        {/* Header - Fixed */}
        <div className="border-b bg-white p-4 flex-shrink-0">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <FileText className="h-5 w-5 text-gray-500" />
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter document title..."
                className="text-lg font-medium border-none shadow-none px-0"
                disabled={isSubmitted || isGraded}
              />
            </div>
            <div className="flex items-center gap-4">
              <div className="text-sm text-gray-500">
                {wordCount} words
              </div>
              {lastSaved && (
                <div className="text-sm text-gray-500">
                  Saved {lastSaved.toLocaleTimeString()}
                </div>
              )}
              {pastedContents.length > 0 && (
                <Badge variant="secondary" className="bg-red-100 text-red-700">
                  <Shield className="h-3 w-3 mr-1" />
                  {pastedContents.length} paste{pastedContents.length !== 1 ? 's' : ''}
                </Badge>
              )}
            </div>
          </div>



          {/* Enhanced Toolbar */}
          <div className="flex items-center justify-between">
            <EnhancedToolbar
              onFormatting={(command, value) => {
                console.log('Toolbar formatting called:', command, value);
                if (formatRef.current) {
                  console.log('Calling formatRef.current with:', command, value);
                  formatRef.current(command, value);
                } else {
                  console.log('formatRef.current is null');
                }
              }}
              onSave={handleManualSave}
              isSaving={isSaving}
              onSpellCheck={() => setShowSpellCheck(true)}
              onHeaderFooterChange={setHeaderFooterSettings}
            />
            
            {/* View Info */}
            <div className="flex items-center gap-2">
              <div className="text-sm text-gray-600 bg-blue-50 px-3 py-1 rounded-full">
                Document View
              </div>
            </div>
          </div>
        </div>

        {/* Writing Content - Conditional View Based on Mode */}
        <div className="flex-1 overflow-auto">
          <CopyPasteDetector
            allowCopyPaste={allowCopyPaste}
            onPasteDetected={handlePasteDetected}
            className="min-h-full"
          >
            <WordStylePagesEditor
              content={content}
              onContentChange={(newContent) => {
                console.log('Content changed from pages view:', newContent);
                setContent(newContent);
              }}
              studentName={session?.title || "Student Document"}
              assignmentTitle={assignment?.title}
              showPageNumbers={headerFooterSettings.pageNumbers}
              showHeader={!!headerFooterSettings.header}
            />
          </CopyPasteDetector>
            <CopyPasteDetector
              allowCopyPaste={allowCopyPaste}
              onPasteDetected={handlePasteDetected}
              className="min-h-full"
            >
              <div className="relative w-full min-h-full">
                {/* Enhanced Document View with Page Progression */}
                <div className="p-6 min-h-full">
                  {/* Document Status Bar */}
                  <div className="mb-4 bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <FileText className="h-5 w-5 text-gray-600" />
                        <span className="text-sm font-medium text-gray-700">
                          Document: {Math.ceil(wordCount / 500) || 1} page{Math.ceil(wordCount / 500) !== 1 ? 's' : ''}
                        </span>
                        <span className="text-sm text-gray-500">
                          {wordCount} words
                        </span>
                        {wordCount > 0 && (
                          <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
                            Currently on page {Math.ceil(wordCount / 500)}
                          </span>
                        )}
                      </div>
                      
                      <div className="text-xs text-gray-500">
                        {viewMode === 'document' ? 'Page breaks every 500 words' : 'Standard editing mode'}
                      </div>
                    </div>
                  </div>
                
                <div className="relative">
                  <PageBasedEditor
                    content={content}
                    onContentChange={(newContent) => {
                      console.log('Content changed from document view:', newContent);
                      setContent(newContent);
                    }}
                    disabled={isSubmitted || isGraded}
                    onFormatRef={formatRef}
                    placeholder="Start writing your assignment here..."
                    wordsPerPage={500}
                    headerFooterSettings={headerFooterSettings}
                  />
                  
                  {/* Enhanced Page Break Indicators */}
                  {(() => {
                    const words = content.split(/\s+/).filter(word => word.length > 0);
                    const wordsPerPage = 500;
                    const totalPages = Math.ceil(words.length / wordsPerPage) || 1;
                    const pageBreaks = [];
                    
                    for (let i = 1; i < totalPages; i++) {
                      const pageBreakPosition = i * wordsPerPage;
                      const percentage = (pageBreakPosition / words.length) * 100;
                      
                      pageBreaks.push(
                        <div
                          key={i}
                          className="absolute left-0 right-0 border-t-2 border-dashed border-blue-400 bg-blue-50 opacity-80"
                          style={{ top: `${Math.min(percentage, 85)}%` }}
                        >
                          <div className="bg-blue-500 text-white text-xs px-3 py-1 rounded-r-md inline-block shadow-sm">
                            Page {i + 1} starts here (500 words per page)
                          </div>
                        </div>
                      );
                    }
                    
                    return pageBreaks;
                  })()}
                </div>
                
                {/* Spell Check Overlay */}
                {showSpellCheck && (
                  <div className="absolute inset-0 bg-white z-50 p-4">
                    <InlineSpellCheck
                      content={content}
                      onContentChange={(newContent) => {
                        console.log('Content changed from spell check:', newContent);
                        setContent(newContent);
                      }}
                      isActive={showSpellCheck}
                      onClose={() => setShowSpellCheck(false)}
                      disabled={isSubmitted || isGraded}
                      placeholder="Start writing your assignment here..."
                      onSpellCheckStatusChange={setSpellCheckActive}
                    />
                  </div>
                )}
              </div>
            </div>
          </CopyPasteDetector>
          )}
        </div>

        {/* Footer Actions */}
        <div className="border-t bg-white p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {!allowCopyPaste && (
                <Badge variant="outline" className="border-red-200 text-red-700">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Copy & Paste Disabled
                </Badge>
              )}
              {allowCopyPaste && (
                <Badge variant="outline" className="border-yellow-200 text-yellow-700">
                  <Shield className="h-3 w-3 mr-1" />
                  Copy & Paste Tracked
                </Badge>
              )}
            </div>
            
            <div className="flex gap-3">
              <Button
                onClick={() => setLocation('/student')}
                variant="outline"
                className="gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Dashboard
              </Button>
              
              <Button
                onClick={handleManualSave}
                variant="outline"
                disabled={isSubmitted || updateSessionMutation.isPending}
                className="gap-2"
              >
                <Save className="h-4 w-4" />
                {updateSessionMutation.isPending ? "Saving..." : "Save"}
              </Button>
              
              {!isSubmitted && (
                <Button
                  onClick={handleSubmit}
                  disabled={submitSessionMutation.isPending}
                  className="gap-2"
                >
                  <Send className="h-4 w-4" />
                  {submitSessionMutation.isPending ? "Submitting..." : "Submit"}
                </Button>
              )}
              
              {isSubmitted && (
                <Badge variant="outline" className="border-green-200 text-green-700 px-4 py-2">
                  Submitted ✓
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* AI Assistant Sidebar - Vertical Scrolling Only */}
      <div className="w-80 border-l bg-gray-50 h-screen flex flex-col">
        <AiAssistant 
          sessionId={sessionId}
          assignmentType={assignment?.aiPermissions}
          currentContent={content}
        />
      </div>


    </div>
  );
}