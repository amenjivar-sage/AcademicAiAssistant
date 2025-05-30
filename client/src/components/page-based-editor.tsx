import React, { useRef, useEffect, useState } from 'react';
import { FileText, Settings, User, Hash } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface PageBasedEditorProps {
  content: string;
  onContentChange: (content: string) => void;
  disabled?: boolean;
  placeholder?: string;
  wordsPerPage?: number;
}

interface PageSettings {
  headerText: string;
  footerText: string;
  showPageNumbers: boolean;
  showStudentName: boolean;
  studentName: string;
}

export default function PageBasedEditor({
  content,
  onContentChange,
  disabled = false,
  placeholder = "Start writing...",
  wordsPerPage = 250
}: PageBasedEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSettings, setPageSettings] = useState<PageSettings>({
    headerText: '',
    footerText: '',
    showPageNumbers: true,
    showStudentName: false,
    studentName: ''
  });
  
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
            </div>
            <div className="flex items-center gap-4">
              <div className="text-sm text-gray-500">
                {wordCount} words total
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
                        <Input
                          placeholder="Enter your name"
                          value={pageSettings.studentName}
                          onChange={(e) => 
                            setPageSettings(prev => ({ ...prev, studentName: e.target.value }))
                          }
                          className="text-sm"
                        />
                      )}
                    </div>
                    
                    {/* Page Numbers */}
                    <div className="flex items-center justify-between">
                      <Label htmlFor="show-numbers" className="text-sm flex items-center gap-2">
                        <Hash className="h-4 w-4" />
                        Show Page Numbers
                      </Label>
                      <Switch
                        id="show-numbers"
                        checked={pageSettings.showPageNumbers}
                        onCheckedChange={(checked) => 
                          setPageSettings(prev => ({ ...prev, showPageNumbers: checked }))
                        }
                      />
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
                {(pageSettings.headerText || pageSettings.showStudentName) && (
                  <div className="px-16 pt-8 pb-4 border-b border-gray-200">
                    <div className="flex justify-between items-center text-sm text-gray-600">
                      <div>
                        {pageSettings.showStudentName && pageSettings.studentName && (
                          <span>{pageSettings.studentName}</span>
                        )}
                      </div>
                      <div>
                        {pageSettings.headerText && (
                          <span>{pageSettings.headerText}</span>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Page margins and content area */}
                <div className={`px-16 ${(pageSettings.headerText || pageSettings.showStudentName) ? 'pt-8' : 'pt-16'} ${(pageSettings.footerText || pageSettings.showPageNumbers) ? 'pb-8' : 'pb-16'} min-h-[9in]`}>
                  {isLastPage ? (
                    // Editable textarea for the current/last page
                    <textarea
                      ref={textareaRef}
                      value={content}
                      onChange={(e) => onContentChange(e.target.value)}
                      placeholder={pageNumber === 1 ? placeholder : "Continue writing..."}
                      disabled={disabled}
                      className="w-full h-full min-h-[9in] resize-none border-none outline-none bg-transparent text-gray-900"
                      style={{
                        fontFamily: 'Times New Roman, serif',
                        fontSize: '12pt',
                        lineHeight: '2.0',
                        letterSpacing: '0.2px'
                      }}
                    />
                  ) : (
                    // Read-only content for previous pages
                    <div 
                      className="w-full h-full min-h-[9in] text-gray-800"
                      style={{
                        fontFamily: 'Times New Roman, serif',
                        fontSize: '12pt',
                        lineHeight: '2.0',
                        letterSpacing: '0.2px',
                        whiteSpace: 'pre-wrap'
                      }}
                    >
                      {getContentUpToPage(pageNumber).split(' ').slice((pageNumber - 1) * wordsPerPage, pageNumber * wordsPerPage).join(' ')}
                    </div>
                  )}
                </div>

                {/* Footer */}
                {(pageSettings.footerText || pageSettings.showPageNumbers) && (
                  <div className="absolute bottom-8 left-16 right-16">
                    <div className="border-t border-gray-200 pt-4">
                      <div className="flex justify-between items-center text-sm text-gray-600">
                        <div>
                          {pageSettings.footerText && (
                            <span>{pageSettings.footerText}</span>
                          )}
                        </div>
                        <div>
                          {pageSettings.showPageNumbers && (
                            <span>{pageNumber}</span>
                          )}
                        </div>
                      </div>
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