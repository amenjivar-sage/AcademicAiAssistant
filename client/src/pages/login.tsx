import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { GraduationCap, Users, BookOpen, Shield } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function Login() {
  const [, setLocation] = useLocation();
  const [formData, setFormData] = useState({
    username: "",
    password: "",
  });
  const { toast } = useToast();

  const loginMutation = useMutation({
    mutationFn: async (credentials: { username: string; password: string }) => {
      const response = await apiRequest("POST", "/api/auth/login", credentials);
      return response.json();
    },
    onSuccess: (data) => {
      localStorage.setItem("user", JSON.stringify(data.user));
      
      if (data.user.role === "teacher") {
        setLocation("/teacher");
      } else {
        setLocation("/student");
      }
      
      toast({
        title: "Welcome back!",
        description: `Logged in as ${data.user.firstName} ${data.user.lastName}`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Login Failed",
        description: error.message || "Invalid username or password",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loginMutation.mutate(formData);
  };

  const quickLogin = (role: "teacher" | "student" | "admin") => {
    // For demo purposes, directly navigate to the appropriate page
    const userData = {
      teacher: { id: 1, username: "teacher", firstName: "Sarah", lastName: "Johnson", email: "teacher@zoeedu.com" },
      student: { id: 2, username: "student", firstName: "Alex", lastName: "Smith", email: "student@zoeedu.com" },
      admin: { id: 0, username: "admin", firstName: "System", lastName: "Administrator", email: "admin@zoeedu.com" }
    };

    localStorage.setItem("user", JSON.stringify({
      ...userData[role],
      role: role
    }));
    
    if (role === "teacher") {
      setLocation("/teacher");
    } else if (role === "admin") {
      setLocation("/admin");
    } else {
      setLocation("/student");
    }
    
    toast({
      title: "Welcome back!",
      description: `Logged in as ${userData[role].firstName} ${userData[role].lastName}`,
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-edu-blue to-blue-700 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Logo and Header */}
        <div className="text-center text-white">
          <div className="w-16 h-16 bg-white bg-opacity-20 rounded-xl flex items-center justify-center mx-auto mb-4">
            <GraduationCap className="h-8 w-8" />
          </div>
          <h1 className="text-3xl font-bold mb-2">Sage</h1>
          <p className="text-blue-100">AI Writing Platform for Ethical Student Learning</p>
        </div>

        {/* Login Form */}
        <Card className="bg-white shadow-xl">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl text-gray-900">Welcome Back</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                  placeholder="Enter your username"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                  placeholder="Enter your password"
                  required
                />
              </div>

              <Button 
                type="submit" 
                className="w-full bg-edu-blue hover:bg-blue-700"
                disabled={loginMutation.isPending}
              >
                {loginMutation.isPending ? "Signing In..." : "Sign In"}
              </Button>
            </form>

            {/* Quick Login Options */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-gray-500">Demo Accounts</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <Button
                variant="outline"
                onClick={() => quickLogin("teacher")}
                disabled={loginMutation.isPending}
                className="flex flex-col items-center py-4 h-auto"
              >
                <Users className="h-5 w-5 mb-1 text-edu-blue" />
                <span className="text-xs font-medium">Teacher</span>
                <span className="text-xs text-gray-500">Demo</span>
              </Button>
              
              <Button
                variant="outline"
                onClick={() => quickLogin("student")}
                disabled={loginMutation.isPending}
                className="flex flex-col items-center py-4 h-auto"
              >
                <BookOpen className="h-5 w-5 mb-1 text-edu-success" />
                <span className="text-xs font-medium">Student</span>
                <span className="text-xs text-gray-500">Demo</span>
              </Button>
              
              <Button
                variant="outline"
                onClick={() => quickLogin("admin")}
                disabled={loginMutation.isPending}
                className="flex flex-col items-center py-4 h-auto"
              >
                <Shield className="h-5 w-5 mb-1 text-red-600" />
                <span className="text-xs font-medium">Admin</span>
                <span className="text-xs text-gray-500">Demo</span>
              </Button>
            </div>

            <Alert>
              <AlertDescription className="text-center text-sm">
                Use the demo accounts above to explore Sage's features for teachers, students, and administrators.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        {/* Footer */}
        <p className="text-center text-blue-100 text-sm">
          © 2024 Sage - Empowering ethical AI-assisted learning
        </p>
      </div>
    </div>
  );
}