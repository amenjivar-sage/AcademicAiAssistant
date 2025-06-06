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
  const [pages, setPages] = useState<string[]>([content || '']);
  const pageRefs = useRef<(ReactQuill | null)[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  useImperativeHandle(ref, () => ({
    focus: () => {
      const firstRef = pageRefs.current[0];
      if (firstRef) {
        firstRef.focus();
      }
    },
    getEditor: () => pageRefs.current[0]
  }));

  // Simple modules configuration
  const modules = {
    toolbar: false,
    clipboard: {
      matchVisual: true,
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

  // Simple overflow check with page creation
  const checkForOverflow = useCallback((pageIndex: number) => {
    const currentRef = pageRefs.current[pageIndex];
    if (!currentRef) return;

    const editorElement = currentRef.getEditor().root;
    const scrollHeight = editorElement.scrollHeight;
    
    console.log(`Page ${pageIndex + 1} height: ${scrollHeight}px`);

    if (scrollHeight > 950) {
      console.log(`Creating new page due to overflow`);
      
      const editor = currentRef.getEditor();
      const fullText = editor.getText().trim();
      
      if (fullText.length > 100) {
        // Split at roughly 60% to ensure first page fits
        const words = fullText.split(/\s+/);
        const splitPoint = Math.floor(words.length * 0.6);
        
        const firstPageText = words.slice(0, splitPoint).join(' ');
        const secondPageText = words.slice(splitPoint).join(' ');
        
        console.log(`Splitting ${words.length} words at position ${splitPoint}`);
        
        setPages(prev => {
          const newPages = [...prev];
          newPages[pageIndex] = `<p>${firstPageText}</p>`;
          
          if (pageIndex + 1 < newPages.length) {
            newPages[pageIndex + 1] = `<p>${secondPageText}</p>` + newPages[pageIndex + 1];
          } else {
            newPages.push(`<p>${secondPageText}</p>`);
          }
          
          return newPages;
        });
        
        // Move cursor to next page
        setTimeout(() => {
          const nextRef = pageRefs.current[pageIndex + 1];
          if (nextRef) {
            nextRef.focus();
            nextRef.getEditor().setSelection(0, 0);
          }
        }, 100);
      }
    }
  }, []);

  const createHandleChange = (pageIndex: number) => (value: string, delta: any, source: any) => {
    if (source !== 'user') return;
    
    setPages(prev => {
      const newPages = [...prev];
      newPages[pageIndex] = value;
      
      // Combine all pages for parent callback
      const combinedContent = newPages.join('');
      onContentChange(combinedContent);
      
      // Check for overflow after a delay
      setTimeout(() => {
        checkForOverflow(pageIndex);
      }, 300);
      
      return newPages;
    });
  };

  // Handle text selection
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

  // Initialize pages when content changes
  useEffect(() => {
    if (content && content !== pages.join('')) {
      console.log('External content change detected');
      setPages([content]);
    }
  }, [content]);

  // Initialize page refs array
  useEffect(() => {
    pageRefs.current = pageRefs.current.slice(0, pages.length);
  }, [pages.length]);

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
              onChangeSelection={(range, oldRange, source) => handleTextSelection(range, oldRange, source, index)}
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