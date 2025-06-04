import { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
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

  // Expose formatting functions to parent
  useEffect(() => {
    if (ref && typeof ref === 'object' && ref.current) {
      (ref.current as any).applyBold = applyBold;
    }
  }, [ref]);

  return (
    <div className="rich-text-editor-container">
      <style>{`
        .ql-editor {
          font-family: 'Times New Roman', serif !important;
          font-size: 12pt !important;
          line-height: 2.0 !important;
          padding: 96px !important;
          min-height: 11in !important;
          width: 8.5in !important;
          margin: 0 auto !important;
          background: white !important;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1) !important;
          border: 1px solid #e5e7eb !important;
        }
        
        .ql-container {
          border: none !important;
          font-family: 'Times New Roman', serif !important;
        }
        
        .ql-editor.ql-blank::before {
          font-family: 'Times New Roman', serif !important;
          font-size: 12pt !important;
          color: #9ca3af !important;
        }

        .ql-editor p {
          margin-bottom: 0 !important;
        }

        .ql-editor strong {
          font-weight: bold !important;
        }
      `}</style>
      
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
    </div>
  );
});

RichTextEditor.displayName = 'RichTextEditor';

export default RichTextEditor;