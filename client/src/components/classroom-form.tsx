import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
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
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PlusCircle, Users } from "lucide-react";
import type { InsertClassroom } from "@shared/schema";

interface ClassroomFormProps {
  teacherId: number;
  children: React.ReactNode;
  classroom?: any;
  mode?: "create" | "edit";
}

const classroomSchema = z.object({
  name: z.string().min(1, "Class name is required"),
  subject: z.string().min(1, "Subject is required"),
  gradeLevel: z.string().optional(),
  description: z.string().optional(),
});

type ClassroomForm = z.infer<typeof classroomSchema>;

const subjects = [
  "English Language Arts",
  "Mathematics", 
  "Science",
  "Social Studies",
  "Creative Writing",
  "Literature",
  "History",
  "Biology",
  "Chemistry",
  "Physics",
  "Other"
];

const gradeLevels = [
  "Elementary",
  "6th Grade",
  "7th Grade", 
  "8th Grade",
  "9th Grade",
  "10th Grade",
  "11th Grade",
  "12th Grade",
  "College",
  "Adult Education"
];

export default function ClassroomForm({ teacherId, children, classroom, mode = "create" }: ClassroomFormProps) {
  const [open, setOpen] = React.useState(false);
  const { toast } = useToast();

  const form = useForm<ClassroomForm>({
    resolver: zodResolver(classroomSchema),
    defaultValues: {
      name: classroom?.name || "",
      subject: classroom?.subject || "",
      gradeLevel: classroom?.gradeLevel || "",
      description: classroom?.description || "",
    },
  });

  const createClassroomMutation = useMutation({
    mutationFn: async (data: ClassroomForm) => {
      const classroomData: InsertClassroom = {
        ...data,
        teacherId,
        classSize: 0, // Start with 0 students, will be updated as students enroll
      };
      return await apiRequest("POST", "/api/classrooms", classroomData);
    },
    onSuccess: async (response) => {
      try {
        const newClassroom = await response.json();
        
        // Comprehensive cache invalidation for immediate UI updates
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ["/api/teacher/classrooms"] }),
          queryClient.invalidateQueries({ queryKey: ["/api/classrooms"] }),
          queryClient.refetchQueries({ queryKey: ["/api/teacher/classrooms"] }),
          queryClient.refetchQueries({ queryKey: ["/api/classrooms"] })
        ]);
        
        console.log('Classroom created and cache invalidated:', newClassroom);
        
        toast({
          title: "Class Created Successfully!",
          description: `Join code: ${newClassroom.joinCode}. Share this code with your students.`,
        });
        setOpen(false);
        form.reset();
      } catch (error) {
        console.log('Classroom creation response parsing failed, but creation likely succeeded');
        
        // Force refresh all classroom-related queries
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ["/api/teacher/classrooms"] }),
          queryClient.invalidateQueries({ queryKey: ["/api/classrooms"] }),
          queryClient.refetchQueries({ queryKey: ["/api/teacher/classrooms"] }),
          queryClient.refetchQueries({ queryKey: ["/api/classrooms"] })
        ]);
        
        toast({
          title: "Class Created!",
          description: "Your new class has been created successfully.",
        });
        setOpen(false);
        form.reset();
      }
    },
    onError: (error) => {
      toast({
        title: "Failed to create class",
        description: "Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateClassroomMutation = useMutation({
    mutationFn: async (data: ClassroomForm) => {
      return await apiRequest("PATCH", `/api/classrooms/${classroom.id}`, data);
    },
    onSuccess: async () => {
      // Comprehensive cache invalidation for classroom updates
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["/api/teacher/classrooms"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/classrooms"] }),
        queryClient.refetchQueries({ queryKey: ["/api/teacher/classrooms"] }),
        queryClient.refetchQueries({ queryKey: ["/api/classrooms"] })
      ]);
      
      toast({
        title: "Class Updated",
        description: "Class information has been updated successfully.",
      });
      setOpen(false);
    },
  });

  const onSubmit = (data: ClassroomForm) => {
    if (mode === "create") {
      createClassroomMutation.mutate(data);
    } else {
      updateClassroomMutation.mutate(data);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            {mode === "create" ? "Create New Class" : "Edit Class"}
          </DialogTitle>
          <DialogDescription>
            {mode === "create" 
              ? "Set up a new class and get a join code for your students." 
              : "Update your class information and settings."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Class Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Period 3 English, AP Literature" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="subject"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Subject</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select subject" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {subjects.map((subject) => (
                          <SelectItem key={subject} value={subject}>
                            {subject}
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
                name="gradeLevel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Grade Level</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select grade" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {gradeLevels.map((grade) => (
                          <SelectItem key={grade} value={grade}>
                            {grade}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>



            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Brief description of the class..."
                      className="min-h-16"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-2 pt-4">
              <Button
                type="submit"
                disabled={createClassroomMutation.isPending || updateClassroomMutation.isPending}
                className="flex-1"
              >
                {createClassroomMutation.isPending || updateClassroomMutation.isPending ? (
                  "Saving..."
                ) : (
                  <>
                    <PlusCircle className="h-4 w-4 mr-2" />
                    {mode === "create" ? "Create Class" : "Update Class"}
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}