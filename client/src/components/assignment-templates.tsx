import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { FileText, BookOpen, PenTool, Users, Clock, Target } from "lucide-react";

interface Template {
  id: string;
  title: string;
  description: string;
  category: "essay" | "research" | "creative" | "analysis";
  grade: string;
  duration: string;
  wordCount: string;
  aiPermissions: "full" | "limited" | "none";
  prompt: string;
  rubric: {
    criteria: string;
    excellent: string;
    good: string;
    fair: string;
    poor: string;
  }[];
}

const templates: Template[] = [
  {
    id: "persuasive-essay",
    title: "Persuasive Essay",
    description: "Students argue for a position on a current issue using evidence and reasoning",
    category: "essay",
    grade: "9-12",
    duration: "2 weeks",
    wordCount: "750-1000 words",
    aiPermissions: "limited",
    prompt: "Choose a current social, environmental, or political issue that matters to you. Write a persuasive essay that convinces your audience to support your position. Your essay should include:\n\n• A clear thesis statement\n• At least 3 strong supporting arguments\n• Evidence from credible sources\n• Acknowledgment of counterarguments\n• A compelling conclusion\n\nRemember to cite your sources properly and use persuasive techniques like logical reasoning, emotional appeals, and credible evidence.",
    rubric: [
      {
        criteria: "Thesis & Position",
        excellent: "Clear, compelling thesis with sophisticated position",
        good: "Clear thesis with well-defined position",
        fair: "Thesis present but somewhat unclear",
        poor: "Unclear or missing thesis"
      },
      {
        criteria: "Evidence & Support",
        excellent: "Strong, credible evidence with excellent analysis",
        good: "Good evidence with clear analysis",
        fair: "Some evidence but limited analysis",
        poor: "Weak or missing evidence"
      },
      {
        criteria: "Organization",
        excellent: "Logical flow with smooth transitions",
        good: "Clear organization with good transitions",
        fair: "Generally organized with some transitions",
        poor: "Poor organization, unclear structure"
      }
    ]
  },
  {
    id: "research-paper",
    title: "Research Paper",
    description: "In-depth research project with proper citations and academic formatting",
    category: "research",
    grade: "10-12",
    duration: "4 weeks",
    wordCount: "1500-2000 words",
    aiPermissions: "limited",
    prompt: "Conduct an in-depth research project on a topic related to our course content. Your research paper should demonstrate your ability to find, evaluate, and synthesize information from multiple sources.\n\nRequirements:\n• Minimum 8 credible sources\n• Proper MLA or APA citation format\n• Clear research question or thesis\n• Literature review section\n• Analysis and synthesis of findings\n• Works cited page\n\nThis assignment emphasizes critical thinking and academic research skills. Use AI assistance for brainstorming and organization, but all analysis and conclusions must be your own work.",
    rubric: [
      {
        criteria: "Research Quality",
        excellent: "Excellent use of diverse, credible sources",
        good: "Good variety of credible sources",
        fair: "Adequate sources with some credibility issues",
        poor: "Poor source selection or credibility"
      },
      {
        criteria: "Citations & Format",
        excellent: "Perfect citation format and bibliography",
        good: "Mostly correct citations with minor errors",
        fair: "Citations present but inconsistent format",
        poor: "Poor or missing citations"
      }
    ]
  },
  {
    id: "creative-narrative",
    title: "Creative Narrative",
    description: "Original short story focusing on character development and storytelling techniques",
    category: "creative",
    grade: "6-12",
    duration: "2 weeks",
    wordCount: "1000-1500 words",
    aiPermissions: "full",
    prompt: "Write an original short story that demonstrates your understanding of narrative elements. Your story should include:\n\n• A compelling protagonist with clear motivation\n• A well-developed setting that enhances the story\n• A central conflict that drives the plot\n• Effective use of dialogue\n• A satisfying resolution\n\nFocus on showing rather than telling, and use descriptive language to bring your story to life. You may use AI assistance for brainstorming ideas, developing characters, or improving your writing style.",
    rubric: [
      {
        criteria: "Character Development",
        excellent: "Rich, complex characters with clear motivation",
        good: "Well-developed characters with clear traits",
        fair: "Characters are present but somewhat flat",
        poor: "Weak or underdeveloped characters"
      },
      {
        criteria: "Plot & Structure",
        excellent: "Engaging plot with strong narrative arc",
        good: "Clear plot with good pacing",
        fair: "Basic plot structure with some issues",
        poor: "Unclear or weak plot development"
      }
    ]
  },
  {
    id: "literary-analysis",
    title: "Literary Analysis",
    description: "Close reading and analysis of literary themes, techniques, and meaning",
    category: "analysis",
    grade: "9-12",
    duration: "2 weeks",
    wordCount: "800-1200 words",
    aiPermissions: "none",
    prompt: "Choose a significant theme, symbol, or literary technique from our current reading. Write an analytical essay that examines how the author uses this element to convey meaning.\n\nYour analysis should:\n• Focus on a specific, arguable thesis\n• Use close reading of textual evidence\n• Explain how literary techniques create meaning\n• Demonstrate understanding of the work's context\n• Avoid plot summary in favor of analysis\n\nThis assignment requires independent critical thinking. AI assistance is not permitted to ensure authentic analysis and interpretation.",
    rubric: [
      {
        criteria: "Thesis & Analysis",
        excellent: "Sophisticated thesis with deep analysis",
        good: "Clear thesis with strong analysis",
        fair: "Basic thesis with adequate analysis",
        poor: "Weak thesis or superficial analysis"
      },
      {
        criteria: "Textual Evidence",
        excellent: "Excellent use of relevant, well-integrated quotes",
        good: "Good use of textual support",
        fair: "Some textual evidence but limited integration",
        poor: "Weak or missing textual support"
      }
    ]
  }
];

