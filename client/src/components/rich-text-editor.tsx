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

  // DOM-based height measurement with proper HTML boundary detection
  const checkAndHandleOverflow = useCallback((pageIndex: number, currentPages: string[]) => {
    const currentRef = pageRefs.current[pageIndex];
    if (!currentRef) {
      console.log(`No ref found for page ${pageIndex + 1}`);
      return;
    }

    const editorElement = currentRef.getEditor().root;
    const scrollHeight = editorElement.scrollHeight;
    const maxHeight = 950; // Exact page height limit
    const buffer = 3; // Minimal buffer to ensure pages are fully used

    console.log(`Checking overflow for page ${pageIndex + 1}: ${scrollHeight}px vs ${maxHeight}px`);

    // Only trigger overflow when truly necessary to maximize page usage
    if (scrollHeight > maxHeight + buffer) {
      console.log(`OVERFLOW DETECTED on page ${pageIndex + 1}: ${scrollHeight}px > ${maxHeight + buffer}px`);
      
      const quillEditor = currentRef.getEditor();
      const fullHTML = quillEditor.root.innerHTML;
      
      if (!fullHTML || fullHTML.trim() === '<p><br></p>') return;

      // Create exact replica of editor for measurement
      const measurementDiv = document.createElement('div');
      measurementDiv.style.cssText = `
        position: absolute;
        left: -9999px;
        top: -9999px;
        width: calc(8.5in - 144px);
        font-family: 'Times New Roman', serif;
        font-size: 14pt;
        line-height: 2.0;
        padding: 72px;
        box-sizing: border-box;
        height: auto;
        visibility: hidden;
        overflow: visible;
      `;
      document.body.appendChild(measurementDiv);

      // First try splitting by paragraphs for clean breaks
      const paragraphs = fullHTML.split('</p>').filter(p => p.trim());
      let bestBreakHTML = '';
      let remainingHTML = fullHTML;

      console.log(`Total paragraphs: ${paragraphs.length}`);

      // Test each complete paragraph to find maximum content that fits
      for (let i = 0; i < paragraphs.length; i++) {
        const testHTML = paragraphs.slice(0, i + 1).join('</p>') + '</p>';
        
        measurementDiv.innerHTML = testHTML;
        const testHeight = measurementDiv.scrollHeight;
        
        console.log(`Paragraph ${i + 1}: height ${testHeight}px`);
        
        if (testHeight <= maxHeight) {
          bestBreakHTML = testHTML;
        } else {
          // This paragraph caused overflow, use previous valid break
          break;
        }
      }

      // If paragraph splitting failed (single long paragraph), split by words
      if (!bestBreakHTML || bestBreakHTML === fullHTML) {
        console.log('Paragraph splitting failed, trying word-level splitting');
        
        // Extract text content and split by words
        const textContent = quillEditor.getText();
        const words = textContent.split(/\s+/);
        
        console.log(`Total words: ${words.length}`);
        
        // Binary search for optimal word break point
        let low = 0;
        let high = words.length;
        let bestWordCount = 0;
        
        while (low <= high) {
          const mid = Math.floor((low + high) / 2);
          const testText = words.slice(0, mid).join(' ');
          const testHTML = `<p>${testText}</p>`;
          
          measurementDiv.innerHTML = testHTML;
          const testHeight = measurementDiv.scrollHeight;
          
          console.log(`Testing ${mid} words: height ${testHeight}px`);
          
          if (testHeight <= maxHeight) {
            bestWordCount = mid;
            low = mid + 1;
          } else {
            high = mid - 1;
          }
        }
        
        if (bestWordCount > 0) {
          const firstPageText = words.slice(0, bestWordCount).join(' ');
          const remainingText = words.slice(bestWordCount).join(' ');
          
          bestBreakHTML = `<p>${firstPageText}</p>`;
          remainingHTML = `<p>${remainingText}</p>`;
          
          console.log(`Word-level split: ${bestWordCount} words on first page`);
        }
      } else {
        // Calculate remaining HTML after paragraph break
        remainingHTML = fullHTML.substring(bestBreakHTML.length);
      }

      document.body.removeChild(measurementDiv);

      // Ensure we have valid HTML to split
      if (!bestBreakHTML || bestBreakHTML === fullHTML) {
        console.log('No valid break point found');
        return;
      }
      
      // Clean up HTML boundaries to prevent corruption
      if (!bestBreakHTML.endsWith('</p>')) {
        bestBreakHTML += '</p>';
      }
      if (remainingHTML && !remainingHTML.startsWith('<p>')) {
        remainingHTML = '<p>' + remainingHTML;
      }

      console.log(`Breaking at HTML boundary - First: ${bestBreakHTML.length} chars, Remaining: ${remainingHTML.length} chars`);

      // Update pages with clean HTML
      const updatedPages = [...currentPages];
      updatedPages[pageIndex] = bestBreakHTML;
      
      // Handle overflow content
      if (pageIndex + 1 < updatedPages.length) {
        // Merge with existing next page content
        const nextPageHTML = updatedPages[pageIndex + 1];
        updatedPages[pageIndex + 1] = remainingHTML + (nextPageHTML && nextPageHTML !== '<p><br></p>' ? nextPageHTML : '');
      } else {
        // Create new page
        updatedPages.push(remainingHTML);
      }
      
      // Store current cursor position before page split
      const selection = quillEditor.getSelection();
      const cursorPosition = selection ? selection.index : 0;
      
      setPages(updatedPages);
      
      // Handle cursor positioning after page split
      setTimeout(() => {
        // Determine which page cursor should be on based on content length
        const firstPageTextLength = bestBreakHTML.replace(/<[^>]*>/g, '').length;
        
        if (cursorPosition > firstPageTextLength && pageIndex + 1 < updatedPages.length) {
          // Move cursor to next page
          const newPosition = Math.max(0, cursorPosition - firstPageTextLength);
          const nextPageRef = pageRefs.current[pageIndex + 1];
          
          if (nextPageRef) {
            const nextQuillEditor = nextPageRef.getEditor();
            if (nextQuillEditor) {
              nextQuillEditor.setSelection(newPosition, 0);
              nextQuillEditor.focus();
            }
          }
        } else {
          // Keep cursor on current page
          const currentPageRef = pageRefs.current[pageIndex];
          if (currentPageRef) {
            const adjustedPosition = Math.min(cursorPosition, firstPageTextLength);
            currentPageRef.getEditor().setSelection(adjustedPosition, 0);
          }
        }
        
        // Check next page for overflow
        if (pageIndex + 1 < updatedPages.length) {
          setTimeout(() => {
            checkAndHandleOverflow(pageIndex + 1, updatedPages);
          }, 200);
        }
      }, 150);
    }
  }, []);

  // Enhanced content redistribution for backspace operations
  const redistributeContentOnDelete = useCallback((pageIndex: number, currentPages: string[]) => {
    if (pageIndex === 0) return; // Can't redistribute from first page
    
    const currentRef = pageRefs.current[pageIndex];
    const prevRef = pageRefs.current[pageIndex - 1];
    
    if (!currentRef || !prevRef) return;
    
    const currentHTML = currentRef.getEditor().root.innerHTML;
    const prevHTML = prevRef.getEditor().root.innerHTML;
    
    // Skip if current page is not nearly empty
    const currentText = currentHTML.replace(/<[^>]*>/g, '').trim();
    if (currentText.length > 50) return; // Only redistribute if page is mostly empty
    
    // Check if previous page has space for current page content
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
      height: auto;
      visibility: hidden;
    `;
    document.body.appendChild(measurementDiv);
    
    const combinedHTML = prevHTML + currentHTML;
    measurementDiv.innerHTML = combinedHTML;
    const combinedHeight = measurementDiv.scrollHeight;
    
    document.body.removeChild(measurementDiv);
    
    const maxHeight = 950;
    
    if (combinedHeight <= maxHeight) {
      console.log(`Redistributing content: moving page ${pageIndex + 1} back to page ${pageIndex}`);
      
      // Move content back to previous page
      const updatedPages = [...currentPages];
      updatedPages[pageIndex - 1] = combinedHTML;
      
      // Remove current page and shift remaining pages
      if (pageIndex === updatedPages.length - 1) {
        updatedPages.pop(); // Remove last page
      } else {
        // Shift remaining pages down
        for (let i = pageIndex; i < updatedPages.length - 1; i++) {
          updatedPages[i] = updatedPages[i + 1];
        }
        updatedPages.pop();
      }
      
      setPages(updatedPages);
      
      // Focus back to previous page
      setTimeout(() => {
        const targetRef = pageRefs.current[pageIndex - 1];
        if (targetRef) {
          const editor = targetRef.getEditor();
          const prevTextLength = prevHTML.replace(/<[^>]*>/g, '').length;
          editor.setSelection(prevTextLength, 0);
          editor.focus();
        }
      }, 100);
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
          console.log(`Triggering overflow check for page ${pageIndex + 1}`);
          checkAndHandleOverflow(pageIndex, newPages);
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