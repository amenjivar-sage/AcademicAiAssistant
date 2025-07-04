// Improved paste highlighter that handles spell-corrected text
export function highlightPastedContent(content: string, pastedContent: any[]): string {
  if (!pastedContent || !Array.isArray(pastedContent) || pastedContent.length === 0) {
    console.log('No pasted content found');
    return content;
  }

  console.log('=== ENHANCED PASTE TRACKING START ===');
  console.log('🔍 NEW ENHANCED HIGHLIGHTER CALLED 🔍');
  console.log('Pasted content:', pastedContent);
  console.log('Document content to process:', content.substring(0, 200));

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
      
      console.log('Processing paste:', pastedText.substring(0, 100));
      
      // Clean up both the document and pasted text for matching
      const cleanDocument = result.replace(/<[^>]*>/g, '').replace(/&amp;/g, '&');
      const cleanPasted = pastedText.replace(/\s+/g, ' ').trim();
      
      // Method 1: Try exact match first
      if (cleanDocument.includes(cleanPasted)) {
        console.log('✓ Found exact match, highlighting');
        result = highlightExactMatch(result, cleanPasted);
        return;
      }
      
      // Method 2: Try fuzzy matching for spell-corrected text
      console.log('Exact match failed, trying fuzzy matching...');
      const fuzzyMatch = findFuzzyMatch(cleanDocument, cleanPasted);
      if (fuzzyMatch) {
        console.log('✓ Found fuzzy match:', fuzzyMatch.matchedText.substring(0, 100));
        result = highlightFuzzyMatch(result, fuzzyMatch.matchedText);
        return;
      }
      
      // Method 3: Try sentence-by-sentence matching
      console.log('Fuzzy match failed, trying sentence matching...');
      const pastedSentences = cleanPasted.split(/[.!?]+/).filter((s: string) => s.trim().length > 10);
      pastedSentences.forEach((sentence: string) => {
        const trimmedSentence = sentence.trim();
        console.log('Looking for sentence in content:', trimmedSentence.substring(0, 50) + '...');
        
        // Try to find similar sentences in the document
        const docSentences = cleanDocument.split(/[.!?]+/);
        docSentences.forEach(docSentence => {
          const similarity = calculateSimilarity(trimmedSentence.toLowerCase(), docSentence.trim().toLowerCase());
          if (similarity > 0.7) { // 70% similarity threshold
            console.log('✓ Found similar sentence (similarity:', similarity + ')');
            result = highlightSimilarText(result, docSentence.trim());
          }
        });
      });
      
      // Method 4: Try phrase-by-phrase matching (3+ word chunks)
      console.log('Trying phrase matching...');
      const words = cleanPasted.split(/\s+/);
      for (let i = 0; i <= words.length - 3; i++) {
        const phrase = words.slice(i, i + 3).join(' ');
        if (cleanDocument.toLowerCase().includes(phrase.toLowerCase())) {
          console.log('✓ Found phrase match:', phrase);
          result = highlightPhrase(result, phrase);
        }
      }
      
      // Method 5: Original simple sentence splitting approach (as additional layer)
      console.log('Trying original sentence splitting approach...');
      const originalSentences = cleanPasted.split(/[.!?]+/).filter((s: string) => s.trim().length > 10);
      originalSentences.forEach((sentence: string) => {
        const trimmedSentence = sentence.trim();
        console.log('Looking for sentence in content:', trimmedSentence.substring(0, 50) + '...');
        
        // Try to find this sentence in the document
        const docSentences = cleanDocument.split(/[.!?]+/);
        docSentences.forEach(docSentence => {
          const docTrimmed = docSentence.trim();
          if (docTrimmed.length > 10 && cleanDocument.toLowerCase().includes(trimmedSentence.toLowerCase())) {
            console.log('✓ Found sentence match via original method');
            result = highlightOriginalSentence(result, trimmedSentence);
          }
        });
      });
      
      // Method 6: Break into smaller chunks and look for partial matches
      console.log('Trying chunk-based matching...');
      const chunks = [];
      for (let i = 0; i < words.length; i += 5) { // 5-word chunks
        const chunk = words.slice(i, i + 5).join(' ');
        if (chunk.trim().length > 20) {
          chunks.push(chunk);
        }
      }
      
      chunks.forEach(chunk => {
        if (cleanDocument.toLowerCase().includes(chunk.toLowerCase())) {
          console.log('✓ Found chunk match:', chunk.substring(0, 50));
          result = highlightChunk(result, chunk);
        }
      });
      
      // Method 7: Structural pattern matching (handles heavily spell-corrected text)
      console.log('Trying structural pattern matching...');
      const pastedWordCount = cleanPasted.split(/\s+/).length;
      const docWords = cleanDocument.split(/\s+/);
      
      // Look for sequences with similar word count and structure
      for (let i = 0; i <= docWords.length - pastedWordCount; i++) {
        const docSequence = docWords.slice(i, i + pastedWordCount);
        const sequenceText = docSequence.join(' ');
        
        // Check structural similarity (sentence patterns, punctuation, length)
        const structuralSimilarity = calculateStructuralSimilarity(cleanPasted, sequenceText);
        if (structuralSimilarity > 0.6) { // 60% structural similarity
          console.log('✓ Found structural match (similarity:', structuralSimilarity + ')');
          console.log('Original paste length:', cleanPasted.length, 'Found sequence length:', sequenceText.length);
          result = highlightStructuralMatch(result, sequenceText);
        }
      }
      
      // Method 8: Word position pattern matching (for spell-corrected content)
      console.log('Trying word position pattern matching...');
      const pastedWords = cleanPasted.toLowerCase().split(/\s+/);
      const commonWords = ['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'];
      
      // Find patterns of common words that stay the same after spell check
      let patternMatches = 0;
      for (let i = 0; i <= docWords.length - pastedWords.length; i++) {
        const docSequence = docWords.slice(i, i + pastedWords.length);
        let commonWordMatches = 0;
        
        for (let j = 0; j < pastedWords.length; j++) {
          if (commonWords.includes(pastedWords[j]) && 
              pastedWords[j] === docSequence[j]?.toLowerCase()) {
            commonWordMatches++;
          }
        }
        
        // If we find a sequence with many matching common words in the same positions
        if (commonWordMatches >= 3 && commonWordMatches / pastedWords.length > 0.3) {
          console.log('✓ Found word position pattern match with', commonWordMatches, 'common words');
          const sequenceText = docSequence.join(' ');
          result = highlightPatternMatch(result, sequenceText);
          patternMatches++;
        }
      }
      
      if (patternMatches > 0) {
        console.log('✓ Found', patternMatches, 'word position pattern matches');
      }
    }
  });

  console.log('=== ENHANCED PASTE TRACKING END ===');
  return result;
}

