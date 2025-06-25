import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, CheckCircle, Lock } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

export default function ChangePassword() {
  const [, setLocation] = useLocation();
  const [passwords, setPasswords] = useState({
    newPassword: '',
    confirmPassword: ''
  });

  const changePasswordMutation = useMutation({
    mutationFn: async (data: { newPassword: string }) => {
      const response = await apiRequest('POST', '/api/auth/change-password', data);
      return response.json();
    },
    onSuccess: () => {
      // Get user from localStorage to determine redirect
      const userStr = localStorage.getItem("user");
      if (userStr) {
        const user = JSON.parse(userStr);
        if (user.role === "teacher") {
          setLocation("/teacher");
        } else if (user.role === "admin" || user.role === "sage_admin") {
          setLocation("/admin");
        } else if (user.role === "school_admin") {
          setLocation("/school-admin");
        } else {
          setLocation("/student");
        }
      } else {
        setLocation("/student");
      }
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (passwords.newPassword !== passwords.confirmPassword) {
      return;
    }
    
    if (passwords.newPassword.length < 8) {
      return;
    }
    
    changePasswordMutation.mutate({ newPassword: passwords.newPassword });
  };

  const passwordsMatch = passwords.newPassword === passwords.confirmPassword;
  const isValidLength = passwords.newPassword.length >= 8;
  const canSubmit = passwordsMatch && isValidLength && passwords.newPassword && passwords.confirmPassword;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="mx-auto w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mb-4">
            <Lock className="h-8 w-8 text-orange-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Set New Password</h1>
          <p className="text-gray-600">
            You're using a temporary password. Please create a new secure password to continue.
          </p>
        </div>

        {/* Password Change Form */}
        <Card className="bg-white shadow-xl">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl text-gray-900">Create New Password</CardTitle>
            <CardDescription>
              Choose a strong password to secure your account
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={passwords.newPassword}
                  onChange={(e) => setPasswords({...passwords, newPassword: e.target.value})}
                  placeholder="Enter your new password"
                  required
                />
                {passwords.newPassword && !isValidLength && (
                  <p className="text-sm text-red-600">Password must be at least 8 characters long</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={passwords.confirmPassword}
                  onChange={(e) => setPasswords({...passwords, confirmPassword: e.target.value})}
                  placeholder="Confirm your new password"
                  required
                />
                {passwords.confirmPassword && !passwordsMatch && (
                  <p className="text-sm text-red-600">Passwords do not match</p>
                )}
                {passwords.confirmPassword && passwordsMatch && isValidLength && (
                  <p className="text-sm text-green-600 flex items-center gap-1">
                    <CheckCircle className="h-4 w-4" />
                    Passwords match
                  </p>
                )}
              </div>

              {changePasswordMutation.isError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Failed to change password. Please try again.
                  </AlertDescription>
                </Alert>
              )}

              <Button 
                type="submit" 
                className="w-full bg-edu-blue hover:bg-blue-700"
                disabled={!canSubmit || changePasswordMutation.isPending}
              >
                {changePasswordMutation.isPending ? "Updating Password..." : "Set New Password"}
              </Button>
            </form>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 mb-2">Password Requirements:</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li className={`flex items-center gap-2 ${isValidLength ? 'text-green-600' : ''}`}>
                  {isValidLength ? <CheckCircle className="h-4 w-4" /> : <div className="w-4 h-4 border rounded-full border-blue-400"></div>}
                  At least 8 characters long
                </li>
                <li className={`flex items-center gap-2 ${passwordsMatch && passwords.confirmPassword ? 'text-green-600' : ''}`}>
                  {passwordsMatch && passwords.confirmPassword ? <CheckCircle className="h-4 w-4" /> : <div className="w-4 h-4 border rounded-full border-blue-400"></div>}
                  Both passwords match
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}