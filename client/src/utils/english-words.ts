// Common English words list for spell checking
// This is a basic word list - in production, you'd want a more comprehensive dictionary
export const COMMON_ENGLISH_WORDS = new Set([
  // Articles
  'a', 'an', 'the',
  
  // Common pronouns
  'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them',
  'my', 'your', 'his', 'her', 'its', 'our', 'their', 'mine', 'yours', 'hers', 'ours', 'theirs',
  'myself', 'yourself', 'himself', 'herself', 'itself', 'ourselves', 'yourselves', 'themselves',
  'this', 'that', 'these', 'those',
  
  // Common verbs
  'am', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'having',
  'do', 'does', 'did', 'doing', 'done',
  'will', 'would', 'shall', 'should', 'may', 'might', 'can', 'could', 'must',
  'go', 'goes', 'went', 'going', 'gone',
  'get', 'gets', 'got', 'getting', 'gotten',
  'make', 'makes', 'made', 'making',
  'take', 'takes', 'took', 'taking', 'taken',
  'come', 'comes', 'came', 'coming',
  'see', 'sees', 'saw', 'seeing', 'seen',
  'know', 'knows', 'knew', 'knowing', 'known',
  'think', 'thinks', 'thought', 'thinking',
  'say', 'says', 'said', 'saying',
  'tell', 'tells', 'told', 'telling',
  'want', 'wants', 'wanted', 'wanting',
  'give', 'gives', 'gave', 'giving', 'given',
  'use', 'uses', 'used', 'using',
  'find', 'finds', 'found', 'finding',
  'work', 'works', 'worked', 'working',
  'call', 'calls', 'called', 'calling',
  'try', 'tries', 'tried', 'trying',
  'ask', 'asks', 'asked', 'asking',
  'need', 'needs', 'needed', 'needing',
  'feel', 'feels', 'felt', 'feeling',
  'become', 'becomes', 'became', 'becoming',
  'leave', 'leaves', 'left', 'leaving',
  'put', 'puts', 'putting',
  'mean', 'means', 'meant', 'meaning',
  'keep', 'keeps', 'kept', 'keeping',
  'let', 'lets', 'letting',
  'begin', 'begins', 'began', 'beginning', 'begun',
  'seem', 'seems', 'seemed', 'seeming',
  'help', 'helps', 'helped', 'helping',
  'talk', 'talks', 'talked', 'talking',
  'turn', 'turns', 'turned', 'turning',
  'start', 'starts', 'started', 'starting',
  'show', 'shows', 'showed', 'showing', 'shown',
  'hear', 'hears', 'heard', 'hearing',
  'play', 'plays', 'played', 'playing',
  'run', 'runs', 'ran', 'running',
  'move', 'moves', 'moved', 'moving',
  'live', 'lives', 'lived', 'living',
  'believe', 'believes', 'believed', 'believing',
  'hold', 'holds', 'held', 'holding',
  'bring', 'brings', 'brought', 'bringing',
  'happen', 'happens', 'happened', 'happening',
  'write', 'writes', 'wrote', 'writing', 'written',
  'provide', 'provides', 'provided', 'providing',
  'sit', 'sits', 'sat', 'sitting',
  'stand', 'stands', 'stood', 'standing',
  'lose', 'loses', 'lost', 'losing',
  'pay', 'pays', 'paid', 'paying',
  'meet', 'meets', 'met', 'meeting',
  'include', 'includes', 'included', 'including',
  'continue', 'continues', 'continued', 'continuing',
  'set', 'sets', 'setting',
  'learn', 'learns', 'learned', 'learning',
  'change', 'changes', 'changed', 'changing',
  'lead', 'leads', 'led', 'leading',
  'understand', 'understands', 'understood', 'understanding',
  'watch', 'watches', 'watched', 'watching',
  'follow', 'follows', 'followed', 'following',
  'stop', 'stops', 'stopped', 'stopping',
  'create', 'creates', 'created', 'creating',
  'speak', 'speaks', 'spoke', 'speaking', 'spoken',
  'read', 'reads', 'reading',
  'allow', 'allows', 'allowed', 'allowing',
  'add', 'adds', 'added', 'adding',
  'spend', 'spends', 'spent', 'spending',
  'grow', 'grows', 'grew', 'growing', 'grown',
  'open', 'opens', 'opened', 'opening',
  'walk', 'walks', 'walked', 'walking',
  'win', 'wins', 'won', 'winning',
  'offer', 'offers', 'offered', 'offering',
  'remember', 'remembers', 'remembered', 'remembering',
  'love', 'loves', 'loved', 'loving',
  'consider', 'considers', 'considered', 'considering',
  'appear', 'appears', 'appeared', 'appearing',
  'buy', 'buys', 'bought', 'buying',
  'wait', 'waits', 'waited', 'waiting',
  'serve', 'serves', 'served', 'serving',
  'die', 'dies', 'died', 'dying',
  'send', 'sends', 'sent', 'sending',
  'expect', 'expects', 'expected', 'expecting',
  'build', 'builds', 'built', 'building',
  'stay', 'stays', 'stayed', 'staying',
  'fall', 'falls', 'fell', 'falling', 'fallen',
  'cut', 'cuts', 'cutting',
  'reach', 'reaches', 'reached', 'reaching',
  'kill', 'kills', 'killed', 'killing',
  'remain', 'remains', 'remained', 'remaining',
  
  // Common nouns
  'time', 'person', 'year', 'way', 'day', 'thing', 'man', 'world', 'life', 'hand',
  'part', 'child', 'eye', 'woman', 'place', 'work', 'week', 'case', 'point', 'government',
  'company', 'number', 'group', 'problem', 'fact', 'be', 'have', 'do', 'say', 'get',
  'make', 'go', 'know', 'take', 'see', 'come', 'think', 'look', 'want', 'give',
  'use', 'find', 'tell', 'ask', 'work', 'seem', 'feel', 'try', 'leave', 'call',
  'good', 'new', 'first', 'last', 'long', 'great', 'little', 'own', 'other', 'old',
  'right', 'big', 'high', 'different', 'small', 'large', 'next', 'early', 'young', 'important',
  'few', 'public', 'bad', 'same', 'able', 'to', 'of', 'in', 'for', 'on',
  'with', 'he', 'as', 'you', 'do', 'at', 'this', 'but', 'his', 'by',
  'from', 'up', 'about', 'into', 'over', 'after', 'beneath', 'under', 'above',
  'the', 'and', 'a', 'that', 'i', 'it', 'not', 'or', 'be', 'are',
  'hello', 'hi', 'goodbye', 'yes', 'no', 'please', 'thank', 'thanks', 'sorry', 'excuse',
  'how', 'what', 'where', 'when', 'why', 'who', 'which', 'whose', 'whom',
  'today', 'tomorrow', 'yesterday', 'now', 'then', 'here', 'there', 'everywhere', 'nowhere',
  'something', 'nothing', 'anything', 'everything', 'someone', 'no one', 'anyone', 'everyone',
  'very', 'really', 'quite', 'rather', 'pretty', 'much', 'many', 'more', 'most', 'less',
  'well', 'better', 'best', 'worse', 'worst', 'far', 'near', 'close', 'away', 'around',
  'between', 'among', 'during', 'before', 'after', 'while', 'until', 'since', 'because',
  'if', 'unless', 'although', 'though', 'however', 'therefore', 'thus', 'so', 'but', 'yet',
  
  // Days and months
  'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday',
  'january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december',
  
  // Numbers
  'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
  'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen', 'twenty',
  'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety', 'hundred', 'thousand', 'million',
  'first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth', 'ninth', 'tenth',
  
  // Common adjectives
  'good', 'bad', 'big', 'small', 'large', 'little', 'long', 'short', 'high', 'low',
  'hot', 'cold', 'warm', 'cool', 'fast', 'slow', 'quick', 'easy', 'hard', 'difficult',
  'simple', 'complex', 'old', 'new', 'young', 'nice', 'beautiful', 'ugly', 'happy', 'sad',
  'angry', 'excited', 'tired', 'hungry', 'thirsty', 'sick', 'healthy', 'strong', 'weak',
  'smart', 'stupid', 'clever', 'funny', 'serious', 'important', 'interesting', 'boring',
  'red', 'blue', 'green', 'yellow', 'orange', 'purple', 'pink', 'brown', 'black', 'white', 'gray',
  
  // Common prepositions
  'in', 'on', 'at', 'by', 'for', 'with', 'without', 'to', 'from', 'of', 'about', 'under',
  'over', 'above', 'below', 'between', 'among', 'through', 'during', 'before', 'after',
  'up', 'down', 'out', 'off', 'away', 'back', 'here', 'there', 'where', 'everywhere',
  
  // Question words
  'what', 'where', 'when', 'why', 'how', 'who', 'which', 'whose', 'whom',
  
  // Common expressions and greetings
  'hello', 'hi', 'hey', 'goodbye', 'bye', 'see you', 'good morning', 'good afternoon', 'good evening', 'good night',
  'please', 'thank you', 'thanks', 'you\'re welcome', 'sorry', 'excuse me', 'pardon',
  
  // Education-related words
  'school', 'student', 'teacher', 'class', 'lesson', 'homework', 'assignment', 'test', 'exam',
  'grade', 'study', 'learn', 'education', 'knowledge', 'book', 'paper', 'write', 'read',
  'university', 'college', 'subject', 'course', 'degree', 'graduation', 'scholarship'
]);

