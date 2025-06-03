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
      const currentText = editorRef.current.innerText || '';
      
      // Always treat content as plain text to prevent XSS
      // The rich text editor will handle formatting through user interactions
      if (currentText !== content) {
        editorRef.current.innerText = content;
      }
    }
  }, [content, isUpdating]);

  // Handle input changes with proper line break preservation
  const handleInput = () => {
    if (editorRef.current) {
      setIsUpdating(true);
      
      // Get the plain text with proper line breaks preserved
      const plainText = editorRef.current.innerText || '';
      
      // Convert plain text line breaks to proper format for saving
      const contentToSave = plainText;
      
      onContentChange(contentToSave);
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
      
      // Handle font formatting with proper cleanup to prevent nesting
      if (command === 'fontName' && value) {
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          
          if (!range.collapsed && range.toString().trim()) {
            const selectedText = range.toString();
            
            // Create a clean span with just the font family
            const span = document.createElement('span');
            span.style.fontFamily = value;
            span.textContent = selectedText;
            
            range.deleteContents();
            range.insertNode(span);
            
            // Restore selection
            selection.removeAllRanges();
            const newRange = document.createRange();
            newRange.selectNodeContents(span);
            selection.addRange(newRange);
          }
        }
      } else if (command === 'fontSize' && value) {
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          
          if (!range.collapsed && range.toString().trim()) {
            const selectedText = range.toString();
            
            // Create a clean span with just the font size
            const span = document.createElement('span');
            span.style.fontSize = value;
            span.textContent = selectedText;
            
            range.deleteContents();
            range.insertNode(span);
            
            // Restore selection
            selection.removeAllRanges();
            const newRange = document.createRange();
            newRange.selectNodeContents(span);
            selection.addRange(newRange);
          }
        }
      } else if (command === 'foreColor' && value) {
        // Handle text color specifically
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          const span = document.createElement('span');
          span.style.color = value;
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
      } else if (command === 'insertUnorderedList' || command === 'insertOrderedList') {
        // Simple approach: use execCommand directly
        editorRef.current.focus();
        const success = document.execCommand(command, false, value);
        console.log('List command executed:', command, 'Success:', success);
        
        // Force the editor to maintain HTML formatting for lists
        setTimeout(() => {
          if (editorRef.current) {
            // Preserve current HTML content to keep list structure
            const currentHTML = editorRef.current.innerHTML;
            console.log('Current HTML after list:', currentHTML);
            handleInput();
          }
        }, 10);
        return;
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

  // Handle key events for proper Enter key behavior
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      
      // Insert a line break at the current cursor position
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        range.deleteContents();
        
        // Create a text node with a line break
        const lineBreak = document.createTextNode('\n');
        range.insertNode(lineBreak);
        
        // Move cursor after the line break
        range.setStartAfter(lineBreak);
        range.setEndAfter(lineBreak);
        selection.removeAllRanges();
        selection.addRange(range);
        
        // Trigger content update
        handleInput();
      }
    }
  };

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
      onKeyDown={handleKeyDown}
      onPaste={handlePaste}
      className={`outline-none ${className}`}
      style={{
        minHeight: '100%',
        fontFamily: '"Times New Roman", serif',
        fontSize: '16px',
        lineHeight: '1.6',
        direction: 'ltr',
        textAlign: 'left',
        unicodeBidi: 'normal',
        whiteSpace: 'pre-wrap', // Preserve line breaks and spaces
        ...style
      }}
      data-placeholder={placeholder}
      suppressContentEditableWarning={true}
    />
  );
}