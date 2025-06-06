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

  // Simplified DOM-based pagination with reliable page creation
  const checkAndHandleOverflow = useCallback((pageIndex: number, currentPages: string[]) => {
    const currentRef = pageRefs.current[pageIndex];
    if (!currentRef) return;

    const editorElement = currentRef.getEditor().root;
    const scrollHeight = editorElement.scrollHeight;
    const maxHeight = 950;

    console.log(`Page ${pageIndex + 1} height: ${scrollHeight}px`);

    if (scrollHeight > maxHeight) {
      console.log(`Creating new page - overflow detected`);
      
      const quillEditor = currentRef.getEditor();
      const fullText = quillEditor.getText().trim();
      
      if (!fullText) return;

      // Create measurement container for accurate text height calculation
      const measureContainer = document.createElement('div');
      measureContainer.style.cssText = `
        position: absolute;
        left: -9999px;
        width: calc(8.5in - 144px);
        font-family: 'Times New Roman', serif;
        font-size: 14pt;
        line-height: 2.0;
        padding: 72px;
        box-sizing: border-box;
        visibility: hidden;
      `;
      document.body.appendChild(measureContainer);

      // Split text by words for precise fitting
      const words = fullText.split(/\s+/);
      let maxWords = Math.floor(words.length * 0.7); // Start with conservative estimate
      
      // Binary search to find optimal split point
      let low = 0;
      let high = words.length - 1;
      
      while (low < high) {
        const mid = Math.floor((low + high + 1) / 2);
        const testText = words.slice(0, mid).join(' ');
        
        measureContainer.innerHTML = `<p>${testText}</p>`;
        const testHeight = measureContainer.scrollHeight;
        
        if (testHeight <= maxHeight) {
          low = mid;
          maxWords = mid;
        } else {
          high = mid - 1;
        }
      }
      
      document.body.removeChild(measureContainer);
      
      if (maxWords > 0 && maxWords < words.length) {
        // Split content at word boundary
        const firstPageText = words.slice(0, maxWords).join(' ');
        const remainingText = words.slice(maxWords).join(' ');
        
        const firstPageHTML = `<p>${firstPageText}</p>`;
        const remainingHTML = `<p>${remainingText}</p>`;
        
        console.log(`Splitting at word ${maxWords}: "${firstPageText.substring(0, 50)}..." -> "${remainingText.substring(0, 50)}..."`);
        
        // Update pages
        const updatedPages = [...currentPages];
        updatedPages[pageIndex] = firstPageHTML;
        
        if (pageIndex + 1 < updatedPages.length) {
          // Merge with existing next page
          updatedPages[pageIndex + 1] = remainingHTML + (updatedPages[pageIndex + 1] !== '<p><br></p>' ? updatedPages[pageIndex + 1] : '');
        } else {
          // Create new page
          updatedPages.push(remainingHTML);
        }
        
        setPages(updatedPages);
        
        // Move cursor to appropriate page
        setTimeout(() => {
          const selection = quillEditor.getSelection();
          const cursorPos = selection ? selection.index : 0;
          
          if (cursorPos > firstPageText.length && pageIndex + 1 < updatedPages.length) {
            const nextRef = pageRefs.current[pageIndex + 1];
            if (nextRef) {
              const newPos = Math.max(0, cursorPos - firstPageText.length);
              nextRef.getEditor().setSelection(newPos, 0);
              nextRef.focus();
            }
          }
          
          // Check for further overflow on next page
          if (pageIndex + 1 < updatedPages.length) {
            setTimeout(() => checkAndHandleOverflow(pageIndex + 1, updatedPages), 100);
          }
        }, 50);
      }
    }
  }, []);

  // Aggressive content redistribution for filling gaps and backspace operations
  const redistributeContentOnDelete = useCallback((pageIndex: number, currentPages: string[]) => {
    console.log(`Checking redistribution for page ${pageIndex + 1}`);
    
    // Always try to fill gaps from later pages, regardless of current page content
    const currentRef = pageRefs.current[pageIndex];
    if (!currentRef) return;
    
    const currentHTML = currentRef.getEditor().root.innerHTML;
    const currentHeight = currentRef.getEditor().root.scrollHeight;
    const maxHeight = 950;
    const availableSpace = maxHeight - currentHeight;
    
    console.log(`Page ${pageIndex + 1} has ${availableSpace}px available space`);
    
    // If current page has space and there are following pages, try to pull content back
    if (availableSpace > 50 && pageIndex + 1 < currentPages.length) {
      const nextRef = pageRefs.current[pageIndex + 1];
      if (!nextRef) return;
      
      const nextHTML = nextRef.getEditor().root.innerHTML;
      const nextText = nextHTML.replace(/<[^>]*>/g, '').trim();
      
      if (!nextText) {
        // Next page is empty, remove it
        console.log(`Removing empty page ${pageIndex + 2}`);
        const updatedPages = [...currentPages];
        updatedPages.splice(pageIndex + 1, 1);
        setPages(updatedPages);
        return;
      }
      
      // Try to pull some content from next page
      const measurementDiv = document.createElement('div');
      measurementDiv.style.cssText = `
        position: absolute;
        left: -9999px;
        width: calc(8.5in - 144px);
        font-family: 'Times New Roman', serif;
        font-size: 14pt;
        line-height: 2.0;
        padding: 72px;
        box-sizing: border-box;
        visibility: hidden;
      `;
      document.body.appendChild(measurementDiv);
      
      // Try different amounts of content from next page
      const nextWords = nextText.split(/\s+/);
      let wordsToMove = 0;
      
      for (let i = 1; i <= nextWords.length; i++) {
        const wordsToTest = nextWords.slice(0, i).join(' ');
        const testHTML = currentHTML.replace('</p>', ` ${wordsToTest}</p>`);
        
        measurementDiv.innerHTML = testHTML;
        const testHeight = measurementDiv.scrollHeight;
        
        if (testHeight <= maxHeight) {
          wordsToMove = i;
        } else {
          break;
        }
      }
      
      document.body.removeChild(measurementDiv);
      
      if (wordsToMove > 0) {
        console.log(`Moving ${wordsToMove} words from page ${pageIndex + 2} to page ${pageIndex + 1}`);
        
        const wordsToMoveText = nextWords.slice(0, wordsToMove).join(' ');
        const remainingWords = nextWords.slice(wordsToMove).join(' ');
        
        // Update current page with additional content
        const updatedCurrentHTML = currentHTML.replace('</p>', ` ${wordsToMoveText}</p>`);
        
        // Update next page with remaining content
        const updatedNextHTML = remainingWords ? `<p>${remainingWords}</p>` : '<p><br></p>';
        
        const updatedPages = [...currentPages];
        updatedPages[pageIndex] = updatedCurrentHTML;
        updatedPages[pageIndex + 1] = updatedNextHTML;
        
        // If next page becomes empty, remove it
        if (!remainingWords.trim()) {
          updatedPages.splice(pageIndex + 1, 1);
        }
        
        setPages(updatedPages);
        
        // Continue redistributing from next page
        setTimeout(() => {
          if (pageIndex + 1 < updatedPages.length) {
            redistributeContentOnDelete(pageIndex + 1, updatedPages);
          }
        }, 50);
      }
    }
  }, []);

  // Debounced overflow check
  const overflowCheckTimeout = useRef<NodeJS.Timeout | null>(null);

  const createHandleChange = (pageIndex: number) => (value: string, delta: any, source: any, editor: any) => {
    if (pages[pageIndex] === value) return;
    
    if (source !== 'user') {
      console.log(`Ignoring non-user change on page ${pageIndex + 1}, source: ${source}`);
      return;
    }
    
    // Preserve current selection and formatting
    const currentRef = pageRefs.current[pageIndex];
    let currentSelection = null;
    let currentFormat = null;
    
    if (currentRef) {
      const quillEditor = currentRef.getEditor();
      currentSelection = quillEditor.getSelection();
      if (currentSelection) {
        currentFormat = quillEditor.getFormat(currentSelection);
      }
    }
    
    // Update page content
    const newPages = [...pages];
    newPages[pageIndex] = value;
    setPages(newPages);
    
    // Combine all pages for parent callback
    const combinedContent = newPages.join('');
    onContentChange(combinedContent);
    
    // Restore selection and formatting
    if (currentRef && currentSelection && currentFormat) {
      setTimeout(() => {
        try {
          const quillEditor = currentRef.getEditor();
          quillEditor.setSelection(currentSelection);
          Object.keys(currentFormat).forEach(format => {
            if (currentFormat[format]) {
              quillEditor.format(format, currentFormat[format]);
            }
          });
        } catch (e) {
          console.log('Could not restore selection/formatting:', e);
        }
      }, 0);
    }
    
    // Clear existing timeout
    if (overflowCheckTimeout.current) {
      clearTimeout(overflowCheckTimeout.current);
    }
    
    // Check overflow with delay to allow DOM update
    overflowCheckTimeout.current = setTimeout(() => {
      const currentRef = pageRefs.current[pageIndex];
      if (currentRef) {
        const editorElement = currentRef.getEditor().root;
        const scrollHeight = editorElement.scrollHeight;
        
        console.log(`Page ${pageIndex + 1} height after change: ${scrollHeight}px`);
        
        // Check for overflow - trigger when content exceeds page height
        if (scrollHeight > 950) {
          console.log(`FORCING page creation - height: ${scrollHeight}px`);
          
          // Force page creation by directly splitting content
          const currentContent = currentRef.getEditor().getText().trim();
          if (currentContent && newPages.length === pageIndex + 1) {
            // Only one page exists, force split
            const words = currentContent.split(/\s+/);
            const midPoint = Math.floor(words.length * 0.6); // Split at 60% to ensure first page fits
            
            const firstPageText = words.slice(0, midPoint).join(' ');
            const secondPageText = words.slice(midPoint).join(' ');
            
            console.log(`FORCE SPLITTING: ${words.length} words -> ${midPoint} + ${words.length - midPoint}`);
            
            const updatedPages = [...newPages];
            updatedPages[pageIndex] = `<p>${firstPageText}</p>`;
            updatedPages.push(`<p>${secondPageText}</p>`);
            
            setPages(updatedPages);
            
            // Move cursor to second page
            setTimeout(() => {
              const nextRef = pageRefs.current[pageIndex + 1];
              if (nextRef) {
                nextRef.focus();
                nextRef.getEditor().setSelection(0, 0);
              }
            }, 100);
          } else {
            checkAndHandleOverflow(pageIndex, newPages);
          }
        }
        
        setContentOverflow(scrollHeight > 950);
      }
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
      
      const newPages = splitContentIntoPages(content);
      setPages(newPages);
      
      // Update ReactQuill editors with new content
      setTimeout(() => {
        newPages.forEach((pageContent, index) => {
          const pageRef = pageRefs.current[index];
          if (pageRef) {
            const quillEditor = pageRef.getEditor();
            if (quillEditor) {
              quillEditor.root.innerHTML = pageContent;
              console.log(`Updated page ${index + 1} with ${pageContent.length} chars`);
            }
          }
        });
      }, 100);
    }
  }, [content, splitContentIntoPages]);

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

  // Handle keyboard events for pagination and redistribution
  const handleKeyDown = (e: React.KeyboardEvent, pageIndex: number) => {
    const currentRef = pageRefs.current[pageIndex];
    if (!currentRef) return;

    if (e.key === 'Enter') {
      console.log(`Enter key pressed on page ${pageIndex + 1}`);
      
      setTimeout(() => {
        checkAndHandleOverflow(pageIndex, pages);
      }, 100);
      
    } else if (e.key === 'Backspace' || e.key === 'Delete') {
      setTimeout(() => {
        // Check for content redistribution
        redistributeContentOnDelete(pageIndex, pages);
        
        // Check for empty pages to consolidate
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