// Simple paste highlighter - tracks exactly what was pasted, no complex logic
export function highlightPastedContent(content: string, pastedContent: any[]): string {
  if (!pastedContent || !Array.isArray(pastedContent) || pastedContent.length === 0) {
    console.log('No pasted content found');
    return content;
  }

  console.log('=== SIMPLE PASTE TRACKING ===');
  console.log('Pasted content:', pastedContent);

  let result = content;
  
  // For each thing that was pasted, find it in the document and highlight it
  pastedContent.forEach((paste: any) => {
    if (paste && paste.text && typeof paste.text === 'string') {
      const pastedText = paste.text.trim();
      
      // Skip very short pastes (likely accidental or spell corrections)
      if (pastedText.length < 15) {
        console.log('Skipping short paste:', pastedText);
        return;
      }
      
      console.log('Looking for pasted text in document:', pastedText.substring(0, 100));
      
      // Clean up both the document and pasted text for matching
      const cleanDocument = result.replace(/<[^>]*>/g, '').replace(/&amp;/g, '&');
      const cleanPasted = pastedText.replace(/\s+/g, ' ').trim();
      
      // If the pasted text exists in the document, highlight it
      if (cleanDocument.includes(cleanPasted)) {
        console.log('✓ Found pasted text in document, highlighting');
        
        // Now find the actual text in the HTML version and highlight it
        // We need to match the text while preserving HTML formatting
        const words = cleanPasted.split(/\s+/);
        
        // Create a pattern that matches the text with possible HTML tags in between
        let pattern = '';
        for (let i = 0; i < words.length; i++) {
          const word = words[i].replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          pattern += word;
          if (i < words.length - 1) {
            // Allow HTML tags and whitespace between words
            pattern += '(?:<[^>]*>)*\\s+(?:<[^>]*>)*';
          }
        }
        
        try {
          const regex = new RegExp(`(${pattern})`, 'gi');
          
          if (result.match(regex)) {
            result = result.replace(regex, (match) => {
              // Don't double-highlight
              if (match.includes('background-color: #fecaca')) {
                return match;
              }
              
              console.log('✓ Highlighting match:', match.substring(0, 100));
              return `<span style="background-color: #fecaca; border: 2px solid #f87171; color: #991b1b; font-weight: 600; padding: 2px 4px; border-radius: 3px;" title="Copy-pasted content detected">${match}</span>`;
            });
            
            console.log('✓ Highlighted pasted content');
          }
        } catch (e) {
          console.log('Regex error:', e);
        }
      } else {
        console.log('✗ Pasted text not found in document');
      }
    }
  });

  return result;
}