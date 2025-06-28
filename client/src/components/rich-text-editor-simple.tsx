import React, { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
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

const PAGE_HEIGHT = 950; // ~11 inches at 96dpi

export const RichTextEditor = forwardRef<RichTextEditorHandle, RichTextEditorProps>(({
  content,
  onContentChange,
  onTextSelection,
  readOnly = false,
  placeholder = "Start writing..."
}, ref) => {
  
  const editorRef = useRef<HTMLDivElement>(null);
  const quillRef = useRef<ReactQuill>(null);

  useEffect(() => {
    // Simple approach - just add visual indicators without continuous monitoring
    const addPageIndicators = () => {
      const editor = editorRef.current;
      if (!editor) return;

      const container = editor.querySelector('.ql-editor');
      if (!container) return;

      // Add CSS for page boundaries with better visibility
      const style = document.createElement('style');
      style.textContent = `
        .ql-editor {
          background: 
            linear-gradient(transparent calc(${PAGE_HEIGHT}px - 2px), #ff6b6b 1px calc(${PAGE_HEIGHT}px), #ff6b6b calc(${PAGE_HEIGHT}px + 1px), transparent calc(${PAGE_HEIGHT}px + 3px)),
            linear-gradient(transparent calc(${PAGE_HEIGHT * 2}px - 2px), #ff6b6b calc(${PAGE_HEIGHT * 2}px), #ff6b6b calc(${PAGE_HEIGHT * 2}px + 1px), transparent calc(${PAGE_HEIGHT * 2}px + 3px)),
            linear-gradient(transparent calc(${PAGE_HEIGHT * 3}px - 2px), #ff6b6b calc(${PAGE_HEIGHT * 3}px), #ff6b6b calc(${PAGE_HEIGHT * 3}px + 1px), transparent calc(${PAGE_HEIGHT * 3}px + 3px)),
            linear-gradient(transparent calc(${PAGE_HEIGHT * 4}px - 2px), #ff6b6b calc(${PAGE_HEIGHT * 4}px), #ff6b6b calc(${PAGE_HEIGHT * 4}px + 1px), transparent calc(${PAGE_HEIGHT * 4}px + 3px)),
            linear-gradient(transparent calc(${PAGE_HEIGHT * 5}px - 2px), #ff6b6b calc(${PAGE_HEIGHT * 5}px), #ff6b6b calc(${PAGE_HEIGHT * 5}px + 1px), transparent calc(${PAGE_HEIGHT * 5}px + 3px)),
            white;
          position: relative;
        }
        .ql-editor::before {
          content: "";
          position: absolute;
          top: ${PAGE_HEIGHT}px;
          left: 0;
          right: 0;
          height: 2px;
          background: #ff6b6b;
          z-index: 1;
        }
        .ql-editor::after {
          content: "Page 1 ends here - Page 2 begins";
          position: absolute;
          top: ${PAGE_HEIGHT - 15}px;
          right: 10px;
          font-size: 10px;
          color: #ff6b6b;
          background: white;
          padding: 2px 5px;
          border-radius: 3px;
          z-index: 2;
        }
      `;
      
      if (!document.querySelector('#page-indicators')) {
        style.id = 'page-indicators';
        document.head.appendChild(style);
      }
    };

    // Add indicators after editor is ready
    setTimeout(addPageIndicators, 500);
  }, []);

  // Expose methods through ref
  useImperativeHandle(ref, () => ({
    focus: () => {
      if (quillRef.current) {
        quillRef.current.focus();
      }
    },
    getEditor: () => {
      return quillRef.current || null;
    }
  }));

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
    <div className="editor-wrapper" ref={editorRef}>
      <style>
        {`
        .editor-wrapper {
          width: 100%;
          height: 100%;
          background: #f5f5f5;
          padding: 20px;
          overflow-y: auto;
        }

        .editor-wrapper .ql-container {
          border: none;
          font-family: 'Times New Roman', serif;
          background: white;
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
          border-radius: 8px;
          max-width: 8.5in;
          margin: 0 auto;
        }

        .editor-wrapper .ql-toolbar {
          border: none;
          border-bottom: 1px solid #ddd;
          background: #f8f9fa;
          border-radius: 8px 8px 0 0;
        }

        .editor-wrapper .ql-editor {
          padding: 72px !important;
          line-height: 2.0 !important;
          font-family: 'Times New Roman', serif !important;
          font-size: 14pt !important;
          min-height: 100vh !important;
          border-radius: 0 0 8px 8px;
        }

        .editor-wrapper .ql-editor:focus {
          outline: none !important;
        }

        /* Page break styling */
        .page-break {
          user-select: none;
          pointer-events: none;
        }

        .page-break span {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif !important;
          font-size: 11px !important;
          font-weight: 500;
        }

        /* Print styling */
        @media print {
          .page-break {
            page-break-before: always !important;
            visibility: hidden;
          }
        }
        `}
      </style>
      
      <ReactQuill 
        ref={quillRef}
        value={content}
        onChange={onContentChange}
        readOnly={readOnly}
        placeholder={placeholder}
        modules={modules}
        formats={formats}
        style={{ minHeight: '100vh' }}
      />
    </div>
  );
});

RichTextEditor.displayName = 'RichTextEditor';