import { useState, useEffect } from "react";
import { CheckCircle, Star, Target } from "lucide-react";

interface WritingMilestoneProps {
  wordCount: number;
  onMilestone?: (milestone: number) => void;
}

export default function WritingMilestone({ wordCount, onMilestone }: WritingMilestoneProps) {
  const [lastMilestone, setLastMilestone] = useState(0);
  const [showCelebration, setShowCelebration] = useState(false);

  const milestones = [50, 100, 250, 500, 750, 1000];
  
  useEffect(() => {
    const nextMilestone = milestones.find(m => wordCount >= m && m > lastMilestone);
    
    if (nextMilestone && wordCount > 0) {
      setLastMilestone(nextMilestone);
      setShowCelebration(true);
      onMilestone?.(nextMilestone);
      
      // Hide celebration after 3 seconds
      setTimeout(() => setShowCelebration(false), 3000);
    }
  }, [wordCount, lastMilestone, onMilestone]);

  const getNextTarget = () => {
    return milestones.find(m => wordCount < m) || 1500;
  };

  const getProgressPercentage = () => {
    const nextTarget = getNextTarget();
    const previousTarget = milestones.find(m => m <= wordCount) || 0;
    const progress = ((wordCount - previousTarget) / (nextTarget - previousTarget)) * 100;
    return Math.min(100, Math.max(0, progress));
  };

  const getMilestoneMessage = (milestone: number) => {
    const messages = {
      50: "Great start! You're building momentum! 🌱",
      100: "Excellent progress! Ideas are flowing! ✨",
      250: "Quarter way to your first major milestone! 🚀",
      500: "Fantastic! You're really developing your thoughts! 🌟",
      750: "Amazing dedication! Your ideas are taking shape! 💡",
      1000: "Incredible achievement! Over 1000 words! 🎉"
    };
    return messages[milestone as keyof typeof messages] || "Keep up the great work!";
  };

  if (showCelebration && lastMilestone > 0) {
    return (
      <div className="fixed top-20 right-4 bg-green-50 border border-green-200 rounded-lg p-4 shadow-lg animate-in fade-in slide-in-from-right z-50">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
            <Star className="h-4 w-4 text-white" />
          </div>
          <div>
            <p className="font-medium text-green-800">{lastMilestone} words reached!</p>
            <p className="text-sm text-green-600">{getMilestoneMessage(lastMilestone)}</p>
          </div>
        </div>
      </div>
    );
  }

  // Progress indicator in toolbar
  if (wordCount > 0) {
    const nextTarget = getNextTarget();
    const progress = getProgressPercentage();
    
    return (
      <div className="flex items-center space-x-2 text-sm text-gray-600 bg-blue-50 px-3 py-1 rounded-full">
        <Target className="h-3 w-3 text-blue-500" />
        <div className="flex items-center space-x-2">
          <span>{wordCount}/{nextTarget}</span>
          <div className="w-16 h-1 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-blue-500 transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>
    );
  }

  return null;
}