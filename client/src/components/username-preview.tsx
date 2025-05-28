import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { User, CheckCircle, AlertCircle, RefreshCw } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface UsernamePreviewProps {
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  onUsernameGenerated?: (username: string) => void;
}

export default function UsernamePreview({ 
  email, 
  firstName, 
  lastName, 
  role,
  onUsernameGenerated 
}: UsernamePreviewProps) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [selectedUsername, setSelectedUsername] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (email && firstName && lastName) {
      generateSuggestions();
    }
  }, [email, firstName, lastName, role]);

  const generateSuggestions = async () => {
    if (!email || !firstName || !lastName) return;
    
    setIsLoading(true);
    try {
      const response = await apiRequest("POST", "/api/admin/username-suggestions", {
        email,
        firstName,
        lastName,
        role
      });
      const data = await response.json();
      setSuggestions(data.suggestions);
      
      // Auto-select the first suggestion
      if (data.suggestions.length > 0) {
        setSelectedUsername(data.suggestions[0]);
        onUsernameGenerated?.(data.suggestions[0]);
      }
    } catch (error) {
      console.error("Error generating username suggestions:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const selectUsername = (username: string) => {
    setSelectedUsername(username);
    onUsernameGenerated?.(username);
  };

  if (!email || !firstName || !lastName) {
    return null;
  }

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <User className="h-4 w-4" />
          Username Options
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <RefreshCw className="h-4 w-4 animate-spin" />
            Generating username options...
          </div>
        ) : suggestions.length > 0 ? (
          <div className="space-y-3">
            <p className="text-sm text-gray-600">
              Select a username for <strong>{firstName} {lastName}</strong>:
            </p>
            <div className="grid gap-2">
              {suggestions.map((username, index) => (
                <div
                  key={username}
                  className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-colors ${
                    selectedUsername === username 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => selectUsername(username)}
                >
                  <div className="flex items-center gap-3">
                    <CheckCircle 
                      className={`h-4 w-4 ${
                        selectedUsername === username ? 'text-blue-500' : 'text-gray-300'
                      }`}
                    />
                    <span className="font-mono text-sm">{username}</span>
                    {index === 0 && (
                      <Badge variant="secondary" className="text-xs">
                        Recommended
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {username.includes('.teacher') && (
                      <Badge variant="outline" className="text-xs">
                        Teacher
                      </Badge>
                    )}
                    {/\d+$/.test(username) && (
                      <Badge variant="outline" className="text-xs">
                        Numbered
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
            
            <div className="pt-2 border-t">
              <p className="text-xs text-gray-500">
                <CheckCircle className="h-3 w-3 inline mr-1 text-green-500" />
                All usernames are checked for availability and uniqueness
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <AlertCircle className="h-4 w-4" />
            Fill in all fields to see username options
          </div>
        )}
      </CardContent>
    </Card>
  );
}