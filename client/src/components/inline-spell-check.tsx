import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, Check, Edit } from 'lucide-react';
import { checkSpellingWithAI, applySpellCheckSuggestion, applyAutoCorrections, SpellCheckResult } from '@/utils/spell-check';

interface InlineSpellCheckProps {
  content: string;
  onContentChange: (content: string) => void;
  isActive: boolean;
  onClose: () => void;
}

interface SpellTooltip {
  error: SpellCheckResult;
  position: { top: number; left: number };
  visible: boolean;
}

export default function InlineSpellCheck({
  content,
  onContentChange,
  isActive,
  onClose
}: InlineSpellCheckProps) {
  const [spellErrors, setSpellErrors] = useState<SpellCheckResult[]>([]);
  const [tooltips, setTooltips] = useState<SpellTooltip[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);
  const [recentChanges, setRecentChanges] = useState<Array<{original: string, corrected: string, timestamp: number}>>([]);

  // Debounced spell checking
  const debouncedSpellCheck = useCallback(() => {
    if (!isActive) return;
    
    setIsLoading(true);
    
    // Apply auto-corrections first
    const autoCorrectResult = applyAutoCorrections(content);
    if (autoCorrectResult.changes.length > 0) {
      onContentChange(autoCorrectResult.corrected);
      setRecentChanges(prev => [...prev, ...autoCorrectResult.changes]);
      return;
    }

    // Use AI-powered spell checking
    checkSpellingWithAI(content).then(errors => {
      setSpellErrors(errors);
      calculateTooltipPositions(errors);
      setIsLoading(false);
    }).catch(error => {
      console.error('AI spell check failed:', error);
      setSpellErrors([]);
      setTooltips([]);
      setIsLoading(false);
    });
  }, [content, isActive, onContentChange]);

  useEffect(() => {
    if (isActive) {
      const timer = setTimeout(debouncedSpellCheck, 300);
      return () => clearTimeout(timer);
    } else {
      setSpellErrors([]);
      setTooltips([]);
    }
  }, [debouncedSpellCheck, isActive]);

  const calculateTooltipPositions = (errors: SpellCheckResult[]) => {
    if (!editorRef.current) return;

    const newTooltips: SpellTooltip[] = [];
    
    // Simple positioning based on approximate character positions
    errors.forEach((error, index) => {
      // Approximate position calculation
      const lineHeight = 24; // Approximate line height
      const charWidth = 9.6; // Approximate character width for Georgia serif
      
      // Count lines up to this word
      const textBeforeWord = content.substring(0, error.startIndex);
      const lines = textBeforeWord.split('\n');
      const currentLine = lines.length - 1;
      const charInLine = lines[lines.length - 1].length;
      
      newTooltips.push({
        error,
        position: {
          top: (currentLine + 1) * lineHeight + 40, // Add padding
          left: charInLine * charWidth + 32 // Add left padding
        },
        visible: true
      });
    });

    setTooltips(newTooltips);
  };

  const handleAcceptSuggestion = (errorIndex: number, suggestion: string) => {
    const error = spellErrors[errorIndex];
    if (!error) return;

    const newContent = applySpellCheckSuggestion(content, error, suggestion);
    
    // Track the change for undo functionality
    setRecentChanges(prev => [...prev, {
      original: error.word,
      corrected: suggestion,
      timestamp: Date.now()
    }]);

    onContentChange(newContent);
    
    // Remove this error from the list
    const newErrors = spellErrors.filter((_, index) => index !== errorIndex);
    setSpellErrors(newErrors);
    calculateTooltipPositions(newErrors);
    
    if (newErrors.length === 0) {
      onClose();
    }
  };

  const handleIgnoreError = (errorIndex: number) => {
    const newErrors = spellErrors.filter((_, index) => index !== errorIndex);
    setSpellErrors(newErrors);
    calculateTooltipPositions(newErrors);
    
    if (newErrors.length === 0) {
      onClose();
    }
  };

  const createHighlightedContent = () => {
    if (!isActive || spellErrors.length === 0) {
      return content;
    }

    let highlightedText = content;
    let offset = 0;

    // Sort errors by start index to process them in order
    const sortedErrors = [...spellErrors].sort((a, b) => a.startIndex - b.startIndex);

    sortedErrors.forEach((error) => {
      const beforeText = highlightedText.substring(0, error.startIndex + offset);
      const errorText = highlightedText.substring(error.startIndex + offset, error.endIndex + offset);
      const afterText = highlightedText.substring(error.endIndex + offset);

      // Highlight with a subtle red underline
      const highlightedError = `<span style="
        border-bottom: 2px wavy #ef4444;
        background: rgba(239, 68, 68, 0.1);
        position: relative;
      " data-error-word="${errorText}">${errorText}</span>`;
      
      highlightedText = beforeText + highlightedError + afterText;
      offset += highlightedError.length - errorText.length;
    });

    return highlightedText;
  };

  if (!isActive) return null;

  return (
    <div className="relative w-full h-full">
      {/* Highlighted content overlay */}
      <div
        ref={editorRef}
        className="absolute inset-0 pointer-events-none z-10"
        style={{
          fontFamily: 'Georgia, serif',
          fontSize: '16px',
          lineHeight: '1.6',
          padding: '32px',
          color: 'transparent',
          whiteSpace: 'pre-wrap',
          wordWrap: 'break-word'
        }}
        dangerouslySetInnerHTML={{ __html: createHighlightedContent() }}
      />

      {/* Inline tooltips */}
      {tooltips.map((tooltip, index) => (
        <div
          key={index}
          className="absolute z-50 bg-white border border-gray-200 rounded-lg shadow-lg p-3 min-w-64"
          style={{
            top: `${tooltip.position.top}px`,
            left: `${tooltip.position.left}px`,
            maxWidth: '300px'
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Badge variant="destructive" className="text-xs">
                Misspelled
              </Badge>
              <span className="font-mono text-sm bg-red-50 px-2 py-1 rounded">
                "{tooltip.error.word}"
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleIgnoreError(index)}
              className="h-6 w-6 p-0"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>

          {/* Suggestions */}
          {tooltip.error.suggestions && tooltip.error.suggestions.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs text-gray-600 mb-1">Suggestions:</p>
              {tooltip.error.suggestions.slice(0, 3).map((suggestion, suggestionIndex) => (
                <Button
                  key={suggestionIndex}
                  variant="outline"
                  size="sm"
                  onClick={() => handleAcceptSuggestion(index, suggestion)}
                  className="w-full justify-start h-7 text-xs hover:bg-green-50 hover:border-green-300"
                >
                  <Check className="h-3 w-3 mr-1" />
                  {suggestion}
                </Button>
              ))}
            </div>
          )}

          {/* Triangle pointer */}
          <div
            className="absolute w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent border-b-white"
            style={{
              top: '-4px',
              left: '20px'
            }}
          />
        </div>
      ))}

      {/* Loading indicator */}
      {isLoading && (
        <div className="absolute top-4 right-4 z-50 bg-white border rounded-lg px-3 py-2 shadow-sm">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full" />
            Checking spelling...
          </div>
        </div>
      )}

      {/* Results summary */}
      {!isLoading && spellErrors.length === 0 && (
        <div className="absolute top-4 right-4 z-50 bg-green-50 border border-green-200 rounded-lg px-3 py-2 shadow-sm">
          <div className="flex items-center gap-2 text-sm text-green-700">
            <Check className="h-4 w-4" />
            No spelling errors
          </div>
        </div>
      )}

      {!isLoading && spellErrors.length > 0 && (
        <div className="absolute top-4 right-4 z-50 bg-red-50 border border-red-200 rounded-lg px-3 py-2 shadow-sm">
          <div className="flex items-center gap-2 text-sm text-red-700">
            <Badge variant="destructive" className="text-xs">
              {spellErrors.length} error{spellErrors.length !== 1 ? 's' : ''}
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-5 w-5 p-0 ml-2"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}