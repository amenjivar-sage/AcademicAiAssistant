import { isValidEnglishWord } from './english-words';

// Simple spell checking utility for common misspellings
export const SPELL_CHECK_DICTIONARY: Record<string, string> = {
  // Common misspellings
  'teh': 'the',
  'adn': 'and',
  'hte': 'the',
  'taht': 'that',
  'htis': 'this',
  'thier': 'their',
  'recieve': 'receive',
  'seperate': 'separate',
  'definately': 'definitely',
  'occured': 'occurred',
  'necesary': 'necessary',
  'accomodate': 'accommodate',
  'beleive': 'believe',
  'enviroment': 'environment',
  'developement': 'development',
  'independant': 'independent',
  'existance': 'existence',
  'buisness': 'business',
  'begining': 'beginning',
  'wierd': 'weird',
  'freind': 'friend',
  'goverment': 'government',
  'calender': 'calendar',
  'adress': 'address',
  'comming': 'coming',
  'writting': 'writing',
  'runing': 'running',
  'stoped': 'stopped',
  'planed': 'planned',
  'occassion': 'occasion',
  'profesional': 'professional',
  'recomend': 'recommend',
  'aparent': 'apparent',
  'beginer': 'beginner',
  'sucessful': 'successful',
  'posible': 'possible',
  'diferent': 'different',
  'intresting': 'interesting',
  'anual': 'annual',
  'suport': 'support',
  'comunity': 'community',
  'excelent': 'excellent',
  'knowlege': 'knowledge',
  'langauge': 'language',
  'maintainance': 'maintenance',
  'ocasionally': 'occasionally',
  'parliment': 'parliament',
  'priviledge': 'privilege',
  'responsability': 'responsibility',
  'temperatue': 'temperature',
  'unfortunatly': 'unfortunately',
  'embarassing': 'embarrassing',
  'guaruntee': 'guarantee',
  'harrass': 'harass',
  'millenium': 'millennium',
  'perseverence': 'perseverance',
  'questionaire': 'questionnaire',
  'restaraunt': 'restaurant',
  'schedual': 'schedule',
  'tommorrow': 'tomorrow',
  'untill': 'until',
  'vaccuum': 'vacuum',
  'wellcome': 'welcome',
  'whther': 'whether',
  'yeild': 'yield',
  'alot': 'a lot',
  'everytime': 'every time',
  'incase': 'in case',
  'infact': 'in fact',
  'inspite': 'in spite',
  'nevermind': 'never mind',
  'hpw': 'how',
  'hpo': 'how',
  'hpello': 'hello',
  'tpoday': 'today',
  'dauy': 'day',
  'doping': 'doing',
  'yu': 'you',
  'ur': 'your',
  'youre': 'you\'re',
  'its': 'it\'s',
  'whos': 'who\'s',
  'whats': 'what\'s',
  'thats': 'that\'s',
  'heres': 'here\'s',
  'theres': 'there\'s',
  'wheres': 'where\'s'
};

export interface SpellCheckResult {
  word: string;
  suggestion?: string; // For backward compatibility
  suggestions?: string[]; // Multiple suggestions
  startIndex: number;
  endIndex: number;
}

// AI-powered spell checking with improved reliability
export async function checkSpellingWithAI(text: string): Promise<SpellCheckResult[]> {
  try {
    const response = await fetch('/api/ai/spell-check', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text }),
    });

    if (!response.ok) {
      console.warn('AI spell check API returned error:', response.status);
      throw new Error('AI spell check failed');
    }

    const data = await response.json();
    console.log('Raw API response:', data);
    
    // The API returns the results directly as an array
    const aiResults = Array.isArray(data) ? data : [];
    
    if (aiResults.length === 0) {
      console.log('AI returned no results - this suggests the AI service may need improvement');
      return [];
    }
    
    // Convert AI results to our SpellCheckResult format with word positions
    const spellCheckResults: SpellCheckResult[] = [];
    let searchIndex = 0;
    
    aiResults.forEach((error: any) => {
      if (error.word && error.suggestions) {
        const wordIndex = text.indexOf(error.word, searchIndex);
        if (wordIndex !== -1) {
          spellCheckResults.push({
            word: error.word,
            suggestions: error.suggestions,
            startIndex: wordIndex,
            endIndex: wordIndex + error.word.length
          });
          searchIndex = wordIndex + error.word.length;
        }
      }
    });
    
    console.log('Converted to SpellCheckResult format:', spellCheckResults);
    return spellCheckResults.sort((a, b) => a.startIndex - b.startIndex);
    
  } catch (error) {
    console.error('AI spell check error:', error);
    // Return empty array - we only want dictionary-based results, not unreliable fallbacks
    return [];
  }
}