// Helper function to highlight exact matches
function highlightExactMatch(content: string, text: string): string {
  const words = text.split(/\s+/);
  let pattern = '';
  for (let i = 0; i < words.length; i++) {
    const word = words[i].replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    pattern += word;
    if (i < words.length - 1) {
      pattern += '(?:<[^>]*>)*\\s+(?:<[^>]*>)*';
    }
  }
  
  try {
    const regex = new RegExp(`(${pattern})`, 'gi');
    return content.replace(regex, (match) => {
      if (match.includes('background-color: #fecaca')) return match;
      return `<span style="background-color: #fecaca; border: 2px solid #f87171; color: #991b1b; font-weight: 600; padding: 2px 4px; border-radius: 3px;" title="Copy-pasted content detected">${match}</span>`;
    });
  } catch (e) {
    console.log('Regex error in exact match:', e);
    return content;
  }
}

// Helper function to find fuzzy matches (handles spelling corrections)
function findFuzzyMatch(document: string, pastedText: string): { matchedText: string; similarity: number } | null {
  const pastedWords = pastedText.split(/\s+/);
  const docWords = document.split(/\s+/);
  
  // Look for sequences with similar length and structure
  for (let i = 0; i <= docWords.length - pastedWords.length; i++) {
    const docSequence = docWords.slice(i, i + pastedWords.length).join(' ');
    const similarity = calculateSimilarity(pastedText.toLowerCase(), docSequence.toLowerCase());
    
    if (similarity > 0.75) { // 75% similarity for fuzzy matching
      return { matchedText: docSequence, similarity };
    }
  }
  
  return null;
}

// Helper function to calculate text similarity
function calculateSimilarity(text1: string, text2: string): number {
  const words1 = text1.split(/\s+/);
  const words2 = text2.split(/\s+/);
  
  if (words1.length !== words2.length) {
    return 0;
  }
  
  let matches = 0;
  for (let i = 0; i < words1.length; i++) {
    if (words1[i] === words2[i] || 
        levenshteinDistance(words1[i], words2[i]) <= 2) {
      matches++;
    }
  }
  
  return matches / words1.length;
}

// Helper function to calculate edit distance between two words
function levenshteinDistance(str1: string, str2: string): number {
  const matrix = [];
  
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  
  return matrix[str2.length][str1.length];
}

// Helper function to highlight fuzzy matches
function highlightFuzzyMatch(content: string, matchedText: string): string {
  const escapedText = matchedText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  try {
    const regex = new RegExp(`(${escapedText})`, 'gi');
    return content.replace(regex, (match) => {
      if (match.includes('background-color: #fecaca')) return match;
      return `<span style="background-color: #fecaca; border: 2px solid #f87171; color: #991b1b; font-weight: 600; padding: 2px 4px; border-radius: 3px;" title="Copy-pasted content detected (spell-corrected)">${match}</span>`;
    });
  } catch (e) {
    console.log('Regex error in fuzzy match:', e);
    return content;
  }
}

