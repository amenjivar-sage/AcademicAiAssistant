import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { MessageSquare, Bug, Lightbulb, Star, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface FeedbackDialogProps {
  children: React.ReactNode;
  context?: 'assignment' | 'platform' | 'general';
  contextId?: number;
}

type FeedbackType = 'bug' | 'feature' | 'general' | 'assignment';

export default function FeedbackDialog({ children, context = 'general', contextId }: FeedbackDialogProps) {
  const [open, setOpen] = useState(false);
  const [feedbackType, setFeedbackType] = useState<FeedbackType>(context === 'assignment' ? 'assignment' : 'general');
  const [rating, setRating] = useState<string>('');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    priority: 'medium'
  });
  const { toast } = useToast();

  const submitFeedback = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/feedback", data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Feedback Submitted",
        description: "Thank you for your feedback! We'll review it and get back to you if needed.",
      });
      setOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "Submission Failed",
        description: error.message || "Failed to submit feedback. Please try again.",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({ title: '', description: '', category: '', priority: 'medium' });
    setRating('');
    setFeedbackType(context === 'assignment' ? 'assignment' : 'general');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const feedbackData = {
      type: feedbackType,
      title: formData.title,
      description: formData.description,
      category: formData.category,
      priority: formData.priority,
      rating: rating ? parseInt(rating) : null,
      contextType: context,
      contextId: contextId,
      userAgent: navigator.userAgent,
      url: window.location.href
    };

    submitFeedback.mutate(feedbackData);
  };

  const getFeedbackTypeIcon = (type: FeedbackType) => {
    switch (type) {
      case 'bug': return <Bug className="h-5 w-5 text-red-500" />;
      case 'feature': return <Lightbulb className="h-5 w-5 text-yellow-500" />;
      case 'assignment': return <Star className="h-5 w-5 text-blue-500" />;
      default: return <MessageSquare className="h-5 w-5 text-gray-500" />;
    }
  };

  const getFeedbackTypeTitle = (type: FeedbackType) => {
    switch (type) {
      case 'bug': return 'Report a Bug';
      case 'feature': return 'Request a Feature';
      case 'assignment': return 'Assignment Feedback';
      default: return 'General Feedback';
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {getFeedbackTypeIcon(feedbackType)}
            {getFeedbackTypeTitle(feedbackType)}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Feedback Type Selection */}
          {context === 'general' && (
            <div className="space-y-3">
              <Label className="text-base font-semibold">What type of feedback would you like to provide?</Label>
              <div className="grid grid-cols-2 gap-3">
                <Card 
                  className={`cursor-pointer transition-all ${feedbackType === 'bug' ? 'ring-2 ring-red-500 bg-red-50' : 'hover:bg-gray-50'}`}
                  onClick={() => setFeedbackType('bug')}
                >
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Bug className="h-4 w-4 text-red-500" />
                      Bug Report
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-xs text-gray-600">Something isn't working correctly</p>
                  </CardContent>
                </Card>

                <Card 
                  className={`cursor-pointer transition-all ${feedbackType === 'feature' ? 'ring-2 ring-yellow-500 bg-yellow-50' : 'hover:bg-gray-50'}`}
                  onClick={() => setFeedbackType('feature')}
                >
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Lightbulb className="h-4 w-4 text-yellow-500" />
                      Feature Request
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-xs text-gray-600">Suggest a new feature or improvement</p>
                  </CardContent>
                </Card>

                <Card 
                  className={`cursor-pointer transition-all ${feedbackType === 'general' ? 'ring-2 ring-blue-500 bg-blue-50' : 'hover:bg-gray-50'}`}
                  onClick={() => setFeedbackType('general')}
                >
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <MessageSquare className="h-4 w-4 text-blue-500" />
                      General Feedback
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-xs text-gray-600">Share your thoughts or suggestions</p>
                  </CardContent>
                </Card>

                <Card 
                  className={`cursor-pointer transition-all ${feedbackType === 'assignment' ? 'ring-2 ring-green-500 bg-green-50' : 'hover:bg-gray-50'}`}
                  onClick={() => setFeedbackType('assignment')}
                >
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Star className="h-4 w-4 text-green-500" />
                      Assignment Feedback
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-xs text-gray-600">Feedback about a specific assignment</p>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* Rating (for assignment and general feedback) */}
          {(feedbackType === 'assignment' || feedbackType === 'general') && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                How would you rate your experience? (Optional)
              </Label>
              <RadioGroup value={rating} onValueChange={setRating} className="flex space-x-4">
                {[1, 2, 3, 4, 5].map((num) => (
                  <div key={num} className="flex items-center space-x-2">
                    <RadioGroupItem value={num.toString()} id={`rating-${num}`} />
                    <Label htmlFor={`rating-${num}`} className="text-sm">{num} ⭐</Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
          )}

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title" className="text-sm font-medium">
              Title <span className="text-red-500">*</span>
            </Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder={
                feedbackType === 'bug' ? 'Brief description of the issue' :
                feedbackType === 'feature' ? 'What feature would you like to see?' :
                'Brief summary of your feedback'
              }
              required
            />
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label htmlFor="category" className="text-sm font-medium">Category</Label>
            <Select value={formData.category} onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {feedbackType === 'bug' && (
                  <>
                    <SelectItem value="ui">User Interface</SelectItem>
                    <SelectItem value="performance">Performance</SelectItem>
                    <SelectItem value="login">Login/Authentication</SelectItem>
                    <SelectItem value="writing">Writing Editor</SelectItem>
                    <SelectItem value="ai">AI Features</SelectItem>
                    <SelectItem value="export">Document Export</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </>
                )}
                {feedbackType === 'feature' && (
                  <>
                    <SelectItem value="writing">Writing Tools</SelectItem>
                    <SelectItem value="collaboration">Collaboration</SelectItem>
                    <SelectItem value="ai">AI Enhancements</SelectItem>
                    <SelectItem value="dashboard">Dashboard</SelectItem>
                    <SelectItem value="export">Export Options</SelectItem>
                    <SelectItem value="mobile">Mobile App</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </>
                )}
                {(feedbackType === 'general' || feedbackType === 'assignment') && (
                  <>
                    <SelectItem value="usability">Usability</SelectItem>
                    <SelectItem value="content">Content Quality</SelectItem>
                    <SelectItem value="support">Support</SelectItem>
                    <SelectItem value="suggestion">Suggestion</SelectItem>
                    <SelectItem value="compliment">Compliment</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </>
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Priority (for bugs and features) */}
          {(feedbackType === 'bug' || feedbackType === 'feature') && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Priority</Label>
              <RadioGroup value={formData.priority} onValueChange={(value) => setFormData(prev => ({ ...prev, priority: value }))}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="low" id="priority-low" />
                  <Label htmlFor="priority-low" className="text-sm">Low - Nice to have</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="medium" id="priority-medium" />
                  <Label htmlFor="priority-medium" className="text-sm">Medium - Important</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="high" id="priority-high" />
                  <Label htmlFor="priority-high" className="text-sm">High - Urgent</Label>
                </div>
              </RadioGroup>
            </div>
          )}

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description" className="text-sm font-medium">
              Description <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder={
                feedbackType === 'bug' ? 'Please describe what happened, what you expected to happen, and steps to reproduce the issue...' :
                feedbackType === 'feature' ? 'Please describe the feature in detail, why it would be useful, and how you envision it working...' :
                'Please provide your detailed feedback...'
              }
              className="min-h-[120px]"
              required
            />
          </div>

          {/* Submit Button */}
          <div className="flex justify-end space-x-3">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={submitFeedback.isPending || !formData.title || !formData.description}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {submitFeedback.isPending ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Submitting...
                </span>
              ) : (
                <span className="flex items-center">
                  <Send className="h-4 w-4 mr-2" />
                  Submit Feedback
                </span>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}