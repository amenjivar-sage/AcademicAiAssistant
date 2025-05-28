import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { GraduationCap, FileText, Clock, CheckCircle, Star } from "lucide-react";
import type { WritingSession } from "@shared/schema";

interface GradingInterfaceProps {
  assignmentId: number;
  children: React.ReactNode;
}

const gradingSchema = z.object({
  grade: z.string().min(1, "Grade is required"),
  feedback: z.string().min(10, "Feedback must be at least 10 characters"),
});

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

export default function GradingInterface({ assignmentId, children }: GradingInterfaceProps) {
  const [open, setOpen] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState<WritingSession | null>(null);
  const { toast } = useToast();

  // Get all submissions for this assignment
  const { data: submissions, isLoading } = useQuery<WritingSession[]>({
    queryKey: ["/api/assignments", assignmentId, "submissions"],
    enabled: open,
  });

  const form = useForm<GradingForm>({
    resolver: zodResolver(gradingSchema),
    defaultValues: {
      grade: "",
      feedback: "",
    },
  });

  // Submit grade mutation
  const submitGradeMutation = useMutation({
    mutationFn: async (data: GradingForm & { sessionId: number }) => {
      const response = await apiRequest("POST", `/api/sessions/${data.sessionId}/grade`, {
        grade: data.grade,
        feedback: data.feedback,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/assignments", assignmentId, "submissions"] });
      toast({
        title: "Grade Submitted",
        description: "Student feedback has been saved successfully!",
      });
      setSelectedSubmission(null);
      form.reset();
    },
  });

  const handleSelectSubmission = (submission: WritingSession) => {
    setSelectedSubmission(submission);
    // Pre-fill form if already graded
    if (submission.grade) {
      form.setValue("grade", submission.grade);
    }
    if (submission.teacherFeedback) {
      form.setValue("feedback", submission.teacherFeedback);
    }
  };

  const onSubmit = (data: GradingForm) => {
    if (!selectedSubmission) return;
    submitGradeMutation.mutate({
      ...data,
      sessionId: selectedSubmission.id,
    });
  };

  const getSubmissionStatus = (submission: WritingSession) => {
    if (submission.status === "graded") {
      return <Badge className="bg-green-100 text-green-800">Graded</Badge>;
    }
    if (submission.status === "submitted") {
      return <Badge className="bg-blue-100 text-blue-800">Needs Grading</Badge>;
    }
    return <Badge className="bg-gray-100 text-gray-800">Draft</Badge>;
  };

  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>{children}</DialogTrigger>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p>Loading submissions...</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5" />
            Grade Student Submissions
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Submissions List */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Student Submissions</h3>
            
            {submissions?.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No submissions yet</p>
                <p className="text-sm">Students haven't submitted their work</p>
              </div>
            )}

            {submissions?.map((submission) => (
              <Card 
                key={submission.id}
                className={`cursor-pointer transition-all ${
                  selectedSubmission?.id === submission.id ? 'ring-2 ring-blue-500' : 'hover:shadow-md'
                }`}
                onClick={() => handleSelectSubmission(submission)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{submission.title}</CardTitle>
                    {getSubmissionStatus(submission)}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <span>{submission.wordCount} words</span>
                    {submission.submittedAt && (
                      <span>Submitted {new Date(submission.submittedAt).toLocaleDateString()}</span>
                    )}
                  </div>
                </CardHeader>
                {submission.grade && (
                  <CardContent className="pt-0">
                    <div className="flex items-center gap-2">
                      <Star className="h-4 w-4 text-yellow-500" />
                      <span className="font-semibold">{submission.grade}</span>
                    </div>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>

          {/* Grading Panel */}
          <div className="space-y-4">
            {selectedSubmission ? (
              <>
                <div>
                  <h3 className="text-lg font-semibold mb-2">Review Submission</h3>
                  <div className="bg-gray-50 p-4 rounded-lg mb-4">
                    <h4 className="font-medium mb-2">{selectedSubmission.title}</h4>
                    <div className="text-sm text-gray-600 mb-3">
                      {selectedSubmission.wordCount} words • Submitted {selectedSubmission.submittedAt ? new Date(selectedSubmission.submittedAt).toLocaleDateString() : 'Not submitted'}
                    </div>
                    <div className="max-h-40 overflow-y-auto bg-white p-3 rounded border">
                      <p className="whitespace-pre-wrap text-sm">
                        {selectedSubmission.content || "No content available"}
                      </p>
                    </div>
                  </div>
                </div>

                <Separator />

                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
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
                      control={form.control}
                      name="feedback"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Teacher Feedback</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Provide detailed feedback on the student's work. Consider strengths, areas for improvement, and specific suggestions..."
                              className="min-h-32"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="flex gap-2">
                      <Button
                        type="submit"
                        disabled={submitGradeMutation.isPending}
                        className="flex-1"
                      >
                        {submitGradeMutation.isPending ? "Saving..." : "Submit Grade & Feedback"}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setSelectedSubmission(null);
                          form.reset();
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                </Form>
              </>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <CheckCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Select a submission to grade</p>
                <p className="text-sm">Click on any submission to start grading</p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}