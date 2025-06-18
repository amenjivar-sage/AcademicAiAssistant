import React from 'react';
import { Download, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Document, Packer, Paragraph, TextRun, Header, Footer, AlignmentType, HeadingLevel } from 'docx';
import { saveAs } from 'file-saver';

interface DocumentDownloadProps {
  content: string;
  studentName?: string;
  assignmentTitle?: string;
  submissionDate?: string;
  headerText?: string;
  footerText?: string;
  showPageNumbers?: boolean;
  className?: string;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg';
}

export default function DocumentDownload({
  content,
  studentName = 'Student',
  assignmentTitle = 'Assignment',
  submissionDate,
  headerText,
  footerText,
  showPageNumbers = true,
  className,
  variant = 'outline',
  size = 'sm'
}: DocumentDownloadProps) {

  const generateWordDocument = async () => {
    try {
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
                after: 200 
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
                  after: 200 
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

      // Parse content and create paragraphs
      const paragraphs = parseHtmlToWordParagraphs(content).length > 0 ? parseHtmlToWordParagraphs(content) : content.split('\n').map(paragraph => {
        if (paragraph.trim() === '') {
          return new Paragraph({
            children: [new TextRun({ text: '' })],
            spacing: { after: 200 }
          });
        }

        // Check if it's a title (starts with quotes or is in all caps)
        const isTitle = paragraph.trim().startsWith('"') && paragraph.trim().endsWith('"');
        const isHeading = paragraph.trim() === paragraph.trim().toUpperCase() && paragraph.trim().length > 10;

        if (isTitle) {
          return new Paragraph({
            children: [
              new TextRun({
                text: paragraph.trim(),
                bold: true,
                size: 28
              })
            ],
            alignment: AlignmentType.CENTER,
            spacing: { before: 400, after: 400 },
            heading: HeadingLevel.TITLE
          });
        }

        if (isHeading) {
          return new Paragraph({
            children: [
              new TextRun({
                text: paragraph.trim(),
                bold: true,
                size: 24
              })
            ],
            alignment: AlignmentType.LEFT,
            spacing: { before: 300, after: 200 },
            heading: HeadingLevel.HEADING_1
          });
        }

        return new Paragraph({
          children: [
            new TextRun({
              text: paragraph.trim(),
              size: 24, // 12pt in half-points
              font: 'Times New Roman'
            })
          ],
          spacing: { 
            line: 480, // Double spacing (240 = single, 480 = double)
            after: 0
          },
          indent: {
            firstLine: 720 // First line indent (720 = 0.5 inch)
          }
        });
      });

      // Create header content
      const headerParagraphs = [];
      if (studentName || headerText) {
        const headerElements = [];
        if (studentName) {
          headerElements.push(new TextRun({ text: studentName, size: 20 }));
        }
        if (headerText && studentName) {
          headerElements.push(new TextRun({ text: ' - ', size: 20 }));
        }
        if (headerText) {
          headerElements.push(new TextRun({ text: headerText, size: 20 }));
        }

        headerParagraphs.push(
          new Paragraph({
            children: headerElements,
            alignment: AlignmentType.LEFT
          })
        );
      }

      // Create footer content
      const footerParagraphs = [];
      if (footerText || showPageNumbers) {
        const footerElements = [];
        if (footerText) {
          footerElements.push(new TextRun({ text: footerText, size: 20 }));
        }
        if (showPageNumbers && footerText) {
          footerElements.push(new TextRun({ text: ' - ', size: 20 }));
        }
        if (showPageNumbers) {
          footerElements.push(new TextRun({ text: 'Page ', size: 20 }));
        }

        footerParagraphs.push(
          new Paragraph({
            children: footerElements,
            alignment: AlignmentType.CENTER
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
      const fileName = `${studentName.replace(/[^a-zA-Z0-9]/g, '_')}_${assignmentTitle.replace(/[^a-zA-Z0-9]/g, '_')}.docx`;
      saveAs(blob, fileName);

    } catch (error) {
      console.error('Error generating Word document:', error);
      alert('Failed to generate Word document. Please try again.');
    }
  };

  // Don't show download button if there's no content
  if (!content || content.trim().length === 0) {
    return null;
  }

  return (
    <Button
      onClick={generateWordDocument}
      variant={variant}
      size={size}
      className={className}
    >
      <Download className="h-4 w-4 mr-2" />
      Download Word Doc
    </Button>
  );
}