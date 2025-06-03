import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { insertAssignmentSchema, type InsertAssignment, type Classroom } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarIcon, Plus, FileText, Settings, Sparkles } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import AssignmentTemplates from "./assignment-templates";

interface AssignmentFormProps {
  teacherId: number;
  children?: React.ReactNode;
  assignment?: any; // For editing existing assignments
  mode?: "create" | "edit";
  classroomId?: number; // Pre-select classroom when creating from class view
}

const formSchema = insertAssignmentSchema.extend({
  dueDate: insertAssignmentSchema.shape.dueDate.nullable(),
});

export default function AssignmentForm({ teacherId, children, assignment, mode = "create", classroomId }: AssignmentFormProps) {
  const [open, setOpen] = React.useState(false);
  const [showTemplates, setShowTemplates] = React.useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch teacher's classrooms for the dropdown
  const { data: classrooms } = useQuery<Classroom[]>({
    queryKey: ["/api/teacher/classrooms"],
  });

  const form = useForm<InsertAssignment>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      teacherId,
      classroomId: assignment?.classroomId || classroomId || null,
      title: assignment?.title || "",
      description: assignment?.description || "",
      dueDate: assignment?.dueDate ? new Date(assignment.dueDate) : null,
      aiPermissions: assignment?.aiPermissions || "full",
      allowBrainstorming: assignment?.allowBrainstorming ?? true,
      allowOutlining: assignment?.allowOutlining ?? true,
      allowGrammarCheck: assignment?.allowGrammarCheck ?? true,
      allowResearchHelp: assignment?.allowResearchHelp ?? true,
    },
  });



  const createAssignmentMutation = useMutation({
    mutationFn: async (data: InsertAssignment) => {
      // Frontend validation before sending to server
      console.log("Submitting assignment data:", data);
      
      if (!data.title?.trim()) {
        throw new Error("Assignment title is required");
      }
      
      if (!data.description?.trim()) {
        throw new Error("Assignment description is required");
      }
      
      const response = await apiRequest("POST", "/api/assignments", data);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to create assignment");
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      // Force refresh the assignments list immediately
      queryClient.invalidateQueries({ queryKey: ["/api/teacher/assignments"] });
      queryClient.refetchQueries({ queryKey: ["/api/teacher/assignments"] });
      
      toast({
        title: "Assignment Created",
        description: "Your assignment has been created successfully!",
      });
      setOpen(false);
      form.reset({
        teacherId,
        title: "",
        description: "",
        dueDate: null,
        aiPermissions: "full",
        allowBrainstorming: true,
        allowOutlining: true,
        allowGrammarCheck: true,
        allowResearchHelp: true,
      });
    },
    onError: (error: any) => {
      console.error("Assignment creation error:", error);
      
      let errorMessage = "Failed to create assignment. Please try again.";
      
      // Check if the error response contains a specific message
      if (error?.message) {
        errorMessage = error.message;
      } else if (error?.response?.data?.message) {
        errorMessage = error.response.data.message;
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const updateAssignmentMutation = useMutation({
    mutationFn: async (data: InsertAssignment) => {
      const response = await apiRequest("PATCH", `/api/assignments/${assignment.id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/teacher/assignments"] });
      toast({
        title: "Assignment Updated",
        description: "Your assignment has been updated successfully!",
      });
      setOpen(false);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update assignment. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InsertAssignment) => {
    if (mode === "edit") {
      updateAssignmentMutation.mutate(data);
    } else {
      createAssignmentMutation.mutate(data);
    }
  };

  const handleTemplateSelect = (template: any) => {
    // Fill form with template data
    form.setValue("title", template.title);
    form.setValue("description", template.prompt);
    form.setValue("aiPermissions", template.aiPermissions);
    
    // Set AI permissions based on template
    const allowAll = template.aiPermissions === "full";
    const allowLimited = template.aiPermissions === "limited" || allowAll;
    
    form.setValue("allowBrainstorming", allowAll);
    form.setValue("allowOutlining", allowAll);
    form.setValue("allowGrammarCheck", allowLimited);
    form.setValue("allowResearchHelp", allowAll);
    
    // Close template picker and show assignment form
    setShowTemplates(false);
    setOpen(true);
  };

  return (
    <>
      {/* Assignment Templates Dialog */}
      <AssignmentTemplates 
        onSelectTemplate={handleTemplateSelect}
        open={showTemplates}
        onOpenChange={setShowTemplates}
      >
        <div></div>
      </AssignmentTemplates>

      {/* Assignment Form Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
        {children || (
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Create Assignment
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {mode === "edit" ? "Edit Assignment" : "Create New Assignment"}
            </DialogTitle>
            {mode === "create" && (
              <Button 
                variant="outline" 
                size="sm" 
                className="flex items-center gap-2"
                onClick={() => setShowTemplates(true)}
              >
                <Sparkles className="h-4 w-4" />
                Use Template
              </Button>
            )}
          </div>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Basic Information</h3>
              
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Assignment Title</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter assignment title..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="classroomId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Class</FormLabel>
                    <Select 
                      onValueChange={(value) => field.onChange(value === "0" ? null : parseInt(value))}
                      value={field.value?.toString() || "0"}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a class for this assignment" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="0">No class (general assignment)</SelectItem>
                        {classrooms?.map((classroom) => (
                          <SelectItem key={classroom.id} value={classroom.id.toString()}>
                            {classroom.name} - {classroom.subject} ({classroom.gradeLevel})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Choose which class this assignment belongs to, or leave unselected for a general assignment.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Provide detailed instructions and requirements for the assignment..."
                        className="min-h-[120px]"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Include learning objectives, requirements, and any specific guidelines.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="dueDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Due Date (Optional)</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>Pick a due date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value || undefined}
                          onSelect={field.onChange}
                          disabled={(date) => date < new Date()}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* AI Assistance Settings */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Settings className="h-5 w-5" />
                AI Assistance Settings
              </h3>
              
              <FormField
                control={form.control}
                name="aiPermissions"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>AI Permission Level</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select AI permission level" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">No AI Assistance</SelectItem>
                        <SelectItem value="limited">Limited Assistance (Grammar only)</SelectItem>
                        <SelectItem value="moderate">Moderate Assistance (Grammar + Structure)</SelectItem>
                        <SelectItem value="full">Full Assistance (All features)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Control what level of AI assistance students can access for this assignment.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="allowBrainstorming"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Brainstorming</FormLabel>
                        <FormDescription>
                          Allow AI to help with idea generation
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="allowOutlining"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Outlining</FormLabel>
                        <FormDescription>
                          Allow AI to help structure content
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="allowGrammarCheck"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Grammar Check</FormLabel>
                        <FormDescription>
                          Allow AI grammar and style suggestions
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="allowResearchHelp"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Research Help</FormLabel>
                        <FormDescription>
                          Allow AI to provide research guidance
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="allowCopyPaste"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 border-red-200">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base text-red-700">Copy & Paste</FormLabel>
                        <FormDescription className="text-red-600">
                          Allow students to copy and paste content (tracked for teachers)
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createAssignmentMutation.isPending || updateAssignmentMutation.isPending}
                className="flex-1"
              >
                {mode === "edit" 
                  ? (updateAssignmentMutation.isPending ? "Updating..." : "Update Assignment")
                  : (createAssignmentMutation.isPending ? "Creating..." : "Create Assignment")
                }
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
    </>
  );
}