import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Check, X } from 'lucide-react';
import { AiSuggestion } from '@/utils/ai-suggestion-parser';

interface DocumentHighlighterProps {
  content: string;
  suggestions: AiSuggestion[];
  onApplySuggestion: (suggestion: AiSuggestion) => void;
  onDismissSuggestion: (suggestionId: string) => void;
  editorRef: React.RefObject<any>;
}

export default function DocumentHighlighter({
  content,
  suggestions,
  onApplySuggestion,
  onDismissSuggestion,
  editorRef
}: DocumentHighlighterProps) {
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!editorRef.current || suggestions.length === 0) return;

    const addHighlights = () => {
      try {
        const quillEditor = editorRef.current.getEditor();
        if (!quillEditor) return;

        // Clear existing highlights
        const existingHighlights = document.querySelectorAll('.ai-suggestion-highlight');
        existingHighlights.forEach(highlight => {
          if (highlight.parentNode) {
            const textNode = document.createTextNode(highlight.textContent || '');
            highlight.parentNode.replaceChild(textNode, highlight);
          }
        });

        // Get the editor content element
        const editorElement = quillEditor.root;
        if (!editorElement) return;

        // Clean content for text matching
        const cleanContent = content.replace(/<[^>]*>/g, '');

        suggestions.forEach((suggestion, index) => {
          const textToFind = suggestion.originalText;
          
          // Find all text nodes in the editor
          const walker = document.createTreeWalker(
            editorElement,
            NodeFilter.SHOW_TEXT,
            null
          );

          const textNodes = [];
          let node;
          while (node = walker.nextNode()) {
            textNodes.push(node);
          }

          // Search for the text in text nodes
          textNodes.forEach(textNode => {
            const nodeText = textNode.textContent || '';
            const lowerNodeText = nodeText.toLowerCase();
            const lowerTextToFind = textToFind.toLowerCase();
            
            const startIndex = lowerNodeText.indexOf(lowerTextToFind);
            if (startIndex !== -1) {
              const endIndex = startIndex + textToFind.length;
              
              // Create highlight span
              const highlightSpan = document.createElement('span');
              highlightSpan.className = `ai-suggestion-highlight ai-suggestion-${suggestion.id}`;
              highlightSpan.style.cssText = `
                background-color: ${suggestion.type === 'spelling' ? '#fef3c7' : suggestion.type === 'grammar' ? '#ddd6fe' : '#fce7f3'};
                border-bottom: 2px solid ${suggestion.type === 'spelling' ? '#f59e0b' : suggestion.type === 'grammar' ? '#8b5cf6' : '#ec4899'};
                cursor: pointer;
                position: relative;
                border-radius: 2px;
                padding: 1px 2px;
              `;
              highlightSpan.setAttribute('data-suggestion-id', suggestion.id);
              highlightSpan.setAttribute('data-suggestion-type', suggestion.type);
              
              // Split the text node and insert highlight
              const beforeText = nodeText.substring(0, startIndex);
              const highlightText = nodeText.substring(startIndex, endIndex);
              const afterText = nodeText.substring(endIndex);
              
              highlightSpan.textContent = highlightText;
              
              // Create text nodes for before and after
              const beforeNode = document.createTextNode(beforeText);
              const afterNode = document.createTextNode(afterText);
              
              // Replace the original text node
              const parent = textNode.parentNode;
              if (parent) {
                parent.insertBefore(beforeNode, textNode);
                parent.insertBefore(highlightSpan, textNode);
                parent.insertBefore(afterNode, textNode);
                parent.removeChild(textNode);
              }
              
              // Add click event to show tooltip
              highlightSpan.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                setActiveTooltip(suggestion.id);
                
                const rect = highlightSpan.getBoundingClientRect();
                setTooltipPosition({
                  x: rect.left + rect.width / 2,
                  y: rect.top - 10
                });
              });
            }
          });
        });
      } catch (error) {
        console.error('Error adding highlights:', error);
      }
    };

    // Add highlights after a short delay to ensure editor is ready
    const timer = setTimeout(addHighlights, 100);
    return () => clearTimeout(timer);
  }, [suggestions, content, editorRef]);

  const handleApply = (suggestion: AiSuggestion) => {
    onApplySuggestion(suggestion);
    setActiveTooltip(null);
  };

  const handleDismiss = (suggestionId: string) => {
    onDismissSuggestion(suggestionId);
    setActiveTooltip(null);
  };

  const activeSuggestion = suggestions.find(s => s.id === activeTooltip);

  return (
    <>
      {/* Tooltip */}
      {activeTooltip && activeSuggestion && (
        <div className="fixed z-50" style={{
          left: tooltipPosition.x,
          top: tooltipPosition.y,
          transform: 'translate(-50%, -100%)'
        }}>
          <Card className="p-3 shadow-lg max-w-sm bg-white border-2">
            <div className="text-sm font-medium text-gray-800 mb-2">
              {activeSuggestion.type.charAt(0).toUpperCase() + activeSuggestion.type.slice(1)} Suggestion
            </div>
            <div className="text-sm text-gray-600 mb-3">
              Change "<span className="font-medium text-red-700">{activeSuggestion.originalText}</span>" 
              to "<span className="font-medium text-green-700">{activeSuggestion.suggestedText}</span>"
            </div>
            <div className="text-xs text-gray-500 mb-3">
              {activeSuggestion.explanation}
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => handleApply(activeSuggestion)}
                className="bg-green-600 hover:bg-green-700 text-white flex-1"
              >
                <Check className="h-3 w-3 mr-1" />
                Apply
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleDismiss(activeSuggestion.id)}
                className="flex-1"
              >
                <X className="h-3 w-3 mr-1" />
                Ignore
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Click outside to close tooltip */}
      {activeTooltip && (
        <div 
          className="fixed inset-0 z-40"
          onClick={() => setActiveTooltip(null)}
        />
      )}
    </>
  );
}