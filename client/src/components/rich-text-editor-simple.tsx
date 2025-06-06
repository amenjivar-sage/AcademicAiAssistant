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
    const handleContentChange = () => {
      const editor = editorRef.current;
      if (!editor) return;

      const container = editor.querySelector('.ql-editor');
      if (!container) return;

      const children = Array.from(container.children);
      let currentHeight = 0;
      let pageNumber = 1;

      // Remove existing page breaks
      container.querySelectorAll('.page-break').forEach(el => el.remove());

      children.forEach((el: Element, index) => {
        const element = el as HTMLElement;
        const elementHeight = element.offsetHeight;
        
        // Check if this element would overflow the current page
        if (currentHeight + elementHeight > PAGE_HEIGHT && currentHeight > 0) {
          // Insert visual page break
          const pageBreak = document.createElement('div');
          pageBreak.className = 'page-break';
          pageBreak.style.cssText = `
            height: 30px;
            border-top: 2px dashed #ccc;
            margin: 20px 0;
            position: relative;
            page-break-before: always;
          `;
          pageBreak.innerHTML = `<span style="position: absolute; right: 0; top: -10px; background: white; padding: 0 10px; font-size: 12px; color: #666;">Page ${pageNumber + 1}</span>`;
          
          container.insertBefore(pageBreak, element);
          currentHeight = 0;
          pageNumber++;
        }
        
        currentHeight += elementHeight;
      });
    };

    const editor = editorRef.current;
    if (!editor) return;

    const observer = new MutationObserver(handleContentChange);
    observer.observe(editor, { childList: true, subtree: true, characterData: true });
    
    // Initial processing
    setTimeout(handleContentChange, 100);
    
    return () => observer.disconnect();
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