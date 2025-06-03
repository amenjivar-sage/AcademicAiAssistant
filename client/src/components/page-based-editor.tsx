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
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSettings, setPageSettings] = useState<PageSettings>({
    headerText: '',
    footerText: '',
    showPageNumbers: true,
    showPageNumbersInHeader: false,
    showStudentName: false,
    studentName: '',
    namePosition: 'left',
    pageNumberPosition: 'right',
    headerPosition: 'center',
    footerPosition: 'center'
  });

  // Update page settings when headerFooterSettings prop changes
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
  
  // Calculate word count and total pages
  const wordCount = content.split(/\s+/).filter(word => word.length > 0).length;
  const totalPages = Math.max(1, Math.ceil(wordCount / wordsPerPage));
  
  // Auto-focus the textarea
  useEffect(() => {
    if (textareaRef.current && !disabled) {
      textareaRef.current.focus();
    }
  }, [disabled]);

  // Calculate approximate page breaks based on word count
  const getPageContent = (pageNumber: number) => {
    const words = content.split(/\s+/).filter(word => word.length > 0);
    const startIndex = (pageNumber - 1) * wordsPerPage;
    const endIndex = Math.min(startIndex + wordsPerPage, words.length);
    return words.slice(startIndex, endIndex).join(' ');
  };

  // Get all content up to a specific page
  const getContentUpToPage = (pageNumber: number) => {
    const words = content.split(/\s+/).filter(word => word.length > 0);
    const endIndex = pageNumber * wordsPerPage;
    return words.slice(0, endIndex).join(' ');
  };

  // Helper function to get alignment class
  const getAlignmentClass = (position: 'left' | 'center' | 'right') => {
    switch (position) {
      case 'left': return 'text-left';
      case 'center': return 'text-center';
      case 'right': return 'text-right';
      default: return 'text-left';
    }
  };

  // Helper function to render header/footer content with proper positioning
  const renderHeaderFooterContent = (
    studentName: string, 
    customText: string, 
    pageNumber: number, 
    namePosition: 'left' | 'center' | 'right',
    textPosition: 'left' | 'center' | 'right',
    numberPosition: 'left' | 'center' | 'right',
    showName: boolean,
    showText: boolean,
    showNumber: boolean
  ) => {
    const items = [];
    
    if (showName && studentName) {
      items.push({ content: studentName, position: namePosition, type: 'name' });
    }
    if (showText && customText) {
      items.push({ content: customText, position: textPosition, type: 'text' });
    }
    if (showNumber) {
      items.push({ content: pageNumber.toString(), position: numberPosition, type: 'number' });
    }

    const leftItems = items.filter(item => item.position === 'left');
    const centerItems = items.filter(item => item.position === 'center');
    const rightItems = items.filter(item => item.position === 'right');

    return (
      <div className="flex justify-between items-center text-sm text-gray-600">
        <div className="flex-1 text-left">
          {leftItems.map((item, index) => (
            <span key={index} className="block">
              {item.content}
            </span>
          ))}
        </div>
        <div className="flex-1 text-center">
          {centerItems.map((item, index) => (
            <span key={index} className="block">
              {item.content}
            </span>
          ))}
        </div>
        <div className="flex-1 text-right">
          {rightItems.map((item, index) => (
            <span key={index} className="block">
              {item.content}
            </span>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="w-full h-full bg-gray-100 overflow-auto">
      <div className="max-w-4xl mx-auto py-8 space-y-8">
        {/* Page Status Bar */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-gray-600" />
              <span className="text-sm font-medium text-gray-700">
                Document: {totalPages} page{totalPages !== 1 ? 's' : ''}
              </span>
              {totalPages > 1 && (
                <span className="text-sm text-blue-600 bg-blue-50 px-2 py-1 rounded">
                  Editing page {currentPage}
                </span>
              )}
            </div>
            <div className="flex items-center gap-4">
              {/* Page Navigation */}
              {totalPages > 1 && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </Button>
                  <span className="text-sm text-gray-500">
                    Page {currentPage} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </Button>
                </div>
              )}
              <div className="text-sm text-gray-500">
                {wordCount} words total (500 words per page)
              </div>
              
              {/* Page Settings Button */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Settings className="h-4 w-4" />
                    Page Settings
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80" align="end">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <h4 className="font-medium text-sm">Page Formatting</h4>
                      <p className="text-xs text-gray-500">
                        Customize headers, footers, and page numbering
                      </p>
                    </div>
                    
                    {/* Student Name */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="show-name" className="text-sm flex items-center gap-2">
                          <User className="h-4 w-4" />
                          Show Student Name
                        </Label>
                        <Switch
                          id="show-name"
                          checked={pageSettings.showStudentName}
                          onCheckedChange={(checked) => 
                            setPageSettings(prev => ({ ...prev, showStudentName: checked }))
                          }
                        />
                      </div>
                      {pageSettings.showStudentName && (
                        <div className="space-y-2">
                          <Input
                            placeholder="Enter your name"
                            value={pageSettings.studentName}
                            onChange={(e) => 
                              setPageSettings(prev => ({ ...prev, studentName: e.target.value }))
                            }
                            className="text-sm"
                          />
                          <div className="flex items-center gap-2">
                            <Label className="text-xs text-gray-500">Position:</Label>
                            <Select 
                              value={pageSettings.namePosition} 
                              onValueChange={(value: 'left' | 'center' | 'right') => 
                                setPageSettings(prev => ({ ...prev, namePosition: value }))
                              }
                            >
                              <SelectTrigger className="h-8 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="left">Left</SelectItem>
                                <SelectItem value="center">Center</SelectItem>
                                <SelectItem value="right">Right</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {/* Page Numbers */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="show-numbers" className="text-sm flex items-center gap-2">
                          <Hash className="h-4 w-4" />
                          Show Page Numbers (Footer)
                        </Label>
                        <Switch
                          id="show-numbers"
                          checked={pageSettings.showPageNumbers}
                          onCheckedChange={(checked) => 
                            setPageSettings(prev => ({ ...prev, showPageNumbers: checked }))
                          }
                        />
                      </div>
                      
                      {/* Page Numbers in Header */}
                      <div className="flex items-center justify-between">
                        <Label htmlFor="show-numbers-header" className="text-sm flex items-center gap-2 ml-6">
                          <Hash className="h-4 w-4" />
                          Show Page Numbers (Header)
                        </Label>
                        <Switch
                          id="show-numbers-header"
                          checked={pageSettings.showPageNumbersInHeader}
                          onCheckedChange={(checked) => 
                            setPageSettings(prev => ({ ...prev, showPageNumbersInHeader: checked }))
                          }
                        />
                      </div>
                      
                      {(pageSettings.showPageNumbers || pageSettings.showPageNumbersInHeader) && (
                        <div className="flex items-center gap-2">
                          <Label className="text-xs text-gray-500">Position:</Label>
                          <Select 
                            value={pageSettings.pageNumberPosition} 
                            onValueChange={(value: 'left' | 'center' | 'right') => 
                              setPageSettings(prev => ({ ...prev, pageNumberPosition: value }))
                            }
                          >
                            <SelectTrigger className="h-8 text-xs">
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
                    
                    {/* Custom Header */}
                    <div className="space-y-2">
                      <Label htmlFor="header-text" className="text-sm">
                        Header Text (optional)
                      </Label>
                      <Input
                        id="header-text"
                        placeholder="e.g., Course Name, Assignment Title"
                        value={pageSettings.headerText}
                        onChange={(e) => 
                          setPageSettings(prev => ({ ...prev, headerText: e.target.value }))
                        }
                        className="text-sm"
                      />
                      {pageSettings.headerText && (
                        <div className="flex items-center gap-2">
                          <Label className="text-xs text-gray-500">Position:</Label>
                          <Select 
                            value={pageSettings.headerPosition} 
                            onValueChange={(value: 'left' | 'center' | 'right') => 
                              setPageSettings(prev => ({ ...prev, headerPosition: value }))
                            }
                          >
                            <SelectTrigger className="h-8 text-xs">
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
                    
                    {/* Custom Footer */}
                    <div className="space-y-2">
                      <Label htmlFor="footer-text" className="text-sm">
                        Footer Text (optional)
                      </Label>
                      <Input
                        id="footer-text"
                        placeholder="e.g., Date, Class Period"
                        value={pageSettings.footerText}
                        onChange={(e) => 
                          setPageSettings(prev => ({ ...prev, footerText: e.target.value }))
                        }
                        className="text-sm"
                      />
                      {pageSettings.footerText && (
                        <div className="flex items-center gap-2">
                          <Label className="text-xs text-gray-500">Position:</Label>
                          <Select 
                            value={pageSettings.footerPosition} 
                            onValueChange={(value: 'left' | 'center' | 'right') => 
                              setPageSettings(prev => ({ ...prev, footerPosition: value }))
                            }
                          >
                            <SelectTrigger className="h-8 text-xs">
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
          </div>
        </div>

        {/* Generate pages */}
        {Array.from({ length: totalPages }, (_, index) => {
          const pageNumber = index + 1;
          const isLastPage = pageNumber === totalPages;
          const pageContent = getPageContent(pageNumber);
          const wordsOnPage = pageContent.split(/\s+/).filter(word => word.length > 0).length;
          
          return (
            <div key={pageNumber} className="page-container">
              {/* Page Header */}
              <div className="flex justify-between items-center mb-4 px-2">
                <div className="text-sm text-gray-500 font-medium">
                  Page {pageNumber}
                </div>
                <div className="text-sm text-gray-500">
                  {wordsOnPage} / {wordsPerPage} words
                </div>
              </div>

              {/* Page Content */}
              <div className="bg-white rounded-lg shadow-lg border border-gray-200 min-h-[11in] relative">
                {/* Header */}
                {(pageSettings.headerText || (pageSettings.showStudentName && pageSettings.studentName) || pageSettings.showPageNumbersInHeader) && (
                  <div className="px-16 pt-8 pb-4 border-b border-gray-200">
                    {renderHeaderFooterContent(
                      pageSettings.studentName,
                      pageSettings.headerText,
                      pageNumber,
                      pageSettings.namePosition,
                      pageSettings.headerPosition,
                      pageSettings.pageNumberPosition,
                      pageSettings.showStudentName,
                      !!pageSettings.headerText,
                      pageSettings.showPageNumbersInHeader
                    )}
                  </div>
                )}

                {/* Page margins and content area */}
                <div className={`px-16 ${(pageSettings.headerText || pageSettings.showStudentName) ? 'pt-8' : 'pt-16'} ${(pageSettings.footerText || pageSettings.showPageNumbers) ? 'pb-8' : 'pb-16'} min-h-[9in]`}>
                  {pageNumber === currentPage ? (
                    // Editable rich text editor for the selected page
                    <RichTextEditor
                      content={content}
                      onContentChange={onContentChange}
                      placeholder={pageNumber === 1 ? placeholder : "Continue writing..."}
                      disabled={disabled}
                      onFormatRef={onFormatRef}
                      className="w-full h-full min-h-[9in] resize-none border-none outline-none bg-transparent text-gray-900"
                      style={{
                        fontFamily: 'Times New Roman, serif',
                        fontSize: '12pt',
                        lineHeight: '2.0',
                        letterSpacing: '0.2px'
                      }}
                    />
                  ) : (
                    // Clickable content for other pages - allows editing any page
                    <div 
                      className="w-full h-full min-h-[9in] text-gray-800 cursor-pointer hover:bg-gray-50 transition-colors rounded p-2"
                      onClick={() => setCurrentPage(pageNumber)}
                      style={{
                        fontFamily: 'Times New Roman, serif',
                        fontSize: '12pt',
                        lineHeight: '2.0',
                        letterSpacing: '0.2px',
                        whiteSpace: 'pre-wrap'
                      }}
                      title="Click to edit this page"
                    >
                      {getContentUpToPage(pageNumber).split(' ').slice((pageNumber - 1) * wordsPerPage, pageNumber * wordsPerPage).join(' ')}
                      {/* Edit indicator */}
                      <div className="absolute top-4 right-4 opacity-0 hover:opacity-100 transition-opacity">
                        <span className="text-xs bg-blue-500 text-white px-2 py-1 rounded">Click to edit</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer */}
                {(pageSettings.footerText || pageSettings.showPageNumbers) && (
                  <div className="absolute bottom-8 left-16 right-16">
                    <div className="border-t border-gray-200 pt-4">
                      {renderHeaderFooterContent(
                        pageSettings.studentName,
                        pageSettings.footerText,
                        pageNumber,
                        pageSettings.namePosition,
                        pageSettings.footerPosition,
                        pageSettings.pageNumberPosition,
                        false, // Don't show student name in footer unless specifically configured
                        !!pageSettings.footerText,
                        pageSettings.showPageNumbers
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Page Break Indicator */}
              {pageNumber < totalPages && (
                <div className="flex items-center justify-center py-4">
                  <div className="border-t border-dashed border-gray-400 flex-1"></div>
                  <span className="px-4 text-xs text-gray-500 bg-gray-100 rounded-full">
                    Page Break
                  </span>
                  <div className="border-t border-dashed border-gray-400 flex-1"></div>
                </div>
              )}
            </div>
          );
        })}

        {/* Add new page indicator when close to word limit */}
        {wordCount > (totalPages - 1) * wordsPerPage + wordsPerPage * 0.8 && (
          <div className="text-center py-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
              <FileText className="h-4 w-4" />
              New page will be created automatically as you continue writing
            </div>
          </div>
        )}
      </div>
    </div>
  );
}