import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Settings, Send, AlertTriangle, Shield, FileText, MessageSquare, Download } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import CopyPasteDetector from './copy-paste-detector';
import WordStylePagesEditor from './word-style-pages-editor';
import AiChatViewer from './ai-chat-viewer';
import DocumentDownload from './document-download';

interface PastedContent {
  text: string;
  startIndex: number;
  endIndex: number;
  timestamp: Date;
}

interface WritingWorkspaceProps {
  sessionId: number;
  assignmentId?: number;
  initialSession?: any;
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

  const contentRef = useRef<HTMLTextAreaElement>(null);
  const formatRef = useRef<((command: string, value?: string) => void) | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  // Auto-save functionality
  const autoSaveMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch(`/api/writing-sessions/${sessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error('Failed to save');
      return response.json();
    },
    onSuccess: () => {
      setIsSaving(false);
      setLastSaved(new Date());
      queryClient.invalidateQueries({ queryKey: ['writing-session', sessionId] });
      queryClient.invalidateQueries({ queryKey: ['/api/student/writing-sessions'] });
    },
    onError: (error) => {
      setIsSaving(false);
      console.error('Auto-save failed:', error);
    }
  });

  const saveSession = useCallback(async () => {
    if (isSaving || autoSaveMutation.isPending) return;

    const hasContent = content.trim().length > 0 || title.trim().length > 0;
    if (!hasContent) return;

    const words = content.split(/\s+/).filter(word => word.length > 0);
    const currentWordCount = words.length;

    const hasChanges = currentWordCount !== wordCount || content !== (session?.content || '');
    if (!hasChanges) return;

    try {
      setIsSaving(true);
      console.log('Auto-saving session:', sessionId, 'with data:', ['title', 'content', 'pastedContent', 'wordCount']);
      
      await autoSaveMutation.mutateAsync({
        title: title.trim(),
        content: content,
        pastedContent: pastedContents,
        wordCount: currentWordCount
      });

      console.log('✓ Save successful - Session ID:', sessionId, 'Content length:', content.length);
      console.log('✓ Saved content preview:', content.substring(0, 100) + '...');
      console.log('✓ Syncing session data after save');
      
      setWordCount(currentWordCount);
    } catch (error) {
      console.error('Save failed:', error);
    }
  }, [content, title, pastedContents, wordCount, sessionId, isSaving, autoSaveMutation]);

  // Auto-save effect
  useEffect(() => {
    const timer = setTimeout(() => {
      const hasSubstantialContent = content.trim().length > 0 || title.trim().length > 0;
      const hasChanges = content !== (session?.content || '') || title !== (session?.title || '');
      
      console.log('Auto-save check:', {
        isSaving,
        hasChanges,
        hasSubstantialContent
      });

      if (hasSubstantialContent && hasChanges && !isSaving) {
        saveSession();
      } else {
        console.log('Auto-save skipped:', {
          isSaving,
          hasChanges,
          hasSubstantialContent
        });
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [content, title, saveSession, isSaving]);

  // Fetch session data
  const { data: session, isLoading: sessionLoading } = useQuery({
    queryKey: ['writing-session', sessionId],
    queryFn: async () => {
      const response = await fetch(`/api/writing-sessions/${sessionId}`);
      if (!response.ok) throw new Error('Failed to fetch session');
      return response.json();
    },
    enabled: !!sessionId
  });

  // Fetch assignment data
  const { data: assignment, isLoading: assignmentLoading } = useQuery({
    queryKey: ['assignment', assignmentId],
    queryFn: async () => {
      const response = await fetch(`/api/assignments/${assignmentId}`);
      if (!response.ok) throw new Error('Failed to fetch assignment');
      return response.json();
    },
    enabled: !!assignmentId
  });

  // Sync with session data when it loads
  useEffect(() => {
    if (session && !sessionLoading) {
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

      const currentContent = content || '';
      console.log('Has current content:', currentContent.substring(0, 50));

      if (session.content && session.content !== currentContent) {
        console.log('✓ Syncing with session content');
        setContent(session.content);
        setTitle(session.title || '');
        setPastedContents(session.pastedContent || []);
        
        const words = (session.content || '').split(/\s+/).filter((word: string) => word.length > 0);
        const actualWordCount = words.length;
        setWordCount(actualWordCount);
        
        console.log('Content sync complete:', {
          contentLength: session.content.length,
          actualWordCount,
          dbWordCount: session.wordCount
        });
      }
      console.log('=== END SESSION LOADING DEBUG ===');
    }
  }, [session, sessionLoading, sessionId]);

  // Copy-paste permissions
  const allowCopyPaste = assignment?.allowCopyPaste ?? true;
  const isSubmitted = session?.status === 'submitted';
  const isGraded = session?.status === 'graded';

  // Handle paste detection
  const handlePasteDetected = (pastedContent: PastedContent) => {
    setPastedContents(prev => [...prev, pastedContent]);
    
    if (!allowCopyPaste) {
      toast({
        title: "Copy & Paste Detected",
        description: "This action has been logged for academic integrity review.",
        variant: "destructive",
      });
    }
  };

  // Handle before unload
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      const hasUnsavedChanges = content !== (session?.content || '') || title !== (session?.title || '');
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [content, title, session]);

  // Submit assignment
  const submitMutation = useMutation({
    mutationFn: async () => {
      await saveSession();
      const response = await fetch(`/api/writing-sessions/${sessionId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      if (!response.ok) throw new Error('Failed to submit');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Assignment Submitted",
        description: "Your work has been submitted successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['writing-session', sessionId] });
    },
    onError: (error) => {
      toast({
        title: "Submission Failed",
        description: "Please try again.",
        variant: "destructive",
      });
    }
  });

  if (sessionLoading || assignmentLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading your writing session...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              onClick={() => setLocation('/student')}
              variant="ghost"
              size="sm"
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Button>
            
            <div className="text-sm text-gray-500">
              Assignment: {assignment?.title || 'Untitled'}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Document title..."
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
            
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <Settings className="h-4 w-4" />
                  Settings
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Document Settings</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="header">Header Text</Label>
                    <Input
                      id="header"
                      value={headerFooterSettings.header}
                      onChange={(e) => setHeaderFooterSettings(prev => ({ ...prev, header: e.target.value }))}
                      placeholder="Enter header text..."
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="footer">Footer Text</Label>
                    <Input
                      id="footer"
                      value={headerFooterSettings.footer}
                      onChange={(e) => setHeaderFooterSettings(prev => ({ ...prev, footer: e.target.value }))}
                      placeholder="Enter footer text..."
                    />
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="pageNumbers"
                      checked={headerFooterSettings.pageNumbers}
                      onCheckedChange={(checked) => setHeaderFooterSettings(prev => ({ ...prev, pageNumbers: checked }))}
                    />
                    <Label htmlFor="pageNumbers">Show page numbers</Label>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      {/* Writing Content - Pages View */}
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
              Exit
            </Button>

            <DocumentDownload 
              content={content}
              studentName="Student"
              assignmentTitle={assignment?.title}
            />

            <AiChatViewer 
              sessionId={sessionId}
              studentName="Student"
            />

            {!isSubmitted && !isGraded && (
              <Button
                onClick={() => submitMutation.mutate()}
                disabled={submitMutation.isPending || !content.trim()}
                className="gap-2"
              >
                <Send className="h-4 w-4" />
                {submitMutation.isPending ? 'Submitting...' : 'Submit Assignment'}
              </Button>
            )}

            {(isSubmitted || isGraded) && (
              <Badge variant="secondary" className="px-4 py-2">
                {isGraded ? 'Graded' : 'Submitted'}
              </Badge>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}