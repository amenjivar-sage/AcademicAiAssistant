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
  };

  const formats = [
    'bold', 'italic', 'underline', 'strike',
    'list', 'bullet', 'indent',
    'link', 'color', 'background'
  ];

  // Simple overflow detection - just create new page without moving content
  const handleContentFlow = useCallback((pageIndex: number) => {
    const pageRef = pageRefs.current[pageIndex];
    if (!pageRef || pageIndex !== pages.length - 1) return;
    
    const editorElement = pageRef.getEditor().root;
    const contentHeight = editorElement.scrollHeight;
    
    console.log(`Page ${pageIndex + 1} height: ${contentHeight}px (limit: 950px)`);
    
    if (contentHeight > 950 && pages.length === 1) {
      console.log(`Creating new page due to overflow on page ${pageIndex + 1}`);
      
      // Simply add a new empty page for continued typing
      setPages(prev => [...prev, '']);
      console.log(`Total pages after creating new page: ${pages.length + 1}`);
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

  // Initialize pages when content is loaded
  useEffect(() => {
    if (content && content !== pages.join('')) {
      console.log('External content change detected, syncing with editor:', content.length, 'chars');
      
      // For now, put all content in first page and let overflow detection handle pagination
      setPages([content]);
      
      // Check for overflow and redistribute existing content
      setTimeout(() => {
        const pageRef = pageRefs.current[0];
        if (pageRef) {
          const editorElement = pageRef.getEditor().root;
          const contentHeight = editorElement.scrollHeight;
          
          console.log(`Initial content height: ${contentHeight}px`);
          
          if (contentHeight > 950 && pages.length === 1) {
            console.log(`Redistributing existing content (${contentHeight}px > 950px)`);
            
            const pageContent = pages[0];
            if (pageContent && pageContent.trim()) {
              // Use same logic as real-time overflow detection
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
                tempDiv.innerHTML = pageContent;
                const paragraphs = Array.from(tempDiv.querySelectorAll('p'));
                
                if (paragraphs.length > 1) {
                  let splitIndex = Math.floor(paragraphs.length * 0.7);
                  let testContent = paragraphs.slice(0, splitIndex).map(p => p.outerHTML).join('');
                  
                  tempDiv.innerHTML = testContent;
                  
                  while (tempDiv.scrollHeight > 950 && splitIndex > 1) {
                    splitIndex--;
                    testContent = paragraphs.slice(0, splitIndex).map(p => p.outerHTML).join('');
                    tempDiv.innerHTML = testContent;
                  }
                  
                  const firstPageContent = testContent;
                  const secondPageContent = paragraphs.slice(splitIndex).map(p => p.outerHTML).join('');
                  
                  console.log(`Initial split: ${paragraphs.length} paragraphs -> ${splitIndex} | ${paragraphs.length - splitIndex}`);
                  
                  setPages([
                    firstPageContent || '<p><br></p>',
                    secondPageContent || '<p><br></p>'
                  ]);
                }
              } finally {
                document.body.removeChild(tempDiv);
              }
            }
          }
        }
      }, 800);
    }
  }, [content]);

  // Initialize page refs array
  useEffect(() => {
    pageRefs.current = pageRefs.current.slice(0, pages.length);
  }, [pages.length]);



  // Clean up empty pages and consolidate content
  const consolidatePages = useCallback(() => {
    const newPages: string[] = [];
    let combinedContent = '';
    
    for (let i = 0; i < pages.length; i++) {
      const pageContent = pages[i];
      if (pageContent && pageContent.trim()) {
        const cleanContent = pageContent.replace(/^<p>|<\/p>$/g, '').trim();
        if (cleanContent) {
          combinedContent += (combinedContent ? ' ' : '') + cleanContent;
        }
      }
    }
    
    if (!combinedContent) {
      setPages(['']);
      return;
    }
    
    newPages.push(`<p>${combinedContent}</p>`);
    setPages(newPages);
  }, [pages]);

  // Handle keyboard events for pagination
  const handleKeyDown = (e: React.KeyboardEvent, pageIndex: number) => {
    if (e.key === 'Backspace' || e.key === 'Delete') {
      // Only trigger redistribution after significant deletion
      setTimeout(() => {
        redistributeContentOnDelete(pageIndex);
      }, 500);
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
              onKeyDown={(e) => handleKeyDown(e, index)}
              modules={modules}
              formats={formats}
              readOnly={readOnly}
              placeholder={index === 0 ? placeholder : "Continue writing..."}
              theme="snow"
            />
            
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