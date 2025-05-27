import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Save, Download, Clock, CheckCircle, Lightbulb, List, Search } from "lucide-react";
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
    <div className="space-y-6">
      {/* Main Writing Area */}
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
              <span className="text-sm text-gray-500">{wordCount} words</span>
              <Button 
                variant="ghost" 
                size="sm"
                disabled={isUpdating}
                className="text-edu-blue hover:text-blue-700"
              >
                <Save className="h-4 w-4 mr-1" />
                {isUpdating ? "Saving..." : "Save Draft"}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <Textarea
            value={content}
            onChange={(e) => handleContentChange(e.target.value)}
            placeholder="Start writing your assignment here. Use the AI assistant on the right for ethical help with brainstorming, outlining, and feedback..."
            className="min-h-80 border border-gray-300 focus:ring-2 focus:ring-edu-blue focus:border-transparent resize-none text-gray-700 leading-relaxed"
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