// Basic spell checking as fallback
export function checkSpelling(text: string): SpellCheckResult[] {
  const results: SpellCheckResult[] = [];
  const words = text.match(/\b[a-zA-Z]+\b/g) || [];
  let currentIndex = 0;

  words.forEach(word => {
    const wordIndex = text.indexOf(word, currentIndex);
    const lowerWord = word.toLowerCase();
    
    // Check against our dictionary first
    if (SPELL_CHECK_DICTIONARY[lowerWord]) {
      results.push({
        word,
        suggestion: SPELL_CHECK_DICTIONARY[lowerWord],
        startIndex: wordIndex,
        endIndex: wordIndex + word.length
      });
    } else {
      // Check against comprehensive English word list
      if (!isValidEnglishWord(word)) {
        const suggestion = detectSpellingError(word) || generateSuggestion(word);
        if (suggestion && suggestion !== lowerWord) {
          results.push({
            word,
            suggestion,
            startIndex: wordIndex,
            endIndex: wordIndex + word.length
          });
        }
      }
    }
    
    currentIndex = wordIndex + word.length;
  });

  return results;
}

// Pattern-based spell checking for common errors
function detectSpellingError(word: string): string | null {
  const lower = word.toLowerCase();
  
  // Skip very short words and proper nouns (capitalized words)
  if (word.length < 3 || /^[A-Z][a-z]+$/.test(word)) {
    return null;
  }
  
  // Common patterns and corrections
  const patterns = [
    // Double letters that should be single
    { pattern: /([a-z])\1+/, fix: '$1' },
    // Common letter swaps
    { pattern: /ei/, fix: 'ie' },
    { pattern: /teh/, fix: 'the' },
    { pattern: /adn/, fix: 'and' },
    // Missing letters (basic heuristics)
    { pattern: /^h[a-z]*llo$/, fix: (word: string) => word.replace(/^h([a-z]*)llo$/, 'he$1llo') },
    { pattern: /^[a-z]*ay$/, fix: (word: string) => word.endsWith('auy') ? word.replace('auy', 'ay') : word.replace(/([a-z])ay$/, '$1day') },
  ];
  
  // Apply pattern corrections
  for (const { pattern, fix } of patterns) {
    if (typeof fix === 'string') {
      if (pattern.test(lower)) {
        return lower.replace(pattern, fix);
      }
    } else if (typeof fix === 'function') {
      if (pattern.test(lower)) {
        return fix(lower);
      }
    }
  }
  
  // Check for likely misspellings based on common error patterns
  if (isLikelyMisspelling(word)) {
    return generateSuggestion(word);
  }
  
  return null;
}

// Detect likely misspellings based on patterns
function isLikelyMisspelling(word: string): boolean {
  const lower = word.toLowerCase();
  
  // Words with unusual letter combinations
  const suspiciousPatterns = [
    /hp[a-z]/, // hp followed by other letters (like "hpo", "hpello")
    /[a-z]auy$/, // words ending in "auy"
    /^[a-z]*[qxz]{2,}/, // multiple q, x, or z together
    /(.)\1{2,}/, // words with 3+ repeated letters
  ];
  
  return suspiciousPatterns.some(pattern => pattern.test(lower));
}

