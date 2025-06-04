import { useState, useRef, useEffect } from 'react';

interface SingleDocumentEditorProps {
  content: string;
  onContentChange: (content: string) => void;
  studentName?: string;
  assignmentTitle?: string;
  showPageNumbers?: boolean;
  showHeader?: boolean;
}

const LINE_HEIGHT_PX = 32; // 16pt * 2.0 line height
const LINES_PER_PAGE = 22;
const HEADER_HEIGHT = 96;
const FOOTER_HEIGHT = 48;
const PAGE_HEIGHT_INCHES = 11;
const PAGE_WIDTH_INCHES = 8.5;

export default function SingleDocumentEditor({
  content,
  onContentChange,
  studentName = "",
  assignmentTitle = "",
  showPageNumbers = true,
  showHeader = true
}: SingleDocumentEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [scrollPosition, setScrollPosition] = useState(0);

  // Calculate how many pages the content spans
  const contentLines = content.split('\n');
  const totalPages = Math.max(1, Math.ceil(contentLines.length / LINES_PER_PAGE));

  // Handle content changes
  const handleContentChange = (newContent: string) => {
    onContentChange(newContent);
  };

  // Handle scroll to sync with page breaks
  const handleScroll = () => {
    if (textareaRef.current) {
      setScrollPosition(textareaRef.current.scrollTop);
    }
  };

  // Generate page break indicators
  const renderPageBreaks = () => {
    const breaks = [];
    for (let i = 1; i < totalPages; i++) {
      const topPosition = i * LINES_PER_PAGE * LINE_HEIGHT_PX + HEADER_HEIGHT;
      breaks.push(
        <div
          key={i}
          className="absolute left-0 right-0 border-t-2 border-dashed border-gray-300 pointer-events-none"
          style={{
            top: `${topPosition}px`,
            transform: `translateY(-${scrollPosition}px)`
          }}
        >
          <div className="absolute right-2 -top-3 bg-white px-2 text-xs text-gray-500">
            Page {i + 1}
          </div>
        </div>
      );
    }
    return breaks;
  };

  return (
    <div className="h-full bg-gray-100 overflow-hidden">
      <div className="h-full flex justify-center">
        <div className="relative bg-white shadow-lg" style={{ width: `${PAGE_WIDTH_INCHES}in` }}>
          
          {/* Header */}
          {showHeader && (
            <div 
              className="absolute left-0 right-0 top-0 bg-gray-50 border-b border-gray-200 px-4 py-2 text-sm text-gray-600"
              style={{ height: `${HEADER_HEIGHT}px` }}
            >
              <div className="flex justify-between items-center h-full">
                <span>{studentName}</span>
                <span>{assignmentTitle}</span>
              </div>
            </div>
          )}

          {/* Main Content Area */}
          <div className="relative overflow-hidden" style={{ 
            minHeight: `${PAGE_HEIGHT_INCHES}in`,
            paddingTop: `${HEADER_HEIGHT}px`,
            paddingBottom: `${FOOTER_HEIGHT}px`
          }}>
            
            {/* Page Break Indicators */}
            {renderPageBreaks()}
            
            {/* Text Area */}
            <textarea
              ref={textareaRef}
              className="w-full h-full resize-none border-none outline-none bg-transparent text-gray-900 font-serif p-4"
              style={{
                fontFamily: "'Times New Roman', serif",
                fontSize: "12pt",
                lineHeight: "2.0",
                minHeight: `${totalPages * PAGE_HEIGHT_INCHES}in`
              }}
              value={content}
              onChange={(e) => handleContentChange(e.target.value)}
              onScroll={handleScroll}
              placeholder="Start writing your document..."
              spellCheck={true}
            />
          </div>

          {/* Footer */}
          <div 
            className="absolute left-0 right-0 bottom-0 bg-gray-50 border-t border-gray-200 px-4 py-2 text-sm text-gray-600"
            style={{ height: `${FOOTER_HEIGHT}px` }}
          >
            <div className="flex justify-center items-center h-full">
              {showPageNumbers && (
                <span>Page 1 of {totalPages}</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}