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

  // Create highlighted text with spell errors
  const createHighlightedText = () => {
    if (!showSpellCheck || spellErrors.length === 0) {
      return '';
    }

    let highlightedText = value;
    let offset = 0;

    // Sort errors by start index to process them in order
    const sortedErrors = [...spellErrors].sort((a, b) => a.startIndex - b.startIndex);

    sortedErrors.forEach((error) => {
      const beforeText = highlightedText.substring(0, error.startIndex + offset);
      const errorText = highlightedText.substring(error.startIndex + offset, error.endIndex + offset);
      const afterText = highlightedText.substring(error.endIndex + offset);

      // Only add the underline styling, make text transparent so textarea text shows through
      const highlightedError = `<span style="border-bottom: 2px wavy #ef4444; position: relative; color: transparent;" title="Suggested: ${error.suggestions.join(', ')}">${errorText}</span>`;
      
      highlightedText = beforeText + highlightedError + afterText;
      offset += highlightedError.length - errorText.length;
    });

    return highlightedText.replace(/\n/g, '<br>').replace(/ /g, '&nbsp;');
  };

  // Update highlight overlay when content or errors change
  useEffect(() => {
    if (highlightRef.current) {
      highlightRef.current.innerHTML = createHighlightedText();
    }
  }, [value, spellErrors, showSpellCheck, placeholder]);

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