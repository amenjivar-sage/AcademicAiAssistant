import React, { useRef, useEffect, useState } from 'react';
import { FileText, Settings, User, Hash } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import RichTextEditor from './rich-text-editor';

interface PageBasedEditorProps {
  content: string;
  onContentChange: (content: string) => void;
  disabled?: boolean;
  placeholder?: string;
  wordsPerPage?: number;
  onFormatRef?: React.MutableRefObject<((command: string, value?: string) => void) | null>;
  headerFooterSettings?: {
    header: string;
    footer: string;
    pageNumbers: boolean;
  };
}

interface PageSettings {
  headerText: string;
  footerText: string;
  showPageNumbers: boolean;
  showPageNumbersInHeader: boolean;
  showStudentName: boolean;
  studentName: string;
  namePosition: 'left' | 'center' | 'right';
  pageNumberPosition: 'left' | 'center' | 'right';
  headerPosition: 'left' | 'center' | 'right';
  footerPosition: 'left' | 'center' | 'right';
}

export default function PageBasedEditor({
  content,
  onContentChange,
  disabled = false,
  placeholder = "Start writing...",
  wordsPerPage = 500,
  onFormatRef,
  headerFooterSettings
}: PageBasedEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [pageSettings, setPageSettings] = useState<PageSettings>({
    headerText: '',
    footerText: '',
    showPageNumbers: true,
    showPageNumbersInHeader: false,
    showStudentName: true,
    studentName: 'Student Name',
    namePosition: 'left',
    pageNumberPosition: 'center',
    headerPosition: 'center',
    footerPosition: 'center'
  });

  // Update page settings based on headerFooterSettings prop
  useEffect(() => {
    if (headerFooterSettings) {
      setPageSettings(prev => ({
        ...prev,
        headerText: headerFooterSettings.header,
        footerText: headerFooterSettings.footer,
        showPageNumbers: headerFooterSettings.pageNumbers
      }));
    }
  }, [headerFooterSettings]);
  
  // Calculate word count and page breaks
  const words = content.trim().split(/\s+/).filter(word => word.length > 0);
  const wordCount = words.length;
  
  // Calculate pages and page break positions
  const estimatedPages = Math.max(1, Math.ceil(wordCount / wordsPerPage));
  const pageBreaks: Array<{
    pageNumber: number;
    wordPosition: number;
    charPosition: number;
    estimatedLinePosition: number;
  }> = [];
  
  // Calculate approximate page break positions in the content
  for (let page = 1; page < estimatedPages; page++) {
    const wordsInPage = page * wordsPerPage;
    const wordsBeforeBreak = words.slice(0, wordsInPage);
    const textBeforeBreak = wordsBeforeBreak.join(' ');
    
    // More accurate positioning based on line count and word wrapping
    const avgCharsPerLine = 70; // More accurate for Times New Roman 12pt with margins
    const approximateLines = Math.floor(textBeforeBreak.length / avgCharsPerLine);
    const lineHeight = 32; // Double spacing line height in pixels
    const topPadding = 64; // Account for header padding
    const estimatedPixelPosition = topPadding + (approximateLines * lineHeight);
    
    pageBreaks.push({
      pageNumber: page + 1,
      wordPosition: wordsInPage,
      charPosition: textBeforeBreak.length,
      estimatedLinePosition: estimatedPixelPosition
    });
  }
  
  // Debug logging for word count tracking
  console.log('Page editor with visual breaks:', {
    contentLength: content.length,
    actualWordCount: wordCount,
    estimatedPages,
    pageBreaks: pageBreaks.length,
    contentPreview: content.substring(0, 100) + '...'
  });

  // Auto-focus the textarea
  useEffect(() => {
    if (textareaRef.current && !disabled) {
      textareaRef.current.focus();
    }
  }, [disabled]);

  // Handle content changes
  const handleContentChange = (newContent: string) => {
    onContentChange(newContent);
  };

  // Function to insert visual page breaks into content for display
  const insertVisualPageBreaks = (text: string) => {
    if (pageBreaks.length === 0) return text;
    
    let result = text;
    let offset = 0;
    
    // Insert page break markers from end to beginning to maintain positions
    for (let i = pageBreaks.length - 1; i >= 0; i--) {
      const pageBreak = pageBreaks[i];
      const insertPos = pageBreak.charPosition + offset;
      
      if (insertPos <= result.length) {
        const pageBreakMarker = `\n\n--- PAGE ${pageBreak.pageNumber} BEGINS ---\n\n`;
        result = result.slice(0, insertPos) + pageBreakMarker + result.slice(insertPos);
        offset += pageBreakMarker.length;
      }
    }
    
    return result;
  };

  // Render header/footer content with proper alignment
  const renderHeaderFooterContent = (
    studentName: string,
    customText: string,
    pageNumber: number,
    namePosition: string,
    textPosition: string,
    numberPosition: string,
    showName: boolean,
    showText: boolean,
    showNumber: boolean
  ) => {
    const elements = [];
    
    if (showName) {
      elements.push({ type: 'name', content: studentName, position: namePosition });
    }
    if (showText && customText) {
      elements.push({ type: 'text', content: customText, position: textPosition });
    }
    if (showNumber) {
      elements.push({ type: 'number', content: `${pageNumber}`, position: numberPosition });
    }

    const leftItems = elements.filter(e => e.position === 'left');
    const centerItems = elements.filter(e => e.position === 'center');
    const rightItems = elements.filter(e => e.position === 'right');

    return (
      <div className="flex justify-between items-center w-full text-sm text-gray-600">
        <div className="flex-1 text-left">
          {leftItems.map((item, idx) => (
            <span key={idx} className="mr-2">{item.content}</span>
          ))}
        </div>
        <div className="flex-1 text-center">
          {centerItems.map((item, idx) => (
            <span key={idx} className="mx-1">{item.content}</span>
          ))}
        </div>
        <div className="flex-1 text-right">
          {rightItems.map((item, idx) => (
            <span key={idx} className="ml-2">{item.content}</span>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Page Settings Panel */}
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-gray-600" />
            <span className="font-medium text-gray-900">Document Format</span>
          </div>
          
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm">
                <Settings className="h-4 w-4 mr-2" />
                Page Settings
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80">
              <div className="space-y-4">
                <div className="font-medium text-sm">Header & Footer Options</div>
                
                {/* Student Name Settings */}
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="show-name"
                      checked={pageSettings.showStudentName}
                      onCheckedChange={(checked) => 
                        setPageSettings(prev => ({ ...prev, showStudentName: checked }))
                      }
                    />
                    <Label htmlFor="show-name" className="text-sm">Show student name</Label>
                  </div>
                  {pageSettings.showStudentName && (
                    <div className="ml-6 space-y-2">
                      <Input
                        placeholder="Student Name"
                        value={pageSettings.studentName}
                        onChange={(e) => 
                          setPageSettings(prev => ({ ...prev, studentName: e.target.value }))
                        }
                      />
                      <Select 
                        value={pageSettings.namePosition} 
                        onValueChange={(value: 'left' | 'center' | 'right') => 
                          setPageSettings(prev => ({ ...prev, namePosition: value }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="left">Left</SelectItem>
                          <SelectItem value="center">Center</SelectItem>
                          <SelectItem value="right">Right</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

                {/* Header Text */}
                <div className="space-y-2">
                  <Label className="text-sm">Header text</Label>
                  <Input
                    placeholder="Header text (optional)"
                    value={pageSettings.headerText}
                    onChange={(e) => 
                      setPageSettings(prev => ({ ...prev, headerText: e.target.value }))
                    }
                  />
                  {pageSettings.headerText && (
                    <Select 
                      value={pageSettings.headerPosition} 
                      onValueChange={(value: 'left' | 'center' | 'right') => 
                        setPageSettings(prev => ({ ...prev, headerPosition: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="left">Left</SelectItem>
                        <SelectItem value="center">Center</SelectItem>
                        <SelectItem value="right">Right</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </div>

                {/* Footer Text */}
                <div className="space-y-2">
                  <Label className="text-sm">Footer text</Label>
                  <Input
                    placeholder="Footer text (optional)"
                    value={pageSettings.footerText}
                    onChange={(e) => 
                      setPageSettings(prev => ({ ...prev, footerText: e.target.value }))
                    }
                  />
                  {pageSettings.footerText && (
                    <Select 
                      value={pageSettings.footerPosition} 
                      onValueChange={(value: 'left' | 'center' | 'right') => 
                        setPageSettings(prev => ({ ...prev, footerPosition: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="left">Left</SelectItem>
                        <SelectItem value="center">Center</SelectItem>
                        <SelectItem value="right">Right</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </div>

                {/* Page Numbers */}
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="show-page-numbers"
                      checked={pageSettings.showPageNumbers}
                      onCheckedChange={(checked) => 
                        setPageSettings(prev => ({ ...prev, showPageNumbers: checked }))
                      }
                    />
                    <Label htmlFor="show-page-numbers" className="text-sm">Page numbers</Label>
                  </div>
                  {pageSettings.showPageNumbers && (
                    <div className="ml-6 space-y-2">
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="page-numbers-header"
                          checked={pageSettings.showPageNumbersInHeader}
                          onCheckedChange={(checked) => 
                            setPageSettings(prev => ({ ...prev, showPageNumbersInHeader: checked }))
                          }
                        />
                        <Label htmlFor="page-numbers-header" className="text-sm">In header</Label>
                      </div>
                      <Select 
                        value={pageSettings.pageNumberPosition} 
                        onValueChange={(value: 'left' | 'center' | 'right') => 
                          setPageSettings(prev => ({ ...prev, pageNumberPosition: value }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="left">Left</SelectItem>
                          <SelectItem value="center">Center</SelectItem>
                          <SelectItem value="right">Right</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {/* Word Count Display */}
        <div className="flex items-center gap-4 text-sm text-gray-600">
          <div className="flex items-center gap-1">
            <Hash className="h-4 w-4" />
            <span>{wordCount} words</span>
          </div>
          <div className="flex items-center gap-1">
            <FileText className="h-4 w-4" />
            <span>{estimatedPages} estimated {estimatedPages === 1 ? 'page' : 'pages'}</span>
          </div>
        </div>
      </div>

      {/* Google Docs Style Continuous Editor */}
      <div className="page-container">
        <div className="bg-white rounded-lg shadow-lg border border-gray-200 min-h-[11in] relative">
          {/* Header */}
          {(pageSettings.headerText || (pageSettings.showStudentName && pageSettings.studentName) || pageSettings.showPageNumbersInHeader) && (
            <div className="px-16 pt-8 pb-4 border-b border-gray-200">
              {renderHeaderFooterContent(
                pageSettings.studentName,
                pageSettings.headerText,
                1,
                pageSettings.namePosition,
                pageSettings.headerPosition,
                pageSettings.pageNumberPosition,
                pageSettings.showStudentName,
                !!pageSettings.headerText,
                pageSettings.showPageNumbersInHeader
              )}
            </div>
          )}

          {/* Content Area with Visual Page Breaks */}
          <div className={`px-16 ${(pageSettings.headerText || pageSettings.showStudentName) ? 'pt-8' : 'pt-16'} ${(pageSettings.footerText || pageSettings.showPageNumbers) ? 'pb-8' : 'pb-16'} min-h-[9in] relative`}>
            {/* Page Break Visual Separators - Like Word's page gaps */}
            {pageBreaks.map((pageBreak, index) => (
              <div
                key={index}
                className="absolute left-0 right-0 z-10 pointer-events-none"
                style={{
                  top: `${pageBreak.estimatedLinePosition}px`,
                  height: '30px',
                  transform: 'translateY(-15px)'
                }}
              >
                {/* Empty space between pages with subtle shadow */}
                <div className="h-full bg-gray-50 shadow-inner border-t border-b border-gray-200">
                  {/* Optional: subtle page break line */}
                  <div className="absolute top-1/2 left-1/4 right-1/4 border-t border-gray-300 opacity-30"></div>
                </div>
              </div>
            ))}
            
            <RichTextEditor
              content={content}
              onContentChange={handleContentChange}
              placeholder={placeholder}
              disabled={disabled}
              onFormatRef={onFormatRef}
              className="w-full h-full min-h-[9in] resize-none border-none outline-none bg-transparent text-gray-900 relative z-0"
              style={{
                fontFamily: 'Times New Roman, serif',
                fontSize: '12pt',
                lineHeight: '2.0',
                letterSpacing: '0.2px'
              }}
            />
          </div>

          {/* Footer */}
          {(pageSettings.footerText || pageSettings.showPageNumbers) && (
            <div className="absolute bottom-8 left-16 right-16">
              <div className="border-t border-gray-200 pt-4">
                {renderHeaderFooterContent(
                  pageSettings.studentName,
                  pageSettings.footerText,
                  estimatedPages,
                  pageSettings.namePosition,
                  pageSettings.footerPosition,
                  pageSettings.pageNumberPosition,
                  false,
                  !!pageSettings.footerText,
                  pageSettings.showPageNumbers
                )}
              </div>
            </div>
          )}
        </div>
      </div>



      {/* Document Summary */}
      <div className="text-center py-4">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
          <FileText className="h-4 w-4" />
          Document: {wordCount} words ({estimatedPages} estimated pages) - No word limits per page
        </div>
      </div>
    </div>
  );
}