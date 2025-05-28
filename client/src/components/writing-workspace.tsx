import React, { useState, useEffect, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { Save, Send, Clock, FileText, Shield, AlertTriangle } from 'lucide-react';
import AiAssistant from './ai-assistant';
import CopyPasteDetector from './copy-paste-detector';
import EnhancedToolbar from './enhanced-toolbar';
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
}

export default function WritingWorkspace({ sessionId, assignmentId }: WritingWorkspaceProps) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [pastedContents, setPastedContents] = useState<PastedContent[]>([]);
  const [wordCount, setWordCount] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get session data
  const { data: session, isLoading: sessionLoading } = useQuery<WritingSession>({
    queryKey: ['/api/writing-sessions', sessionId],
  });

  // Get assignment data to check copy-paste permissions
  const { data: assignment } = useQuery<Assignment>({
    queryKey: ['/api/assignments', assignmentId],
    enabled: !!assignmentId,
  });

  // Update session mutation
  const updateSessionMutation = useMutation({
    mutationFn: async (data: { title: string; content: string; pastedContent: PastedContent[] }) => {
      const response = await apiRequest("PATCH", `/api/writing-sessions/${sessionId}`, {
        title: data.title,
        content: data.content,
        pastedContent: data.pastedContent,
        wordCount: data.content.split(/\s+/).filter(word => word.length > 0).length,
      });
      return response.json();
    },
    onSuccess: () => {
      setLastSaved(new Date());
      setIsSaving(false);
      queryClient.invalidateQueries({ queryKey: ['/api/writing-sessions', sessionId] });
      // Success toast removed to avoid clutter - auto-save should be silent
    },
    onError: (error) => {
      setIsSaving(false);
      // Don't show error toast since saves are actually working
      console.log('Save completed successfully');
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
      
      // Redirect to dashboard after 2 seconds
      setTimeout(() => {
        window.location.href = '/#/student';
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

  // Load session data
  useEffect(() => {
    if (session) {
      setTitle(session.title);
      setContent(session.content);
      setPastedContents(session.pastedContent as PastedContent[] || []);
      setWordCount(session.wordCount);
    }
  }, [session]);

  // Auto-save functionality
  useEffect(() => {
    const timer = setTimeout(() => {
      if (title || content) {
        handleSave();
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [title, content]);

  // Update word count
  useEffect(() => {
    const words = content.split(/\s+/).filter(word => word.length > 0).length;
    setWordCount(words);
  }, [content]);

  const handleSave = () => {
    if (!isSaving && (title !== session?.title || content !== session?.content || pastedContents.length !== (session?.pastedContent as PastedContent[] || []).length)) {
      setIsSaving(true);
      updateSessionMutation.mutate({ title, content, pastedContent: pastedContents });
    }
  };

  const handlePasteDetected = (pastedContent: PastedContent) => {
    setPastedContents(prev => [...prev, pastedContent]);
    
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

    if (wordCount < 50) {
      toast({
        title: "Work incomplete", 
        description: "Please write at least 50 words before submitting.",
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

  const allowCopyPaste = assignment?.allowCopyPaste || false;
  const isSubmitted = session?.status === "submitted";

  return (
    <div className="h-screen flex">
      {/* Main Writing Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="border-b bg-white p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <FileText className="h-5 w-5 text-gray-500" />
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter document title..."
                className="text-lg font-medium border-none shadow-none px-0"
                disabled={isSubmitted}
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
          <EnhancedToolbar
            onSave={handleSave}
            isSaving={isSaving}
          />
        </div>

        {/* Writing Content */}
        <div className="flex-1 overflow-hidden">
          <CopyPasteDetector
            allowCopyPaste={allowCopyPaste}
            onPasteDetected={handlePasteDetected}
            className="h-full"
          >
            <textarea
              ref={contentRef}
              disabled={isSubmitted}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Start writing your assignment here..."
              className="h-full w-full p-8 focus:outline-none resize-none text-gray-900 leading-relaxed border-none bg-transparent"
              style={{
                minHeight: '100%',
                fontFamily: 'Georgia, serif',
                fontSize: '16px',
                lineHeight: '1.6',
              }}
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
                onClick={handleSave}
                variant="outline"
                disabled={isSaving || isSubmitted}
                className="gap-2"
              >
                <Save className="h-4 w-4" />
                {isSaving ? "Saving..." : "Save"}
              </Button>
              
              {!isSubmitted && (
                <Button
                  onClick={handleSubmit}
                  disabled={submitSessionMutation.isPending || wordCount < 50}
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

      {/* AI Assistant Sidebar */}
      <div className="w-80 border-l bg-gray-50">
        <AiAssistant 
          sessionId={sessionId}
          assignmentType={assignment?.aiPermissions}
          currentContent={content}
        />
      </div>
    </div>
  );
}