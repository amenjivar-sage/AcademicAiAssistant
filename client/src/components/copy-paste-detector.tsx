import React, { useEffect, useRef, useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, AlertTriangle } from 'lucide-react';

interface PastedContent {
  text: string;
  startIndex: number;
  endIndex: number;
  timestamp: Date;
}

interface CopyPasteDetectorProps {
  allowCopyPaste: boolean;
  onPasteDetected: (pastedContent: PastedContent) => void;
  children: React.ReactNode;
  className?: string;
}

export default function CopyPasteDetector({ 
  allowCopyPaste, 
  onPasteDetected, 
  children, 
  className = "" 
}: CopyPasteDetectorProps) {
  const [showPasteWarning, setShowPasteWarning] = useState(false);
  const [lastPasteAttempt, setLastPasteAttempt] = useState<string>("");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handlePaste = (e: ClipboardEvent) => {
      const pastedText = e.clipboardData?.getData('text') || '';
      
      if (!allowCopyPaste) {
        // Block paste and show warning
        e.preventDefault();
        setLastPasteAttempt(pastedText.substring(0, 50) + (pastedText.length > 50 ? '...' : ''));
        setShowPasteWarning(true);
        setTimeout(() => setShowPasteWarning(false), 3000);
        return;
      }

      // Allow paste to happen naturally for textarea, but track it
      // Don't prevent default - let the textarea handle the paste normally
      
      // Get the textarea element
      const textarea = container.querySelector('textarea');
      if (textarea) {
        const startIndex = textarea.selectionStart || 0;
        
        // Track the paste - we'll let the normal paste event update the textarea value
        const pastedContent: PastedContent = {
          text: pastedText,
          startIndex: startIndex,
          endIndex: startIndex + pastedText.length,
          timestamp: new Date()
        };
        
        // Delay the callback to let the paste complete first
        setTimeout(() => {
          onPasteDetected(pastedContent);
        }, 0);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // Block Ctrl+V / Cmd+V when copy-paste is disabled
      if (!allowCopyPaste && (e.ctrlKey || e.metaKey) && e.key === 'v') {
        e.preventDefault();
        setShowPasteWarning(true);
        setTimeout(() => setShowPasteWarning(false), 3000);
      }
    };

    const handleContextMenu = (e: MouseEvent) => {
      // Disable right-click context menu when copy-paste is disabled
      if (!allowCopyPaste) {
        e.preventDefault();
      }
    };

    container.addEventListener('paste', handlePaste);
    container.addEventListener('keydown', handleKeyDown);
    container.addEventListener('contextmenu', handleContextMenu);

    return () => {
      container.removeEventListener('paste', handlePaste);
      container.removeEventListener('keydown', handleKeyDown);
      container.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [allowCopyPaste, onPasteDetected]);

  return (
    <div ref={containerRef} className={className}>
      {showPasteWarning && (
        <Alert className="mb-4 border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-700">
            <strong>Copy & Paste Disabled</strong><br />
            This assignment requires original work. Please type your response instead of copying from other sources.
            {lastPasteAttempt && (
              <div className="mt-2 text-sm bg-red-100 p-2 rounded">
                Attempted to paste: "{lastPasteAttempt}"
              </div>
            )}
          </AlertDescription>
        </Alert>
      )}
      
      {allowCopyPaste && (
        <Alert className="mb-4 border-yellow-200 bg-yellow-50">
          <Shield className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-yellow-700">
            <strong>Copy & Paste Tracking Active</strong><br />
            Your teacher has enabled copy & paste for this assignment. All pasted content will be highlighted for review.
          </AlertDescription>
        </Alert>
      )}
      
      {children}
    </div>
  );
}