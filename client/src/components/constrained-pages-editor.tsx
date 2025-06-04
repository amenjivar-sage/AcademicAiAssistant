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

const LINES_PER_PAGE = 22;
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

  // Split content into pages based on line limits
  const splitContentIntoPages = (text: string): string[] => {
    const lines = text.split('\n');
    const pageArray: string[] = [];
    
    for (let i = 0; i < lines.length; i += LINES_PER_PAGE) {
      const pageLines = lines.slice(i, i + LINES_PER_PAGE);
      pageArray.push(pageLines.join('\n'));
    }
    
    return pageArray.length > 0 ? pageArray : [""];
  };

  // Update pages when content changes
  useEffect(() => {
    const newPages = splitContentIntoPages(content);
    setPages(newPages);
    textareaRefs.current = textareaRefs.current.slice(0, newPages.length);
  }, [content]);

  const handlePageContentChange = (pageIndex: number, newPageContent: string) => {
    const lines = newPageContent.split('\n');
    
    // If content exceeds page limit, truncate and move overflow
    if (lines.length > LINES_PER_PAGE) {
      const pageLines = lines.slice(0, LINES_PER_PAGE);
      const overflowLines = lines.slice(LINES_PER_PAGE);
      
      // Update current page with truncated content
      const updatedPages = [...pages];
      updatedPages[pageIndex] = pageLines.join('\n');
      
      // Add overflow to next page
      if (pageIndex + 1 < updatedPages.length) {
        const nextPageLines = updatedPages[pageIndex + 1].split('\n');
        updatedPages[pageIndex + 1] = [...overflowLines, ...nextPageLines].join('\n');
      } else {
        updatedPages.push(overflowLines.join('\n'));
      }
      
      setPages(updatedPages);
      onContentChange(updatedPages.join('\n\n\n\n')); // Use page separators
      
      // Focus next page if overflow occurred
      setTimeout(() => {
        if (textareaRefs.current[pageIndex + 1]) {
          textareaRefs.current[pageIndex + 1]?.focus();
          textareaRefs.current[pageIndex + 1]?.setSelectionRange(overflowLines.join('\n').length, overflowLines.join('\n').length);
        }
      }, 100);
      
      return;
    }
    
    // Normal content change
    const updatedPages = [...pages];
    updatedPages[pageIndex] = newPageContent;
    setPages(updatedPages);
    onContentChange(updatedPages.join('\n\n\n\n'));
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
                    maxHeight: `${LINES_PER_PAGE * LINE_HEIGHT_PX}px`,
                    overflow: 'hidden'
                  }}
                  value={pageContent}
                  onChange={(e) => handlePageContentChange(pageIndex, e.target.value)}
                  onFocus={() => setCurrentPageIndex(pageIndex)}
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