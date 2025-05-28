import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { insertAssignmentSchema, type InsertAssignment } from "@shared/schema";
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
}

const formSchema = insertAssignmentSchema.extend({
  dueDate: insertAssignmentSchema.shape.dueDate.nullable(),
});

export default function AssignmentForm({ teacherId, children, assignment, mode = "create" }: AssignmentFormProps) {
  const [open, setOpen] = React.useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<InsertAssignment>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      teacherId,
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
      const response = await apiRequest("POST", "/api/assignments", data);
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
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create assignment. Please try again.",
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
  };

  return (
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
              <AssignmentTemplates onSelectTemplate={handleTemplateSelect}>
                <Button variant="outline" size="sm" className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4" />
                  Use Template
                </Button>
              </AssignmentTemplates>
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
  );
}