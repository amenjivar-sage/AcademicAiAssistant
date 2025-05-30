import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Target, Plus, Edit, Trash2, Users, Calendar, BarChart3 } from "lucide-react";

interface GoalManagementProps {
  teacherId: number;
  classroomId?: number;
  preselectedClass?: number;
  showClassSelector?: boolean;
}

export function TeacherGoalManagement({ teacherId, classroomId, preselectedClass, showClassSelector = true }: GoalManagementProps) {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<any>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get teacher's classes for goal assignment
  const { data: classrooms = [] } = useQuery({
    queryKey: ["/api/teacher/classrooms"],
  });

  // Get existing goals for the teacher
  const { data: goals = [] } = useQuery({
    queryKey: [`/api/teacher/${teacherId}/goals`],
  });

  // Get students in selected classroom
  const { data: students = [] } = useQuery({
    queryKey: [`/api/teacher/classrooms/${classroomId}/students`],
    enabled: !!classroomId,
  });

  // Create goal mutation
  const createGoalMutation = useMutation({
    mutationFn: (goalData: any) => apiRequest(`/api/teacher/goals`, {
      method: "POST",
      body: JSON.stringify(goalData),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/teacher/${teacherId}/goals`] });
      setIsCreateOpen(false);
      toast({
        title: "Goal Created",
        description: "New writing goal has been assigned to students.",
      });
    },
  });

  // Update goal mutation
  const updateGoalMutation = useMutation({
    mutationFn: ({ goalId, updates }: { goalId: number; updates: any }) => 
      apiRequest(`/api/teacher/goals/${goalId}`, {
        method: "PATCH",
        body: JSON.stringify(updates),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/teacher/${teacherId}/goals`] });
      setEditingGoal(null);
      toast({
        title: "Goal Updated",
        description: "Writing goal has been updated successfully.",
      });
    },
  });

  // Delete goal mutation
  const deleteGoalMutation = useMutation({
    mutationFn: (goalId: number) => apiRequest(`/api/teacher/goals/${goalId}`, {
      method: "DELETE",
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/teacher/${teacherId}/goals`] });
      toast({
        title: "Goal Deleted",
        description: "Writing goal has been removed.",
      });
    },
  });

  const goalTypes = [
    { value: "daily_words", label: "Daily Word Count", unit: "words" },
    { value: "weekly_sessions", label: "Weekly Writing Sessions", unit: "sessions" },
    { value: "monthly_assignments", label: "Monthly Assignments", unit: "assignments" },
    { value: "streak_days", label: "Writing Streak", unit: "days" },
    { value: "grammar_accuracy", label: "Grammar Accuracy", unit: "%" },
    { value: "vocabulary_growth", label: "Vocabulary Growth", unit: "new words" },
  ];

  const handleCreateGoal = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    
    const goalData = {
      teacherId,
      classroomId: preselectedClass || classroomId || parseInt(formData.get("classroomId") as string),
      type: formData.get("type"),
      title: formData.get("title"),
      description: formData.get("description"),
      target: parseInt(formData.get("target") as string),
      deadline: formData.get("deadline"),
      isActive: true,
    };

    createGoalMutation.mutate(goalData);
  };

  const handleUpdateGoal = (formData: FormData) => {
    const updates = {
      title: formData.get("title"),
      description: formData.get("description"),
      target: parseInt(formData.get("target") as string),
      deadline: formData.get("deadline"),
    };

    updateGoalMutation.mutate({ goalId: editingGoal.id, updates });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Student Writing Goals</h2>
          <p className="text-gray-600">Set and manage writing goals for your students</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create New Goal
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create Writing Goal</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateGoal} className="space-y-4">
              {showClassSelector && !classroomId && !preselectedClass && (
                <div className="space-y-2">
                  <Label htmlFor="classroomId">Select Class</Label>
                  <Select name="classroomId" required>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a class" />
                    </SelectTrigger>
                    <SelectContent>
                      {(classrooms as any[])?.map((classroom: any) => (
                        <SelectItem key={classroom.id} value={classroom.id.toString()}>
                          {classroom.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {preselectedClass && (
                <div className="space-y-2">
                  <Label>Assign to Class</Label>
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                    <p className="text-sm font-medium text-blue-900">
                      {(classrooms as any[])?.find(c => c.id === preselectedClass)?.name || "Selected Class"}
                    </p>
                    <p className="text-xs text-blue-600">Goal will be assigned to all students in this class</p>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="type">Goal Type</Label>
                <Select name="type" required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select goal type" />
                  </SelectTrigger>
                  <SelectContent>
                    {goalTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="title">Goal Title</Label>
                <Input 
                  name="title" 
                  placeholder="e.g., Daily Writing Practice" 
                  required 
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea 
                  name="description" 
                  placeholder="Describe what students need to achieve..."
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="target">Target</Label>
                  <Input 
                    name="target" 
                    type="number" 
                    placeholder="250" 
                    required 
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="deadline">Deadline</Label>
                  <Input 
                    name="deadline" 
                    type="date" 
                    required 
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createGoalMutation.isPending}>
                  {createGoalMutation.isPending ? "Creating..." : "Create Goal"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Active Goals */}
      <div className="space-y-4">
        {goals.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Target className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Goals Created</h3>
              <p className="text-gray-500 mb-6">Create writing goals to help your students track their progress</p>
              <Button onClick={() => setIsCreateOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Goal
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {goals.map((goal: any) => {
              const goalType = goalTypes.find(t => t.value === goal.type);
              const daysUntilDeadline = Math.ceil((new Date(goal.deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
              const isOverdue = daysUntilDeadline < 0;
              
              return (
                <Card key={goal.id} className="relative">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{goal.title}</CardTitle>
                        <Badge variant="outline" className="mt-1">
                          {goalType?.label}
                        </Badge>
                      </div>
                      <div className="flex space-x-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditingGoal(goal)}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => deleteGoalMutation.mutate(goal.id)}
                          disabled={deleteGoalMutation.isPending}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-gray-600">{goal.description}</p>
                    
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center space-x-1">
                        <Target className="h-4 w-4 text-blue-500" />
                        <span>Target: {goal.target} {goalType?.unit}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <span className={isOverdue ? "text-red-600" : ""}>
                          {isOverdue 
                            ? `${Math.abs(daysUntilDeadline)} days overdue`
                            : `${daysUntilDeadline} days left`
                          }
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center space-x-1">
                        <Users className="h-4 w-4 text-green-500" />
                        <span>{goal.assignedStudents || 0} students assigned</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <BarChart3 className="h-4 w-4 text-purple-500" />
                        <span>{goal.completionRate || 0}% completion</span>
                      </div>
                    </div>

                    <Badge 
                      variant={goal.isActive ? "default" : "secondary"}
                      className="w-fit"
                    >
                      {goal.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Edit Goal Dialog */}
      <Dialog open={!!editingGoal} onOpenChange={() => setEditingGoal(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Writing Goal</DialogTitle>
          </DialogHeader>
          {editingGoal && (
            <form action={handleUpdateGoal} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Goal Title</Label>
                <Input 
                  name="title" 
                  defaultValue={editingGoal.title}
                  required 
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea 
                  name="description" 
                  defaultValue={editingGoal.description}
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="target">Target</Label>
                  <Input 
                    name="target" 
                    type="number" 
                    defaultValue={editingGoal.target}
                    required 
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="deadline">Deadline</Label>
                  <Input 
                    name="deadline" 
                    type="date" 
                    defaultValue={editingGoal.deadline?.split('T')[0]}
                    required 
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setEditingGoal(null)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={updateGoalMutation.isPending}>
                  {updateGoalMutation.isPending ? "Updating..." : "Update Goal"}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}