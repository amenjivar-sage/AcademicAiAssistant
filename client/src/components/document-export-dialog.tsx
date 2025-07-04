import { useState } from 'react';
import { Download, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Document, Packer, Paragraph, TextRun, Header, Footer, AlignmentType, HeadingLevel, PageNumber } from 'docx';
import { saveAs } from 'file-saver';

interface DocumentExportDialogProps {
  content: string;
  studentName?: string;
  assignmentTitle?: string;
  submissionDate?: string;
  className?: string;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg';
}

export default function DocumentExportDialog({
  content,
  studentName = 'Student',
  assignmentTitle = 'Assignment',
  submissionDate,
  className,
  variant = 'outline',
  size = 'sm'
}: DocumentExportDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [settings, setSettings] = useState({
    headerText: '',
    footerText: '',
    showPageNumbers: true,
    pageNumberPosition: 'center' as 'left' | 'center' | 'right',
    includeStudentName: true,
    includeDate: false,
    includeAssignmentTitle: false
  });

  const generateWordDocument = async () => {
    setIsExporting(true);
    try {
      console.log('Export Debug - Student Name:', studentName);
      console.log('Export Debug - Settings:', settings);
      console.log('Export Debug - Custom Header Text Length:', settings.headerText?.length);
      console.log('Export Debug - Custom Header Text Value:', `"${settings.headerText}"`);
      console.log('Export Debug - Will use custom header:', !!(settings.headerText && settings.headerText.trim()));
      // Clean and parse HTML content more thoroughly
      console.log('Export Debug - Original content length:', content.length);
      console.log('Export Debug - Original content sample:', content.substring(0, 200));
      
      // Parse HTML content and convert to Word formatting
      const parseHtmlToWordParagraphs = (html: string): Paragraph[] => {
        // Create a temporary DOM element to parse HTML
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;
        
        const paragraphs: Paragraph[] = [];
        
        // Process each paragraph element
        const paragraphElements = tempDiv.querySelectorAll('p');
        
        if (paragraphElements.length === 0) {
          // If no <p> tags, treat as single paragraph
          const textRuns = parseTextWithFormatting(tempDiv);
          if (textRuns.length > 0) {
            paragraphs.push(new Paragraph({
              children: textRuns,
              spacing: { 
                line: 480, // Double spacing in TWIPS (240 TWIPS = single, 480 = double)
                lineRule: "auto",
                after: 0
              },
              indent: {
                firstLine: 720 // First line indent (0.5 inch)
              }
            }));
          }
        } else {
          paragraphElements.forEach((p) => {
            const textRuns = parseTextWithFormatting(p);
            
            if (textRuns.length === 0) {
              // Empty paragraph
              paragraphs.push(new Paragraph({
                children: [new TextRun({ text: '' })],
                spacing: { after: 200 }
              }));
            } else {
              paragraphs.push(new Paragraph({
                children: textRuns,
                spacing: { 
                  line: 480, // Double spacing in TWIPS (240 TWIPS = single, 480 = double)
                  lineRule: "auto",
                  after: 0
                },
                indent: {
                  firstLine: 720 // First line indent (0.5 inch)
                }
              }));
            }
          });
        }
        
        return paragraphs;
      };
      
      // Function to parse text with formatting (bold, italic, underline)
      const parseTextWithFormatting = (element: Element): TextRun[] => {
        const textRuns: TextRun[] = [];
        
        const processNode = (node: Node, inheritedFormatting: any = {}) => {
          if (node.nodeType === Node.TEXT_NODE) {
            const text = node.textContent || '';
            if (text.trim()) {
              textRuns.push(new TextRun({
                text: text,
                size: 24, // 12pt in half-points
                font: 'Times New Roman',
                bold: inheritedFormatting.bold || false,
                italics: inheritedFormatting.italics || false,
                underline: inheritedFormatting.underline ? {} : undefined
              }));
            }
          } else if (node.nodeType === Node.ELEMENT_NODE) {
            const elem = node as Element;
            const tagName = elem.tagName.toLowerCase();
            
            // Determine formatting based on tag
            const formatting = { ...inheritedFormatting };
            
            switch (tagName) {
              case 'strong':
              case 'b':
                formatting.bold = true;
                break;
              case 'em':
              case 'i':
                formatting.italics = true;
                break;
              case 'u':
                formatting.underline = true;
                break;
              case 'br':
                textRuns.push(new TextRun({ text: '\n', size: 24, font: 'Times New Roman' }));
                return;
            }
            
            // Process child nodes
            Array.from(elem.childNodes).forEach(child => {
              processNode(child, formatting);
            });
          }
        };
        
        Array.from(element.childNodes).forEach(child => {
          processNode(child);
        });
        
        return textRuns;
      };

      const paragraphs = parseHtmlToWordParagraphs(content);

      // Create header content - prioritize custom header text
      const headerParagraphs = [];
      
      console.log('Header Debug - Custom text:', settings.headerText);
      console.log('Header Debug - Trimmed:', settings.headerText?.trim());
      console.log('Header Debug - Has custom text:', !!(settings.headerText && settings.headerText.trim()));
      
      // If custom header text is provided, use only that
      if (settings.headerText && settings.headerText.trim()) {
        console.log('Header Debug - Adding custom header:', settings.headerText);
        headerParagraphs.push(
          new Paragraph({
            children: [new TextRun({ text: settings.headerText, size: 20 })],
            alignment: AlignmentType.LEFT
          })
        );
      } 
      // Otherwise, build header from selected components
      else if (settings.includeStudentName || settings.includeAssignmentTitle || settings.includeDate) {
        const headerElements = [];
        
        if (settings.includeStudentName) {
          headerElements.push(new TextRun({ text: studentName, size: 20 }));
        }
        
        if (settings.includeAssignmentTitle && assignmentTitle) {
          if (headerElements.length > 0) headerElements.push(new TextRun({ text: ' - ', size: 20 }));
          headerElements.push(new TextRun({ text: assignmentTitle, size: 20 }));
        }
        
        if (settings.includeDate && submissionDate) {
          if (headerElements.length > 0) headerElements.push(new TextRun({ text: ' - ', size: 20 }));
          headerElements.push(new TextRun({ text: submissionDate, size: 20 }));
        }

        if (headerElements.length > 0) {
          headerParagraphs.push(
            new Paragraph({
              children: headerElements,
              alignment: AlignmentType.LEFT
            })
          );
        }
      }

      // Create footer content with page numbers
      const footerParagraphs = [];
      if (settings.footerText || settings.showPageNumbers) {
        const footerChildren = [];
        
        if (settings.footerText) {
          footerChildren.push(new TextRun({ text: settings.footerText, size: 20 }));
        }
        
        if (settings.showPageNumbers) {
          if (footerChildren.length > 0) {
            footerChildren.push(new TextRun({ text: ' - Page ', size: 20 }));
          } else {
            footerChildren.push(new TextRun({ text: 'Page ', size: 20 }));
          }
          footerChildren.push(new TextRun({
            text: 'PAGE_NUMBER',
            size: 20
          }));
        }

        const alignment = settings.pageNumberPosition === 'left' 
          ? AlignmentType.LEFT 
          : settings.pageNumberPosition === 'right' 
          ? AlignmentType.RIGHT 
          : AlignmentType.CENTER;

        footerParagraphs.push(
          new Paragraph({
            children: footerChildren,
            alignment: alignment
          })
        );
      }

      // Create the document
      const doc = new Document({
        sections: [{
          properties: {
            page: {
              margin: {
                top: 1440,    // 1 inch
                right: 1440,  // 1 inch
                bottom: 1440, // 1 inch
                left: 1440    // 1 inch
              }
            }
          },
          headers: headerParagraphs.length > 0 ? {
            default: new Header({
              children: headerParagraphs
            })
          } : undefined,
          footers: footerParagraphs.length > 0 ? {
            default: new Footer({
              children: footerParagraphs
            })
          } : undefined,
          children: paragraphs
        }]
      });

      // Generate and save the document
      const blob = await Packer.toBlob(doc);
      
      // Use custom header text for filename if provided, otherwise use student name
      const nameForFile = (settings.headerText && settings.headerText.trim()) 
        ? settings.headerText.trim() 
        : studentName;
      const fileName = `${nameForFile.replace(/[^a-zA-Z0-9]/g, '_')}_${assignmentTitle.replace(/[^a-zA-Z0-9]/g, '_')}.docx`;
      console.log('Export Debug - Generated filename:', fileName);
      saveAs(blob, fileName);
      
      setIsOpen(false);

    } catch (error) {
      console.error('Error generating Word document:', error);
      alert('Failed to generate Word document. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  // Don't show download button if there's no content
  if (!content || content.trim().length === 0) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant={variant}
          size={size}
          className={className}
        >
          <Download className="h-4 w-4 mr-2" />
          Download Word Doc
        </Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Document Export Settings
          </DialogTitle>
          <DialogDescription>
            Customize the header, footer, and page numbering for your Word document.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Header Settings */}
          <div className="space-y-4">
            <h4 className="font-medium">Header Options</h4>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="includeStudentName"
                checked={settings.includeStudentName}
                onCheckedChange={(checked) => 
                  setSettings(prev => ({ ...prev, includeStudentName: !!checked }))
                }
              />
              <Label htmlFor="includeStudentName">Include student name ({studentName})</Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="includeAssignmentTitle"
                checked={settings.includeAssignmentTitle}
                onCheckedChange={(checked) => 
                  setSettings(prev => ({ ...prev, includeAssignmentTitle: !!checked }))
                }
              />
              <Label htmlFor="includeAssignmentTitle">Include assignment title</Label>
            </div>
            
            {submissionDate && (
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="includeDate"
                  checked={settings.includeDate}
                  onCheckedChange={(checked) => 
                    setSettings(prev => ({ ...prev, includeDate: !!checked }))
                  }
                />
                <Label htmlFor="includeDate">Include submission date ({submissionDate})</Label>
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="headerText">Custom header text</Label>
              <Input
                id="headerText"
                placeholder="Enter your custom header text (will override other header options)"
                value={settings.headerText}
                onChange={(e) => {
                  console.log('Header input changed to:', e.target.value);
                  setSettings(prev => ({ ...prev, headerText: e.target.value }));
                }}
              />
              <p className="text-xs text-gray-500">
                If you enter custom text, it will be used as the header instead of student name/assignment title
              </p>
            </div>
          </div>

          {/* Footer Settings */}
          <div className="space-y-4">
            <h4 className="font-medium">Footer Options</h4>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="showPageNumbers"
                checked={settings.showPageNumbers}
                onCheckedChange={(checked) => 
                  setSettings(prev => ({ ...prev, showPageNumbers: !!checked }))
                }
              />
              <Label htmlFor="showPageNumbers">Show page numbers</Label>
            </div>
            
            {settings.showPageNumbers && (
              <div className="space-y-2">
                <Label>Page number position</Label>
                <RadioGroup
                  value={settings.pageNumberPosition}
                  onValueChange={(value: 'left' | 'center' | 'right') => 
                    setSettings(prev => ({ ...prev, pageNumberPosition: value }))
                  }
                  className="flex space-x-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="left" id="left" />
                    <Label htmlFor="left">Left</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="center" id="center" />
                    <Label htmlFor="center">Center</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="right" id="right" />
                    <Label htmlFor="right">Right</Label>
                  </div>
                </RadioGroup>
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="footerText">Custom footer text</Label>
              <Input
                id="footerText"
                placeholder="Enter custom footer text..."
                value={settings.footerText}
                onChange={(e) => setSettings(prev => ({ ...prev, footerText: e.target.value }))}
              />
            </div>
          </div>

          {/* Export Button */}
          <div className="flex justify-end space-x-2 pt-4 border-t">
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button onClick={generateWordDocument} disabled={isExporting}>
              {isExporting ? (
                <>Generating...</>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Export Document
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}