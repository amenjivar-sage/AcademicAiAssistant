import { useState } from 'react';
import html2pdf from 'html2pdf.js';
import { Button } from '@/components/ui/button';
import { Download, FileText } from 'lucide-react';

interface PDFExportProps {
  content: string;
  title?: string;
}

export function PDFExport({ content, title = "Document" }: PDFExportProps) {
  const [isExporting, setIsExporting] = useState(false);

  const splitContentIntoPages = (htmlContent: string) => {
    // Create a temporary div to measure content height
    const tempDiv = document.createElement('div');
    tempDiv.style.position = 'absolute';
    tempDiv.style.visibility = 'hidden';
    tempDiv.style.width = '612px'; // 8.5in - 72px padding on each side
    tempDiv.style.fontFamily = 'Times New Roman, serif';
    tempDiv.style.fontSize = '12pt';
    tempDiv.style.lineHeight = '2.0';
    tempDiv.style.padding = '72px';
    tempDiv.style.boxSizing = 'border-box';
    document.body.appendChild(tempDiv);

    const maxPageHeight = 1000; // Target height per page
    const pages: string[] = [];
    
    // Split content by paragraphs to avoid breaking mid-sentence
    const paragraphs = htmlContent.split('</p>').filter(p => p.trim());
    let currentPageContent = '';
    
    for (let i = 0; i < paragraphs.length; i++) {
      const paragraph = paragraphs[i] + (i < paragraphs.length - 1 ? '</p>' : '');
      
      // Test height with this paragraph added
      tempDiv.innerHTML = currentPageContent + paragraph;
      const newHeight = tempDiv.offsetHeight;
      
      if (newHeight > maxPageHeight && currentPageContent) {
        // This paragraph would overflow, start a new page
        pages.push(currentPageContent);
        currentPageContent = paragraph;
      } else {
        currentPageContent += paragraph;
      }
    }
    
    // Add the last page
    if (currentPageContent) {
      pages.push(currentPageContent);
    }
    
    document.body.removeChild(tempDiv);
    return pages.length > 0 ? pages : [''];
  };

  const generatePDFContent = (pages: string[]) => {
    return `
      <div style="font-family: 'Times New Roman', serif; font-size: 12pt; line-height: 2.0;">
        ${pages.map((pageContent, index) => `
          <div style="
            width: 8.5in;
            min-height: 11in;
            padding: 72px;
            box-sizing: border-box;
            page-break-after: ${index < pages.length - 1 ? 'always' : 'auto'};
            background: white;
            position: relative;
          ">
            ${pageContent}
            <div style="
              position: absolute;
              bottom: 36px;
              right: 72px;
              font-size: 10pt;
              color: #666;
            ">
              ${index + 1}
            </div>
          </div>
        `).join('')}
      </div>
    `;
  };

  const exportToPDF = async () => {
    setIsExporting(true);
    
    try {
      // Split content into pages
      const pages = splitContentIntoPages(content);
      
      // Generate PDF-ready HTML
      const pdfContent = generatePDFContent(pages);
      
      // Create a temporary element for PDF generation
      const element = document.createElement('div');
      element.innerHTML = pdfContent;
      element.style.position = 'absolute';
      element.style.left = '-9999px';
      element.style.top = '-9999px';
      document.body.appendChild(element);
      
      // Configure html2pdf options
      const options = {
        margin: 0,
        filename: `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { 
          scale: 2,
          useCORS: true,
          letterRendering: true,
          allowTaint: false
        },
        jsPDF: { 
          unit: 'in', 
          format: 'letter', 
          orientation: 'portrait',
          compress: true
        },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
      };
      
      // Generate and download PDF
      await html2pdf().set(options).from(element).save();
      
      // Clean up
      document.body.removeChild(element);
      
    } catch (error) {
      console.error('PDF export failed:', error);
      alert('Failed to export PDF. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Button
      onClick={exportToPDF}
      disabled={isExporting || !content.trim()}
      variant="outline"
      size="sm"
      className="gap-2"
    >
      {isExporting ? (
        <>
          <FileText className="h-4 w-4 animate-spin" />
          Exporting...
        </>
      ) : (
        <>
          <Download className="h-4 w-4" />
          Export PDF
        </>
      )}
    </Button>
  );
}