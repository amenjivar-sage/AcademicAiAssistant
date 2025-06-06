import React, { useState, useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
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

const PAGE_HEIGHT = 950;

export const RichTextEditor = forwardRef<RichTextEditorHandle, RichTextEditorProps>(({
  content,
  onContentChange,
  onTextSelection,
  readOnly = false,
  placeholder = "Start writing..."
}, ref) => {
  
  const [pages, setPages] = useState<string[]>(['']);
  const editorRefs = useRef<(ReactQuill | null)[]>([]);
  
  // Initialize content
  useEffect(() => {
    if (content && content !== pages.join('')) {
      setPages([content]);
    }
  }, [content]);

  // Check if we need to add a new page and split content
  const checkAndAddPage = () => {
    const lastIndex = pages.length - 1;
    const lastRef = editorRefs.current[lastIndex];
    if (!lastRef) return;

    const editorEl = lastRef.getEditor()?.root;
    if (!editorEl) return;

    const contentHeight = editorEl.scrollHeight;
    const visibleHeight = PAGE_HEIGHT - 144; // Account for padding

    console.log(`Checking page ${lastIndex + 1}: content=${contentHeight}px, limit=${visibleHeight}px`);

    if (contentHeight > visibleHeight) {
      console.log(`Page overflow detected - splitting content`);
      
      // Get all content from the current page
      const htmlContent = editorEl.innerHTML;
      
      // Split by paragraphs for clean breaks
      const paragraphs = htmlContent.split('</p>').filter(p => p.trim()).map(p => p + '</p>');
      
      if (paragraphs.length > 1) {
        // Use binary search to find optimal split point
        let low = 1;
        let high = paragraphs.length - 1;
        let bestSplit = low;
        
        // Create temp element for measurement
        const tempDiv = document.createElement('div');
        tempDiv.style.cssText = `
          position: absolute;
          visibility: hidden;
          width: calc(8.5in - 144px);
          padding: 72px;
          font-family: 'Times New Roman', serif;
          font-size: 14pt;
          line-height: 2.0;
          box-sizing: border-box;
          top: -9999px;
        `;
        document.body.appendChild(tempDiv);
        
        try {
          while (low <= high) {
            const mid = Math.floor((low + high) / 2);
            const testContent = paragraphs.slice(0, mid).join('');
            tempDiv.innerHTML = testContent;
            
            if (tempDiv.scrollHeight <= visibleHeight) {
              bestSplit = mid;
              low = mid + 1;
            } else {
              high = mid - 1;
            }
          }
          
          const firstPageContent = paragraphs.slice(0, bestSplit).join('') || '<p><br></p>';
          const overflowContent = paragraphs.slice(bestSplit).join('') || '<p><br></p>';
          
          console.log(`Optimal split: ${bestSplit}/${paragraphs.length} paragraphs on current page`);
          
          // Update pages with split content
          setPages(prev => {
            const newPages = [...prev];
            newPages[lastIndex] = firstPageContent;
            newPages.push(overflowContent);
            return newPages;
          });
          
        } finally {
          document.body.removeChild(tempDiv);
        }
      }
    }
  };

  // Handle content changes
  const handleChange = (value: string, index: number) => {
    const newPages = [...pages];
    newPages[index] = value;
    setPages(newPages);
    
    // Update parent with combined content
    const combinedContent = newPages.join('');
    onContentChange(combinedContent);
    
    // Trigger overflow check after content changes
    setTimeout(() => {
      checkAndAddPage();
    }, 100);
  };

  // Expose methods through ref
  useImperativeHandle(ref, () => ({
    focus: () => {
      const firstEditor = editorRefs.current[0];
      if (firstEditor) {
        firstEditor.focus();
      }
    },
    getEditor: () => {
      return editorRefs.current[0] || null;
    }
  }));

  // Check for overflow when content changes
  useEffect(() => {
    checkAndAddPage();
  }, [pages]);

  const modules = {
    toolbar: [
      [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'color': [] }, { 'background': [] }],
      [{ 'font': [] }],
      [{ 'align': [] }],
      ['blockquote', 'code-block'],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      [{ 'indent': '-1'}, { 'indent': '+1' }],
      ['link', 'image'],
      ['clean']
    ],
    clipboard: {
      matchVisual: false
    }
  };

  const formats = [
    'header', 'font', 'size',
    'bold', 'italic', 'underline', 'strike', 'blockquote',
    'list', 'bullet', 'indent',
    'link', 'color', 'background'
  ];

  return (
    <div className="rich-text-editor-container">
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

        .editor-pages {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 24px;
        }

        .editor-page {
          background: white;
          width: 8.5in;
          min-height: 11in;
          padding: 0;
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
          border-radius: 8px;
          position: relative;
          overflow: hidden;
        }

        .editor-page .ql-toolbar {
          border-top: none;
          border-left: none;
          border-right: none;
          border-bottom: 1px solid #ccc;
        }

        .editor-page .ql-container {
          border: none;
          font-family: 'Times New Roman', serif;
        }

        .editor-page .ql-editor {
          padding: 72px !important;
          line-height: 2.0 !important;
          font-family: 'Times New Roman', serif !important;
          font-size: 14pt !important;
          box-sizing: border-box !important;
          min-height: ${PAGE_HEIGHT}px !important;
          max-height: ${PAGE_HEIGHT}px !important;
          overflow-y: auto !important;
        }

        .editor-page .ql-editor:focus {
          outline: none !important;
        }

        .page-number {
          position: absolute;
          bottom: 20px;
          right: 30px;
          font-size: 12px;
          color: #666;
          pointer-events: none;
        }
        `}
      </style>

      <div className="editor-pages">
        {pages.map((content, index) => (
          <div key={index} className="editor-page">
            <ReactQuill
              ref={(el) => (editorRefs.current[index] = el)}
              theme="snow"
              value={content}
              onChange={(val) => handleChange(val, index)}
              onBlur={checkAndAddPage}
              readOnly={readOnly}
              placeholder={index === 0 ? placeholder : ''}
              modules={modules}
              formats={formats}
            />
            <div className="page-number">Page {index + 1}</div>
          </div>
        ))}
      </div>
    </div>
  );
});

RichTextEditor.displayName = 'RichTextEditor';