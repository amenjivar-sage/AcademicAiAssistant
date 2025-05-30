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
      const currentContent = editorRef.current.innerHTML;
      if (currentContent !== content) {
        editorRef.current.innerHTML = content;
      }
    }
  }, [content, isUpdating]);

  // Handle input changes
  const handleInput = () => {
    if (editorRef.current) {
      setIsUpdating(true);
      const newContent = editorRef.current.innerHTML;
      onContentChange(newContent);
      setTimeout(() => setIsUpdating(false), 0);
    }
  };

  // Handle formatting commands
  const executeCommand = (command: string, value?: string) => {
    if (disabled) return;
    
    try {
      document.execCommand(command, false, value);
      editorRef.current?.focus();
      handleInput(); // Update content after formatting
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
        ...style
      }}
      data-placeholder={placeholder}
      suppressContentEditableWarning={true}
    />
  );
}