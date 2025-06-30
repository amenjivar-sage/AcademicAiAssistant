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
            background-color: #fef3c7 !important;
            border-bottom: 3px wavy #f59e0b !important;
            cursor: pointer !important;
            position: relative;
            padding: 2px 4px !important;
            border-radius: 3px;
            font-weight: bold;
            text-decoration: underline;
            text-decoration-color: #f59e0b;
          `;
          highlightSpan.textContent = matchText;
          highlightSpan.setAttribute('data-suggestion-id', suggestion.id);
          highlightSpan.setAttribute('title', `${suggestion.originalText} → ${suggestion.suggestedText}: ${suggestion.explanation}`);
          
          // Add click handler to show tooltip
          highlightSpan.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            // Remove any existing tooltips
            document.querySelectorAll('.suggestion-tooltip').forEach(tooltip => tooltip.remove());
            
            // Create tooltip
            const tooltip = document.createElement('div');
            tooltip.className = 'suggestion-tooltip';
            tooltip.style.cssText = `
              position: absolute;
              background: white;
              border: 1px solid #ddd;
              border-radius: 8px;
              padding: 12px;
              box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
              z-index: 1000;
              max-width: 300px;
              font-size: 14px;
              top: ${e.pageY + 10}px;
              left: ${e.pageX}px;
            `;
            
            tooltip.innerHTML = `
              <div style="margin-bottom: 8px;">
                <strong>Suggestion:</strong> ${suggestion.originalText} → ${suggestion.suggestedText}
              </div>
              <div style="margin-bottom: 12px; color: #666;">
                ${suggestion.explanation}
              </div>
              <div style="display: flex; gap: 8px;">
                <button class="apply-btn" style="
                  background: #22c55e;
                  color: white;
                  border: none;
                  padding: 6px 12px;
                  border-radius: 4px;
                  cursor: pointer;
                  font-size: 12px;
                ">Apply</button>
                <button class="ignore-btn" style="
                  background: #ef4444;
                  color: white;
                  border: none;
                  padding: 6px 12px;
                  border-radius: 4px;
                  cursor: pointer;
                  font-size: 12px;
                ">Ignore</button>
              </div>
            `;
            
            // Add button handlers
            const applyBtn = tooltip.querySelector('.apply-btn');
            const ignoreBtn = tooltip.querySelector('.ignore-btn');
            
            applyBtn?.addEventListener('click', () => {
              onApplySuggestion(suggestion);
              tooltip.remove();
            });
            
            ignoreBtn?.addEventListener('click', () => {
              onDismissSuggestion(suggestion.id);
              tooltip.remove();
            });
            
            // Close tooltip when clicking elsewhere
            const closeTooltip = (event: Event) => {
              if (!tooltip.contains(event.target as Node)) {
                tooltip.remove();
                document.removeEventListener('click', closeTooltip);
              }
            };
            
            document.addEventListener('click', closeTooltip);
            document.body.appendChild(tooltip);
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