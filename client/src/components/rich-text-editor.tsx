import { useEffect, useRef, forwardRef, useImperativeHandle, useState, useCallback } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

interface RichTextEditorProps {
  content: string;
  onContentChange: (content: string) => void;
  onTextSelection?: (selectedText: string) => void;
  readOnly?: boolean;
  placeholder?: string;
}

export interface RichTextEditorHandle {
  focus: () => void;
  getEditor: () => ReactQuill | null;
}

const RichTextEditor = forwardRef<RichTextEditorHandle, RichTextEditorProps>(({
  content,
  onContentChange,
  onTextSelection,
  readOnly = false,
  placeholder = "Start writing..."
}, ref) => {
  const quillRef = useRef<ReactQuill>(null);
  const [pageCount, setPageCount] = useState(1);
  const [contentOverflow, setContentOverflow] = useState(false);
  const [pages, setPages] = useState<string[]>([content || '']);
  const [activePage, setActivePage] = useState(0);
  const pageRefs = useRef<(ReactQuill | null)[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  useImperativeHandle(ref, () => ({
    focus: () => {
      const activeRef = pageRefs.current[activePage] || pageRefs.current[0];
      if (activeRef) {
        activeRef.focus();
      }
    },
    getEditor: () => pageRefs.current[activePage] || pageRefs.current[0]
  }));

  // Custom toolbar configuration
  const modules = {
    toolbar: false, // We'll use custom formatting buttons
    clipboard: {
      matchVisual: false,
    },
  };

  const formats = [
    'bold', 'italic', 'underline', 'strike',
    'list', 'bullet', 'indent',
    'link', 'color', 'background'
  ];

  // More precise overflow detection and content splitting
  const checkAndHandleOverflow = useCallback((pageIndex: number, currentPages: string[]) => {
    const currentRef = pageRefs.current[pageIndex];
    if (!currentRef) {
      console.log(`No ref found for page ${pageIndex + 1}`);
      return;
    }

    const editorElement = currentRef.getEditor().root;
    const scrollHeight = editorElement.scrollHeight;
    const maxHeight = 950;

    console.log(`Checking overflow for page ${pageIndex + 1}: ${scrollHeight}px vs ${maxHeight}px`);

    // If content exceeds page height, find optimal break point
    if (scrollHeight > maxHeight) {
      console.log(`OVERFLOW DETECTED on page ${pageIndex + 1}: ${scrollHeight}px > ${maxHeight}px`);
      
      const quillEditor = currentRef.getEditor();
      const delta = quillEditor.getContents();
      const totalLength = quillEditor.getLength() - 1;
      
      if (totalLength <= 0) return;

      // Binary search to find the optimal break point where content fits exactly
      let low = 0;
      let high = totalLength;
      let bestBreakPoint = Math.floor(totalLength * 0.8);

      // Try to find the break point by testing different lengths
      for (let i = 0; i < 10; i++) {
        const testPoint = Math.floor((low + high) / 2);
        
        // Test if content up to this point fits
        const testContent = quillEditor.getText(0, testPoint);
        
        // Create temporary measurement
        const tempElement = document.createElement('div');
        tempElement.style.cssText = `
          position: absolute;
          left: -9999px;
          width: calc(8.5in - 144px);
          font-family: 'Times New Roman', serif;
          font-size: 14pt;
          line-height: 2.0;
          padding: 0;
          white-space: pre-wrap;
        `;
        tempElement.textContent = testContent;
        document.body.appendChild(tempElement);
        
        const testHeight = tempElement.offsetHeight;
        document.body.removeChild(tempElement);
        
        if (testHeight <= maxHeight - 72) { // Account for padding
          low = testPoint;
          bestBreakPoint = testPoint;
        } else {
          high = testPoint;
        }
        
        if (high - low <= 5) break; // Close enough
      }

      // Find a good word boundary near the break point
      const text = quillEditor.getText();
      let finalBreakPoint = bestBreakPoint;
      
      // Look backwards for a space or punctuation to avoid breaking words
      for (let i = bestBreakPoint; i > bestBreakPoint - 50 && i > 0; i--) {
        const char = text[i];
        if (char === ' ' || char === '\n' || char === '.' || char === '!' || char === '?') {
          finalBreakPoint = i + 1;
          break;
        }
      }

      // Split content at the break point
      const firstPageText = quillEditor.getText(0, finalBreakPoint).trim();
      const overflowText = quillEditor.getText(finalBreakPoint).trim();
      
      if (!overflowText) return; // No actual overflow
      
      // Update pages
      const updatedPages = [...currentPages];
      updatedPages[pageIndex] = firstPageText ? `<p>${firstPageText}</p>` : '';
      
      // Handle overflow content
      if (pageIndex + 1 < updatedPages.length) {
        // Merge with existing next page content
        const nextPageText = updatedPages[pageIndex + 1].replace(/<\/?p>/g, '').trim();
        const combinedText = overflowText + (nextPageText ? ' ' + nextPageText : '');
        updatedPages[pageIndex + 1] = `<p>${combinedText}</p>`;
      } else {
        // Create new page
        updatedPages.push(`<p>${overflowText}</p>`);
      }
      
      // Store current cursor position before page split
      const selection = quillEditor.getSelection();
      const cursorPosition = selection ? selection.index : 0;
      const cursorInOverflow = cursorPosition >= finalBreakPoint;
      
      console.log(`Cursor position: ${cursorPosition}, break point: ${finalBreakPoint}, cursor in overflow: ${cursorInOverflow}`);
      
      setPages(updatedPages);
      
      // Handle cursor positioning after page split
      setTimeout(() => {
        if (cursorInOverflow && pageIndex + 1 < updatedPages.length) {
          // Cursor should move to the next page
          const newPosition = Math.max(0, cursorPosition - finalBreakPoint);
          const nextPageRef = pageRefs.current[pageIndex + 1];
          
          console.log(`Moving cursor to page ${pageIndex + 2} at position ${newPosition}`);
          
          if (nextPageRef) {
            nextPageRef.focus();
            setTimeout(() => {
              nextPageRef.getEditor().setSelection(newPosition, 0);
              setActivePage(pageIndex + 1);
            }, 100);
          }
        } else {
          // Keep cursor on current page
          const currentPageRef = pageRefs.current[pageIndex];
          if (currentPageRef && selection) {
            const newPosition = Math.min(cursorPosition, firstPageText.length);
            setTimeout(() => {
              currentPageRef.getEditor().setSelection(newPosition, 0);
            }, 100);
          }
        }
        
        // Recursively check next page after content update
        if (pageIndex + 1 < updatedPages.length) {
          setTimeout(() => {
            checkAndHandleOverflow(pageIndex + 1, updatedPages);
          }, 200);
        }
      }, 150);
    }
  }, []);

  // Debounced overflow check to prevent rapid page creation
  const overflowCheckTimeout = useRef<NodeJS.Timeout | null>(null);

  const createHandleChange = (pageIndex: number) => (value: string, delta: any, source: any, editor: any) => {
    // Prevent recursive updates by checking if this is the expected change
    if (pages[pageIndex] === value) return;
    
    // Update the specific page content without affecting other pages
    const newPages = [...pages];
    newPages[pageIndex] = value;
    setPages(newPages);
    
    // Combine all pages for parent callback
    const combinedContent = newPages.join('');
    onContentChange(combinedContent);
    
    // Debounced overflow check for user input
    if (source === 'user') {
      console.log(`User input detected on page ${pageIndex + 1}, scheduling overflow check`);
      if (overflowCheckTimeout.current) {
        clearTimeout(overflowCheckTimeout.current);
      }
      
      overflowCheckTimeout.current = setTimeout(() => {
        console.log(`Running overflow check for page ${pageIndex + 1}`);
        checkAndHandleOverflow(pageIndex, newPages);
      }, 300); // Increased debounce to 300ms
    }
    
    // Update overflow status
    setTimeout(() => {
      const currentRef = pageRefs.current[pageIndex];
      if (currentRef) {
        const editorElement = currentRef.getEditor().root;
        const scrollHeight = editorElement.scrollHeight;
        const maxHeight = 950;
        setContentOverflow(scrollHeight > maxHeight);
      }
    }, 50);
  };

  // Handle text selection for AI assistance
  const handleTextSelection = (range: any, oldRange: any, source: any, pageIndex: number) => {
    if (source === 'user' && range && onTextSelection) {
      const currentRef = pageRefs.current[pageIndex];
      if (currentRef) {
        const selectedText = currentRef.getEditor().getText(range.index, range.length);
        onTextSelection(selectedText);
      }
    } else if (!range && onTextSelection) {
      // No selection, clear the selected text
      if (onTextSelection) {
        onTextSelection('');
      }
    }
  };

  // Apply bold formatting function
  const applyBold = () => {
    if (quillRef.current) {
      const editor = quillRef.current.getEditor();
      const selection = editor.getSelection();
      
      if (selection) {
        const currentFormat = editor.getFormat(selection);
        const isBold = currentFormat.bold;
        editor.format('bold', !isBold);
      }
    }
  };

  // Initialize pages when content is loaded
  useEffect(() => {
    if (content && content !== pages.join('')) {
      // Only reset if we're starting fresh or content is significantly different
      if (pages.length === 1 && pages[0] === '') {
        setPages([content]);
      }
    }
  }, [content]);

  // Initialize page refs array
  useEffect(() => {
    pageRefs.current = pageRefs.current.slice(0, pages.length);
  }, [pages.length]);

  // Clean up empty pages and consolidate content
  const consolidatePages = useCallback(() => {
    const newPages: string[] = [];
    let currentPageText = '';
    
    for (let i = 0; i < pages.length; i++) {
      const pageText = pages[i].replace(/<\/?p>/g, '').trim();
      if (pageText) {
        currentPageText += (currentPageText ? ' ' : '') + pageText;
      }
    }
    
    if (!currentPageText) {
      setPages(['']);
      return;
    }
    
    // Split content back into properly sized pages
    const words = currentPageText.split(' ');
    let currentPage = '';
    
    for (const word of words) {
      const testPage = currentPage + (currentPage ? ' ' : '') + word;
      
      // Rough estimation: ~80 characters per line, ~30 lines per page
      if (testPage.length > 2000 && currentPage) {
        newPages.push(`<p>${currentPage}</p>`);
        currentPage = word;
      } else {
        currentPage = testPage;
      }
    }
    
    if (currentPage) {
      newPages.push(`<p>${currentPage}</p>`);
    }
    
    if (newPages.length === 0) {
      newPages.push('');
    }
    
    setPages(newPages);
  }, [pages]);

  // Handle keyboard events for automatic page creation
  const handleKeyDown = (e: React.KeyboardEvent, pageIndex: number) => {
    const currentRef = pageRefs.current[pageIndex];
    if (!currentRef) return;

    if (e.key === 'Enter') {
      console.log(`Enter key pressed on page ${pageIndex + 1}`);
      
      // Get current cursor position before Enter
      const currentSelection = currentRef.getEditor().getSelection();
      const cursorPos = currentSelection ? currentSelection.index : 0;
      
      // Check for overflow after Enter key with cursor position context
      setTimeout(() => {
        console.log(`Checking overflow after Enter at position ${cursorPos}`);
        checkAndHandleOverflow(pageIndex, pages);
      }, 100);
      
    } else if (e.key === 'Backspace' || e.key === 'Delete') {
      // Check if we need to consolidate pages after deletion
      setTimeout(() => {
        const hasEmptyPages = pages.some((page, index) => 
          index > 0 && page.replace(/<\/?p>/g, '').trim() === ''
        );
        if (hasEmptyPages) {
          console.log('Consolidating pages after deletion');
          consolidatePages();
        }
      }, 100);
    }
  };

  // Expose formatting functions to parent
  useEffect(() => {
    if (ref && typeof ref === 'object' && ref.current) {
      (ref.current as any).applyBold = applyBold;
    }
  }, []);

  return (
    <div 
      ref={containerRef}
      className="rich-text-editor-container"
      style={{
        width: '100%',
        minHeight: '100vh',
        backgroundColor: '#f5f5f5',
        paddingTop: '40px',
        paddingBottom: '40px'
      }}
    >
      <style>
        {`
        .rich-text-editor-container {
          font-family: 'Times New Roman', serif;
        }

        .multi-page-editor {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 40px;
          width: 100%;
          max-width: none;
          margin: 0 auto;
          padding: 0 20px;
          box-sizing: border-box;
        }

        .single-document-page {
          width: 8.5in;
          height: 1122px;
          background: white;
          box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
          margin: 0 auto;
          position: relative;
          page-break-after: always;
          print-color-adjust: exact;
          transition: all 0.3s ease-in-out;
          animation: pageSlideIn 0.3s ease-out;
        }

        @keyframes pageSlideIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .single-document-page .ql-editor {
          padding: 72px !important;
          line-height: 2.0 !important;
          font-family: 'Times New Roman', serif !important;
          font-size: 14pt !important;
          box-sizing: border-box !important;
          height: 950px !important;
          overflow: hidden !important;
        }

        .single-document-page .ql-editor:focus {
          outline: none !important;
        }

        .page-break-line {
          position: absolute;
          bottom: 30px;
          left: 50%;
          transform: translateX(-50%);
          width: 80%;
          height: 2px;
          background: repeating-linear-gradient(
            to right,
            #cbd5e1 0,
            #cbd5e1 10px,
            transparent 10px,
            transparent 20px
          );
        }

        .page-number {
          position: absolute;
          bottom: 20px;
          right: 72px;
          font-family: 'Times New Roman', serif;
          font-size: 10pt;
          color: #6b7280;
        }

        .ql-container {
          border: none !important;
          font-family: 'Times New Roman', serif !important;
          background: transparent !important;
          flex: 1;
          display: flex;
          flex-direction: column;
          height: 1000px;
          overflow: hidden;
        }

        .ql-editor {
          height: 950px !important;
          overflow: hidden !important;
          font-family: 'Times New Roman', serif !important;
          font-size: 14pt !important;
          line-height: 2.0 !important;
          padding: 72px !important;
          background: transparent !important;
          border: none !important;
          box-sizing: border-box !important;
        }

        .ql-editor.ql-blank::before {
          font-family: 'Times New Roman', serif !important;
          font-size: 14pt !important;
          color: #9ca3af !important;
          font-style: italic !important;
        }

        .ql-toolbar {
          display: none !important;
        }

        .ql-snow .ql-tooltip {
          z-index: 1000;
        }

        .ql-editor p {
          margin-bottom: 0 !important;
          font-family: 'Times New Roman', serif !important;
          font-size: 14pt !important;
        }

        .ql-editor strong {
          font-weight: bold !important;
        }

        .ql-editor em {
          font-style: italic !important;
        }

        .ql-editor ul, .ql-editor ol {
          padding-left: 30px !important;
        }

        .ql-editor li {
          font-family: 'Times New Roman', serif !important;
          font-size: 14pt !important;
        }

        @media print {
          .single-document-page {
            width: 8.5in !important;
            height: 11in !important;
            margin: 0 !important;
            box-shadow: none !important;
            page-break-after: always !important;
          }
          
          .page-number {
            color: #000 !important;
          }
        }
        `}
      </style>
      
      <div className="multi-page-editor">
        {pages.map((pageContent, index) => (
          <div key={index} className="single-document-page">
            <ReactQuill
              ref={(el) => {
                pageRefs.current[index] = el;
                if (index === 0) {
                  (quillRef as { current: ReactQuill | null }).current = el;
                }
              }}
              value={pageContent}
              onChange={createHandleChange(index)}
              onKeyDown={(e) => handleKeyDown(e, index)}
              modules={modules}
              formats={formats}
              readOnly={readOnly}
              placeholder={index === 0 ? placeholder : "Continue writing..."}
              theme="snow"
            />
            
            {/* Page number */}
            <div className="page-number">
              {index + 1}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});

RichTextEditor.displayName = 'RichTextEditor';

export default RichTextEditor;