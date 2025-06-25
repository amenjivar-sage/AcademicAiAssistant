
import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import InactivityWarning from "@/components/inactivity-warning";
import Login from "@/pages/login";
import Register from "@/pages/register";
import ForgotCredentials from "@/pages/forgot-credentials";
import ChangePassword from "@/pages/change-password";
import PrivacyNotice from "@/pages/privacy-notice";
import TeacherDashboard from "@/pages/teacher-dashboard";
import StudentDashboard from "@/pages/student-dashboard";
import AdminDashboard from "@/pages/admin-dashboard";
import SchoolAdminDashboard from "@/pages/school-admin-dashboard";
import WritingPage from "@/pages/writing-page";
import NotFound from "@/pages/not-found";
import WritingWorkspace from "@/components/writing-workspace";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/forgot-credentials" component={ForgotCredentials} />
      <Route path="/change-password" component={ChangePassword} />
      <Route path="/privacy-notice" component={PrivacyNotice} />
      <Route path="/student" component={StudentDashboard} />
      <Route path="/teacher" component={TeacherDashboard} />
      <Route path="/admin" component={AdminDashboard} />
      <Route path="/school-admin" component={SchoolAdminDashboard} />
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
  const [location] = useLocation();
  
  const handleLogout = () => {
    // Navigate to logout endpoint
    window.location.href = '/api/auth/logout';
  };

  // Only show inactivity warning on authenticated pages (not login/register/privacy)
  const isAuthPage = ['/', '/register', '/forgot-credentials', '/privacy-notice'].includes(location);

  return (
    <>
      <Router />
      {!isAuthPage && (
        <InactivityWarning 
          warningTimeMinutes={13}
          logoutTimeMinutes={15}
          onLogout={handleLogout}
        />
      )}
    </>
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