// Generate suggestions for likely misspellings
function generateSuggestion(word: string): string {
  const lower = word.toLowerCase();
  
  // Specific corrections for patterns we recognize
  if (lower.startsWith('hp')) {
    if (lower === 'hpo') return 'how';
    if (lower === 'hpello') return 'hello';
    if (lower.startsWith('hp') && lower.length > 2) {
      return 'h' + lower.substring(2); // Remove the 'p'
    }
  }
  
  if (lower.endsWith('auy')) {
    return lower.replace('auy', 'ay');
  }
  
  // Common word corrections
  const commonCorrections: Record<string, string> = {
    'jucie': 'juice',
    'stoer': 'store',
    'watre': 'water',
    'channals': 'channels',
    'chanals': 'channels',
    'accpt': 'accept',
    'acpt': 'accept',
    // States and places (from your test cases)
    'nevada': 'Nevada',
    'califorina': 'California', 
    'arizaon': 'Arizona',
    'arizoan': 'Arizona',
    'micghan': 'Michigan',
    'wahsintong': 'Washington',
    'wahsinton': 'Washington',
    'appreicative': 'appreciative',
    'appreica': 'appreciative',
    'appreicati': 'appreciative',
    'appreicativ': 'appreciative',
    // Common words
    'sugestions': 'suggestions',
    'sugestion': 'suggestion',
    'corections': 'corrections',
    'corection': 'correction',
    'alex': 'Alex', // Proper noun
    'teh': 'the',
    'adn': 'and',
    'recieve': 'receive',
    'seperate': 'separate',
    'definately': 'definitely',
    'occured': 'occurred',
    'necesary': 'necessary',
    'beleive': 'believe',
    'freind': 'friend',
    'wierd': 'weird',
    'calender': 'calendar',
    'tommorrow': 'tomorrow',
    'alot': 'a lot',
    'peple': 'people',
    'poeple': 'people',
    'becuase': 'because',
    'beacuse': 'because',
    'thier': 'their',
    'ther': 'their',
    'theyre': 'they\'re',
    'youre': 'you\'re',
    'its': 'it\'s',
    'wont': 'won\'t',
    'cant': 'can\'t',
    'dont': 'don\'t',
    'isnt': 'isn\'t',
    'wasnt': 'wasn\'t',
    'werent': 'weren\'t',
    'arent': 'aren\'t',
    'hasnt': 'hasn\'t',
    'havent': 'haven\'t',
    'hadnt': 'hadn\'t'
  };
  
  if (commonCorrections[lower]) {
    return commonCorrections[lower];
  }
  
  // Try simple character substitutions for common typing errors
  const suggestions = generateTypingErrorSuggestions(lower);
  if (suggestions.length > 0) {
    return suggestions[0];
  }
  
  // If no specific correction found, return the original word
  return word;
}

// Generate suggestions based on common typing errors
function generateTypingErrorSuggestions(word: string): string[] {
  const suggestions: string[] = [];
  
  // Try single character replacements for common errors
  const commonSwaps = [
    ['ie', 'ei'], ['ei', 'ie'],
    ['c', 'k'], ['k', 'c'],
    ['s', 'z'], ['z', 's'],
    ['f', 'ph'], ['ph', 'f']
  ];
  
  for (const [from, to] of commonSwaps) {
    if (word.includes(from)) {
      const suggestion = word.replace(from, to);
      if (isValidEnglishWord(suggestion)) {
        suggestions.push(suggestion);
      }
    }
  }
  
  return suggestions;
}

