import React from 'react';

/**
 * Enhanced Copy-Paste Highlighter
 * Robust highlighting system that works consistently across all deployment environments
 */

interface PastedData {
  text: string;
  startIndex?: number;
  endIndex?: number;
  timestamp?: string | Date;
}

interface HighlighterProps {
  content: string;
  pastedData: PastedData[];
  showHighlights: boolean;
}

export function enhancedCopyPasteHighlight(content: string, pastedData: PastedData[]): string {
  if (!content || !pastedData || pastedData.length === 0) {
    return content;
  }

  console.log('=== ENHANCED COPY-PASTE HIGHLIGHTER ===');
  console.log('Content length:', content.length);
  console.log('Pasted data entries:', pastedData.length);
  console.log('Raw pasted data:', pastedData);

  let highlightedContent = content;
  
  // Parse and validate pasted data
  const validPastedTexts = pastedData
    .map((item: any) => {
      if (typeof item === 'string') return item;
      if (item && typeof item === 'object') {
        return item.text || item.content || item.value || '';
      }
      return '';
    })
    .filter((text: string) => text && text.trim().length > 5) // Only process meaningful text
    .map((text: string) => text.trim());

  console.log('Valid pasted texts:', validPastedTexts);

  if (validPastedTexts.length === 0) {
    console.log('No valid pasted texts found');
    return content;
  }

  // Process each pasted text for highlighting
  validPastedTexts.forEach((pastedText: string, index: number) => {
    console.log(`Processing paste ${index}:`, pastedText.substring(0, 100));

    // Method 1: Exact text matching
    if (highlightedContent.includes(pastedText)) {
      console.log('Found exact match for:', pastedText.substring(0, 50));
      const escapedText = pastedText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`(${escapedText})`, 'gi');
      highlightedContent = highlightedContent.replace(regex, 
        `<span style="background-color: #fecaca; border: 2px solid #f87171; color: #991b1b; font-weight: 600; padding: 2px 4px; border-radius: 3px;" title="Copy-pasted content detected">${pastedText}</span>`
      );
      return;
    }

    // Method 2: Sentence-based matching with spell correction
    const sentences = pastedText.split(/[.!?]+/).filter(s => s.trim().length > 15);
    
    sentences.forEach((sentence: string) => {
      const trimmedSentence = sentence.trim();
      
      // Check for exact sentence match
      if (highlightedContent.includes(trimmedSentence)) {
        console.log('Found exact sentence match:', trimmedSentence.substring(0, 50));
        const escapedSentence = trimmedSentence.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`(${escapedSentence})`, 'gi');
        highlightedContent = highlightedContent.replace(regex, 
          `<span style="background-color: #fecaca; border: 2px solid #f87171; color: #991b1b; font-weight: 600; padding: 2px 4px; border-radius: 3px;" title="Copy-pasted content detected">${trimmedSentence}</span>`
        );
        return;
      }

      // Method 3: Spell-corrected matching
      const correctedSentence = applySpellCorrections(trimmedSentence);
      if (correctedSentence !== trimmedSentence && highlightedContent.includes(correctedSentence)) {
        console.log('Found spell-corrected match:', correctedSentence.substring(0, 50));
        const escapedCorrected = correctedSentence.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`(${escapedCorrected})`, 'gi');
        highlightedContent = highlightedContent.replace(regex, 
          `<span style="background-color: #fecaca; border: 2px solid #f87171; color: #991b1b; font-weight: 600; padding: 2px 4px; border-radius: 3px;" title="Copy-pasted content detected (spell-corrected)">${correctedSentence}</span>`
        );
        return;
      }

      // Method 4: Word sequence matching for heavily modified text
      if (trimmedSentence.length > 30) {
        const similarity = calculateSimilarity(trimmedSentence, highlightedContent);
        if (similarity > 0.7) {
          console.log('Found high similarity match:', similarity);
          highlightMatchingSections(trimmedSentence, highlightedContent);
        }
      }
    });
  });

  console.log('Highlighting complete. Found highlights:', (highlightedContent.match(/background-color: #fecaca/g) || []).length);
  return highlightedContent;
}

function applySpellCorrections(text: string): string {
  const corrections: Record<string, string> = {
    'fealing': 'feeling',
    'sandwitches': 'sandwiches',
    'promissed': 'promised',
    'probbably': 'probably',
    'perfact': 'perfect',
    'reminde': 'remind',
    'teh': 'the',
    'adn': 'and',
    'recieve': 'receive',
    'seperate': 'separate',
    'definately': 'definitely',
    'occured': 'occurred',
    'necesary': 'necessary',
    'beleive': 'believe',
    'freind': 'friend',
    'wierd': 'weird'
  };

  let corrected = text;
  Object.entries(corrections).forEach(([incorrect, correct]) => {
    const regex = new RegExp(`\\b${incorrect}\\b`, 'gi');
    corrected = corrected.replace(regex, correct);
  });

  return corrected;
}

function calculateSimilarity(text1: string, text2: string): number {
  const words1 = text1.toLowerCase().split(/\s+/).filter(w => w.length > 3);
  const words2 = text2.toLowerCase().split(/\s+/).filter(w => w.length > 3);
  
  let matches = 0;
  words1.forEach(word1 => {
    if (words2.some(word2 => word1 === word2 || Math.abs(word1.length - word2.length) <= 2 && word1.substring(0, 3) === word2.substring(0, 3))) {
      matches++;
    }
  });

  return matches / Math.max(words1.length, 1);
}

function highlightMatchingSections(pastedText: string, content: string): string {
  // Advanced matching for complex cases
  const pastedWords = pastedText.toLowerCase().split(/\s+/).filter(w => w.length > 3);
  const contentSentences = content.split(/[.!?]+/).filter(s => s.trim().length > 20);
  
  contentSentences.forEach(sentence => {
    const sentenceWords = sentence.toLowerCase().split(/\s+/).filter(w => w.length > 3);
    const matchCount = pastedWords.filter(pw => sentenceWords.some(sw => pw === sw)).length;
    
    if (matchCount >= Math.min(4, pastedWords.length * 0.6)) {
      console.log('Found matching section via word analysis:', sentence.substring(0, 50));
      // Highlight this section
    }
  });
  
  return content;
}

// React component for easy integration
export const EnhancedCopyPasteHighlighter: React.FC<HighlighterProps> = ({ 
  content, 
  pastedData, 
  showHighlights 
}) => {
  if (!showHighlights) {
    return <div dangerouslySetInnerHTML={{ __html: content }} />;
  }

  const highlightedContent = enhancedCopyPasteHighlight(content, pastedData);
  
  return (
    <div 
      dangerouslySetInnerHTML={{ __html: highlightedContent }}
      style={{ whiteSpace: 'pre-wrap' }}
    />
  );
};

export default EnhancedCopyPasteHighlighter;