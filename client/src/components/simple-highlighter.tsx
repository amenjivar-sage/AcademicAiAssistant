import { useEffect } from 'react';

interface SimpleHighlighterProps {
  content: string;
  suggestions: Array<{
    id: string;
    originalText: string;
    suggestedText: string;
    explanation: string;
    type: string;
  }>;
  onApplySuggestion: (suggestion: any) => void;
  onDismissSuggestion: (id: string) => void;
}

export default function SimpleHighlighter({
  content,
  suggestions,
  onApplySuggestion,
  onDismissSuggestion
}: SimpleHighlighterProps) {
  
  useEffect(() => {
    if (suggestions.length === 0) return;
    
    console.log('🎯 SimpleHighlighter: Processing', suggestions.length, 'suggestions');
    
    // Find the Quill editor container
    const quillContainer = document.querySelector('.ql-editor');
    if (!quillContainer) {
      console.log('❌ Quill editor not found');
      return;
    }
    
    console.log('✅ Found Quill editor, adding highlights');
    
    // Remove existing highlights
    const existingHighlights = quillContainer.querySelectorAll('.ai-highlight');
    existingHighlights.forEach(highlight => {
      const textNode = document.createTextNode(highlight.textContent || '');
      highlight.parentNode?.replaceChild(textNode, highlight);
    });
    
    // Add new highlights
    suggestions.forEach((suggestion, index) => {
      console.log(`📍 Processing suggestion ${index + 1}:`, suggestion.originalText);
      
      // Find text nodes containing the suggestion text
      const walker = document.createTreeWalker(
        quillContainer,
        NodeFilter.SHOW_TEXT,
        null
      );
      
      const textNodes = [];
      let node;
      while (node = walker.nextNode()) {
        textNodes.push(node);
      }
      
      textNodes.forEach(textNode => {
        const nodeText = textNode.textContent || '';
        const lowerNodeText = nodeText.toLowerCase();
        const lowerSuggestionText = suggestion.originalText.toLowerCase();
        
        const startIndex = lowerNodeText.indexOf(lowerSuggestionText);
        if (startIndex !== -1) {
          console.log(`✅ Found "${suggestion.originalText}" in text node`);
          
          const beforeText = nodeText.substring(0, startIndex);
          const matchText = nodeText.substring(startIndex, startIndex + suggestion.originalText.length);
          const afterText = nodeText.substring(startIndex + suggestion.originalText.length);
          
          // Create highlight span
          const highlightSpan = document.createElement('span');
          highlightSpan.className = 'ai-highlight';
          highlightSpan.style.cssText = `
            background-color: #fef3c7;
            border-bottom: 2px solid #f59e0b;
            cursor: pointer;
            position: relative;
            padding: 1px 2px;
            border-radius: 2px;
          `;
          highlightSpan.textContent = matchText;
          highlightSpan.setAttribute('data-suggestion-id', suggestion.id);
          highlightSpan.setAttribute('title', `${suggestion.originalText} → ${suggestion.suggestedText}: ${suggestion.explanation}`);
          
          // Add click handler
          highlightSpan.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            if (confirm(`Change "${suggestion.originalText}" to "${suggestion.suggestedText}"?\n\n${suggestion.explanation}`)) {
              onApplySuggestion(suggestion);
            } else {
              onDismissSuggestion(suggestion.id);
            }
          });
          
          // Replace the text node
          const parent = textNode.parentNode;
          if (parent) {
            if (beforeText) parent.insertBefore(document.createTextNode(beforeText), textNode);
            parent.insertBefore(highlightSpan, textNode);
            if (afterText) parent.insertBefore(document.createTextNode(afterText), textNode);
            parent.removeChild(textNode);
          }
        }
      });
    });
    
  }, [suggestions, content]);
  
  return null; // This component only manipulates the DOM
}