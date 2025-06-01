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
import { Users, BookOpen } from "lucide-react";

interface JoinClassProps {
  studentId: number;
  children: React.ReactNode;
}

const joinClassSchema = z.object({
  joinCode: z.string()
    .min(1, "Class code is required")
    .regex(/^[A-Z0-9]{6,8}$/, "Class code must be 6-8 characters (letters and numbers)"),
});

type JoinClassForm = z.infer<typeof joinClassSchema>;

export default function JoinClass({ studentId, children }: JoinClassProps) {
  const [open, setOpen] = React.useState(false);
  const { toast } = useToast();

  const form = useForm<JoinClassForm>({
    resolver: zodResolver(joinClassSchema),
    defaultValues: {
      joinCode: "",
    },
  });

  const joinClassMutation = useMutation({
    mutationFn: async (data: JoinClassForm) => {
      return await apiRequest("/api/classes/join", {
        method: "POST",
        body: JSON.stringify({
          joinCode: data.joinCode.toUpperCase(),
          studentId,
        }),
      });
    },
    onSuccess: (classroom) => {
      queryClient.invalidateQueries({ queryKey: ["/api/student/classes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/student/assignments"] });
      toast({
        title: "Successfully Joined Class!",
        description: `Welcome to ${classroom.name}. You can now see assignments from this class.`,
      });
      setOpen(false);
      form.reset();
    },
    onError: (error: any) => {
      if (error.message?.includes("not found")) {
        toast({
          title: "Invalid Class Code",
          description: "Please check the code and try again. Make sure you entered it exactly as your teacher provided.",
          variant: "destructive",
        });
      } else if (error.message?.includes("already enrolled")) {
        toast({
          title: "Already Enrolled",
          description: "You're already a member of this class.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Failed to Join Class",
          description: "Please try again or contact your teacher if the problem continues.",
          variant: "destructive",
        });
      }
    },
  });

  const onSubmit = (data: JoinClassForm) => {
    joinClassMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Join a Class
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <BookOpen className="h-8 w-8 text-blue-600 mx-auto mb-2" />
            <p className="text-sm text-gray-600">
              Enter the class code your teacher shared with you to join their class and access assignments.
            </p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="joinCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Class Code</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., ENG347, MATH82"
                        className="text-center text-lg font-mono tracking-widest uppercase"
                        maxLength={8}
                        {...field}
                        onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="text-sm text-gray-500 space-y-1">
                <p>• Class codes are usually 6-8 characters</p>
                <p>• They contain letters and numbers</p>
                <p>• Ask your teacher if you don't have the code</p>
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  type="submit"
                  disabled={joinClassMutation.isPending}
                  className="flex-1"
                >
                  {joinClassMutation.isPending ? (
                    "Joining..."
                  ) : (
                    <>
                      <Users className="h-4 w-4 mr-2" />
                      Join Class
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
        </div>
      </DialogContent>
    </Dialog>
  );
}