export function isValidEnglishWord(word: string): boolean {
  const cleanWord = word.toLowerCase().replace(/[^a-z]/g, '');
  
  // Check against our word list
  if (COMMON_ENGLISH_WORDS.has(cleanWord)) {
    return true;
  }
  
  // Allow contractions and possessives
  if (word.includes("'")) {
    const baseWord = word.split("'")[0].toLowerCase();
    return COMMON_ENGLISH_WORDS.has(baseWord);
  }
  
  // Allow plural forms
  if (cleanWord.endsWith('s') && cleanWord.length > 3) {
    const singular = cleanWord.slice(0, -1);
    if (COMMON_ENGLISH_WORDS.has(singular)) {
      return true;
    }
  }
  
  // Allow -ing forms
  if (cleanWord.endsWith('ing') && cleanWord.length > 4) {
    const base = cleanWord.slice(0, -3);
    if (COMMON_ENGLISH_WORDS.has(base)) {
      return true;
    }
    // Try doubling the last consonant (e.g., "running" -> "run")
    if (base.length >= 3) {
      const baseWithoutDouble = base.slice(0, -1);
      if (COMMON_ENGLISH_WORDS.has(baseWithoutDouble)) {
        return true;
      }
    }
  }
  
  // Allow -ed forms
  if (cleanWord.endsWith('ed') && cleanWord.length > 3) {
    const base = cleanWord.slice(0, -2);
    if (COMMON_ENGLISH_WORDS.has(base)) {
      return true;
    }
    // Try -e forms (e.g., "moved" -> "move")
    if (COMMON_ENGLISH_WORDS.has(base + 'e')) {
      return true;
    }
  }
  
  // Allow -ly forms
  if (cleanWord.endsWith('ly') && cleanWord.length > 3) {
    const base = cleanWord.slice(0, -2);
    if (COMMON_ENGLISH_WORDS.has(base)) {
      return true;
    }
  }
  
  return false;
}