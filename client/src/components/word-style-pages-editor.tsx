import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface WordStylePagesEditorProps {
  content: string;
  onContentChange: (content: string) => void;
  studentName?: string;
  assignmentTitle?: string;
  showPageNumbers?: boolean;
  showHeader?: boolean;
}

const PAGE_HEIGHT = 1056; // 11in at 96dpi minus margins
const PAGE_WIDTH = 816; // 8.5in at 96dpi
const PAGE_PADDING = 64; // Padding inside each page
const CHARS_PER_PAGE = 2500; // Approximate characters per page (including line breaks)
const LINES_PER_PAGE = 40; // Lines per page with standard formatting
const CHARS_PER_LINE = 85; // Characters per line for text wrapping estimation

function splitTextToPages(text: string): string[] {
  if (!text) return [""];
  
  // Enhanced page break detection - look for multiple consecutive line breaks
  const sections = text.split(/\n{4,}/); // 4+ consecutive line breaks = new page
  const pages: string[] = [];
  
  sections.forEach((section, index) => {
    if (!section && index === 0) {
      pages.push("");
      return;
    }
    
    // Split long sections by line count if needed
    const lines = section.split('\n');
    let currentPage = "";
    let lineCount = 0;
    
    for (const line of lines) {
      // More aggressive page break - break at 35 lines or when we hit natural page breaks
      if (lineCount >= 35 && currentPage.trim()) {
        pages.push(currentPage.trimEnd());
        currentPage = line + '\n';
        lineCount = 1;
      } else {
        currentPage += line + '\n';
        lineCount++;
      }
    }
    
    if (currentPage || pages.length === 0) {
      pages.push(currentPage.trimEnd());
    }
  });
  
  // Always have at least one page
  if (pages.length === 0) pages.push("");
  
  return pages;
}

export default function WordStylePagesEditor({
  content,
  onContentChange,
  studentName,
  assignmentTitle,
  showPageNumbers = true,
  showHeader = true
}: WordStylePagesEditorProps) {
  const [pages, setPages] = useState<string[]>([""]);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const textareaRefs = useRef<(HTMLTextAreaElement | null)[]>([]);

  // Split content into pages whenever content changes
  useEffect(() => {
    const newPages = splitTextToPages(content);
    setPages(newPages);
    
    // Update textarea refs array
    textareaRefs.current = textareaRefs.current.slice(0, newPages.length);
  }, [content]);

  const handlePageContentChange = (pageIndex: number, newContent: string) => {
    const updatedPages = [...pages];
    updatedPages[pageIndex] = newContent;
    
    // Reconstruct full content and trigger onChange
    const fullContent = updatedPages.join(" ");
    onContentChange(fullContent);
  };

  const focusPage = (pageIndex: number) => {
    setCurrentPageIndex(pageIndex);
    setTimeout(() => {
      const textarea = textareaRefs.current[pageIndex];
      if (textarea) {
        textarea.focus();
        // Move cursor to end
        textarea.setSelectionRange(textarea.value.length, textarea.value.length);
      }
    }, 100);
  };

  const addNewPage = () => {
    const newPages = [...pages, ""];
    const fullContent = newPages.join(" ");
    onContentChange(fullContent);
    
    // Focus the new page
    setTimeout(() => focusPage(newPages.length - 1), 100);
  };

  const getTotalWordCount = () => {
    return content.split(/\s+/).filter(word => word.length > 0).length;
  };

  const getPageWordCount = (pageContent: string) => {
    return pageContent.split(/\s+/).filter(word => word.length > 0).length;
  };

  const getPageLineCount = (pageContent: string) => {
    // Count actual line breaks - each \n represents one line
    return pageContent.split('\n').length - 1;
  };

  return (
    <div className="bg-gray-100 min-h-screen py-8 px-4">
      {/* Document Info */}
      <div className="max-w-4xl mx-auto mb-6">
        <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                {assignmentTitle || "Document"}
              </h2>
              {studentName && (
                <p className="text-sm text-gray-600">{studentName}</p>
              )}
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">
                Total Words: <span className="font-medium">{getTotalWordCount()}</span>
              </p>
              <p className="text-sm text-gray-600">
                Pages: <span className="font-medium">{pages.length}</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Pages Container */}
      <div className="max-w-4xl mx-auto space-y-8">
        {pages.map((pageContent, pageIndex) => (
          <Card
            key={pageIndex}
            className="bg-white shadow-lg mx-auto page-shadow"
            style={{
              width: `${PAGE_WIDTH}px`,
              height: `${PAGE_HEIGHT}px`,
              minHeight: `${PAGE_HEIGHT}px`
            }}
            onClick={() => focusPage(pageIndex)}
          >
            <div className="h-full flex flex-col relative">
              {/* Header */}
              {showHeader && (
                <div className="border-b border-gray-200 p-4 flex justify-between items-center">
                  <div className="text-sm text-gray-600">
                    {studentName && (
                      <span>{studentName}</span>
                    )}
                  </div>
                  <div className="text-sm text-gray-600">
                    {assignmentTitle && (
                      <span>{assignmentTitle}</span>
                    )}
                  </div>
                </div>
              )}

              {/* Content Area */}
              <div className="flex-1 p-8 relative">
                <textarea
                  ref={(el) => (textareaRefs.current[pageIndex] = el)}
                  className="w-full h-full resize-none border-none outline-none bg-transparent text-gray-900 leading-7 text-base font-serif"
                  style={{
                    fontFamily: "'Times New Roman', serif",
                    fontSize: "12pt",
                    lineHeight: "2.0"
                  }}
                  value={pageContent}
                  onChange={(e) => handlePageContentChange(pageIndex, e.target.value)}
                  placeholder={pageIndex === 0 ? "Start writing your document..." : ""}
                  spellCheck={true}
                />
              </div>

              {/* Footer */}
              {showPageNumbers && (
                <div className="border-t border-gray-200 p-3 text-center">
                  <div className="text-xs text-gray-500">
                    Page {pageIndex + 1} • {getPageWordCount(pageContent)} words • {getPageLineCount(pageContent)}/{LINES_PER_PAGE} lines
                  </div>
                </div>
              )}

              {/* Page Border Indicator */}
              <div className="absolute inset-0 border border-gray-200 pointer-events-none rounded-lg"></div>
            </div>
          </Card>
        ))}

        {/* Add New Page Button */}
        <div className="text-center">
          <Button
            onClick={addNewPage}
            variant="outline"
            className="bg-white shadow-sm hover:shadow-md transition-shadow"
          >
            + Add New Page
          </Button>
        </div>
      </div>

      {/* Document Stats */}
      <div className="max-w-4xl mx-auto mt-8">
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-blue-600">{pages.length}</div>
              <div className="text-sm text-gray-600">Pages</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">{getTotalWordCount()}</div>
              <div className="text-sm text-gray-600">Total Words</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-purple-600">
                {Math.ceil(content.length / CHARS_PER_PAGE)}
              </div>
              <div className="text-sm text-gray-600">Expected Pages</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}