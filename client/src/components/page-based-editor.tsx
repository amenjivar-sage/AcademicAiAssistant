import React, { useRef, useEffect, useState } from 'react';
import { FileText, Settings, User, Hash, Save, Check } from 'lucide-react';
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

  // Saved settings state
  const [savedSettings, setSavedSettings] = useState<PageSettings | null>(null);
  const [showSaveSuccess, setShowSaveSuccess] = useState(false);

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

  // Save current page settings
  const handleSaveSettings = () => {
    setSavedSettings({ ...pageSettings });
    setShowSaveSuccess(true);
    
    // Auto-hide success message after 2 seconds
    setTimeout(() => {
      setShowSaveSuccess(false);
    }, 2000);
  };
  
  // Calculate word count and page breaks
  const words = content.trim().split(/\s+/).filter(word => word.length > 0);
  const wordCount = words.length;
  
  // Calculate pages and page break positions with proper spacing
  const estimatedPages = Math.max(1, Math.ceil(wordCount / wordsPerPage));
  const pageBreaks: Array<{
    pageNumber: number;
    wordPosition: number;
    charPosition: number;
    estimatedLinePosition: number;
  }> = [];
  
  // Only create page breaks when content actually exceeds page capacity
  if (wordCount > wordsPerPage) {
    for (let page = 1; page < estimatedPages; page++) {
      const wordsAtPageBreak = page * wordsPerPage; // 500, 1000, 1500, etc.
      
      // Only add page break if we actually have content that goes to next page
      if (wordsAtPageBreak < wordCount) {
        const wordsBeforeBreak = words.slice(0, wordsAtPageBreak);
        const textBeforeBreak = wordsBeforeBreak.join(' ');
        
        // Calculate realistic positioning based on actual text flow
        const estimatedLines = Math.ceil(wordsAtPageBreak / 11); // ~11 words per line
        const lineHeight = 28; // Standard double-spaced line height
        const topMargin = 70; // Account for header space
        const estimatedPixelPosition = topMargin + (estimatedLines * lineHeight);
        
        pageBreaks.push({
          pageNumber: page + 1,
          wordPosition: wordsAtPageBreak,
          charPosition: textBeforeBreak.length,
          estimatedLinePosition: estimatedPixelPosition
        });
      }
    }
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
            <PopoverContent className="w-80 max-h-96 overflow-y-auto">
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

                {/* Save Button */}
                <div className="flex items-center justify-between pt-4 border-t border-gray-200 bg-gray-50 -mx-6 -mb-6 px-6 py-4 rounded-b-lg">
                  <div className="text-xs text-gray-500">
                    {savedSettings ? '✓ Settings saved' : '⚠ Settings not saved'}
                  </div>
                  <Button
                    onClick={handleSaveSettings}
                    size="sm"
                    variant={showSaveSuccess ? "default" : "outline"}
                    className="flex items-center gap-2"
                  >
                    {showSaveSuccess ? (
                      <>
                        <Check className="h-4 w-4" />
                        Saved!
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4" />
                        Save Settings
                      </>
                    )}
                  </Button>
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
          {(savedSettings && (savedSettings.headerText || (savedSettings.showStudentName && savedSettings.studentName) || savedSettings.showPageNumbersInHeader)) && (
            <div className="px-16 pt-8 pb-4 border-b border-gray-200">
              <div className="flex justify-between items-center w-full text-sm text-gray-600">
                <div className="flex-1 text-left">
                  {savedSettings.showStudentName && savedSettings.namePosition === 'left' && (
                    <span className="mr-2">{savedSettings.studentName}</span>
                  )}
                  {savedSettings.headerText && savedSettings.headerPosition === 'left' && (
                    <span className="mr-2">{savedSettings.headerText}</span>
                  )}
                  {savedSettings.showPageNumbersInHeader && savedSettings.pageNumberPosition === 'left' && (
                    <span className="mr-2">1</span>
                  )}
                </div>
                <div className="flex-1 text-center">
                  {savedSettings.showStudentName && savedSettings.namePosition === 'center' && (
                    <span className="mx-1">{savedSettings.studentName}</span>
                  )}
                  {savedSettings.headerText && savedSettings.headerPosition === 'center' && (
                    <span className="mx-1">{savedSettings.headerText}</span>
                  )}
                  {savedSettings.showPageNumbersInHeader && savedSettings.pageNumberPosition === 'center' && (
                    <span className="mx-1">1</span>
                  )}
                </div>
                <div className="flex-1 text-right">
                  {savedSettings.showStudentName && savedSettings.namePosition === 'right' && (
                    <span className="ml-2">{savedSettings.studentName}</span>
                  )}
                  {savedSettings.headerText && savedSettings.headerPosition === 'right' && (
                    <span className="ml-2">{savedSettings.headerText}</span>
                  )}
                  {savedSettings.showPageNumbersInHeader && savedSettings.pageNumberPosition === 'right' && (
                    <span className="ml-2">1</span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Content Area with Visual Page Breaks */}
          <div className={`px-16 ${(pageSettings.headerText || pageSettings.showStudentName) ? 'pt-8' : 'pt-16'} ${(pageSettings.footerText || pageSettings.showPageNumbers) ? 'pb-8' : 'pb-16'} min-h-[9in] relative`}>
            {/* Page Break Visual Separators */}
            {pageBreaks.map((pageBreak, index) => {
              // Calculate position based on the exact 500-word mark
              const wordsPerLine = 11;
              const lineHeight = 28;
              const topMargin = 80;
              
              // Position page break at exactly where 500 words would end
              const linesForPageBreak = Math.ceil(pageBreak.wordPosition / wordsPerLine);
              const calculatedPosition = topMargin + (linesForPageBreak * lineHeight);
              
              // Constrain to visible content area
              const maxContentPosition = 650;
              const finalPosition = Math.min(calculatedPosition, maxContentPosition);
              
              return (
                <div
                  key={index}
                  className="absolute left-0 right-0 z-1 pointer-events-none"
                  style={{
                    top: `${finalPosition}px`,
                    height: '20px',
                    margin: '0 64px'
                  }}
                >
                  {/* Clean page separator */}
                  <div className="h-full bg-gray-100 border-t border-b border-gray-250 shadow-sm flex items-center justify-center">
                    <div className="w-20 h-px bg-gray-400 opacity-60"></div>
                  </div>
                </div>
              );
            })}
            
            <RichTextEditor
              content={content}
              onContentChange={handleContentChange}
              placeholder={placeholder}
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
          {(savedSettings && (savedSettings.footerText || savedSettings.showPageNumbers)) && (
            <div className="absolute bottom-8 left-16 right-16 z-20">
              <div className="border-t border-gray-200 pt-4 bg-white">
                <div className="flex justify-between items-center w-full text-sm text-gray-600">
                  <div className="flex-1 text-left">
                    {savedSettings.footerText && savedSettings.footerPosition === 'left' && (
                      <span className="mr-2">{savedSettings.footerText}</span>
                    )}
                    {savedSettings.showPageNumbers && savedSettings.pageNumberPosition === 'left' && (
                      <span className="mr-2">{estimatedPages}</span>
                    )}
                  </div>
                  <div className="flex-1 text-center">
                    {savedSettings.footerText && savedSettings.footerPosition === 'center' && (
                      <span className="mx-1">{savedSettings.footerText}</span>
                    )}
                    {savedSettings.showPageNumbers && savedSettings.pageNumberPosition === 'center' && (
                      <span className="mx-1">{estimatedPages}</span>
                    )}
                  </div>
                  <div className="flex-1 text-right">
                    {savedSettings.footerText && savedSettings.footerPosition === 'right' && (
                      <span className="ml-2">{savedSettings.footerText}</span>
                    )}
                    {savedSettings.showPageNumbers && savedSettings.pageNumberPosition === 'right' && (
                      <span className="ml-2">{estimatedPages}</span>
                    )}
                  </div>
                </div>
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