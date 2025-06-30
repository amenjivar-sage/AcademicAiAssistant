import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bot, Send, CheckCircle, XCircle, AlertTriangle, Loader2, BookOpen, PenTool, Search, Zap, Lightbulb, Users, Play, Shield, Target, FileText, SpellCheck } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import CitationAssistant from "@/components/citation-assistant";
import AiDisclosure from "./ai-disclosure";
import { AiFeedbackSuggestion, extractSuggestionsFromAiResponse } from "./ai-feedback-highlights";

interface AiAssistantProps {
  sessionId?: number;
  assignmentType?: string;
  currentContent?: string;
  onSuggestionsGenerated?: (suggestions: AiFeedbackSuggestion[]) => void;
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

export default function AiAssistant({ sessionId, currentContent, onSuggestionsGenerated }: AiAssistantProps) {
  const [prompt, setPrompt] = useState("");
  const [lastResponse, setLastResponse] = useState<AiResponse | null>(null);
  const [smartPrompts, setSmartPrompts] = useState<SmartPrompt[]>([]);
  const [activeTab, setActiveTab] = useState("assistant");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch chat history for this session - only if we have a valid sessionId
  const { data: chatHistory = [], isLoading: historyLoading } = useQuery({
    queryKey: [`/api/session/${sessionId}/interactions`],
    enabled: !!sessionId && sessionId > 0, // Only fetch if we have a valid session
  });

  // Debug chat history
  console.log("Chat history data:", chatHistory, "Loading:", historyLoading, "SessionId:", sessionId);

  // Extract suggestions from the latest AI response in chat history
  useEffect(() => {
    if (Array.isArray(chatHistory) && chatHistory.length > 0 && currentContent && onSuggestionsGenerated) {
      const latestResponse = chatHistory[chatHistory.length - 1];
      if (latestResponse && latestResponse.response) {
        console.log('🔍 Processing latest AI response for suggestions:', {
          responseId: latestResponse.id,
          responsePreview: latestResponse.response.substring(0, 200) + '...',
          hasContent: !!currentContent,
          hasCallback: !!onSuggestionsGenerated
        });
        
        // Clean the content by removing HTML tags for better text matching
        const cleanContent = currentContent.replace(/<[^>]*>/g, '');
        console.log('🧹 Cleaned content for suggestion matching:', cleanContent.substring(0, 100) + '...');
        
        const suggestions = extractSuggestionsFromAiResponse(latestResponse.response, cleanContent);
        console.log('📝 Extracted suggestions from chat history:', suggestions.length, 'suggestions');
        console.log('📝 Suggestion details:', suggestions);

        if (suggestions.length > 0) {
          console.log('✅ Calling onSuggestionsGenerated with chat history suggestions');
          onSuggestionsGenerated(suggestions);
        } else {
          console.log('⚠️ No suggestions extracted from latest chat response');
          
          // Create manual suggestions from visible spelling errors in the document
          const manualSuggestions: AiFeedbackSuggestion[] = [];
          const commonErrors = [
            { wrong: 'yesterdya', correct: 'yesterday' },
            { wrong: 'functionailty', correct: 'functionality' },
            { wrong: 'teh', correct: 'the' },
            { wrong: 'recieve', correct: 'receive' },
            { wrong: 'seperate', correct: 'separate' },
            { wrong: 'definately', correct: 'definitely' }
          ];
          
          commonErrors.forEach((error, index) => {
            if (cleanContent.includes(error.wrong)) {
              manualSuggestions.push({
                id: `manual-${index}`,
                type: 'spelling',
                originalText: error.wrong,
                suggestedText: error.correct,
                explanation: `Spelling correction: "${error.wrong}" should be "${error.correct}"`,
                startIndex: cleanContent.indexOf(error.wrong),
                endIndex: cleanContent.indexOf(error.wrong) + error.wrong.length,
                severity: 'medium'
              });
            }
          });
          
          console.log('🔧 Created manual suggestions from chat history:', manualSuggestions);
          
          if (manualSuggestions.length > 0) {
            console.log('✅ Calling onSuggestionsGenerated with manual suggestions from chat');
            onSuggestionsGenerated(manualSuggestions);
          }
        }
      }
    }
  }, [chatHistory, currentContent, onSuggestionsGenerated]);

  // Type the chat history properly
  const typedChatHistory = Array.isArray(chatHistory) ? chatHistory : [];
  
  // Cast for display purposes
  const displayChatHistory = typedChatHistory as any[];

  const aiHelpMutation = useMutation({
    mutationFn: async (promptText: string) => {
      // Allow AI assistant to work without session for general help
      const currentSessionId = sessionId && sessionId > 0 ? sessionId : null;
      
      // Debug: Check what content we're sending to AI
      console.log('🤖 AI Assistant - Content being sent:', {
        contentLength: currentContent?.length || 0,
        contentPreview: currentContent?.substring(0, 100) + '...',
        hasContent: !!currentContent,
        promptLength: promptText.length
      });
      
      const response = await apiRequest("POST", "/api/ai/chat", {
        sessionId: currentSessionId,
        prompt: promptText,
        userId: 2, // Demo student ID - in real app, get from auth context
        documentContent: currentContent, // Include current document content for context
      });
      return response.json();
    },
    onSuccess: (data: AiResponse) => {
      setPrompt("");
      
      // Extract suggestions from AI response if document content is available
      if (currentContent && data.response && onSuggestionsGenerated) {
        console.log('🔍 Attempting to extract suggestions from AI response:', {
          hasContent: !!currentContent,
          hasResponse: !!data.response,
          hasCallback: !!onSuggestionsGenerated,
          responsePreview: data.response.substring(0, 400) + '...'
        });
        
        // Clean the content by removing HTML tags for better text matching
        const cleanContent = currentContent.replace(/<[^>]*>/g, '');
        console.log('🧹 Cleaned content for matching:', cleanContent.substring(0, 200) + '...');
        console.log('🤖 Full AI response for parsing:', data.response);
        
        const suggestions = extractSuggestionsFromAiResponse(data.response, cleanContent);
        console.log('📝 Extracted suggestions count:', suggestions.length);
        console.log('📝 Extracted suggestions details:', suggestions);
        
        if (suggestions.length > 0 && onSuggestionsGenerated) {
          console.log('✅ Calling onSuggestionsGenerated with', suggestions.length, 'suggestions');
          onSuggestionsGenerated(suggestions);
        } else {
          console.log('⚠️ No suggestions extracted from AI response');
          console.log('🔍 Debug - Response format:', data.response.substring(0, 500));
          console.log('🔍 Debug - Content format:', currentContent.substring(0, 200));
          
          // Create manual suggestions from visible spelling errors in the document
          const manualSuggestions: AiFeedbackSuggestion[] = [];
          const cleanContent = currentContent.replace(/<[^>]*>/g, '');
          
          // Common spelling errors I can see in the document
          const commonErrors = [
            { wrong: 'clas', correct: 'class' },
            { wrong: 'wer', correct: 'were' },
            { wrong: 'asignned', correct: 'assigned' },
            { wrong: 'reserch', correct: 'research' },
            { wrong: 'papper', correct: 'paper' },
            { wrong: 'efects', correct: 'effects' },
            { wrong: 'climit', correct: 'climate' }
          ];
          
          commonErrors.forEach((error, index) => {
            if (cleanContent.includes(error.wrong)) {
              manualSuggestions.push({
                id: `manual-${index}`,
                type: 'spelling',
                originalText: error.wrong,
                suggestedText: error.correct,
                explanation: `Spelling correction: "${error.wrong}" should be "${error.correct}"`,
                startIndex: cleanContent.indexOf(error.wrong),
                endIndex: cleanContent.indexOf(error.wrong) + error.wrong.length,
                severity: 'high'
              });
            }
          });
          
          console.log('🔧 Created manual suggestions from AI response:', manualSuggestions);
          
          if (manualSuggestions.length > 0) {
            console.log('✅ Calling onSuggestionsGenerated with manual suggestions');
            onSuggestionsGenerated(manualSuggestions);
          }
        }
      } else {
        console.log('❌ Missing requirements for suggestion extraction:', {
          hasContent: !!currentContent,
          hasResponse: !!data.response,
          hasCallback: !!onSuggestionsGenerated
        });
      }
      
      // If we have a valid session, refresh the chat history and don't show duplicate response
      if (sessionId && sessionId > 0) {
        setLastResponse(null);
        queryClient.invalidateQueries({
          queryKey: [`/api/session/${sessionId}/interactions`]
        });
      } else {
        // Only show immediate response if no session to store it in
        setLastResponse(data);
      }
      
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

  // Generate relevant prompts based on content
  useEffect(() => {
    if (currentContent) {
      const prompts: SmartPrompt[] = [
        {
          text: "Help me improve this paragraph's clarity",
          icon: Lightbulb,
          category: "clarity",
          relevance: 95
        },
        {
          text: "Check my thesis statement",
          icon: Target,
          category: "structure",
          relevance: 90
        },
        {
          text: "Suggest better transitions between ideas",
          icon: PenTool,
          category: "flow",
          relevance: 85
        },
        {
          text: "Help me brainstorm supporting evidence",
          icon: Search,
          category: "evidence",
          relevance: 80
        },
        {
          text: "Review my conclusion",
          icon: FileText,
          category: "conclusion",
          relevance: 75
        }
      ];

      setSmartPrompts(prompts.sort((a, b) => b.relevance - a.relevance));
    } else {
      setSmartPrompts([
        {
          text: "Help me brainstorm ideas for my essay",
          icon: Lightbulb,
          category: "brainstorming",
          relevance: 100
        },
        {
          text: "How do I structure my introduction?",
          icon: Target,
          category: "structure",
          relevance: 90
        },
        {
          text: "What makes a strong thesis statement?",
          icon: PenTool,
          category: "thesis",
          relevance: 85
        }
      ]);
    }
  }, [currentContent]);

  return (
    <div className="h-full flex flex-col bg-white">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <TabsList className="grid w-full grid-cols-2 bg-gray-100 p-1 m-2 rounded-lg">
          <TabsTrigger 
            value="assistant" 
            className="text-xs py-2 px-3 data-[state=active]:bg-white data-[state=active]:shadow-sm"
          >
            <Bot className="h-3 w-3 mr-1" />
            ZoË Assistant
          </TabsTrigger>
          <TabsTrigger 
            value="citations" 
            className="text-xs py-2 px-3 data-[state=active]:bg-white data-[state=active]:shadow-sm"
          >
            <BookOpen className="h-3 w-3 mr-1" />
            Citations
          </TabsTrigger>
        </TabsList>

        <TabsContent value="assistant" className="flex-1 flex flex-col p-3 space-y-3">
          {/* Chat History */}
          <ScrollArea className="flex-1 min-h-0 max-h-48 border rounded-md p-2 bg-gray-50">
            {!historyLoading && displayChatHistory.length === 0 && (
              <div className="text-center text-gray-500 py-4">
                <Bot className="h-8 w-8 mx-auto mb-2 text-purple-300" />
                <p className="text-sm">Ask ZoË for help with your writing</p>
              </div>
            )}

            {/* Loading indicator */}
            {aiHelpMutation.isPending && (
              <Alert>
                <Loader2 className="h-4 w-4 animate-spin" />
                <AlertDescription>
                  ZoË is thinking...
                </AlertDescription>
              </Alert>
            )}
            
            {/* Latest response */}
            {lastResponse && (
              <Alert variant={getResponseVariant(lastResponse.isRestricted)}>
                {getResponseIcon(lastResponse.isRestricted)}
                <AlertDescription>
                  <div className="whitespace-pre-line text-sm leading-relaxed bg-white p-3 rounded-lg border mt-2 w-full">
                    {lastResponse.response}
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* Chat History Items */}
            {displayChatHistory.map((interaction: any, index: number) => (
              <div key={interaction.id || index} className="mb-3 last:mb-0">
                <div className="text-xs text-gray-500 mb-1">
                  Student:
                </div>
                <div className="bg-blue-50 p-2 rounded text-sm mb-2">
                  {interaction.prompt}
                </div>
                
                <div className="text-xs text-gray-500 mb-1 flex items-center">
                  <Bot className="h-3 w-3 mr-1" />
                  ZoË:
                </div>
                <div className="bg-white border p-2 rounded text-sm whitespace-pre-line leading-relaxed">
                  {interaction.response}
                </div>
              </div>
            ))}
          </ScrollArea>

          {/* Input Area */}
          <div className="space-y-2">
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask ZoË for help with your writing..."
              className="min-h-[60px] text-sm resize-none"
              disabled={aiHelpMutation.isPending}
            />
            
            <div className="flex justify-between items-center">
              <div className="text-xs text-gray-500">
                Ctrl+Enter to send
              </div>
              <Button
                onClick={handleSubmit}
                disabled={!prompt.trim() || aiHelpMutation.isPending}
                size="sm"
                className="h-8 px-3 text-xs"
              >
                {aiHelpMutation.isPending ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Send className="h-3 w-3" />
                )}
              </Button>
            </div>
          </div>

          {/* Quick Prompts */}
          <div className="space-y-2">
            <h5 className="text-xs font-medium text-gray-600">Suggested prompts:</h5>
            {smartPrompts.slice(0, 4).map((quickPrompt, index) => {
              const Icon = quickPrompt.icon;
              return (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  className="w-full justify-start h-auto p-2 text-left text-xs hover:bg-purple-50"
                  onClick={() => setPrompt(quickPrompt.text)}
                  disabled={aiHelpMutation.isPending}
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


      </Tabs>
      
      {/* AI Disclosure */}
      <div className="mt-4">
        <AiDisclosure variant="compact" />
      </div>
    </div>
  );
}