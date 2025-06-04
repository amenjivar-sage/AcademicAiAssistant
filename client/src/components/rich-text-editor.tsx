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

  const createHandleChange = (pageIndex: number) => (value: string, delta: any, source: any, editor: any) => {
    // Prevent recursive updates by checking if this is the expected change
    if (pages[pageIndex] === value) return;
    
    // Update the specific page content without affecting other pages
    const newPages = [...pages];
    newPages[pageIndex] = value;
    
    // Only update pages state if there's actually a change
    setPages(newPages);
    
    // Combine all pages for parent callback
    const combinedContent = newPages.join('');
    onContentChange(combinedContent);
    
    // Check for content overflow on user input for the last page only
    if (source === 'user' && pageIndex === newPages.length - 1) {
      setTimeout(() => {
        const currentRef = pageRefs.current[pageIndex];
        if (currentRef) {
          const editorElement = currentRef.getEditor().root;
          const scrollHeight = editorElement.scrollHeight;
          const maxHeight = 950;
          
          // If content exceeds page height, create new page and move overflow
          if (scrollHeight > maxHeight) {
            console.log(`Overflow detected on page ${pageIndex + 1}: ${scrollHeight}px > ${maxHeight}px`);
            
            // Get the current content
            const quillEditor = currentRef.getEditor();
            const currentContent = quillEditor.getContents();
            
            // Find a good break point (approximately where overflow starts)
            const totalLength = quillEditor.getLength();
            const breakPoint = Math.floor(totalLength * 0.8); // Take 80% of content
            
            // Split content at break point
            const firstPageContent = quillEditor.getText(0, breakPoint);
            const overflowContent = quillEditor.getText(breakPoint);
            
            // Update current page with truncated content
            const updatedPages = [...newPages];
            updatedPages[pageIndex] = `<p>${firstPageContent}</p>`;
            updatedPages.push(`<p>${overflowContent}</p>`);
            
            setPages(updatedPages);
            setActivePage(pageIndex + 1);
            
            // Focus on new page
            setTimeout(() => {
              const newPageRef = pageRefs.current[pageIndex + 1];
              if (newPageRef) {
                newPageRef.focus();
                newPageRef.getEditor().setSelection(0, 0);
                console.log(`Created page ${pageIndex + 2} with overflow content`);
              }
            }, 150);
          }
        }
      }, 100);
    }
    
    // Update overflow status
    setTimeout(() => {
      const currentRef = pageRefs.current[pageIndex];
      if (currentRef) {
        const editorElement = currentRef.getEditor().root;
        const scrollHeight = editorElement.scrollHeight;
        setContentOverflow(scrollHeight > 856);
      }
    }, 50);
    
    // Handle text selection for formatting feedback
    if (onTextSelection) {
      const selection = editor.getSelection();
      if (selection && selection.length > 0) {
        const selectedText = editor.getText(selection.index, selection.length);
        onTextSelection(selectedText);
      } else {
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
    if (e.key === 'Enter' && pageIndex === pages.length - 1) {
      const currentRef = pageRefs.current[pageIndex];
      if (!currentRef) return;

      // Check editor scroll height directly
      const editorElement = currentRef.getEditor().root;
      const scrollHeight = editorElement.scrollHeight;
      const maxHeight = 950; // Fixed height from CSS
      
      // If content is approaching the height limit, create new page
      if (scrollHeight >= maxHeight - 100) {
        e.preventDefault();
        console.log(`Creating new page - scrollHeight: ${scrollHeight}px, maxHeight: ${maxHeight}px`);
        
        // Create new page
        const newPagesList = [...pages, ''];
        setPages(newPagesList);
        setActivePage(pageIndex + 1);
        
        // Focus new page with proper cursor positioning
        setTimeout(() => {
          const newPageRef = pageRefs.current[pageIndex + 1];
          if (newPageRef) {
            newPageRef.focus();
            
            // Set cursor at beginning of new page
            const nextEditor = newPageRef.getEditor();
            nextEditor.setSelection(0, 0);
            
            console.log(`Moved to page ${pageIndex + 2}`);
          }
        }, 100);
      }
    }
  };



  // Expose formatting functions to parent
  useEffect(() => {
    if (ref && typeof ref === 'object' && ref.current) {
      (ref.current as any).applyBold = applyBold;
    }
  }, [ref]);

  return (
    <div className="rich-text-editor-container">
      <style>{`
        .rich-text-editor-container {
          background: #f3f4f6;
          padding: 40px 20px;
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .document-container {
          width: 8.5in;
        }

        .single-document-page {
          background: white;
          width: 8.5in;
          height: 1000px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          border: 1px solid #e5e7eb;
          position: relative;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
        }

        .document-page:not(:last-child):after {
          content: '';
          position: absolute;
          bottom: -10px;
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
          margin: 0 !important;
          width: 100% !important;
          max-height: 950px !important;
          box-sizing: border-box !important;
        }
        
        .ql-editor.ql-blank::before {
          font-family: 'Times New Roman', serif !important;
          font-size: 12pt !important;
          color: #9ca3af !important;
        }

        .ql-editor p {
          margin-bottom: 0 !important;
          page-break-inside: avoid;
        }

        .ql-editor strong {
          font-weight: bold !important;
        }

        .ql-toolbar {
          display: none !important;
        }

        /* Custom scrollbar */
        .rich-text-editor-container {
          scrollbar-width: thin;
          scrollbar-color: #cbd5e1 #f1f5f9;
        }

        .rich-text-editor-container::-webkit-scrollbar {
          width: 8px;
        }

        .rich-text-editor-container::-webkit-scrollbar-track {
          background: #f1f5f9;
        }

        .rich-text-editor-container::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 4px;
        }

        .rich-text-editor-container::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }

        /* Multi-page content flow */
        .ql-editor {
          position: relative;
        }

        .ql-editor::after {
          content: '';
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 2px;
          background: repeating-linear-gradient(
            to right,
            transparent 0,
            transparent 1000px,
            #e5e7eb 1000px,
            #e5e7eb calc(1000px + 2px),
            transparent calc(1000px + 2px)
          );
        }

        /* Page content styling */
        .page-content {
          font-family: 'Times New Roman', serif !important;
          font-size: 12pt !important;
          line-height: 2.0 !important;
          padding: 0 !important;
          margin: 0 !important;
          height: 100% !important;
          overflow: hidden !important;
        }

        .page-content p {
          margin-bottom: 0 !important;
        }

        .page-content strong {
          font-weight: bold !important;
        }

        /* Ensure Quill editor works properly within single page container */
        .single-document-page .ql-container {
          border: none !important;
          font-family: 'Times New Roman', serif !important;
          font-size: 12pt !important;
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

        .single-document-page .ql-editor .ql-cursor {
          display: block !important;
        }

        /* Content overflow warning */
        .overflow-warning {
          position: absolute;
          top: 10px;
          right: 10px;
          background: #fef2f2;
          border: 1px solid #fecaca;
          color: #dc2626;
          padding: 8px 12px;
          border-radius: 4px;
          font-size: 12px;
          font-family: 'Times New Roman', serif;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          z-index: 1000;
          max-width: 200px;
        }
      `}</style>
      
      <div className="document-container" ref={containerRef}>
        {pages.map((pageContent, index) => (
          <div key={index} className="single-document-page" style={{ marginBottom: index < pages.length - 1 ? '20px' : '0' }}>
            <ReactQuill
              ref={(el) => {
                pageRefs.current[index] = el;
                if (index === 0 && el) {
                  // Use type assertion to bypass readonly restriction
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