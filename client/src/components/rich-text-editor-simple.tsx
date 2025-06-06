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

const PAGE_HEIGHT = 950; // pixels

export const RichTextEditor = forwardRef<RichTextEditorHandle, RichTextEditorProps>(({
  content,
  onContentChange,
  onTextSelection,
  readOnly = false,
  placeholder = "Start writing..."
}, ref) => {
  
  const [pages, setPages] = useState<string[]>(['']);
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRefs = useRef<(ReactQuill | null)[]>([]);

  // Initialize content
  useEffect(() => {
    if (content && content !== pages.join('')) {
      setPages([content]);
    }
  }, [content]);

  useEffect(() => {
    redistributeContent();
  }, [pages]);

  const redistributeContent = () => {
    const updatedPages = [...pages];
    for (let i = 0; i < editorRefs.current.length; i++) {
      const editorDiv = editorRefs.current[i]?.getEditor()?.container;
      if (editorDiv && editorDiv.scrollHeight > PAGE_HEIGHT + 10) {
        const quill = editorRefs.current[i]?.getEditor();
        if (!quill) continue;
        
        const delta = quill.getContents();
        const text = quill.getText();

        const middle = Math.floor(text.length / 2);
        let breakPoint = text.lastIndexOf(' ', middle);
        if (breakPoint === -1) breakPoint = middle;

        const newDelta = delta.slice(breakPoint);
        quill.deleteText(breakPoint, text.length);

        updatedPages[i] = quill.root.innerHTML;
        updatedPages.splice(i + 1, 0, '');
        setPages(updatedPages);
        break;
      }
    }
  };

  const handleChange = (value: string, index: number) => {
    const newPages = [...pages];
    newPages[index] = value;
    setPages(newPages);
    
    // Update parent with combined content
    const combinedContent = newPages.join('');
    onContentChange(combinedContent);
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
    <div ref={containerRef} className="p-4 bg-gray-200 min-h-screen">
      <style>
        {`
        .editor-page {
          background: white;
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
          margin: 0 auto 24px auto;
          padding: 40px;
          box-sizing: border-box;
          position: relative;
          width: 816px;
          height: ${PAGE_HEIGHT}px;
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
          height: calc(100% - 42px);
        }

        .editor-page .ql-editor {
          padding: 0 !important;
          line-height: 2.0 !important;
          font-family: 'Times New Roman', serif !important;
          font-size: 14pt !important;
          height: 100% !important;
          overflow-y: hidden !important;
        }

        .editor-page .ql-editor:focus {
          outline: none !important;
        }

        .page-number {
          position: absolute;
          bottom: 8px;
          right: 16px;
          font-size: 12px;
          color: #666;
          pointer-events: none;
        }
        `}
      </style>

      {pages.map((content, i) => (
        <div key={i} className="editor-page">
          <ReactQuill
            ref={(el) => (editorRefs.current[i] = el)}
            theme="snow"
            value={content}
            onChange={(value) => handleChange(value, i)}
            readOnly={readOnly}
            placeholder={i === 0 ? placeholder : ''}
            modules={modules}
            formats={formats}
            className="h-full"
          />
          <div className="page-number">
            Page {i + 1}
          </div>
        </div>
      ))}
    </div>
  );
});

RichTextEditor.displayName = 'RichTextEditor';