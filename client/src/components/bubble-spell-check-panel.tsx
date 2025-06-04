import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { CheckCircle, X, RefreshCw, Undo, ChevronLeft, ChevronRight, Edit } from 'lucide-react';
import { checkSpelling, checkSpellingWithAI, applySpellCheckSuggestion, applyAutoCorrections, SpellCheckResult } from '@/utils/spell-check';

interface BubbleSpellCheckPanelProps {
  content: string;
  onContentChange: (newContent: string) => void;
  isOpen: boolean;
  onClose: () => void;
  onSpellErrorsChange?: (errors: SpellCheckResult[]) => void;
  onCurrentErrorChange?: (index: number) => void;
}

export default function BubbleSpellCheckPanel({ 
  content, 
  onContentChange, 
  isOpen, 
  onClose, 
  onSpellErrorsChange, 
  onCurrentErrorChange 
}: BubbleSpellCheckPanelProps) {
  const [spellErrors, setSpellErrors] = useState<SpellCheckResult[]>([]);
  const [currentErrorIndex, setCurrentErrorIndex] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);
  const [editingWord, setEditingWord] = useState<string>("");
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [recentChanges, setRecentChanges] = useState<Array<{original: string, corrected: string, timestamp: number}>>([]);
  const [showSuccessMessage, setShowSuccessMessage] = useState<string | null>(null);
  const [lastCheckedContent, setLastCheckedContent] = useState<string>('');

  // Debounced spell checking with content change detection
  const debouncedSpellCheck = useCallback(() => {
    if (!isOpen || isLoading || content === lastCheckedContent) return;
    
    setIsLoading(true);
    setLastCheckedContent(content);
    
    // Apply auto-corrections for common typos first
    const autoCorrectResult = applyAutoCorrections(content);
    if (autoCorrectResult.changes.length > 0) {
      onContentChange(autoCorrectResult.corrected);
      setRecentChanges(prev => [...prev, ...autoCorrectResult.changes]);
      setIsLoading(false);
      return;
    }

    // Use AI-powered spell checking
    checkSpellingWithAI(content).then(errors => {
      setSpellErrors(errors);
      onSpellErrorsChange?.(errors);
      setCurrentErrorIndex(0);
      onCurrentErrorChange?.(0);
      setIsLoading(false);
    }).catch(error => {
      console.error('AI spell check failed, using fallback:', error);
      // Fallback to basic spell checking if AI fails
      const errors = checkSpelling(content);
      setSpellErrors(errors);
      onSpellErrorsChange?.(errors);
      setCurrentErrorIndex(0);
      onCurrentErrorChange?.(0);
      setIsLoading(false);
    });
  }, [content, isOpen, isLoading, lastCheckedContent, onContentChange, onSpellErrorsChange, onCurrentErrorChange]);

  // Only run spell check when panel is first opened or content significantly changes
  useEffect(() => {
    if (isOpen && !isLoading && content !== lastCheckedContent && content.length > 10) {
      const timer = setTimeout(debouncedSpellCheck, 3000); // Much longer debounce
      return () => clearTimeout(timer);
    }
  }, [isOpen]); // Only trigger on panel open, not content changes

  // Manual spell check trigger
  const runSpellCheck = () => {
    if (!isLoading) {
      debouncedSpellCheck();
    }
  };

  // Navigation functions
  const goToNextError = () => {
    if (currentErrorIndex < spellErrors.length - 1) {
      const newIndex = currentErrorIndex + 1;
      setCurrentErrorIndex(newIndex);
      onCurrentErrorChange?.(newIndex);
    }
  };

  const goToPreviousError = () => {
    if (currentErrorIndex > 0) {
      const newIndex = currentErrorIndex - 1;
      setCurrentErrorIndex(newIndex);
      onCurrentErrorChange?.(newIndex);
    }
  };

  const handleAcceptSuggestion = (suggestionText?: string) => {
    const error = spellErrors[currentErrorIndex];
    if (!error) return;

    const replacement = suggestionText || (error.suggestions && error.suggestions[0]) || error.suggestion;
    const newContent = applySpellCheckSuggestion(content, error, suggestionText);
    
    // Track the change for undo functionality
    setRecentChanges(prev => [...prev, {
      original: error.word,
      corrected: replacement || error.word,
      timestamp: Date.now()
    }]);

    onContentChange(newContent);
    
    // Show success message
    setShowSuccessMessage(`"${error.word}" → "${replacement}"`);
    setTimeout(() => setShowSuccessMessage(null), 2000);

    // Remove the corrected error and move to next
    const newErrors = [...spellErrors];
    newErrors.splice(currentErrorIndex, 1);
    setSpellErrors(newErrors);
    onSpellErrorsChange?.(newErrors);
    
    if (newErrors.length === 0) {
      onClose();
    } else {
      // Adjust current index
      if (currentErrorIndex >= newErrors.length) {
        const newIndex = Math.max(0, newErrors.length - 1);
        setCurrentErrorIndex(newIndex);
        onCurrentErrorChange?.(newIndex);
      } else {
        onCurrentErrorChange?.(currentErrorIndex);
      }
    }
  };

  const handleIgnoreError = () => {
    // Remove the ignored error and move to next
    const newErrors = [...spellErrors];
    newErrors.splice(currentErrorIndex, 1);
    setSpellErrors(newErrors);
    onSpellErrorsChange?.(newErrors);
    
    if (newErrors.length === 0) {
      onClose();
    } else {
      // Adjust current index
      if (currentErrorIndex >= newErrors.length) {
        const newIndex = Math.max(0, newErrors.length - 1);
        setCurrentErrorIndex(newIndex);
        onCurrentErrorChange?.(newIndex);
      } else {
        onCurrentErrorChange?.(currentErrorIndex);
      }
    }
  };

  // Undo functionality
  const handleUndo = () => {
    if (recentChanges.length === 0) return;
    
    const lastChange = recentChanges[recentChanges.length - 1];
    const updatedContent = content.replace(new RegExp(`\\b${lastChange.corrected}\\b`, 'g'), lastChange.original);
    onContentChange(updatedContent);
    
    setRecentChanges(prev => prev.slice(0, -1));
    setShowSuccessMessage(`Undid: "${lastChange.corrected}" → "${lastChange.original}"`);
    setTimeout(() => setShowSuccessMessage(null), 2000);
  };

  const handleGetNewSuggestions = () => {
    if (!editingWord.trim()) return;
    
    const error = spellErrors[currentErrorIndex];
    if (!error) return;

    setIsLoading(true);
    
    // Check if the edited word is actually correct
    checkSpellingWithAI(editingWord)
      .then(suggestions => {
        if (suggestions.length === 0) {
          // Word is correct, apply it as the correction
          handleAcceptSuggestion(editingWord);
        } else {
          // Word still has errors, update suggestions
          const updatedErrors = [...spellErrors];
          updatedErrors[currentErrorIndex] = {
            ...error,
            word: editingWord,
            suggestions: suggestions[0].suggestions || []
          };
          setSpellErrors(updatedErrors);
          onSpellErrorsChange?.(updatedErrors);
        }
        setIsLoading(false);
        setIsEditing(false);
        setEditingWord("");
      })
      .catch(error => {
        console.error('Failed to get new suggestions:', error);
        setIsLoading(false);
        setIsEditing(false);
        setEditingWord("");
      });
  };

  // Keyboard shortcuts
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!isOpen) return;
    
    if (e.key === 'Escape') {
      if (isEditing) {
        setIsEditing(false);
        setEditingWord("");
      } else {
        onClose();
      }
    } else if (e.key === 'Enter' && isEditing) {
      e.preventDefault();
      handleGetNewSuggestions();
    } else if (e.ctrlKey && e.key === 'z') {
      e.preventDefault();
      handleUndo();
    } else if (e.key === 'ArrowLeft' && !isEditing) {
      e.preventDefault();
      goToPreviousError();
    } else if (e.key === 'ArrowRight' && !isEditing) {
      e.preventDefault();
      goToNextError();
    }
  }, [isOpen, isEditing, handleGetNewSuggestions, onClose]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  if (!isOpen) return null;

  const currentError = spellErrors[currentErrorIndex];
  const hasErrors = spellErrors.length > 0;

  return (
    <Card className="w-80 h-auto flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Spell Check</CardTitle>
          <div className="flex items-center gap-2">
            {recentChanges.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleUndo}
                className="h-8 px-2 text-xs text-blue-600 hover:bg-blue-50"
                title="Undo last correction (Ctrl+Z)"
              >
                <Undo className="h-3 w-3 mr-1" />
                Undo
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={runSpellCheck}
              disabled={isLoading}
              className="h-8 px-3 text-xs"
              title="Check spelling"
            >
              {isLoading ? (
                <RefreshCw className="h-3 w-3 animate-spin mr-1" />
              ) : (
                <RefreshCw className="h-3 w-3 mr-1" />
              )}
              Check
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0"
              title="Close spell check (Esc)"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        <div className="flex items-center justify-between">
          {showSuccessMessage && (
            <div className="flex items-center gap-2 text-green-600 text-sm">
              <CheckCircle className="h-4 w-4" />
              <span>{showSuccessMessage}</span>
            </div>
          )}
          {!showSuccessMessage && !hasErrors ? (
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle className="h-4 w-4" />
              <span className="text-sm">No spelling errors found</span>
            </div>
          ) : !showSuccessMessage && hasErrors && (
            <div className="flex items-center gap-2">
              <Badge variant="destructive" className="text-xs">
                {spellErrors.length} error{spellErrors.length !== 1 ? 's' : ''} found
              </Badge>
              <span className="text-sm text-gray-500">
                {currentErrorIndex + 1} of {spellErrors.length}
              </span>
            </div>
          )}
          
          {hasErrors && (
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={goToPreviousError}
                disabled={currentErrorIndex === 0}
                className="h-8 w-8 p-0"
                title="Previous error (←)"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={goToNextError}
                disabled={currentErrorIndex === spellErrors.length - 1}
                className="h-8 w-8 p-0"
                title="Next error (→)"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 p-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin mr-2" />
            <span>Checking spelling...</span>
          </div>
        ) : !hasErrors ? (
          <div className="text-center py-8 text-gray-500">
            <CheckCircle className="h-12 w-12 mx-auto mb-2 text-green-500" />
            <p>All good! No spelling errors detected.</p>
          </div>
        ) : currentError ? (
          <div className="space-y-4">
            {/* Current Error Display */}
            <div className="border rounded-lg p-4 bg-red-50 border-red-200">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium text-red-800">Misspelled Word</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setIsEditing(true);
                    setEditingWord(currentError.word);
                  }}
                  className="h-6 w-6 p-0 text-red-600"
                  title="Edit word"
                >
                  <Edit className="h-3 w-3" />
                </Button>
              </div>
              
              {isEditing ? (
                <div className="space-y-2">
                  <Input
                    value={editingWord}
                    onChange={(e) => setEditingWord(e.target.value)}
                    placeholder="Type the correct word..."
                    className="text-sm"
                    onKeyDown={(e) => e.key === 'Enter' && handleGetNewSuggestions()}
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={handleGetNewSuggestions}
                      disabled={isLoading || !editingWord.trim()}
                      className="h-7 text-xs"
                    >
                      Get Suggestions
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setIsEditing(false);
                        setEditingWord("");
                      }}
                      className="h-7 text-xs"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-lg font-mono bg-white px-3 py-2 rounded border">
                  "{currentError.word}"
                </p>
              )}
            </div>

            {/* Suggestions */}
            {currentError.suggestions && currentError.suggestions.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium text-gray-700">Suggestions:</h4>
                <div className="grid gap-2">
                  {currentError.suggestions.slice(0, 4).map((suggestion, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      onClick={() => handleAcceptSuggestion(suggestion)}
                      className="justify-start h-8 text-sm hover:bg-green-50 hover:border-green-300"
                    >
                      {suggestion}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2 pt-2">
              <Button
                onClick={handleIgnoreError}
                variant="outline"
                className="flex-1"
              >
                Ignore
              </Button>
              {currentError.suggestions && currentError.suggestions.length > 0 && (
                <Button
                  onClick={() => handleAcceptSuggestion()}
                  className="flex-1"
                >
                  Accept "{currentError.suggestions[0]}"
                </Button>
              )}
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}