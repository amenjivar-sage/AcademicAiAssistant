import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Login from "@/pages/login";
import Register from "@/pages/register";
import Home from "@/pages/home";
import TeacherDashboard from "@/pages/teacher-dashboard";
import StudentDashboard from "@/pages/student-dashboard";
import AdminDashboard from "@/pages/admin-dashboard";
import WritingPage from "@/pages/writing-page";
import NotFound from "@/pages/not-found";
import WritingWorkspace from "@/components/writing-workspace";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Login} />
      <Route path="/register" component={Register} />
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
  return <Router />;
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
