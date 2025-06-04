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
  function splitTextToPages(text: string, maxCharsPerPage = 1800) {
    const pages: string[] = [];
    
    if (!text) {
      return [''];
    }
    
    // Simple character-based splitting
    for (let i = 0; i < text.length; i += maxCharsPerPage) {
      const pageContent = text.slice(i, i + maxCharsPerPage);
      pages.push(pageContent);
    }
    
    return pages.length > 0 ? pages : [''];
  }

  // Update pages when content changes
  useEffect(() => {
    if (content.trim() === '') {
      setPages(['']); // Always show at least one empty page
    } else {
      const newPages = splitTextToPages(content, 1800); // ~1800 chars per page
      setPages(newPages);
    }
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
    <div className="bg-gray-100 min-h-screen relative">
      {/* Spell Check Toggle Button */}
      <div className="fixed top-4 right-4 z-50">
        <button
          onClick={() => setIsSpellCheckActive(!isSpellCheckActive)}
          className={`px-4 py-2 rounded-lg shadow-lg font-medium transition-all ${
            isSpellCheckActive 
              ? 'bg-blue-600 text-white' 
              : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
          }`}
        >
          {isSpellCheckActive ? 'Disable Spell Check' : 'Enable Spell Check'}
        </button>
      </div>

      <div className="flex flex-col items-center py-6 relative">
        {pages.map((pageContent, pageIndex) => (
          <div key={pageIndex} className="relative">
            {/* Page Break Indicator */}
            {pageIndex > 0 && (
              <div className="flex items-center justify-center py-2">
                <div className="flex-1 border-t border-dashed border-blue-300"></div>
                <div className="px-3 bg-blue-100 text-blue-700 text-xs font-medium rounded">
                  Page {pageIndex + 1}
                </div>
                <div className="flex-1 border-t border-dashed border-blue-300"></div>
              </div>
            )}
            
            <div
              className="bg-white shadow-lg mx-auto relative mb-6"
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
                          __html: highlightMisspelledWords(content, spellErrors)
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
                      value={content}
                      onChange={(e) => handleContentChange(e.target.value)}
                      placeholder="Start writing your document..."
                      spellCheck={false}
                    />
                  </div>
                ) : (
                  <div 
                    className="w-full h-full text-gray-900 font-serif whitespace-pre-wrap"
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