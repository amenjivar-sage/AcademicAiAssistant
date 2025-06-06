import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Clock } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface InactivityWarningProps {
  warningTimeMinutes?: number;
  logoutTimeMinutes?: number;
  onLogout?: () => void;
}

export default function InactivityWarning({ 
  warningTimeMinutes = 13, // Warn at 13 minutes (2 min before 15 min logout)
  logoutTimeMinutes = 15,  // Logout at 15 minutes
  onLogout 
}: InactivityWarningProps) {
  const [showWarning, setShowWarning] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const lastActivityRef = useRef(Date.now());
  const warningTimerRef = useRef<NodeJS.Timeout>();
  const logoutTimerRef = useRef<NodeJS.Timeout>();
  const countdownRef = useRef<NodeJS.Timeout>();

  // Track user activity
  const resetActivityTimer = () => {
    lastActivityRef.current = Date.now();
    setShowWarning(false);
    
    // Clear existing timers
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
    if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);

    // Set warning timer
    warningTimerRef.current = setTimeout(() => {
      setShowWarning(true);
      setTimeRemaining(120); // 2 minutes in seconds
      
      // Start countdown
      countdownRef.current = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            handleLogout();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      
    }, warningTimeMinutes * 60 * 1000);

    // Set logout timer as backup
    logoutTimerRef.current = setTimeout(() => {
      handleLogout();
    }, logoutTimeMinutes * 60 * 1000);
  };

  const handleLogout = () => {
    setShowWarning(false);
    if (onLogout) {
      onLogout();
    } else {
      // Default logout behavior
      window.location.href = '/api/auth/logout';
    }
  };

  const handleStayActive = () => {
    resetActivityTimer();
  };

  // Activity event listeners
  useEffect(() => {
    const events = [
      'mousedown', 'mousemove', 'keypress', 'scroll', 
      'touchstart', 'click', 'keydown'
    ];

    const handleActivity = () => {
      if (!showWarning) {
        resetActivityTimer();
      }
    };

    // Add event listeners
    events.forEach(event => {
      document.addEventListener(event, handleActivity, true);
    });

    // Initialize timer
    resetActivityTimer();

    // Cleanup
    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleActivity, true);
      });
      if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
      if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [showWarning]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Dialog open={showWarning} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Session Timeout Warning
          </DialogTitle>
          <DialogDescription>
            You will be automatically logged out due to inactivity in:
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex flex-col items-center py-6">
          <Clock className="h-12 w-12 text-amber-500 mb-4" />
          <div className="text-2xl font-mono font-bold text-amber-600">
            {formatTime(timeRemaining)}
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            Click "Stay Active" to continue your session
          </p>
        </div>

        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={handleLogout}
            className="flex-1"
          >
            Log Out Now
          </Button>
          <Button
            onClick={handleStayActive}
            className="flex-1"
          >
            Stay Active
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}