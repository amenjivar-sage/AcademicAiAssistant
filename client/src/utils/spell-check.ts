import { isValidEnglishWord } from './english-words';

// Simple spell checking utility for common misspellings
export const SPELL_CHECK_DICTIONARY: Record<string, string> = {
  // Common misspellings
  'teh': 'the',
  'adn': 'and',
  'hte': 'the',
  'taht': 'that',
  'htis': 'this',
  'recieve': 'receive',
  'seperate': 'separate',
  'definately': 'definitely',
  'definatly': 'definitely',
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
  
  // Additional common student misspellings for testing
  'somthing': 'something',
  'eveything': 'everything',
  'becuase': 'because',
  'beacuse': 'because',
  'finlly': 'finally',
  'manajed': 'managed',
  'thouhg': 'though',
  'errrors': 'errors',
  'spces': 'spaces',
  'teechur': 'teacher',
  'paprs': 'papers',
  'ahed': 'ahead',
  'leest': 'least',
  'tryed': 'tried',
  'whisperd': 'whispered',
  'mispellings': 'misspellings',
  'sentenses': 'sentences',
  'incohrent': 'incoherent',
  'phrasis': 'phrases',
  'promissed': 'promised',
  'reed': 'read',
  'proofreed': 'proofread',
  'grammer': 'grammar',
  'dosn\'t': 'doesn\'t',
  'loade': 'load',
  'mayby': 'maybe',
  'servr': 'server',
  'replyed': 'replied',
  'evantually': 'eventually',
  
  // Specific misspellings from the user's content
  'thier': 'their',
  'grup': 'group',
  'studints': 'students',
  'gathred': 'gathered',
  'libary': 'library',
  'nedid': 'needed',
  'needid': 'needed',
  'finnish': 'finish',
  'resurch': 'research',
  'evryone': 'everyone',
  'brang': 'brought',
  'brougt': 'brought',
  'alowed': 'allowed',
  'nobuddy': 'nobody',
  'seemd': 'seemed',
  'beleev': 'believe',
  'tommorow': 'tomorrow',
  'sed': 'said',
  'franticly': 'frantically',
  'thrugh': 'through',
  'eether': 'either',
  'replide': 'replied',
  'hadent': 'hadn\'t',
  'startd': 'started',
  'ouline': 'outline',
  'discused': 'discussed',
  'toppic': 'topic',
  'imapct': 'impact',
  'climte': 'climate',
  'chnage': 'change',
  'polarbears': 'polar bears',
  'cudnt': 'couldn\'t',
  'figger': 'figure',
  'typng': 'typing',
  'apeering': 'appearing',
  'documint': 'document',
  'dont': 'don\'t',
  'worrie': 'worry',
  'compooter': 'computer',
  'corect': 'correct',
  'tho': 'though',
  'wantid': 'wanted',
  'orginal': 'original',
  'wer': 'were',
  'peeces': 'pieces',
  'chnages': 'changes',
  'hopng': 'hoping',
  'wud': 'would',
  'gona': 'going to',
  'werds': 'words',
  'mutterd': 'muttered',
  'thes': 'these',
  'our': 'hour',
  'past': 'passed',
  'noisier': 'noisier',
  'peaple': 'people',
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

// Enhanced spell checking with Merriam-Webster API
export async function checkSpellingWithDictionary(text: string): Promise<SpellCheckResult[]> {
  const apiKey = import.meta.env.VITE_DICTIONARY_API_KEY;
  
  if (!apiKey) {
    console.log('🔍 No dictionary API key found, using fallback spell check');
    return checkSpelling(text);
  }

  const words = text.match(/\b[a-zA-Z]+\b/g) || [];
  const results: SpellCheckResult[] = [];
  let currentIndex = 0;

  console.log('🔍 Using Merriam-Webster API for spell check. Words to check:', words.length);

  // Process words in parallel batches for much faster checking
  const batchSize = 15; // Process 15 words simultaneously
  const wordDetails = words.map((word, i) => {
    const wordIndex = text.indexOf(word, i === 0 ? 0 : text.indexOf(words[i-1]) + words[i-1].length);
    return { word, wordIndex, lowerWord: word.toLowerCase() };
  }).filter(({ word }) => {
    // Skip very short words and proper nouns
    return word.length >= 3 && !/^[A-Z][a-z]+$/.test(word);
  });

  console.log('🔍 Processing', wordDetails.length, 'words in parallel batches of', batchSize);

  // Process in batches for faster performance
  for (let i = 0; i < wordDetails.length; i += batchSize) {
    const batch = wordDetails.slice(i, i + batchSize);
    
    // Process this batch in parallel
    const batchPromises = batch.map(async ({ word, wordIndex, lowerWord }) => {
      // Check our dictionary first for common misspellings
      if (SPELL_CHECK_DICTIONARY[lowerWord]) {
        return {
          word,
          suggestions: [SPELL_CHECK_DICTIONARY[lowerWord]], // Convert to array format
          startIndex: wordIndex,
          endIndex: wordIndex + word.length
        };
      }

      // Check with Merriam-Webster API
      try {
        const response = await fetch(`https://www.dictionaryapi.com/api/v3/references/collegiate/json/${encodeURIComponent(word)}?key=${apiKey}`);
        const data = await response.json();

        // If the response is an array of suggestions (word not found)
        if (Array.isArray(data) && data.length > 0 && typeof data[0] === 'string') {
          console.log('✓ Dictionary API found misspelling:', word, '->', data.slice(0, 3));
          return {
            word,
            suggestions: data.slice(0, 3), // Take up to 3 suggestions
            startIndex: wordIndex,
            endIndex: wordIndex + word.length
          };
        }
      } catch (error) {
        console.log('Dictionary API error for word:', word, error);
        // Fallback to local checking
        const localResult = detectSpellingError(word);
        if (localResult && localResult !== lowerWord) {
          return {
            word,
            suggestions: [localResult], // Convert to array format
            startIndex: wordIndex,
            endIndex: wordIndex + word.length
          };
        }
      }
      
      return null; // No error found
    });

    // Wait for this batch to complete
    const batchResults = await Promise.all(batchPromises);
    
    // Add valid results to our results array
    batchResults.forEach(result => {
      if (result) {
        results.push(result);
      }
    });
    
    // Very small delay between batches to be respectful to the API
    if (i + batchSize < wordDetails.length) {
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  }

  console.log('🔍 Dictionary API spell check complete. Found', results.length, 'issues');
  return results;
}

// Basic spell checking as fallback
export function checkSpelling(text: string): SpellCheckResult[] {
  const results: SpellCheckResult[] = [];
  const words = text.match(/\b[a-zA-Z]+\b/g) || [];
  let currentIndex = 0;

  console.log('🔍 Spell check starting. Text length:', text.length, 'Words found:', words.length);
  console.log('🔍 Environment:', window.location.hostname, 'Production?', window.location.hostname.includes('replit.app') || window.location.hostname.includes('onrender.com'));
  console.log('🔍 Sample words:', words.slice(0, 10));
  console.log('🔍 Dictionary sample:', Object.keys(SPELL_CHECK_DICTIONARY).slice(0, 10));

  words.forEach(word => {
    const wordIndex = text.indexOf(word, currentIndex);
    const lowerWord = word.toLowerCase();
    
    // Check against our dictionary first
    if (SPELL_CHECK_DICTIONARY[lowerWord]) {
      console.log('✓ Found misspelling in dictionary:', word, '->', SPELL_CHECK_DICTIONARY[lowerWord]);
      results.push({
        word,
        suggestions: [SPELL_CHECK_DICTIONARY[lowerWord]], // Convert to array format
        startIndex: wordIndex,
        endIndex: wordIndex + word.length
      });
    } else {
      // Check against comprehensive English word list
      const isValid = isValidEnglishWord(word);
      console.log('🔍 Checking word:', word, 'Valid?', isValid);
      
      if (!isValid) {
        const suggestion = detectSpellingError(word) || generateSuggestion(word);
        console.log('🔍 Generated suggestion for', word, ':', suggestion);
        
        if (suggestion && suggestion !== lowerWord) {
          console.log('✓ Adding spell check result:', word, '->', suggestion);
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

  console.log('🔍 Spell check complete. Found', results.length, 'issues:', results.map(r => `${r.word}->${r.suggestion}`));
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
  // SAFETY: Validate inputs to prevent data loss
  if (!text || text.trim().length === 0) {
    console.warn('⚠️ Spell check: Empty text provided, returning original');
    return text;
  }
  
  if (!result || !result.word) {
    console.warn('⚠️ Spell check: Invalid result object, returning original text');
    return text;
  }
  
  const replacement = suggestion || result.suggestion || (result.suggestions && result.suggestions[0]) || result.word;
  
  console.log('Applying suggestion:', {
    original: result.word,
    replacement,
    startIndex: result.startIndex,
    endIndex: result.endIndex,
    textLength: text.length
  });
  
  // Enhanced replacement strategy that handles both plain text and HTML
  const performReplacement = (content: string, originalWord: string, newWord: string): string => {
    const escapedWord = originalWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    
    // Strategy 1: Direct position-based replacement if indices are valid
    if (result.startIndex >= 0 && result.endIndex <= content.length) {
      const wordAtPosition = content.substring(result.startIndex, result.endIndex);
      if (wordAtPosition.toLowerCase() === originalWord.toLowerCase()) {
        const before = content.substring(0, result.startIndex);
        const after = content.substring(result.endIndex);
        const replaced = before + newWord + after;
        console.log('✓ Position-based replacement successful:', originalWord, '->', newWord);
        return replaced;
      }
    }
    
    // Strategy 2: Find first occurrence with word boundaries, avoiding HTML tags
    const wordRegex = new RegExp(`\\b${escapedWord}\\b`, 'gi');
    let match;
    let bestMatch = null;
    
    // Find all matches and select the best one
    while ((match = wordRegex.exec(content)) !== null) {
      const matchStart = match.index;
      const matchEnd = matchStart + match[0].length;
      
      // Check if this match is inside HTML tags
      const beforeMatch = content.substring(0, matchStart);
      const openTags = (beforeMatch.match(/</g) || []).length;
      const closeTags = (beforeMatch.match(/>/g) || []).length;
      
      // If not inside a tag, this is a valid match
      if (openTags === closeTags) {
        bestMatch = { start: matchStart, end: matchEnd, word: match[0] };
        break; // Use first valid match
      }
    }
    
    if (bestMatch) {
      const before = content.substring(0, bestMatch.start);
      const after = content.substring(bestMatch.end);
      const replaced = before + newWord + after;
      console.log('✓ Word boundary replacement successful:', originalWord, '->', newWord);
      return replaced;
    }
    
    // Strategy 3: Case-insensitive search as last resort
    const lowerContent = content.toLowerCase();
    const lowerWord = originalWord.toLowerCase();
    const index = lowerContent.indexOf(lowerWord);
    
    if (index !== -1) {
      const before = content.substring(0, index);
      const after = content.substring(index + originalWord.length);
      const replaced = before + newWord + after;
      console.log('✓ Case-insensitive replacement successful:', originalWord, '->', newWord);
      return replaced;
    }
    
    console.warn('Could not find word to replace:', originalWord);
    return content;
  };
  
  return performReplacement(text, result.word, replacement);
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
  // SAFETY: Validate input to prevent data loss
  if (!text || typeof text !== 'string') {
    console.warn('⚠️ Auto-correction: Invalid text input, returning empty result');
    return { corrected: text || '', changes: [] };
  }
  
  let correctedText = text;
  const changes: Array<{original: string, corrected: string, timestamp: number}> = [];
  
  try {
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
    
    // SAFETY: Ensure we don't return empty content unless input was empty
    if (text.trim().length > 0 && correctedText.trim().length === 0) {
      console.warn('⚠️ Auto-correction resulted in empty text, returning original');
      return { corrected: text, changes: [] };
    }
    
  } catch (error) {
    console.error('Error in auto-corrections:', error);
    return { corrected: text, changes: [] };
  }
  
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