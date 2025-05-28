import React, { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Copy, Search, AlertTriangle, CheckCircle, ExternalLink } from "lucide-react";

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
}

interface PlagiarismResult {
  similarity: number;
  sources: Array<{
    url: string;
    title: string;
    similarity: number;
    snippet: string;
  }>;
  originalityScore: number;
  concerns: Array<{
    type: "high_similarity" | "missing_citation" | "improper_paraphrase";
    text: string;
    suggestion: string;
  }>;
}

export default function CitationAssistant({ children, sessionId, onCitationAdded }: CitationAssistantProps) {
  const [open, setOpen] = useState(false);
  const [citationData, setCitationData] = useState<CitationData>({
    type: "book",
    title: "",
    author: "",
    publicationDate: "",
  });
  const [generatedCitation, setGeneratedCitation] = useState("");
  const [textToCheck, setTextToCheck] = useState("");
  const [plagiarismResult, setPlagiarismResult] = useState<PlagiarismResult | null>(null);
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

  const checkPlagiarismMutation = useMutation({
    mutationFn: async (text: string) => {
      return await apiRequest("POST", "/api/plagiarism/check", { 
        text, 
        sessionId 
      });
    },
    onSuccess: async (response) => {
      const result = await response.json();
      setPlagiarismResult(result);
      toast({
        title: "Plagiarism Check Complete",
        description: `Originality score: ${result.originalityScore}%`,
      });
    },
    onError: () => {
      toast({
        title: "Plagiarism Check Failed",
        description: "Please try again with different text.",
        variant: "destructive",
      });
    },
  });

  const handleGenerateCitation = () => {
    if (!citationData.title || !citationData.author) {
      toast({
        title: "Missing Information",
        description: "Please provide at least title and author information.",
        variant: "destructive",
      });
      return;
    }
    generateCitationMutation.mutate(citationData);
  };

  const handlePlagiarismCheck = () => {
    if (!textToCheck.trim()) {
      toast({
        title: "No Text to Check",
        description: "Please enter some text to check for plagiarism.",
        variant: "destructive",
      });
      return;
    }
    checkPlagiarismMutation.mutate(textToCheck);
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

  const getOriginalityColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  const getOriginalityIcon = (score: number) => {
    if (score >= 80) return CheckCircle;
    return AlertTriangle;
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Citation Assistant & Plagiarism Checker
          </DialogTitle>
          <DialogDescription>
            Generate proper citations and check your work for originality to maintain academic integrity.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="citation" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="citation">
              <BookOpen className="h-4 w-4 mr-2" />
              Citation Generator
            </TabsTrigger>
            <TabsTrigger value="plagiarism">
              <Search className="h-4 w-4 mr-2" />
              Plagiarism Checker
            </TabsTrigger>
          </TabsList>

          {/* Citation Generator Tab */}
          <TabsContent value="citation" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Generate Academic Citation</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
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
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="title">Title *</Label>
                    <Input
                      id="title"
                      value={citationData.title}
                      onChange={(e) => setCitationData(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="Enter title"
                    />
                  </div>
                  <div>
                    <Label htmlFor="author">Author *</Label>
                    <Input
                      id="author"
                      value={citationData.author}
                      onChange={(e) => setCitationData(prev => ({ ...prev, author: e.target.value }))}
                      placeholder="Last, First"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="date">Publication Date</Label>
                    <Input
                      id="date"
                      value={citationData.publicationDate}
                      onChange={(e) => setCitationData(prev => ({ ...prev, publicationDate: e.target.value }))}
                      placeholder="YYYY-MM-DD"
                    />
                  </div>
                  <div>
                    <Label htmlFor="publisher">Publisher</Label>
                    <Input
                      id="publisher"
                      value={citationData.publisher || ""}
                      onChange={(e) => setCitationData(prev => ({ ...prev, publisher: e.target.value }))}
                      placeholder="Publisher name"
                    />
                  </div>
                </div>

                {citationData.type === "website" && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="url">URL</Label>
                      <Input
                        id="url"
                        value={citationData.url || ""}
                        onChange={(e) => setCitationData(prev => ({ ...prev, url: e.target.value }))}
                        placeholder="https://..."
                      />
                    </div>
                    <div>
                      <Label htmlFor="accessDate">Access Date</Label>
                      <Input
                        id="accessDate"
                        value={citationData.accessDate || ""}
                        onChange={(e) => setCitationData(prev => ({ ...prev, accessDate: e.target.value }))}
                        placeholder="YYYY-MM-DD"
                      />
                    </div>
                  </div>
                )}

                {citationData.type === "journal" && (
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="journal">Journal Name</Label>
                      <Input
                        id="journal"
                        value={citationData.journal || ""}
                        onChange={(e) => setCitationData(prev => ({ ...prev, journal: e.target.value }))}
                        placeholder="Journal name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="volume">Volume</Label>
                      <Input
                        id="volume"
                        value={citationData.volume || ""}
                        onChange={(e) => setCitationData(prev => ({ ...prev, volume: e.target.value }))}
                        placeholder="Vol. #"
                      />
                    </div>
                    <div>
                      <Label htmlFor="pages">Pages</Label>
                      <Input
                        id="pages"
                        value={citationData.pages || ""}
                        onChange={(e) => setCitationData(prev => ({ ...prev, pages: e.target.value }))}
                        placeholder="pp. #-#"
                      />
                    </div>
                  </div>
                )}

                <Button 
                  onClick={handleGenerateCitation}
                  disabled={generateCitationMutation.isPending}
                  className="w-full"
                >
                  {generateCitationMutation.isPending ? "Generating..." : "Generate Citation"}
                </Button>

                {generatedCitation && (
                  <Card className="bg-gray-50">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm">Generated Citation (APA Style)</CardTitle>
                        <Button variant="outline" size="sm" onClick={copyCitation}>
                          <Copy className="h-4 w-4 mr-2" />
                          Copy
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm font-mono bg-white p-3 rounded border">
                        {generatedCitation}
                      </p>
                    </CardContent>
                  </Card>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Plagiarism Checker Tab */}
          <TabsContent value="plagiarism" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Check for Plagiarism</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="textCheck">Text to Check</Label>
                  <Textarea
                    id="textCheck"
                    value={textToCheck}
                    onChange={(e) => setTextToCheck(e.target.value)}
                    placeholder="Paste or type the text you want to check for plagiarism..."
                    rows={8}
                  />
                </div>

                <Button 
                  onClick={handlePlagiarismCheck}
                  disabled={checkPlagiarismMutation.isPending}
                  className="w-full"
                >
                  {checkPlagiarismMutation.isPending ? "Checking..." : "Check for Plagiarism"}
                </Button>

                {plagiarismResult && (
                  <div className="space-y-4">
                    <Card className="border-l-4 border-l-blue-500">
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-lg">Originality Report</CardTitle>
                          <div className="flex items-center gap-2">
                            {React.createElement(getOriginalityIcon(plagiarismResult.originalityScore), {
                              className: `h-5 w-5 ${getOriginalityColor(plagiarismResult.originalityScore)}`
                            })}
                            <span className={`text-2xl font-bold ${getOriginalityColor(plagiarismResult.originalityScore)}`}>
                              {plagiarismResult.originalityScore}%
                            </span>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm text-gray-600">Overall Similarity</p>
                            <p className="text-lg font-semibold">{plagiarismResult.similarity}%</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Sources Found</p>
                            <p className="text-lg font-semibold">{plagiarismResult.sources.length}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {plagiarismResult.concerns.length > 0 && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5 text-yellow-600" />
                            Areas of Concern
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          {plagiarismResult.concerns.map((concern, index) => (
                            <div key={index} className="border-l-4 border-l-yellow-500 pl-4">
                              <div className="flex items-center gap-2 mb-2">
                                <Badge variant="outline">{concern.type.replace("_", " ")}</Badge>
                              </div>
                              <p className="text-sm text-gray-700 mb-2">"{concern.text}"</p>
                              <p className="text-sm text-blue-600">
                                <strong>Suggestion:</strong> {concern.suggestion}
                              </p>
                            </div>
                          ))}
                        </CardContent>
                      </Card>
                    )}

                    {plagiarismResult.sources.length > 0 && (
                      <Card>
                        <CardHeader>
                          <CardTitle>Similar Sources Found</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          {plagiarismResult.sources.slice(0, 3).map((source, index) => (
                            <div key={index} className="border rounded p-3">
                              <div className="flex items-center justify-between mb-2">
                                <h4 className="font-medium text-sm">{source.title}</h4>
                                <Badge variant="outline">{source.similarity}% match</Badge>
                              </div>
                              <p className="text-xs text-gray-600 mb-2">"{source.snippet}"</p>
                              <Button variant="outline" size="sm" asChild>
                                <a href={source.url} target="_blank" rel="noopener noreferrer">
                                  <ExternalLink className="h-3 w-3 mr-1" />
                                  View Source
                                </a>
                              </Button>
                            </div>
                          ))}
                        </CardContent>
                      </Card>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}