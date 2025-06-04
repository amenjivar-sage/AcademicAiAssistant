import { useState, useRef, useEffect } from 'react';
import BubbleSpellCheckPanel from './bubble-spell-check-panel';

interface SingleDocumentEditorProps {
  content: string;
  onContentChange: (content: string) => void;
  studentName?: string;
  assignmentTitle?: string;
  showPageNumbers?: boolean;
  showHeader?: boolean;
}

const PAGE_HEIGHT = 1122; // 11in at 96dpi
const PAGE_PADDING = 96;  // 1in padding top and bottom
const FOOTER_HEIGHT = 40; // reserve space for footer
const LINE_HEIGHT_PX = 20; // Consistent line height
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
  const [pages, setPages] = useState<string[]>([]);
  const [isSpellCheckActive, setIsSpellCheckActive] = useState(false);
  const [spellErrors, setSpellErrors] = useState<any[]>([]);

  // Function to split text into pages based on character count per page
  function splitTextToPages(text: string, maxCharsPerPage = 1200) {
    if (!text || text.trim() === '') {
      return [''];
    }
    
    const pages: string[] = [];
    const words = text.split(' ');
    let currentPage = '';
    
    for (const word of words) {
      const testPage = currentPage ? `${currentPage} ${word}` : word;
      
      if (testPage.length <= maxCharsPerPage) {
        currentPage = testPage;
      } else {
        // Current page is full, start a new page
        if (currentPage) {
          pages.push(currentPage);
        }
        currentPage = word;
      }
    }
    
    // Add the last page if there's content
    if (currentPage) {
      pages.push(currentPage);
    }
    
    return pages.length > 0 ? pages : [''];
  }

  // Update pages when content changes
  useEffect(() => {
    const newPages = splitTextToPages(content, 1200); // 1200 chars per page with word boundaries
    console.log('Page splitting debug:', {
      contentLength: content.length,
      pageCount: newPages.length,
      firstPageLength: newPages[0]?.length || 0,
      secondPageLength: newPages[1]?.length || 0,
      firstPageEnd: newPages[0]?.slice(-50) || '',
      secondPageStart: newPages[1]?.slice(0, 50) || ''
    });
    setPages(newPages);
  }, [content]);

  const totalPages = Math.max(1, pages.length);

  // Handle content changes
  const handleContentChange = (newContent: string) => {
    onContentChange(newContent);
  };

  // Function to highlight misspelled words in text
  const highlightMisspelledWords = (text: string, errors: any[]): string => {
    if (!isSpellCheckActive || errors.length === 0) {
      return text;
    }

    let highlightedText = text;
    const sortedErrors = [...errors].sort((a, b) => b.startIndex - a.startIndex);

    sortedErrors.forEach(error => {
      const beforeText = highlightedText.substring(0, error.startIndex);
      const misspelledWord = highlightedText.substring(error.startIndex, error.endIndex);
      const afterText = highlightedText.substring(error.endIndex);
      
      highlightedText = beforeText + 
        `<span class="spell-error" style="text-decoration: underline; text-decoration-color: red; text-decoration-style: wavy; background-color: rgba(255, 0, 0, 0.1);">${misspelledWord}</span>` + 
        afterText;
    });

    return highlightedText;
  };

  return (
    <div className="bg-gray-100 min-h-screen relative overflow-y-auto">
      {/* Control Panel */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        <button
          onClick={() => setIsSpellCheckActive(!isSpellCheckActive)}
          className={`px-4 py-2 rounded-lg shadow-lg font-medium transition-all block ${
            isSpellCheckActive 
              ? 'bg-blue-600 text-white' 
              : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
          }`}
        >
          {isSpellCheckActive ? 'Disable Spell Check' : 'Enable Spell Check'}
        </button>
        
        {/* Page Count Debug */}
        <div className="bg-yellow-100 border border-yellow-400 px-4 py-2 rounded-lg shadow-lg">
          <div className="text-sm font-medium text-yellow-800">
            Pages: {pages.length}
          </div>
          <div className="text-xs text-yellow-700">
            Chars: {content.length}
          </div>
        </div>
      </div>

      <div className="flex flex-col items-center py-6 relative">
        {pages.map((pageContent, pageIndex) => (
          <div key={pageIndex} className="relative">
            {/* Page Break Indicator */}
            {pageIndex > 0 && (
              <div className="flex items-center justify-center py-2 mb-2">
                <div className="flex-1 border-t-2 border-dashed border-red-400"></div>
                <div className="px-4 py-1 bg-red-500 text-white text-sm font-bold rounded shadow">
                  PAGE {pageIndex + 1}
                </div>
                <div className="flex-1 border-t-2 border-dashed border-red-400"></div>
              </div>
            )}
            
            <div
              className="bg-white shadow-lg mx-auto relative mb-3"
              style={{ 
                width: `${PAGE_WIDTH_INCHES}in`, 
                height: `${PAGE_HEIGHT_INCHES}in`,
                boxShadow: '0 0 5px rgba(0, 0, 0, 0.2)',
                overflow: 'hidden',
                position: 'relative'
              }}
            >
              {/* Header */}
              {showHeader && (
                <div 
                  className="absolute top-0 left-0 right-0 bg-gray-50 border-b border-gray-200 px-8 py-3 text-sm text-gray-600"
                  style={{ height: `${PAGE_PADDING}px` }}
                >
                  <div className="flex justify-between items-center">
                    <div className="font-medium">{assignmentTitle}</div>
                    <div>{studentName}</div>
                  </div>
                </div>
              )}

              {/* Main Content Area */}
              <div
                className="absolute"
                style={{
                  top: `${PAGE_PADDING}px`,
                  left: `${PAGE_PADDING}px`,
                  right: `${PAGE_PADDING}px`,
                  bottom: `${FOOTER_HEIGHT}px`,
                  height: `calc(100% - ${PAGE_PADDING * 2 + FOOTER_HEIGHT}px)`
                }}
              >
                {pageIndex === 0 ? (
                  // First page: editable textarea showing only first page content
                  <div className="relative w-full h-full">
                    {/* Highlighting overlay for misspelled words */}
                    {isSpellCheckActive && spellErrors.length > 0 && (
                      <div 
                        className="absolute inset-0 pointer-events-none"
                        style={{
                          fontFamily: "'Times New Roman', serif",
                          fontSize: "12pt",
                          lineHeight: "2.0",
                          padding: 0,
                          whiteSpace: 'pre-wrap',
                          wordWrap: 'break-word',
                          color: 'transparent',
                          zIndex: 1
                        }}
                        dangerouslySetInnerHTML={{
                          __html: highlightMisspelledWords(pageContent, spellErrors)
                        }}
                      />
                    )}
                    <textarea
                      ref={textareaRef}
                      className="w-full h-full resize-none border-none outline-none bg-transparent text-gray-900 font-serif relative"
                      style={{
                        fontFamily: "'Times New Roman', serif",
                        fontSize: "12pt",
                        lineHeight: "2.0",
                        padding: 0,
                        zIndex: 2
                      }}
                      value={pageContent}
                      onChange={(e) => {
                        // Update the full content directly
                        handleContentChange(e.target.value);
                      }}
                      placeholder="Start writing your document..."
                      spellCheck={false}
                    />
                  </div>
                ) : (
                  // Subsequent pages: read-only display with page content
                  <div 
                    className="w-full h-full text-gray-900 font-serif whitespace-pre-wrap overflow-hidden"
                    style={{
                      fontFamily: "'Times New Roman', serif",
                      fontSize: "12pt",
                      lineHeight: "2.0"
                    }}
                  >
                    {pageContent}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div 
                className="absolute bottom-0 left-0 right-0 bg-gray-50 border-t border-gray-200 px-8 py-2 text-center text-sm text-gray-500"
                style={{ height: `${FOOTER_HEIGHT}px` }}
              >
                {showPageNumbers && (
                  <div className="flex justify-between items-center">
                    <div>Page {pageIndex + 1} of {totalPages}</div>
                    <div>Word Count: {pageContent.split(" ").filter(word => word.length > 0).length}</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}

        {/* Spell Check Panel positioned within document area */}
        {isSpellCheckActive && (
          <div className="fixed bottom-8 right-8 z-50">
            <BubbleSpellCheckPanel
              content={content}
              onContentChange={onContentChange}
              isOpen={isSpellCheckActive}
              onClose={() => setIsSpellCheckActive(false)}
              onSpellErrorsChange={setSpellErrors}
            />
          </div>
        )}
      </div>
    </div>
  );
}