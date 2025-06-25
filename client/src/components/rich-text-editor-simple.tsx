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

      // Add CSS for page boundaries
      const style = document.createElement('style');
      style.textContent = `
        .ql-editor {
          background: 
            linear-gradient(transparent calc(${PAGE_HEIGHT}px - 1px), #ddd calc(${PAGE_HEIGHT}px), transparent calc(${PAGE_HEIGHT}px + 1px)),
            linear-gradient(transparent calc(${PAGE_HEIGHT * 2}px - 1px), #ddd calc(${PAGE_HEIGHT * 2}px), transparent calc(${PAGE_HEIGHT * 2}px + 1px)),
            linear-gradient(transparent calc(${PAGE_HEIGHT * 3}px - 1px), #ddd calc(${PAGE_HEIGHT * 3}px), transparent calc(${PAGE_HEIGHT * 3}px + 1px)),
            linear-gradient(transparent calc(${PAGE_HEIGHT * 4}px - 1px), #ddd calc(${PAGE_HEIGHT * 4}px), transparent calc(${PAGE_HEIGHT * 4}px + 1px)),
            linear-gradient(transparent calc(${PAGE_HEIGHT * 5}px - 1px), #ddd calc(${PAGE_HEIGHT * 5}px), transparent calc(${PAGE_HEIGHT * 5}px + 1px)),
            white;
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
    toolbar: false, // Disable toolbar completely to remove formatting options
    clipboard: {
      matchVisual: false
    }
  };

  const formats = []; // Remove all formatting options

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