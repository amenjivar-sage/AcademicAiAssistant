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
  disabled?: boolean;
  placeholder?: string;
  onSpellCheckStatusChange?: (isActive: boolean) => void;
  enablePageBreaks?: boolean;
  wordsPerPage?: number;
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
  onClose,
  disabled = false,
  placeholder = "Start writing...",
  onSpellCheckStatusChange,
  enablePageBreaks = false,
  wordsPerPage = 250
}: InlineSpellCheckProps) {
  const [spellErrors, setSpellErrors] = useState<SpellCheckResult[]>([]);
  const [currentErrorIndex, setCurrentErrorIndex] = useState<number>(0);
  const [tooltips, setTooltips] = useState<SpellTooltip[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingWord, setEditingWord] = useState("");
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const [recentChanges, setRecentChanges] = useState<Array<{original: string, corrected: string, timestamp: number}>>([]);

  // Debounced spell checking
  const debouncedSpellCheck = useCallback(() => {
    console.log('Spell check triggered - isActive:', isActive, 'content length:', content.length, 'content:', content.substring(0, 50));
    
    if (!isActive) return;
    
    if (!content || content.trim().length === 0) {
      console.log('Spell check skipped - no content');
      setSpellErrors([]);
      setTooltips([]);
      return;
    }
    
    setIsLoading(true);
    
    // Disable auto-save at the start of spell check
    onSpellCheckStatusChange?.(true);
    
    // Apply auto-corrections first
    const autoCorrectResult = applyAutoCorrections(content);
    if (autoCorrectResult.changes.length > 0) {
      onContentChange(autoCorrectResult.corrected);
      setRecentChanges(prev => [...prev, ...autoCorrectResult.changes]);
      return;
    }

    // Use AI-powered spell checking
    console.log('Sending to AI spell check:', content.substring(0, 100));
    checkSpellingWithAI(content).then(errors => {
      console.log('Spell check found errors:', errors);
      
      // Filter out correctly spelled words to prevent false positives
      const validErrors = errors.filter(error => {
        const actualWord = content.substring(error.startIndex, error.endIndex);
        
        // Check if the word in the text matches exactly what the AI thinks is wrong
        if (actualWord.toLowerCase() !== error.word.toLowerCase()) {
          return false;
        }
        
        // If the word is already correctly capitalized or spelled, don't flag it
        const suggestion = error.suggestions && error.suggestions[0];
        if (suggestion && actualWord === suggestion) {
          return false;
        }
        
        return true;
      });
      
      // Sort errors by position so we process them from beginning to end
      const sortedErrors = validErrors.sort((a, b) => a.startIndex - b.startIndex);
      
      console.log('Filtered and sorted valid errors:', sortedErrors);
      setSpellErrors(sortedErrors);
      setCurrentErrorIndex(0);
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

  // Recalculate tooltip positions when errors or current index changes
  useEffect(() => {
    if (spellErrors.length > 0) {
      console.log('Calculating tooltip positions for', spellErrors.length, 'errors, current index:', currentErrorIndex);
      calculateTooltipPositions(spellErrors);
    } else {
      console.log('No spell errors to show tooltips for');
      setTooltips([]);
    }
  }, [spellErrors, currentErrorIndex, content]);

  const calculateTooltipPositions = (errors: SpellCheckResult[]) => {
    console.log('calculateTooltipPositions called with', errors.length, 'errors');
    if (errors.length === 0) {
      console.log('No errors to calculate positions for');
      return;
    }

    // Only show tooltip for the current error
    const currentError = errors[currentErrorIndex];
    if (!currentError) {
      console.log('No current error at index', currentErrorIndex);
      return;
    }

    console.log('Creating tooltip for current error:', currentError);
    const newTooltips: SpellTooltip[] = [];
    
    // Simple positioning based on approximate character positions
    const lineHeight = 25.6; // 16px * 1.6 line-height
    const charWidth = 9.6; // Approximate character width for Georgia serif
    
    // Count lines up to this word
    const textBeforeWord = content.substring(0, currentError.startIndex);
    const lines = textBeforeWord.split('\n');
    const currentLine = lines.length - 1;
    const charInLine = lines[lines.length - 1].length;
    
    // Calculate initial position - center the tooltip horizontally
    let top = (currentLine + 1) * lineHeight + 70; // Add padding for overlay
    let left = Math.max(50, charInLine * charWidth); // Start near the word but with minimum margin
    
    // Always position the tooltip in a visible, centered location
    const tooltipWidth = 350;
    const tooltipHeight = 200;
    const margin = 20;
    
    // Use simpler, more reliable positioning
    // Position tooltip in a fixed, visible location within the editor
    left = Math.max(50, 200); // Fixed horizontal position that's always visible
    
    // Position tooltip vertically based on error location
    if (currentLine < 5) {
      // Error is near top, position tooltip below
      top = Math.max(120, (currentLine + 2) * lineHeight + 50);
    } else {
      // Error is further down, position tooltip in top area for visibility
      top = 80;
    }
    
    // Ensure minimum/maximum bounds for visibility
    top = Math.max(50, Math.min(top, 300));

    const tooltip = {
      error: currentError,
      position: {
        top: top,
        left: left
      },
      visible: true
    };

    console.log('Created tooltip with corrected position:', tooltip, 'for line:', currentLine);
    newTooltips.push(tooltip);
    setTooltips(newTooltips);
  };

  const handleAcceptSuggestion = (errorIndex: number, suggestion: string) => {
    const error = spellErrors[errorIndex];
    if (!error) return;

    const newContent = applySpellCheckSuggestion(content, error, suggestion);
    const lengthChange = suggestion.length - error.word.length;
    
    // Track the change for undo functionality
    setRecentChanges(prev => [...prev, {
      original: error.word,
      corrected: suggestion,
      timestamp: Date.now()
    }]);

    // Update all remaining error positions to account for the text change
    const updatedErrors = spellErrors
      .filter((_, index) => index !== errorIndex)
      .map(err => {
        // If error is after the corrected word, adjust its position
        if (err.startIndex > error.endIndex) {
          return {
            ...err,
            startIndex: err.startIndex + lengthChange,
            endIndex: err.endIndex + lengthChange
          };
        }
        return err;
      });
    
    setSpellErrors(updatedErrors);
    onContentChange(newContent);
    
    // Move to next error - keep panel open when all errors are processed
    if (updatedErrors.length === 0) {
      // All errors processed! Panel stays open for new spell checks
      console.log('✅ All spelling errors processed!');
      onSpellCheckStatusChange?.(false);
      // Panel stays open so user can run spell check again if needed
    } else {
      // Auto-advance to next error
      const newIndex = Math.min(currentErrorIndex, updatedErrors.length - 1);
      setCurrentErrorIndex(newIndex);
      console.log('📍 Advanced to error', newIndex + 1, 'of', updatedErrors.length);
      
      // Recalculate tooltips for the updated errors
      setTimeout(() => {
        calculateTooltipPositions(updatedErrors);
      }, 100);
    }
  };

  const handleIgnoreError = (errorIndex: number) => {
    // Move to next error or close if done
    moveToNextError();
  };

  const moveToNextError = () => {
    const newErrors = [...spellErrors];
    newErrors.splice(currentErrorIndex, 1);
    setSpellErrors(newErrors);
    
    if (newErrors.length === 0) {
      // All errors processed! Panel stays open for new spell checks
      console.log('✅ All spelling errors processed!');
    } else {
      // Auto-advance to next error
      if (currentErrorIndex >= newErrors.length) {
        setCurrentErrorIndex(Math.max(0, newErrors.length - 1));
      }
      console.log('📍 Advanced to error', (currentErrorIndex >= newErrors.length ? newErrors.length : currentErrorIndex + 1), 'of', newErrors.length);
      calculateTooltipPositions(newErrors);
    }
  };

  const handleAcceptAllSuggestions = () => {
    let updatedContent = content;
    let cumulativeLengthChange = 0;
    
    // Process errors from end to beginning to avoid position conflicts
    const sortedErrors = [...spellErrors].sort((a, b) => b.startIndex - a.startIndex);
    
    sortedErrors.forEach(error => {
      const suggestion = error.suggestions && error.suggestions[0];
      if (suggestion) {
        const beforeText = updatedContent.substring(0, error.startIndex);
        const afterText = updatedContent.substring(error.endIndex);
        updatedContent = beforeText + suggestion + afterText;
        
        // Track changes
        setRecentChanges(prev => [...prev, {
          original: error.word,
          corrected: suggestion,
          timestamp: Date.now()
        }]);
      }
    });
    
    onContentChange(updatedContent);
    setSpellErrors([]);
    setTooltips([]);
    onSpellCheckStatusChange?.(false);
    console.log('✅ All spelling errors fixed with Fix All!');
    // Panel stays open so user can run spell check again if needed
  };

  const handleEditWord = () => {
    const currentError = spellErrors[currentErrorIndex];
    if (!currentError) return;
    
    setIsEditing(true);
    setEditingWord(currentError.word);
  };

  const handleSaveEdit = () => {
    if (!editingWord.trim()) return;
    
    const currentError = spellErrors[currentErrorIndex];
    if (!currentError) return;

    // Check if the edited word is correct by spell checking it
    checkSpellingWithAI(editingWord).then(suggestions => {
      if (suggestions.length === 0) {
        // Word is correct, apply it
        handleAcceptSuggestion(currentErrorIndex, editingWord);
      } else {
        // Word still has errors, update the current error
        const updatedErrors = [...spellErrors];
        updatedErrors[currentErrorIndex] = {
          ...currentError,
          word: editingWord,
          suggestions: suggestions[0].suggestions || []
        };
        setSpellErrors(updatedErrors);
        calculateTooltipPositions(updatedErrors);
      }
      setIsEditing(false);
      setEditingWord("");
    }).catch(error => {
      console.error('Failed to validate edited word:', error);
      setIsEditing(false);
      setEditingWord("");
    });
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditingWord("");
  };

  const createHighlightedContent = () => {
    if (!isActive || spellErrors.length === 0) {
      return content;
    }

    // Only highlight the current error
    const currentError = spellErrors[currentErrorIndex];
    if (!currentError) return content;

    console.log('Creating highlight for:', currentError);

    let highlightedText = content;
    
    const beforeText = highlightedText.substring(0, currentError.startIndex);
    const errorText = highlightedText.substring(currentError.startIndex, currentError.endIndex);
    const afterText = highlightedText.substring(currentError.endIndex);

    console.log('Text parts:', { beforeText, errorText, afterText });

    // Create a much more visible highlight
    const highlightedError = `<span style="
      background: rgba(239, 68, 68, 0.4) !important;
      border-bottom: 2px wavy #ef4444 !important;
      color: inherit !important;
      border-radius: 2px;
      padding: 0 1px;
      text-decoration: underline wavy #ef4444;
      text-decoration-thickness: 2px;
      text-underline-offset: 2px;
    " data-error-word="${errorText}">${errorText}</span>`;
    
    highlightedText = beforeText + highlightedError + afterText;

    console.log('Final highlighted text:', highlightedText);

    return highlightedText;
  };



  return (
    <div className="relative w-full min-h-full">
      {/* Main text editor */}
      <textarea
        ref={editorRef}
        disabled={disabled}
        value={content}
        onChange={(e) => onContentChange(e.target.value)}
        placeholder={placeholder}
        className="w-full min-h-full p-8 focus:outline-none resize-none text-gray-900 leading-relaxed border-none bg-transparent relative z-20"
        style={{
          minHeight: '100%',
          fontFamily: 'Georgia, serif',
          fontSize: '16px',
          lineHeight: '1.6',
        }}
      />
      
      {/* Spell check highlighting overlay - show all errors with red underlines */}
      {isActive && spellErrors.length > 0 && (
        <div
          className="absolute inset-0 pointer-events-none z-30"
          style={{
            fontFamily: 'Georgia, serif',
            fontSize: '16px',
            lineHeight: '1.6',
            padding: '32px',
            whiteSpace: 'pre-wrap',
            wordWrap: 'break-word',
            overflow: 'hidden'
          }}
        >
          {spellErrors.slice(0, 5).map((error, index) => {
            // Simple positioning calculation
            const textBeforeError = content.substring(0, error.startIndex);
            const lineHeight = 25.6; // 16px * 1.6 line-height
            const charWidth = 7.5; // Adjusted for better accuracy
            
            // Count actual lines by splitting on newlines
            const lines = textBeforeError.split('\n');
            const currentLine = lines.length - 1;
            const lastLineText = lines[lines.length - 1] || '';
            const charInLine = lastLineText.length;
            
            // Highlight current error more prominently
            const isCurrentError = index === currentErrorIndex;
            
            return (
              <span
                key={`error-${index}`}
                style={{
                  position: 'absolute',
                  top: `${currentLine * lineHeight + 54}px`,
                  left: `${charInLine * charWidth + 32}px`,
                  width: `${error.word.length * charWidth}px`,
                  height: '3px',
                  background: isCurrentError ? '#ef4444' : '#f97316', // Red for current, orange for others
                  borderRadius: '1px',
                  pointerEvents: 'none',
                  zIndex: isCurrentError ? 15 : 10,
                  display: 'block',
                  boxShadow: isCurrentError ? '0 2px 4px rgba(239, 68, 68, 0.6)' : '0 1px 2px rgba(249, 115, 22, 0.4)',
                  opacity: isCurrentError ? 1 : 0.7
                }}
                title={`Misspelled: ${error.word}`}
              />
            );
          })}
        </div>
      )}

      {/* Inline tooltip for current error only */}
      {tooltips.map((tooltip, index) => (
        <div
          key={index}
          className="absolute z-50 bg-white border border-gray-200 rounded-lg shadow-lg p-4 min-w-80"
          style={{
            top: `${tooltip.position.top}px`,
            left: `${tooltip.position.left}px`,
            maxWidth: '350px'
          }}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Badge variant="destructive" className="text-xs">
                {currentErrorIndex + 1} of {spellErrors.length}
              </Badge>
              <span className="font-mono text-sm bg-red-50 px-2 py-1 rounded">
                "{tooltip.error.word}"
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleEditWord}
                className="h-6 w-6 p-0"
                title="Edit word"
              >
                <Edit className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleIgnoreError(index)}
                className="h-6 w-6 p-0"
                title="Ignore"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>

          {/* Edit mode */}
          {isEditing ? (
            <div className="space-y-2">
              <input
                type="text"
                value={editingWord}
                onChange={(e) => setEditingWord(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                placeholder="Type the correct word..."
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveEdit();
                  if (e.key === 'Escape') handleCancelEdit();
                }}
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleSaveEdit}
                  disabled={!editingWord.trim()}
                  className="h-7 text-xs"
                >
                  Save
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCancelEdit}
                  className="h-7 text-xs"
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <>
              {/* Suggestions */}
              {tooltip.error.suggestions && tooltip.error.suggestions.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs text-gray-600 mb-2">Suggestions:</p>
                  {tooltip.error.suggestions.slice(0, 3).map((suggestion, suggestionIndex) => (
                    <Button
                      key={suggestionIndex}
                      variant="outline"
                      size="sm"
                      onClick={() => handleAcceptSuggestion(index, suggestion)}
                      className="w-full justify-start h-8 text-sm hover:bg-green-50 hover:border-green-300"
                    >
                      <Check className="h-4 w-4 mr-2" />
                      {suggestion}
                    </Button>
                  ))}
                  
                  {/* Accept All button when there are multiple errors */}
                  {spellErrors.length > 1 && (
                    <div className="pt-2 mt-2 border-t border-gray-200">
                      <Button
                        variant="default"
                        size="sm"
                        onClick={handleAcceptAllSuggestions}
                        className="w-full h-8 text-sm bg-blue-600 hover:bg-blue-700"
                      >
                        Correct All {spellErrors.length} Errors
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* Triangle pointer */}
          <div
            className="absolute w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent border-b-white"
            style={{
              top: '-4px',
              left: '30px'
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



      {!isLoading && spellErrors.length > 0 && (
        <div className="absolute top-4 right-4 z-50 bg-red-50 border border-red-200 rounded-lg px-3 py-2 shadow-sm">
          <div className="flex items-center gap-2 text-sm text-red-700">
            <Badge variant="destructive" className="text-xs">
              {spellErrors.length} error{spellErrors.length !== 1 ? 's' : ''}
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                onSpellCheckStatusChange?.(false);
                onClose();
              }}
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