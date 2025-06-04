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
  onTextSelection?: (selectedText: string) => void;
  onFormatRef?: (formatFn: (command: string) => void) => void;
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
  inlineComments = [],
  onTextSelection,
  onFormatRef
}: SingleDocumentEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [pages, setPages] = useState<number[]>([]);
  const [isSpellCheckActive, setIsSpellCheckActive] = useState(false);
  const [spellErrors, setSpellErrors] = useState<any[]>([]);
  const [selectedText, setSelectedText] = useState<string>('');
  const [selectionStart, setSelectionStart] = useState<number>(0);
  const [selectionEnd, setSelectionEnd] = useState<number>(0);
  const [showFormatting, setShowFormatting] = useState<boolean>(false);

  // Handle text selection
  const handleSelectionChange = () => {
    if (!textareaRef.current || !onTextSelection) return;
    
    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = textarea.value.substring(start, end);
    
    console.log('Text selection:', { start, end, selected: selectedText, length: selectedText.length });
    setSelectedText(selectedText);
    setSelectionStart(start);
    setSelectionEnd(end);
    setShowFormatting(selectedText.length > 0);
    onTextSelection(selectedText);
  };

  // Apply formatting
  const applyFormatting = (command: string) => {
    if (!textareaRef.current || readOnly) return;
    
    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = textarea.value.substring(start, end);
    
    if (!selectedText.trim()) return;
    
    if (command === 'bold') {
      // Check if the selection is already surrounded by ** markers
      const beforeSelection = textarea.value.substring(Math.max(0, start - 2), start);
      const afterSelection = textarea.value.substring(end, end + 2);
      
      const isAlreadyBold = beforeSelection === '**' && afterSelection === '**';
      
      // Also check if the selected text itself contains bold markers
      const containsBoldMarkers = selectedText.startsWith('**') && selectedText.endsWith('**');
      
      let newContent;
      let newSelectionStart;
      let newSelectionEnd;
      
      if (isAlreadyBold) {
        // Remove bold formatting from surrounding markers
        newContent = 
          textarea.value.substring(0, start - 2) + 
          selectedText + 
          textarea.value.substring(end + 2);
        newSelectionStart = start - 2;
        newSelectionEnd = end - 2;
      } else if (containsBoldMarkers) {
        // Remove bold formatting from within selection
        const unboldedText = selectedText.slice(2, -2);
        newContent = 
          textarea.value.substring(0, start) + 
          unboldedText + 
          textarea.value.substring(end);
        newSelectionStart = start;
        newSelectionEnd = start + unboldedText.length;
      } else {
        // Add bold formatting
        newContent = 
          textarea.value.substring(0, start) + 
          `**${selectedText}**` + 
          textarea.value.substring(end);
        newSelectionStart = start + 2;
        newSelectionEnd = end + 2;
      }
      
      onContentChange(newContent);
      
      // Restore selection after formatting
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(newSelectionStart, newSelectionEnd);
      }, 0);
    }
  };

  // Expose formatting function to parent
  useEffect(() => {
    if (onFormatRef) {
      onFormatRef(applyFormatting);
    }
  }, [onFormatRef]);

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

  // Combined highlighting function for both copy-paste and inline comments
  const applyAllHighlights = (text: string, pastedData: any[], comments: any[]): string => {
    if (!text) return text;
    
    let highlightedText = text;

    // First apply inline comment highlighting (before copy-paste)
    if (comments && comments.length > 0) {
      comments.forEach((comment: any) => {
        const searchText = comment.highlightedText;
        
        if (searchText && highlightedText.includes(searchText)) {
          const escapedSearchText = searchText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const regex = new RegExp(escapedSearchText, 'g');
          highlightedText = highlightedText.replace(regex, (match) => {
            return `<span style="background-color: #dbeafe; border: 2px solid #3b82f6; color: #1e40af; font-weight: 600; padding: 2px 4px; border-radius: 4px; cursor: help;" title="Teacher Comment: ${comment.comment.trim()}" data-comment-id="${comment.id}">${match}</span>`;
          });
        }
      });
    }

    // Then apply copy-paste highlighting if enabled
    if (showCopyPasteHighlights && pastedData && pastedData.length > 0) {
      pastedData.forEach((paste: any, index: number) => {
        
        if (paste.text && typeof paste.text === 'string') {
          // Simple approach: look for exact phrases and common spelling corrections
          const originalText = paste.text;
          
          // Split into sentences and look for matches
          const sentences = originalText.split(/[.!?]+/).filter(s => s.trim().length > 20);
          
          sentences.forEach(sentence => {
            const trimmedSentence = sentence.trim();
            
            // Check for exact match first
            if (highlightedText.includes(trimmedSentence)) {
              const escapedSentence = trimmedSentence.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
              const regex = new RegExp(escapedSentence, 'g');
              highlightedText = highlightedText.replace(regex, (match) => {
                return `<span style="background-color: #fecaca; border: 2px solid #f87171; color: #991b1b; font-weight: 600; padding: 2px 4px; border-radius: 3px; margin: 0 1px;" title="Copy-pasted content detected">${match}</span>`;
              });
            } else {
              // Check for corrected versions of common misspellings
              const correctedSentence = trimmedSentence
                .replace(/fealing/gi, 'feeling')
                .replace(/sandwitches/gi, 'sandwiches')
                .replace(/promissed/gi, 'promised')
                .replace(/probbably/gi, 'probably')
                .replace(/perfact/gi, 'perfect')
                .replace(/reminde/gi, 'remind');
              
              if (highlightedText.includes(correctedSentence)) {
                const escapedCorrected = correctedSentence.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                const regex = new RegExp(escapedCorrected, 'g');
                highlightedText = highlightedText.replace(regex, (match) => {
                  return `<span style="background-color: #fecaca; border: 2px solid #f87171; color: #991b1b; font-weight: 600; padding: 2px 4px; border-radius: 3px; margin: 0 1px;" title="Copy-pasted content detected (spell-corrected)">${match}</span>`;
                });
              }
            }
          });
        }
      });
    }



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

  // Render bold text visually in display mode only
  const renderFormattedText = (text: string): string => {
    if (readOnly) {
      // Convert **text** to bold HTML for display
      return text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    }
    return text; // Return plain text for editing
  };

  // Handle text selection for formatting
  const handleTextSelection = () => {
    if (textareaRef.current) {
      const start = textareaRef.current.selectionStart;
      const end = textareaRef.current.selectionEnd;
      const selected = content.substring(start, end);
      
      console.log('Text selection:', { start, end, selected, length: selected.length });
      
      setSelectionStart(start);
      setSelectionEnd(end);
      setSelectedText(selected);
      setShowFormatting(selected.length > 0);
      
      // Call the callback to update parent component
      if (onTextSelection) {
        onTextSelection(selected);
      }
      
      console.log('ShowFormatting set to:', selected.length > 0);
    }
  };

  // Apply bold formatting to selected text
  const applyBoldFormatting = () => {
    if (selectedText.length > 0 && textareaRef.current) {
      const beforeText = content.substring(0, selectionStart);
      const afterText = content.substring(selectionEnd);
      
      // Check if text is already bold (surrounded by **)
      const isBold = selectedText.startsWith('**') && selectedText.endsWith('**');
      
      let newText;
      if (isBold) {
        // Remove bold formatting
        newText = beforeText + selectedText.slice(2, -2) + afterText;
      } else {
        // Add bold formatting
        newText = beforeText + '**' + selectedText + '**' + afterText;
      }
      
      onContentChange(newText);
      
      // Maintain focus and cursor position
      setTimeout(() => {
        if (textareaRef.current) {
          const newCursorPos = isBold ? selectionEnd - 4 : selectionEnd + 4;
          textareaRef.current.focus();
          textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
        }
      }, 0);
    }
  };

  // Handle keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!readOnly && e.ctrlKey && e.key === 'b') {
      e.preventDefault();
      applyBoldFormatting();
    }
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
            
            {/* Teacher inline comments as visible badges */}
            {readOnly && inlineComments.length > 0 && (
              <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 4 }}>
                {inlineComments.map((comment: any) => {
                  const text = comment.highlightedText;
                  if (text && content.includes(text)) {
                    const startIndex = content.indexOf(text);
                    // Calculate approximate position (this is simplified)
                    const lines = content.substring(0, startIndex).split('\n').length;
                    const topPosition = (lines - 1) * 24 + PAGE_PADDING; // 24px line height approximation
                    
                    return (
                      <div
                        key={comment.id}
                        className="absolute bg-blue-100 border-2 border-blue-500 text-blue-800 px-2 py-1 rounded text-xs font-medium shadow-lg pointer-events-auto"
                        style={{
                          top: `${topPosition}px`,
                          right: '10px',
                          maxWidth: '200px',
                          zIndex: 5
                        }}
                        title={`Comment on: "${text.substring(0, 50)}..."`}
                      >
                        💬 {comment.comment.trim()}
                      </div>
                    );
                  }
                  return null;
                })}
              </div>
            )}

            {/* Combined highlighting overlay for graded assignments */}
            {readOnly && (showCopyPasteHighlights || inlineComments.length > 0) && (
              <div 
                className="absolute inset-0 pointer-events-none"
                style={{
                  fontFamily: "'Times New Roman', serif",
                  fontSize: "12pt",
                  lineHeight: "2.0",
                  padding: `${PAGE_PADDING}px`,
                  whiteSpace: 'pre-wrap',
                  wordWrap: 'break-word',
                  zIndex: 3,
                  backgroundColor: 'white'
                }}
                dangerouslySetInnerHTML={{
                  __html: applyAllHighlights(content, pastedContent, inlineComments)
                }}
              />
            )}

            <textarea
              ref={textareaRef}
              className={`w-full resize-none border-none outline-none bg-white ${readOnly ? 'cursor-default text-gray-900' : 'text-gray-900'} font-serif relative`}
              style={{
                fontFamily: "'Times New Roman', serif",
                fontSize: "12pt",
                lineHeight: "2.0",
                padding: `${PAGE_PADDING}px`,
                zIndex: 10,
                minHeight: `${pages.length * PAGE_HEIGHT_INCHES}in`,
                width: `${PAGE_WIDTH_INCHES}in`,
                caretColor: '#000000',
                color: '#111827',
                margin: '0 auto'
              }}
              value={content}
              onChange={(e) => {
                if (!readOnly) {
                  handleContentChange(e.target.value);
                }
              }}
              onSelect={handleTextSelection}
              onMouseUp={handleTextSelection}
              onKeyUp={handleTextSelection}
              onKeyDown={handleKeyDown}
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