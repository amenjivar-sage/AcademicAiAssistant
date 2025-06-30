import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Check, X, RefreshCw, SpellCheck } from 'lucide-react';

export interface SpellCheckSuggestion {
  id: string;
  originalText: string;
  suggestedText: string;
  explanation: string;
}

interface SpellCheckSuggestionsPanelProps {
  suggestions: SpellCheckSuggestion[];
  onApplySuggestion: (suggestion: SpellCheckSuggestion) => void;
  onDismissSuggestion: (suggestionId: string) => void;
  onApplyAll: () => void;
  onClose: () => void;
}

export default function SpellCheckSuggestionsPanel({
  suggestions,
  onApplySuggestion,
  onDismissSuggestion,
  onApplyAll,
  onClose
}: SpellCheckSuggestionsPanelProps) {
  const [processingId, setProcessingId] = useState<string | null>(null);

  const handleApply = async (suggestion: SpellCheckSuggestion) => {
    setProcessingId(suggestion.id);
    try {
      await onApplySuggestion(suggestion);
    } finally {
      setProcessingId(null);
    }
  };

  if (suggestions.length === 0) {
    return null;
  }

  return (
    <Card className="w-full max-w-2xl mx-auto mt-4 shadow-lg border-blue-200">
      <CardHeader className="pb-3 bg-blue-50">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-blue-800 flex items-center gap-2">
            <SpellCheck className="h-5 w-5" />
            Spelling Suggestions ({suggestions.length})
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
            className="p-3 rounded-lg border border-blue-200 bg-blue-50"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-medium text-blue-600">
                    Spelling Error
                  </span>
                </div>
                <div className="mb-2">
                  <span className="text-sm text-gray-600">Change: </span>
                  <span className="font-medium text-red-600 bg-red-100 px-2 py-1 rounded">
                    "{suggestion.originalText}"
                  </span>
                  <span className="text-sm text-gray-600 mx-2">→</span>
                  <span className="font-medium text-green-600 bg-green-100 px-2 py-1 rounded">
                    "{suggestion.suggestedText}"
                  </span>
                </div>
                <p className="text-sm text-gray-600">
                  {suggestion.explanation}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => handleApply(suggestion)}
                  size="sm"
                  className="bg-green-600 hover:bg-green-700 text-white"
                  disabled={processingId === suggestion.id}
                >
                  {processingId === suggestion.id ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4" />
                  )}
                  Apply
                </Button>
                <Button
                  onClick={() => onDismissSuggestion(suggestion.id)}
                  size="sm"
                  variant="outline"
                  className="text-red-600 hover:text-red-700"
                >
                  <X className="h-4 w-4" />
                  Dismiss
                </Button>
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}