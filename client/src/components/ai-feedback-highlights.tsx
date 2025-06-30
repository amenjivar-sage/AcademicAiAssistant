import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Check, X, AlertCircle, Edit3 } from 'lucide-react';

export interface AiFeedbackSuggestion {
  id: string;
  type: 'grammar' | 'spelling' | 'style' | 'structure';
  originalText: string;
  suggestedText: string;
  explanation: string;
  startIndex: number;
  endIndex: number;
  severity: 'low' | 'medium' | 'high';
}

interface AiFeedbackHighlightsProps {
  content: string;
  suggestions: AiFeedbackSuggestion[];
  onApplySuggestion: (suggestionId: string, newText: string) => void;
  onDismissSuggestion: (suggestionId: string) => void;
  onContentChange: (newContent: string) => void;
}

export default function AiFeedbackHighlights({
  content,
  suggestions,
  onApplySuggestion,
  onDismissSuggestion,
  onContentChange
}: AiFeedbackHighlightsProps) {
  const [activeSuggestion, setActiveSuggestion] = useState<string | null>(null);

  // Parse AI response to extract suggestions
  const parseAiResponseForSuggestions = (aiResponse: string): AiFeedbackSuggestion[] => {
    const suggestions: AiFeedbackSuggestion[] = [];
    
    // Look for specific correction patterns in AI response
    const correctionPatterns = [
      // Grammar corrections: "Change 'X' to 'Y'"
      /Change\s+['"]([^'"]+)['"]\s+to\s+['"]([^'"]+)['"](?:\s*-\s*(.+?)(?:\.|$))?/gi,
      // Spelling corrections: "Replace 'X' with 'Y'"
      /Replace\s+['"]([^'"]+)['"]\s+with\s+['"]([^'"]+)['"](?:\s*-\s*(.+?)(?:\.|$))?/gi,
      // Style suggestions: "Consider changing 'X' to 'Y'"
      /Consider\s+changing\s+['"]([^'"]+)['"]\s+to\s+['"]([^'"]+)['"](?:\s*-\s*(.+?)(?:\.|$))?/gi,
    ];

    correctionPatterns.forEach((pattern, patternIndex) => {
      let match;
      while ((match = pattern.exec(aiResponse)) !== null) {
        const originalText = match[1];
        const suggestedText = match[2];
        const explanation = match[3] || 'AI suggested improvement';

        // Find the position of this text in the document
        const startIndex = content.toLowerCase().indexOf(originalText.toLowerCase());
        if (startIndex !== -1) {
          suggestions.push({
            id: `suggestion-${Date.now()}-${patternIndex}-${suggestions.length}`,
            type: patternIndex === 0 ? 'grammar' : patternIndex === 1 ? 'spelling' : 'style',
            originalText,
            suggestedText,
            explanation,
            startIndex,
            endIndex: startIndex + originalText.length,
            severity: patternIndex === 0 ? 'high' : patternIndex === 1 ? 'medium' : 'low'
          });
        }
      }
    });

    return suggestions;
  };

  // Render content with highlights
  const renderContentWithHighlights = () => {
    if (!suggestions.length) {
      return <div dangerouslySetInnerHTML={{ __html: content }} />;
    }

    let result = content;
    const sortedSuggestions = [...suggestions].sort((a, b) => b.startIndex - a.startIndex);

    sortedSuggestions.forEach((suggestion) => {
      const before = result.substring(0, suggestion.startIndex);
      const highlighted = result.substring(suggestion.startIndex, suggestion.endIndex);
      const after = result.substring(suggestion.endIndex);

      const severityColors = {
        high: 'bg-red-100 border-red-300 text-red-800',
        medium: 'bg-yellow-100 border-yellow-300 text-yellow-800',
        low: 'bg-blue-100 border-blue-300 text-blue-800'
      };

      const highlightClass = severityColors[suggestion.severity];
      
      result = before + 
        `<span 
          class="ai-suggestion cursor-pointer border-2 rounded px-1 ${highlightClass}" 
          data-suggestion-id="${suggestion.id}"
          title="${suggestion.explanation}"
        >${highlighted}</span>` + 
        after;
    });

    return <div dangerouslySetInnerHTML={{ __html: result }} />;
  };

  // Handle click on highlighted text
  useEffect(() => {
    const handleSuggestionClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (target.classList.contains('ai-suggestion')) {
        const suggestionId = target.getAttribute('data-suggestion-id');
        setActiveSuggestion(suggestionId);
      }
    };

    document.addEventListener('click', handleSuggestionClick);
    return () => document.removeEventListener('click', handleSuggestionClick);
  }, []);

  const activeSuggestionData = suggestions.find(s => s.id === activeSuggestion);

  return (
    <div className="relative">
      <div className="prose max-w-none">
        {renderContentWithHighlights()}
      </div>

      {/* Floating suggestion card */}
      {activeSuggestionData && (
        <Card className="absolute top-4 right-4 w-80 shadow-lg border-2 border-blue-200 z-50">
          <CardContent className="p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center space-x-2">
                <Edit3 className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-semibold text-blue-800 capitalize">
                  {activeSuggestionData.type} Suggestion
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setActiveSuggestion(null)}
                className="h-6 w-6 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-600 mb-1">Current:</p>
                <p className="text-sm bg-red-50 p-2 rounded border">
                  "{activeSuggestionData.originalText}"
                </p>
              </div>

              <div>
                <p className="text-sm text-gray-600 mb-1">Suggested:</p>
                <p className="text-sm bg-green-50 p-2 rounded border">
                  "{activeSuggestionData.suggestedText}"
                </p>
              </div>

              <div>
                <p className="text-sm text-gray-600 mb-1">Explanation:</p>
                <p className="text-sm text-gray-700">
                  {activeSuggestionData.explanation}
                </p>
              </div>

              <div className="flex space-x-2 pt-2">
                <Button
                  size="sm"
                  onClick={() => {
                    onApplySuggestion(activeSuggestionData.id, activeSuggestionData.suggestedText);
                    setActiveSuggestion(null);
                  }}
                  className="flex-1"
                >
                  <Check className="h-4 w-4 mr-1" />
                  Apply
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    onDismissSuggestion(activeSuggestionData.id);
                    setActiveSuggestion(null);
                  }}
                  className="flex-1"
                >
                  <X className="h-4 w-4 mr-1" />
                  Ignore
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Suggestions count indicator */}
      {suggestions.length > 0 && (
        <div className="absolute top-2 left-2">
          <div className="bg-blue-600 text-white text-xs px-2 py-1 rounded-full flex items-center space-x-1">
            <AlertCircle className="h-3 w-3" />
            <span>{suggestions.length} suggestions</span>
          </div>
        </div>
      )}
    </div>
  );
}

