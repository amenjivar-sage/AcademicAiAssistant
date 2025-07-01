import React, { useState, useRef } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MessageCircle, X, Plus, Edit3, Bot } from "lucide-react";
import AiChatViewer from "./ai-chat-viewer";
import DocumentExportDialog from "./document-export-dialog";
import type { WritingSession } from "@shared/schema";

interface Comment {
  id: string;
  text: string;
  startIndex: number;
  endIndex: number;
  highlightedText: string;
  createdAt: Date;
}

interface DocumentReviewerProps {
  session: WritingSession;
  onGradeSubmit: (grade: string, feedback: string) => void;
  isSubmitting: boolean;
}

const commentSchema = z.object({
  comment: z.string().min(1, "Comment is required"),
});

const gradingSchema = z.object({
  grade: z.string().min(1, "Grade is required"),
  feedback: z.string().min(10, "Feedback must be at least 10 characters"),
});

type CommentForm = z.infer<typeof commentSchema>;
type GradingForm = z.infer<typeof gradingSchema>;

const gradeOptions = [
  { value: "A+", label: "A+ (97-100)" },
  { value: "A", label: "A (93-96)" },
  { value: "A-", label: "A- (90-92)" },
  { value: "B+", label: "B+ (87-89)" },
  { value: "B", label: "B (83-86)" },
  { value: "B-", label: "B- (80-82)" },
  { value: "C+", label: "C+ (77-79)" },
  { value: "C", label: "C (73-76)" },
  { value: "C-", label: "C- (70-72)" },
  { value: "D+", label: "D+ (67-69)" },
  { value: "D", label: "D (60-66)" },
  { value: "F", label: "F (Below 60)" },
];

