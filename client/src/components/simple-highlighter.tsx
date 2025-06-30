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
          
          // Create a container for the highlighted word and buttons
          const container = document.createElement('span');
          container.className = 'ai-suggestion-container';
          container.style.cssText = `
            display: inline-block;
            position: relative;
            margin: 0 2px;
          `;
          
          // Create highlight span
          const highlightSpan = document.createElement('span');
          highlightSpan.className = 'ai-highlight';
          highlightSpan.style.cssText = `
            background-color: #fef3c7 !important;
            border: 2px solid #f59e0b !important;
            padding: 2px 4px !important;
            border-radius: 4px;
            font-weight: bold;
            display: inline-block;
          `;
          highlightSpan.textContent = matchText;
          
          // Create buttons container
          const buttonsContainer = document.createElement('div');
          buttonsContainer.className = 'suggestion-buttons';
          buttonsContainer.style.cssText = `
            position: absolute;
            top: -35px;
            left: 0;
            display: flex;
            gap: 4px;
            z-index: 1000;
            background: white;
            padding: 4px;
            border-radius: 6px;
            border: 1px solid #ddd;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            white-space: nowrap;
          `;
          
          // Create Apply button
          const applyBtn = document.createElement('button');
          applyBtn.textContent = 'Apply';
          applyBtn.style.cssText = `
            background: #22c55e;
            color: white;
            border: none;
            padding: 4px 8px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 11px;
            font-weight: bold;
          `;
          applyBtn.title = `Change "${suggestion.originalText}" to "${suggestion.suggestedText}"`;
          
          // Create Ignore button
          const ignoreBtn = document.createElement('button');
          ignoreBtn.textContent = 'Ignore';
          ignoreBtn.style.cssText = `
            background: #ef4444;
            color: white;
            border: none;
            padding: 4px 8px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 11px;
            font-weight: bold;
          `;
          ignoreBtn.title = 'Dismiss this suggestion';
          
          // Add button click handlers
          applyBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('✅ Applying suggestion:', suggestion.originalText, '→', suggestion.suggestedText);
            onApplySuggestion(suggestion);
          });
          
          ignoreBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('❌ Ignoring suggestion:', suggestion.id);
            onDismissSuggestion(suggestion.id);
          });
          
          // Assemble the components
          buttonsContainer.appendChild(applyBtn);
          buttonsContainer.appendChild(ignoreBtn);
          container.appendChild(highlightSpan);
          container.appendChild(buttonsContainer);
          
          // Replace the text node with the complete container
          const parent = textNode.parentNode;
          if (parent) {
            if (beforeText) parent.insertBefore(document.createTextNode(beforeText), textNode);
            parent.insertBefore(container, textNode);
            if (afterText) parent.insertBefore(document.createTextNode(afterText), textNode);
            parent.removeChild(textNode);
          }
        }
      });
    });
    
  }, [suggestions, content]);
  
  return null; // This component only manipulates the DOM
}