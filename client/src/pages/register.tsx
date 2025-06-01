import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Mail, User, School, CheckCircle, AlertCircle } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

export default function Register() {
  const [formData, setFormData] = useState({
    email: "",
    firstName: "",
    lastName: "",
    role: "",
    grade: "",
    department: "",
    password: "",
    confirmPassword: ""
  });
  const [step, setStep] = useState(1); // 1: Email, 2: Details, 3: Confirmation
  const [error, setError] = useState("");

  const checkEmailMutation = useMutation({
    mutationFn: async (email: string) => {
      const response = await apiRequest("POST", "/api/auth/check-email", { email });
      return response.json();
    }
  });

  const registerMutation = useMutation({
    mutationFn: async (userData: any) => {
      const response = await apiRequest("POST", "/api/auth/register", userData);
      return response.json();
    }
  });

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email) return;

    try {
      const result = await checkEmailMutation.mutateAsync(formData.email);
      if (result.valid) {
        setStep(2);
      }
    } catch (error) {
      // Error is handled by the mutation
    }
  };

  const handleRegistrationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate passwords match
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    // Validate password strength
    if (!formData.password || formData.password.length < 6) {
      setError("Password must be at least 6 characters long");
      return;
    }
    
    try {
      await registerMutation.mutateAsync(formData);
      setStep(3);
    } catch (error) {
      // Error is handled by the mutation
    }
  };

  const updateFormData = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user makes changes
    if (error) setError("");
  };

  if (step === 3) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <CardTitle className="text-2xl text-green-700">Account Created!</CardTitle>
            <CardDescription>
              Welcome to Sage! Your account has been successfully created.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-sm text-gray-600 mb-4">
              You can now log in with your school email address.
            </p>
            <div className="bg-blue-50 p-3 rounded-lg">
              <p className="text-sm font-medium text-blue-700">
                Username: {formData.email.split('@')[0]}
              </p>
              <p className="text-xs text-blue-600 mt-1">
                Use this username to log in
              </p>
            </div>
          </CardContent>
          <CardFooter>
            <Link href="/" className="w-full">
              <Button className="w-full">Continue to Login</Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl text-center">Join Sage</CardTitle>
          <CardDescription className="text-center">
            {step === 1 ? "Enter your school email address" : "Complete your profile"}
          </CardDescription>
        </CardHeader>

        {step === 1 && (
          <form onSubmit={handleEmailSubmit}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">School Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="student@school.edu or teacher@school.edu"
                    value={formData.email}
                    onChange={(e) => updateFormData("email", e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              {checkEmailMutation.error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    {(checkEmailMutation.error as any)?.message || "Invalid email address. Please use your school email."}
                  </AlertDescription>
                </Alert>
              )}

              <div className="bg-blue-50 p-3 rounded-lg">
                <p className="text-sm text-blue-700">
                  <strong>Students:</strong> Use your school-issued email address<br />
                  <strong>Teachers:</strong> Use your faculty email address
                </p>
              </div>
            </CardContent>
            <CardFooter>
              <Button 
                type="submit" 
                className="w-full" 
                disabled={checkEmailMutation.isPending || !formData.email}
              >
                {checkEmailMutation.isPending ? "Verifying..." : "Continue"}
              </Button>
            </CardFooter>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={handleRegistrationSubmit}>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    value={formData.firstName}
                    onChange={(e) => updateFormData("firstName", e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    value={formData.lastName}
                    onChange={(e) => updateFormData("lastName", e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">I am a...</Label>
                <Select value={formData.role} onValueChange={(value) => updateFormData("role", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select your role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="student">Student</SelectItem>
                    <SelectItem value="teacher">Teacher</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.role === "student" && (
                <div className="space-y-2">
                  <Label htmlFor="grade">Grade Level</Label>
                  <Select value={formData.grade} onValueChange={(value) => updateFormData("grade", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select your grade" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="9th Grade">9th Grade</SelectItem>
                      <SelectItem value="10th Grade">10th Grade</SelectItem>
                      <SelectItem value="11th Grade">11th Grade</SelectItem>
                      <SelectItem value="12th Grade">12th Grade</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {formData.role === "teacher" && (
                <div className="space-y-2">
                  <Label htmlFor="department">Department</Label>
                  <Select value={formData.department} onValueChange={(value) => updateFormData("department", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select your department" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="English Language Arts">English Language Arts</SelectItem>
                      <SelectItem value="Mathematics">Mathematics</SelectItem>
                      <SelectItem value="Science">Science</SelectItem>
                      <SelectItem value="Social Studies">Social Studies</SelectItem>
                      <SelectItem value="World Languages">World Languages</SelectItem>
                      <SelectItem value="Arts">Arts</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password || ""}
                  onChange={(e) => updateFormData("password", e.target.value)}
                  placeholder="Create a secure password"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={formData.confirmPassword || ""}
                  onChange={(e) => updateFormData("confirmPassword", e.target.value)}
                  placeholder="Confirm your password"
                  required
                />
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    {error}
                  </AlertDescription>
                </Alert>
              )}

              {registerMutation.error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    {(registerMutation.error as any)?.message || "Registration failed. Please try again."}
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
            <CardFooter className="flex gap-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setStep(1)}
                className="flex-1"
              >
                Back
              </Button>
              <Button 
                type="submit" 
                className="flex-1"
                disabled={registerMutation.isPending || !formData.role || !formData.firstName || !formData.lastName}
              >
                {registerMutation.isPending ? "Creating Account..." : "Create Account"}
              </Button>
            </CardFooter>
          </form>
        )}

        <div className="px-6 pb-6">
          <p className="text-center text-sm text-gray-600">
            Already have an account?{" "}
            <Link href="/" className="text-blue-600 hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </Card>
    </div>
  );
}