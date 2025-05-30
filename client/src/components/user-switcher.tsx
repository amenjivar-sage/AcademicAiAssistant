import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { User, GraduationCap } from "lucide-react";

interface UserSwitcherProps {
  currentUserId: number;
  onUserSwitch: (userId: number) => void;
}

export default function UserSwitcher({ currentUserId, onUserSwitch }: UserSwitcherProps) {
  const users = [
    { id: 1, name: "Sarah Johnson", role: "teacher", email: "sarah.johnson@university.edu" },
    { id: 2, name: "Alex Chen", role: "student", email: "alex.chen@student.edu" },
    { id: 3, name: "Maria Rodriguez", role: "student", email: "maria.rodriguez@student.edu" }
  ];

  return (
    <Card className="fixed top-4 right-4 z-50 w-80">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <User className="h-4 w-4" />
          Demo User Switcher
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-2">
          {users.map((user) => (
            <Button
              key={user.id}
              variant={currentUserId === user.id ? "default" : "outline"}
              size="sm"
              className="w-full justify-start text-xs"
              onClick={() => onUserSwitch(user.id)}
            >
              {user.role === "teacher" ? (
                <GraduationCap className="h-3 w-3 mr-2" />
              ) : (
                <User className="h-3 w-3 mr-2" />
              )}
              <div className="text-left">
                <div className="font-medium">{user.name}</div>
                <div className="text-gray-500 capitalize">{user.role}</div>
              </div>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}