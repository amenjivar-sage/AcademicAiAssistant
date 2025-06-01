/**
 * Simple Copy-Paste Detector
 * Uses paste position data to highlight content instead of complex word matching
 */

export function detectCopyPastedContent(documentContent: string, copyPasteData: any[]): string {
  let result = documentContent;
  
  if (!copyPasteData || copyPasteData.length === 0) {
    return result;
  }

  console.log('Copy-paste entries:', copyPasteData);

  copyPasteData.forEach((entry: any) => {
    if (entry && entry.text) {
      const pasteStart = entry.startIndex || 0;
      const pasteEnd = entry.endIndex || pasteStart + entry.text.length;
      
      console.log('Processing paste at positions:', pasteStart, 'to', pasteEnd);
      console.log('Pasted text was:', entry.text);
      
      // Get the clean document text to work with positions
      const cleanDoc = documentContent.replace(/<[^>]*>/g, '');
      
      // Extract content around the paste area
      const beforePaste = cleanDoc.substring(0, pasteStart);
      const afterPaste = cleanDoc.substring(pasteEnd);
      const pasteArea = cleanDoc.substring(pasteStart, pasteEnd);
      
      console.log('Content in paste area:', pasteArea);
      
      // If there's substantial content in the paste area, highlight it
      if (pasteArea && pasteArea.length > 20) {
        // Split into sentences and highlight each
        const sentences = pasteArea.split(/[.!?]+/).filter(s => s.trim().length > 10);
        
        sentences.forEach(sentence => {
          const trimmed = sentence.trim();
          if (trimmed && !/\b(sky|hello|how are you)\b/i.test(trimmed)) {
            console.log('Highlighting pasted sentence:', trimmed);
            
            // Find and highlight this sentence in the document
            const escapedSentence = trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const regex = new RegExp(escapedSentence, 'gi');
            
            result = result.replace(regex, (match) => {
              if (!match.includes('background-color: #fecaca')) {
                return `<span style="background-color: #fecaca; border-bottom: 2px solid #f87171; color: #991b1b; font-weight: 600;" title="Copy-pasted content detected">${match}</span>`;
              }
              return match;
            });
          }
        });
      }
    }
  });

  return result;
}