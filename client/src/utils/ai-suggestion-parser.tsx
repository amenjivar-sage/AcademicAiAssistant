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
  console.log('🤖 AI response sample:', aiResponse.substring(0, 300));
  
  // Test simple regex on the known AI response format
  const testResponse = `1. Replace **"yesterdya"** with **"yesterday"** - Corrects the spelling of "yesterday."

2. Replace **"respones"** with **"responses"** - Corrects the spelling of "responses."`;
  
  console.log('🧪 Testing with sample response:', testResponse);
  const simplePattern = /Replace\s+\*\*['""]([^'""\*]+)['""]?\*\*\s+with\s+\*\*['""]([^'""\*]+)['""]?\*\*/gi;
  let testMatch;
  console.log('🔧 Testing simple pattern:', simplePattern.source);
  while ((testMatch = simplePattern.exec(testResponse)) !== null) {
    console.log('✅ Test pattern matched:', testMatch);
  }
  
  // Clean document content by removing HTML tags
  const cleanContent = documentContent.replace(/<[^>]*>/g, '');
  console.log('🧹 Cleaned content sample:', cleanContent.substring(0, 200));
  
  // Pattern to match corrections in various formats
  const patterns = [
    // Priority 1: Numbered format "1. Replace **"X"** with **"Y"** - explanation" (exact match for current AI format)
    /\d+\.\s*Replace\s+\*\*['""]([^'""\*]+)['""]?\*\*\s+with\s+\*\*['""]([^'""\*]+)['""]?\*\*\s*[-–—]?\s*(.+?)(?=\n\d+\.|$)/gi,
    
    // Priority 2: Numbered format without quotes "1. Replace **X** with **Y** - explanation"
    /\d+\.\s*Replace\s+\*\*([^*]+)\*\*\s+with\s+\*\*([^*]+)\*\*\s*[-–—]?\s*(.+?)(?=\n\d+\.|$)/gi,
    
    // Priority 3: Numbered format "1. Change X to Y - explanation"
    /\d+\.\s*Change\s+['""]?([^'""\n]+)['""]?\s+to\s+['""]?([^'""\n]+)['""]?\s*[-–—]?\s*(.+?)(?=\n\d+\.|$)/gi,
    
    // Priority 4: Simple "Replace X with Y" format
    /Replace\s+['""]?([^'""\n]+)['""]?\s+with\s+['""]?([^'""\n]+)['""]?\s*[-–—]?\s*(.+?)(?=\n|$)/gi,
    
    // Priority 5: "Change X to Y" format
    /Change\s+['""]?([^'""\n]+)['""]?\s+to\s+['""]?([^'""\n]+)['""]?\s*[-–—]?\s*(.+?)(?=\n|$)/gi
  ];
  
  patterns.forEach((pattern, patternIndex) => {
    console.log(`🔍 Testing pattern ${patternIndex + 1}: ${pattern.source}`);
    console.log(`📝 Sample AI response to match against:`, aiResponse.substring(0, 500));
    let match;
    const regex = new RegExp(pattern.source, pattern.flags);
    
    while ((match = regex.exec(aiResponse)) !== null) {
      console.log(`✅ Pattern ${patternIndex + 1} matched:`, match);
      const [, originalText, suggestedText, explanation] = match;
      
      console.log('✅ Found correction match:', {
        original: originalText,
        suggested: suggestedText,
        explanation: explanation?.trim()
      });
      
      // Check if the original text exists in the document
      const cleanOriginal = originalText.trim();
      const textIndex = cleanContent.toLowerCase().indexOf(cleanOriginal.toLowerCase());
      
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
      }
    }
  });
  
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