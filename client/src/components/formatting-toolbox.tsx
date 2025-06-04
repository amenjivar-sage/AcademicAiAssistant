import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Bold, Type, Minus, Plus } from 'lucide-react';

interface FormattingToolboxProps {
  selectedText: string;
  onBoldClick: () => void;
  isVisible: boolean;
}

export default function FormattingToolbox({ selectedText, onBoldClick, isVisible }: FormattingToolboxProps) {
  const [isMinimized, setIsMinimized] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  // Always show the floating icon, regardless of isVisible

  const toggleMinimized = () => {
    setIsMinimized(!isMinimized);
  };

  const toggleOpen = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      setIsMinimized(false);
    }
  };

  // Floating tool icon when closed
  if (!isOpen) {
    return (
      <div className="absolute left-[-80px] top-1/2 transform -translate-y-1/2 z-40">
        <Button
          onClick={toggleOpen}
          size="sm"
          variant="outline"
          className="h-10 w-10 p-0 rounded-full shadow-lg bg-white border-gray-300 hover:bg-gray-50"
          title="Open Formatting Tools"
        >
          <Type className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="absolute left-[-320px] top-1/2 transform -translate-y-1/2 z-40">
      <Card className="w-64 shadow-lg border-gray-300">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium flex items-center">
              <Type className="h-4 w-4 mr-2" />
              {isMinimized ? "Format" : "Formatting Tools"}
            </CardTitle>
            <div className="flex items-center space-x-1">
              <Button
                onClick={toggleMinimized}
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0"
                title={isMinimized ? "Expand" : "Minimize"}
              >
                {isMinimized ? <Plus className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
              </Button>
              <Button
                onClick={toggleOpen}
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
        
        {!isMinimized && (
          <CardContent className="pt-0">
            <div className="space-y-3">
              {/* Text Formatting Section */}
              <div>
                <div className="text-xs font-medium text-gray-500 mb-2">Text Formatting</div>
                <div className="flex flex-wrap gap-1">
                  <Button
                    onClick={onBoldClick}
                    size="sm"
                    variant="outline"
                    className={`h-8 w-8 p-0 ${selectedText ? 'hover:bg-blue-50' : 'opacity-50 cursor-not-allowed'}`}
                    disabled={!selectedText}
                    title="Bold (Ctrl+B)"
                  >
                    <Bold className="h-4 w-4" />
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
  );
}