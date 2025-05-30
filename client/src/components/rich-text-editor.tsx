import React, { useRef, useEffect, useState } from 'react';

interface RichTextEditorProps {
  content: string;
  onContentChange: (content: string) => void;
  disabled?: boolean;
  placeholder?: string;
  onFormatRef?: React.MutableRefObject<((command: string, value?: string) => void) | null>;
  className?: string;
  style?: React.CSSProperties;
}

export default function RichTextEditor({
  content,
  onContentChange,
  disabled = false,
  placeholder = "Start writing...",
  onFormatRef,
  className = "",
  style = {}
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  // Set up the editor
  useEffect(() => {
    if (editorRef.current && !disabled) {
      editorRef.current.focus();
    }
  }, [disabled]);

  // Handle content updates from parent
  useEffect(() => {
    if (editorRef.current && !isUpdating) {
      const currentPlainText = editorRef.current.innerText || '';
      if (currentPlainText !== content) {
        // Set plain text content to avoid HTML entity issues
        editorRef.current.innerText = content;
      }
    }
  }, [content, isUpdating]);

  // Handle input changes
  const handleInput = () => {
    if (editorRef.current) {
      setIsUpdating(true);
      // Use innerText to get clean plain text content
      const plainContent = editorRef.current.innerText || '';
      onContentChange(plainContent);
      setTimeout(() => setIsUpdating(false), 0);
    }
  };

  // Handle formatting commands
  const executeCommand = (command: string, value?: string) => {
    if (disabled || !editorRef.current) return;
    
    console.log('Executing format command:', command, value);
    
    try {
      // Focus the editor first to ensure proper selection
      editorRef.current.focus();
      
      // For font family and size, we need to use a different approach
      if (command === 'fontName' && value) {
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          const span = document.createElement('span');
          span.style.fontFamily = value;
          try {
            range.surroundContents(span);
          } catch (e) {
            // If surroundContents fails, extract and wrap content
            const contents = range.extractContents();
            span.appendChild(contents);
            range.insertNode(span);
          }
          selection.removeAllRanges();
          selection.addRange(range);
        }
      } else if (command === 'fontSize' && value) {
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          const span = document.createElement('span');
          span.style.fontSize = value;
          try {
            range.surroundContents(span);
          } catch (e) {
            const contents = range.extractContents();
            span.appendChild(contents);
            range.insertNode(span);
          }
          selection.removeAllRanges();
          selection.addRange(range);
        }
      } else {
        // Use execCommand for other formatting
        const success = document.execCommand(command, false, value);
        console.log('execCommand result:', success, command, value);
      }
      
      // Trigger content update after formatting
      setTimeout(() => handleInput(), 10);
    } catch (error) {
      console.error('Error executing command:', command, error);
    }
  };

  // Expose the format function to parent
  useEffect(() => {
    if (onFormatRef) {
      onFormatRef.current = executeCommand;
    }
  }, [onFormatRef, executeCommand]);

  // Handle paste events to clean up formatting
  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const paste = e.clipboardData.getData('text/plain');
    document.execCommand('insertText', false, paste);
  };

  // Convert HTML content to plain text for word counting and other operations
  const getPlainText = () => {
    if (editorRef.current) {
      return editorRef.current.innerText || editorRef.current.textContent || '';
    }
    return '';
  };

  return (
    <div
      ref={editorRef}
      contentEditable={!disabled}
      onInput={handleInput}
      onPaste={handlePaste}
      className={`outline-none ${className}`}
      style={{
        minHeight: '100%',
        fontFamily: 'Georgia, serif',
        fontSize: '16px',
        lineHeight: '1.6',
        direction: 'ltr',
        textAlign: 'left',
        unicodeBidi: 'normal',
        ...style
      }}
      data-placeholder={placeholder}
      suppressContentEditableWarning={true}
    />
  );
}