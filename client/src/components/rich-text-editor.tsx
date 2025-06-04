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
    // Update the specific page content
    const newPages = [...pages];
    newPages[pageIndex] = value;
    setPages(newPages);
    
    // Combine all pages for parent callback
    const combinedContent = newPages.join('');
    onContentChange(combinedContent);
    
    // Check for Enter key and content overflow
    if (source === 'user' && delta && delta.ops) {
      const hasEnterKey = delta.ops.some((op: any) => op.insert === '\n');
      
      if (hasEnterKey) {
        setTimeout(() => {
          const currentRef = pageRefs.current[pageIndex];
          if (currentRef && pageIndex === pages.length - 1) {
            const editorElement = currentRef.getEditor().root;
            const scrollHeight = editorElement.scrollHeight;
            const maxHeight = 856; // 1000px - 144px padding
            
            // Check if content exceeds page height after Enter
            if (scrollHeight > maxHeight) {
              console.log(`Enter triggered overflow: ${scrollHeight}px > ${maxHeight}px`);
              
              const quillEditor = currentRef.getEditor();
              const selection = quillEditor.getSelection();
              
              if (selection) {
                // Get cursor position and check if near bottom
                const bounds = quillEditor.getBounds(selection.index);
                const editorRect = editorElement.getBoundingClientRect();
                const relativeY = bounds.top;
                
                // If cursor is near bottom of page, create new page
                if (relativeY > maxHeight * 0.9) {
                  // Create new page
                  const newPagesList = [...pages, ''];
                  setPages(newPagesList);
                  setActivePage(pageIndex + 1);
                  
                  // Move to new page after creation
                  setTimeout(() => {
                    const newPageRef = pageRefs.current[pageIndex + 1];
                    if (newPageRef) {
                      newPageRef.focus();
                      newPageRef.getEditor().setSelection(0, 0);
                      console.log(`Moved to new page ${pageIndex + 2}`);
                    }
                  }, 100);
                }
              }
            }
          }
        }, 50);
      }
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
      setPages([content]);
    }
  }, [content]);

  // Initialize page refs array
  useEffect(() => {
    pageRefs.current = pageRefs.current.slice(0, pages.length);
  }, [pages.length]);

  // Create keyboard event handler for each page
  const createKeyDownHandler = (pageIndex: number) => (e: KeyboardEvent) => {
    if (e.key === 'Enter' && pageIndex === pages.length - 1) {
      const currentRef = pageRefs.current[pageIndex];
      if (!currentRef) return;

      const editorElement = currentRef.getEditor().root;
      const scrollHeight = editorElement.scrollHeight;
      const clientHeight = editorElement.clientHeight;
      const scrollTop = editorElement.scrollTop;
      
      // Calculate if we're near the bottom of the page content
      const currentBottom = scrollTop + clientHeight;
      const isNearBottom = currentBottom >= scrollHeight - 50; // 50px threshold
      
      // Also check if content exceeds page height
      const maxPageHeight = 856; // 1000px - 144px padding
      const contentExceedsHeight = scrollHeight > maxPageHeight;
      
      if (isNearBottom || contentExceedsHeight) {
        e.preventDefault();
        console.log(`Creating new page - scrollHeight: ${scrollHeight}, maxHeight: ${maxPageHeight}`);
        
        // Create new page
        const newPagesList = [...pages, ''];
        setPages(newPagesList);
        setActivePage(pageIndex + 1);
        
        // Move cursor to new page
        setTimeout(() => {
          const newPageRef = pageRefs.current[pageIndex + 1];
          if (newPageRef) {
            newPageRef.focus();
            newPageRef.getEditor().setSelection(0, 0);
            console.log(`Moved to page ${pageIndex + 2}`);
          }
        }, 100);
      }
    }
  };

  // Attach keyboard listeners when pages change
  useEffect(() => {
    // Cleanup existing listeners
    pageRefs.current.forEach((ref) => {
      if (ref) {
        const editorElement = ref.getEditor().root;
        const handler = (editorElement as any)._keydownHandler;
        if (handler) {
          editorElement.removeEventListener('keydown', handler);
        }
      }
    });

    // Attach new listeners
    pageRefs.current.forEach((ref, index) => {
      if (ref) {
        const editorElement = ref.getEditor().root;
        const handler = createKeyDownHandler(index);
        editorElement.addEventListener('keydown', handler);
        (editorElement as any)._keydownHandler = handler;
      }
    });

    return () => {
      pageRefs.current.forEach((ref) => {
        if (ref) {
          const editorElement = ref.getEditor().root;
          const handler = (editorElement as any)._keydownHandler;
          if (handler) {
            editorElement.removeEventListener('keydown', handler);
            delete (editorElement as any)._keydownHandler;
          }
        }
      });
    };
  }, [pages.length]);

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
          font-family: 'Times New Roman', serif !important;
          font-size: 12pt !important;
          line-height: 2.0 !important;
          padding: 72px !important;
          background: transparent !important;
          border: none !important;
          margin: 0 !important;
          width: 100% !important;
          height: calc(1000px - 144px) !important;
          max-height: calc(1000px - 144px) !important;
          overflow: hidden !important;
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

        .single-document-page .ql-editor {
          padding: 72px !important;
          line-height: 2.0 !important;
          font-family: 'Times New Roman', serif !important;
          font-size: 12pt !important;
          box-sizing: border-box !important;
          min-height: 856px !important;
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