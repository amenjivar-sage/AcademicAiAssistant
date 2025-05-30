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
  onSpellCheckStatusChange
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
    if (!isActive) return;
    
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
      
      console.log('Filtered valid errors:', validErrors);
      setSpellErrors(validErrors);
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
      calculateTooltipPositions(spellErrors);
    }
  }, [spellErrors, currentErrorIndex, content]);

  const calculateTooltipPositions = (errors: SpellCheckResult[]) => {
    if (errors.length === 0) return;

    // Only show tooltip for the current error
    const currentError = errors[currentErrorIndex];
    if (!currentError) return;

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
    
    // Get editor bounds to constrain tooltip
    const editorElement = document.querySelector('.writing-editor') as HTMLElement;
    if (editorElement) {
      const editorRect = editorElement.getBoundingClientRect();
      const tooltipWidth = 350;
      const tooltipHeight = 200;
      const margin = 20;
      
      // Center the tooltip in the available space
      const centerX = editorRect.width / 2;
      left = centerX - (tooltipWidth / 2);
      
      // Keep tooltip within editor bounds horizontally
      const maxLeft = editorRect.width - tooltipWidth - margin;
      if (left > maxLeft) {
        left = maxLeft;
      }
      if (left < margin) {
        left = margin;
      }
      
      // Keep tooltip within editor bounds vertically
      const maxTop = editorRect.height - tooltipHeight - margin;
      if (top > maxTop) {
        // Position above the word instead
        top = Math.max(margin, (currentLine * lineHeight) - tooltipHeight - 10);
      }
    }

    newTooltips.push({
      error: currentError,
      position: {
        top: top,
        left: left
      },
      visible: true
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

    // Remove the corrected error from the list
    const updatedErrors = spellErrors.filter((_, index) => index !== errorIndex);
    setSpellErrors(updatedErrors);
    
    // Clear tooltips to remove red underlines
    setTooltips([]);

    onContentChange(newContent);
    
    // Move to next error or close if done
    if (updatedErrors.length === 0) {
      // Re-enable auto-save when spell check is complete
      onSpellCheckStatusChange?.(false);
      onClose();
    } else {
      // Adjust current error index if needed
      if (currentErrorIndex >= updatedErrors.length) {
        setCurrentErrorIndex(0);
      }
      // Don't re-run spell check automatically to prevent loops
      // User can manually continue if there are more errors
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
      onClose();
    } else {
      // Stay at same index if possible, or go to previous if at end
      if (currentErrorIndex >= newErrors.length) {
        setCurrentErrorIndex(Math.max(0, newErrors.length - 1));
      }
      calculateTooltipPositions(newErrors);
    }
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