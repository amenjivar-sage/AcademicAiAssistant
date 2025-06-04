import React, { useState, useRef, useEffect } from 'react';
import { cn } from '../lib/utils';

interface SingleTextareaPagesEditorProps {
  content: string;
  onContentChange: (content: string) => void;
  studentName?: string;
  assignmentTitle?: string;
  showPageNumbers?: boolean;
  showHeader?: boolean;
}

// Calculate approximate lines that fit on a page (8.5" x 11" with margins)
const LINES_PER_PAGE = 22; // Adjusted for double spacing with header/footer space
const CHARS_PER_LINE = 65; // Approximate characters per line
const HEADER_HEIGHT = 96; // Height reserved for header (6 lines * 16pt line height)
const FOOTER_HEIGHT = 48; // Height reserved for footer (3 lines * 16pt line height)

export default function SingleTextareaPagesEditor({
  content,
  onContentChange,
  studentName = "",
  assignmentTitle = "",
  showPageNumbers = true,
  showHeader = true
}: SingleTextareaPagesEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [cursorPosition, setCursorPosition] = useState(0);

  // Calculate current page based on cursor position
  const getCurrentPage = () => {
    if (!textareaRef.current) return 1;
    
    const textarea = textareaRef.current;
    const textBeforeCursor = content.substring(0, cursorPosition);
    const lines = textBeforeCursor.split('\n').length;
    return Math.ceil(lines / LINES_PER_PAGE);
  };

  // Calculate total pages
  const getTotalPages = () => {
    const lines = content.split('\n').length;
    return Math.max(1, Math.ceil(lines / LINES_PER_PAGE));
  };

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    setCursorPosition(e.target.selectionStart);
    onContentChange(newContent);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Allow natural Enter key behavior
    if (e.key === 'Enter') {
      setTimeout(() => {
        if (textareaRef.current) {
          setCursorPosition(textareaRef.current.selectionStart);
        }
      }, 0);
    }
  };

  const handleClick = (e: React.MouseEvent<HTMLTextAreaElement>) => {
    const textarea = e.currentTarget;
    setCursorPosition(textarea.selectionStart);
  };

  // Generate page backgrounds and text boundaries
  const generatePageBackgrounds = () => {
    const totalPages = getTotalPages();
    const pages = [];
    
    for (let i = 1; i <= totalPages; i++) {
      pages.push(
        <div
          key={i}
          className="absolute bg-white shadow-md border border-gray-300"
          style={{
            width: '8.5in',
            height: '11in',
            top: `${(i - 1) * 11.5}in`,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 0
          }}
        >
          {/* Header area - reserved space */}
          <div 
            className="absolute top-0 left-0 right-0 bg-gray-50 border-b border-gray-200"
            style={{ height: `${HEADER_HEIGHT}px` }}
          >
            {showHeader && i === 1 && (
              <div className="absolute top-4 left-8 right-8 text-center">
                <div className="font-serif text-sm text-gray-600">{studentName}</div>
                <div className="font-serif text-sm text-gray-600 mt-1">{assignmentTitle}</div>
              </div>
            )}
          </div>
          
          {/* Text area boundaries */}
          <div 
            className="absolute border border-dashed border-gray-300"
            style={{
              top: `${HEADER_HEIGHT}px`,
              left: '1.25in',
              width: 'calc(8.5in - 2.25in)',
              height: `calc(11in - ${HEADER_HEIGHT + FOOTER_HEIGHT}px)`,
              zIndex: 1
            }}
          />
          
          {/* Footer area - reserved space */}
          <div 
            className="absolute bottom-0 left-0 right-0 bg-gray-50 border-t border-gray-200"
            style={{ height: `${FOOTER_HEIGHT}px` }}
          >
            {showPageNumbers && (
              <div className="absolute bottom-2 right-8 text-sm text-gray-500 font-serif">
                {i}
              </div>
            )}
          </div>
        </div>
      );
    }
    
    return pages;
  };

  const currentPage = getCurrentPage();
  const totalPages = getTotalPages();

  return (
    <div className="flex flex-col h-full bg-gray-100">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-2 bg-white border-b border-gray-200 text-sm">
        <div className="flex items-center gap-4">
          <span className="text-gray-600">
            Page {currentPage} of {totalPages}
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-gray-500">
            Words: {content.trim() ? content.trim().split(/\s+/).length : 0}
          </span>
        </div>
      </div>

      {/* Page Container */}
      <div className="flex-1 overflow-auto bg-gray-100 p-8 relative">
        <div 
          className="relative mx-auto"
          style={{ 
            width: '8.5in',
            minHeight: `${totalPages * 11.5}in`
          }}
        >
          {/* Page backgrounds */}
          {generatePageBackgrounds()}
          
          {/* Single textarea with proper page boundaries */}
          <div
            className="absolute"
            style={{
              top: `${HEADER_HEIGHT + 48}px`,
              left: '1.25in',
              width: 'calc(8.5in - 2.25in)',
              height: `calc(${totalPages * 11.5}in - ${(HEADER_HEIGHT + FOOTER_HEIGHT + 96) * totalPages}px)`,
              zIndex: 10
            }}
          >
            <textarea
              ref={textareaRef}
              className="w-full h-full resize-none border-none outline-none bg-transparent text-gray-900 font-serif"
              style={{
                fontFamily: "'Times New Roman', serif",
                fontSize: "12pt",
                lineHeight: "2.0",
                padding: '0',
                backgroundImage: `repeating-linear-gradient(
                  transparent,
                  transparent ${LINES_PER_PAGE * 32 - 2}px,
                  #ff0000 ${LINES_PER_PAGE * 32 - 1}px,
                  #ff0000 ${LINES_PER_PAGE * 32}px,
                  transparent ${LINES_PER_PAGE * 32 + 1}px,
                  transparent ${LINES_PER_PAGE * 32 + (HEADER_HEIGHT + FOOTER_HEIGHT)}px
                )`,
                backgroundSize: `100% ${11.5 * 96}px`
              }}
              value={content}
              onChange={handleContentChange}
              onKeyDown={handleKeyDown}
              onClick={handleClick}
              onKeyUp={(e) => setCursorPosition(e.currentTarget.selectionStart)}
              placeholder="Start writing your document..."
              spellCheck={true}
            />
          </div>
        </div>
      </div>
    </div>
  );
}