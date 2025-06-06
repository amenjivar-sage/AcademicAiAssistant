import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { 
  Bold, 
  Italic, 
  Underline, 
  AlignLeft, 
  AlignCenter, 
  AlignRight, 
  List, 
  ListOrdered,
  Quote,
  Link,
  Image,
  Undo,
  Redo,
  Save,
  Share,
  Download,
  Palette,
  Type,
  Minus,
  CheckCircle,
  SpellCheck
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";

interface EnhancedToolbarProps {
  onFormatting?: (command: string, value?: string) => void;
  onSave?: () => void;
  isSaving?: boolean;
  onSpellCheck?: () => void;
  onHeaderFooterChange?: (settings: { header: string; footer: string; pageNumbers: boolean }) => void;
}

export default function EnhancedToolbar({ 
  onFormatting, 
  onSave, 
  isSaving = false,
  onSpellCheck,
  onHeaderFooterChange
}: EnhancedToolbarProps) {
  const [headerText, setHeaderText] = useState('');
  const [footerText, setFooterText] = useState('');
  const [showPageNumbers, setShowPageNumbers] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleFormat = (command: string, value?: string) => {
    onFormatting?.(command, value);
  };

  const fontSizes = [
    { label: "8", value: "8px" },
    { label: "9", value: "9px" },
    { label: "10", value: "10px" },
    { label: "11", value: "11px" },
    { label: "12", value: "12px" },
    { label: "14", value: "14px" },
    { label: "16", value: "16px" },
    { label: "18", value: "18px" },
    { label: "20", value: "20px" },
    { label: "22", value: "22px" },
    { label: "24", value: "24px" },
    { label: "26", value: "26px" },
    { label: "28", value: "28px" },
    { label: "36", value: "36px" },
    { label: "48", value: "48px" },
    { label: "72", value: "72px" },
  ];

  const fontFamilies = [
    { label: "Arial", value: "Arial, sans-serif" },
    { label: "Times New Roman", value: "Times New Roman, serif" },
    { label: "Helvetica", value: "Helvetica, sans-serif" },
    { label: "Georgia", value: "Georgia, serif" },
    { label: "Courier New", value: "Courier New, monospace" },
  ];

  const textColors = [
    "#000000", "#333333", "#666666", "#999999",
    "#FF0000", "#00FF00", "#0000FF", "#FFFF00",
    "#FF00FF", "#00FFFF", "#FFA500", "#800080"
  ];

  return (
    <div className="flex items-center gap-1 p-2 bg-white border-b border-gray-200 flex-wrap">
      {/* File Operations */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={onSave}
          disabled={isSaving}
          className="text-xs"
        >
          <Save className="h-4 w-4 mr-1" />
          {isSaving ? "Saving..." : "Save"}
        </Button>

      </div>

      <Separator orientation="vertical" className="h-6" />

      {/* Undo/Redo */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleFormat("undo")}
        >
          <Undo className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleFormat("redo")}
        >
          <Redo className="h-4 w-4" />
        </Button>
      </div>

      <Separator orientation="vertical" className="h-6" />

      {/* Font Family */}
      <Select onValueChange={(value) => handleFormat("fontName", value)}>
        <SelectTrigger className="w-32 h-8">
          <SelectValue placeholder="Font" />
        </SelectTrigger>
        <SelectContent>
          {fontFamilies.map((font) => (
            <SelectItem key={font.value} value={font.value}>
              <span style={{ fontFamily: font.value }}>{font.label}</span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Font Size */}
      <Select onValueChange={(value) => handleFormat("fontSize", value)}>
        <SelectTrigger className="w-20 h-8">
          <SelectValue placeholder="Size" />
        </SelectTrigger>
        <SelectContent>
          {fontSizes.map((size) => (
            <SelectItem key={size.value} value={size.value}>
              {size.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Separator orientation="vertical" className="h-6" />

      {/* Text Formatting */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleFormat("bold")}
        >
          <Bold className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleFormat("italic")}
        >
          <Italic className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleFormat("underline")}
        >
          <Underline className="h-4 w-4" />
        </Button>
      </div>

      <Separator orientation="vertical" className="h-6" />

      {/* Text Color */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => {
          const color = prompt("Enter color (hex code like #ff0000 or color name like red):");
          if (color) handleFormat("foreColor", color);
        }}
      >
        <Palette className="h-4 w-4" />
      </Button>

      <Separator orientation="vertical" className="h-6" />

      {/* Alignment */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleFormat("justifyLeft")}
        >
          <AlignLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleFormat("justifyCenter")}
        >
          <AlignCenter className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleFormat("justifyRight")}
        >
          <AlignRight className="h-4 w-4" />
        </Button>
      </div>

      <Separator orientation="vertical" className="h-6" />

      {/* Lists */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleFormat("insertUnorderedList")}
        >
          <List className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleFormat("insertOrderedList")}
        >
          <ListOrdered className="h-4 w-4" />
        </Button>
      </div>

      <Separator orientation="vertical" className="h-6" />

      {/* Page Elements */}
      <div className="flex items-center gap-1">
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="sm">
              <Type className="h-4 w-4 mr-1" />
              Header/Footer
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Page Header & Footer Settings</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <label htmlFor="header-input" className="text-right text-sm font-medium">
                  Header:
                </label>
                <Input 
                  id="header-input" 
                  value={headerText}
                  onChange={(e) => setHeaderText(e.target.value)}
                  placeholder="Enter header text..." 
                  className="col-span-3" 
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <label htmlFor="footer-input" className="text-right text-sm font-medium">
                  Footer:
                </label>
                <Input 
                  id="footer-input" 
                  value={footerText}
                  onChange={(e) => setFooterText(e.target.value)}
                  placeholder="Enter footer text..." 
                  className="col-span-3" 
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <label className="text-right text-sm font-medium">
                  Options:
                </label>
                <div className="col-span-3 flex items-center space-x-2">
                  <Checkbox 
                    id="page-numbers" 
                    checked={showPageNumbers}
                    onCheckedChange={(checked) => setShowPageNumbers(checked === true)}
                  />
                  <label htmlFor="page-numbers" className="text-sm">
                    Show page numbers
                  </label>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button 
                type="submit" 
                onClick={() => {
                  console.log('Header/Footer settings saved:', {
                    header: headerText,
                    footer: footerText,
                    pageNumbers: showPageNumbers
                  });
                  
                  // Call the callback to update the page settings
                  onHeaderFooterChange?.({
                    header: headerText,
                    footer: footerText,
                    pageNumbers: showPageNumbers
                  });
                  
                  setIsDialogOpen(false);
                }}
              >
                Save Settings
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleFormat("formatBlock", "blockquote")}
        >
          <Quote className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleFormat("insertHorizontalRule")}
        >
          <Minus className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            const url = prompt("Enter link URL:");
            if (url) handleFormat("createLink", url);
          }}
        >
          <Link className="h-4 w-4" />
        </Button>
      </div>

      <Separator orientation="vertical" className="h-6" />

      {/* Spell Check */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onSpellCheck}
        title="Check spelling"
      >
        <SpellCheck className="h-4 w-4" />
      </Button>
    </div>
  );
}