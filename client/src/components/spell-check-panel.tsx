import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CheckCircle, X, RefreshCw, Undo } from 'lucide-react';
import { checkSpelling, checkSpellingWithAI, applySpellCheckSuggestion, applyAutoCorrections, SpellCheckResult } from '@/utils/spell-check';

interface SpellCheckPanelProps {
  content: string;
  onContentChange: (newContent: string) => void;
  isOpen: boolean;
  onClose: () => void;
  onSpellErrorsChange?: (errors: SpellCheckResult[]) => void;
}

export default function SpellCheckPanel({ content, onContentChange, isOpen, onClose, onSpellErrorsChange }: SpellCheckPanelProps) {
  const [spellErrors, setSpellErrors] = useState<SpellCheckResult[]>([]);
  const [processedErrors, setProcessedErrors] = useState<Set<number>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingWord, setEditingWord] = useState<string>("");
  const [recentChanges, setRecentChanges] = useState<Array<{original: string, corrected: string, timestamp: number}>>([]);
  const [showSuccessMessage, setShowSuccessMessage] = useState<string | null>(null);

  // Debounced spell checking
  const debouncedSpellCheck = useCallback(() => {
    if (!isOpen) return;
    
    setIsLoading(true);
    // Apply auto-corrections for common typos first
    const autoCorrections = applyAutoCorrections(content);
    if (autoCorrections.corrected !== content) {
      onContentChange(autoCorrections.corrected);
      setRecentChanges(prev => [...prev, ...autoCorrections.changes]);
      return;
    }

    // Use AI-powered spell checking
    checkSpellingWithAI(content).then(errors => {
      setSpellErrors(errors);
      onSpellErrorsChange?.(errors);
      setProcessedErrors(new Set());
      setIsLoading(false);
    }).catch(error => {
      console.error('AI spell check failed, using fallback:', error);
      // Fallback to basic spell checking if AI fails
      const errors = checkSpelling(content);
      setSpellErrors(errors);
      onSpellErrorsChange?.(errors);
      setProcessedErrors(new Set());
      setIsLoading(false);
    });
  }, [content, isOpen, onContentChange]);

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(debouncedSpellCheck, 300);
      return () => clearTimeout(timer);
    }
  }, [debouncedSpellCheck]);

  const handleAcceptSuggestion = (errorIndex: number, suggestionText?: string) => {
    const error = spellErrors[errorIndex];
    if (!error) return;

    const originalText = content;
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
    
    // Mark this error as processed
    const newProcessed = new Set(processedErrors);
    newProcessed.add(errorIndex);
    setProcessedErrors(newProcessed);

    // Remove this error from the list immediately for faster UX
    setSpellErrors(prev => prev.filter((_, index) => index !== errorIndex));
  };

  const handleIgnore = (errorIndex: number) => {
    const newProcessed = new Set(processedErrors);
    newProcessed.add(errorIndex);
    setProcessedErrors(newProcessed);
    
    // Remove this error from the list immediately
    setSpellErrors(prev => prev.filter((_, index) => index !== errorIndex));
  };

  const handleRefreshCheck = () => {
    setIsLoading(true);
    checkSpellingWithAI(content).then(errors => {
      setSpellErrors(errors);
      setProcessedErrors(new Set());
      setIsLoading(false);
    }).catch(error => {
      console.error('AI spell check failed, using fallback:', error);
      const errors = checkSpelling(content);
      setSpellErrors(errors);
      setProcessedErrors(new Set());
      setIsLoading(false);
    });
  };

  const handleEditWord = (errorIndex: number) => {
    const error = spellErrors[errorIndex];
    setEditingIndex(errorIndex);
    setEditingWord(error.word);
  };

  const handleGetNewSuggestions = async (errorIndex: number) => {
    if (editingWord.trim() === "") return;
    
    setIsLoading(true);
    try {
      const newSuggestions = await checkSpellingWithAI(editingWord);
      if (newSuggestions.length === 0) {
        // Word is spelled correctly, apply it directly
        const error = spellErrors[errorIndex];
        const newContent = applySpellCheckSuggestion(content, error, editingWord);
        onContentChange(newContent);
        
        // Remove this error from the list
        setSpellErrors(prev => prev.filter((_, index) => index !== errorIndex));
      } else {
        // Update the error with new suggestions for the edited word
        setSpellErrors(prev => prev.map((error, index) => 
          index === errorIndex 
            ? { ...error, word: editingWord, suggestions: newSuggestions[0].suggestions || [editingWord] }
            : error
        ));
      }
    } catch (error) {
      console.error('Failed to get new suggestions:', error);
    }
    setIsLoading(false);
    setEditingIndex(null);
    setEditingWord("");
  };

  const handleCancelEdit = () => {
    setEditingIndex(null);
    setEditingWord("");
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

  // Keyboard shortcuts
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!isOpen) return;
    
    if (e.key === 'Escape') {
      if (editingIndex !== null) {
        handleCancelEdit();
      } else {
        onClose();
      }
    } else if (e.key === 'Enter' && editingIndex !== null) {
      e.preventDefault();
      handleGetNewSuggestions(editingIndex);
    } else if (e.ctrlKey && e.key === 'z') {
      e.preventDefault();
      handleUndo();
    }
  }, [isOpen, editingIndex, handleCancelEdit, onClose]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  if (!isOpen) return null;

  const activeErrors = spellErrors.filter((_, index) => !processedErrors.has(index));

  return (
    <Card className="w-80 h-96 flex flex-col">
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
              variant="ghost"
              size="sm"
              onClick={handleRefreshCheck}
              disabled={isLoading}
              className="h-8 w-8 p-0"
              title="Refresh spell check"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
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
        <div className="flex items-center gap-2">
          {showSuccessMessage && (
            <div className="flex items-center gap-2 text-green-600 text-sm">
              <CheckCircle className="h-4 w-4" />
              <span>{showSuccessMessage}</span>
            </div>
          )}
          {!showSuccessMessage && activeErrors.length === 0 ? (
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle className="h-4 w-4" />
              <span className="text-sm">No spelling errors found</span>
            </div>
          ) : !showSuccessMessage && (
            <Badge variant="destructive" className="text-xs">
              {activeErrors.length} error{activeErrors.length !== 1 ? 's' : ''} found
            </Badge>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 p-0">
        <ScrollArea className="h-full px-4 pb-4">
          {isLoading ? (
            <div className="text-center text-gray-500 mt-8">
              <RefreshCw className="h-8 w-8 mx-auto mb-2 animate-spin" />
              <p className="text-sm">Checking for spelling errors...</p>
            </div>
          ) : activeErrors.length === 0 ? (
            <div className="text-center text-gray-500 mt-8">
              <CheckCircle className="h-12 w-12 mx-auto mb-2 text-green-500" />
              <p className="text-sm">Great job! No spelling errors detected.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {activeErrors.map((error, index) => (
                <div key={`${error.startIndex}-${error.word}`} className="border rounded-lg p-3 bg-gray-50">
                  <div className="mb-2">
                    {editingIndex === index ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={editingWord}
                          onChange={(e) => setEditingWord(e.target.value)}
                          className="text-sm font-medium px-2 py-1 border rounded flex-1"
                          placeholder="Edit word..."
                          autoFocus
                        />
                        <Button
                          size="sm"
                          onClick={() => handleGetNewSuggestions(index)}
                          disabled={isLoading}
                          className="h-7 text-xs"
                        >
                          Apply/Check
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleCancelEdit}
                          className="h-7 text-xs"
                        >
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-red-600">"{error.word}"</span>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEditWord(index)}
                          className="h-6 text-xs px-2 text-blue-600 hover:bg-blue-50"
                        >
                          Edit
                        </Button>
                      </div>
                    )}
                    <span className="text-xs text-gray-500">
                      Position: {error.startIndex}-{error.endIndex}
                    </span>
                  </div>
                  
                  <div className="mb-3">
                    <p className="text-xs text-gray-600 mb-1">
                      {error.suggestions && error.suggestions.length > 1 ? 'Suggestions:' : 'Suggestion:'}
                    </p>
                    {error.suggestions && error.suggestions.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {error.suggestions.map((suggestion, suggIndex) => (
                          <Button
                            key={suggIndex}
                            size="sm"
                            variant="outline"
                            onClick={() => handleAcceptSuggestion(index, suggestion)}
                            className="h-7 text-xs px-2 text-green-600 border-green-200 hover:bg-green-50"
                          >
                            "{suggestion}"
                          </Button>
                        ))}
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleAcceptSuggestion(index)}
                        className="h-7 text-xs px-2 text-green-600 border-green-200 hover:bg-green-50"
                      >
                        "{error.suggestion}"
                      </Button>
                    )}
                  </div>
                  
                  <div className="flex gap-2 justify-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleIgnore(index)}
                      className="h-7 text-xs text-gray-500 hover:bg-gray-100"
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