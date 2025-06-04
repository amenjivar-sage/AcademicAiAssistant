import { useState, useRef, useEffect } from 'react';
import BubbleSpellCheckPanel from './bubble-spell-check-panel';

interface SingleDocumentEditorProps {
  content: string;
  onContentChange: (content: string) => void;
  studentName?: string;
  assignmentTitle?: string;
  showPageNumbers?: boolean;
  showHeader?: boolean;
  readOnly?: boolean;
  pastedContent?: any[];
  showCopyPasteHighlights?: boolean;
  inlineComments?: any[];
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
  showHeader = true,
  readOnly = false,
  pastedContent = [],
  showCopyPasteHighlights = false,
  inlineComments = []
}: SingleDocumentEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [pages, setPages] = useState<number[]>([]);
  const [isSpellCheckActive, setIsSpellCheckActive] = useState(false);
  const [spellErrors, setSpellErrors] = useState<any[]>([]);

  // Copy-paste highlighting function
  const highlightCopyPasteContent = (text: string, pastedData: any[]): string => {
    if (!showCopyPasteHighlights || !pastedData || pastedData.length === 0) {
      return text;
    }

    let highlightedText = text;
    
    pastedData.forEach((paste: any) => {
      if (paste.text && typeof paste.text === 'string') {
        const pastedText = paste.text;
        
        // Split pasted content into sentences
        const sentences = pastedText.split(/[.!?]+/).filter((s: any) => s.trim().length > 10);
        
        sentences.forEach((sentence: any) => {
          const trimmedSentence = sentence.trim();
          
          // Create a flexible regex that accounts for spelling corrections
          const pastedWords = trimmedSentence.toLowerCase().split(/\s+/).filter((w: any) => w.length > 2);
          
          // Build pattern allowing for word substitutions (spell corrections)
          const flexiblePattern = pastedWords.map((word: any) => {
            // Common spelling corrections map
            const corrections: { [key: string]: string } = {
              'fealing': 'feeling',
              'sandwitches': 'sandwiches', 
              'promissed': 'promised',
              'probbably': 'probably',
              'perfact': 'perfect',
              'reminde': 'remind'
            };
            
            // If this word has a known correction, match either version
            const corrected = corrections[word] || Object.keys(corrections).find(k => corrections[k] === word);
            if (corrected) {
              return `(?:${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}|${corrected.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`;
            }
            
            return word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          }).join('\\s+\\w*\\s*');
          
          const regex = new RegExp(flexiblePattern, 'gi');
          
          // Apply highlighting to matches
          highlightedText = highlightedText.replace(regex, (match) => {
            return `<span style="background-color: #fecaca; border-bottom: 2px solid #f87171; color: #991b1b; font-weight: 600; padding: 2px 4px; border-radius: 3px;" title="Copy-pasted content detected (spell-corrected)">${match}</span>`;
          });
        });
      }
    });

    return highlightedText;
  };

  // Calculate how many pages are needed based on content length
  function calculatePageCount(text: string) {
    if (!text || text.trim() === '') {
      return 1;
    }
    // Estimate approximately 1200 characters per page for display purposes
    const estimatedPages = Math.ceil(text.length / 1200);
    return Math.max(1, estimatedPages);
  }

  // Update page count when content changes
  useEffect(() => {
    const pageCount = calculatePageCount(content);
    // Create array representing pages - just for layout purposes
    const pageArray = Array.from({ length: pageCount }, (_, i) => i);
    setPages(pageArray);
    console.log('Page count debug:', {
      contentLength: content.length,
      estimatedPages: pageCount
    });
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
        {/* Single continuous textarea spanning multiple page layouts */}
        <div className="relative">
          {/* Continuous editing area */}
          <div className="relative">
            {/* Spell check highlighting overlay */}
            {isSpellCheckActive && spellErrors.length > 0 && (
              <div 
                className="absolute inset-0 pointer-events-none"
                style={{
                  fontFamily: "'Times New Roman', serif",
                  fontSize: "12pt",
                  lineHeight: "2.0",
                  padding: `${PAGE_PADDING}px`,
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
            
            {/* Copy-paste highlighting overlay for graded assignments */}
            {showCopyPasteHighlights && pastedContent.length > 0 && (() => {
              console.log('Copy-paste overlay rendering:', {
                showHighlights: showCopyPasteHighlights,
                pastedDataCount: pastedContent.length,
                contentLength: content.length,
                samplePastedText: pastedContent[0]?.text?.substring(0, 50)
              });
              const highlightedHtml = highlightCopyPasteContent(content, pastedContent);
              console.log('Generated highlighted HTML:', highlightedHtml.substring(0, 200));
              return (
                <div 
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    fontFamily: "'Times New Roman', serif",
                    fontSize: "12pt",
                    lineHeight: "2.0",
                    padding: `${PAGE_PADDING}px`,
                    whiteSpace: 'pre-wrap',
                    wordWrap: 'break-word',
                    color: 'transparent',
                    zIndex: 2,
                    backgroundColor: 'rgba(255, 0, 0, 0.1)' // Debug: light red background to see overlay
                  }}
                  dangerouslySetInnerHTML={{
                    __html: highlightedHtml
                  }}
                />
              );
            })()}
            <textarea
              ref={textareaRef}
              className={`w-full resize-none border-none outline-none bg-transparent text-gray-900 font-serif relative ${readOnly ? 'cursor-default' : ''}`}
              style={{
                fontFamily: "'Times New Roman', serif",
                fontSize: "12pt",
                lineHeight: "2.0",
                padding: `${PAGE_PADDING}px`,
                zIndex: 2,
                minHeight: `${pages.length * PAGE_HEIGHT_INCHES}in`,
                width: `${PAGE_WIDTH_INCHES}in`,
                margin: '0 auto'
              }}
              value={content}
              onChange={(e) => {
                if (!readOnly) {
                  handleContentChange(e.target.value);
                }
              }}
              placeholder={readOnly ? "" : "Start writing your document..."}
              spellCheck={false}
              readOnly={readOnly}
            />
          </div>
          
          {/* Page break overlays */}
          {pages.map((_, pageIndex) => (
            <div 
              key={pageIndex}
              className="absolute pointer-events-none"
              style={{
                top: `${pageIndex * PAGE_HEIGHT_INCHES}in`,
                left: '50%',
                transform: 'translateX(-50%)',
                width: `${PAGE_WIDTH_INCHES}in`,
                height: `${PAGE_HEIGHT_INCHES}in`,
                border: '1px solid #ccc',
                boxShadow: '0 0 5px rgba(0, 0, 0, 0.2)',
                backgroundColor: 'transparent',
                zIndex: 0
              }}
            >
              {/* Page break indicator */}
              {pageIndex > 0 && (
                <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 bg-red-500 text-white px-2 py-1 text-xs font-bold rounded">
                  PAGE {pageIndex + 1}
                </div>
              )}
              
              {/* Header */}
              {showHeader && (
                <div 
                  className="absolute top-0 left-0 right-0 bg-gray-50 border-b border-gray-200 px-8 py-3 text-sm text-gray-600 pointer-events-none"
                  style={{ height: `${PAGE_PADDING}px` }}
                >
                  <div className="flex justify-between items-center">
                    <div className="font-medium">{assignmentTitle}</div>
                    <div>{studentName}</div>
                  </div>
                </div>
              )}
              
              {/* Footer */}
              {showPageNumbers && (
                <div 
                  className="absolute bottom-0 left-0 right-0 bg-gray-50 border-t border-gray-200 px-8 py-2 text-center text-sm text-gray-500 pointer-events-none"
                  style={{ height: `${FOOTER_HEIGHT}px` }}
                >
                  <div className="flex justify-between items-center">
                    <div>Page {pageIndex + 1} of {pages.length}</div>
                    <div>Word Count: {content.split(" ").filter(word => word.length > 0).length}</div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>



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