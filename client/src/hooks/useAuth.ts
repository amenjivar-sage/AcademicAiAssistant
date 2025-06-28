import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";

export function useAuth() {
  console.log("🔍 useAuth hook called");
  
  const { data: user, isLoading, error } = useQuery({
    queryKey: ["/api/auth/user"],
    queryFn: getQueryFn({ on401: "returnNull" }), // Handle 401 as null instead of throwing
    retry: false,
    refetchOnMount: true, // Override default to ensure it runs on mount
    refetchOnWindowFocus: false,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  console.log("🔍 useAuth state:", { user, isLoading, error });

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
  };
}