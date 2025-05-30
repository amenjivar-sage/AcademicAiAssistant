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
  suggestion: string;
  startIndex: number;
  endIndex: number;
}

export function checkSpelling(text: string): SpellCheckResult[] {
  const results: SpellCheckResult[] = [];
  const words = text.match(/\b[a-zA-Z]+\b/g) || [];
  let currentIndex = 0;

  words.forEach(word => {
    const wordIndex = text.indexOf(word, currentIndex);
    const lowerWord = word.toLowerCase();
    
    if (SPELL_CHECK_DICTIONARY[lowerWord]) {
      results.push({
        word,
        suggestion: SPELL_CHECK_DICTIONARY[lowerWord],
        startIndex: wordIndex,
        endIndex: wordIndex + word.length
      });
    }
    
    currentIndex = wordIndex + word.length;
  });

  return results;
}

export function applySpellCheckSuggestion(text: string, result: SpellCheckResult): string {
  return text.substring(0, result.startIndex) + 
         result.suggestion + 
         text.substring(result.endIndex);
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