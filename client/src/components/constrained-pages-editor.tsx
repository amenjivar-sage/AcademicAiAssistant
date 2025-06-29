import React, { useState, useRef, useEffect } from 'react';
import { cn } from '../lib/utils';

interface ConstrainedPagesEditorProps {
  content: string;
  onContentChange: (content: string) => void;
  studentName?: string;
  assignmentTitle?: string;
  showPageNumbers?: boolean;
  showHeader?: boolean;
}

const CHARS_PER_PAGE = 1800; // Approximately 22 lines x 80 chars
const LINE_HEIGHT_PX = 32; // 16pt * 2.0 line height converted to pixels
const HEADER_HEIGHT = 96;
const FOOTER_HEIGHT = 48;
const PAGE_HEIGHT_INCHES = 11;
const PAGE_WIDTH_INCHES = 8.5;

export default function ConstrainedPagesEditor({
  content,
  onContentChange,
  studentName = "",
  assignmentTitle = "",
  showPageNumbers = true,
  showHeader = true
}: ConstrainedPagesEditorProps) {
  const [pages, setPages] = useState<string[]>([""]);
  const textareaRefs = useRef<(HTMLTextAreaElement | null)[]>([]);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);

  // Clean and split content into pages with line-based limits
  const splitContentIntoPages = (text: string): string[] => {
    if (!text || text.length === 0) return [""];
    
    // Clean the text by removing excessive consecutive newlines
    const cleanedText = text
      .replace(/\n{4,}/g, '\n\n\n') // Replace 4+ consecutive newlines with max 3
      .replace(/^\n+/, '') // Remove leading newlines
      .replace(/\n+$/, ''); // Remove trailing newlines
    
    if (cleanedText.length === 0) return [""];
    
    const lines = cleanedText.split('\n');
    const pageArray: string[] = [];
    const maxLinesPerPage = 22;
    
    for (let i = 0; i < lines.length; i += maxLinesPerPage) {
      const pageLines = lines.slice(i, i + maxLinesPerPage);
      const pageText = pageLines.join('\n');
      if (pageText.trim().length > 0) {
        pageArray.push(pageText);
      }
    }
    
    return pageArray.length > 0 ? pageArray : [""];
  };

  // Update pages when content changes (avoid infinite loop)
  useEffect(() => {
    const newPages = splitContentIntoPages(content);
    // Only update if pages actually changed and content is different from current pages
    const currentContent = pages.join('\n');
    if (content !== currentContent) {
      setPages(newPages);
      textareaRefs.current = textareaRefs.current.slice(0, newPages.length);
    }
  }, [content]); // Remove pages from dependency to prevent loop

  const handlePageContentChange = (pageIndex: number, newPageContent: string) => {
    // Simply update the specific page content without complex redistribution
    const updatedPages = [...pages];
    updatedPages[pageIndex] = newPageContent;
    
    // Update state immediately
    setPages(updatedPages);
    
    // Notify parent with simple concatenation
    const combinedContent = updatedPages.join('\n');
    onContentChange(combinedContent);
    
    // Check if this page has too many lines and needs to create a new page
    const pageLines = newPageContent.split('\n');
    const maxLinesPerPage = 22;
    
    if (pageLines.length > maxLinesPerPage) {
      // Keep only first 22 lines on current page
      const allowedLines = pageLines.slice(0, maxLinesPerPage);
      const overflowLines = pageLines.slice(maxLinesPerPage);
      
      // Update current page with trimmed content
      updatedPages[pageIndex] = allowedLines.join('\n');
      
      // Create or update next page with overflow
      if (pageIndex + 1 < updatedPages.length) {
        // Prepend overflow to existing next page
        const existingNextPage = updatedPages[pageIndex + 1];
        updatedPages[pageIndex + 1] = overflowLines.join('\n') + '\n' + existingNextPage;
      } else {
        // Create new page for overflow
        updatedPages.push(overflowLines.join('\n'));
      }
      
      // Update state with redistributed content
      setPages(updatedPages);
      onContentChange(updatedPages.join('\n'));
      
      // Focus on next page
      setTimeout(() => {
        const nextTextarea = textareaRefs.current[pageIndex + 1];
        if (nextTextarea) {
          nextTextarea.focus();
          nextTextarea.setSelectionRange(0, 0);
        }
      }, 100);
    }
  };

  const focusPage = (pageIndex: number) => {
    setCurrentPageIndex(pageIndex);
    setTimeout(() => {
      textareaRefs.current[pageIndex]?.focus();
    }, 100);
  };

  return (
    <div className="flex flex-col h-full bg-gray-100">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-2 bg-white border-b border-gray-200 text-sm">
        <div className="flex items-center gap-4">
          <span className="text-gray-600">
            Page {currentPageIndex + 1} of {pages.length}
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-gray-500">
            Words: {content.trim() ? content.trim().split(/\s+/).length : 0}
          </span>
        </div>
      </div>

      {/* Pages Container */}
      <div className="flex-1 overflow-auto bg-gray-100 p-8">
        <div className="mx-auto" style={{ width: `${PAGE_WIDTH_INCHES}in` }}>
          {pages.map((pageContent, pageIndex) => (
            <div
              key={pageIndex}
              className="relative bg-white shadow-lg border border-gray-300 mb-8"
              style={{
                width: `${PAGE_WIDTH_INCHES}in`,
                height: `${PAGE_HEIGHT_INCHES}in`,
              }}
              onClick={() => focusPage(pageIndex)}
            >
              {/* Header Section */}
              <div 
                className="absolute top-0 left-0 right-0 bg-gray-50 border-b border-gray-200 flex items-center justify-center"
                style={{ height: `${HEADER_HEIGHT}px` }}
              >
                {showHeader && pageIndex === 0 && (
                  <div className="text-center">
                    <div className="font-serif text-sm text-gray-600">{studentName}</div>
                    <div className="font-serif text-sm text-gray-600 mt-1">{assignmentTitle}</div>
                  </div>
                )}
              </div>

              {/* Text Area */}
              <div
                className="absolute"
                style={{
                  top: `${HEADER_HEIGHT}px`,
                  left: '1.25in',
                  right: '1in',
                  bottom: `${FOOTER_HEIGHT}px`,
                }}
              >
                <textarea
                  ref={(el) => (textareaRefs.current[pageIndex] = el)}
                  className="w-full h-full resize-none border-none outline-none bg-transparent text-gray-900 font-serif p-4"
                  style={{
                    fontFamily: "'Times New Roman', serif",
                    fontSize: "12pt",
                    lineHeight: "2.0",
                    maxHeight: `${22 * LINE_HEIGHT_PX}px`,
                    overflow: 'hidden'
                  }}
                  value={pageContent}
                  onChange={(e) => handlePageContentChange(pageIndex, e.target.value)}
                  onFocus={() => setCurrentPageIndex(pageIndex)}
                  onKeyDown={(e) => {
                    // Handle Enter key to ensure proper line breaks
                    if (e.key === 'Enter') {
                      // Allow default behavior but ensure it triggers content change
                      setTimeout(() => {
                        const textarea = e.target as HTMLTextAreaElement;
                        handlePageContentChange(pageIndex, textarea.value);
                      }, 0);
                    }
                  }}
                  placeholder={pageIndex === 0 ? "Start writing your document..." : ""}
                  spellCheck={true}
                />
              </div>

              {/* Footer Section */}
              <div 
                className="absolute bottom-0 left-0 right-0 bg-gray-50 border-t border-gray-200 flex items-center justify-end px-8"
                style={{ height: `${FOOTER_HEIGHT}px` }}
              >
                {showPageNumbers && (
                  <div className="text-sm text-gray-500 font-serif">
                    {pageIndex + 1}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}