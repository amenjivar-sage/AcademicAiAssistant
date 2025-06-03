import { useQuery } from "@tanstack/react-query";
import { Bot, User, MessageCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import AiDisclosure from "./ai-disclosure";

interface AiChatViewerProps {
  sessionId: number;
  studentName?: string;
}

interface AiInteraction {
  id: number;
  sessionId: number;
  prompt: string;
  response: string;
  isRestricted: boolean;
  createdAt: string;
}

export default function AiChatViewer({ sessionId, studentName }: AiChatViewerProps) {
  const { data: interactions = [], isLoading } = useQuery({
    queryKey: [`/api/session/${sessionId}/interactions`],
    enabled: !!sessionId && sessionId > 0,
  });

  const typedInteractions = Array.isArray(interactions) ? interactions as AiInteraction[] : [];

  if (isLoading) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="flex items-center text-sm">
            <Bot className="h-4 w-4 mr-2" />
            AI Assistance Log
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <p className="text-sm text-gray-500">Loading AI interactions...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (typedInteractions.length === 0) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="flex items-center text-sm">
            <Bot className="h-4 w-4 mr-2" />
            AI Assistance Log
            {studentName && <span className="text-xs text-gray-500 ml-2">({studentName})</span>}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <div className="text-center">
              <MessageCircle className="h-8 w-8 mx-auto text-gray-300 mb-2" />
              <p className="text-sm text-gray-500">No AI assistance used</p>
              <p className="text-xs text-gray-400">Student completed this work independently</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-sm">
          <div className="flex items-center">
            <Bot className="h-4 w-4 mr-2" />
            AI Assistance Log
            {studentName && <span className="text-xs text-gray-500 ml-2">({studentName})</span>}
          </div>
          <Badge variant="secondary" className="text-xs">
            {typedInteractions.length} interaction{typedInteractions.length !== 1 ? 's' : ''}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-96">
          <div className="p-4 space-y-4">
            {typedInteractions.map((interaction, index) => (
              <div key={interaction.id || index} className="space-y-3">
                {/* Student Question */}
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                      <User className="h-3 w-3 text-blue-600" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="bg-blue-50 rounded-lg p-3">
                      <p className="text-xs font-medium text-blue-900 mb-1">Student asked:</p>
                      <p className="text-sm text-blue-800">{interaction.prompt}</p>
                    </div>
                    {interaction.createdAt && (
                      <p className="text-xs text-gray-400 mt-1">
                        {new Date(interaction.createdAt).toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>

                {/* AI Response */}
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    <div className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center">
                      <Bot className="h-3 w-3 text-purple-600" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="bg-purple-50 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-xs font-medium text-purple-900">ZoË replied:</p>
                        {interaction.isRestricted && (
                          <Badge variant="destructive" className="text-xs">
                            Restricted
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-purple-800 whitespace-pre-line">
                        {interaction.response}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Divider between interactions */}
                {index < typedInteractions.length - 1 && (
                  <div className="border-t border-gray-100 pt-2" />
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
      <div className="px-4 pb-3">
        <AiDisclosure variant="compact" />
      </div>
    </Card>
  );
}