interface AssignmentTemplatesProps {
  onSelectTemplate: (template: Template) => void;
  children: React.ReactNode;
}

export default function AssignmentTemplates({ onSelectTemplate, children }: AssignmentTemplatesProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);

  const filteredTemplates = selectedCategory === "all" 
    ? templates 
    : templates.filter(t => t.category === selectedCategory);

  const categoryIcons = {
    essay: PenTool,
    research: BookOpen,
    creative: FileText,
    analysis: Target
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "essay": return "bg-blue-500";
      case "research": return "bg-green-500";
      case "creative": return "bg-purple-500";
      case "analysis": return "bg-orange-500";
      default: return "bg-gray-500";
    }
  };

  const getAiPermissionColor = (permission: string) => {
    switch (permission) {
      case "full": return "bg-green-100 text-green-800";
      case "limited": return "bg-yellow-100 text-yellow-800";
      case "none": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-gray-900">Assignment Templates</DialogTitle>
          <p className="text-gray-600">Choose from proven assignment templates with built-in rubrics and AI permission settings</p>
        </DialogHeader>

        <div className="space-y-6">
          {/* Category Filters */}
          <div className="flex flex-wrap gap-2">
            <Button
              variant={selectedCategory === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory("all")}
            >
              All Templates
            </Button>
            <Button
              variant={selectedCategory === "essay" ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory("essay")}
              className="flex items-center space-x-1"
            >
              <PenTool className="h-4 w-4" />
              <span>Essays</span>
            </Button>
            <Button
              variant={selectedCategory === "research" ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory("research")}
              className="flex items-center space-x-1"
            >
              <BookOpen className="h-4 w-4" />
              <span>Research</span>
            </Button>
            <Button
              variant={selectedCategory === "creative" ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory("creative")}
              className="flex items-center space-x-1"
            >
              <FileText className="h-4 w-4" />
              <span>Creative</span>
            </Button>
            <Button
              variant={selectedCategory === "analysis" ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory("analysis")}
              className="flex items-center space-x-1"
            >
              <Target className="h-4 w-4" />
              <span>Analysis</span>
            </Button>
          </div>

          {/* Template Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredTemplates.map((template) => {
              const IconComponent = categoryIcons[template.category];
              return (
                <Card key={template.id} className="cursor-pointer hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={`p-2 rounded-lg ${getCategoryColor(template.category)} text-white`}>
                          <IconComponent className="h-5 w-5" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">{template.title}</CardTitle>
                          <p className="text-sm text-gray-500 capitalize">{template.category}</p>
                        </div>
                      </div>
                      <Badge className={getAiPermissionColor(template.aiPermissions)}>
                        AI: {template.aiPermissions}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600 mb-4 text-sm">{template.description}</p>
                    
                    <div className="flex flex-wrap gap-2 mb-4">
                      <div className="flex items-center text-xs text-gray-500">
                        <Users className="h-3 w-3 mr-1" />
                        {template.grade}
                      </div>
                      <div className="flex items-center text-xs text-gray-500">
                        <Clock className="h-3 w-3 mr-1" />
                        {template.duration}
                      </div>
                      <div className="flex items-center text-xs text-gray-500">
                        <FileText className="h-3 w-3 mr-1" />
                        {template.wordCount}
                      </div>
                    </div>

                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedTemplate(template)}
                      >
                        Preview
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => onSelectTemplate(template)}
                        className="bg-edu-blue hover:bg-blue-700"
                      >
                        Use Template
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Template Preview Modal */}
        {selectedTemplate && (
          <Dialog open={!!selectedTemplate} onOpenChange={() => setSelectedTemplate(null)}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold">{selectedTemplate.title} - Template Preview</DialogTitle>
              </DialogHeader>
              
              <div className="space-y-6">
                <div className="prose max-w-none">
                  <h3 className="text-lg font-semibold mb-2">Assignment Prompt</h3>
                  <div className="bg-gray-50 p-4 rounded-lg whitespace-pre-line text-sm">
                    {selectedTemplate.prompt}
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-3">Grading Rubric</h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full border border-gray-300">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="border border-gray-300 px-4 py-2 text-left font-medium">Criteria</th>
                          <th className="border border-gray-300 px-4 py-2 text-left font-medium">Excellent (4)</th>
                          <th className="border border-gray-300 px-4 py-2 text-left font-medium">Good (3)</th>
                          <th className="border border-gray-300 px-4 py-2 text-left font-medium">Fair (2)</th>
                          <th className="border border-gray-300 px-4 py-2 text-left font-medium">Poor (1)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedTemplate.rubric.map((criterion, index) => (
                          <tr key={index}>
                            <td className="border border-gray-300 px-4 py-2 font-medium">{criterion.criteria}</td>
                            <td className="border border-gray-300 px-4 py-2 text-sm">{criterion.excellent}</td>
                            <td className="border border-gray-300 px-4 py-2 text-sm">{criterion.good}</td>
                            <td className="border border-gray-300 px-4 py-2 text-sm">{criterion.fair}</td>
                            <td className="border border-gray-300 px-4 py-2 text-sm">{criterion.poor}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setSelectedTemplate(null)}>
                    Close Preview
                  </Button>
                  <Button
                    onClick={() => {
                      onSelectTemplate(selectedTemplate);
                      setSelectedTemplate(null);
                    }}
                    className="bg-edu-blue hover:bg-blue-700"
                  >
                    Use This Template
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </DialogContent>
    </Dialog>
  );
}