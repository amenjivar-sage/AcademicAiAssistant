import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import WritingWorkspace from "@/components/writing-workspace";
import AiAssistant from "@/components/ai-assistant";
import IntegrityBanner from "@/components/integrity-banner";
import IntegrityGuidelines from "@/components/integrity-guidelines";
import { Button } from "@/components/ui/button";
import { PenTool, Shield, HelpCircle } from "lucide-react";
import type { WritingSession } from "@shared/schema";

export default function Home() {
  const [currentSession, setCurrentSession] = useState<WritingSession | null>(null);

  // Get or create writing session
  const { data: session, isLoading } = useQuery<WritingSession>({
    queryKey: ["/api/session"],
    onSuccess: (data) => {
      setCurrentSession(data);
    },
  });

  // Update session mutation
  const updateSessionMutation = useMutation({
    mutationFn: async (updates: Partial<WritingSession>) => {
      if (!session) throw new Error("No session available");
      const response = await apiRequest("PATCH", `/api/session/${session.id}`, updates);
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
    <div className="min-h-screen bg-edu-light">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-edu-blue rounded-lg flex items-center justify-center">
                <PenTool className="h-5 w-5 text-white" />
              </div>
              <h1 className="text-xl font-semibold text-edu-neutral">EduWrite AI</h1>
              <span className="text-sm text-gray-500 hidden sm:inline">Academic Writing Assistant</span>
            </div>
            <div className="flex items-center space-x-4">
              <div className="hidden md:flex items-center space-x-2 text-sm text-gray-600">
                <Shield className="h-4 w-4 text-edu-success" />
                <span>Academic Integrity Protected</span>
              </div>
              <Button variant="ghost" size="sm">
                <HelpCircle className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <IntegrityBanner />
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <WritingWorkspace
              session={currentSession}
              onContentUpdate={handleContentUpdate}
              onTitleUpdate={handleTitleUpdate}
              isUpdating={updateSessionMutation.isPending}
            />
          </div>
          
          <div className="space-y-6">
            <AiAssistant sessionId={currentSession?.id} />
            <IntegrityGuidelines />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-16 bg-white border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <div className="flex items-center space-x-6 text-sm text-gray-500">
              <span>© 2024 EduWrite AI</span>
              <a href="#" className="hover:text-edu-blue transition-colors">Privacy Policy</a>
              <a href="#" className="hover:text-edu-blue transition-colors">Terms of Use</a>
              <a href="#" className="hover:text-edu-blue transition-colors">Academic Guidelines</a>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-500">Need help?</span>
              <Button size="sm" className="bg-edu-blue hover:bg-blue-700">
                <HelpCircle className="h-4 w-4 mr-2" />
                Support
              </Button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
