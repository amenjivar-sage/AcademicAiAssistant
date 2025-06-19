import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserPlus, LogIn, AlertCircle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface SageAdminDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (user: any) => void;
}

export default function SageAdminDialog({ open, onClose, onSuccess }: SageAdminDialogProps) {
  const [activeTab, setActiveTab] = useState("login");
  const [loginData, setLoginData] = useState({
    username: "",
    password: "",
  });
  const [registerData, setRegisterData] = useState({
    username: "",
    email: "",
    firstName: "",
    lastName: "",
    password: "",
    confirmPassword: "",
    verificationCode: "",
  });
  const [error, setError] = useState("");
  const { toast } = useToast();

  const loginMutation = useMutation({
    mutationFn: async (credentials: { username: string; password: string }) => {
      const response = await apiRequest("POST", "/api/auth/sage-admin-login", credentials);
      return response.json();
    },
    onSuccess: (data) => {
      onSuccess(data.user);
      toast({
        title: "Welcome back!",
        description: `Logged in as ${data.user.firstName} ${data.user.lastName}`,
      });
    },
    onError: (error: any) => {
      setError(error.message || "Invalid username or password");
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (userData: any) => {
      const response = await apiRequest("POST", "/api/auth/sage-admin-register", {
        ...userData,
        role: "sage_admin"
      });
      return response.json();
    },
    onSuccess: (data) => {
      onSuccess(data.user);
      toast({
        title: "Account Created!",
        description: `Welcome ${data.user.firstName} ${data.user.lastName}`,
      });
    },
    onError: (error: any) => {
      setError(error.message || "Failed to create account");
    },
  });

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    loginMutation.mutate(loginData);
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    if (registerData.password !== registerData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (registerData.password.length < 6) {
      setError("Password must be at least 6 characters long");
      return;
    }

    if (registerData.verificationCode !== "8520") {
      setError("Invalid verification code");
      return;
    }

    registerMutation.mutate(registerData);
  };

  const updateLoginData = (field: string, value: string) => {
    setLoginData(prev => ({ ...prev, [field]: value }));
    if (error) setError("");
  };

  const updateRegisterData = (field: string, value: string) => {
    setRegisterData(prev => ({ ...prev, [field]: value }));
    if (error) setError("");
  };

  if (!open) return null;

  return (
    <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <div className="h-8 w-8 bg-red-100 rounded-full flex items-center justify-center">
            <UserPlus className="h-4 w-4 text-red-600" />
          </div>
          Sage Administrator Access
        </DialogTitle>
      </DialogHeader>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="login" className="flex items-center gap-2">
            <LogIn className="h-4 w-4" />
            Login
          </TabsTrigger>
          <TabsTrigger value="register" className="flex items-center gap-2">
            <UserPlus className="h-4 w-4" />
            Create Account
          </TabsTrigger>
        </TabsList>

        <TabsContent value="login" className="space-y-4">
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="login-username">Username</Label>
              <Input
                id="login-username"
                value={loginData.username}
                onChange={(e) => updateLoginData("username", e.target.value)}
                placeholder="Enter your username"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="login-password">Password</Label>
              <Input
                id="login-password"
                type="password"
                value={loginData.password}
                onChange={(e) => updateLoginData("password", e.target.value)}
                placeholder="Enter your password"
                required
              />
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={loginMutation.isPending}
                className="bg-red-600 hover:bg-red-700"
              >
                {loginMutation.isPending ? "Signing in..." : "Sign In"}
              </Button>
            </div>
          </form>
        </TabsContent>

        <TabsContent value="register" className="space-y-4">
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="register-firstName">First Name</Label>
                <Input
                  id="register-firstName"
                  value={registerData.firstName}
                  onChange={(e) => updateRegisterData("firstName", e.target.value)}
                  placeholder="First name"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="register-lastName">Last Name</Label>
                <Input
                  id="register-lastName"
                  value={registerData.lastName}
                  onChange={(e) => updateRegisterData("lastName", e.target.value)}
                  placeholder="Last name"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="register-email">Email</Label>
              <Input
                id="register-email"
                type="email"
                value={registerData.email}
                onChange={(e) => updateRegisterData("email", e.target.value)}
                placeholder="your.email@domain.com"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="register-username">Username</Label>
              <Input
                id="register-username"
                value={registerData.username}
                onChange={(e) => updateRegisterData("username", e.target.value)}
                placeholder="Choose a username"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="register-password">Password</Label>
              <Input
                id="register-password"
                type="password"
                value={registerData.password}
                onChange={(e) => updateRegisterData("password", e.target.value)}
                placeholder="Create a password"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="register-confirmPassword">Confirm Password</Label>
              <Input
                id="register-confirmPassword"
                type="password"
                value={registerData.confirmPassword}
                onChange={(e) => updateRegisterData("confirmPassword", e.target.value)}
                placeholder="Confirm your password"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="register-verificationCode">Verification Code</Label>
              <Input
                id="register-verificationCode"
                type="password"
                value={registerData.verificationCode}
                onChange={(e) => updateRegisterData("verificationCode", e.target.value)}
                placeholder="Enter verification code"
                required
              />
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="bg-red-50 p-3 rounded-lg">
              <p className="text-sm text-red-700">
                <strong>Security:</strong> A verification code is required to create Sage Administrator accounts.
              </p>
            </div>

            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={registerMutation.isPending}
                className="bg-red-600 hover:bg-red-700"
              >
                {registerMutation.isPending ? "Creating..." : "Create Account"}
              </Button>
            </div>
          </form>
        </TabsContent>
      </Tabs>
    </DialogContent>
  );
}