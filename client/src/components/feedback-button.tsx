import { MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import FeedbackDialog from "@/components/feedback-dialog";

interface FeedbackButtonProps {
  context?: 'assignment' | 'platform' | 'general';
  contextId?: number;
  variant?: 'default' | 'outline' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
}

export default function FeedbackButton({ 
  context = 'general', 
  contextId, 
  variant = 'outline',
  size = 'sm',
  className = ''
}: FeedbackButtonProps) {
  return (
    <FeedbackDialog context={context} contextId={contextId}>
      <Button variant={variant} size={size} className={className}>
        <MessageSquare className="h-4 w-4 mr-2" />
        Send Feedback
      </Button>
    </FeedbackDialog>
  );
}