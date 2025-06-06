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

  // Helper function to determine which page an editor belongs to
  const getCurrentPageIndex = useCallback((editor: any) => {
    for (let i = 0; i < pageRefs.current.length; i++) {
      if (pageRefs.current[i]?.getEditor() === editor) {
        return i;
      }
    }
    return -1;
  }, []);

  // Custom toolbar configuration with keyboard bindings
  const modules = {
    toolbar: false, // We'll use custom formatting buttons
    clipboard: {
      matchVisual: true,
      matchers: [
        // Preserve HTML formatting when pasting
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
        // Manual page break with Ctrl+Enter
        'page-break': {
          key: 'Enter',
          ctrlKey: true,
          handler: (range: any, context: any) => {
            console.log('Manual page break triggered with Ctrl+Enter');
            
            // Find the currently focused page by checking selection
            let currentPageIndex = -1;
            for (let i = 0; i < pageRefs.current.length; i++) {
              const pageRef = pageRefs.current[i];
              if (pageRef) {
                const editor = pageRef.getEditor();
                const selection = editor.getSelection();
                if (selection && selection.index === range.index) {
                  currentPageIndex = i;
                  break;
                }
              }
            }
            
            if (currentPageIndex !== -1) {
              console.log(`Creating page break from page ${currentPageIndex + 1}`);
              
              // Create next page if needed
              if (currentPageIndex >= pages.length - 1) {
                setPages(prev => [...prev, '<p><br></p>']);
              }
              
              // Move to next page
              setTimeout(() => {
                const nextPageRef = pageRefs.current[currentPageIndex + 1];
                if (nextPageRef) {
                  const nextEditor = nextPageRef.getEditor();
                  if (nextEditor) {
                    nextEditor.focus();
                    nextEditor.setSelection(0, 0);
                    console.log(`Moved to page ${currentPageIndex + 2}`);
                  }
                }
              }, 100);
              
              return false; // Prevent default
            }
            
            return true;
          }
        },
        // Backspace navigation between pages
        'page-back': {
          key: 'Backspace',
          handler: (range: any, context: any) => {
            // Only trigger at very beginning of page
            if (range.index === 0) {
              let currentPageIndex = -1;
              for (let i = 0; i < pageRefs.current.length; i++) {
                const pageRef = pageRefs.current[i];
                if (pageRef) {
                  const editor = pageRef.getEditor();
                  const selection = editor.getSelection();
                  if (selection && selection.index === range.index) {
                    currentPageIndex = i;
                    break;
                  }
                }
              }
              
              if (currentPageIndex > 0) {
                console.log(`Moving back from page ${currentPageIndex + 1} to page ${currentPageIndex}`);
                
                const prevPageRef = pageRefs.current[currentPageIndex - 1];
                if (prevPageRef) {
                  const prevEditor = prevPageRef.getEditor();
                  if (prevEditor) {
                    const prevLength = prevEditor.getLength();
                    prevEditor.focus();
                    prevEditor.setSelection(Math.max(0, prevLength - 1), 0);
                    return false; // Prevent default
                  }
                }
              }
            }
            
            return true; // Allow normal backspace
          }
        },
        'tab': false // Disable tab handling
      }
    }
  };

  const formats = [
    'bold', 'italic', 'underline', 'strike',
    'list', 'bullet', 'indent',
    'link', 'color', 'background'
  ];

  // Advanced page navigation with Enter key detection
  const handleContentFlow = useCallback((pageIndex: number, content: string) => {
    const pageRef = pageRefs.current[pageIndex];
    if (!pageRef) return;
    
    const editor = pageRef.getEditor();
    const editorElement = editor.root;
    const contentHeight = editorElement.scrollHeight;
    const selection = editor.getSelection();
    
    console.log(`Page ${pageIndex + 1} height: ${contentHeight}px (limit: 950px), cursor: ${selection?.index}`);
    
    // Check if we're at the end of content and page is full
    if (selection && contentHeight > 950) {
      const textLength = editor.getLength();
      const atEnd = selection.index >= textLength - 1;
      
      console.log(`Page overflow check: at end ${atEnd}, height ${contentHeight}px`);
      
      if (atEnd) {
        console.log(`Auto page break triggered - moving to next page`);
        
        // Create next page if needed
        if (pageIndex >= pages.length - 1) {
          setPages(prev => [...prev, '<p><br></p>']);
        }
        
        // Move cursor to next page
        setTimeout(() => {
          const nextPageRef = pageRefs.current[pageIndex + 1];
          if (nextPageRef) {
            const nextEditor = nextPageRef.getEditor();
            if (nextEditor) {
              nextEditor.focus();
              nextEditor.setSelection(0, 0);
              console.log(`Successfully moved to page ${pageIndex + 2}`);
            }
          }
        }, 100);
      }
    }
    
    // Also create page for normal overflow without cursor at end
    else if (contentHeight > 950 && pageIndex === pages.length - 1) {
      console.log(`Creating overflow page for content continuation`);
      setPages(prev => [...prev, '<p><br></p>']);
    }
  }, [pages.length]);

  // Simple content redistribution - only when significant deletion occurs
  const redistributeContentOnDelete = useCallback((pageIndex: number) => {
    if (pageIndex === 0 || pageIndex >= pages.length - 1) return;
    
    const currentRef = pageRefs.current[pageIndex];
    const nextRef = pageRefs.current[pageIndex + 1];
    
    if (!currentRef || !nextRef) return;
    
    const currentText = currentRef.getEditor().getText().trim();
    const nextText = nextRef.getEditor().getText().trim();
    
    // Only redistribute if current page is mostly empty (less than 30 words)
    if (currentText.split(/\s+/).length < 30 && nextText) {
      console.log(`Redistributing content from page ${pageIndex + 2} back to page ${pageIndex + 1}`);
      
      // Combine content and check if it fits
      const combinedText = currentText + ' ' + nextText;
      const combinedHTML = `<p>${combinedText}</p>`;
      
      // Simple check - if combined text is reasonable length, merge pages
      if (combinedText.split(/\s+/).length < 250) {
        setPages(prev => {
          const newPages = [...prev];
          newPages[pageIndex] = combinedHTML;
          newPages.splice(pageIndex + 1, 1); // Remove next page
          return newPages;
        });
      }
    }
  }, [pages.length]);

  // Debounced overflow check
  const overflowCheckTimeout = useRef<NodeJS.Timeout | null>(null);

  const createHandleChange = (pageIndex: number) => (value: string, delta: any, source: any, editor: any) => {
    if (pages[pageIndex] === value) return;
    
    if (source !== 'user') {
      console.log(`Ignoring non-user change on page ${pageIndex + 1}, source: ${source}`);
      return;
    }
    
    // Combine all current pages and the new content
    const allContent = [...pages];
    allContent[pageIndex] = value;
    const combinedContent = allContent.join('');
    
    // Clear existing timeout
    if (overflowCheckTimeout.current) {
      clearTimeout(overflowCheckTimeout.current);
    }
    
    // Update the current page immediately for responsive typing
    const newPages = [...pages];
    newPages[pageIndex] = value;
    setPages(newPages);
    onContentChange(combinedContent);
    
    // Check for overflow and move content to next page
    if (pageIndex === pages.length - 1) {
      overflowCheckTimeout.current = setTimeout(() => {
        const pageRef = pageRefs.current[pageIndex];
        if (pageRef) {
          const editorElement = pageRef.getEditor().root;
          const contentHeight = editorElement.scrollHeight;
          
          console.log(`Page ${pageIndex + 1} height: ${contentHeight}px`);
          
          if (contentHeight > 950) {
            const pageContent = pages[pageIndex];
            
            // Create temporary element to measure content
            const tempDiv = document.createElement('div');
            tempDiv.style.cssText = `
              position: absolute;
              visibility: hidden;
              width: calc(8.5in - 144px);
              font-family: 'Times New Roman', serif;
              font-size: 14pt;
              line-height: 2.0;
              padding: 72px;
              top: -9999px;
            `;
            document.body.appendChild(tempDiv);
            
            try {
              // Split content by paragraphs
              tempDiv.innerHTML = pageContent;
              const paragraphs = Array.from(tempDiv.querySelectorAll('p'));
              
              if (paragraphs.length > 1) {
                // Find split point where content fits on first page
                let splitIndex = Math.floor(paragraphs.length * 0.7);
                let testContent = paragraphs.slice(0, splitIndex).map(p => p.outerHTML).join('');
                
                tempDiv.innerHTML = testContent;
                
                // Adjust split point if still too tall
                while (tempDiv.scrollHeight > 950 && splitIndex > 1) {
                  splitIndex--;
                  testContent = paragraphs.slice(0, splitIndex).map(p => p.outerHTML).join('');
                  tempDiv.innerHTML = testContent;
                }
                
                const firstPageContent = testContent;
                const secondPageContent = paragraphs.slice(splitIndex).map(p => p.outerHTML).join('');
                
                console.log(`Moving content: ${paragraphs.length} paragraphs -> ${splitIndex} | ${paragraphs.length - splitIndex}`);
                
                // Update pages with split content
                setPages(prev => {
                  const newPages = [...prev];
                  newPages[pageIndex] = firstPageContent || '<p><br></p>';
                  
                  if (newPages.length === pageIndex + 1) {
                    newPages.push(secondPageContent || '<p><br></p>');
                  } else {
                    newPages[pageIndex + 1] = secondPageContent || '<p><br></p>';
                  }
                  
                  return newPages;
                });
              } else if (pages.length === 1) {
                // Just add empty second page for single paragraph
                console.log('Adding empty second page for continued typing');
                setPages(prev => [...prev, '<p><br></p>']);
              }
            } finally {
              document.body.removeChild(tempDiv);
            }
          }
        }
      }, 1200);
    }
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

  // Smart page splitting for restored content
  const splitContentIntoPages = useCallback((fullContent: string): string[] => {
    if (!fullContent || fullContent.trim() === '') {
      return [''];
    }

    console.log('Splitting content into pages:', fullContent.length, 'characters');
    
    // Create measurement container
    const tempContainer = document.createElement('div');
    tempContainer.style.cssText = `
      position: absolute;
      left: -9999px;
      width: calc(8.5in - 144px);
      font-family: 'Times New Roman', serif;
      font-size: 14pt;
      line-height: 2.0;
      padding: 72px;
      box-sizing: border-box;
      height: auto;
      visibility: hidden;
    `;
    document.body.appendChild(tempContainer);

    const maxPageHeight = 950;
    const pages: string[] = [];
    
    try {
      tempContainer.innerHTML = fullContent;
      const totalHeight = tempContainer.scrollHeight;
      
      console.log('Total content height:', totalHeight, 'px');
      
      if (totalHeight <= maxPageHeight) {
        pages.push(fullContent);
      } else {
        // Split content by HTML paragraphs to maintain boundaries
        const paragraphs = fullContent.split('</p>').filter(p => p.trim());
        let currentPageHTML = '';
        
        for (let i = 0; i < paragraphs.length; i++) {
          const testHTML = currentPageHTML + (currentPageHTML ? '</p>' : '') + paragraphs[i] + '</p>';
          
          tempContainer.innerHTML = testHTML;
          const testHeight = tempContainer.scrollHeight;
          
          if (testHeight <= maxPageHeight) {
            currentPageHTML = testHTML;
          } else {
            // Current paragraph causes overflow, save current page and start new one
            if (currentPageHTML) {
              pages.push(currentPageHTML);
            }
            currentPageHTML = paragraphs[i] + '</p>';
          }
        }
        
        // Add remaining content as last page
        if (currentPageHTML) {
          pages.push(currentPageHTML);
        }
      }
    } catch (error) {
      console.error('Error splitting content:', error);
      pages.push(fullContent);
    } finally {
      document.body.removeChild(tempContainer);
    }
    
    console.log('Content split into', pages.length, 'pages');
    return pages.length > 0 ? pages : [''];
  }, []);

  // Track if we're in the middle of user navigation to prevent resets
  const [isNavigating, setIsNavigating] = useState(false);
  
  // Initialize pages when content is loaded - preserve existing page structure
  useEffect(() => {
    if (content && content !== pages.join('') && !isNavigating) {
      console.log('External content change detected, syncing with editor:', content.length, 'chars');
      
      // Only reset pages on initial load or when starting completely fresh
      if (pages.length === 0 || (pages.length === 1 && (!pages[0] || pages[0] === '<p><br></p>'))) {
        setPages([content || '<p><br></p>']);
      } else {
        // Keep existing page structure - user has multiple pages
        console.log('Preserving existing page structure with', pages.length, 'pages');
      }
    }
  }, [content, isNavigating]);

  // Initialize page refs array - ensure refs exist for all pages
  useEffect(() => {
    // Extend refs array if we have more pages than refs
    while (pageRefs.current.length < pages.length) {
      pageRefs.current.push(null);
    }
    // Trim refs array if we have fewer pages
    pageRefs.current = pageRefs.current.slice(0, pages.length);
    
    console.log(`Page refs updated: ${pageRefs.current.length} refs for ${pages.length} pages`);
  }, [pages.length]);



  // Simple page management - no automatic consolidation
  const ensureMinimumPages = useCallback(() => {
    if (pages.length === 0) {
      setPages(['<p><br></p>']);
    }
  }, [pages]);



  // Handle page navigation with content management
  const handlePageNavigation = (currentPageIndex: number, direction: 'next' | 'prev', isOverflow: boolean) => {
    console.log(`Navigation requested: ${direction} from page ${currentPageIndex + 1}, overflow: ${isOverflow}`);
    setIsNavigating(true);
    
    if (direction === 'next') {
      const currentPageRef = pageRefs.current[currentPageIndex];
      if (!currentPageRef) {
        console.log(`No ref found for current page ${currentPageIndex + 1}`);
        setIsNavigating(false);
        return;
      }
      
      const currentEditor = currentPageRef.getEditor();
      
      if (isOverflow) {
        // Remove the overflow content from current page
        const currentContent = currentEditor.root.innerHTML;
        const lastBreakIndex = currentContent.lastIndexOf('<p><br></p>');
        if (lastBreakIndex > -1) {
          const trimmedContent = currentContent.substring(0, lastBreakIndex);
          currentEditor.root.innerHTML = trimmedContent || '<p><br></p>';
        }
      }
      
      // Ensure next page exists
      if (currentPageIndex >= pages.length - 1) {
        console.log(`Creating new page ${currentPageIndex + 2}`);
        setPages(prev => [...prev, '<p><br></p>']);
        
        // Wait for page creation and ref initialization
        setTimeout(() => {
          console.log(`Attempting to focus page ${currentPageIndex + 2} after creation`);
          const nextPageRef = pageRefs.current[currentPageIndex + 1];
          if (nextPageRef) {
            const nextEditor = nextPageRef.getEditor();
            if (nextEditor) {
              // Force focus on the editor container first
              nextEditor.root.focus();
              
              // Set selection with a slight delay to ensure focus is established
              setTimeout(() => {
                nextEditor.setSelection(0, 0);
                // Ensure cursor is visible
                nextEditor.blur();
                nextEditor.focus();
                console.log(`Successfully focused page ${currentPageIndex + 2}`);
              }, 50);
            }
          } else {
            console.log(`Failed to find ref for new page ${currentPageIndex + 2}`);
          }
          setIsNavigating(false);
        }, 300);
      } else {
        // Focus existing next page
        setTimeout(() => {
          console.log(`Focusing existing page ${currentPageIndex + 2}`);
          const nextPageRef = pageRefs.current[currentPageIndex + 1];
          if (nextPageRef) {
            const nextEditor = nextPageRef.getEditor();
            if (nextEditor) {
              if (isOverflow) {
                const existingContent = nextEditor.root.innerHTML;
                if (existingContent === '<p><br></p>') {
                  nextEditor.root.innerHTML = '<p><br></p>';
                }
              }
              
              // Ensure proper focus and cursor visibility
              nextEditor.root.focus();
              setTimeout(() => {
                nextEditor.setSelection(0, 0);
                nextEditor.blur();
                nextEditor.focus();
                console.log(`Successfully focused existing page ${currentPageIndex + 2}`);
              }, 50);
            }
          } else {
            console.log(`Failed to find ref for existing page ${currentPageIndex + 2}`);
          }
          setIsNavigating(false);
        }, 100);
      }
    }
    
    else if (direction === 'prev') {
      const prevPageRef = pageRefs.current[currentPageIndex - 1];
      if (prevPageRef) {
        console.log(`Moving back to page ${currentPageIndex}`);
        const prevEditor = prevPageRef.getEditor();
        if (prevEditor) {
          const prevLength = prevEditor.getLength();
          
          // Ensure proper focus and cursor positioning
          prevEditor.root.focus();
          setTimeout(() => {
            prevEditor.setSelection(Math.max(0, prevLength - 1), 0);
            prevEditor.blur();
            prevEditor.focus();
            console.log(`Successfully moved back to page ${currentPageIndex}`);
          }, 50);
        }
      }
      
      setTimeout(() => setIsNavigating(false), 300);
    }
  };

  // Handle automatic content overflow
  const handleContentOverflow = (pageIndex: number) => {
    const pageRef = pageRefs.current[pageIndex];
    if (!pageRef) return;
    
    const editor = pageRef.getEditor();
    const content = editor.root.innerHTML;
    
    // Split content by paragraphs
    const paragraphs = content.split('</p>').filter(p => p.trim()).map(p => p + '</p>');
    
    if (paragraphs.length > 1) {
      // Keep 70% of content on current page
      const splitPoint = Math.floor(paragraphs.length * 0.7);
      const currentPageContent = paragraphs.slice(0, splitPoint).join('');
      const nextPageContent = paragraphs.slice(splitPoint).join('');
      
      // Update current page
      editor.root.innerHTML = currentPageContent || '<p><br></p>';
      
      // Create or update next page
      if (pageIndex >= pages.length - 1) {
        setPages(prev => [...prev, nextPageContent]);
      } else {
        setPages(prev => {
          const newPages = [...prev];
          newPages[pageIndex + 1] = nextPageContent + (newPages[pageIndex + 1] === '<p><br></p>' ? '' : newPages[pageIndex + 1]);
          return newPages;
        });
      }
      
      console.log(`Content overflow: split ${paragraphs.length} paragraphs at ${splitPoint}`);
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
            
            {index === 0 && (
              <div className="page-break-hint" style={{
                position: 'absolute',
                top: '10px',
                right: '80px',
                fontSize: '11px',
                color: '#666',
                backgroundColor: 'rgba(255,255,255,0.9)',
                padding: '4px 8px',
                borderRadius: '4px',
                border: '1px solid #ddd'
              }}>
                Press Ctrl+Enter for page break
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
});

RichTextEditor.displayName = 'RichTextEditor';

export default RichTextEditor;