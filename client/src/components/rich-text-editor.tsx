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
    clipboard: {
      matchVisual: true,
      matchers: [
        ['STRONG', 'bold'],
        ['EM', 'italic'],
        ['U', 'underline']
      ]
    },
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

  // Enhanced content overflow detection with automatic content splitting
  const handleContentFlow = useCallback((pageIndex: number, content: string) => {
    const pageRef = pageRefs.current[pageIndex];
    if (!pageRef) return;
    
    const editor = pageRef.getEditor();
    const editorElement = editor.root;
    const contentHeight = editorElement.scrollHeight;
    const selection = editor.getSelection();
    
    console.log(`Page ${pageIndex + 1} height: ${contentHeight}px (limit: 950px), cursor: ${selection?.index}`);
    
    // If page is overflowing, handle content splitting
    if (contentHeight > 950) {
      console.log(`Page ${pageIndex + 1} is overflowing, splitting content...`);
      
      // Get the HTML content and split it by paragraphs
      const htmlContent = editor.root.innerHTML;
      const paragraphs = htmlContent.split('</p>').filter(p => p.trim()).map(p => p + '</p>');
      
      if (paragraphs.length > 1) {
        // Create a temporary element to measure content
        const tempDiv = document.createElement('div');
        tempDiv.style.cssText = `
          position: absolute;
          visibility: hidden;
          width: calc(8.5in - 144px);
          font-family: 'Times New Roman', serif;
          font-size: 14pt;
          line-height: 2.0;
          padding: 72px;
          box-sizing: border-box;
          top: -9999px;
        `;
        document.body.appendChild(tempDiv);
        
        try {
          // Find the split point where content fits on the page
          let splitIndex = Math.floor(paragraphs.length * 0.8);
          let firstPageContent = paragraphs.slice(0, splitIndex).join('');
          
          tempDiv.innerHTML = firstPageContent;
          
          // Adjust split point if still too tall
          while (tempDiv.scrollHeight > 950 && splitIndex > 1) {
            splitIndex--;
            firstPageContent = paragraphs.slice(0, splitIndex).join('');
            tempDiv.innerHTML = firstPageContent;
          }
          
          const overflowContent = paragraphs.slice(splitIndex).join('');
          
          if (overflowContent && splitIndex < paragraphs.length) {
            console.log(`Moving ${paragraphs.length - splitIndex} paragraphs to next page`);
            
            // Update current page with trimmed content
            setPages(prev => {
              const newPages = [...prev];
              newPages[pageIndex] = firstPageContent || '<p><br></p>';
              
              // Create or update next page with overflow content
              if (pageIndex >= newPages.length - 1) {
                newPages.push(overflowContent);
              } else {
                // Prepend overflow to existing next page content
                const existingNext = newPages[pageIndex + 1];
                if (existingNext === '<p><br></p>' || !existingNext.trim()) {
                  newPages[pageIndex + 1] = overflowContent;
                } else {
                  newPages[pageIndex + 1] = overflowContent + existingNext;
                }
              }
              
              return newPages;
            });
            
            // Move cursor to next page if user was at the end
            if (selection) {
              const textLength = editor.getLength();
              const atEnd = selection.index >= textLength - 1;
              
              if (atEnd) {
                setTimeout(() => {
                  const nextPageRef = pageRefs.current[pageIndex + 1];
                  if (nextPageRef) {
                    const nextEditor = nextPageRef.getEditor();
                    if (nextEditor) {
                      nextEditor.focus();
                      nextEditor.setSelection(0, 0);
                      console.log(`Moved cursor to page ${pageIndex + 2}`);
                    }
                  }
                }, 200);
              }
            }
          }
        } finally {
          document.body.removeChild(tempDiv);
        }
      }
    }
  }, []);

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
    
    // Check for overflow and move content to next page
    overflowCheckTimeout.current = setTimeout(() => {
      handleContentFlow(pageIndex, value);
    }, 500);
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
            
            // Get current page content
            const currentPageContent = pages[activePageIndex];
            const prevPageContent = pages[activePageIndex - 1];
            
            // Merge current page content with previous page
            const mergedContent = prevPageContent + currentPageContent;
            
            // Update pages state - merge content and remove current empty page
            setPages(prev => {
              const newPages = [...prev];
              newPages[activePageIndex - 1] = mergedContent;
              newPages.splice(activePageIndex, 1); // Remove current page
              
              // Update parent with combined content
              const combinedContent = newPages.join('');
              onContentChange(combinedContent);
              
              return newPages;
            });
            
            setTimeout(() => {
              const prevPageRef = pageRefs.current[activePageIndex - 1];
              if (prevPageRef) {
                const prevEditor = prevPageRef.getEditor();
                if (prevEditor) {
                  // Set the merged content
                  prevEditor.root.innerHTML = mergedContent;
                  
                  // Calculate cursor position - place it where the previous page ended
                  const tempDiv = document.createElement('div');
                  tempDiv.innerHTML = prevPageContent;
                  const prevContentLength = tempDiv.textContent?.length || 0;
                  
                  prevEditor.focus();
                  prevEditor.setSelection(prevContentLength, 0);
                  console.log(`Merged content and moved to page ${activePageIndex}, cursor at position ${prevContentLength}`);
                  
                  // Check if merged content overflows and needs to be split again
                  setTimeout(() => {
                    handleContentFlow(activePageIndex - 1, mergedContent);
                  }, 100);
                }
              }
            }, 100);
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
          height: 950px !important;
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