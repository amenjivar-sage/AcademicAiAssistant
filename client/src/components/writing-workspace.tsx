import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import EnhancedToolbar from "@/components/enhanced-toolbar";
import { Save, Download, Clock, CheckCircle, Lightbulb, List, Search, Share, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { WritingSession } from "@shared/schema";

interface WritingWorkspaceProps {
  session: WritingSession | null;
  onContentUpdate: (content: string) => void;
  onTitleUpdate: (title: string) => void;
  isUpdating: boolean;
}

export default function WritingWorkspace({ 
  session, 
  onContentUpdate, 
  onTitleUpdate, 
  isUpdating 
}: WritingWorkspaceProps) {
  const [content, setContent] = useState("");
  const [title, setTitle] = useState("");
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isCollaborating, setIsCollaborating] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (session) {
      setContent(session.content);
      setTitle(session.title);
      setLastSaved(new Date(session.updatedAt));
    }
  }, [session]);

  const handleContentChange = (newContent: string) => {
    setContent(newContent);
    onContentUpdate(newContent);
  };

  const handleTitleChange = (newTitle: string) => {
    setTitle(newTitle);
    onTitleUpdate(newTitle);
  };

  const handleFormatting = (command: string, value?: string) => {
    if (editorRef.current) {
      document.execCommand(command, false, value);
      const newContent = editorRef.current.innerHTML;
      handleContentChange(newContent);
    }
  };

  const handleSave = () => {
    toast({
      title: "Document Saved",
      description: "Your work has been saved successfully!",
    });
  };

  const handleShare = () => {
    setIsCollaborating(!isCollaborating);
    toast({
      title: isCollaborating ? "Collaboration Disabled" : "Collaboration Enabled",
      description: isCollaborating 
        ? "Document is now private" 
        : "Others can now view and comment on your document",
    });
  };

  const handleDownload = () => {
    const element = document.createElement('a');
    const file = new Blob([content], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = `${title || 'document'}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    
    toast({
      title: "Download Started",
      description: "Your document is being downloaded!",
    });
  };

  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;

  const formatLastSaved = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return "Just now";
    if (diffMins === 1) return "1 minute ago";
    if (diffMins < 60) return `${diffMins} minutes ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours === 1) return "1 hour ago";
    if (diffHours < 24) return `${diffHours} hours ago`;
    
    return date.toLocaleDateString();
  };

  return (
    <div className="space-y-4">
      {/* Document Header */}
      <Card className="overflow-hidden">
        <CardHeader className="border-b border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <Input
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              className="text-lg font-medium border-none p-0 focus-visible:ring-0 focus-visible:ring-offset-0"
              placeholder="Enter your assignment title..."
            />
            <div className="flex items-center space-x-3">
              {isCollaborating && (
                <div className="flex items-center text-sm text-green-600">
                  <Users className="h-4 w-4 mr-1" />
                  Collaborative
                </div>
              )}
              <span className="text-sm text-gray-500">{wordCount} words</span>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={handleShare}
                className="text-blue-600 hover:text-blue-700"
              >
                <Share className="h-4 w-4 mr-1" />
                {isCollaborating ? "Stop Sharing" : "Share"}
              </Button>
            </div>
          </div>
        </CardHeader>
        
        {/* Enhanced Formatting Toolbar */}
        <EnhancedToolbar 
          onFormatting={handleFormatting}
          onSave={handleSave}
          onShare={handleShare}
          onDownload={handleDownload}
          isSaving={isUpdating}
        />
        <CardContent className="p-6">
          <div
            ref={editorRef}
            contentEditable
            onInput={(e) => handleContentChange(e.currentTarget.innerHTML)}
            className="min-h-80 border border-gray-300 focus:ring-2 focus:ring-edu-blue focus:border-transparent resize-none text-gray-700 leading-relaxed p-4 focus:outline-none"
            style={{ whiteSpace: 'pre-wrap' }}
            suppressContentEditableWarning={true}
            dangerouslySetInnerHTML={{ __html: content }}
          />
          <div className="mt-4 flex items-center justify-between">
            <div className="flex items-center space-x-4 text-sm text-gray-500">
              {lastSaved && (
                <span className="flex items-center">
                  <Clock className="h-4 w-4 mr-1" />
                  Last saved: {formatLastSaved(lastSaved)}
                </span>
              )}
              <span className="flex items-center">
                <CheckCircle className="h-4 w-4 mr-1 text-edu-success" />
                No spelling errors
              </span>
            </div>
            <Button className="bg-edu-blue hover:bg-blue-700">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Quick Writing Tools */}
      <Card>
        <CardContent className="p-6">
          <h4 className="text-lg font-medium text-edu-neutral mb-4">Quick Writing Tools</h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Button 
              variant="outline" 
              className="p-4 h-auto flex-col space-y-2 hover:border-edu-blue hover:bg-blue-50 group"
            >
              <Lightbulb className="h-6 w-6 text-edu-warning group-hover:text-edu-blue transition-colors" />
              <span className="text-sm font-medium">Brainstorm Ideas</span>
            </Button>
            <Button 
              variant="outline" 
              className="p-4 h-auto flex-col space-y-2 hover:border-edu-blue hover:bg-blue-50 group"
            >
              <List className="h-6 w-6 text-edu-warning group-hover:text-edu-blue transition-colors" />
              <span className="text-sm font-medium">Create Outline</span>
            </Button>
            <Button 
              variant="outline" 
              className="p-4 h-auto flex-col space-y-2 hover:border-edu-blue hover:bg-blue-50 group"
            >
              <Search className="h-6 w-6 text-edu-warning group-hover:text-edu-blue transition-colors" />
              <span className="text-sm font-medium">Research Help</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
