import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bot, Send, CheckCircle, XCircle, AlertTriangle, Loader2, BookOpen, PenTool, Search, Zap, Lightbulb, Users, Play, Shield, Target, FileText } from "lucide-react";
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

interface SmartPrompt {
  text: string;
  icon: any;
  category: string;
  relevance: number;
}

export default function AiAssistant({ sessionId }: AiAssistantProps) {
  const [prompt, setPrompt] = useState("");
  const [lastResponse, setLastResponse] = useState<AiResponse | null>(null);
  const [smartPrompts, setSmartPrompts] = useState<SmartPrompt[]>([]);
  const [activeTab, setActiveTab] = useState("assistant");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch chat history for this session - only if we have a valid sessionId
  const { data: chatHistory = [] } = useQuery({
    queryKey: [`/api/session/${sessionId}/interactions`],
    enabled: !!sessionId && sessionId > 0, // Only fetch if we have a valid session
  });

  // Type the chat history properly
  const typedChatHistory = Array.isArray(chatHistory) ? chatHistory : [];
  
  // Cast for display purposes
  const displayChatHistory = typedChatHistory as any[];

  const aiHelpMutation = useMutation({
    mutationFn: async (promptText: string) => {
      // Allow AI assistant to work without session for general help
      const currentSessionId = sessionId && sessionId > 0 ? sessionId : null;
      
      const response = await apiRequest("POST", "/api/ai/chat", {
        sessionId: currentSessionId,
        prompt: promptText,
      });
      return response.json();
    },
    onSuccess: (data: AiResponse) => {
      // Show the response immediately if no session to store it
      if (!sessionId || sessionId <= 0) {
        setLastResponse(data);
      } else {
        // Clear the last response since it will show in history
        setLastResponse(null);
        // Refetch chat history to include the new interaction
        queryClient.invalidateQueries({
          queryKey: [`/api/session/${sessionId}/interactions`]
        });
      }
      
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

  // Generate smart prompts based on conversation history
  const generateSmartPrompts = (chatHistory: any[]) => {
    const basePrompts = [
      { icon: Lightbulb, text: "Help me brainstorm ideas for this topic", category: "brainstorming", relevance: 1 },
      { icon: BookOpen, text: "Review my thesis statement and suggest improvements", category: "feedback", relevance: 1 },
      { icon: PenTool, text: "Help me organize my thoughts into an outline", category: "structure", relevance: 1 },
      { icon: Search, text: "What are key points I should research?", category: "research", relevance: 1 },
      { icon: Zap, text: "Improve the flow and transitions in this paragraph", category: "editing", relevance: 1 },
      { icon: CheckCircle, text: "Check my grammar and writing style", category: "grammar", relevance: 1 },
    ];

    if (!chatHistory || chatHistory.length === 0) {
      return basePrompts;
    }

    // Analyze recent questions to suggest contextual prompts
    const recentTopics = chatHistory.slice(-3).map((interaction: any) => interaction.prompt.toLowerCase());
    const contextualPrompts: SmartPrompt[] = [];

    if (recentTopics.some(topic => topic.includes('character') || topic.includes('story') || topic.includes('creative'))) {
      contextualPrompts.push({ 
        icon: BookOpen, 
        text: "Help me develop my characters further", 
        category: "character", 
        relevance: 2 
      });
      contextualPrompts.push({ 
        icon: PenTool, 
        text: "What makes dialogue feel natural?", 
        category: "dialogue", 
        relevance: 2 
      });
    }

    if (recentTopics.some(topic => topic.includes('research') || topic.includes('source') || topic.includes('evidence'))) {
      contextualPrompts.push({ 
        icon: Search, 
        text: "How do I find credible sources?", 
        category: "research", 
        relevance: 2 
      });
      contextualPrompts.push({ 
        icon: BookOpen, 
        text: "Help me organize my research notes", 
        category: "organization", 
        relevance: 2 
      });
    }

    if (recentTopics.some(topic => topic.includes('conclusion') || topic.includes('ending') || topic.includes('finish'))) {
      contextualPrompts.push({ 
        icon: CheckCircle, 
        text: "How can I write a stronger conclusion?", 
        category: "conclusion", 
        relevance: 2 
      });
    }

    if (recentTopics.some(topic => topic.includes('stuck') || topic.includes('block') || topic.includes('help'))) {
      contextualPrompts.push({ 
        icon: Zap, 
        text: "I have writer's block, help me get unstuck", 
        category: "motivation", 
        relevance: 2 
      });
    }

    if (recentTopics.some(topic => topic.includes('introduction') || topic.includes('intro') || topic.includes('start'))) {
      contextualPrompts.push({ 
        icon: Lightbulb, 
        text: "How do I write a compelling introduction?", 
        category: "introduction", 
        relevance: 2 
      });
    }

    if (recentTopics.some(topic => topic.includes('argument') || topic.includes('persuasive') || topic.includes('convince'))) {
      contextualPrompts.push({ 
        icon: PenTool, 
        text: "Help me strengthen my argument", 
        category: "argument", 
        relevance: 2 
      });
    }

    // Combine and sort by relevance, then limit to 6
    return [...contextualPrompts, ...basePrompts]
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, 6);
  };

  const quickPrompts = generateSmartPrompts(typedChatHistory);

  return (
    <div className="h-full flex flex-col bg-white overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-purple-500 to-purple-600 text-white flex-shrink-0">
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5" />
          <h3 className="font-semibold">ZoË AI Assistant</h3>
        </div>
        <p className="text-sm text-purple-100 mt-1">
          Get ethical writing help and guidance
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
        <TabsList className="grid w-full grid-cols-4 h-auto m-2 flex-shrink-0">
          <TabsTrigger value="assistant" className="text-xs px-2">Chat</TabsTrigger>
          <TabsTrigger value="prompts" className="text-xs px-2">Help</TabsTrigger>
          <TabsTrigger value="citations" className="text-xs px-2">Cite</TabsTrigger>
          <TabsTrigger value="history" className="text-xs px-2">History</TabsTrigger>
        </TabsList>

        <TabsContent value="assistant" className="flex-1 flex flex-col min-h-0">
          {/* Scrollable Content Area */}
          <div className="flex-1 overflow-y-auto min-h-0">
            {/* Chat History */}
            {displayChatHistory && displayChatHistory.length > 0 && (
              <div className="p-4">
                <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
                  <Bot className="h-4 w-4 mr-2" />
                  Conversation History
                </h4>
                <div className="space-y-3">
                  {displayChatHistory.map((interaction: any, index: number) => (
                    <div key={index} className="space-y-2">
                      <div className="bg-blue-50 p-3 rounded-lg">
                        <p className="text-sm font-medium text-blue-900 mb-1">You asked:</p>
                        <p className="text-sm text-blue-800">{interaction.prompt}</p>
                      </div>
                      <div className="bg-purple-50 p-3 rounded-lg">
                        <p className="text-sm font-medium text-purple-900 mb-1">ZoË replied:</p>
                        <p className="text-sm text-purple-800 whitespace-pre-line">{interaction.response}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

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
          </div>

          {/* Fixed Input Area */}
          <div className="border-t bg-white p-4 space-y-4 flex-shrink-0">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ask ZoË for help with your writing:
              </label>
              <Textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Example: 'I want to write a story about baseball, how can I do that?' or 'Help me brainstorm creative ideas'"
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
                  ZoË is thinking...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Ask ZoË
                </>
              )}
            </Button>
            
            <p className="text-xs text-gray-500">
              💡 Tip: Press Ctrl+Enter (or Cmd+Enter) to send
            </p>
          </div>
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
                    // Switch to assistant tab and auto-submit
                    setActiveTab("assistant");
                    // Auto-submit the prompt after a brief delay
                    setTimeout(() => {
                      aiHelpMutation.mutate(quickPrompt.text);
                    }, 100);
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
          
          <div className="space-y-2">
            <CitationAssistant sessionId={sessionId}>
              <Button 
                className="w-full justify-start h-auto p-2 text-left text-xs"
                variant="outline"
                size="sm"
              >
                <BookOpen className="h-3 w-3 mr-2 flex-shrink-0" />
                <span>Generate Citation</span>
              </Button>
            </CitationAssistant>
          </div>
          
          <div className="mt-2 p-2 bg-amber-50 rounded text-xs">
            <h5 className="font-medium text-amber-900 mb-1">Academic Integrity</h5>
            <ul className="text-amber-800 space-y-0.5 text-xs">
              <li>• Always cite your sources</li>
              <li>• Use quotation marks for direct quotes</li>
              <li>• Paraphrase in your own words</li>
              <li>• When in doubt, cite it out!</li>
            </ul>
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
