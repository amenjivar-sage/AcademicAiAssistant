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
      } else if (data.user.role === "admin" || data.user.role === "super_admin") {
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
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-blue-800 to-purple-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-10 left-10 w-32 h-32 bg-white rounded-full mix-blend-overlay filter blur-xl animate-pulse"></div>
        <div className="absolute top-1/3 right-10 w-24 h-24 bg-blue-300 rounded-full mix-blend-overlay filter blur-xl animate-pulse animation-delay-1000"></div>
        <div className="absolute bottom-20 left-1/3 w-20 h-20 bg-purple-300 rounded-full mix-blend-overlay filter blur-xl animate-pulse animation-delay-2000"></div>
        <div className="absolute bottom-10 right-20 w-28 h-28 bg-indigo-300 rounded-full mix-blend-overlay filter blur-xl animate-pulse animation-delay-3000"></div>
      </div>
      
      <div className="w-full max-w-md space-y-8 relative z-10">
        {/* Logo and Header */}
        <div className="text-center text-white animate-fade-in">
          <div className="w-24 h-24 bg-gradient-to-br from-white to-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-2xl transform hover:scale-105 transition-transform duration-300">
            <svg
              width="56"
              height="56"
              viewBox="0 0 48 48"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="drop-shadow-lg"
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
          <h1 className="text-5xl font-bold mb-3 bg-gradient-to-r from-white via-blue-100 to-purple-100 bg-clip-text text-transparent drop-shadow-lg">
            Sage
          </h1>
          <p className="text-blue-100 text-lg drop-shadow-md bg-white bg-opacity-10 backdrop-blur-sm px-4 py-2 rounded-full border border-white border-opacity-20">
            AI Writing Platform for Ethical Student Learning
          </p>
        </div>

        {/* Login Form */}
        <Card className="bg-white/95 backdrop-blur-sm shadow-2xl border-0 animate-slide-up">
          <CardHeader className="text-center pb-8">
            <CardTitle className="text-3xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
              Welcome Back
            </CardTitle>
            <p className="text-gray-500 mt-2">Please sign in to your account</p>
          </CardHeader>
          <CardContent className="space-y-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="username" className="text-gray-700 font-medium">Username</Label>
                <Input
                  id="username"
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                  placeholder="Enter your username"
                  className="h-12 border-2 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200 rounded-lg"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password" className="text-gray-700 font-medium">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                  placeholder="Enter your password"
                  className="h-12 border-2 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200 rounded-lg"
                  required
                />
              </div>

              <Button 
                type="submit" 
                className="w-full h-12 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-200"
                disabled={loginMutation.isPending}
              >
                {loginMutation.isPending ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Signing In...
                  </span>
                ) : "Sign In"}
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

            <div className="flex justify-center">
              <Dialog open={dialogOpen && selectedRole === "admin"} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    onClick={() => handleDemoLogin("admin")}
                    disabled={loginMutation.isPending}
                    className="flex flex-col items-center py-6 h-auto w-40 border-2 border-gray-200 hover:border-red-300 hover:bg-red-50 transition-all duration-200 rounded-lg shadow-md hover:shadow-lg transform hover:scale-105"
                  >
                    <Shield className="h-6 w-6 mb-2 text-red-600" />
                    <span className="text-sm font-semibold text-gray-700">Sage Admin</span>
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Sage Administrator Access</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <p className="text-sm text-gray-600">
                      Enter the Sage administrator password to access the admin interface.
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
        <div className="text-center space-y-2">
          <p className="text-blue-100 text-sm">
            © 2024 Sage - Empowering ethical AI-assisted learning
          </p>
          <p className="text-blue-200 text-xs">
            <a 
              href="/privacy-notice" 
              target="_blank" 
              rel="noopener noreferrer"
              className="hover:text-white underline transition-colors duration-200"
            >
              Privacy Notice
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}