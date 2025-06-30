import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Check, X, RefreshCw } from 'lucide-react';

export interface AiSuggestion {
  id: string;
  type: 'spelling' | 'grammar' | 'style';
  originalText: string;
  suggestedText: string;
  explanation: string;
  severity: 'low' | 'medium' | 'high';
}

interface AiSuggestionsPanelProps {
  suggestions: AiSuggestion[];
  onApplySuggestion: (suggestion: AiSuggestion) => void;
  onDismissSuggestion: (suggestionId: string) => void;
  onApplyAll: () => void;
  onClose: () => void;
}

export default function AiSuggestionsPanel({
  suggestions,
  onApplySuggestion,
  onDismissSuggestion,
  onApplyAll,
  onClose
}: AiSuggestionsPanelProps) {
  const [processingId, setProcessingId] = useState<string | null>(null);

  const handleApply = async (suggestion: AiSuggestion) => {
    setProcessingId(suggestion.id);
    try {
      await onApplySuggestion(suggestion);
    } finally {
      setProcessingId(null);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'border-red-200 bg-red-50';
      case 'medium': return 'border-yellow-200 bg-yellow-50';
      case 'low': return 'border-blue-200 bg-blue-50';
      default: return 'border-gray-200 bg-gray-50';
    }
  };

  if (suggestions.length === 0) {
    return null;
  }

  return (
    <Card className="w-full max-w-2xl mx-auto mt-4 shadow-lg">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-gray-800">
            AI Writing Suggestions ({suggestions.length})
          </CardTitle>
          <div className="flex gap-2">
            <Button
              onClick={onApplyAll}
              size="sm"
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <RefreshCw className="h-4 w-4 mr-1" />
              Apply All
            </Button>
            <Button
              onClick={onClose}
              size="sm"
              variant="outline"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 max-h-96 overflow-y-auto">
        {suggestions.map((suggestion) => (
          <div
            key={suggestion.id}
            className={`p-3 rounded-lg border ${getSeverityColor(suggestion.severity)}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-medium text-gray-600 capitalize">
                    {suggestion.type}
                  </span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    suggestion.severity === 'high' ? 'bg-red-100 text-red-700' :
                    suggestion.severity === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-blue-100 text-blue-700'
                  }`}>
                    {suggestion.severity}
                  </span>
                </div>
                <div className="mb-2">
                  <span className="text-sm text-gray-600">Change: </span>
                  <span className="bg-red-100 text-red-800 px-2 py-1 rounded text-sm">
                    "{suggestion.originalText}"
                  </span>
                  <span className="text-sm text-gray-600 mx-2">→</span>
                  <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-sm">
                    "{suggestion.suggestedText}"
                  </span>
                </div>
                <p className="text-sm text-gray-700">
                  {suggestion.explanation}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => handleApply(suggestion)}
                  size="sm"
                  variant="outline"
                  className="text-green-600 border-green-300 hover:bg-green-50"
                  disabled={processingId === suggestion.id}
                >
                  <Check className="h-4 w-4" />
                </Button>
                <Button
                  onClick={() => onDismissSuggestion(suggestion.id)}
                  size="sm"
                  variant="outline"
                  className="text-red-600 border-red-300 hover:bg-red-50"
                  disabled={processingId === suggestion.id}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}