import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bot, Send, CheckCircle, XCircle, AlertTriangle, Loader2, BookOpen, PenTool, Search, Zap, Lightbulb } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import CitationAssistant from "@/components/citation-assistant";

interface AiAssistantProps {
  sessionId?: number;
  assignmentType?: string;
  currentContent?: string;
}

interface AiResponse {
  response: string;
  isRestricted: boolean;
}

export default function AiAssistant({ sessionId }: AiAssistantProps) {
  const [prompt, setPrompt] = useState("");
  const [lastResponse, setLastResponse] = useState<AiResponse | null>(null);
  const { toast } = useToast();

  const aiHelpMutation = useMutation({
    mutationFn: async (promptText: string) => {
      const currentSessionId = sessionId || 1;
      
      const response = await apiRequest("POST", "/api/ai/chat", {
        sessionId: currentSessionId,
        prompt: promptText,
      });
      return response.json();
    },
    onSuccess: (data: AiResponse) => {
      setLastResponse(data);
      setPrompt("");
      
      if (data.isRestricted) {
        toast({
          title: "Request Restricted",
          description: "This type of AI help isn't allowed. Try asking for brainstorming or feedback instead.",
          variant: "destructive",
        });
      }
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to get AI response. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = () => {
    if (!prompt.trim()) {
      toast({
        title: "Empty Prompt",
        description: "Please enter a question or request for AI help.",
        variant: "destructive",
      });
      return;
    }

    // Allow AI assistant to work without session for demo
    const currentSessionId = sessionId || 1;

    aiHelpMutation.mutate(prompt.trim());
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const getResponseIcon = (isRestricted: boolean) => {
    if (isRestricted) {
      return <XCircle className="h-5 w-5 text-red-500" />;
    }
    return <CheckCircle className="h-5 w-5 text-green-500" />;
  };

  const getResponseVariant = (isRestricted: boolean) => {
    return isRestricted ? "destructive" : "default";
  };

  const quickPrompts = [
    { icon: Lightbulb, text: "Help me brainstorm ideas for this topic", category: "brainstorming" },
    { icon: BookOpen, text: "Review my thesis statement and suggest improvements", category: "feedback" },
    { icon: PenTool, text: "Help me organize my thoughts into an outline", category: "structure" },
    { icon: Search, text: "What are key points I should research?", category: "research" },
    { icon: Zap, text: "Improve the flow and transitions in this paragraph", category: "editing" },
    { icon: CheckCircle, text: "Check my grammar and writing style", category: "grammar" },
  ];

  return (
    <div className="h-full flex flex-col">
      <Tabs defaultValue="assistant" className="flex-1 flex flex-col">
        <TabsList className="grid w-full grid-cols-4 h-auto">
          <TabsTrigger value="assistant" className="text-xs px-2">ZoË</TabsTrigger>
          <TabsTrigger value="prompts" className="text-xs px-2">Help</TabsTrigger>
          <TabsTrigger value="citations" className="text-xs px-2">Cite</TabsTrigger>
          <TabsTrigger value="history" className="text-xs px-2">History</TabsTrigger>
        </TabsList>

        <TabsContent value="assistant" className="flex-1 flex flex-col space-y-4">
          {/* AI Assistant Input */}
          <div className="p-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ask ZoË for help with your writing:
              </label>
              <Textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Example: 'Help me brainstorm main points about WWII causes' or 'Give feedback on my thesis statement'"
                className="resize-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                rows={3}
              />
            </div>
            
            <Button 
              onClick={handleSubmit}
              disabled={aiHelpMutation.isPending || !prompt.trim()}
              className="w-full bg-purple-600 hover:bg-purple-700"
            >
              {aiHelpMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  AI is thinking...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Get AI Help
                </>
              )}
            </Button>
            
            <p className="text-xs text-gray-500">
              💡 Tip: Press Ctrl+Enter (or Cmd+Enter) to send
            </p>
          </div>

          {/* AI Response (inline after sending) */}
          {aiHelpMutation.isPending && (
            <div className="p-4 border-t border-gray-200">
              <Alert>
                <Loader2 className="h-4 w-4 animate-spin" />
                <AlertDescription>
                  ZoË is thinking...
                </AlertDescription>
              </Alert>
            </div>
          )}
          
          {lastResponse && (
            <div className="p-4 border-t border-gray-200">
              <Alert variant={getResponseVariant(lastResponse.isRestricted)}>
                {getResponseIcon(lastResponse.isRestricted)}
                <AlertDescription className="whitespace-pre-line text-sm">
                  {lastResponse.response}
                </AlertDescription>
              </Alert>
            </div>
          )}
        </TabsContent>

        <TabsContent value="prompts" className="p-3">
          <h4 className="font-medium text-gray-700 mb-3 text-sm">Quick Writing Help</h4>
          <div className="space-y-2">
            {quickPrompts.map((quickPrompt, index) => {
              const Icon = quickPrompt.icon;
              return (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  className="w-full justify-start h-auto p-2 text-left text-xs"
                  onClick={() => {
                    setPrompt(quickPrompt.text);
                    // Switch to assistant tab
                    const assistantTab = document.querySelector('[value="assistant"]') as HTMLElement;
                    assistantTab?.click();
                  }}
                >
                  <Icon className="h-3 w-3 mr-2 flex-shrink-0" />
                  <span className="text-wrap leading-tight">{quickPrompt.text}</span>
                </Button>
              );
            })}
          </div>
          
          <div className="mt-4 p-2 bg-blue-50 rounded text-xs">
            <h5 className="font-medium text-blue-900 mb-1">Writing Tips</h5>
            <ul className="text-blue-700 space-y-0.5 text-xs">
              <li>• Use ZoË for brainstorming</li>
              <li>• Write in your own voice</li>
              <li>• Verify all information</li>
              <li>• Add your own insights</li>
            </ul>
          </div>
        </TabsContent>

        <TabsContent value="citations" className="p-3">
          <h4 className="font-medium text-gray-700 mb-3 text-sm flex items-center">
            <BookOpen className="h-4 w-4 mr-2" />
            Citation Tools
          </h4>
          
          <div className="space-y-3">
            <CitationAssistant sessionId={sessionId}>
              <Button 
                className="w-full justify-start h-auto p-2 text-left text-xs"
                variant="outline"
                size="sm"
              >
                <BookOpen className="h-3 w-3 mr-2 flex-shrink-0" />
                <span>Citation Generator</span>
              </Button>
            </CitationAssistant>

            <CitationAssistant sessionId={sessionId}>
              <Button 
                className="w-full justify-start h-auto p-2 text-left text-xs"
                variant="outline"
                size="sm"
              >
                <Search className="h-3 w-3 mr-2 flex-shrink-0" />
                <span>Plagiarism Checker</span>
              </Button>
            </CitationAssistant>

            <div className="mt-4 p-2 bg-amber-50 rounded text-xs">
              <h5 className="font-medium text-amber-900 mb-1">Academic Integrity</h5>
              <ul className="text-amber-800 space-y-0.5 text-xs">
                <li>• Always cite your sources</li>
                <li>• Use quotation marks for direct quotes</li>
                <li>• Paraphrase in your own words</li>
                <li>• When in doubt, cite it out!</li>
              </ul>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="history" className="p-3">
          <h4 className="font-medium text-gray-700 mb-3 text-sm">Recent Conversations</h4>
          <div className="text-center text-gray-500 py-8">
            <Bot className="h-8 w-8 mx-auto mb-3 text-gray-300" />
            <p className="text-xs">Your ZoË conversations will appear here</p>
            <p className="text-xs mt-1">Start chatting to see your history.</p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
