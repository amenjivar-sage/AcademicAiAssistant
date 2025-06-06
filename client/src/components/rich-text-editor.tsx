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
  const [pages, setPages] = useState<string[]>([content || '<p><br></p>']);
  const [activePage, setActivePage] = useState(0);
  const pageRefs = useRef<(ReactQuill | null)[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isNavigating, setIsNavigating] = useState(false);
  const overflowCheckTimeout = useRef<NodeJS.Timeout | null>(null);

  // Helper function to determine which page an editor belongs to
  const getCurrentPageIndex = useCallback((editor: any) => {
    for (let i = 0; i < pageRefs.current.length; i++) {
      if (pageRefs.current[i]?.getEditor() === editor) {
        return i;
      }
    }
    return -1;
  }, []);

  // Navigation functions for keyboard bindings
  const navigateToNextPage = useCallback((currentEditor: any) => {
    const pageIndex = getCurrentPageIndex(currentEditor);
    if (pageIndex !== -1 && pageIndex < pages.length - 1) {
      const nextPageRef = pageRefs.current[pageIndex + 1];
      if (nextPageRef) {
        const nextEditor = nextPageRef.getEditor();
        if (nextEditor) {
          nextEditor.focus();
          nextEditor.setSelection(0, 0);
          console.log(`Moved to page ${pageIndex + 2} via Enter key`);
          return true;
        }
      }
    }
    return false;
  }, [pages.length, getCurrentPageIndex]);

  const navigateToPrevPage = useCallback((currentEditor: any) => {
    const pageIndex = getCurrentPageIndex(currentEditor);
    if (pageIndex > 0) {
      const prevPageRef = pageRefs.current[pageIndex - 1];
      if (prevPageRef) {
        const prevEditor = prevPageRef.getEditor();
        if (prevEditor) {
          const prevLength = prevEditor.getLength();
          prevEditor.focus();
          prevEditor.setSelection(Math.max(0, prevLength - 1), 0);
          console.log(`Moved to page ${pageIndex} via Backspace key`);
          return true;
        }
      }
    }
    return false;
  }, [getCurrentPageIndex]);

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
    toolbar: false,
    history: {
      delay: 1000,
      maxStack: 100,
      userOnly: true
    },
    keyboard: {
      bindings: {
        'tab': false
      }
    }
  };

  const formats = [
    'bold', 'italic', 'underline', 'strike',
    'list', 'bullet', 'indent',
    'link', 'color', 'background'
  ];

  // Simple overflow detection - just add new pages when needed
  const checkOverflow = useCallback((pageIndex: number) => {
    const pageRef = pageRefs.current[pageIndex];
    if (!pageRef) return;
    
    const editor = pageRef.getEditor();
    const editorElement = editor.root;
    const contentHeight = editorElement.scrollHeight;
    const visibleHeight = editorElement.clientHeight;
    
    console.log(`Page ${pageIndex + 1} height check: content=${contentHeight}px, visible=${visibleHeight}px`);
    
    // If content overflows the visible area, add a new page
    if (contentHeight > visibleHeight + 20 && pageIndex === pages.length - 1) {
      console.log(`Adding new page due to overflow on page ${pageIndex + 1}`);
      setPages(prev => [...prev, '<p><br></p>']);
    }
  }, [pages.length]);

  // Content change handler with overflow detection
  const createHandleChange = (pageIndex: number) => (value: string, delta: any, source: any, editor: any) => {
    if (pages[pageIndex] === value) return;
    
    if (source !== 'user') {
      console.log(`Ignoring non-user change on page ${pageIndex + 1}, source: ${source}`);
      return;
    }
    
    // Update the current page immediately for responsive typing
    const newPages = [...pages];
    newPages[pageIndex] = value;
    setPages(newPages);
    
    // Combine all pages for parent callback
    const allContent = newPages;
    const combinedContent = allContent.join('');
    onContentChange(combinedContent);
    
    // Clear existing timeout
    if (overflowCheckTimeout.current) {
      clearTimeout(overflowCheckTimeout.current);
    }
    
    // Check for overflow after content changes
    overflowCheckTimeout.current = setTimeout(() => {
      checkOverflow(pageIndex);
    }, 200);
  };

  // Handle text selection across pages
  const handleTextSelection = (range: any, oldRange: any, source: string, pageIndex: number) => {
    if (range && onTextSelection) {
      const currentRef = pageRefs.current[pageIndex];
      if (currentRef) {
        const selectedText = currentRef.getEditor().getText(range.index, range.length);
        onTextSelection(selectedText);
      }
    } else if (!range && onTextSelection) {
      onTextSelection('');
    }
  };

  // Initialize page refs when pages change
  useEffect(() => {
    pageRefs.current = pageRefs.current.slice(0, pages.length);
    console.log(`Page refs updated: ${pageRefs.current.length} refs for ${pages.length} pages`);
  }, [pages.length]);

  // Handle external content changes
  useEffect(() => {
    if (content && content !== pages.join('')) {
      console.log('External content change detected, syncing with editor:', content.length, 'chars');
      setPages([content]);
    }
  }, [content, pages]);

  // Ensure minimum pages
  useEffect(() => {
    if (pages.length === 0) {
      setPages(['<p><br></p>']);
    }
  }, [pages]);

  // Add keyboard navigation event listeners
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Enter' || event.key === 'Backspace') {
        const activeElement = document.activeElement;
        if (!activeElement) return;

        // Find which page editor is active
        let activePageIndex = -1;
        for (let i = 0; i < pageRefs.current.length; i++) {
          const pageRef = pageRefs.current[i];
          if (pageRef) {
            const editorElement = pageRef.getEditor()?.root;
            if (editorElement && (editorElement === activeElement || editorElement.contains(activeElement))) {
              activePageIndex = i;
              break;
            }
          }
        }

        if (activePageIndex === -1) return;

        const editor = pageRefs.current[activePageIndex]?.getEditor();
        if (!editor) return;

        const selection = editor.getSelection();
        if (!selection) return;

        if (event.key === 'Enter') {
          const textLength = editor.getLength();
          const atEnd = selection.index >= textLength - 1;
          
          console.log(`Enter key - Page ${activePageIndex + 1}, at end: ${atEnd}, cursor: ${selection.index}/${textLength}`);
          
          if (atEnd && activePageIndex < pages.length - 1) {
            event.preventDefault();
            setTimeout(() => {
              const nextPageRef = pageRefs.current[activePageIndex + 1];
              if (nextPageRef) {
                const nextEditor = nextPageRef.getEditor();
                if (nextEditor) {
                  nextEditor.focus();
                  nextEditor.setSelection(0, 0);
                  console.log(`Navigated to page ${activePageIndex + 2}, cursor at start`);
                  
                  // Ensure the editor is properly focused
                  setTimeout(() => {
                    nextEditor.blur();
                    nextEditor.focus();
                  }, 10);
                }
              }
            }, 50);
          }
        } else if (event.key === 'Backspace') {
          const atStart = selection.index === 0 && selection.length === 0;
          
          console.log(`Backspace key - Page ${activePageIndex + 1}, at start: ${atStart}, cursor: ${selection.index}`);
          
          if (atStart && activePageIndex > 0) {
            event.preventDefault();
            
            // Always navigate to previous page and place cursor at the end
            setTimeout(() => {
              const prevPageRef = pageRefs.current[activePageIndex - 1];
              if (prevPageRef) {
                const prevEditor = prevPageRef.getEditor();
                if (prevEditor) {
                  const prevLength = prevEditor.getLength();
                  prevEditor.focus();
                  prevEditor.setSelection(Math.max(0, prevLength - 1), 0);
                  console.log(`Navigated to page ${activePageIndex} with cursor at end`);
                }
              }
            }, 50);
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [pages.length]);

  return (
    <div ref={containerRef} className="rich-text-editor-container">
      <style>
        {`
        .rich-text-editor-container {
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 20px;
          background: #f5f5f5;
          overflow-y: auto;
        }

        .multi-page-editor {
          display: flex;
          flex-direction: column;
          gap: 30px;
          width: 100%;
          max-width: 8.5in;
          margin: 0 auto;
        }

        .single-document-page {
          position: relative;
          width: 8.5in;
          min-height: 11in;
          background: white;
          box-shadow: 0 4px 8px rgba(0,0,0,0.1);
          border-radius: 8px;
          overflow: hidden;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
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
          min-height: 950px !important;
          max-height: 950px !important;
          overflow: hidden !important;
        }

        .single-document-page .ql-editor:focus {
          outline: none !important;
        }

        .page-number {
          position: absolute;
          bottom: 20px;
          right: 30px;
          font-size: 12px;
          color: #666;
          font-family: 'Times New Roman', serif;
          background: rgba(255,255,255,0.9);
          padding: 4px 8px;
          border-radius: 4px;
          border: 1px solid #ddd;
        }

        .ql-container {
          border: none !important;
          font-family: 'Times New Roman', serif !important;
          font-size: 14pt !important;
          display: flex;
          flex-direction: column;
          height: 1000px;
          overflow: hidden;
        }

        .ql-editor {
          border: none !important;
          padding: 72px !important;
          line-height: 2.0 !important;
          font-family: 'Times New Roman', serif !important;
          font-size: 14pt !important;
          height: 950px !important;
          overflow: hidden !important;
          box-sizing: border-box !important;
        }

        .ql-editor p {
          margin: 0 0 14pt 0 !important;
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
              modules={modules}
              formats={formats}
              readOnly={readOnly}
              placeholder={index === 0 ? placeholder : "Continue writing..."}
              theme="snow"
            />
            
            <div className="page-number">
              {index + 1}
            </div>
            
            {index === pages.length - 1 && (
              <button
                onClick={() => {
                  console.log(`Adding new page after page ${index + 1}`);
                  setPages(prev => [...prev, '<p><br></p>']);
                  
                  // Focus the new page after creation
                  setTimeout(() => {
                    const newPageRef = pageRefs.current[index + 1];
                    if (newPageRef) {
                      const newEditor = newPageRef.getEditor();
                      if (newEditor) {
                        newEditor.focus();
                        newEditor.setSelection(0, 0);
                        console.log(`Focused new page ${index + 2}`);
                      }
                    }
                  }, 100);
                }}
                style={{
                  position: 'absolute',
                  bottom: '20px',
                  right: '20px',
                  backgroundColor: '#0066cc',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '8px 16px',
                  fontSize: '12px',
                  cursor: 'pointer',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = '#0052a3';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = '#0066cc';
                }}
              >
                + Add Page
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
});

RichTextEditor.displayName = 'RichTextEditor';

export default RichTextEditor;