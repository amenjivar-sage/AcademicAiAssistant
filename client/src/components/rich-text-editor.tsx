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

  // Improved overflow detection with better height measurement
  const checkAndHandleOverflow = useCallback((pageIndex: number, currentPages: string[]) => {
    const currentRef = pageRefs.current[pageIndex];
    if (!currentRef) {
      console.log(`No ref found for page ${pageIndex + 1}`);
      return;
    }

    const editorElement = currentRef.getEditor().root;
    const scrollHeight = editorElement.scrollHeight;
    const maxHeight = 950; // Exact page height limit
    const buffer = 10; // Small buffer to prevent premature overflow

    console.log(`Checking overflow for page ${pageIndex + 1}: ${scrollHeight}px vs ${maxHeight}px`);

    // Only trigger overflow if we're significantly over the limit to fill pages completely
    if (scrollHeight > maxHeight + buffer) {
      console.log(`OVERFLOW DETECTED on page ${pageIndex + 1}: ${scrollHeight}px > ${maxHeight + buffer}px`);
      
      const quillEditor = currentRef.getEditor();
      const totalLength = quillEditor.getLength() - 1;
      
      if (totalLength <= 0) return;

      // Create measurement container with exact same styling as editor
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

      // Binary search to find maximum content that fits exactly in 950px
      let low = 0;
      let high = totalLength;
      let bestBreakPoint = Math.floor(totalLength * 0.9); // Start with aggressive estimate to fill pages

      for (let attempt = 0; attempt < 15; attempt++) {
        const testPoint = Math.floor((low + high) / 2);
        const testContent = quillEditor.getText(0, testPoint);
        
        measurementDiv.innerHTML = `<p>${testContent}</p>`;
        const testHeight = measurementDiv.scrollHeight;
        
        console.log(`Test point ${testPoint}: height ${testHeight}px`);
        
        if (testHeight <= maxHeight) {
          bestBreakPoint = testPoint;
          low = testPoint + 1;
        } else {
          high = testPoint - 1;
        }
        
        if (high - low < 5) break; // Converged to optimal point
      }

      document.body.removeChild(measurementDiv);

      // Find a good word boundary near the break point
      const text = quillEditor.getText();
      let finalBreakPoint = bestBreakPoint;
      
      // Look backwards for a space or punctuation to avoid breaking words
      for (let i = bestBreakPoint; i > bestBreakPoint - 100 && i > 0; i--) {
        const char = text[i];
        if (char === ' ' || char === '\n' || char === '.' || char === '!' || char === '?') {
          finalBreakPoint = i + 1;
          break;
        }
      }

      // Split content at the break point while preserving formatting
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
            const adjustedPosition = Math.min(cursorPosition, finalBreakPoint);
            currentPageRef.getEditor().setSelection(adjustedPosition, 0);
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

  // Content redistribution for backspace - moves content back to previous pages when there's space
  const redistributeContentOnDelete = useCallback((pageIndex: number, currentPages: string[]) => {
    if (pageIndex === 0) return; // Can't redistribute from first page
    
    const currentRef = pageRefs.current[pageIndex];
    const prevRef = pageRefs.current[pageIndex - 1];
    
    if (!currentRef || !prevRef) return;
    
    const currentContent = currentRef.getEditor().getText().trim();
    const prevContent = prevRef.getEditor().getText().trim();
    
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
    
    const combinedContent = prevContent + ' ' + currentContent;
    measurementDiv.innerHTML = `<p>${combinedContent}</p>`;
    const combinedHeight = measurementDiv.scrollHeight;
    
    document.body.removeChild(measurementDiv);
    
    const maxHeight = 950;
    
    if (combinedHeight <= maxHeight) {
      console.log(`Redistributing content: moving page ${pageIndex + 1} back to page ${pageIndex}`);
      
      // Move content back to previous page
      const updatedPages = [...currentPages];
      updatedPages[pageIndex - 1] = `<p>${combinedContent}</p>`;
      
      // Remove current page if it's empty, or shift remaining pages
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
          editor.setSelection(prevContent.length + 1, 0);
          editor.focus();
        }
      }, 100);
    }
  }, []);

  // Debounced overflow check to prevent rapid page creation
  const overflowCheckTimeout = useRef<NodeJS.Timeout | null>(null);

  const createHandleChange = (pageIndex: number) => (value: string, delta: any, source: any, editor: any) => {
    // Prevent recursive updates by checking if this is the expected change
    if (pages[pageIndex] === value) return;
    
    // Only process user-initiated changes to prevent formatting loss
    if (source !== 'user') {
      console.log(`Ignoring non-user change on page ${pageIndex + 1}, source: ${source}`);
      return;
    }
    
    // Preserve current selection and formatting when updating content
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
    
    // Update the specific page content without affecting other pages
    const newPages = [...pages];
    newPages[pageIndex] = value;
    setPages(newPages);
    
    // Combine all pages for parent callback
    const combinedContent = newPages.join('');
    onContentChange(combinedContent);
    
    // Restore selection and formatting after update
    if (currentRef && currentSelection && currentFormat) {
      setTimeout(() => {
        try {
          const quillEditor = currentRef.getEditor();
          quillEditor.setSelection(currentSelection);
          // Ensure formatting is maintained for the next input
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
    
    // Overflow check for user input only
    console.log(`User content change detected on page ${pageIndex + 1}, preserving formatting`);
    
    // Clear existing timeout
    if (overflowCheckTimeout.current) {
      clearTimeout(overflowCheckTimeout.current);
    }
    
    // Check overflow with a delay to allow DOM update
    overflowCheckTimeout.current = setTimeout(() => {
      const currentRef = pageRefs.current[pageIndex];
      if (currentRef) {
        const editorElement = currentRef.getEditor().root;
        const scrollHeight = editorElement.scrollHeight;
        
        console.log(`Page ${pageIndex + 1} height after change: ${scrollHeight}px`);
        
        // Check for overflow
        if (scrollHeight > 955) { // Allow slight buffer before overflow
          checkAndHandleOverflow(pageIndex, newPages);
        }
        
        setContentOverflow(scrollHeight > 950);
      }
    }, 300);
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

  // Smart page splitting for restored content
  const splitContentIntoPages = useCallback((fullContent: string): string[] => {
    if (!fullContent || fullContent.trim() === '') {
      return [''];
    }

    console.log('Splitting content into pages:', fullContent.length, 'characters');
    
    // Create a temporary container to measure content height
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

    const maxPageHeight = 950; // 950px page height constraint
    const pages: string[] = [];
    
    try {
      // Put all content in temp container to measure
      tempContainer.innerHTML = fullContent;
      const totalHeight = tempContainer.scrollHeight;
      
      console.log('Total content height:', totalHeight, 'px');
      
      if (totalHeight <= maxPageHeight) {
        // Content fits on one page
        pages.push(fullContent);
      } else {
        // Need to split content across multiple pages
        const estimatedPages = Math.ceil(totalHeight / maxPageHeight);
        console.log('Estimated pages needed:', estimatedPages);
        
        // Split content by attempting to fit chunks into page height
        const tempDiv = document.createElement('div');
        tempDiv.style.cssText = tempContainer.style.cssText;
        tempDiv.style.height = maxPageHeight + 'px';
        tempDiv.style.overflow = 'hidden';
        document.body.appendChild(tempDiv);
        
        let remainingContent = fullContent;
        let pageIndex = 0;
        
        while (remainingContent.trim() && pageIndex < 20) { // Safety limit
          // Binary search to find optimal content length for this page
          let low = 0;
          let high = remainingContent.length;
          let bestFit = Math.floor(remainingContent.length / estimatedPages);
          
          // Try different content lengths to find what fits
          for (let attempts = 0; attempts < 10; attempts++) {
            const testLength = Math.floor((low + high) / 2);
            const testContent = remainingContent.substring(0, testLength);
            
            // Don't break in the middle of HTML tags
            let adjustedContent = testContent;
            if (testContent.includes('<') && !testContent.includes('>')) {
              const lastComplete = testContent.lastIndexOf('<');
              if (lastComplete > 0) {
                adjustedContent = testContent.substring(0, lastComplete);
              }
            }
            
            tempDiv.innerHTML = adjustedContent;
            const testHeight = tempDiv.scrollHeight;
            
            if (testHeight <= maxPageHeight) {
              bestFit = adjustedContent.length;
              low = testLength;
            } else {
              high = testLength;
            }
            
            if (high - low < 50) break; // Close enough
          }
          
          // Extract content for this page
          let pageContent = remainingContent.substring(0, bestFit);
          
          // Try to break at word boundaries
          if (bestFit < remainingContent.length) {
            const lastSpace = pageContent.lastIndexOf(' ');
            const lastTag = pageContent.lastIndexOf('>');
            if (lastSpace > lastTag && lastSpace > pageContent.length - 100) {
              pageContent = pageContent.substring(0, lastSpace);
              bestFit = lastSpace;
            }
          }
          
          if (pageContent.trim()) {
            pages.push(pageContent);
            console.log(`Page ${pageIndex + 1}: ${pageContent.length} chars`);
          }
          
          remainingContent = remainingContent.substring(bestFit).trim();
          pageIndex++;
        }
        
        document.body.removeChild(tempDiv);
        
        // If there's still content left, add it to the last page
        if (remainingContent.trim()) {
          pages.push(remainingContent);
        }
      }
    } catch (error) {
      console.error('Error splitting content:', error);
      pages.push(fullContent); // Fallback to single page
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
      
      // Split content into appropriate pages
      const newPages = splitContentIntoPages(content);
      setPages(newPages);
      
      // Force ReactQuill editors to update their content
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

  // Clean up empty pages and consolidate content while preserving formatting
  const consolidatePages = useCallback(() => {
    const newPages: string[] = [];
    let combinedContent = '';
    
    // Combine all pages while preserving HTML formatting
    for (let i = 0; i < pages.length; i++) {
      const pageContent = pages[i];
      if (pageContent && pageContent.trim()) {
        // Remove only wrapping <p> tags but preserve internal formatting
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
    
    // For now, just put all content on one page to avoid breaking formatting
    // TODO: Implement smarter page splitting that preserves HTML tags
    newPages.push(`<p>${combinedContent}</p>`);
    
    setPages(newPages);
  }, [pages]);

  // Handle keyboard events for automatic page creation and content redistribution
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
        // First check if current page is nearly empty and can be consolidated
        redistributeContentOnDelete(pageIndex, pages);
        
        // Then check for empty pages that should be removed
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