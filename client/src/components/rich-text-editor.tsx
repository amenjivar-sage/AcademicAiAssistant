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

  // Recursive function to handle overflow on any page
  const checkAndHandleOverflow = useCallback((pageIndex: number, currentPages: string[]) => {
    const currentRef = pageRefs.current[pageIndex];
    if (!currentRef) return;

    const editorElement = currentRef.getEditor().root;
    const scrollHeight = editorElement.scrollHeight;
    const maxHeight = 950;

    // If content exceeds page height, split it
    if (scrollHeight > maxHeight) {
      console.log(`Overflow detected on page ${pageIndex + 1}: ${scrollHeight}px > ${maxHeight}px`);
      
      const quillEditor = currentRef.getEditor();
      const totalLength = quillEditor.getLength() - 1; // Subtract 1 for the trailing newline
      
      if (totalLength <= 0) return;

      // Find a better break point by measuring content height
      let breakPoint = Math.floor(totalLength * 0.7); // Start with 70% of content
      
      // Get content before and after break point
      const firstPageContent = quillEditor.getText(0, breakPoint);
      const overflowContent = quillEditor.getText(breakPoint);
      
      // Update current page with truncated content
      const updatedPages = [...currentPages];
      updatedPages[pageIndex] = `<p>${firstPageContent.trim()}</p>`;
      
      // Handle overflow content
      if (overflowContent.trim()) {
        // If next page exists, prepend overflow to it
        if (pageIndex + 1 < updatedPages.length) {
          const nextPageContent = updatedPages[pageIndex + 1];
          // Remove existing <p> tags and combine content
          const cleanNextContent = nextPageContent.replace(/<\/?p>/g, '').trim();
          updatedPages[pageIndex + 1] = `<p>${overflowContent.trim()}${cleanNextContent ? ' ' + cleanNextContent : ''}</p>`;
        } else {
          // Create new page with overflow content
          updatedPages.push(`<p>${overflowContent.trim()}</p>`);
        }
      }
      
      setPages(updatedPages);
      
      // Recursively check if the next page now has overflow
      setTimeout(() => {
        if (pageIndex + 1 < updatedPages.length) {
          checkAndHandleOverflow(pageIndex + 1, updatedPages);
        }
      }, 150);
    }
  }, []);

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
    
    // Check for content overflow on any page when user types
    if (source === 'user') {
      setTimeout(() => {
        checkAndHandleOverflow(pageIndex, newPages);
      }, 100);
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

  // Handle keyboard events for automatic page creation
  const handleKeyDown = (e: React.KeyboardEvent, pageIndex: number) => {
    if (e.key === 'Enter') {
      // Check for overflow after Enter key
      setTimeout(() => {
        checkAndHandleOverflow(pageIndex, pages);
      }, 50);
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