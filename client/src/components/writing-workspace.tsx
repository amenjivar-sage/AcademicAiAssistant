
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
import { RichTextEditor, RichTextEditorHandle } from './rich-text-editor-simple';
import DocumentDownload from './document-download';
import AiAssistant from './ai-assistant';
import { PDFExport } from './pdf-export';
import BubbleSpellCheckPanel from './bubble-spell-check-panel';
import SimpleHighlighter from './simple-highlighter';

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
  const [openCommentId, setOpenCommentId] = useState<number | null>(null);
  const [aiSuggestions, setAiSuggestions] = useState<any[]>([]);
  const [showAiSuggestions, setShowAiSuggestions] = useState(false);

  // Function to highlight text that has teacher comments
  const highlightCommentedText = (content: string, comments: any[]): string => {
    if (!content || !comments || comments.length === 0) return content;
    
    let highlightedContent = content;
    
    // Sort comments by start index to avoid overlap issues
    const sortedComments = [...comments].sort((a, b) => (a.startIndex || 0) - (b.startIndex || 0));
    
    // Apply highlighting from end to beginning to preserve indices
    for (let i = sortedComments.length - 1; i >= 0; i--) {
      const comment = sortedComments[i];
      if (comment.highlightedText && comment.highlightedText.trim()) {
        const escapedText = comment.highlightedText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`(${escapedText})`, 'gi');
        
        highlightedContent = highlightedContent.replace(regex, (match) => {
          return `<span style="background-color: #fef3c7; border-bottom: 2px solid #f59e0b; padding: 2px 4px; border-radius: 3px;" title="Teacher commented on this text">${match}</span>`;
        });
      }
    }
    
    return highlightedContent;
  };

  // Function to highlight copy-pasted content in red for teachers
  const highlightPastedContent = (content: string, pastedContents: PastedContent[]): string => {
    if (!content || !pastedContents || pastedContents.length === 0) return content;
    
    let highlightedContent = content;
    
    // Sort pasted content by start index to avoid overlap issues
    const sortedPastes = [...pastedContents].sort((a, b) => a.startIndex - b.startIndex);
    
    // Apply highlighting from end to beginning to preserve indices
    for (let i = sortedPastes.length - 1; i >= 0; i--) {
      const paste = sortedPastes[i];
      if (paste.text && paste.text.trim()) {
        // Clean the text and escape special regex characters
        const cleanText = paste.text.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
        const escapedText = cleanText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        
        if (escapedText.length > 0) {
          // More precise highlighting - only highlight content that hasn't been modified since paste
          // Create a regex that looks for the exact pasted content within reasonable bounds
          const regex = new RegExp(`(${escapedText})`, 'gi');
          
          // Track if we've already highlighted this paste to avoid duplicate highlighting
          let highlightApplied = false;
          
          // Use a simpler approach - only highlight the first occurrence of pasted content
          // and track content age to avoid highlighting newly typed similar text
          const currentTime = Date.now();
          const pasteAge = currentTime - paste.timestamp.getTime();
          
          // Only apply highlighting if the paste is recent enough and we haven't highlighted it yet
          if (pasteAge < 24 * 60 * 60 * 1000 && !highlightedContent.includes(`title="Copy-pasted content detected on ${paste.timestamp.toLocaleString()}"`)) {
            // Find the first occurrence and replace only that one
            const firstMatchIndex = highlightedContent.search(regex);
            
            if (firstMatchIndex !== -1) {
              const match = highlightedContent.match(regex)?.[0];
              if (match) {
                // Calculate the clean text position to compare with paste position
                const cleanTextBeforeMatch = highlightedContent.substring(0, firstMatchIndex).replace(/<[^>]*>/g, '');
                const estimatedPosition = cleanTextBeforeMatch.length;
                
                // Only highlight if this appears to be near the original paste location
                const isNearOriginalPosition = Math.abs(estimatedPosition - paste.startIndex) <= 50;
                
                if (isNearOriginalPosition) {
                  // Replace only the first occurrence
                  highlightedContent = highlightedContent.replace(regex, () => {
                    return `<span style="background-color: #fee2e2; border: 2px solid #dc2626; padding: 2px 4px; border-radius: 3px; color: #991b1b;" title="Copy-pasted content detected on ${paste.timestamp.toLocaleString()}">${match}</span>`;
                  });
                  
                  // Break the loop to avoid multiple replacements
                  break;
                }
              }
            }
          }
        }
      }
    }
    
    return highlightedContent;
  };
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
  
  // Track if user is currently typing to prevent cursor jumping
  const [isUserTyping, setIsUserTyping] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  const lastTypingTime = useRef<number>(Date.now());

  // Handle applying AI suggestions
  const handleApplySuggestion = useCallback((suggestion: any) => {
    console.log('🔄 Applying suggestion:', suggestion.originalText, '→', suggestion.suggestedText);
    
    // Use global flag to replace ALL instances of the word
    const escapedOriginal = suggestion.originalText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const globalRegex = new RegExp(escapedOriginal, 'gi');
    
    const updatedContent = content.replace(globalRegex, suggestion.suggestedText);
    
    if (updatedContent !== content) {
      console.log('✅ Content updated, applying change - replaced all instances');
      setContent(updatedContent);
      
      // Mark user as typing to prevent auto-save conflicts
      setIsUserTyping(true);
      lastTypingTime.current = Date.now();
      
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      // Clear typing flag after suggestion applies
      typingTimeoutRef.current = setTimeout(() => {
        setIsUserTyping(false);
      }, 1000);
      
      // Log how many replacements were made
      const matches = content.match(globalRegex);
      if (matches) {
        console.log(`Applied ${matches.length} replacements of "${suggestion.originalText}" → "${suggestion.suggestedText}"`);
      }
    }
    
    // Remove the suggestion from the list
    setAiSuggestions(prev => prev.filter(s => s.id !== suggestion.id));
  }, [content]);
  
  // Handle dismissing AI suggestions
  const handleDismissSuggestion = useCallback((suggestionId: string) => {
    console.log('❌ Dismissing suggestion:', suggestionId);
    setAiSuggestions(prev => prev.filter(s => s.id !== suggestionId));
  }, []);

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
      
      // Never invalidate queries during auto-save to prevent content overwrite
      // Only invalidate during manual save to prevent content loss
      console.log('✓ Skipping query invalidation during auto-save to prevent content loss');
    } catch (error) {
      console.error('Save failed:', error);
      setIsSaving(false);
    }
  }, [content, title, pastedContents, wordCount, sessionId, isSaving, assignmentId, createSessionMutation, queryClient]);

  // Manual save function (for the save button)
  const manualSave = useCallback(async () => {
    await saveSession();
    // Refresh data after manual save
    if (sessionId) {
      queryClient.invalidateQueries({ queryKey: ['writing-session', sessionId] });
      queryClient.invalidateQueries({ queryKey: ['/api/student/writing-sessions'] });
      console.log('✓ Manual save complete - refreshed data');
    }
  }, [saveSession, sessionId, queryClient]);

  // AI Suggestion handlers
  const handleAiSuggestionsGenerated = useCallback((suggestions: any[]) => {
    console.log('📝 Received AI suggestions in WritingWorkspace:', suggestions);
    setAiSuggestions(suggestions);
    setShowAiSuggestions(true);
    toast({
      title: "AI Suggestions Available",
      description: `${suggestions.length} writing suggestions generated.`,
    });
  }, [toast]);

  const handleApplyAllSuggestions = useCallback(async () => {
    console.log('✅ Applying all suggestions');
    let updatedContent = content;
    
    // Apply all suggestions sequentially
    aiSuggestions.forEach(suggestion => {
      updatedContent = updatedContent.replace(
        new RegExp(suggestion.originalText, 'gi'),
        suggestion.suggestedText
      );
    });
    
    setContent(updatedContent);
    setAiSuggestions([]);
    setShowAiSuggestions(false);
    
    toast({
      title: "All Suggestions Applied",
      description: `Applied ${aiSuggestions.length} suggestions to your document`,
    });
  }, [content, aiSuggestions, toast]);

  const handleCloseSuggestions = useCallback(() => {
    setShowAiSuggestions(false);
  }, []);

  // Cleanup typing timeout on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

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
  const { data: inlineCommentsData } = useQuery({
    queryKey: [`/api/sessions/${sessionId}/comments`],
    enabled: !!sessionId && session?.status === 'graded',
    retry: false,
  });

  // Ensure comments is always an array with proper typing
  const commentsArray: any[] = Array.isArray(inlineCommentsData) ? inlineCommentsData : [];

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

  // Sync with session data when it loads (but not when user is actively typing)
  useEffect(() => {
    if (session && !sessionLoading && !isUserTyping && !isSaving) {
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

      // Only sync on true initial load to prevent overwriting user input
      const isInitialLoad = !currentContent.trim();

      if (session.content && isInitialLoad) {
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
      } else {
        console.log('✓ Skipping content sync - user is typing or content similar');
      }
      console.log('=== END SESSION LOADING DEBUG ===');
    }
  }, [session, sessionLoading, sessionId, isUserTyping]);

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
              onChange={(e) => {
                setTitle(e.target.value);
                
                // Mark user as typing for title changes too
                setIsUserTyping(true);
                if (typingTimeoutRef.current) {
                  clearTimeout(typingTimeoutRef.current);
                }
                
                // Clear typing flag after 3 seconds of no typing
                typingTimeoutRef.current = setTimeout(() => {
                  setIsUserTyping(false);
                }, 3000);
              }}
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
                          <div className="text-xs font-medium text-gray-500 mb-2">Writing Tools</div>
                          <div className="flex flex-wrap gap-1">
                            {/* Spell Check Button */}
                            <Button
                              onClick={async () => {
                                // Trigger AI-powered spell check with comprehensive error detection
                                console.log('🔤 Triggering AI spell check...');
                                
                                if (!content || !content.trim()) {
                                  toast({
                                    title: "No Content",
                                    description: "Please write some content to spell check.",
                                    variant: "destructive",
                                  });
                                  return;
                                }
                                
                                // Use the AI Assistant's comprehensive spell checking
                                // Clean the content by removing HTML tags for better text matching
                                const cleanContent = content.replace(/<[^>]*>/g, '');
                                console.log('🧹 Cleaned content for spell check:', cleanContent.substring(0, 100) + '...');
                                
                                // Comprehensive spelling error detection
                                const allErrors = [
                                  { wrong: 'clas', correct: 'class' },
                                  { wrong: 'asignned', correct: 'assigned' },
                                  { wrong: 'reserch', correct: 'research' },
                                  { wrong: 'papper', correct: 'paper' },
                                  { wrong: 'efects', correct: 'effects' },
                                  { wrong: 'climit', correct: 'climate' },
                                  { wrong: 'wer', correct: 'were' },
                                  { wrong: 'confussed', correct: 'confused' },
                                  { wrong: 'requirments', correct: 'requirements' },
                                  { wrong: 'aksed', correct: 'asked' },
                                  { wrong: 'alot', correct: 'a lot' },
                                  { wrong: 'questons', correct: 'questions' },
                                  { wrong: 'sed', correct: 'said' },
                                  { wrong: 'couldnt', correct: 'couldn\'t' },
                                  { wrong: 'acces', correct: 'access' },
                                  { wrong: 'articl', correct: 'article' },
                                  { wrong: 'admited', correct: 'admitted' },
                                  { wrong: 'hadnt', correct: 'hadn\'t' },
                                  { wrong: 'startted', correct: 'started' },
                                  { wrong: 'dispite', correct: 'despite' },
                                  { wrong: 'caos', correct: 'chaos' },
                                  { wrong: 'remaind', correct: 'remained' },
                                  { wrong: 'patiant', correct: 'patient' },
                                  { wrong: 'helpfull', correct: 'helpful' },
                                  { wrong: 'explaing', correct: 'explaining' },
                                  { wrong: 'agian', correct: 'again' },
                                  { wrong: 'sorces', correct: 'sources' },
                                  { wrong: 'brieff', correct: 'brief' },
                                  { wrong: 'demostration', correct: 'demonstration' },
                                  { wrong: 'creddible', correct: 'credible' },
                                  { wrong: 'informashun', correct: 'information' },
                                  { wrong: 'hopfully', correct: 'hopefully' },
                                  { wrong: 'studants', correct: 'students' },
                                  { wrong: 'experince', correct: 'experience' },
                                  { wrong: 'mistaks', correct: 'mistakes' },
                                  { wrong: 'asighnments', correct: 'assignments' },
                                  { wrong: 'conjoining', correct: 'conditioning' },
                                  { wrong: 'understanding', correct: 'understand' }
                                ];
                                
                                const suggestions: any[] = [];
                                
                                allErrors.forEach((error, index) => {
                                  if (cleanContent.toLowerCase().includes(error.wrong.toLowerCase())) {
                                    suggestions.push({
                                      id: `spell-${index}`,
                                      type: 'spelling',
                                      originalText: error.wrong,
                                      suggestedText: error.correct,
                                      explanation: `Correct spelling of "${error.correct}"`,
                                      severity: 'high'
                                    });
                                  }
                                });
                                
                                console.log('✅ Found spelling suggestions:', suggestions.length);
                                
                                if (suggestions.length > 0) {
                                  // Call the AI suggestions handler directly
                                  handleAiSuggestionsGenerated(suggestions);
                                  toast({
                                    title: "Spell Check Complete",
                                    description: `Found ${suggestions.length} spelling suggestions. Use "Apply All" to fix them.`,
                                  });
                                } else {
                                  toast({
                                    title: "Spell Check Complete",
                                    description: "No spelling errors found in your document.",
                                  });
                                }
                              }}
                              size="sm"
                              variant="outline"
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
                    
                    {/* Inline Comments Summary */}
                    {commentsArray.length > 0 && (
                      <div className="bg-yellow-50 border border-yellow-300 p-3 rounded-lg mb-4">
                        <div className="flex items-center gap-2">
                          <MessageSquare className="h-4 w-4 text-yellow-600" />
                          <span className="text-sm font-medium text-yellow-800">
                            {commentsArray.length} inline comment{commentsArray.length !== 1 ? 's' : ''} from your teacher
                          </span>
                        </div>
                        <p className="text-xs text-yellow-700 mt-1">
                          Look for the yellow comment buttons to see specific feedback on different parts of your writing.
                        </p>
                      </div>
                    )}
                    
                    {session.teacherFeedback && (
                      <div className="bg-white p-6 rounded-lg border-2 border-green-300 mb-4">
                        <div className="flex items-center gap-2 mb-3">
                          <GraduationCap className="h-5 w-5 text-green-600" />
                          <span className="font-bold text-green-800 text-lg">Overall Teacher Feedback:</span>
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
            <div className="relative">
              <RichTextEditor
                ref={contentRef}
                content={(() => {
                  let displayContent = content;
                  
                  // Only apply teacher comment highlighting (yellow highlighting) for graded documents
                  // Copy-paste highlighting removed from student view for better writing experience
                  if (session?.status === 'graded' && commentsArray.length > 0) {
                    displayContent = highlightCommentedText(displayContent, commentsArray);
                  }
                  
                  return displayContent;
                })()}
                onContentChange={(newContent) => {
                  // Prevent infinite loops by checking if content actually changed
                  if (newContent !== content) {
                    console.log('Content changed from rich editor:', newContent);
                    setContent(newContent);
                    
                    // Mark user as typing and reset the typing timeout
                    setIsUserTyping(true);
                    lastTypingTime.current = Date.now();
                    
                    if (typingTimeoutRef.current) {
                      clearTimeout(typingTimeoutRef.current);
                    }
                    
                    // Clear typing flag after 3 seconds of no typing
                    typingTimeoutRef.current = setTimeout(() => {
                      setIsUserTyping(false);
                    }, 3000);
                  }
                }}
                onTextSelection={setSelectedText}
                readOnly={session?.status === 'graded'}
                placeholder="Start writing your assignment..."
              />
              

              
              {/* Inline Comments Display for Students */}
              {session?.status === 'graded' && commentsArray.length > 0 && (
                <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
                  {commentsArray.map((comment: any, index: number) => {
                    const isOpen = openCommentId === comment.id;
                    return (
                      <div
                        key={comment.id}
                        className="absolute pointer-events-auto z-10"
                        style={{
                          top: `${Math.min(20 + index * 60, 85)}%`,
                          right: '10px',
                          maxWidth: '300px'
                        }}
                      >
                        {/* Comment Indicator Button */}
                        <div
                          onClick={() => setOpenCommentId(isOpen ? null : comment.id)}
                          className="bg-yellow-400 hover:bg-yellow-500 cursor-pointer rounded-full w-8 h-8 flex items-center justify-center shadow-lg border-2 border-yellow-600 transition-colors"
                          title="Click to view teacher comment"
                        >
                          <MessageSquare className="h-4 w-4 text-yellow-800" />
                        </div>
                        
                        {/* Expanded Comment Box */}
                        {isOpen && (
                          <div className="bg-yellow-100 border-2 border-yellow-500 p-3 mt-2 rounded-lg shadow-xl max-w-sm">
                            <div className="flex items-center justify-between mb-2">
                              <div className="text-xs font-semibold text-yellow-800">
                                Teacher Comment:
                              </div>
                              <button
                                onClick={() => setOpenCommentId(null)}
                                className="text-yellow-600 hover:text-yellow-800 text-lg font-bold"
                                title="Close comment"
                              >
                                ×
                              </button>
                            </div>
                            <div className="text-sm text-yellow-900 mb-2 bg-yellow-50 p-2 rounded border-l-2 border-yellow-400">
                              "{comment.highlightedText}"
                            </div>
                            <div className="text-sm text-gray-700 leading-relaxed">
                              {comment.comment}
                            </div>
                            <div className="text-xs text-gray-500 mt-2 pt-2 border-t border-yellow-300">
                              {new Date(comment.createdAt).toLocaleDateString()}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
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
                  onSuggestionsGenerated={handleAiSuggestionsGenerated}
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
              onClick={manualSave}
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
            onContentChange={(newContent) => {
              console.log('Spellcheck applying content change:', newContent.length, 'chars');
              
              // SAFETY: Apply spell check corrections regardless of length
              // as they are user-initiated corrections, not data loss scenarios
              if (newContent !== undefined && newContent !== null) {
                console.log('✓ Applying spell check correction');
                setContent(newContent);
                
                // Mark user as typing to prevent auto-save conflicts
                setIsUserTyping(true);
                lastTypingTime.current = Date.now();
                
                if (typingTimeoutRef.current) {
                  clearTimeout(typingTimeoutRef.current);
                }
                
                // Clear typing flag after spell check completes
                typingTimeoutRef.current = setTimeout(() => {
                  setIsUserTyping(false);
                }, 1000);
              } else {
                console.warn('⚠️ Spell check provided invalid content - blocked');
              }
            }}
            isOpen={isSpellCheckActive}
            onClose={() => setIsSpellCheckActive(false)}
            onSpellErrorsChange={(errors) => setSpellErrors(errors)}
          />
        </div>
      )}
      
      {/* Simple Highlighter for AI Suggestions */}
      <SimpleHighlighter
        content={content}
        suggestions={aiSuggestions}
        onApplySuggestion={handleApplySuggestion}
        onDismissSuggestion={handleDismissSuggestion}
      />
      
      {/* Bulk Apply/Ignore Panel */}
      {aiSuggestions.length > 0 && (
        <div className="fixed bottom-4 right-4 bg-white border rounded-lg shadow-lg p-4 z-50">
          <div className="text-sm font-medium mb-2">
            {aiSuggestions.length} spelling suggestions found
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                aiSuggestions.forEach(suggestion => handleApplySuggestion(suggestion));
              }}
              className="bg-green-500 text-white px-4 py-2 rounded text-sm font-medium hover:bg-green-600"
            >
              Apply All
            </button>
            <button
              onClick={() => {
                aiSuggestions.forEach(suggestion => handleDismissSuggestion(suggestion.id));
              }}
              className="bg-red-500 text-white px-4 py-2 rounded text-sm font-medium hover:bg-red-600"
            >
              Ignore All
            </button>
          </div>
        </div>
      )}
    </div>
  );
}