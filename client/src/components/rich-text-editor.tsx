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
  const [pages, setPages] = useState<string[]>(['']);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useImperativeHandle(ref, () => ({
    focus: () => {
      if (quillRef.current) {
        quillRef.current.focus();
      }
    },
    getEditor: () => quillRef.current
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

  // Split content across pages based on height
  const splitContentIntoPages = useCallback((htmlContent: string) => {
    // Create a temporary div to measure content height
    const tempDiv = document.createElement('div');
    tempDiv.style.position = 'absolute';
    tempDiv.style.visibility = 'hidden';
    tempDiv.style.width = '612px'; // 8.5in - 72px padding on each side
    tempDiv.style.fontFamily = 'Times New Roman, serif';
    tempDiv.style.fontSize = '12pt';
    tempDiv.style.lineHeight = '2.0';
    tempDiv.innerHTML = htmlContent;
    document.body.appendChild(tempDiv);

    const maxPageHeight = 856; // 1000px - 144px padding (72px top + 72px bottom)
    const newPages: string[] = [];
    let currentPageContent = '';
    let currentHeight = 0;

    // Split content by paragraphs to avoid breaking mid-sentence
    const paragraphs = htmlContent.split('</p>').filter(p => p.trim());
    
    for (let i = 0; i < paragraphs.length; i++) {
      const paragraph = paragraphs[i] + (i < paragraphs.length - 1 ? '</p>' : '');
      
      // Test height with this paragraph added
      tempDiv.innerHTML = currentPageContent + paragraph;
      const newHeight = tempDiv.offsetHeight;
      
      if (newHeight > maxPageHeight && currentPageContent) {
        // This paragraph would overflow, start a new page
        newPages.push(currentPageContent);
        currentPageContent = paragraph;
      } else {
        currentPageContent += paragraph;
      }
    }
    
    // Add the last page
    if (currentPageContent) {
      newPages.push(currentPageContent);
    }
    
    document.body.removeChild(tempDiv);
    return newPages.length > 0 ? newPages : [''];
  }, []);

  const handleChange = (value: string, delta: any, source: any, editor: any) => {
    onContentChange(value);
    
    // Split content into pages
    const newPages = splitContentIntoPages(value);
    setPages(newPages);
    setPageCount(newPages.length);
    
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
    if (content) {
      const newPages = splitContentIntoPages(content);
      setPages(newPages);
      setPageCount(newPages.length);
    }
  }, [content, splitContentIntoPages]);

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

        .document-pages {
          display: flex;
          flex-direction: column;
          gap: 20px;
          width: 8.5in;
        }

        .document-page {
          background: white;
          width: 8.5in;
          height: 1000px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          border: 1px solid #e5e7eb;
          position: relative;
          display: flex;
          flex-direction: column;
          padding: 72px;
          box-sizing: border-box;
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
          height: 100%;
          overflow: hidden;
        }

        .ql-editor {
          font-family: 'Times New Roman', serif !important;
          font-size: 12pt !important;
          line-height: 2.0 !important;
          padding: 0 !important;
          background: transparent !important;
          border: none !important;
          margin: 0 !important;
          width: 100% !important;
          height: 100% !important;
          flex: 1;
          overflow: auto !important;
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

        /* Ensure Quill editor works properly within page container */
        .document-page .ql-container {
          height: 100% !important;
          font-family: 'Times New Roman', serif !important;
          font-size: 12pt !important;
        }

        .document-page .ql-editor {
          height: 100% !important;
          overflow-y: auto !important;
          padding: 72px !important;
          line-height: 2.0 !important;
          font-family: 'Times New Roman', serif !important;
          font-size: 12pt !important;
          box-sizing: border-box !important;
        }

        .document-page .ql-editor:focus {
          outline: none !important;
        }

        .document-page .ql-editor .ql-cursor {
          display: block !important;
        }
      `}</style>
      
      <div className="document-pages" ref={containerRef}>
        {/* Show React Quill editor on first page, read-only content on overflow pages */}
        {pages.map((pageContent, index) => (
          <div key={index} className="document-page">
            {index === 0 ? (
              <ReactQuill
                ref={quillRef}
                value={content}
                onChange={handleChange}
                modules={modules}
                formats={formats}
                readOnly={readOnly}
                placeholder={placeholder}
                theme="snow"
                style={{ height: '856px' }}
              />
            ) : (
              <div 
                className="page-content"
                dangerouslySetInnerHTML={{ __html: pageContent }}
                style={{
                  fontFamily: 'Times New Roman, serif',
                  fontSize: '12pt',
                  lineHeight: '2.0',
                  height: '856px',
                  overflow: 'hidden',
                  wordWrap: 'break-word',
                  padding: '72px',
                  boxSizing: 'border-box'
                }}
              />
            )}
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