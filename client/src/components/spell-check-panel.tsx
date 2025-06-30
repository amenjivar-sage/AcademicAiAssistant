import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { SpellCheck, CheckCircle, XCircle, Loader2, AlertCircle } from "lucide-react";

interface SpellingSuggestion {
  word: string;
  suggestions: string[];
  context?: string;
  severity: 'high' | 'medium' | 'low';
}

interface SpellCheckPanelProps {
  suggestions: SpellingSuggestion[];
  isAnalyzing: boolean;
  currentWord?: string;
  onApplySuggestion: (originalWord: string, newWord: string) => void;
  onIgnoreSuggestion: (word: string) => void;
  onClearAll: () => void;
}

export default function SpellCheckPanel({
  suggestions,
  isAnalyzing,
  currentWord,
  onApplySuggestion,
  onIgnoreSuggestion,
  onClearAll
}: SpellCheckPanelProps) {
  const [ignoredWords, setIgnoredWords] = useState<Set<string>>(new Set());

  const handleIgnore = (word: string) => {
    setIgnoredWords(prev => {
      const newSet = new Set(prev);
      newSet.add(word);
      return newSet;
    });
    onIgnoreSuggestion(word);
  };

  const handleApply = (originalWord: string, newWord: string) => {
    onApplySuggestion(originalWord, newWord);
    // Remove from ignored list if it was there
    setIgnoredWords(prev => {
      const newSet = new Set(prev);
      newSet.delete(originalWord);
      return newSet;
    });
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'high': return <AlertCircle className="h-3 w-3" />;
      case 'medium': return <AlertCircle className="h-3 w-3" />;
      case 'low': return <SpellCheck className="h-3 w-3" />;
      default: return <SpellCheck className="h-3 w-3" />;
    }
  };

  const visibleSuggestions = suggestions.filter(s => !ignoredWords.has(s.word));

  return (
    <Card className="w-80 h-96 flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center justify-between">
          <div className="flex items-center">
            <SpellCheck className="h-4 w-4 mr-2" />
            Spell Check
          </div>
          {suggestions.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearAll}
              className="text-xs h-6 px-2"
            >
              Clear All
            </Button>
          )}
        </CardTitle>
        
        {/* Status indicator */}
        <div className="text-xs text-gray-600 flex items-center">
          {isAnalyzing ? (
            <>
              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
              Analyzing{currentWord ? `: "${currentWord}"` : '...'}
            </>
          ) : (
            <>
              {visibleSuggestions.length === 0 ? (
                <>
                  <CheckCircle className="h-3 w-3 mr-1 text-green-500" />
                  No spelling issues found
                </>
              ) : (
                <>
                  <AlertCircle className="h-3 w-3 mr-1 text-orange-500" />
                  {visibleSuggestions.length} issue{visibleSuggestions.length !== 1 ? 's' : ''} found
                </>
              )}
            </>
          )}
        </div>
      </CardHeader>

      <CardContent className="flex-1 p-3 pt-0">
        <ScrollArea className="h-full">
          {visibleSuggestions.length === 0 && !isAnalyzing ? (
            <div className="text-center text-gray-500 py-8">
              <SpellCheck className="h-8 w-8 mx-auto mb-2 text-gray-300" />
              <p className="text-sm">Click "AI Spell Check" to analyze your writing</p>
            </div>
          ) : (
            <div className="space-y-3">
              {visibleSuggestions.map((suggestion, index) => (
                <div key={index} className="border rounded-lg p-3 bg-gray-50">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center">
                      <Badge 
                        variant="outline" 
                        className={`text-xs mr-2 ${getSeverityColor(suggestion.severity)}`}
                      >
                        {getSeverityIcon(suggestion.severity)}
                        <span className="ml-1 capitalize">{suggestion.severity}</span>
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="mb-2">
                    <span className="text-sm font-medium text-red-600 bg-red-50 px-2 py-1 rounded">
                      "{suggestion.word}"
                    </span>
                  </div>
                  
                  {suggestion.context && (
                    <div className="mb-2 text-xs text-gray-600 italic">
                      Context: {suggestion.context}
                    </div>
                  )}
                  
                  {suggestion.suggestions.length > 0 && (
                    <div className="mb-3">
                      <div className="text-xs text-gray-600 mb-1">Suggestions:</div>
                      <div className="flex flex-wrap gap-1">
                        {suggestion.suggestions.slice(0, 3).map((sug, sugIndex) => (
                          <Button
                            key={sugIndex}
                            variant="outline"
                            size="sm"
                            className="text-xs h-6 px-2 hover:bg-green-50 hover:border-green-300"
                            onClick={() => handleApply(suggestion.word, sug)}
                          >
                            "{sug}"
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <div className="flex justify-between">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs h-6 px-2 text-gray-500 hover:text-gray-700"
                      onClick={() => handleIgnore(suggestion.word)}
                    >
                      <XCircle className="h-3 w-3 mr-1" />
                      Ignore
                    </Button>
                    
                    {suggestion.suggestions.length > 0 && (
                      <Button
                        variant="default"
                        size="sm"
                        className="text-xs h-6 px-2 bg-green-600 hover:bg-green-700"
                        onClick={() => handleApply(suggestion.word, suggestion.suggestions[0])}
                      >
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Apply "{suggestion.suggestions[0]}"
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}