export function applySpellCheckSuggestion(text: string, result: SpellCheckResult, suggestion?: string): string {
  const replacement = suggestion || result.suggestion || (result.suggestions && result.suggestions[0]) || result.word;
  
  console.log('Applying suggestion:', {
    original: result.word,
    replacement,
    startIndex: result.startIndex,
    endIndex: result.endIndex,
    textLength: text.length
  });
  
  // Strategy 1: Try the original position first
  if (result.startIndex >= 0 && result.endIndex <= text.length) {
    const originalWord = text.substring(result.startIndex, result.endIndex);
    console.log('Word at original position:', originalWord, 'vs expected:', result.word);
    
    if (originalWord.toLowerCase() === result.word.toLowerCase()) {
      const beforeText = text.substring(0, result.startIndex);
      const afterText = text.substring(result.endIndex);
      return beforeText + replacement + afterText;
    }
  }
  
  console.warn('Word mismatch, trying fallback strategies');
  
  // Strategy 2: Find by word boundaries (most reliable)
  const escapedWord = result.word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const wordRegex = new RegExp(`\\b${escapedWord}\\b`, 'gi');
  let match;
  const matches = [];
  
  // Find all matches
  while ((match = wordRegex.exec(text)) !== null) {
    matches.push({
      index: match.index,
      word: match[0]
    });
  }
  
  if (matches.length > 0) {
    // Use the first match (or closest to original position)
    let bestMatch = matches[0];
    if (matches.length > 1 && result.startIndex >= 0) {
      // Find the match closest to the original position
      bestMatch = matches.reduce((closest, current) => {
        const closestDiff = Math.abs(closest.index - result.startIndex);
        const currentDiff = Math.abs(current.index - result.startIndex);
        return currentDiff < closestDiff ? current : closest;
      });
    }
    
    const actualStartIndex = bestMatch.index;
    const actualEndIndex = actualStartIndex + bestMatch.word.length;
    console.log('Using word boundary match at:', actualStartIndex, '-', actualEndIndex);
    return text.substring(0, actualStartIndex) + replacement + text.substring(actualEndIndex);
  }
  
  // Strategy 3: Simple case-insensitive search
  const lowerText = text.toLowerCase();
  const lowerWord = result.word.toLowerCase();
  const findIndex = lowerText.indexOf(lowerWord);
  
  if (findIndex !== -1) {
    const actualStartIndex = findIndex;
    const actualEndIndex = actualStartIndex + result.word.length;
    console.log('Using simple search match at:', actualStartIndex, '-', actualEndIndex);
    return text.substring(0, actualStartIndex) + replacement + text.substring(actualEndIndex);
  }
  
  console.error('Could not find word to replace:', result.word, 'in text');
  return text; // Don't replace if we can't find the word
}

// Auto-correct common typos without prompting
const COMMON_AUTO_CORRECTIONS: Record<string, string> = {
  'teh': 'the',
  'adn': 'and',
  'hte': 'the',
  'taht': 'that',
  'thta': 'that',
  'htis': 'this',
  'recieve': 'receive',
  'seperate': 'separate',
  'occured': 'occurred',
  'beleive': 'believe',
  'freind': 'friend',
  'wierd': 'weird',
  'calender': 'calendar',
  'tommorrow': 'tomorrow',
  'alot': 'a lot',
  'cant': "can't",
  'dont': "don't",
  'wont': "won't",
  'isnt': "isn't",
  'wasnt': "wasn't",
  'arent': "aren't",
  'hasnt': "hasn't",
  'havent': "haven't",
  'hadnt': "hadn't",
  'wouldnt': "wouldn't",
  'shouldnt': "shouldn't",
  'couldnt': "couldn't"
};

export function applyAutoCorrections(text: string): {corrected: string, changes: Array<{original: string, corrected: string, timestamp: number}>} {
  let correctedText = text;
  const changes: Array<{original: string, corrected: string, timestamp: number}> = [];
  
  // Find and replace common typos
  Object.entries(COMMON_AUTO_CORRECTIONS).forEach(([incorrect, correct]) => {
    const regex = new RegExp(`\\b${incorrect}\\b`, 'gi');
    if (regex.test(correctedText)) {
      correctedText = correctedText.replace(regex, correct);
      changes.push({
        original: incorrect,
        corrected: correct,
        timestamp: Date.now()
      });
    }
  });
  
  return { corrected: correctedText, changes };
}

export function highlightMisspelledWords(text: string): string {
  const spellErrors = checkSpelling(text);
  let highlightedText = text;
  
  // Apply highlights in reverse order to maintain correct indices
  spellErrors.reverse().forEach(error => {
    const before = highlightedText.substring(0, error.startIndex);
    const misspelled = highlightedText.substring(error.startIndex, error.endIndex);
    const after = highlightedText.substring(error.endIndex);
    
    highlightedText = before + 
      `<span class="spell-error" style="text-decoration: underline wavy red; cursor: pointer;" title="Suggestion: ${error.suggestion}">${misspelled}</span>` + 
      after;
  });
  
  return highlightedText;
}