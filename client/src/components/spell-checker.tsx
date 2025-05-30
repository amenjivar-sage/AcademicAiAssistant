import React, { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';

// Common misspelled words and their corrections
const SPELL_CHECK_DICTIONARY: Record<string, string> = {
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
  'onto': 'on to',
  'someday': 'some day',
  'somone': 'someone',
  'thruout': 'throughout',
  'uptodate': 'up to date',
  'wellknown': 'well known',
  'wouldnt': 'wouldn\'t',
  'couldnt': 'couldn\'t',
  'shouldnt': 'shouldn\'t',
  'wont': 'won\'t',
  'cant': 'can\'t',
  'dont': 'don\'t',
  'isnt': 'isn\'t',
  'wasnt': 'wasn\'t',
  'werent': 'weren\'t',
  'arent': 'aren\'t',
  'hasnt': 'hasn\'t',
  'havent': 'haven\'t',
  'hadnt': 'hadn\'t',
  'hpw': 'how',
  'tpoday': 'today',
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

interface SpellCheckerProps {
  content: string;
  onContentChange: (newContent: string) => void;
  className?: string;
}

export default function SpellChecker({ content, onContentChange, className }: SpellCheckerProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [misspelledWords, setMisspelledWords] = useState<{ word: string; suggestions: string[]; range: Range }[]>([]);

  const checkSpelling = (text: string) => {
    const words = text.match(/\b[a-zA-Z]+\b/g) || [];
    const misspelled: { word: string; suggestions: string[]; range: Range }[] = [];

    if (!editorRef.current) return misspelled;

    const selection = window.getSelection();
    if (!selection) return misspelled;

    // Create a range to find word positions
    const walker = document.createTreeWalker(
      editorRef.current,
      NodeFilter.SHOW_TEXT,
      null
    );

    let node;
    let textOffset = 0;

    while (node = walker.nextNode()) {
      const textNode = node as Text;
      const nodeText = textNode.textContent || '';
      
      // Find misspelled words in this text node
      const wordRegex = /\b[a-zA-Z]+\b/g;
      let match;
      
      while ((match = wordRegex.exec(nodeText)) !== null) {
        const word = match[0].toLowerCase();
        
        if (SPELL_CHECK_DICTIONARY[word]) {
          const range = document.createRange();
          range.setStart(textNode, match.index);
          range.setEnd(textNode, match.index + word.length);
          
          misspelled.push({
            word: match[0],
            suggestions: [SPELL_CHECK_DICTIONARY[word]],
            range: range.cloneRange()
          });
        }
      }
      
      textOffset += nodeText.length;
    }

    return misspelled;
  };

  const addSpellCheckHighlights = () => {
    if (!editorRef.current) return;

    // Remove existing highlights
    const existingHighlights = editorRef.current.querySelectorAll('.spell-error');
    existingHighlights.forEach(highlight => {
      const parent = highlight.parentNode;
      if (parent) {
        parent.replaceChild(document.createTextNode(highlight.textContent || ''), highlight);
        parent.normalize();
      }
    });

    const misspelled = checkSpelling(content);
    setMisspelledWords(misspelled);

    // Add new highlights
    misspelled.forEach(({ range }) => {
      try {
        const span = document.createElement('span');
        span.className = 'spell-error';
        span.style.textDecoration = 'underline';
        span.style.textDecorationColor = 'red';
        span.style.textDecorationStyle = 'wavy';
        span.style.cursor = 'pointer';
        
        range.surroundContents(span);
      } catch (error) {
        // Range might be invalid, skip
      }
    });
  };

  const replaceWord = (oldWord: string, newWord: string) => {
    const newContent = content.replace(new RegExp(`\\b${oldWord}\\b`, 'gi'), newWord);
    onContentChange(newContent);
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      addSpellCheckHighlights();
    }, 500); // Debounce spell checking

    return () => clearTimeout(timer);
  }, [content]);

  const handleInput = (e: React.FormEvent<HTMLDivElement>) => {
    const newContent = e.currentTarget.textContent || '';
    onContentChange(newContent);
  };

  const handleSpellErrorClick = (e: React.MouseEvent) => {
    e.preventDefault();
    const target = e.target as HTMLElement;
    
    if (target.classList.contains('spell-error')) {
      const word = target.textContent || '';
      const suggestions = SPELL_CHECK_DICTIONARY[word.toLowerCase()];
      
      if (suggestions) {
        // Show context menu with suggestions
        const rect = target.getBoundingClientRect();
        
        // Create a temporary popover or context menu here
        // For now, we'll use a simple prompt
        const newWord = window.prompt(`Suggestions for "${word}":`, suggestions);
        if (newWord && newWord !== word) {
          replaceWord(word, newWord);
        }
      }
    }
  };

  return (
    <div className="relative">
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        onClick={handleSpellErrorClick}
        className={`min-h-[400px] p-4 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${className}`}
        style={{ 
          whiteSpace: 'pre-wrap',
          wordWrap: 'break-word'
        }}
        suppressContentEditableWarning={true}
        dangerouslySetInnerHTML={{ __html: content }}
      />
      
      {misspelledWords.length > 0 && (
        <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded-md">
          <p className="text-sm text-yellow-800 font-medium">
            Spelling suggestions available ({misspelledWords.length} issues found)
          </p>
          <p className="text-xs text-yellow-600 mt-1">
            Click on red underlined words to see corrections
          </p>
        </div>
      )}
    </div>
  );
}