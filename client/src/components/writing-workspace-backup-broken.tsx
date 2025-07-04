
import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Settings, Send, AlertTriangle, Shield, FileText, MessageSquare, Download, Save, CheckCircle, GraduationCap, Trophy, Type, Bold, Italic, Underline, ChevronDown, ChevronUp, SpellCheck } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import CopyPasteDetector from './copy-paste-detector';
import { RichTextEditor, RichTextEditorHandle } from './rich-text-editor-simple';
import DocumentDownload from './document-download';
import AiAssistant from './ai-assistant';

import BubbleSpellCheckPanel from './bubble-spell-check-panel';
import SimpleHighlighter from './simple-highlighter';
import SpellCheckSuggestionsPanel, { SpellCheckSuggestion } from './spell-check-suggestions-panel';

interface PastedContent {
  text: string;
  startIndex: number;
  endIndex: number;
  timestamp: Date;
}

interface WritingWorkspaceProps {
  sessionId: number;
  assignmentId?: number;
  initialSession?: any;
}



export default function WritingWorkspace({ sessionId: initialSessionId, assignmentId, initialSession }: WritingWorkspaceProps) {
  const [sessionId, setSessionId] = useState(initialSessionId);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [pastedContents, setPastedContents] = useState<PastedContent[]>([]);
  const [wordCount, setWordCount] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [showSpellCheck, setShowSpellCheck] = useState(false);
  const [spellCheckActive, setSpellCheckActive] = useState(false);
  const [showAiSidebar, setShowAiSidebar] = useState(false);
  const [isAiSidebarMinimized, setIsAiSidebarMinimized] = useState(false);
  const [openCommentId, setOpenCommentId] = useState<number | null>(null);
  const [aiSuggestions, setAiSuggestions] = useState<any[]>([]);
  const [showAiSuggestions, setShowAiSuggestions] = useState(false);
  const [spellCheckSuggestions, setSpellCheckSuggestions] = useState<SpellCheckSuggestion[]>([]);
  const [showSpellCheckSuggestions, setShowSpellCheckSuggestions] = useState(false);



  // Auto-cleanup highlights on initial load
  useEffect(() => {
    if (content && content.includes('style="background-color: rgb(254, 243, 199)')) {
      console.log('🧹 Auto-cleaning old highlights immediately');
      const cleanContent = content.replace(
        /<span[^>]*style="background-color:\s*rgb\(254,\s*243,\s*199\)[^"]*"[^>]*>(.*?)<\/span>/gi,
        '$1'
      );
      if (cleanContent !== content) {
        console.log('🧹 Cleaned content:', cleanContent);
        setContent(cleanContent);
        // Also clear any old AI suggestions since they don't match current content
        setAiSuggestions([]);
        setShowAiSuggestions(false);
      }
    }
  }, [content]);

  // Function to highlight text that has teacher comments
  const highlightCommentedText = (content: string, comments: any[]): string => {
    if (!content || !comments || comments.length === 0) return content;
    
    let highlightedContent = content;
    
    // Sort comments by start index to avoid overlap issues
    const sortedComments = [...comments].sort((a, b) => (a.startIndex || 0) - (b.startIndex || 0));
    
    // Apply highlighting from end to beginning to preserve indices
    for (let i = sortedComments.length - 1; i >= 0; i--) {
      const comment = sortedComments[i];
      if (comment.highlightedText && comment.highlightedText.trim()) {
        const escapedText = comment.highlightedText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`(${escapedText})`, 'gi');
        
        highlightedContent = highlightedContent.replace(regex, (match) => {
          return `<span style="background-color: #fef3c7; border-bottom: 2px solid #f59e0b; padding: 2px 4px; border-radius: 3px;" title="Teacher commented on this text">${match}</span>`;
        });
      }
    }
    
    return highlightedContent;
  };

  // Function to highlight copy-pasted content in red for teachers
  const highlightPastedContent = (content: string, pastedContents: PastedContent[]): string => {
    if (!content || !pastedContents || pastedContents.length === 0) return content;
    
    let highlightedContent = content;
    
    // Sort pasted content by start index to avoid overlap issues
    const sortedPastes = [...pastedContents].sort((a, b) => a.startIndex - b.startIndex);
    
    // Apply highlighting from end to beginning to preserve indices
    for (let i = sortedPastes.length - 1; i >= 0; i--) {
      const paste = sortedPastes[i];
      if (paste.text && paste.text.trim()) {
        // Clean the text and escape special regex characters
        const cleanText = paste.text.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
        const escapedText = cleanText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        
        if (escapedText.length > 0) {
          // More precise highlighting - only highlight content that hasn't been modified since paste
          // Create a regex that looks for the exact pasted content within reasonable bounds
          const regex = new RegExp(`(${escapedText})`, 'gi');
          
          // Track if we've already highlighted this paste to avoid duplicate highlighting
          let highlightApplied = false;
          
          // Use a simpler approach - only highlight the first occurrence of pasted content
          // and track content age to avoid highlighting newly typed similar text
          const currentTime = Date.now();
          const pasteAge = currentTime - paste.timestamp.getTime();
          
          // Only apply highlighting if the paste is recent enough and we haven't highlighted it yet
          if (pasteAge < 24 * 60 * 60 * 1000 && !highlightedContent.includes(`title="Copy-pasted content detected on ${paste.timestamp.toLocaleString()}"`)) {
            // Find the first occurrence and replace only that one
            const firstMatchIndex = highlightedContent.search(regex);
            
            if (firstMatchIndex !== -1) {
              const match = highlightedContent.match(regex)?.[0];
              if (match) {
                // Calculate the clean text position to compare with paste position
                const cleanTextBeforeMatch = highlightedContent.substring(0, firstMatchIndex).replace(/<[^>]*>/g, '');
                const estimatedPosition = cleanTextBeforeMatch.length;
                
                // Only highlight if this appears to be near the original paste location
                const isNearOriginalPosition = Math.abs(estimatedPosition - paste.startIndex) <= 50;
                
                if (isNearOriginalPosition) {
                  // Replace only the first occurrence
                  highlightedContent = highlightedContent.replace(regex, () => {
                    return `<span style="background-color: #fee2e2; border: 2px solid #dc2626; padding: 2px 4px; border-radius: 3px; color: #991b1b;" title="Copy-pasted content detected on ${paste.timestamp.toLocaleString()}">${match}</span>`;
                  });
                  
                  // Break the loop to avoid multiple replacements
                  break;
                }
              }
            }
          }
        }
      }
    }
    
    return highlightedContent;
  };
  const [headerFooterSettings, setHeaderFooterSettings] = useState({
    header: "",
    footer: "",
    pageNumbers: false,
    headerAlignment: 'left' as 'left' | 'center' | 'right',
    footerAlignment: 'center' as 'left' | 'center' | 'right'
  });
  const [savedSettings, setSavedSettings] = useState<typeof headerFooterSettings | null>(null);
  const [showSaveSuccess, setShowSaveSuccess] = useState(false);

  // Handler for saving header/footer settings
  const handleSaveSettings = () => {
    setSavedSettings({ ...headerFooterSettings });
    setShowSaveSuccess(true);
    setTimeout(() => setShowSaveSuccess(false), 2000);
  };

  const [showFormattingToolbox, setShowFormattingToolbox] = useState(false);
  const [isFormattingMinimized, setIsFormattingMinimized] = useState(false);
  const [selectedText, setSelectedText] = useState('');
  const [isSpellCheckActive, setIsSpellCheckActive] = useState(false);
  const [spellErrors, setSpellErrors] = useState<any[]>([]);

  const contentRef = useRef<RichTextEditorHandle>(null);
  const formatRef = useRef<((command: string, value?: string) => void) | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  
  // Track if user is currently typing to prevent cursor jumping
  const [isUserTyping, setIsUserTyping] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  // Handler for applying individual spell check suggestions
  const handleApplySpellCheckSuggestion = useCallback((suggestion: SpellCheckSuggestion) => {
    console.log('🔄 Applying spell check suggestion:', suggestion.originalText, '→', suggestion.suggestedText);
    
    const originalText = suggestion.originalText;
    const suggestedText = suggestion.suggestedText;
    const escapedOriginal = originalText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    
    // Try multiple replacement strategies for different HTML contexts
    let updatedContent = content;
    
    // 1. Try direct word boundary replacement first
    const wordBoundaryRegex = new RegExp(`\\b${escapedOriginal}\\b`, 'gi');
    const directReplacement = updatedContent.replace(wordBoundaryRegex, suggestedText);
    
    if (directReplacement !== updatedContent) {
      console.log('✅ Direct replacement successful');
      setContent(directReplacement);
      // Remove the applied suggestion
      setSpellCheckSuggestions(prev => prev.filter(s => s.id !== suggestion.id));
      return;
    }
    
    // 2. Try HTML-aware replacement
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = updatedContent;
    
    const replaceInTextNodes = (node: Node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        const textContent = node.textContent || '';
        const textRegex = new RegExp(`\\b${escapedOriginal}\\b`, 'gi');
        if (textRegex.test(textContent)) {
          const newContent = textContent.replace(textRegex, suggestedText);
          node.textContent = newContent;
          console.log('✅ HTML-aware replacement successful');
        }
      } else {
        node.childNodes.forEach(child => replaceInTextNodes(child));
      }
    };
    
    replaceInTextNodes(tempDiv);
    const htmlAwareReplacement = tempDiv.innerHTML;
    
    if (htmlAwareReplacement !== updatedContent) {
      setContent(htmlAwareReplacement);
      setSpellCheckSuggestions(prev => prev.filter(s => s.id !== suggestion.id));
      return;
    }
    
    console.warn('⚠️ Spell check replacement failed for:', originalText);
    toast({
      title: "Replacement Failed", 
      description: `Could not find "${originalText}" in document to replace.`,
      variant: "destructive"
    });
  }, [content, toast]);

  // Handler for dismissing spell check suggestions
  const handleDismissSpellCheckSuggestion = useCallback((suggestionId: string) => {
    setSpellCheckSuggestions(prev => prev.filter(s => s.id !== suggestionId));
  }, []);

  // Handler for applying all spell check suggestions
  const handleApplyAllSpellCheckSuggestions = useCallback(() => {
    console.log('🔄 Applying all spell check suggestions:', spellCheckSuggestions.length);
    
    let updatedContent = content;
    let appliedCount = 0;
    
    // Apply all suggestions
    spellCheckSuggestions.forEach(suggestion => {
      const originalText = suggestion.originalText;
      const suggestedText = suggestion.suggestedText;
      const escapedOriginal = originalText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      
      // Try direct replacement
      const wordBoundaryRegex = new RegExp(`\\b${escapedOriginal}\\b`, 'gi');
      const newContent = updatedContent.replace(wordBoundaryRegex, suggestedText);
      
      if (newContent !== updatedContent) {
        updatedContent = newContent;
        appliedCount++;
      }
    });
    
    if (appliedCount > 0) {
      setContent(updatedContent);
      setSpellCheckSuggestions([]);
      toast({
        title: "Suggestions Applied",
        description: `Applied ${appliedCount} out of ${spellCheckSuggestions.length} spelling corrections.`,
      });
    } else {
      toast({
        title: "No Changes Applied",
        description: "Could not apply any suggestions. The text may have changed.",
        variant: "destructive"
      });
    }
  }, [content, spellCheckSuggestions, toast]);
  const lastTypingTime = useRef<number>(Date.now());

  // Function to clean up bold highlighting in content
  const cleanupBoldHighlighting = useCallback((content: string) => {
    // Replace all strong tags with yellow highlighting to span tags
    return content.replace(
      /<strong style="background-color: rgb\(254, 243, 199\);">(.*?)<\/strong>/gi,
      '<span style="background-color: rgb(254, 243, 199);">$1</span>'
    );
  }, []);

  // Handle applying AI suggestions
  const handleApplySuggestion = useCallback((suggestion: any) => {
    console.log('🔄 Applying suggestion:', suggestion.originalText, '→', suggestion.suggestedText);
    console.log('📄 Current content length:', content.length);
    console.log('🎯 Content preview:', content.substring(0, 200) + '...');
    
    // Check if the original text exists anywhere in content (for debugging)
    const originalExists = content.toLowerCase().includes(suggestion.originalText.toLowerCase());
    console.log('🔍 Original text exists in content:', originalExists);
    
    if (originalExists) {
      // Find all positions where the text appears
      const regex = new RegExp(suggestion.originalText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
      const matches: RegExpExecArray[] = [];
      let match;
      while ((match = regex.exec(content)) !== null) {
        matches.push(match);
      }
      console.log('🎯 Found', matches.length, 'potential matches at positions:', matches.map(m => m.index));
      
      // Show context around each match
      matches.forEach((match, i) => {
        if (match.index !== undefined) {
          const start = Math.max(0, match.index - 30);
          const end = Math.min(content.length, match.index + match[0].length + 30);
          const context = content.substring(start, end);
          console.log(`🔍 Match ${i + 1} context: "${context}"`);
        }
      });
    }
    
    // First clean up any bold highlighting
    let workingContent = cleanupBoldHighlighting(content);
    console.log('🧹 Cleaned up bold highlighting:', workingContent !== content);
    
    // Work with both HTML content and clean text to ensure proper replacement
    const originalText = suggestion.originalText;
    const suggestedText = suggestion.suggestedText;
    
    // First try direct HTML replacement (case insensitive)
    const escapedOriginal = originalText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const directRegex = new RegExp(`\\b${escapedOriginal}\\b`, 'gi');
    let updatedContent = workingContent.replace(directRegex, suggestedText);
    console.log('🔍 Direct replacement result - changed:', updatedContent !== workingContent);
    
    // If no change, try replacing within text nodes while preserving HTML structure
    if (updatedContent === workingContent) {
      console.log('🔍 Direct replacement failed, trying HTML-aware replacement...');
      
      // Create a temporary div to parse HTML
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = workingContent;
      
      // Function to replace text in text nodes
      const replaceInTextNodes = (node: Node) => {
        if (node.nodeType === Node.TEXT_NODE) {
          const textContent = node.textContent || '';
          const textRegex = new RegExp(`\\b${escapedOriginal}\\b`, 'gi');
          if (textRegex.test(textContent)) {
            const newContent = textContent.replace(textRegex, suggestedText);
            node.textContent = newContent;
            console.log('✏️ Replaced in text node:', textContent, '→', newContent);
          }
        } else {
          // Recursively process child nodes
          node.childNodes.forEach(child => replaceInTextNodes(child));
        }
      };
      
      // Process all text nodes
      replaceInTextNodes(tempDiv);
      updatedContent = tempDiv.innerHTML;
      console.log('🔍 HTML-aware replacement result - changed:', updatedContent !== workingContent);
    }
    
    // If still no change, try handling highlighted text specifically
    if (updatedContent === workingContent) {
      console.log('🔍 HTML-aware replacement failed, trying highlighted text replacement...');
      
      // Look for the word wrapped in highlighting tags and replace with span (non-bold)
      const highlightPatterns = [
        // Yellow highlighting (copy-paste detection) - replace with span instead of strong
        {
          pattern: `<strong style="background-color: rgb\\(254, 243, 199\\);">${escapedOriginal}</strong>`,
          replacement: `<span style="background-color: rgb(254, 243, 199);">${suggestedText}</span>`
        },
        // Any strong tag with background color - replace with span
        {
          pattern: `<strong([^>]*background-color[^>]*)>${escapedOriginal}</strong>`,
          replacement: `<span$1>${suggestedText}</span>`
        },
        // Any strong tag with the word - replace with span
        {
          pattern: `<strong([^>]*)>${escapedOriginal}</strong>`,
          replacement: `<span$1>${suggestedText}</span>`
        },
        // Any em tag with the word
        {
          pattern: `<em([^>]*)>${escapedOriginal}</em>`,
          replacement: `<em$1>${suggestedText}</em>`
        },
        // Any span with background color
        {
          pattern: `<span([^>]*background-color[^>]*)>${escapedOriginal}</span>`,
          replacement: `<span$1>${suggestedText}</span>`
        },
        // Try with span and specific yellow background
        {
          pattern: `<span style="background-color: rgb\\(254, 243, 199\\);">${escapedOriginal}</span>`,
          replacement: `<span style="background-color: rgb(254, 243, 199);">${suggestedText}</span>`
        }
      ];
      
      for (const {pattern, replacement} of highlightPatterns) {
        const highlightRegex = new RegExp(pattern, 'gi');
        if (highlightRegex.test(workingContent)) {
          console.log('🎯 Found highlighted word with pattern:', pattern);
          updatedContent = workingContent.replace(highlightRegex, replacement);
          if (updatedContent !== workingContent) {
            console.log('✅ Successfully replaced highlighted text');
            break;
          }
        }
      }
    }
    
    // If still no change, try more aggressive replacements
    if (updatedContent === workingContent) {
      console.log('🔍 Highlighted text replacement failed, trying more aggressive replacements...');
      
      // Try without word boundaries first
      const simpleRegex = new RegExp(escapedOriginal, 'gi');
      updatedContent = workingContent.replace(simpleRegex, suggestedText);
      
      // If still no change, try replacing partial words (for cases like incomplete highlighting)
      if (updatedContent === workingContent) {
        console.log('🔍 Simple replacement failed, trying partial word replacement...');
        // This will catch cases where the word might be split across HTML tags
        const partialRegex = new RegExp(originalText.split('').join('[^a-zA-Z]*'), 'gi');
        const matches = workingContent.match(partialRegex);
        if (matches) {
          console.log('🎯 Found partial matches:', matches);
          updatedContent = workingContent.replace(partialRegex, suggestedText);
        }
      }
    }
    
    if (updatedContent !== workingContent) {
      console.log('✅ Content updated, applying change');
      setContent(updatedContent);
      
      // Mark user as typing to prevent auto-save conflicts
      setIsUserTyping(true);
      lastTypingTime.current = Date.now();
      
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      // Clear typing flag after suggestion applies
      typingTimeoutRef.current = setTimeout(() => {
        setIsUserTyping(false);
      }, 1000);
      
      // Log how many replacements were made
      const testRegex = new RegExp(escapedOriginal, 'gi');
      const matches = content.match(testRegex);
      if (matches) {
        console.log(`Applied ${matches.length} replacements of "${suggestion.originalText}" → "${suggestion.suggestedText}"`);
      }
    } else {
      console.log('❌ No replacements made for:', suggestion.originalText);
    }
    
    // Remove the suggestion from the list
    setAiSuggestions(prev => prev.filter(s => s.id !== suggestion.id));
  }, [content]);
  
  // Handle dismissing AI suggestions
  const handleDismissSuggestion = useCallback((suggestionId: string) => {
    console.log('❌ Dismissing suggestion:', suggestionId);
    setAiSuggestions(prev => prev.filter(s => s.id !== suggestionId));
  }, []);

  // Create session mutation
  const createSessionMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/writing-sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assignmentId: assignmentId,
          title: 'Untitled Document',
          content: '',
          pastedContent: [],
          wordCount: 0
        })
      });
      if (!response.ok) throw new Error('Failed to create session');
      return response.json();
    },
    onSuccess: (newSession) => {
      setSessionId(newSession.id);
      queryClient.invalidateQueries({ queryKey: ['/api/student/writing-sessions'] });
    }
  });



  const saveSession = useCallback(async () => {
    if (isSaving) return;

    const hasContent = content.trim().length > 0 || title.trim().length > 0;
    if (!hasContent) return;

    // Enhanced word count calculation - remove HTML tags and count actual words
    const cleanContent = content
      .replace(/<[^>]*>/g, ' ') // Remove HTML tags
      .replace(/&nbsp;/g, ' ') // Replace non-breaking spaces
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
    
    const words = cleanContent.split(/\s+/).filter((word: string) => word.length > 0);
    const currentWordCount = words.length;

    console.log('Word count calculation:', {
      originalLength: content.length,
      cleanedLength: cleanContent.length,
      wordCount: currentWordCount,
      contentPreview: cleanContent.substring(0, 100) + '...'
    });

    try {
      setIsSaving(true);
      
      // If no session exists, create one first
      let currentSessionId = sessionId;
      if (!sessionId || sessionId === 0) {
        console.log('Creating new session for assignment:', assignmentId);
        const newSession = await createSessionMutation.mutateAsync();
        currentSessionId = newSession.id;
        console.log('Created new session with ID:', currentSessionId);
      }
      
      console.log('Auto-saving session:', currentSessionId, 'Words:', currentWordCount, 'Content length:', content.length);
      console.log('Copy-paste data being saved:', pastedContents.length, 'items:', pastedContents);
      
      const response = await fetch(`/api/writing-sessions/${currentSessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          content: content, // Save full content without truncation
          pastedContent: pastedContents,
          wordCount: currentWordCount
        })
      });
      
      if (!response.ok) throw new Error('Failed to save');

      console.log('✓ Save successful - Session ID:', currentSessionId, 'Content length:', content.length);
      console.log('✓ Saved content preview:', content.substring(0, 100) + '...');
      console.log('✓ Syncing session data after save');
      
      setWordCount(currentWordCount);
      setIsSaving(false);
      setLastSaved(new Date());
      
      // Never invalidate queries during auto-save to prevent content overwrite
      // Only invalidate during manual save to prevent content loss
      console.log('✓ Skipping query invalidation during auto-save to prevent content loss');
    } catch (error) {
      console.error('Save failed:', error);
      setIsSaving(false);
    }
  }, [content, title, pastedContents, wordCount, sessionId, isSaving, assignmentId, createSessionMutation, queryClient]);

  // Manual save function (for the save button)
  const manualSave = useCallback(async () => {
    await saveSession();
    // Refresh data after manual save
    if (sessionId) {
      queryClient.invalidateQueries({ queryKey: ['writing-session', sessionId] });
      queryClient.invalidateQueries({ queryKey: ['/api/student/writing-sessions'] });
      console.log('✓ Manual save complete - refreshed data');
    }
  }, [saveSession, sessionId, queryClient]);

  // AI Suggestion handlers
  const handleAiSuggestionsGenerated = useCallback((suggestions: any[]) => {
    console.log('📝 Received AI suggestions in WritingWorkspace:', suggestions);
    
    // Clear any existing suggestions first to avoid conflicts
    setAiSuggestions([]);
    
    // Add new suggestions
    setAiSuggestions(suggestions);
    setShowAiSuggestions(true);
  }, []);

  const handleApplyAllSuggestions = useCallback(async () => {
    console.log('✅ Applying all suggestions');
    let updatedContent = content;
    
    // Apply all suggestions sequentially with better text matching
    aiSuggestions.forEach(suggestion => {
      console.log(`🔄 Applying: "${suggestion.originalText}" → "${suggestion.suggestedText}"`);
      
      // Escape special regex characters in the original text
      const escapedOriginal = suggestion.originalText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      
      // Use word boundaries to ensure exact word matches (not partial matches)
      const wordBoundaryRegex = new RegExp(`\\b${escapedOriginal}\\b`, 'gi');
      
      // Check if the text exists before replacing
      const matches = updatedContent.match(wordBoundaryRegex);
      if (matches) {
        console.log(`✅ Found ${matches.length} matches for "${suggestion.originalText}"`);
        updatedContent = updatedContent.replace(wordBoundaryRegex, suggestion.suggestedText);
      } else {
        console.log(`⚠️ No matches found for "${suggestion.originalText}" in content`);
        // Try fallback without word boundaries for contractions
        const fallbackRegex = new RegExp(escapedOriginal, 'gi');
        const fallbackMatches = updatedContent.match(fallbackRegex);
        if (fallbackMatches) {
          console.log(`✅ Found ${fallbackMatches.length} fallback matches for "${suggestion.originalText}"`);
          updatedContent = updatedContent.replace(fallbackRegex, suggestion.suggestedText);
        }
      }
    });
    
    setContent(updatedContent);
    setAiSuggestions([]);
    setShowAiSuggestions(false);
    
    toast({
      title: "All Suggestions Applied",
      description: `Applied ${aiSuggestions.length} suggestions to your document`,
    });
  }, [content, aiSuggestions, toast]);

  const handleCloseSuggestions = useCallback(() => {
    setShowAiSuggestions(false);
  }, []);


  // Auto-clear old AI suggestions when content changes significantly
  useEffect(() => {
    if (aiSuggestions.length === 0) return;
    
    // Clean content for text matching
    const cleanContent = content.replace(/<[^>]*>/g, '').toLowerCase();
    
    // If content is completely different from suggestions, clear all suggestions
    const anyValidSuggestions = aiSuggestions.some(suggestion => 
      cleanContent.includes(suggestion.originalText.toLowerCase())
    );
    
    if (!anyValidSuggestions) {
      console.log('🧹 Clearing all AI suggestions - content completely changed');
      setAiSuggestions([]);
      setShowAiSuggestions(false);
    }
  }, [content, aiSuggestions.length]);

  // Cleanup typing timeout on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  // Fetch current user data
  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: async () => {
      const response = await fetch('/api/auth/profile');
      if (!response.ok) throw new Error('Failed to fetch user');
      return response.json();
    }
  });

  // Fetch session data
  const { data: session, isLoading: sessionLoading } = useQuery({
    queryKey: ['writing-session', sessionId],
    queryFn: async () => {
      const response = await fetch(`/api/writing-sessions/${sessionId}`);
      if (!response.ok) throw new Error('Failed to fetch session');
      return response.json();
    },
    enabled: !!sessionId
  });

  // Fetch assignment data
  const { data: assignment, isLoading: assignmentLoading } = useQuery({
    queryKey: ['assignment', assignmentId],
    queryFn: async () => {
      const response = await fetch(`/api/assignments/${assignmentId}`);
      if (!response.ok) throw new Error('Failed to fetch assignment');
      return response.json();
    },
    enabled: !!assignmentId
  });

  // Fetch inline comments for graded assignments
  const { data: inlineCommentsData } = useQuery({
    queryKey: [`/api/sessions/${sessionId}/comments`],
    enabled: !!sessionId && session?.status === 'graded',
    retry: false,
  });

  // Ensure comments is always an array with proper typing
  const commentsArray: any[] = Array.isArray(inlineCommentsData) ? inlineCommentsData : [];

  // Auto-save effect
  useEffect(() => {
    const timer = setTimeout(() => {
      const hasSubstantialContent = content.trim().length > 0 || title.trim().length > 0;
      const hasChanges = content !== (session?.content || '') || title !== (session?.title || '');
      
      console.log('Auto-save check:', {
        isSaving,
        hasChanges,
        hasSubstantialContent
      });

      if (hasSubstantialContent && hasChanges && !isSaving) {
        saveSession();
      } else {
        console.log('Auto-save skipped:', {
          isSaving,
          hasChanges,
          hasSubstantialContent
        });
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [content, title, saveSession, isSaving, session]);

  // Sync with session data when it loads (but not when user is actively typing)
  useEffect(() => {
    if (session && !sessionLoading && !isUserTyping && !isSaving) {
      console.log('=== SESSION LOADING DEBUG ===');
      console.log('Session data received:', {
        id: session.id,
        title: session.title,
        contentLength: session.content?.length || 0,
        wordCount: session.wordCount,
        status: session.status,
        contentPreview: session.content?.substring(0, 100) + '...'
      });
      
      console.log('Current editor state:', {
        titleLength: title.length,
        contentLength: content.length,
        currentSessionId: sessionId
      });

      const currentContent = content || '';
      console.log('Has current content:', currentContent.substring(0, 50));

      // Only sync on true initial load to prevent overwriting user input
      const isInitialLoad = !currentContent.trim();

      if (session.content && isInitialLoad) {
        console.log('✓ Syncing with session content');
        setContent(session.content);
        setTitle(session.title || '');
        // Properly handle pasted content with timestamp conversion
        const pastedData = session.pastedContent || [];
        const formattedPastedContent = pastedData.map((paste: any) => ({
          ...paste,
          timestamp: new Date(paste.timestamp)
        }));
        setPastedContents(formattedPastedContent);
        console.log('Loaded copy-paste data:', formattedPastedContent.length, 'items');
        
        const words = (session.content || '').split(/\s+/).filter((word: string) => word.length > 0);
        const actualWordCount = words.length;
        setWordCount(actualWordCount);
        
        console.log('Content sync complete:', {
          contentLength: session.content.length,
          actualWordCount,
          dbWordCount: session.wordCount
        });
      } else {
        console.log('✓ Skipping content sync - user is typing or content similar');
      }
      console.log('=== END SESSION LOADING DEBUG ===');
    }
  }, [session, sessionLoading, sessionId, isUserTyping]);

  // Copy-paste permissions
  const allowCopyPaste = assignment?.allowCopyPaste ?? true;
  const isSubmitted = session?.status === 'submitted';
  const isGraded = session?.status === 'graded';

  // Handle paste detection
  const handlePasteDetected = (pastedContent: PastedContent) => {
    console.log('Handling paste detection:', pastedContent);
    setPastedContents(prev => {
      const updated = [...prev, pastedContent];
      console.log('Total pasted content instances:', updated.length);
      return updated;
    });
    
    if (!allowCopyPaste) {
      toast({
        title: "Copy & Paste Detected",
        description: "This action has been logged for academic integrity review.",
        variant: "destructive",
      });
    } else {
      // Show notification that paste was tracked
      toast({
        title: "Copy & Paste Tracked",
        description: `Pasted ${pastedContent.text.length} characters - recorded for teacher review`,
        variant: "default",
      });
    }
  };

  // Handle before unload
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      const hasUnsavedChanges = content !== (session?.content || '') || title !== (session?.title || '');
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [content, title, session]);

  // Submit assignment
  const submitMutation = useMutation({
    mutationFn: async () => {
      await saveSession();
      const response = await fetch(`/api/writing-sessions/${sessionId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      if (!response.ok) throw new Error('Failed to submit');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Assignment Submitted",
        description: "Your work has been submitted successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['writing-session', sessionId] });
    },
    onError: (error) => {
      toast({
        title: "Submission Failed",
        description: "Please try again.",
        variant: "destructive",
      });
    }
  });

  if (sessionLoading || assignmentLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading your writing session...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              onClick={() => setLocation('/student')}
              variant="ghost"
              size="sm"
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Button>
            
            <div className="text-sm text-gray-500">
              Assignment: {assignment?.title || 'Untitled'}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Input
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                
                // Mark user as typing for title changes too
                setIsUserTyping(true);
                if (typingTimeoutRef.current) {
                  clearTimeout(typingTimeoutRef.current);
                }
                
                // Clear typing flag after 3 seconds of no typing
                typingTimeoutRef.current = setTimeout(() => {
                  setIsUserTyping(false);
                }, 3000);
              }}
              placeholder="Document title..."
              className="text-lg font-medium border-none shadow-none px-0"
              disabled={isSubmitted || isGraded}
            />
          </div>
          
          <div className="flex items-center gap-4">
            <div className="text-sm text-gray-500">
              {wordCount} words
            </div>
            {lastSaved && (
              <div className="text-sm text-gray-500">
                Saved {lastSaved.toLocaleTimeString()}
              </div>
            )}
            

            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <Settings className="h-4 w-4" />
                  Settings
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Document Settings</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="header">Header Text</Label>
                    <Input
                      id="header"
                      value={headerFooterSettings.header}
                      onChange={(e) => setHeaderFooterSettings(prev => ({ ...prev, header: e.target.value }))}
                      placeholder="Enter header text..."
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="footer">Footer Text</Label>
                    <Input
                      id="footer"
                      value={headerFooterSettings.footer}
                      onChange={(e) => setHeaderFooterSettings(prev => ({ ...prev, footer: e.target.value }))}
                      placeholder="Enter footer text..."
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="headerAlignment">Header Alignment</Label>
                      <Select 
                        value={headerFooterSettings.headerAlignment} 
                        onValueChange={(value) => setHeaderFooterSettings(prev => ({ ...prev, headerAlignment: value as 'left' | 'center' | 'right' }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="left">Left</SelectItem>
                          <SelectItem value="center">Center</SelectItem>
                          <SelectItem value="right">Right</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label htmlFor="footerAlignment">Footer Alignment</Label>
                      <Select 
                        value={headerFooterSettings.footerAlignment} 
                        onValueChange={(value) => setHeaderFooterSettings(prev => ({ ...prev, footerAlignment: value as 'left' | 'center' | 'right' }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="left">Left</SelectItem>
                          <SelectItem value="center">Center</SelectItem>
                          <SelectItem value="right">Right</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="pageNumbers"
                      checked={headerFooterSettings.pageNumbers}
                      onCheckedChange={(checked) => setHeaderFooterSettings(prev => ({ ...prev, pageNumbers: checked }))}
                    />
                    <Label htmlFor="pageNumbers">Show page numbers</Label>
                  </div>
                  
                  {/* Save Button */}
                  <div className="flex items-center justify-between pt-4 border-t border-gray-200 bg-gray-50 -mx-6 -mb-6 px-6 py-4 rounded-b-lg">
                    <div className="text-xs text-gray-500">
                      {savedSettings ? '✓ Settings saved' : '⚠ Settings not saved'}
                    </div>
                    <Button
                      onClick={handleSaveSettings}
                      size="sm"
                      variant={showSaveSuccess ? "default" : "outline"}
                      className="flex items-center gap-2"
                    >
                      {showSaveSuccess ? (
                        <>
                          <CheckCircle className="h-4 w-4" />
                          Saved!
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4" />
                          Save Settings
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            {/* Formatting Toolbox */}
            {!showFormattingToolbox ? (
              <Button
                onClick={() => setShowFormattingToolbox(true)}
                variant="outline"
                size="sm"
                className="gap-2"
                title="Open Formatting Tools"
              >
                <Type className="h-4 w-4" />
              </Button>
            ) : (
              <div className="relative">
                <Card className="absolute right-0 top-full mt-2 w-64 shadow-lg border-gray-300 z-50">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-medium flex items-center">
                        <Type className="h-4 w-4 mr-2" />
                        {isFormattingMinimized ? "Format" : "Formatting Tools"}
                      </CardTitle>
                      <div className="flex items-center space-x-1">
                        <Button
                          onClick={() => setIsFormattingMinimized(!isFormattingMinimized)}
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0"
                          title={isFormattingMinimized ? "Expand" : "Minimize"}
                        >
                          {isFormattingMinimized ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />}
                        </Button>
                        <Button
                          onClick={() => setShowFormattingToolbox(false)}
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0"
                          title="Close"
                        >
                          ×
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  
                  {!isFormattingMinimized && (
                    <CardContent className="pt-0">
                      <div className="space-y-3">
                        {/* Text Formatting Section */}
                        <div>
                          <div className="text-xs font-medium text-gray-500 mb-2">Writing Tools</div>
                          <div className="flex flex-wrap gap-1">
                            {/* Spell Check Button */}
                            <Button
                              onClick={async () => {
                                // OpenAI-powered spell check for formatting tools
                                console.log('🔤 Triggering OpenAI spell check...');
                                
                                if (!content || !content.trim()) {
                                  toast({
                                    title: "No Content",
                                    description: "Please write some content to spell check.",
                                    variant: "destructive",
                                  });
                                  return;
                                }
                                
                                try {
                                  // Show loading state
                                  toast({
                                    title: "Checking Spelling",
                                    description: "AI is analyzing your document for spelling errors...",
                                  });
                                  
                                  // Clean the content by removing HTML tags
                                  const cleanContent = content.replace(/<[^>]*>/g, '');
                                  console.log('🧹 Cleaned content for OpenAI spell check:', cleanContent.substring(0, 100) + '...');
                                  
                                  // Call OpenAI API for spell checking
                                  const response = await fetch('/api/ai/spell-check', {
                                    method: 'POST',
                                    headers: {
                                      'Content-Type': 'application/json',
                                    },
                                    body: JSON.stringify({
                                      text: cleanContent
                                    }),
                                  });
                                  
                                  if (!response.ok) {
                                    throw new Error(`HTTP error! status: ${response.status}`);
                                  }
                                  
                                  const data = await response.json();
                                  console.log('🤖 OpenAI spell check response:', data);
                                  
                                  if (data.suggestions && data.suggestions.length > 0) {
                                    // Convert OpenAI suggestions to spell check panel format
                                    const formattedSuggestions = data.suggestions.map((suggestion: any, index: number) => ({
                                      id: `openai-spell-${index}`,
                                      originalText: suggestion.originalText,
                                      suggestedText: suggestion.suggestedText,
                                      explanation: suggestion.explanation || `Spelling correction: "${suggestion.originalText}" → "${suggestion.suggestedText}"`
                                    }));
                                    
                                    console.log('✅ Formatted OpenAI spelling suggestions:', formattedSuggestions.length);
                                    
                                    // Show the spell check suggestions panel
                                    setSpellCheckSuggestions(formattedSuggestions);
                                    setShowSpellCheckSuggestions(true);
                                    toast({
                                      title: "Spell Check Complete",
                                      description: `Found ${formattedSuggestions.length} spelling suggestions. Review them in the panel below.`,
                                    });
                                  } else {
                                    toast({
                                      title: "Spell Check Complete",
                                      description: "No spelling errors found in your document.",
                                    });
                                  }
                                } catch (error) {
                                  console.error('❌ OpenAI spell check error:', error);
                                  toast({
                                    title: "Spell Check Error",
                                    description: "Failed to check spelling. Please try again.",
                                    variant: "destructive",
                                  });
                                }
                              }}
                              size="sm"
                              variant="outline"
                              className="h-8 w-8 p-0 hover:bg-blue-50"
                              title="Check spelling"
                            >
                              <SpellCheck className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        
                        {/* Status */}
                        <div className="text-xs text-gray-400 border-t pt-2">
                          {selectedText ? (
                            <span className="text-blue-600">
                              {selectedText.length} characters selected
                            </span>
                          ) : (
                            "Select text to format"
                          )}
                        </div>
                      </div>
                    </CardContent>
                  )}
                </Card>
              </div>
            )}



            <Button
              onClick={() => setShowAiSidebar(!showAiSidebar)}
              variant={showAiSidebar ? "default" : "outline"}
              size="sm"
              className="gap-2"
              disabled={assignment?.aiPermissions === 'none'}
              title={assignment?.aiPermissions === 'none' ? 'AI assistance is disabled for this assignment' : 'Open AI Assistant'}
            >
              <MessageSquare className="h-4 w-4" />
              ZoË
              {assignment?.aiPermissions === 'none' && (
                <span className="text-xs text-gray-400">(Disabled)</span>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content Area with Sidebar */}
      <div className="flex-1 flex overflow-hidden">
        {/* Writing Content */}
        <div className={`overflow-auto transition-all duration-300 ${showSpellCheckSuggestions && spellCheckSuggestions.length > 0 ? 'flex-1' : 'flex-1'}`}>
          {/* Grading Feedback Banner for Graded Assignments */}
          {session?.status === 'graded' && (
            <div className="bg-green-100 border-2 border-green-500 p-8 m-4 shadow-xl rounded-lg">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <Trophy className="h-8 w-8 text-green-600 mt-1" />
                  <div>
                    <h3 className="text-xl font-bold text-green-800 mb-2">🎉 Assignment Graded!</h3>
                    <p className="text-green-700 mb-4 text-lg">Your teacher has reviewed and graded your work</p>
                    
                    {/* Inline Comments Summary */}
                    {commentsArray.length > 0 && (
                      <div className="bg-yellow-50 border border-yellow-300 p-3 rounded-lg mb-4">
                        <div className="flex items-center gap-2">
                          <MessageSquare className="h-4 w-4 text-yellow-600" />
                          <span className="text-sm font-medium text-yellow-800">
                            {commentsArray.length} inline comment{commentsArray.length !== 1 ? 's' : ''} from your teacher
                          </span>
                        </div>
                        <p className="text-xs text-yellow-700 mt-1">
                          Look for the yellow comment buttons to see specific feedback on different parts of your writing.
                        </p>
                      </div>
                    )}
                    
                    {session.teacherFeedback && (
                      <div className="bg-white p-6 rounded-lg border-2 border-green-300 mb-4">
                        <div className="flex items-center gap-2 mb-3">
                          <GraduationCap className="h-5 w-5 text-green-600" />
                          <span className="font-bold text-green-800 text-lg">Overall Teacher Feedback:</span>
                        </div>
                        <p className="text-gray-800 leading-relaxed text-lg">{session.teacherFeedback}</p>
                      </div>
                    )}
                    
                    <div className="text-base text-green-600 font-medium">
                      Graded on {session.updatedAt ? new Date(session.updatedAt).toLocaleDateString() : 'Unknown date'}
                    </div>
                  </div>
                </div>
                
                <div className="text-right">
                  <div className="bg-green-600 text-white px-6 py-3 rounded-lg font-bold text-2xl shadow-lg">
                    {session.grade}
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <CopyPasteDetector
            allowCopyPaste={allowCopyPaste}
            onPasteDetected={handlePasteDetected}
            className="min-h-full"
          >
            <div className="relative">
              <RichTextEditor
                ref={contentRef}
                content={(() => {
                  let displayContent = content;
                  
                  // Only apply teacher comment highlighting (yellow highlighting) for graded documents
                  // Copy-paste highlighting removed from student view for better writing experience
                  if (session?.status === 'graded' && commentsArray.length > 0) {
                    displayContent = highlightCommentedText(displayContent, commentsArray);
                  }
                  
                  return displayContent;
                })()}
                onContentChange={(newContent) => {
                  // Prevent infinite loops by checking if content actually changed
                  if (newContent !== content) {
                    console.log('Content changed from rich editor:', newContent);
                    setContent(newContent);
                    
                    // Mark user as typing and reset the typing timeout
                    setIsUserTyping(true);
                    lastTypingTime.current = Date.now();
                    
                    if (typingTimeoutRef.current) {
                      clearTimeout(typingTimeoutRef.current);
                    }
                    
                    // Clear typing flag after 3 seconds of no typing
                    typingTimeoutRef.current = setTimeout(() => {
                      setIsUserTyping(false);
                    }, 3000);
                  }
                }}
                onTextSelection={setSelectedText}
                readOnly={session?.status === 'graded'}
                placeholder="Start writing your assignment..."
              />
              

              
              {/* Inline Comments Display for Students */}
              {session?.status === 'graded' && commentsArray.length > 0 && (
                <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
                  {commentsArray.map((comment: any, index: number) => {
                    const isOpen = openCommentId === comment.id;
                    return (
                      <div
                        key={comment.id}
                        className="absolute pointer-events-auto z-10"
                        style={{
                          top: `${Math.min(20 + index * 60, 85)}%`,
                          right: '10px',
                          maxWidth: '300px'
                        }}
                      >
                        {/* Comment Indicator Button */}
                        <div
                          onClick={() => setOpenCommentId(isOpen ? null : comment.id)}
                          className="bg-yellow-400 hover:bg-yellow-500 cursor-pointer rounded-full w-8 h-8 flex items-center justify-center shadow-lg border-2 border-yellow-600 transition-colors"
                          title="Click to view teacher comment"
                        >
                          <MessageSquare className="h-4 w-4 text-yellow-800" />
                        </div>
                        
                        {/* Expanded Comment Box */}
                        {isOpen && (
                          <div className="bg-yellow-100 border-2 border-yellow-500 p-3 mt-2 rounded-lg shadow-xl max-w-sm">
                            <div className="flex items-center justify-between mb-2">
                              <div className="text-xs font-semibold text-yellow-800">
                                Teacher Comment:
                              </div>
                              <button
                                onClick={() => setOpenCommentId(null)}
                                className="text-yellow-600 hover:text-yellow-800 text-lg font-bold"
                                title="Close comment"
                              >
                                ×
                              </button>
                            </div>
                            <div className="text-sm text-yellow-900 mb-2 bg-yellow-50 p-2 rounded border-l-2 border-yellow-400">
                              "{comment.highlightedText}"
                            </div>
                            <div className="text-sm text-gray-700 leading-relaxed">
                              {comment.comment}
                            </div>
                            <div className="text-xs text-gray-500 mt-2 pt-2 border-t border-yellow-300">
                              {new Date(comment.createdAt).toLocaleDateString()}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </CopyPasteDetector>
        </div>

        {/* AI Assistant Sidebar */}
        {showAiSidebar && (
          <div className={`${isAiSidebarMinimized ? 'w-16' : 'w-96'} border-l bg-white flex flex-col h-full transition-all duration-300`}>
            {!isAiSidebarMinimized && (
              <div className="flex-1 overflow-hidden">
                <AiAssistant
                  sessionId={sessionId}
                  currentContent={content}
                  onSuggestionsGenerated={handleAiSuggestionsGenerated}
                  onMinimize={() => setIsAiSidebarMinimized(true)}
                  onClose={() => setShowAiSidebar(false)}
                />
              </div>
            )}
            {isAiSidebarMinimized && (
              <div className="flex-1 flex flex-col items-center p-2 gap-2">
                <Button
                  onClick={() => setIsAiSidebarMinimized(false)}
                  variant="ghost"
                  size="sm"
                  className="w-full flex flex-col h-12"
                  title="Expand ZoË"
                >
                  <MessageSquare className="h-4 w-4" />
                  <span className="text-xs">ZoË</span>
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="border-t bg-white p-4 relative z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {!allowCopyPaste && (
              <Badge variant="outline" className="border-red-200 text-red-700">
                <AlertTriangle className="h-3 w-3 mr-1" />
                Copy & Paste Disabled
              </Badge>
            )}
            {allowCopyPaste && (
              <Badge variant="outline" className="border-yellow-200 text-yellow-700">
                <Shield className="h-3 w-3 mr-1" />
                Copy & Paste Tracked
              </Badge>
            )}
          </div>
          
          <div className="flex gap-3">
            <Button
              onClick={() => setLocation('/student')}
              variant="outline"
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Exit
            </Button>

            <Button
              onClick={manualSave}
              disabled={isSaving || (!content.trim() && !title.trim())}
              variant="outline"
              className="gap-2"
            >
              <Save className="h-4 w-4" />
              {isSaving ? 'Saving...' : 'Save'}
            </Button>

            <DocumentDownload 
              content={content}
              studentName={user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : 'Student'}
              assignmentTitle={assignment?.title}
              headerText={(savedSettings || headerFooterSettings).header}
              footerText={(savedSettings || headerFooterSettings).footer}
              showPageNumbers={(savedSettings || headerFooterSettings).pageNumbers}
              headerAlignment={(savedSettings || headerFooterSettings).headerAlignment}
              footerAlignment={(savedSettings || headerFooterSettings).footerAlignment}
            />

            {!isSubmitted && !isGraded && (
              <Button
                onClick={() => submitMutation.mutate()}
                disabled={submitMutation.isPending || !content.trim()}
                className="gap-2"
              >
                <Send className="h-4 w-4" />
                {submitMutation.isPending ? 'Submitting...' : 'Submit Assignment'}
              </Button>
            )}

            {(isSubmitted || isGraded) && (
              <Badge variant="secondary" className="px-4 py-2">
                {isGraded ? 'Graded' : 'Submitted'}
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Spell Check Panel */}
      {isSpellCheckActive && (
        <div className="fixed bottom-8 right-8 z-50">
          <BubbleSpellCheckPanel
            content={content}
            onContentChange={(newContent) => {
              console.log('Spellcheck applying content change:', newContent.length, 'chars');
              
              // SAFETY: Apply spell check corrections regardless of length
              // as they are user-initiated corrections, not data loss scenarios
              if (newContent !== undefined && newContent !== null) {
                console.log('✓ Applying spell check correction');
                setContent(newContent);
                
                // Mark user as typing to prevent auto-save conflicts
                setIsUserTyping(true);
                lastTypingTime.current = Date.now();
                
                if (typingTimeoutRef.current) {
                  clearTimeout(typingTimeoutRef.current);
                }
                
                // Clear typing flag after spell check completes
                typingTimeoutRef.current = setTimeout(() => {
                  setIsUserTyping(false);
                }, 1000);
              } else {
                console.warn('⚠️ Spell check provided invalid content - blocked');
              }
            }}
            isOpen={isSpellCheckActive}
            onClose={() => setIsSpellCheckActive(false)}
            onSpellErrorsChange={(errors) => setSpellErrors(errors)}
          />
        </div>
      )}
      
      {/* Simple Highlighter for AI Suggestions */}
      <SimpleHighlighter
        content={content}
        suggestions={aiSuggestions}
        onApplySuggestion={handleApplySuggestion}
        onDismissSuggestion={handleDismissSuggestion}
      />
      
      {/* Bulk Apply/Ignore Panel */}
      {aiSuggestions.length > 0 && (
        <div className="fixed bottom-4 right-4 bg-white border rounded-lg shadow-lg p-4 z-50">
          <div className="text-sm font-medium mb-2">
            {aiSuggestions.length} spelling suggestions found
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                console.log('🔥 Apply All clicked! Processing', aiSuggestions.length, 'suggestions');
                console.log('📝 Suggestions to apply:', aiSuggestions.map(s => ({ original: s.originalText, suggested: s.suggestedText })));
                aiSuggestions.forEach(suggestion => handleApplySuggestion(suggestion));
              }}
              className="bg-green-500 text-white px-4 py-2 rounded text-sm font-medium hover:bg-green-600"
            >
              Apply All
            </button>
            <button
              onClick={() => {
                aiSuggestions.forEach(suggestion => handleDismissSuggestion(suggestion.id));
              }}
              className="bg-red-500 text-white px-4 py-2 rounded text-sm font-medium hover:bg-red-600"
            >
              Ignore All
            </button>
          </div>
        </div>
      )}

        {/* AI Assistant Sidebar */}
        {showAiSidebar && (
          <div className={`${isAiSidebarMinimized ? 'w-16' : 'w-96'} border-l bg-white flex flex-col h-full transition-all duration-300`}>
            {!isAiSidebarMinimized && (
              <div className="flex-1 overflow-hidden">
                <AiAssistant
                  sessionId={sessionId}
                  currentContent={content}
                  onSuggestionsGenerated={handleAiSuggestionsGenerated}
                  onMinimize={() => setIsAiSidebarMinimized(true)}
                  onClose={() => setShowAiSidebar(false)}
                />
              </div>
            )}
            {isAiSidebarMinimized && (
              <div className="flex-1 flex flex-col items-center p-2 gap-2">
                <Button
                  onClick={() => setIsAiSidebarMinimized(false)}
                  variant="ghost"
                  size="sm"
                  className="w-full h-12 p-0"
                  title="Expand AI Assistant"
                >
                  <div className="transform -rotate-90 whitespace-nowrap text-xs">
                    AI Assistant
                  </div>
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Spell Check Suggestions Side Panel */}
        {showSpellCheckSuggestions && spellCheckSuggestions.length > 0 && (
          <div className="w-96 border-l border-gray-200 bg-white overflow-auto">
            <SpellCheckSuggestionsPanel
              suggestions={spellCheckSuggestions}
              onApplySuggestion={handleApplySpellCheckSuggestion}
              onDismissSuggestion={handleDismissSpellCheckSuggestion}
              onApplyAll={handleApplyAllSpellCheckSuggestions}
              onClose={() => setShowSpellCheckSuggestions(false)}
            />
          </div>
        )}
      </div>

      {/* AI Suggestions Panel */}
      {showAiSuggestions && aiSuggestions.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg p-4 z-40">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-blue-600" />
              <span className="font-medium">AI Writing Suggestions</span>
              <Badge variant="secondary">{aiSuggestions.length} suggestions</Badge>
            </div>
            <Button
              onClick={handleCloseSuggestions}
              variant="ghost"
              size="sm"
              className="gap-2"
            >
              <X className="h-4 w-4" />
              Close
            </Button>
          </div>
          
          <div className="flex flex-wrap gap-2 mb-4">
            {aiSuggestions.map((suggestion, index) => (
              <span
                key={index}
                className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 px-3 py-1 rounded-lg text-sm border cursor-pointer hover:bg-blue-100"
                onClick={() => handleApplySuggestion(suggestion)}
              >
                <span>"{suggestion.originalText}" → "{suggestion.suggestedText}"</span>
                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDismissSuggestion(suggestion.id);
                  }}
                  variant="ghost"
                  size="sm"
                  className="h-4 w-4 p-0 hover:bg-blue-200"
                >
                  <X className="h-3 w-3" />
                </Button>
              </span>
            ))}
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={handleApplyAllSuggestions}
              className="bg-green-500 text-white px-4 py-2 rounded text-sm font-medium hover:bg-green-600"
            >
              Apply All
            </button>
            <button
              onClick={() => {
                aiSuggestions.forEach(suggestion => handleDismissSuggestion(suggestion.id));
              }}
              className="bg-red-500 text-white px-4 py-2 rounded text-sm font-medium hover:bg-red-600"
            >
              Ignore All
            </button>
          </div>
        </div>
      )}
    </div>
  );
}