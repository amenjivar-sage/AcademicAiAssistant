import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { GraduationCap, Users, BookOpen, Shield } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import SageLogo from "@/components/sage-logo";

export default function Login() {
  const [, setLocation] = useLocation();
  const [formData, setFormData] = useState({
    username: "",
    password: "",
  });
  const [demoPassword, setDemoPassword] = useState("");
  const [selectedRole, setSelectedRole] = useState<"teacher" | "student" | "admin" | "school_admin" | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
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
      } else if (data.user.role === "admin") {
        setLocation("/admin");
      } else if (data.user.role === "school_admin") {
        setLocation("/school-admin");
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

  const handleDemoLogin = (role: "teacher" | "student" | "admin" | "school_admin") => {
    setSelectedRole(role);
    setDemoPassword("");
    setDialogOpen(true);
  };

  const demoLoginMutation = useMutation({
    mutationFn: async (data: { role: string; demoPassword: string }) => {
      const response = await apiRequest("POST", "/api/auth/demo-login", data);
      return response.json();
    },
    onSuccess: (data) => {
      localStorage.setItem("user", JSON.stringify(data.user));
      
      if (data.user.role === "teacher") {
        setLocation("/teacher");
      } else if (data.user.role === "admin") {
        setLocation("/admin");
      } else if (data.user.role === "school_admin") {
        setLocation("/school-admin");
      } else {
        setLocation("/student");
      }
      
      toast({
        title: "Welcome back!",
        description: `Logged in as ${data.user.firstName} ${data.user.lastName}`,
      });

      setDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Demo Login Failed",
        description: error.message || "Invalid demo password",
        variant: "destructive",
      });
    },
  });

  const confirmDemoLogin = () => {
    if (!selectedRole || !demoPassword) return;
    
    demoLoginMutation.mutate({
      role: selectedRole,
      demoPassword: demoPassword
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-edu-blue to-blue-700 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Logo and Header */}
        <div className="text-center text-white">
          <div className="w-20 h-20 bg-white rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <svg
              width="48"
              height="48"
              viewBox="0 0 48 48"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Tree Trunk - much darker */}
              <rect
                x="21"
                y="30"
                width="6"
                height="12"
                rx="3"
                fill="#1e3a8a"
              />
              
              {/* Main Branches - Darker diamond shapes */}
              <path
                d="M24 6L30 12L24 18L18 12L24 6Z"
                fill="#1e40af"
              />
              
              {/* Left Branch */}
              <path
                d="M12 18L18 24L12 30L6 24L12 18Z"
                fill="#2563eb"
              />
              
              {/* Right Branch */}
              <path
                d="M36 18L42 24L36 30L30 24L36 18Z"
                fill="#2563eb"
              />
              
              {/* Accent leaves - darker */}
              <circle cx="15" cy="15" r="3" fill="#3b82f6" />
              <circle cx="33" cy="15" r="3" fill="#3b82f6" />
              <circle cx="9" cy="27" r="2" fill="#1d4ed8" />
              <circle cx="39" cy="27" r="2" fill="#1d4ed8" />
            </svg>
          </div>
          <h1 className="text-4xl font-bold mb-2 text-gray-900 bg-white bg-opacity-90 px-4 py-2 rounded-lg shadow-lg">Sage</h1>
          <p className="text-white text-lg drop-shadow-md bg-black bg-opacity-20 px-3 py-1 rounded">AI Writing Platform for Ethical Student Learning</p>
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
                <span className="bg-white px-2 text-gray-500">Quick Access</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Dialog open={dialogOpen && selectedRole === "admin"} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    onClick={() => handleDemoLogin("admin")}
                    disabled={loginMutation.isPending}
                    className="flex flex-col items-center py-4 h-auto"
                  >
                    <Shield className="h-5 w-5 mb-1 text-red-600" />
                    <span className="text-sm font-medium">Admin</span>
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Administrator Access</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <p className="text-sm text-gray-600">
                      Enter the administrator password to access the admin interface.
                    </p>
                    <div className="space-y-2">
                      <Label htmlFor="admin-password">Administrator Password</Label>
                      <Input
                        id="admin-password"
                        type="password"
                        value={demoPassword}
                        onChange={(e) => setDemoPassword(e.target.value)}
                        placeholder="Enter admin password"
                        onKeyDown={(e) => e.key === "Enter" && confirmDemoLogin()}
                      />
                    </div>
                    <div className="flex justify-end space-x-2">
                      <Button variant="outline" onClick={() => setDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={confirmDemoLogin}>
                        Access Admin
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
              
              <Dialog open={dialogOpen && selectedRole === "school_admin"} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    onClick={() => handleDemoLogin("school_admin")}
                    disabled={loginMutation.isPending}
                    className="flex flex-col items-center py-4 h-auto"
                  >
                    <GraduationCap className="h-5 w-5 mb-1 text-purple-600" />
                    <span className="text-sm font-medium">School Admin</span>
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>School Administrator Access</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <p className="text-sm text-gray-600">
                      Enter the school administrator password to access the school administration interface.
                    </p>
                    <div className="space-y-2">
                      <Label htmlFor="school-admin-password">School Admin Password</Label>
                      <Input
                        id="school-admin-password"
                        type="password"
                        value={demoPassword}
                        onChange={(e) => setDemoPassword(e.target.value)}
                        placeholder="Enter school admin password"
                        onKeyDown={(e) => e.key === "Enter" && confirmDemoLogin()}
                      />
                    </div>
                    <div className="flex justify-end space-x-2">
                      <Button variant="outline" onClick={() => setDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={confirmDemoLogin}>
                        Access School Admin
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <div className="text-center space-y-2">
              <p className="text-sm text-gray-600">
                <Link href="/forgot-credentials" className="text-blue-600 hover:underline font-medium">
                  Forgot Username or Password?
                </Link>
              </p>
              <p className="text-sm text-gray-600">
                Need an account?{" "}
                <Link href="/register" className="text-blue-600 hover:underline font-medium">
                  Create Account
                </Link>
              </p>
            </div>
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