// Utility function to extract suggestions from AI response text
export const extractSuggestionsFromAiResponse = (
  aiResponse: string, 
  documentContent: string
): AiFeedbackSuggestion[] => {
  const suggestions: AiFeedbackSuggestion[] = [];
  
  // Improved patterns to capture various AI feedback formats
  const patterns = [
    // Pattern 1: "Change X to Y" or "Replace X with Y"
    /(Change|Replace)\s+['"`]([^'"`]+)['"`]\s+(to|with)\s+['"`]([^'"`]+)['"`](?:\s*[:-]\s*(.+?)(?:\.|$))?/gi,
    
    // Pattern 2: "X should be Y"
    /['"`]([^'"`]+)['"`]\s+should\s+be\s+['"`]([^'"`]+)['"`](?:\s*[:-]\s*(.+?)(?:\.|$))?/gi,
    
    // Pattern 3: "Instead of X, use Y"
    /Instead\s+of\s+['"`]([^'"`]+)['"`],?\s+use\s+['"`]([^'"`]+)['"`](?:\s*[:-]\s*(.+?)(?:\.|$))?/gi,
    
    // Pattern 4: Grammar corrections in format "X -> Y"
    /['"`]([^'"`]+)['"`]\s*->\s*['"`]([^'"`]+)['"`](?:\s*[:-]\s*(.+?)(?:\.|$))?/gi
  ];

  patterns.forEach((pattern, index) => {
    let match;
    while ((match = pattern.exec(aiResponse)) !== null) {
      let originalText, suggestedText, explanation;
      
      if (index === 0) { // Change/Replace pattern
        originalText = match[2];
        suggestedText = match[4];
        explanation = match[5] || 'AI suggested correction';
      } else if (index === 1) { // "should be" pattern
        originalText = match[1];
        suggestedText = match[2];
        explanation = match[3] || 'AI suggested improvement';
      } else if (index === 2) { // "Instead of" pattern
        originalText = match[1];
        suggestedText = match[2];
        explanation = match[3] || 'AI suggested alternative';
      } else { // Arrow pattern
        originalText = match[1];
        suggestedText = match[2];
        explanation = match[3] || 'AI suggested correction';
      }

      // Find position in document (case insensitive)
      const startIndex = documentContent.toLowerCase().indexOf(originalText.toLowerCase());
      if (startIndex !== -1) {
        // Determine suggestion type based on context
        let type: 'grammar' | 'spelling' | 'style' | 'structure' = 'grammar';
        if (explanation.toLowerCase().includes('spell')) type = 'spelling';
        else if (explanation.toLowerCase().includes('style') || explanation.toLowerCase().includes('clarity')) type = 'style';
        else if (explanation.toLowerCase().includes('structure') || explanation.toLowerCase().includes('organization')) type = 'structure';

        suggestions.push({
          id: `ai-suggestion-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          type,
          originalText: documentContent.substring(startIndex, startIndex + originalText.length), // Use actual case from document
          suggestedText,
          explanation,
          startIndex,
          endIndex: startIndex + originalText.length,
          severity: type === 'spelling' ? 'high' : type === 'grammar' ? 'medium' : 'low'
        });
      }
    }
  });

  return suggestions;
};