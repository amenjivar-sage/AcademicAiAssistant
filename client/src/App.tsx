import { Switch, Route } from "wouter";
import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Login from "@/pages/login";
import Home from "@/pages/home";
import TeacherDashboard from "@/pages/teacher-dashboard";
import StudentDashboard from "@/pages/student-dashboard";
import AdminDashboard from "@/pages/admin-dashboard";
import WritingPage from "@/pages/writing-page";
import NotFound from "@/pages/not-found";
import WritingWorkspace from "@/components/writing-workspace";
import UserSwitcher from "@/components/user-switcher";
import { apiRequest } from "@/lib/queryClient";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Login} />
      <Route path="/student" component={StudentDashboard} />
      <Route path="/teacher" component={TeacherDashboard} />
      <Route path="/admin" component={AdminDashboard} />
      <Route path="/writing/:id" component={WritingPage} />
      <Route path="/assignment/:assignmentId/session/:sessionId">
        {(params) => (
          <WritingWorkspace 
            assignmentId={parseInt(params.assignmentId)} 
            sessionId={parseInt(params.sessionId)} 
          />
        )}
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function AppContent() {
  const [currentUserId, setCurrentUserId] = useState(1);

  const { data: currentUser } = useQuery({
    queryKey: ["/api/demo/current-user"],
    retry: false,
  });

  const switchUserMutation = useMutation({
    mutationFn: async (userId: number) => {
      const response = await apiRequest("POST", "/api/demo/switch-user", { userId });
      return response.json();
    },
    onSuccess: () => {
      // Invalidate all queries to refresh data for new user
      queryClient.invalidateQueries();
    },
  });

  const handleUserSwitch = (userId: number) => {
    setCurrentUserId(userId);
    switchUserMutation.mutate(userId);
  };

  return (
    <div className="relative">
      <UserSwitcher 
        currentUserId={currentUserId}
        onUserSwitch={handleUserSwitch}
      />
      <Router />
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AppContent />
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
