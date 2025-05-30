import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CheckCircle, X, RefreshCw } from 'lucide-react';
import { checkSpelling, applySpellCheckSuggestion, SpellCheckResult } from '@/utils/spell-check';

interface SpellCheckPanelProps {
  content: string;
  onContentChange: (newContent: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

export default function SpellCheckPanel({ content, onContentChange, isOpen, onClose }: SpellCheckPanelProps) {
  const [spellErrors, setSpellErrors] = useState<SpellCheckResult[]>([]);
  const [processedErrors, setProcessedErrors] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (isOpen) {
      const errors = checkSpelling(content);
      setSpellErrors(errors);
      setProcessedErrors(new Set());
    }
  }, [content, isOpen]);

  const handleAcceptSuggestion = (errorIndex: number) => {
    const error = spellErrors[errorIndex];
    if (!error) return;

    const newContent = applySpellCheckSuggestion(content, error);
    onContentChange(newContent);
    
    // Mark this error as processed
    const newProcessed = new Set(processedErrors);
    newProcessed.add(errorIndex);
    setProcessedErrors(newProcessed);

    // Remove this error from the list after a short delay
    setTimeout(() => {
      setSpellErrors(prev => prev.filter((_, index) => index !== errorIndex));
    }, 300);
  };

  const handleIgnore = (errorIndex: number) => {
    const newProcessed = new Set(processedErrors);
    newProcessed.add(errorIndex);
    setProcessedErrors(newProcessed);
    
    // Remove this error from the list
    setTimeout(() => {
      setSpellErrors(prev => prev.filter((_, index) => index !== errorIndex));
    }, 100);
  };

  const handleRefreshCheck = () => {
    const errors = checkSpelling(content);
    setSpellErrors(errors);
    setProcessedErrors(new Set());
  };

  if (!isOpen) return null;

  const activeErrors = spellErrors.filter((_, index) => !processedErrors.has(index));

  return (
    <Card className="w-80 h-96 flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Spell Check</CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefreshCheck}
              className="h-8 w-8 p-0"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {activeErrors.length === 0 ? (
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle className="h-4 w-4" />
              <span className="text-sm">No spelling errors found</span>
            </div>
          ) : (
            <Badge variant="destructive" className="text-xs">
              {activeErrors.length} error{activeErrors.length !== 1 ? 's' : ''} found
            </Badge>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 p-0">
        <ScrollArea className="h-full px-4 pb-4">
          {activeErrors.length === 0 ? (
            <div className="text-center text-gray-500 mt-8">
              <CheckCircle className="h-12 w-12 mx-auto mb-2 text-green-500" />
              <p className="text-sm">Great job! No spelling errors detected.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {activeErrors.map((error, index) => (
                <div key={`${error.startIndex}-${error.word}`} className="border rounded-lg p-3 bg-gray-50">
                  <div className="mb-2">
                    <span className="text-sm font-medium text-red-600">"{error.word}"</span>
                    <span className="text-xs text-gray-500 ml-2">
                      Position: {error.startIndex}-{error.endIndex}
                    </span>
                  </div>
                  
                  <div className="mb-3">
                    <p className="text-xs text-gray-600 mb-1">Suggestion:</p>
                    <span className="text-sm font-medium text-green-600">"{error.suggestion}"</span>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleAcceptSuggestion(index)}
                      className="h-8 text-xs"
                    >
                      Accept
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleIgnore(index)}
                      className="h-8 text-xs"
                    >
                      Ignore
                    </Button>
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