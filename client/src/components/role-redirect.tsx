import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useEffect } from "react";

interface RoleRedirectProps {
  requiredRole: string;
  children: React.ReactNode;
}

export default function RoleRedirect({ requiredRole, children }: RoleRedirectProps) {
  const [, setLocation] = useLocation();
  
  const { data: currentUser, isLoading, error } = useQuery({
    queryKey: ["/api/auth/user"],
    retry: false
  });

  useEffect(() => {
    if (!isLoading && !currentUser) {
      setLocation('/');
      return;
    }

    if (currentUser && currentUser.role !== requiredRole) {
      // Redirect to correct dashboard based on role
      switch (currentUser.role) {
        case 'student':
          setLocation('/student');
          break;
        case 'teacher':
          setLocation('/teacher');
          break;
        case 'admin':
          setLocation('/admin');
          break;
        case 'school_admin':
          setLocation('/school-admin');
          break;
        default:
          setLocation('/');
      }
    }
  }, [currentUser, isLoading, requiredRole, setLocation]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!currentUser || currentUser.role !== requiredRole) {
    return null;
  }

  return <>{children}</>;
}