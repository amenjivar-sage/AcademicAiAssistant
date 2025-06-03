import React, { useRef, useEffect, useState } from 'react';

interface SpellError {
  word: string;
  suggestions: string[];
  startIndex: number;
  endIndex: number;
}

interface HighlightedTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  spellErrors?: SpellError[];
  showSpellCheck?: boolean;
  currentErrorIndex?: number;
  className?: string;
  style?: React.CSSProperties;
}

export default function HighlightedTextEditor({
  value,
  onChange,
  placeholder,
  disabled,
  spellErrors = [],
  showSpellCheck = false,
  currentErrorIndex = -1,
  className,
  style
}: HighlightedTextEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const highlightRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  // Sync scroll positions
  const handleScroll = () => {
    if (textareaRef.current && highlightRef.current) {
      const textarea = textareaRef.current;
      setScrollTop(textarea.scrollTop);
      setScrollLeft(textarea.scrollLeft);
      highlightRef.current.scrollTop = textarea.scrollTop;
      highlightRef.current.scrollLeft = textarea.scrollLeft;
    }
  };

  // Create highlighted text with spell errors - only highlight current error
  const createHighlightedText = () => {
    if (!showSpellCheck || spellErrors.length === 0 || currentErrorIndex < 0) {
      return '';
    }

    const currentError = spellErrors[currentErrorIndex];
    if (!currentError) return '';

    let highlightedText = value;
    
    const beforeText = highlightedText.substring(0, currentError.startIndex);
    const errorText = highlightedText.substring(currentError.startIndex, currentError.endIndex);
    const afterText = highlightedText.substring(currentError.endIndex);

    // Highlight only the current error with a bubble-like style
    const highlightedError = `<span style="
      background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%);
      border: 2px solid #ef4444;
      border-radius: 8px;
      padding: 2px 4px;
      box-shadow: 0 2px 8px rgba(239, 68, 68, 0.3);
      position: relative;
      color: transparent;
      animation: pulse 2s infinite;
    " title="Suggested: ${currentError.suggestions.join(', ')}">${errorText}</span>`;
    
    highlightedText = beforeText + highlightedError + afterText;

    return highlightedText.replace(/\n/g, '<br>').replace(/ /g, '&nbsp;');
  };

  // Update highlight overlay when content or errors change
  useEffect(() => {
    // The highlight overlay is now handled by dangerouslySetInnerHTML in the JSX
    // This useEffect is no longer needed for innerHTML manipulation
  }, [value, spellErrors, showSpellCheck, currentErrorIndex, placeholder]);

  // Sync dimensions when content changes
  useEffect(() => {
    if (textareaRef.current && highlightRef.current) {
      const textarea = textareaRef.current;
      const highlight = highlightRef.current;
      
      // Copy dimensions and styles
      highlight.style.width = textarea.scrollWidth + 'px';
      highlight.style.height = textarea.scrollHeight + 'px';
    }
  }, [value]);

  return (
    <div className="relative" style={{ position: 'relative', width: '100%', height: '100%' }}>
      {/* Highlight overlay */}
      <div
        ref={highlightRef}
        className="absolute top-0 left-0 pointer-events-none overflow-hidden whitespace-pre-wrap"
        style={{
          ...style,
          fontFamily: style?.fontFamily || 'Georgia, serif',
          fontSize: style?.fontSize || '16px',
          lineHeight: style?.lineHeight || '1.6',
          padding: '32px', // Match textarea padding
          border: 'transparent',
          background: 'transparent',
          color: 'transparent',
          zIndex: 1,
        }}
        dangerouslySetInnerHTML={{ __html: createHighlightedText() }}
      />

      {/* Actual textarea */}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onScroll={handleScroll}
        placeholder={placeholder}
        disabled={disabled}
        className={className}
        style={{
          ...style,
          position: 'relative',
          zIndex: 2,
          background: 'transparent',
        }}
      />
    </div>
  );
}