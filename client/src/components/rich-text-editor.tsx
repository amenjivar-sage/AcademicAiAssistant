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

  const handleChange = (value: string, delta: any, source: any, editor: any) => {
    onContentChange(value);
    
    // Check for content overflow
    setTimeout(() => {
      if (quillRef.current) {
        const editorElement = quillRef.current.getEditor().root;
        const scrollHeight = editorElement.scrollHeight;
        const clientHeight = editorElement.clientHeight;
        setContentOverflow(scrollHeight > clientHeight);
      }
    }, 100);
    
    // Calculate approximate page count based on content length
    const textLength = value.replace(/<[^>]*>/g, '').length;
    const charsPerPage = 2500; // Approximate characters per page
    const neededPages = Math.max(1, Math.ceil(textLength / charsPerPage));
    setPageCount(neededPages);
    
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

  // Initialize page count when content is loaded
  useEffect(() => {
    if (content) {
      const textLength = content.replace(/<[^>]*>/g, '').length;
      const charsPerPage = 2500;
      const neededPages = Math.max(1, Math.ceil(textLength / charsPerPage));
      setPageCount(neededPages);
    }
  }, [content]);

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

        .document-container {
          width: 8.5in;
        }

        .single-document-page {
          background: white;
          width: 8.5in;
          height: 1000px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          border: 1px solid #e5e7eb;
          position: relative;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
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
          height: calc(1000px - 40px);
          overflow: hidden;
        }

        .ql-editor {
          font-family: 'Times New Roman', serif !important;
          font-size: 12pt !important;
          line-height: 2.0 !important;
          padding: 72px !important;
          background: transparent !important;
          border: none !important;
          margin: 0 !important;
          width: 100% !important;
          height: 100% !important;
          flex: 1;
          overflow: auto !important;
          box-sizing: border-box !important;
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

        /* Ensure Quill editor works properly within single page container */
        .single-document-page .ql-container {
          border: none !important;
          font-family: 'Times New Roman', serif !important;
          font-size: 12pt !important;
        }

        .single-document-page .ql-editor {
          padding: 72px !important;
          line-height: 2.0 !important;
          font-family: 'Times New Roman', serif !important;
          font-size: 12pt !important;
          box-sizing: border-box !important;
          min-height: 856px !important;
        }

        .single-document-page .ql-editor:focus {
          outline: none !important;
        }

        .single-document-page .ql-editor .ql-cursor {
          display: block !important;
        }
      `}</style>
      
      <div className="document-container" ref={containerRef}>
        <div className="single-document-page">
          <ReactQuill
            ref={quillRef}
            value={content}
            onChange={handleChange}
            modules={modules}
            formats={formats}
            readOnly={readOnly}
            placeholder={placeholder}
            theme="snow"
          />
          
          {/* Page break indicators */}
          {Array.from({ length: pageCount - 1 }, (_, index) => (
            <div 
              key={index}
              className="page-break-indicator"
              style={{
                position: 'absolute',
                top: `${(index + 1) * 1000}px`,
                left: '0',
                right: '0',
                height: '2px',
                background: 'repeating-linear-gradient(to right, #ccc 0, #ccc 10px, transparent 10px, transparent 20px)',
                zIndex: 10,
                pointerEvents: 'none'
              }}
            />
          ))}
          
          {/* Page numbers */}
          {Array.from({ length: pageCount }, (_, index) => (
            <div 
              key={index}
              className="page-number-indicator"
              style={{
                position: 'absolute',
                top: `${(index + 1) * 1000 - 30}px`,
                right: '72px',
                fontSize: '12px',
                color: '#666',
                zIndex: 10,
                pointerEvents: 'none'
              }}
            >
              {index + 1}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});

RichTextEditor.displayName = 'RichTextEditor';

export default RichTextEditor;