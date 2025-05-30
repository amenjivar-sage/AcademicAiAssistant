import React from "react";
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface EnhancedToolbarProps {
  onFormatting?: (command: string, value?: string) => void;
  onSave?: () => void;
  isSaving?: boolean;
  onSpellCheck?: () => void;
}

export default function EnhancedToolbar({ 
  onFormatting, 
  onSave, 
  isSaving = false,
  onSpellCheck
}: EnhancedToolbarProps) {
  const handleFormat = (command: string, value?: string) => {
    onFormatting?.(command, value);
  };

  const fontSizes = [
    { label: "Small", value: "12px" },
    { label: "Normal", value: "14px" },
    { label: "Medium", value: "16px" },
    { label: "Large", value: "18px" },
    { label: "Extra Large", value: "24px" },
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
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm">
            <Palette className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-48">
          <div className="grid grid-cols-4 gap-2">
            {textColors.map((color) => (
              <button
                key={color}
                className="w-8 h-8 rounded border border-gray-300 hover:scale-110 transition-transform"
                style={{ backgroundColor: color }}
                onClick={() => handleFormat("foreColor", color)}
              />
            ))}
          </div>
        </PopoverContent>
      </Popover>

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

      {/* Special Elements */}
      <div className="flex items-center gap-1">
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