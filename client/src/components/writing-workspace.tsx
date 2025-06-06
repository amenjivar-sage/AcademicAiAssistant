
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
import { ArrowLeft, Settings, Send, AlertTriangle, Shield, FileText, MessageSquare, Download, Save, GraduationCap, Trophy, Type, Bold, Italic, Underline, ChevronDown, ChevronUp, SpellCheck } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import CopyPasteDetector from './copy-paste-detector';
import RichTextEditor, { RichTextEditorHandle } from './rich-text-editor';
import DocumentDownload from './document-download';
import AiAssistant from './ai-assistant';
import { PDFExport } from './pdf-export';
import BubbleSpellCheckPanel from './bubble-spell-check-panel';

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
  const [showAiSidebar, setShowAiSidebar] = useState(false);
  const [isAiSidebarMinimized, setIsAiSidebarMinimized] = useState(false);
  const [headerFooterSettings, setHeaderFooterSettings] = useState({
    header: "",
    footer: "",
    pageNumbers: false
  });
  const [showFormattingToolbox, setShowFormattingToolbox] = useState(false);
  const [isFormattingMinimized, setIsFormattingMinimized] = useState(false);
  const [selectedText, setSelectedText] = useState('');
  const [isSpellCheckActive, setIsSpellCheckActive] = useState(false);
  const [spellErrors, setSpellErrors] = useState<any[]>([]);

  const contentRef = useRef<RichTextEditorHandle>(null);
  const formatRef = useRef<((command: string, value?: string) => void) | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  // Create session mutation
  const createSessionMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/writing-sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assignmentId: assignmentId,
          title: 'Untitled Document',
          content: '',
          pastedContent: [],
          wordCount: 0
        })
      });
      if (!response.ok) throw new Error('Failed to create session');
      return response.json();
    },
    onSuccess: (newSession) => {
      setSessionId(newSession.id);
      queryClient.invalidateQueries({ queryKey: ['/api/student/writing-sessions'] });
    }
  });



  const saveSession = useCallback(async () => {
    if (isSaving) return;

    const hasContent = content.trim().length > 0 || title.trim().length > 0;
    if (!hasContent) return;

    // Enhanced word count calculation - remove HTML tags and count actual words
    const cleanContent = content
      .replace(/<[^>]*>/g, ' ') // Remove HTML tags
      .replace(/&nbsp;/g, ' ') // Replace non-breaking spaces
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
    
    const words = cleanContent.split(/\s+/).filter((word: string) => word.length > 0);
    const currentWordCount = words.length;

    console.log('Word count calculation:', {
      originalLength: content.length,
      cleanedLength: cleanContent.length,
      wordCount: currentWordCount,
      contentPreview: cleanContent.substring(0, 100) + '...'
    });

    try {
      setIsSaving(true);
      
      // If no session exists, create one first
      let currentSessionId = sessionId;
      if (!sessionId || sessionId === 0) {
        console.log('Creating new session for assignment:', assignmentId);
        const newSession = await createSessionMutation.mutateAsync();
        currentSessionId = newSession.id;
        console.log('Created new session with ID:', currentSessionId);
      }
      
      console.log('Auto-saving session:', currentSessionId, 'Words:', currentWordCount, 'Content length:', content.length);
      console.log('Copy-paste data being saved:', pastedContents.length, 'items:', pastedContents);
      
      const response = await fetch(`/api/writing-sessions/${currentSessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          content: content, // Save full content without truncation
          pastedContent: pastedContents,
          wordCount: currentWordCount
        })
      });
      
      if (!response.ok) throw new Error('Failed to save');

      console.log('✓ Save successful - Session ID:', currentSessionId, 'Content length:', content.length);
      console.log('✓ Saved content preview:', content.substring(0, 100) + '...');
      console.log('✓ Syncing session data after save');
      
      setWordCount(currentWordCount);
      setIsSaving(false);
      setLastSaved(new Date());
      queryClient.invalidateQueries({ queryKey: ['writing-session', currentSessionId] });
      queryClient.invalidateQueries({ queryKey: ['/api/student/writing-sessions'] });
    } catch (error) {
      console.error('Save failed:', error);
      setIsSaving(false);
    }
  }, [content, title, pastedContents, wordCount, sessionId, isSaving, assignmentId, createSessionMutation, queryClient]);

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

  // Fetch inline comments for graded assignments
  const { data: inlineComments = [] } = useQuery({
    queryKey: [`/api/sessions/${sessionId}/comments`],
    enabled: !!sessionId && session?.status === 'graded',
    retry: false,
  });

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
  }, [content, title, saveSession, isSaving, session]);

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
        // Properly handle pasted content with timestamp conversion
        const pastedData = session.pastedContent || [];
        const formattedPastedContent = pastedData.map((paste: any) => ({
          ...paste,
          timestamp: new Date(paste.timestamp)
        }));
        setPastedContents(formattedPastedContent);
        console.log('Loaded copy-paste data:', formattedPastedContent.length, 'items');
        
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
    console.log('Handling paste detection:', pastedContent);
    setPastedContents(prev => {
      const updated = [...prev, pastedContent];
      console.log('Total pasted content instances:', updated.length);
      return updated;
    });
    
    if (!allowCopyPaste) {
      toast({
        title: "Copy & Paste Detected",
        description: "This action has been logged for academic integrity review.",
        variant: "destructive",
      });
    } else {
      // Show notification that paste was tracked
      toast({
        title: "Copy & Paste Tracked",
        description: `Pasted ${pastedContent.text.length} characters - recorded for teacher review`,
        variant: "default",
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

            {/* Formatting Toolbox */}
            {!showFormattingToolbox ? (
              <Button
                onClick={() => setShowFormattingToolbox(true)}
                variant="outline"
                size="sm"
                className="gap-2"
                title="Open Formatting Tools"
              >
                <Type className="h-4 w-4" />
              </Button>
            ) : (
              <div className="relative">
                <Card className="absolute right-0 top-full mt-2 w-64 shadow-lg border-gray-300 z-50">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-medium flex items-center">
                        <Type className="h-4 w-4 mr-2" />
                        {isFormattingMinimized ? "Format" : "Formatting Tools"}
                      </CardTitle>
                      <div className="flex items-center space-x-1">
                        <Button
                          onClick={() => setIsFormattingMinimized(!isFormattingMinimized)}
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0"
                          title={isFormattingMinimized ? "Expand" : "Minimize"}
                        >
                          {isFormattingMinimized ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />}
                        </Button>
                        <Button
                          onClick={() => setShowFormattingToolbox(false)}
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0"
                          title="Close"
                        >
                          ×
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  
                  {!isFormattingMinimized && (
                    <CardContent className="pt-0">
                      <div className="space-y-3">
                        {/* Text Formatting Section */}
                        <div>
                          <div className="text-xs font-medium text-gray-500 mb-2">Text Formatting</div>
                          <div className="flex flex-wrap gap-1">
                            <Button
                              onClick={() => {
                                if (contentRef.current) {
                                  const editor = contentRef.current.getEditor();
                                  if (editor) {
                                    const quillEditor = editor.getEditor();
                                    const selection = quillEditor.getSelection();
                                    if (selection && selection.length > 0) {
                                      // Apply formatting to selected text
                                      const currentFormat = quillEditor.getFormat(selection);
                                      quillEditor.formatText(selection.index, selection.length, 'bold', !currentFormat.bold);
                                    } else if (selection) {
                                      // Set formatting for cursor position (next typing)
                                      const currentFormat = quillEditor.getFormat(selection);
                                      quillEditor.format('bold', !currentFormat.bold);
                                    }
                                    // Refocus editor to maintain cursor position
                                    setTimeout(() => quillEditor.focus(), 0);
                                  }
                                }
                              }}
                              size="sm"
                              variant="outline"
                              className="h-8 w-8 p-0 hover:bg-blue-50"
                              disabled={false}
                              title="Bold (Ctrl+B)"
                            >
                              <Bold className="h-4 w-4" />
                            </Button>
                            <Button
                              onClick={() => {
                                if (contentRef.current) {
                                  const editor = contentRef.current.getEditor();
                                  if (editor) {
                                    const quillEditor = editor.getEditor();
                                    const selection = quillEditor.getSelection();
                                    if (selection && selection.length > 0) {
                                      // Apply formatting to selected text
                                      const currentFormat = quillEditor.getFormat(selection);
                                      quillEditor.formatText(selection.index, selection.length, 'italic', !currentFormat.italic);
                                    } else if (selection) {
                                      // Set formatting for cursor position (next typing)
                                      const currentFormat = quillEditor.getFormat(selection);
                                      quillEditor.format('italic', !currentFormat.italic);
                                    }
                                    // Refocus editor to maintain cursor position
                                    setTimeout(() => quillEditor.focus(), 0);
                                  }
                                }
                              }}
                              size="sm"
                              variant="outline"
                              className="h-8 w-8 p-0 hover:bg-blue-50"
                              disabled={false}
                              title="Italic (Ctrl+I)"
                            >
                              <Italic className="h-4 w-4" />
                            </Button>
                            <Button
                              onClick={() => {
                                if (contentRef.current) {
                                  const editor = contentRef.current.getEditor();
                                  if (editor) {
                                    const quillEditor = editor.getEditor();
                                    const selection = quillEditor.getSelection();
                                    if (selection && selection.length > 0) {
                                      // Apply formatting to selected text
                                      const currentFormat = quillEditor.getFormat(selection);
                                      quillEditor.formatText(selection.index, selection.length, 'underline', !currentFormat.underline);
                                    } else if (selection) {
                                      // Set formatting for cursor position (next typing)
                                      const currentFormat = quillEditor.getFormat(selection);
                                      quillEditor.format('underline', !currentFormat.underline);
                                    }
                                    // Refocus editor to maintain cursor position
                                    setTimeout(() => quillEditor.focus(), 0);
                                  }
                                }
                              }}
                              size="sm"
                              variant="outline"
                              className="h-8 w-8 p-0 hover:bg-blue-50"
                              disabled={false}
                              title="Underline (Ctrl+U)"
                            >
                              <Underline className="h-4 w-4" />
                            </Button>
                            
                            {/* Separator */}
                            <div className="w-px h-6 bg-gray-200"></div>
                            
                            {/* Spell Check Button */}
                            <Button
                              onClick={() => setIsSpellCheckActive(!isSpellCheckActive)}
                              size="sm"
                              variant={isSpellCheckActive ? "default" : "outline"}
                              className="h-8 w-8 p-0 hover:bg-blue-50"
                              title="Check spelling"
                            >
                              <SpellCheck className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        
                        {/* Status */}
                        <div className="text-xs text-gray-400 border-t pt-2">
                          {selectedText ? (
                            <span className="text-blue-600">
                              {selectedText.length} characters selected
                            </span>
                          ) : (
                            "Select text to format"
                          )}
                        </div>
                      </div>
                    </CardContent>
                  )}
                </Card>
              </div>
            )}

            {/* PDF Export */}
            <PDFExport 
              content={content}
              title={title || assignment?.title || "Document"}
            />

            <Button
              onClick={() => setShowAiSidebar(!showAiSidebar)}
              variant={showAiSidebar ? "default" : "outline"}
              size="sm"
              className="gap-2"
            >
              <MessageSquare className="h-4 w-4" />
              ZoË
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content Area with Sidebar */}
      <div className="flex-1 flex overflow-hidden">
        {/* Writing Content */}
        <div className="flex-1 overflow-auto">
          {/* Grading Feedback Banner for Graded Assignments */}
          {session?.status === 'graded' && (
            <div className="bg-green-100 border-2 border-green-500 p-8 m-4 shadow-xl rounded-lg">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <Trophy className="h-8 w-8 text-green-600 mt-1" />
                  <div>
                    <h3 className="text-xl font-bold text-green-800 mb-2">🎉 Assignment Graded!</h3>
                    <p className="text-green-700 mb-4 text-lg">Your teacher has reviewed and graded your work</p>
                    
                    {session.teacherFeedback && (
                      <div className="bg-white p-6 rounded-lg border-2 border-green-300 mb-4">
                        <div className="flex items-center gap-2 mb-3">
                          <GraduationCap className="h-5 w-5 text-green-600" />
                          <span className="font-bold text-green-800 text-lg">Teacher Feedback:</span>
                        </div>
                        <p className="text-gray-800 leading-relaxed text-lg">{session.teacherFeedback}</p>
                      </div>
                    )}
                    
                    <div className="text-base text-green-600 font-medium">
                      Graded on {session.updatedAt ? new Date(session.updatedAt).toLocaleDateString() : 'Unknown date'}
                    </div>
                  </div>
                </div>
                
                <div className="text-right">
                  <div className="bg-green-600 text-white px-6 py-3 rounded-lg font-bold text-2xl shadow-lg">
                    {session.grade}
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <CopyPasteDetector
            allowCopyPaste={allowCopyPaste}
            onPasteDetected={handlePasteDetected}
            className="min-h-full"
          >
            <RichTextEditor
              ref={contentRef}
              content={content}
              onContentChange={(newContent) => {
                console.log('Content changed from rich editor:', newContent);
                setContent(newContent);
              }}
              onTextSelection={setSelectedText}
              readOnly={session?.status === 'graded'}
              placeholder="Start writing your assignment..."
            />
          </CopyPasteDetector>
        </div>

        {/* AI Assistant Sidebar */}
        {showAiSidebar && (
          <div className={`${isAiSidebarMinimized ? 'w-16' : 'w-96'} border-l bg-white flex flex-col h-full transition-all duration-300`}>
            <div className="p-4 border-b">
              <div className="flex items-center justify-between">
                {!isAiSidebarMinimized && <h3 className="font-semibold">ZoË</h3>}
                <div className="flex gap-1">
                  {!isAiSidebarMinimized && (
                    <Button
                      onClick={() => setIsAiSidebarMinimized(true)}
                      variant="ghost"
                      size="sm"
                      title="Minimize ZoË"
                      className="hover:bg-gray-100"
                    >
                      ←
                    </Button>
                  )}
                  {isAiSidebarMinimized && (
                    <Button
                      onClick={() => setIsAiSidebarMinimized(false)}
                      variant="ghost"
                      size="sm"
                      title="Expand ZoË"
                      className="hover:bg-gray-100"
                    >
                      →
                    </Button>
                  )}
                  <Button
                    onClick={() => setShowAiSidebar(false)}
                    variant="ghost"
                    size="sm"
                    title="Close ZoË"
                    className="hover:bg-gray-100"
                  >
                    ×
                  </Button>
                </div>
              </div>
            </div>
            {!isAiSidebarMinimized && (
              <div className="flex-1 overflow-hidden">
                <AiAssistant
                  sessionId={sessionId}
                  currentContent={content}
                />
              </div>
            )}
            {isAiSidebarMinimized && (
              <div className="flex-1 flex flex-col items-center p-2 gap-2">
                <Button
                  onClick={() => setIsAiSidebarMinimized(false)}
                  variant="ghost"
                  size="sm"
                  className="w-full flex flex-col h-12"
                  title="Expand ZoË"
                >
                  <MessageSquare className="h-4 w-4" />
                  <span className="text-xs">ZoË</span>
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="border-t bg-white p-4 relative z-10">
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

            <Button
              onClick={saveSession}
              disabled={isSaving || (!content.trim() && !title.trim())}
              variant="outline"
              className="gap-2"
            >
              <Save className="h-4 w-4" />
              {isSaving ? 'Saving...' : 'Save'}
            </Button>

            <DocumentDownload 
              content={content}
              studentName="Student"
              assignmentTitle={assignment?.title}
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

      {/* Spell Check Panel */}
      {isSpellCheckActive && (
        <div className="fixed bottom-8 right-8 z-50">
          <BubbleSpellCheckPanel
            content={content}
            onContentChange={setContent}
            isOpen={isSpellCheckActive}
            onClose={() => setIsSpellCheckActive(false)}
            onSpellErrorsChange={(errors) => setSpellErrors(errors)}
          />
        </div>
      )}
    </div>
  );
}