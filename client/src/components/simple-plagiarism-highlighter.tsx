/**
 * Simple and reliable plagiarism highlighter
 * Focuses on catching all pasted content without complex logic
 */

export function highlightPlagiarizedContent(content: string, pastedData: any[]): string {
  if (!pastedData || !Array.isArray(pastedData) || pastedData.length === 0) {
    return content;
  }

  let result = content;
  
  console.log('=== PLAGIARISM HIGHLIGHTING ===');
  console.log('Number of paste instances:', pastedData.length);

  // Extract all pasted texts
  const pastedTexts = pastedData
    .map((item: any) => {
      if (typeof item === 'string') return item;
      if (item && typeof item === 'object') {
        return item.text || item.content || item.value || '';
      }
      return '';
    })
    .filter((text: string) => text && text.length > 10);

  console.log('Valid pasted texts:', pastedTexts.length);

  // Process each pasted text
  pastedTexts.forEach((pastedText: string, index: number) => {
    console.log(`Processing paste ${index + 1}:`, pastedText.substring(0, 60) + '...');
    
    // Split into sentences for more precise highlighting
    const sentences = pastedText
      .split(/\.\s+|\?\s+|\!\s+/)
      .filter(s => s.trim().length > 15)
      .map(s => s.trim());

    sentences.forEach((sentence: string) => {
      console.log(`Looking for sentence: "${sentence.substring(0, 50)}..."`);
      
      // Try multiple variations to catch the sentence
      const variations = [
        sentence,
        sentence + '.',
        sentence + '!',
        sentence + '?',
        sentence.replace(/[.!?]+$/, ''),
        sentence.replace(/\s+/g, ' ').trim()
      ];

      let found = false;
      for (const variation of variations) {
        if (variation.length > 15 && result.includes(variation) && !result.includes(`>${variation}</span>`)) {
          console.log(`✓ Found match: "${variation.substring(0, 40)}..."`);
          
          const escapedText = variation.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const regex = new RegExp(escapedText, 'gi');
          
          result = result.replace(regex, (match) => {
            return `<span style="background-color: #fee2e2; border: 2px solid #dc2626; padding: 2px 4px; border-radius: 3px; color: #991b1b; font-weight: 600;" title="Copy-pasted content detected">${match}</span>`;
          });
          
          found = true;
          break;
        }
      }

      // If exact matches fail, try word sequence matching
      if (!found && sentence.length > 20) {
        const words = sentence.split(/\s+/).filter(w => w.length >= 3);
        
        // Try 6-word sequences
        for (let i = 0; i <= words.length - 6; i++) {
          const wordSeq = words.slice(i, i + 6).join(' ');
          
          if (result.includes(wordSeq) && !result.includes(`>${wordSeq}</span>`)) {
            console.log(`✓ Found word sequence: "${wordSeq}"`);
            
            const escapedSeq = wordSeq.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const regex = new RegExp(escapedSeq, 'gi');
            
            result = result.replace(regex, (match) => {
              return `<span style="background-color: #fee2e2; border: 2px solid #dc2626; padding: 2px 4px; border-radius: 3px; color: #991b1b; font-weight: 600;" title="Copy-pasted content detected">${match}</span>`;
            });
            
            found = true;
            break;
          }
        }
      }

      if (!found) {
        console.log(`✗ No match found for: "${sentence.substring(0, 40)}..."`);
      }
    });
  });

  console.log('=== HIGHLIGHTING COMPLETE ===');
  return result;
}