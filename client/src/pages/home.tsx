import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import AiAssistant from "@/components/ai-assistant";
import IntegrityGuidelines from "@/components/integrity-guidelines";
import { Button } from "@/components/ui/button";
import { PenTool, Shield } from "lucide-react";
import SageLogo from "@/components/sage-logo";
import WritingMilestone from "@/components/writing-milestone";
import type { WritingSession } from "@shared/schema";

export default function Home() {
  const [currentSession, setCurrentSession] = useState<WritingSession | null>(null);

  // Get or create writing session
  const { data: session, isLoading } = useQuery<WritingSession>({
    queryKey: ["/api/session"],
  });

  // Update current session when data changes
  React.useEffect(() => {
    if (session) {
      setCurrentSession(session);
    }
  }, [session]);

  // Update session mutation
  const updateSessionMutation = useMutation({
    mutationFn: async (updates: Partial<WritingSession>) => {
      if (!currentSession) throw new Error("No session available");
      const response = await apiRequest("PATCH", `/api/session/${currentSession.id}`, updates);
      return response.json();
    },
    onSuccess: (updatedSession) => {
      setCurrentSession(updatedSession);
      queryClient.setQueryData(["/api/session"], updatedSession);
    },
  });

  const handleContentUpdate = (content: string) => {
    updateSessionMutation.mutate({ content });
  };

  const handleTitleUpdate = (title: string) => {
    updateSessionMutation.mutate({ title });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-edu-light flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-edu-blue border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-edu-neutral">Loading your writing workspace...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Google Docs-style Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Left: Logo and Document Name */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-white rounded flex items-center justify-center shadow-sm border">
                <SageLogo size={20} className="text-blue-700" />
              </div>
              <span className="text-lg font-medium text-gray-700">Sage</span>
            </div>
            <input
              type="text"
              value={currentSession?.title || "Untitled Document"}
              onChange={(e) => handleTitleUpdate(e.target.value)}
              className="text-lg text-gray-900 bg-transparent border-none focus:outline-none focus:bg-gray-50 px-2 py-1 rounded"
            />
          </div>

          {/* Right: Progress, Tools and User */}
          <div className="flex items-center space-x-4">
            {/* Writing Progress */}
            <div className="hidden md:flex items-center space-x-3 text-sm">
              <div className="flex items-center space-x-2 text-gray-600 bg-gray-50 px-3 py-1 rounded-full">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span>Auto-saved</span>
              </div>
              <WritingMilestone 
                wordCount={currentSession?.content ? currentSession.content.split(' ').filter(word => word.trim().length > 0).length : 0}
                onMilestone={(milestone) => console.log(`Milestone reached: ${milestone} words!`)}
              />
            </div>
            
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <Shield className="h-4 w-4 text-edu-success" />
              <span className="hidden lg:inline">AI Integrity Protected</span>
            </div>
            
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-500">Alex Smith</span>
              <div className="w-8 h-8 bg-edu-success rounded-full flex items-center justify-center text-white text-sm font-medium">
                A
              </div>
            </div>
          </div>
        </div>

        {/* Google Docs-style Toolbar */}
        <div className="flex items-center space-x-1 mt-3 pt-3 border-t border-gray-100">
          <Button variant="ghost" size="sm" className="text-xs">File</Button>
          <Button variant="ghost" size="sm" className="text-xs">Edit</Button>
          <Button variant="ghost" size="sm" className="text-xs">View</Button>
          <Button variant="ghost" size="sm" className="text-xs">Insert</Button>
          <Button variant="ghost" size="sm" className="text-xs">Format</Button>
          <Button variant="ghost" size="sm" className="text-xs">Tools</Button>
          <div className="h-4 w-px bg-gray-300 mx-2"></div>
          <div className="flex items-center space-x-1">
            <Button variant="ghost" size="sm">B</Button>
            <Button variant="ghost" size="sm">I</Button>
            <Button variant="ghost" size="sm">U</Button>
            <select className="text-sm border border-gray-300 rounded px-2 py-1">
              <option>Arial</option>
              <option>Times New Roman</option>
              <option>Calibri</option>
            </select>
            <select className="text-sm border border-gray-300 rounded px-2 py-1">
              <option>11</option>
              <option>12</option>
              <option>14</option>
            </select>
          </div>
        </div>
      </header>

      {/* Milestone Celebrations */}
      <WritingMilestone 
        wordCount={currentSession?.content ? currentSession.content.split(' ').filter(word => word.trim().length > 0).length : 0}
        onMilestone={(milestone) => console.log(`Celebration: ${milestone} words achieved!`)}
      />

      {/* Main Document Area */}
      <div className="flex-1 flex">
        {/* Document Editor - Google Docs style */}
        <div className="flex-1 bg-gray-100 p-6 overflow-y-auto">
          <div className="max-w-4xl mx-auto">
            {/* Document Paper */}
            <div className="bg-white shadow-lg min-h-[800px] p-12 rounded-sm" style={{ width: '8.5in', margin: '0 auto' }}>
              <textarea
                value={currentSession?.content || ""}
                onChange={(e) => handleContentUpdate(e.target.value)}
                placeholder="Start writing your document here..."
                className="w-full h-full min-h-[700px] border-none outline-none resize-none text-gray-900 leading-relaxed text-base font-serif"
                style={{ fontFamily: 'Times New Roman, serif', lineHeight: '1.6' }}
              />
            </div>
            
            {/* Document Stats */}
            <div className="flex items-center justify-between mt-4 text-sm text-gray-500">
              <span>{currentSession?.wordCount || 0} words</span>
              <span>Last saved: {currentSession?.updatedAt ? new Date(currentSession.updatedAt).toLocaleTimeString() : 'Never'}</span>
            </div>
          </div>
        </div>

        {/* AI Assistant Sidebar */}
        <div className="w-80 bg-white border-l border-gray-200 flex flex-col">
          <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-purple-500 to-purple-600 text-white">
            <h3 className="font-semibold flex items-center">
              <PenTool className="h-5 w-5 mr-2" />
              AI Writing Assistant
            </h3>
            <p className="text-sm text-purple-100 mt-1">Get ethical help with your writing</p>
          </div>
          
          <div className="flex-1 overflow-y-auto">
            <AiAssistant sessionId={currentSession?.id} />
            
            <div className="p-4 border-t border-gray-200">
              <IntegrityGuidelines />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
