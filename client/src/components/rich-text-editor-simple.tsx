import React, { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

interface RichTextEditorProps {
  content: string;
  onContentChange: (content: string) => void;
  onTextSelection?: (selectedText: string) => void;
  readOnly?: boolean;
  placeholder?: string;
  onFormatRef?: React.MutableRefObject<((command: string, value?: string) => void) | null>;
  headerFooterSettings?: {
    header: string;
    footer: string;
    pageNumbers: boolean;
  };
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
  placeholder = "Start writing...",
  onFormatRef,
  headerFooterSettings
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

  // Formatting function for toolbar commands
  const handleFormat = (command: string, value?: string) => {
    if (!quillRef.current) return;
    
    const quill = quillRef.current.getEditor();
    const selection = quill.getSelection();

    switch (command) {
      case 'fontName':
        if (selection) {
          quill.format('font', value);
        }
        break;
      case 'fontSize':
        if (selection) {
          quill.format('size', value);
        }
        break;
      case 'bold':
        if (selection) {
          quill.format('bold', !quill.getFormat().bold);
        }
        break;
      case 'italic':
        if (selection) {
          quill.format('italic', !quill.getFormat().italic);
        }
        break;
      case 'underline':
        if (selection) {
          quill.format('underline', !quill.getFormat().underline);
        }
        break;
      case 'foreColor':
        if (selection) {
          quill.format('color', value);
        }
        break;
      case 'justifyLeft':
        if (selection) {
          quill.format('align', false);
        }
        break;
      case 'justifyCenter':
        if (selection) {
          quill.format('align', 'center');
        }
        break;
      case 'justifyRight':
        if (selection) {
          quill.format('align', 'right');
        }
        break;
      case 'insertUnorderedList':
        if (selection) {
          quill.format('list', 'bullet');
        }
        break;
      case 'insertOrderedList':
        if (selection) {
          quill.format('list', 'ordered');
        }
        break;
      case 'undo':
        try {
          // Use Quill's undo if available
          const history = (quill as any).history;
          if (history && history.undo) {
            history.undo();
          }
        } catch (e) {
          console.log('Undo not available');
        }
        break;
      case 'redo':
        try {
          // Use Quill's redo if available
          const history = (quill as any).history;
          if (history && history.redo) {
            history.redo();
          }
        } catch (e) {
          console.log('Redo not available');
        }
        break;
      default:
        console.log('Unhandled format command:', command, value);
    }
  };

  // Connect formatting function to parent ref
  useEffect(() => {
    if (onFormatRef) {
      onFormatRef.current = handleFormat;
    }
  }, [onFormatRef]);

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
    toolbar: false, // Disable default toolbar since we're using EnhancedToolbar
    clipboard: {
      matchVisual: false
    }
  };

  const formats = [
    'header', 'font', 'size',
    'bold', 'italic', 'underline', 'strike', 'blockquote',
    'list', 'bullet', 'indent', 'align',
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