import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Users, Mail, Zap } from "lucide-react";

interface DemoUser {
  email: string;
  firstName: string;
  lastName: string;
  role: "teacher" | "student";
  department?: string;
  grade?: string;
  expectedUsername: string;
  provider: string;
}

const demoUsers: DemoUser[] = [
  {
    email: "john.smith2025@gmail.com",
    firstName: "John",
    lastName: "Smith",
    role: "student",
    grade: "12th",
    expectedUsername: "john.smith25",
    provider: "Gmail"
  },
  {
    email: "johnsmith@outlook.com", 
    firstName: "John",
    lastName: "Smith",
    role: "teacher",
    department: "Mathematics",
    expectedUsername: "john.smith.teacher",
    provider: "Outlook"
  },
  {
    email: "j.smith26@yahoo.com",
    firstName: "John", 
    lastName: "Smith",
    role: "student",
    grade: "11th",
    expectedUsername: "john.smith26",
    provider: "Yahoo"
  },
  {
    email: "sarah.johnson@gmail.com",
    firstName: "Sarah",
    lastName: "Johnson", 
    role: "teacher",
    department: "English",
    expectedUsername: "sarah.johnson.teacher",
    provider: "Gmail"
  },
  {
    email: "sarah.johnson2024@outlook.com",
    firstName: "Sarah",
    lastName: "Johnson",
    role: "student", 
    grade: "12th",
    expectedUsername: "sarah.johnson24",
    provider: "Outlook"
  }
];

export default function DemoUsers() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const addDemoUserMutation = useMutation({
    mutationFn: async (user: DemoUser) => {
      const response = await apiRequest("POST", "/api/admin/users", {
        ...user,
        password: "TempPass123!",
      });
      return response.json();
    },
    onSuccess: (newUser, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({
        title: "Demo User Added!",
        description: `${variables.firstName} ${variables.lastName} created with username: ${newUser.username}`,
      });
    },
    onError: (error, variables) => {
      toast({
        title: "Demo User Creation Failed",
        description: `Could not create ${variables.firstName} ${variables.lastName}. They may already exist.`,
        variant: "destructive",
      });
    },
  });

  const addAllDemoUsers = async () => {
    for (const user of demoUsers) {
      try {
        await addDemoUserMutation.mutateAsync(user);
        // Small delay between requests
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        // Continue with next user even if one fails
        console.log(`Failed to add ${user.firstName} ${user.lastName}`);
      }
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5" />
          Username Generation Demo
        </CardTitle>
        <CardDescription>
          See how ZOEEDU handles duplicate names across different email providers
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4">
          {demoUsers.map((user, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-gray-500" />
                <div>
                  <div className="font-medium">{user.firstName} {user.lastName}</div>
                  <div className="text-sm text-gray-500">{user.email}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={user.provider === "Gmail" ? "default" : user.provider === "Outlook" ? "secondary" : "outline"}>
                  {user.provider}
                </Badge>
                <Badge variant={user.role === "teacher" ? "default" : "secondary"}>
                  {user.role}
                </Badge>
                <div className="text-sm font-mono bg-white px-2 py-1 rounded border">
                  {user.expectedUsername}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-2 pt-4">
          <Button 
            onClick={addAllDemoUsers}
            disabled={addDemoUserMutation.isPending}
            className="flex-1"
          >
            <Users className="h-4 w-4 mr-2" />
            {addDemoUserMutation.isPending ? "Adding Users..." : "Add All Demo Users"}
          </Button>
        </div>

        <div className="text-xs text-gray-500 bg-blue-50 p-3 rounded">
          <strong>Demo Scenario:</strong> This will create multiple users with the same names but different email providers, 
          showing how Sage generates unique usernames automatically. Perfect for testing duplicate name handling!
        </div>
      </CardContent>
    </Card>
  );
}