// Helper function to highlight similar text
function highlightSimilarText(content: string, similarText: string): string {
  const escapedText = similarText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  try {
    const regex = new RegExp(`(${escapedText})`, 'gi');
    return content.replace(regex, (match) => {
      if (match.includes('background-color: #fecaca')) return match;
      return `<span style="background-color: #fecaca; border: 2px solid #f87171; color: #991b1b; font-weight: 600; padding: 2px 4px; border-radius: 3px;" title="Copy-pasted content detected (similar text)">${match}</span>`;
    });
  } catch (e) {
    console.log('Regex error in similar text:', e);
    return content;
  }
}

// Helper function to highlight phrases
function highlightPhrase(content: string, phrase: string): string {
  const escapedPhrase = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  try {
    const regex = new RegExp(`(${escapedPhrase})`, 'gi');
    return content.replace(regex, (match) => {
      if (match.includes('background-color: #fecaca')) return match;
      return `<span style="background-color: #fecaca; border: 2px solid #f87171; color: #991b1b; font-weight: 600; padding: 2px 4px; border-radius: 3px;" title="Copy-pasted phrase detected">${match}</span>`;
    });
  } catch (e) {
    console.log('Regex error in phrase match:', e);
    return content;
  }
}

// Helper function to highlight original sentence matches
function highlightOriginalSentence(content: string, sentence: string): string {
  const escapedSentence = sentence.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  try {
    const regex = new RegExp(`(${escapedSentence})`, 'gi');
    return content.replace(regex, (match) => {
      if (match.includes('background-color: #fecaca')) return match;
      return `<span style="background-color: #fecaca; border: 2px solid #f87171; color: #991b1b; font-weight: 600; padding: 2px 4px; border-radius: 3px;" title="Copy-pasted sentence detected">${match}</span>`;
    });
  } catch (e) {
    console.log('Regex error in original sentence match:', e);
    return content;
  }
}

// Helper function to highlight chunks
function highlightChunk(content: string, chunk: string): string {
  const escapedChunk = chunk.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  try {
    const regex = new RegExp(`(${escapedChunk})`, 'gi');
    return content.replace(regex, (match) => {
      if (match.includes('background-color: #fecaca')) return match;
      return `<span style="background-color: #fecaca; border: 2px solid #f87171; color: #991b1b; font-weight: 600; padding: 2px 4px; border-radius: 3px;" title="Copy-pasted chunk detected">${match}</span>`;
    });
  } catch (e) {
    console.log('Regex error in chunk match:', e);
    return content;
  }
}

// Helper function to calculate structural similarity
function calculateStructuralSimilarity(text1: string, text2: string): number {
  // Compare length similarity
  const lengthSimilarity = 1 - Math.abs(text1.length - text2.length) / Math.max(text1.length, text2.length);
  
  // Compare sentence structure (punctuation patterns)
  const punctuation1 = text1.match(/[.!?,:;]/g) || [];
  const punctuation2 = text2.match(/[.!?,:;]/g) || [];
  const punctuationSimilarity = punctuation1.length === punctuation2.length ? 1 : 0.5;
  
  // Compare word count similarity
  const words1 = text1.split(/\s+/).length;
  const words2 = text2.split(/\s+/).length;
  const wordCountSimilarity = 1 - Math.abs(words1 - words2) / Math.max(words1, words2);
  
  // Combined structural similarity
  return (lengthSimilarity * 0.4 + punctuationSimilarity * 0.3 + wordCountSimilarity * 0.3);
}

// Helper function to highlight structural matches
function highlightStructuralMatch(content: string, matchedText: string): string {
  const escapedText = matchedText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  try {
    const regex = new RegExp(`(${escapedText})`, 'gi');
    return content.replace(regex, (match) => {
      if (match.includes('background-color: #fecaca')) return match;
      return `<span style="background-color: #fecaca; border: 2px solid #f87171; color: #991b1b; font-weight: 600; padding: 2px 4px; border-radius: 3px;" title="Copy-pasted content detected (structural match)">${match}</span>`;
    });
  } catch (e) {
    console.log('Regex error in structural match:', e);
    return content;
  }
}

// Helper function to highlight pattern matches
function highlightPatternMatch(content: string, matchedText: string): string {
  const escapedText = matchedText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  try {
    const regex = new RegExp(`(${escapedText})`, 'gi');
    return content.replace(regex, (match) => {
      if (match.includes('background-color: #fecaca')) return match;
      return `<span style="background-color: #fecaca; border: 2px solid #f87171; color: #991b1b; font-weight: 600; padding: 2px 4px; border-radius: 3px;" title="Copy-pasted content detected (pattern match)">${match}</span>`;
    });
  } catch (e) {
    console.log('Regex error in pattern match:', e);
    return content;
  }
}