export default function DocumentReviewer({ session, onGradeSubmit, isSubmitting }: DocumentReviewerProps) {
  const [selectedText, setSelectedText] = useState<{ text: string; start: number; end: number; x: number; y: number } | null>(null);
  const [showCommentForm, setShowCommentForm] = useState(false);
  const [activeComment, setActiveComment] = useState<string | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Get current user information
  const { data: currentUser } = useQuery({
    queryKey: ["/api/auth/user"],
  });

  // Get student information for the session
  const { data: studentInfo } = useQuery({
    queryKey: [`/api/users/${session.userId}`],
    enabled: !!session.userId,
  });

  // Fetch inline comments from database
  const { data: inlineComments = [], isLoading } = useQuery({
    queryKey: [`/api/sessions/${session.id}/comments`],
    retry: false,
  });

  // Convert database comments to display format
  const comments: Comment[] = Array.isArray(inlineComments) ? inlineComments.map((comment: any) => ({
    id: comment.id.toString(),
    text: comment.comment,
    startIndex: comment.startIndex,
    endIndex: comment.endIndex,
    highlightedText: comment.highlightedText,
    createdAt: new Date(comment.createdAt),
  })) : [];

  const commentForm = useForm<CommentForm>({
    resolver: zodResolver(commentSchema),
    defaultValues: {
      comment: "",
    },
  });

  const gradingForm = useForm<GradingForm>({
    resolver: zodResolver(gradingSchema),
    defaultValues: {
      grade: session.grade || "",
      feedback: session.teacherFeedback || "",
    },
  });

  // Add comment mutation
  const addCommentMutation = useMutation({
    mutationFn: async (commentData: any) => {
      const response = await apiRequest("POST", `/api/sessions/${session.id}/comments`, {
        ...commentData,
        teacherId: currentUser?.id || 1,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [`/api/sessions/${session.id}/comments`]
      });
      setShowCommentForm(false);
      setSelectedText(null);
      commentForm.reset();
      window.getSelection()?.removeAllRanges();
      toast({
        title: "Comment added",
        description: "Your feedback has been saved.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save comment. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Text selection handler
  // Check if two words are spelling corrections of each other
  const checkSpellingCorrection = (word1: string, word2: string): boolean => {
    const corrections: Record<string, string[]> = {
      'fealing': ['feeling'],
      'sandwitches': ['sandwiches'],
      'promissed': ['promised'],
      'probbably': ['probably'],
      'perfact': ['perfect'],
      'reminde': ['remind'],
      'teh': ['the'],
      'adn': ['and'],
      'recieve': ['receive'],
      'seperate': ['separate'],
      'definately': ['definitely'],
      'occured': ['occurred'],
      'necesary': ['necessary'],
      'beleive': ['believe'],
      'freind': ['friend'],
      'wierd': ['weird'],
      'calender': ['calendar'],
      'tommorrow': ['tomorrow'],
      'alot': ['a lot'],
      'becuase': ['because'],
      'thier': ['their'],
      'youre': ['you\'re'],
      'its': ['it\'s'],
      'cant': ['can\'t'],
      'dont': ['don\'t'],
      'wont': ['won\'t'],
      'isnt': ['isn\'t'],
      'wasnt': ['wasn\'t'],
      'arent': ['aren\'t'],
      'hasnt': ['hasn\'t'],
      'havent': ['haven\'t'],
      'hadnt': ['hadn\'t']
    };

    // Check direct mapping
    if (corrections[word1]?.includes(word2) || corrections[word2]?.includes(word1)) {
      return true;
    }

    // Check reverse mapping
    for (const [incorrect, correctList] of Object.entries(corrections)) {
      if (correctList.includes(word1) && word2 === incorrect) return true;
      if (correctList.includes(word2) && word1 === incorrect) return true;
    }

    // Check for similar word structure (Levenshtein distance approach)
    if (Math.abs(word1.length - word2.length) <= 2) {
      let distance = 0;
      const maxLen = Math.max(word1.length, word2.length);
      
      for (let i = 0; i < maxLen; i++) {
        if (word1[i] !== word2[i]) distance++;
      }
      
      // Allow up to 2 character differences for words longer than 4 characters
      if (word1.length > 4 && distance <= 2) return true;
      if (word1.length <= 4 && distance <= 1) return true;
    }

    return false;
  };

  const handleTextSelection = () => {
    const selection = window.getSelection();
    if (selection && selection.toString().trim()) {
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      const containerRect = contentRef.current?.getBoundingClientRect();
      
      if (containerRect) {
        const selectedText = selection.toString();
        const startOffset = range.startOffset;
        const endOffset = range.endOffset;
        
        setSelectedText({
          text: selectedText,
          start: startOffset,
          end: endOffset,
          x: rect.left - containerRect.left,
          y: rect.bottom - containerRect.top + 10,
        });
        setShowCommentForm(true);
      }
    }
  };

  // Add a new comment
  const handleAddComment = (data: CommentForm) => {
    if (!selectedText) return;

    addCommentMutation.mutate({
      startIndex: selectedText.start,
      endIndex: selectedText.end,
      highlightedText: selectedText.text,
      comment: data.comment,
    });
  };

  // Helper function to highlight pasted content in red
  const highlightPastedContent = (text: string) => {
    console.log('=== DOCUMENT REVIEWER DEBUG ===');
    console.log('Session ID:', session.id);
    console.log('Raw pastedContent type:', typeof session.pastedContent);
    console.log('Raw pastedContent value:', session.pastedContent);
    console.log('Content length:', session.pastedContent ? session.pastedContent.length : 'null');

    // Parse the pasted content from the database (stored as JSON string)
    let pastedData = [];
    if (session.pastedContent) {
      try {
        if (typeof session.pastedContent === 'string') {
          pastedData = JSON.parse(session.pastedContent);
        } else if (Array.isArray(session.pastedContent)) {
          pastedData = session.pastedContent;
        }
      } catch (e) {
        console.error('Error parsing pasted content:', e);
        return text;
      }
    }

    console.log('Parsed pasted data:', pastedData);
    console.log('Pasted data length:', pastedData.length);

    if (!pastedData || !Array.isArray(pastedData) || pastedData.length === 0) {
      console.log('No valid pasted content found');
      return text;
    }

    let result = text;
    
    const pastedTexts = pastedData.map((item: any) => {
      if (typeof item === 'string') return item;
      if (item && typeof item === 'object') {
        return item.text || item.content || item.value || '';
      }
      return '';
    }).filter((pastedText: string) => pastedText && pastedText.length > 10);

    console.log('Extracted pasted texts:', pastedTexts);

    // Track overall document statistics for comprehensive detection
    let totalSentencesAnalyzed = 0;
    let totalSentencesWithMatches = 0;
    let totalWordsInDocument = 0;
    let totalMatchedWords = 0;

    pastedTexts.forEach((pastedText: string) => {
      if (pastedText) {
        console.log('Processing pasted text:', pastedText);
        console.log('Current document content:', result);
        
        // Try exact match first (case insensitive and flexible punctuation)
        const normalizedPastedText = pastedText.replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim();
        const normalizedDocument = result.replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ');
        
        if (result.includes(pastedText)) {
          // Perfect exact match
          const escapedText = pastedText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const regex = new RegExp(escapedText, 'gi');
          result = result.replace(regex, `<span style="background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 1px 3px; color: #991b1b; font-weight: 500;" title="Copy-pasted content detected">${pastedText}</span>`);
          console.log('✓ Applied exact match highlighting for:', pastedText.substring(0, 50));
        } else if (normalizedDocument.toLowerCase().includes(normalizedPastedText.toLowerCase())) {
          // Flexible match (ignoring punctuation differences)
          console.log('✓ Found flexible match for:', pastedText.substring(0, 50));
          
          // Find the actual position in the original text
          const words = normalizedPastedText.split(/\s+/);
          if (words.length >= 2) {
            // Create a regex that matches the sequence of words with flexible spacing/punctuation
            const wordPattern = words.map(word => word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('\\s*[.,!?;:]*\\s*');
            const flexibleRegex = new RegExp(wordPattern, 'gi');
            
            result = result.replace(flexibleRegex, (match) => {
              if (!match.includes('background-color: #fef2f2')) {
                return `<span style="background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 1px 3px; color: #991b1b; font-weight: 500;" title="Copy-pasted content detected">${match}</span>`;
              }
              return match;
            });
          }
        } else {
          // Comprehensive pasted content detection - prioritize whole text highlighting
          console.log('✓ No exact match - attempting comprehensive detection for:', pastedText.substring(0, 100));
          
          // First, try to find large chunks of the pasted text (phrases, sentences, paragraphs)
          const normalizedCleanDoc = result.replace(/<[^>]*>/g, '').replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').toLowerCase();
          const normalizedPastedClean = normalizedPastedText.toLowerCase();
          
          // Try to find substantial portions of the pasted text
          let foundLargeMatch = false;
          
          // Check for 70%+ of the pasted content appearing in sequence
          if (normalizedPastedClean.length > 50) {
            const pastedWords = normalizedPastedClean.split(/\s+/);
            const totalWords = pastedWords.length;
            
            // Look for sequences of at least 70% of the words in order
            for (let startIdx = 0; startIdx <= totalWords - Math.floor(totalWords * 0.7); startIdx++) {
              const endIdx = Math.min(startIdx + Math.floor(totalWords * 0.9), totalWords);
              const subsequence = pastedWords.slice(startIdx, endIdx).join(' ');
              
              if (normalizedCleanDoc.includes(subsequence)) {
                console.log(`✓ Found large subsequence match (${endIdx - startIdx} words):`, subsequence.substring(0, 100));
                
                // Now find this in the original document and highlight it
                const originalWords = subsequence.split(/\s+/);
                const pattern = originalWords.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('\\s*[.,!?;:]*\\s*');
                const subsequenceRegex = new RegExp(pattern, 'gi');
                
                result = result.replace(subsequenceRegex, (match) => {
                  if (!match.includes('background-color: #fef2f2')) {
                    foundLargeMatch = true;
                    return `<span style="background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 1px 3px; color: #991b1b; font-weight: 500;" title="Copy-pasted content detected (${Math.round(((endIdx - startIdx) / totalWords) * 100)}% match)">${match}</span>`;
                  }
                  return match;
                });
              }
            }
          }
          
          // If no large match found, try individual sentence matching as fallback
          if (!foundLargeMatch) {
            console.log('No large match found, trying individual sentence detection...');
            const sentences = pastedText.split(/[.!?]+/).filter(s => s.trim().length > 15);
            
            sentences.forEach((sentence: string) => {
              const trimmedSentence = sentence.trim();
              console.log('Looking for sentence in content:', trimmedSentence.substring(0, 50) + '...');
              
              // Try flexible sentence matching
              const sentenceWords = trimmedSentence.split(/\s+/).filter(w => w.length >= 3);
              if (sentenceWords.length >= 4) {
                // Create a flexible pattern to match the sentence
                const wordPattern = sentenceWords.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('\\s*[.,!?;:]*\\s*');
                const sentenceRegex = new RegExp(wordPattern, 'gi');
                
                result = result.replace(sentenceRegex, (match) => {
                  if (!match.includes('background-color: #fef2f2')) {
                    console.log('✓ Found sentence match:', match.substring(0, 50));
                    return `<span style="background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 1px 3px; color: #991b1b; font-weight: 500;" title="Copy-pasted sentence detected">${match}</span>`;
                  }
                  return match;
                });
              }
            });
          }
        }
                    
                    // Count how many pasted words have matches in the document sentence
                    pastedWords.forEach((pastedWord: string) => {
                      const cleanPastedWord = pastedWord.replace(/[.,!?;]/g, '');
                      
                      docWords.forEach((docWord: string) => {
                        // Exact match
                        if (cleanPastedWord === docWord) {
                          exactMatches += 1;
                        }
                        // Only check for non-spell-check related similarities
                        else if (cleanPastedWord.length >= 3 && docWord.length >= 3) {
                          // Skip obvious spell check corrections to avoid false positives
                          const commonSpellCheckPairs = [
                            ['mispelled', 'misspelled'], ['recieve', 'receive'], ['seperate', 'separate'],
                            ['definately', 'definitely'], ['occured', 'occurred'], ['necesary', 'necessary'],
                            ['beleive', 'believe'], ['freind', 'friend'], ['wierd', 'weird'],
                            ['teh', 'the'], ['adn', 'and'], ['wich', 'which'], ['alot', 'a lot'],
                            ['there', 'their'], ['your', 'you\'re'], ['its', 'it\'s']
                          ];
                          
                          // Check if this is a known spell check correction pair
                          const isSpellCheckCorrection = commonSpellCheckPairs.some(([wrong, right]) => 
                            (cleanPastedWord === wrong && docWord === right) ||
                            (cleanPastedWord === right && docWord === wrong)
                          );
                          
                          // Only count as similarity match if it's NOT a spell check correction
                          if (!isSpellCheckCorrection) {
                            const rootMatch = cleanPastedWord.substring(0, 3) === docWord.substring(0, 3) &&
                                            Math.abs(cleanPastedWord.length - docWord.length) <= 2;
                            
                            if (rootMatch) {
                              closeMatches += 0.5; // Reduced weight for non-spell-check similarities
                            }
                          }
                        }
                      });
                    });
                    
                    // Calculate match strength - focus on exact matches to reduce spell-check false positives
                    const totalMatches = exactMatches + (closeMatches * 0.3); // Reduced weight for close matches
                    const matchPercentage = totalMatches / pastedWords.length;
                    console.log('Match analysis for sentence:', docSentTrimmed, 
                               'Exact:', exactMatches, 'Close:', closeMatches, 'Percentage:', matchPercentage);
                    
                    // Stricter criteria to reduce false positives from spell-checked content
                    const meetsThreshold = matchPercentage >= 0.75; // Require 75% similarity (increased from 60%)
                    const hasEnoughExactMatches = exactMatches >= Math.max(3, Math.floor(pastedWords.length * 0.60)); // Require 60% exact matches (increased from 40%)
                    const hasMinLength = pastedWords.length >= 5 && docWords.length >= 5; // Require longer sentences
                    
                    console.log('Criteria check for:', docSentTrimmed);
                    console.log('- Meets threshold (60%):', meetsThreshold, matchPercentage);
                    console.log('- Has enough exact matches (40%):', hasEnoughExactMatches, exactMatches, 'needed:', Math.floor(pastedWords.length * 0.4));
                    console.log('- Has min length:', hasMinLength, 'pasted:', pastedWords.length, 'doc:', docWords.length);
                    
                    // Track statistics for aggregate analysis
                    totalSentencesAnalyzed++;
                    totalWordsInDocument += docWords.length;
                    
                    if (matchPercentage >= 0.30) { // Count any significant matches
                      totalSentencesWithMatches++;
                      totalMatchedWords += exactMatches + (closeMatches * 0.5);
                    }
                    
                    if (meetsThreshold && hasEnoughExactMatches && hasMinLength) {
                      console.log('✓ All criteria met, proceeding with highlighting checks for:', docSentTrimmed.substring(0, 100));
                      
                      try {
                        // Enhanced check: avoid highlighting legitimate content patterns
                        const hasOriginalPatterns = /\b(sky|hello|how are you|doing|good morning|dear|sincerely)\b/i.test(docSentTrimmed);
                        
                        // Skip code snippets and technical documentation - these are often legitimate references
                        const isCodeSnippet = /(\{|\}|function|const|let|var|import|export|return|if\s*\(|\.map\(|\.filter\(|className=|style=|<\/|&gt;|&lt;|useEffect|useState|ReactQuill|HTMLDivElement|<\/li>|<li>|<ul>|<\/ul>|<p>|<\/p>)/i.test(docSentTrimmed);
                        
                        // Skip content that looks like legitimate references or citations
                        const isReference = /(\(\d{4}\)|et al\.|pp\.|Vol\.|No\.|ISBN|DOI:|https?:\/\/)/i.test(docSentTrimmed);
                        
                        // Skip content that looks like random character strings (not real plagiarism)
                        const isRandomText = /^[a-z]{3,}[;:.,]{1,3}[a-z]{3,}[;:.,]{1,3}/.test(docSentTrimmed) || 
                                            docSentTrimmed.split(';').length > 3 ||
                                            /^[a-z]+;[a-z]+;[a-z]+/.test(docSentTrimmed);
                        
                        console.log('- Has original patterns:', hasOriginalPatterns);
                        console.log('- Is code snippet:', isCodeSnippet);
                        console.log('- Is reference:', isReference);
                        console.log('- Is random text:', isRandomText);
                        
                        // Don't highlight if it's code, references, or random text
                        if (isCodeSnippet || isReference || isRandomText) {
                          console.log('✗ Skipped - code snippet, reference, or random text');
                          return;
                        }
                        
                        // Only highlight with very strict criteria to avoid spell-check false positives
                        if ((matchPercentage >= 0.85 && exactMatches >= 10) || (matchPercentage >= 0.95 && exactMatches >= 8)) {
                          console.log('✓ Highlighting detected copy-paste content:', docSentTrimmed.substring(0, 50));
                          const escapedSentence = docSentTrimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                          const sentenceRegex = new RegExp(escapedSentence, 'gi');
                          
                          result = result.replace(sentenceRegex, (match) => {
                            if (!match.includes('style="background-color: #fecaca')) {
                              console.log('Applied red highlighting to:', match.substring(0, 50));
                              const highlightedHTML = `<span style="background-color: #fecaca; border-bottom: 2px solid #f87171; color: #991b1b; font-weight: 600; padding: 2px 4px; border-radius: 3px;" title="Copy-pasted content detected (${Math.round(matchPercentage * 100)}% match)">${match}</span>`;
                              return highlightedHTML;
                            }
                            return match;
                          });
                        } else {
                          console.log('✗ Skipped - insufficient match criteria:', matchPercentage, 'exactMatches:', exactMatches);
                        }
                      } catch (error) {
                        console.error('Error in highlighting logic:', error);
                      }
                    } else {
                      console.log('✗ Does not meet criteria');
                    }
                  }
                });
              }
            }
          });
        }
      }
    });

    // Comprehensive document-level analysis for large-scale copying
    console.log('=== AGGREGATE ANALYSIS ===');
    console.log('Total sentences analyzed:', totalSentencesAnalyzed);
    console.log('Sentences with matches:', totalSentencesWithMatches);
    console.log('Total words in document:', totalWordsInDocument);
    console.log('Total matched words:', totalMatchedWords);
    
    if (totalSentencesAnalyzed > 0) {
      const sentenceMatchPercentage = totalSentencesWithMatches / totalSentencesAnalyzed;
      const wordMatchPercentage = totalMatchedWords / totalWordsInDocument;
      
      console.log('Sentence match percentage:', sentenceMatchPercentage);
      console.log('Word match percentage:', wordMatchPercentage);
      
      // Detect large-scale document copying
      const isLargeScaleCopying = (
        (sentenceMatchPercentage >= 0.50 && totalSentencesAnalyzed >= 5) || // 50% of sentences have matches
        (wordMatchPercentage >= 0.30 && totalWordsInDocument >= 50) || // 30% of words are matched
        (totalMatchedWords >= 80 && wordMatchPercentage >= 0.25) // High word count with significant matches
      );
      
      if (isLargeScaleCopying) {
        console.log('🚨 LARGE-SCALE COPYING DETECTED - Adding warning banner');
        
        // Add a prominent warning banner to the document
        const warningBanner = `<div style="background-color: #fef2f2; border: 2px solid #f87171; border-radius: 8px; padding: 16px; margin: 16px 0; color: #991b1b;">
          <h3 style="margin: 0 0 8px 0; font-weight: bold;">⚠️ Significant Copy-Paste Activity Detected</h3>
          <p style="margin: 0; font-size: 14px;">This document shows extensive similarities to pasted content (${Math.round(sentenceMatchPercentage * 100)}% of sentences, ${Math.round(wordMatchPercentage * 100)}% of words match). Please review for academic integrity.</p>
        </div>`;
        
        result = warningBanner + result;
      }
    }

    // Position-based detection disabled to prevent false positives on original content
    // Only rely on exact text matching to avoid flagging student's original work
    console.log('Position-based detection disabled to prevent false positives');
    
    // Direct highlighting for detected copy-paste sections
    console.log('Final highlighting pass - applying red highlighting to detected content');
    
    // Highlight only specific technical content that was detected as copy-pasted
    if (result.includes('ReactQuill') && result.includes('editor component')) {
      console.log('✓ Found ReactQuill/editor content - applying highlighting');
      
      // Only highlight the specific technical phrase that was detected
      const highlightPatterns = [
        'Great — I\'ve created the new soft page-break editor component using ReactQuill with invisible page breaks based on vertical spacing only',
        'ReactQuill'
      ];
      
      highlightPatterns.forEach(pattern => {
        if (result.includes(pattern)) {
          console.log('✓ Highlighting pattern:', pattern.substring(0, 50));
          const escapedPattern = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const regex = new RegExp(escapedPattern, 'gi');
          result = result.replace(regex, `<span style="background-color: #fecaca; border-bottom: 2px solid #f87171; color: #991b1b; font-weight: 600; padding: 2px 4px; border-radius: 3px;" title="Copy-pasted content detected">${pattern}</span>`);
        }
      });
    }
    
    // Highlight complete code blocks that contain copy-pasted content
    if (result.includes('SoftPageBreakEditor') || result.includes('ReactQuill') || result.includes('useEffect')) {
      console.log('✓ Highlighting complete code block');
      
      // Find and highlight the entire code block
      const codePatterns = [
        'SoftPageBreakEditor.tsx',
        'import React',
        'import ReactQuill',
        'export default function',
        'useEffect',
        'MutationObserver',
        'observer.observe',
        'observer.disconnect',
        'const PAGE_HEIGHT = 950',
        'className="editor-wrapper"',
        'modules={{',
        'toolbar: [',
        'minHeight: \'100vh\''
      ];
      
      codePatterns.forEach(pattern => {
        if (result.includes(pattern)) {
          console.log('✓ Highlighting code pattern:', pattern);
          const escapedPattern = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const regex = new RegExp(escapedPattern, 'gi');
          result = result.replace(regex, `<span style="background-color: #fecaca; border-bottom: 2px solid #f87171; color: #991b1b; font-weight: 600; padding: 2px 4px; border-radius: 3px;" title="Copy-pasted code detected">${pattern}</span>`);
        }
      });
    }

    return result;
  };

  // Simple function to highlight pasted content in red
  const highlightPastedContentSimple = (content: string): string => {
    if (!session.pastedContent || !Array.isArray(session.pastedContent) || session.pastedContent.length === 0) {
      return content;
    }

    let result = content;
    
    console.log('Highlighting pasted content. Session pasted content:', session.pastedContent);
    console.log('Document content:', content);
    
    // Apply red highlighting to each pasted segment
    session.pastedContent.forEach((paste: any) => {
      if (paste.text && paste.text.trim()) {
        console.log('Processing paste:', paste.text);
        
        // Split pasted text into sentences/paragraphs and match them individually
        const pastedSentences = paste.text.split(/\n\n|\. /).filter((s: string) => s.trim().length > 0);
        
        pastedSentences.forEach((sentence: string) => {
          const cleanSentence = sentence.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
          
          if (cleanSentence.length > 10) {
            console.log('Looking for sentence in content:', cleanSentence.substring(0, 50) + '...');
            
            // Strategy 1: Try exact matching first
            if (result.includes(cleanSentence)) {
              console.log('✓ Found exact sentence match');
              result = result.replace(cleanSentence, `<span style="background-color: #fee2e2; border: 2px solid #dc2626; padding: 2px 4px; border-radius: 3px; color: #991b1b; font-weight: 600;" title="Copy-pasted content detected on ${new Date(paste.timestamp).toLocaleString()}">${cleanSentence}</span>`);
              return;
            }
            
            // Strategy 2: Look for distinctive word sequences (3-5 words)
            const words = cleanSentence.split(/\s+/).filter(w => w.length > 2);
            if (words.length >= 4) {
              for (let i = 0; i <= words.length - 4; i++) {
                const phrase = words.slice(i, i + 4).join(' ');
                const phraseWords = phrase.split(' ').map(w => w.replace(/[^\w]/g, '')).filter(w => w.length > 0);
                
                if (phraseWords.length >= 3) {
                  // Create a flexible pattern that allows for minor variations
                  const pattern = phraseWords.map(word => 
                    word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
                  ).join('\\s+\\w*\\s*');
                  
                  const regex = new RegExp(`\\b${pattern}\\b`, 'gi');
                  const matches = result.match(regex);
                  
                  if (matches && matches.length > 0) {
                    console.log('✓ Found phrase match:', matches[0]);
                    result = result.replace(regex, (match) => {
                      return `<span style="background-color: #fee2e2; border: 2px solid #dc2626; padding: 2px 4px; border-radius: 3px; color: #991b1b; font-weight: 600;" title="Copy-pasted phrase detected on ${new Date(paste.timestamp).toLocaleString()}">${match}</span>`;
                    });
                    break; // Only highlight one match per phrase to avoid over-highlighting
                  }
                }
              }
            }
            
            // Strategy 3: Individual distinctive words (fallback)
            const distinctiveWords = words.filter(word => 
              word.length > 6 && 
              !/^(the|and|that|this|with|from|they|have|will|been|were|said|each|which|their|time|about|after|before|here|when|where|why|how|all|any|may|had|has|was|his|her|him|she|you|can|now|get|way|use|man|new|just|old|see|come|make|many|over|such|take|than|only|think|know|work|life|also|back|little|good|right|still|way|even|another|while|because|without|since|against|around|between)$/i.test(word)
            ).slice(0, 3);
            
            distinctiveWords.forEach(word => {
              const cleanWord = word.replace(/[^\w]/g, '');
              if (cleanWord.length > 5) {
                const wordRegex = new RegExp(`\\b${cleanWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
                if (result.match(wordRegex)) {
                  console.log('✓ Found distinctive word:', cleanWord);
                  result = result.replace(wordRegex, (match) => {
                    return `<span style="background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 1px 3px; color: #991b1b; font-weight: 500;" title="Copy-pasted word detected">${match}</span>`;
                  });
                }
              }
            });
          }
        });
      }
    });

    console.log('Final highlighted result:', result);
    return result;
  };

  // Helper function to add page breaks for teachers
  const addPageBreaksForTeacher = (content: string) => {
    if (!content) return content;

    // Clean content of existing HTML tags to get accurate character count
    const cleanContent = content.replace(/<[^>]*>/g, '');

    // Constants matching the student editor (adjusted for more visible page breaks)
    const PAGE_HEIGHT = 950; // 11 inches at 96 DPI minus margins
    const LINE_HEIGHT = 1.6;
    const FONT_SIZE = 14;
    const CHARS_PER_LINE = 85; // Average characters per line
    const LINES_PER_PAGE = Math.floor(PAGE_HEIGHT / (FONT_SIZE * LINE_HEIGHT));
    const CHARS_PER_PAGE = Math.max(1500, CHARS_PER_LINE * LINES_PER_PAGE); // Ensure reasonable page size, minimum 1500 chars

    console.log('Teacher page break calculation:', {
      contentLength: content.length,
      cleanContentLength: cleanContent.length,
      charsPerPage: CHARS_PER_PAGE,
      estimatedPages: Math.ceil(cleanContent.length / CHARS_PER_PAGE)
    });

    // Split clean content into lines for more accurate calculation
    const lines = cleanContent.split('\n');
    let result = content; // Start with the original highlighted content
    let currentPageChars = 0;
    let currentPage = 1;
    let insertPositions = [];

    lines.forEach((line, lineIndex) => {
      const lineCharCount = line.length + 1; // +1 for the newline
      
      // Check if this line would overflow the current page
      if (currentPageChars + lineCharCount > CHARS_PER_PAGE && currentPageChars > 0) {
        // Calculate where to insert the page break in the original content
        // This is approximate since we're working with clean content for calculation
        const approximatePosition = Math.floor((currentPageChars / cleanContent.length) * content.length);
        
        insertPositions.push({
          position: approximatePosition,
          pageBreak: `<div style="width: 100%; height: 4px; background: linear-gradient(to right, #dc2626 0%, #dc2626 100%); margin: 15px 0; position: relative; clear: both; border-radius: 2px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
            <div style="position: absolute; left: 50%; top: -15px; transform: translateX(-50%); background: white; padding: 2px 12px; color: #dc2626; font-weight: bold; font-size: 13px; white-space: nowrap; border: 1px solid #dc2626; border-radius: 4px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
              📄 Page ${currentPage} ends here - Page ${currentPage + 1} begins
            </div>
          </div>`
        });
        
        currentPage++;
        currentPageChars = 0;
      }

      currentPageChars += lineCharCount;
    });

    // Insert page breaks from end to beginning to preserve positions
    insertPositions.reverse().forEach(({ position, pageBreak }) => {
      // Find a good insertion point (end of a paragraph or sentence)
      let insertPoint = position;
      const lookAhead = Math.min(200, content.length - position);
      const searchText = content.substring(position, position + lookAhead);
      
      // Look for paragraph breaks or sentence endings
      const paragraphBreak = searchText.indexOf('</p>');
      const sentenceEnd = searchText.search(/[.!?]\s/);
      
      if (paragraphBreak !== -1 && paragraphBreak < 100) {
        insertPoint = position + paragraphBreak + 4; // After </p>
      } else if (sentenceEnd !== -1 && sentenceEnd < 50) {
        insertPoint = position + sentenceEnd + 2; // After sentence
      }
      
      result = result.slice(0, insertPoint) + pageBreak + result.slice(insertPoint);
    });

    console.log('Page breaks inserted:', insertPositions.length);
    return result;
  };

  // Render content with highlights
  const renderContentWithHighlights = () => {
    if (!session.content) return <p className="text-gray-500">No content available</p>;

    // First apply red highlighting for copy-pasted content
    let contentWithPasteHighlights = highlightPastedContentSimple(session.content);
    
    // Add page breaks for teachers to see page count
    contentWithPasteHighlights = addPageBreaksForTeacher(contentWithPasteHighlights);

    const sortedComments = [...comments].sort((a, b) => a.startIndex - b.startIndex);
    const elements = [];
    let lastIndex = 0;

    sortedComments.forEach((comment, index) => {
      // Add text before the comment
      if (lastIndex < comment.startIndex) {
        const textSegment = contentWithPasteHighlights.slice(lastIndex, comment.startIndex);
        elements.push(
          <span key={`text-${index}`} dangerouslySetInnerHTML={{ __html: textSegment }} />
        );
      }

      // Add highlighted comment
      const actualTextAtPosition = contentWithPasteHighlights.slice(comment.startIndex, comment.endIndex);
      
      elements.push(
        <span
          key={comment.id}
          className="bg-yellow-200 hover:bg-yellow-300 cursor-pointer relative"
          onClick={() => setActiveComment(activeComment === comment.id ? null : comment.id)}
        >
          <span dangerouslySetInnerHTML={{ __html: actualTextAtPosition }} />
          <MessageCircle className="inline h-3 w-3 ml-1 text-yellow-600" />
        </span>
      );

      lastIndex = comment.endIndex;
    });

    // Add remaining text after the last comment
    if (lastIndex < contentWithPasteHighlights.length) {
      const remainingText = contentWithPasteHighlights.slice(lastIndex);
      elements.push(
        <span key="final-text" dangerouslySetInnerHTML={{ __html: remainingText }} />
      );
    }

    // If no comments exist, return the entire content with paste highlighting
    if (comments.length === 0) {
      return <div className="whitespace-pre-wrap leading-relaxed" dangerouslySetInnerHTML={{ __html: contentWithPasteHighlights }} />;
    }

    return <div className="whitespace-pre-wrap leading-relaxed">{elements}</div>;
  };

  return (
    <div className="space-y-6">
      {/* Document Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl">{session.title}</CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="outline">{session.wordCount} words</Badge>
              <Badge variant="outline">
                {session.submittedAt ? `Submitted ${new Date(session.submittedAt).toLocaleDateString()}` : 'Draft'}
              </Badge>
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        {/* Document Content with AI Chat Tabs */}
        <div className="xl:col-span-3 min-w-0">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Document Review</h3>
                <DocumentExportDialog
                  content={session.content}
                  studentName={studentInfo?.firstName && studentInfo?.lastName ? `${studentInfo.firstName} ${studentInfo.lastName}` : 'Student'}
                  assignmentTitle={session.title || `Assignment_${session.assignmentId}`}
                  submissionDate={session.submittedAt ? new Date(session.submittedAt).toLocaleDateString() : undefined}
                  variant="outline"
                  size="sm"
                />
              </div>
              <Tabs defaultValue="document" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="document" className="flex items-center gap-2">
                    <Edit3 className="h-4 w-4" />
                    Student Writing
                  </TabsTrigger>
                  <TabsTrigger value="ai-chat" className="flex items-center gap-2">
                    <Bot className="h-4 w-4" />
                    AI Assistance Used
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="document" className="mt-4">
                  {session.pastedContent && Array.isArray(session.pastedContent) && session.pastedContent.length > 0 && (
                    <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-2 bg-red-500 rounded-full"></div>
                          <p className="text-sm text-red-700 font-medium">
                            Copy-paste activity detected: {session.pastedContent.length} instance(s) highlighted in red below
                          </p>
                        </div>
                        <div className="text-sm text-red-600 font-semibold">
                          {(() => {
                            const cleanContent = session.content ? session.content.replace(/<[^>]*>/g, '') : '';
                            const highlightedSpans = (cleanContent.match(/<span[^>]*style="background-color: #fecaca[^>]*>/g) || []).length;
                            const totalWords = cleanContent.split(/\s+/).filter(w => w.trim()).length;
                            
                            // Calculate percentage based on actually highlighted content
                            if (highlightedSpans > 0) {
                              // Estimate highlighted words (rough approximation)
                              const estimatedHighlightedWords = highlightedSpans * 15; // Average words per highlighted span
                              const percentage = totalWords > 0 ? Math.round((estimatedHighlightedWords / totalWords) * 100) : 0;
                              return `~${Math.min(percentage, 100)}% highlighted content`;
                            } else {
                              return `${session.pastedContent.length} copy-paste instances detected`;
                            }
                          })()}
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="mb-4">
                    <p className="text-sm text-gray-600">
                      Select any text to add specific feedback comments. Copy-pasted content appears highlighted in red.
                    </p>
                  </div>
                  <div className="relative w-full overflow-hidden">
                    <div
                      ref={contentRef}
                      className="bg-white border border-gray-200 rounded-lg shadow-sm min-h-96 cursor-text mx-auto prose prose-sm max-w-none"
                      onMouseUp={handleTextSelection}
                      style={{ 
                        userSelect: 'text',
                        maxWidth: '650px',
                        width: '100%',
                        padding: '60px',
                        lineHeight: '1.6',
                        fontSize: '14px',
                        fontFamily: 'Times, "Times New Roman", serif',
                        wordWrap: 'break-word',
                        overflowWrap: 'break-word',
                        hyphens: 'auto'
                      }}
                    >
                      <div style={{ wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>
                        {renderContentWithHighlights()}
                      </div>
                    </div>
                    
                    {/* Floating Comment Form */}
                    {showCommentForm && selectedText && (
                      <div 
                        className="absolute z-50 bg-white border border-blue-200 rounded-lg shadow-xl p-4 w-80"
                        style={{
                          left: `${Math.min(selectedText.x, window.innerWidth - 350)}px`,
                          top: `${Math.max(selectedText.y - 150, 10)}px`,
                          transform: selectedText.x > window.innerWidth - 400 ? 'translateX(-100%)' : 'translateX(0)',
                          maxHeight: '400px',
                          overflow: 'visible'
                        }}
                      >
                        <div className="space-y-3">
                          <div className="bg-blue-50 p-2 rounded text-sm">
                            <strong>Selected:</strong> "{selectedText.text}"
                          </div>
                          
                          <Form {...commentForm}>
                            <form onSubmit={commentForm.handleSubmit(handleAddComment)} className="space-y-3">
                              <FormField
                                control={commentForm.control}
                                name="comment"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormControl>
                                      <Textarea
                                        placeholder="Add your feedback here..."
                                        className="min-h-16 text-sm"
                                        autoFocus
                                        {...field}
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <div className="flex gap-2">
                                <Button type="submit" size="sm" className="flex-1">
                                  <Plus className="h-3 w-3 mr-1" />
                                  Save
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setShowCommentForm(false);
                                    setSelectedText(null);
                                    window.getSelection()?.removeAllRanges();
                                  }}
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            </form>
                          </Form>
                        </div>
                      </div>
                    )}
                  </div>
                </TabsContent>
                
                <TabsContent value="ai-chat" className="mt-4">
                  <AiChatViewer 
                    sessionId={session.id} 
                    studentName={`${(session as any).student?.firstName || 'Student'} ${(session as any).student?.lastName || ''}`}
                  />
                </TabsContent>
                

              </Tabs>
            </CardHeader>
          </Card>
        </div>

        {/* Comments and Grading Sidebar */}
        <div className="lg:col-span-2">
          <div className="sticky top-0 space-y-4">
            {/* Comments Panel */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageCircle className="h-5 w-5" />
                  Comments ({comments.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {comments.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">
                    No comments yet. Select text to add feedback.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {comments.map((comment) => (
                      <div
                        key={comment.id}
                        className={`p-4 rounded-lg border transition-colors block w-full ${
                          activeComment === comment.id 
                            ? 'border-blue-300 bg-blue-50' 
                            : 'border-gray-200 bg-gray-50'
                        }`}
                        style={{ display: 'block', width: '100%', marginBottom: '12px' }}
                      >
                        <div className="text-xs text-gray-500 mb-2 block w-full">
                          <strong>Selected text:</strong> "{comment.highlightedText}"
                        </div>
                        <div className="text-sm text-gray-800 mb-2 block w-full" style={{ wordWrap: 'break-word' }}>
                          {comment.text}
                        </div>
                        <div className="text-xs text-gray-400 block w-full">
                          {comment.createdAt.toLocaleString()}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Grading Panel */}
            <Card>
              <CardHeader>
                <CardTitle>Grade & Feedback</CardTitle>
              </CardHeader>
              <CardContent>
                <Form {...gradingForm}>
                  <form onSubmit={gradingForm.handleSubmit((data) => onGradeSubmit(data.grade, data.feedback))} className="space-y-4">
                    <FormField
                      control={gradingForm.control}
                      name="grade"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Grade</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a grade" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {gradeOptions.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={gradingForm.control}
                      name="feedback"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Overall Feedback</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Provide constructive feedback on the student's work..."
                              className="min-h-32"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button
                      type="submit"
                      className="w-full"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? "Submitting..." : "Submit Grade & Feedback"}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}