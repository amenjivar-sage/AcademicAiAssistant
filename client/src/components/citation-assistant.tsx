import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BookOpen, Copy } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface CitationAssistantProps {
  children: React.ReactNode;
  sessionId?: number;
  onCitationAdded?: (citation: string) => void;
}

interface CitationData {
  type: "book" | "journal" | "website" | "newspaper";
  title: string;
  author: string;
  publicationDate: string;
  publisher?: string;
  url?: string;
  accessDate?: string;
  journal?: string;
  volume?: string;
  issue?: string;
  pages?: string;
  format: "APA" | "MLA";
}

export default function CitationAssistant({ children, sessionId, onCitationAdded }: CitationAssistantProps) {
  const [open, setOpen] = useState(false);
  const [citationData, setCitationData] = useState<CitationData>({
    type: "book",
    title: "",
    author: "",
    publicationDate: "",
    format: "APA",
  });
  const [generatedCitation, setGeneratedCitation] = useState("");
  const { toast } = useToast();

  const generateCitationMutation = useMutation({
    mutationFn: async (data: CitationData) => {
      return await apiRequest("POST", "/api/citations/generate", data);
    },
    onSuccess: async (response) => {
      const result = await response.json();
      setGeneratedCitation(result.citation);
      toast({
        title: "Citation Generated!",
        description: "Your citation has been formatted according to academic standards.",
      });
    },
    onError: () => {
      toast({
        title: "Citation Generation Failed",
        description: "Please check your source information and try again.",
        variant: "destructive",
      });
    },
  });

  const handleCitationGeneration = () => {
    if (!citationData.title || !citationData.author) {
      toast({
        title: "Missing Information",
        description: "Please provide at least a title and author for the citation.",
        variant: "destructive",
      });
      return;
    }
    generateCitationMutation.mutate(citationData);
  };

  const copyCitation = () => {
    navigator.clipboard.writeText(generatedCitation);
    toast({
      title: "Citation Copied!",
      description: "Citation has been copied to your clipboard.",
    });
    if (onCitationAdded) {
      onCitationAdded(generatedCitation);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Citation Generator
          </DialogTitle>
          <DialogDescription>
            Generate properly formatted citations for your academic work.
          </DialogDescription>
        </DialogHeader>

        <Card>
          <CardHeader>
            <CardTitle>Generate Academic Citation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="sourceType">Source Type</Label>
                <Select 
                  value={citationData.type} 
                  onValueChange={(value: CitationData["type"]) => 
                    setCitationData(prev => ({ ...prev, type: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select source type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="book">Book</SelectItem>
                    <SelectItem value="journal">Journal Article</SelectItem>
                    <SelectItem value="website">Website</SelectItem>
                    <SelectItem value="newspaper">Newspaper</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="citationFormat">Citation Format</Label>
                <Select 
                  value={citationData.format} 
                  onValueChange={(value: "APA" | "MLA") => 
                    setCitationData(prev => ({ ...prev, format: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select format" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="APA">APA Style</SelectItem>
                    <SelectItem value="MLA">MLA Style</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={citationData.title}
                  onChange={(e) => setCitationData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Enter the title of the source"
                />
              </div>
              <div>
                <Label htmlFor="author">Author *</Label>
                <Input
                  id="author"
                  value={citationData.author}
                  onChange={(e) => setCitationData(prev => ({ ...prev, author: e.target.value }))}
                  placeholder="Enter the author's name"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="publicationDate">Publication Date</Label>
                <Input
                  id="publicationDate"
                  value={citationData.publicationDate}
                  onChange={(e) => setCitationData(prev => ({ ...prev, publicationDate: e.target.value }))}
                  placeholder="YYYY or MM/DD/YYYY"
                />
              </div>
              <div>
                <Label htmlFor="publisher">Publisher</Label>
                <Input
                  id="publisher"
                  value={citationData.publisher || ""}
                  onChange={(e) => setCitationData(prev => ({ ...prev, publisher: e.target.value }))}
                  placeholder="Publisher or organization"
                />
              </div>
            </div>

            {/* Conditional fields based on source type */}
            {citationData.type === "journal" && (
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="journal">Journal Name</Label>
                  <Input
                    id="journal"
                    value={citationData.journal || ""}
                    onChange={(e) => setCitationData(prev => ({ ...prev, journal: e.target.value }))}
                    placeholder="Name of the journal"
                  />
                </div>
                <div>
                  <Label htmlFor="volume">Volume</Label>
                  <Input
                    id="volume"
                    value={citationData.volume || ""}
                    onChange={(e) => setCitationData(prev => ({ ...prev, volume: e.target.value }))}
                    placeholder="Volume number"
                  />
                </div>
                <div>
                  <Label htmlFor="pages">Pages</Label>
                  <Input
                    id="pages"
                    value={citationData.pages || ""}
                    onChange={(e) => setCitationData(prev => ({ ...prev, pages: e.target.value }))}
                    placeholder="Page range (e.g., 10-15)"
                  />
                </div>
              </div>
            )}

            {citationData.type === "website" && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="url">URL</Label>
                  <Input
                    id="url"
                    value={citationData.url || ""}
                    onChange={(e) => setCitationData(prev => ({ ...prev, url: e.target.value }))}
                    placeholder="https://example.com"
                  />
                </div>
                <div>
                  <Label htmlFor="accessDate">Access Date</Label>
                  <Input
                    id="accessDate"
                    value={citationData.accessDate || ""}
                    onChange={(e) => setCitationData(prev => ({ ...prev, accessDate: e.target.value }))}
                    placeholder="Date you accessed the website"
                  />
                </div>
              </div>
            )}

            <Button 
              onClick={handleCitationGeneration}
              disabled={generateCitationMutation.isPending}
              className="w-full"
            >
              {generateCitationMutation.isPending ? "Generating..." : "Generate Citation"}
            </Button>

            {generatedCitation && (
              <Card className="mt-4">
                <CardHeader>
                  <CardTitle className="text-lg">Generated Citation</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="bg-gray-50 p-4 rounded border">
                    <p className="text-sm leading-relaxed">{generatedCitation}</p>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <Button 
                      onClick={copyCitation}
                      variant="outline" 
                      size="sm"
                      className="flex items-center gap-2"
                    >
                      <Copy className="h-4 w-4" />
                      Copy Citation
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </CardContent>
        </Card>
      </DialogContent>
    </Dialog>
  );
}