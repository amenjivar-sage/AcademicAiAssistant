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

interface AiAssistantProps {
  sessionId?: number;
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
      if (!sessionId) {
        throw new Error("No active session");
      }
      
      const response = await apiRequest("POST", "/api/ai-help", {
        sessionId,
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

    if (!sessionId) {
      toast({
        title: "No Session",
        description: "Please wait for your writing session to load.",
        variant: "destructive",
      });
      return;
    }

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
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="assistant">AI Assistant</TabsTrigger>
          <TabsTrigger value="prompts">Quick Help</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="assistant" className="flex-1 flex flex-col space-y-4">
          {/* AI Assistant Input */}
          <div className="p-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ask for help with your writing:
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

          {/* AI Response */}
          <ScrollArea className="flex-1">
            <div className="p-4 border-t border-gray-200">
              <h4 className="font-medium text-gray-700 mb-3">AI Response</h4>
              {aiHelpMutation.isPending ? (
                <Alert>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <AlertDescription>
                    AI is analyzing your request and preparing a helpful response...
                  </AlertDescription>
                </Alert>
              ) : lastResponse ? (
                <Alert variant={getResponseVariant(lastResponse.isRestricted)}>
                  {getResponseIcon(lastResponse.isRestricted)}
                  <AlertDescription className="whitespace-pre-line">
                    {lastResponse.response}
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="text-center text-gray-500 py-8">
                  <Bot className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p>Ask a question above to get AI assistance with your writing!</p>
                  <p className="text-sm mt-2">I can help with brainstorming, outlining, feedback, and more.</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="prompts" className="flex-1">
          <ScrollArea className="h-full">
            <div className="p-4 space-y-3">
              <h4 className="font-medium text-gray-700 mb-4">Quick Writing Help</h4>
              {quickPrompts.map((quickPrompt, index) => {
                const Icon = quickPrompt.icon;
                return (
                  <Button
                    key={index}
                    variant="outline"
                    className="w-full justify-start h-auto p-3 text-left"
                    onClick={() => {
                      setPrompt(quickPrompt.text);
                      // Switch to assistant tab
                      const assistantTab = document.querySelector('[value="assistant"]') as HTMLElement;
                      assistantTab?.click();
                    }}
                  >
                    <Icon className="h-4 w-4 mr-3 flex-shrink-0" />
                    <span className="text-sm">{quickPrompt.text}</span>
                  </Button>
                );
              })}
              
              <div className="mt-6 p-3 bg-blue-50 rounded-lg">
                <h5 className="text-sm font-medium text-blue-900 mb-2">Writing Integrity Guidelines</h5>
                <ul className="text-xs text-blue-700 space-y-1">
                  <li>• Use AI for brainstorming and feedback</li>
                  <li>• Always write in your own voice</li>
                  <li>• AI suggestions are starting points, not final answers</li>
                  <li>• Verify all information and add your own insights</li>
                </ul>
              </div>
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="history" className="flex-1">
          <ScrollArea className="h-full">
            <div className="p-4">
              <h4 className="font-medium text-gray-700 mb-4">Recent AI Interactions</h4>
              <div className="text-center text-gray-500 py-8">
                <Bot className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p>Your conversation history will appear here</p>
                <p className="text-sm mt-2">Start a conversation to see your past interactions with the AI assistant.</p>
              </div>
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}
