import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowLeft, Mail, CheckCircle, AlertCircle } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

export default function ForgotCredentials() {
  const [email, setEmail] = useState("");
  const [step, setStep] = useState(1); // 1: Enter Email, 2: Success

  const forgotCredentialsMutation = useMutation({
    mutationFn: async (email: string) => {
      const response = await apiRequest("POST", "/api/auth/forgot-credentials", { email });
      return response.json();
    },
    onSuccess: () => {
      setStep(2);
    },
    onError: (error: any) => {
      console.error("Forgot credentials error:", error);
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    forgotCredentialsMutation.mutate(email);
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
              {/* Tree Trunk */}
              <rect
                x="21"
                y="30"
                width="6"
                height="12"
                rx="3"
                fill="#1e3a8a"
              />
              
              {/* Main Branches */}
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
              
              {/* Accent leaves */}
              <circle cx="15" cy="15" r="3" fill="#3b82f6" />
              <circle cx="33" cy="15" r="3" fill="#3b82f6" />
              <circle cx="9" cy="27" r="2" fill="#1d4ed8" />
              <circle cx="39" cy="27" r="2" fill="#1d4ed8" />
            </svg>
          </div>
          <h1 className="text-4xl font-bold mb-2 text-gray-900 bg-white bg-opacity-90 px-4 py-2 rounded-lg shadow-lg">Sage</h1>
          <p className="text-white text-lg drop-shadow-md bg-black bg-opacity-20 px-3 py-1 rounded">AI Writing Platform for Ethical Student Learning</p>
        </div>

        {/* Recovery Form */}
        <Card className="bg-white shadow-xl">
          {step === 1 && (
            <>
              <CardHeader className="text-center">
                <CardTitle className="text-2xl text-gray-900">Forgot Your Credentials?</CardTitle>
                <CardDescription>
                  Enter your email address and we'll send you your username and password reset instructions.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your registered email address"
                      required
                    />
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full bg-edu-blue hover:bg-blue-700"
                    disabled={forgotCredentialsMutation.isPending || !email}
                  >
                    {forgotCredentialsMutation.isPending ? "Sending..." : "Send Recovery Email"}
                  </Button>
                </form>

                {forgotCredentialsMutation.error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      {(forgotCredentialsMutation.error as any)?.message || "Failed to send recovery email. Please try again."}
                    </AlertDescription>
                  </Alert>
                )}

                <div className="text-center">
                  <Link href="/" className="text-blue-600 hover:underline font-medium inline-flex items-center gap-2">
                    <ArrowLeft className="h-4 w-4" />
                    Back to Login
                  </Link>
                </div>
              </CardContent>
            </>
          )}

          {step === 2 && (
            <>
              <CardHeader className="text-center">
                <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
                <CardTitle className="text-2xl text-gray-900">Email Sent!</CardTitle>
                <CardDescription>
                  We've sent your username and password reset instructions to <strong>{email}</strong>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <Alert>
                  <Mail className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Check your email inbox</strong> (and spam folder) for a message from Sage containing:
                    <ul className="mt-2 ml-4 list-disc text-sm">
                      <li>Your username</li>
                      <li>Instructions to reset your password</li>
                      <li>Login instructions</li>
                    </ul>
                  </AlertDescription>
                </Alert>

                <div className="text-center space-y-2">
                  <Button 
                    onClick={() => forgotCredentialsMutation.mutate(email)}
                    variant="outline" 
                    className="w-full"
                    disabled={forgotCredentialsMutation.isPending}
                  >
                    {forgotCredentialsMutation.isPending ? "Sending..." : "Resend Email"}
                  </Button>
                  
                  <Link href="/" className="text-blue-600 hover:underline font-medium inline-flex items-center gap-2">
                    <ArrowLeft className="h-4 w-4" />
                    Back to Login
                  </Link>
                </div>
              </CardContent>
            </>
          )}
        </Card>

        {/* Footer */}
        <p className="text-center text-blue-100 text-sm">
          © 2024 Sage - Empowering ethical AI-assisted learning
        </p>
      </div>
    </div>
  );
}