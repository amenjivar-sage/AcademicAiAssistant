export interface AiSuggestion {
  id: string;
  type: 'spelling' | 'grammar' | 'style';
  originalText: string;
  suggestedText: string;
  explanation: string;
  severity: 'low' | 'medium' | 'high';
}

export function extractSuggestionsFromAiResponse(
  aiResponse: string, 
  documentContent: string
): AiSuggestion[] {
  const suggestions: AiSuggestion[] = [];
  
  console.log('🔍 Parsing AI response for suggestions...');
  console.log('📄 Document content sample:', documentContent.substring(0, 200));
  console.log('🤖 Full AI response:', aiResponse);
  
  // Clean document content by removing HTML tags
  const cleanContent = documentContent.replace(/<[^>]*>/g, '');
  console.log('🧹 Cleaned content sample:', cleanContent.substring(0, 200));
  
  // Super simplified pattern to match the exact current format from logs
  // Format: Replace **\"word\"** with **\"correction\"** - explanation
  const simplePattern = /Replace\s+\*\*[""\\]*([^"*\\]+)[""\\]*\*\*\s+with\s+\*\*[""\\]*([^"*\\]+)[""\\]*\*\*\s*[-–—]\s*(.+?)(?=\n\d+\.|$)/gi;
  
  console.log('🔍 Testing simple pattern:', simplePattern.source);
  
  let match;
  while ((match = simplePattern.exec(aiResponse)) !== null) {
    console.log('✅ Match found:', match);
    const [fullMatch, originalText, suggestedText, explanation] = match;
    
    console.log('✅ Found correction match:', {
      fullMatch,
      original: originalText,
      suggested: suggestedText,
      explanation: explanation?.trim()
    });
    
    // Check if the original text exists in the document
    const cleanOriginal = originalText.trim();
    const textIndex = cleanContent.toLowerCase().indexOf(cleanOriginal.toLowerCase());
    
    console.log('🔍 Looking for text in document:', cleanOriginal, 'in', cleanContent);
    
    if (textIndex !== -1) {
      console.log('✅ Text found in document at index:', textIndex);
      
      suggestions.push({
        id: `suggestion-${suggestions.length + 1}`,
        type: determineType(originalText, suggestedText, explanation || ''),
        originalText: cleanOriginal,
        suggestedText: suggestedText.trim(),
        explanation: explanation?.trim() || 'AI suggested correction',
        severity: determineSeverity(originalText, explanation || '')
      });
    } else {
      console.log('❌ Text not found in document:', cleanOriginal);
      console.log('🔍 Document contains:', cleanContent.substring(0, 300));
      
      // Try to find partial matches for debugging
      const words = cleanContent.toLowerCase().split(/\s+/);
      const targetWord = cleanOriginal.toLowerCase();
      const partialMatches = words.filter(word => word.includes(targetWord) || targetWord.includes(word));
      console.log('🔍 Partial word matches:', partialMatches);
    }
  }
  
  console.log(`📝 Final suggestions extracted: ${suggestions.length}`);
  return suggestions;
}

function determineType(original: string, suggested: string, explanation: string): 'spelling' | 'grammar' | 'style' {
  const explanationLower = explanation.toLowerCase();
  
  if (explanationLower.includes('spelling') || explanationLower.includes('misspelled')) {
    return 'spelling';
  }
  
  if (explanationLower.includes('grammar') || explanationLower.includes('verb') || 
      explanationLower.includes('tense') || explanationLower.includes('subject')) {
    return 'grammar';
  }
  
  // Simple spelling check - if only letter differences
  if (original.length === suggested.length && 
      levenshteinDistance(original.toLowerCase(), suggested.toLowerCase()) <= 2) {
    return 'spelling';
  }
  
  return 'style';
}

function determineSeverity(original: string, explanation: string): 'low' | 'medium' | 'high' {
  const explanationLower = explanation.toLowerCase();
  
  if (explanationLower.includes('incorrect') || explanationLower.includes('error') || 
      explanationLower.includes('wrong')) {
    return 'high';
  }
  
  if (explanationLower.includes('consider') || explanationLower.includes('suggest') || 
      explanationLower.includes('better')) {
    return 'low';
  }
  
  return 'medium';
}

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