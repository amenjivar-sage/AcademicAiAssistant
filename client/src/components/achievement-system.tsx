import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Trophy, Target, Flame, Star, Award, Calendar, BookOpen, Zap } from "lucide-react";
import type { Achievement, WritingStreak, WritingGoal } from "@shared/schema";

interface AchievementSystemProps {
  userId: number;
  totalWordCount: number;
  completedAssignments: number;
}

export default function AchievementSystem({ userId, totalWordCount, completedAssignments }: AchievementSystemProps) {
  // Get user's achievements
  const { data: achievements } = useQuery<Achievement[]>({
    queryKey: [`/api/users/${userId}/achievements`],
  });

  // Get user's writing streak
  const { data: writingStreak } = useQuery<WritingStreak>({
    queryKey: [`/api/users/${userId}/streak`],
  });

  // Get user's active goals
  const { data: activeGoals } = useQuery<WritingGoal[]>({
    queryKey: [`/api/users/${userId}/goals`],
  });

  const getAchievementIcon = (type: string) => {
    switch (type) {
      case "streak": return <Flame className="h-5 w-5 text-orange-500" />;
      case "wordcount": return <BookOpen className="h-5 w-5 text-blue-500" />;
      case "assignment": return <Trophy className="h-5 w-5 text-yellow-500" />;
      case "improvement": return <Zap className="h-5 w-5 text-purple-500" />;
      default: return <Star className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStreakMessage = (currentStreak: number) => {
    if (currentStreak === 0) return "Start your writing journey!";
    if (currentStreak === 1) return "Great start! Keep it going!";
    if (currentStreak < 7) return "Building momentum!";
    if (currentStreak < 30) return "Amazing consistency!";
    return "Legendary writer! 🔥";
  };

  return (
    <div className="space-y-6">
      {/* Writing Streak Card */}
      <Card className="border-orange-200 bg-gradient-to-r from-orange-50 to-yellow-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Flame className="h-5 w-5 text-orange-500" />
            Writing Streak
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-3xl font-bold text-orange-600">
                {writingStreak?.currentStreak || 0}
              </div>
              <p className="text-sm text-orange-700">
                {getStreakMessage(writingStreak?.currentStreak || 0)}
              </p>
              <p className="text-xs text-orange-600 mt-1">
                Best: {writingStreak?.longestStreak || 0} days
              </p>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-600">Next milestone</div>
              <div className="text-lg font-semibold text-gray-800">
                {Math.ceil(((writingStreak?.currentStreak || 0) + 1) / 7) * 7} days
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Active Goals */}
      {activeGoals && activeGoals.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-blue-500" />
              Active Goals
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {activeGoals.map((goal) => {
              const current = goal.currentProgress || 0;
              const target = goal.targetWords || 1;
              const progress = Math.min((current / target) * 100, 100);
              return (
                <div key={goal.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-gray-500" />
                      <span className="font-medium capitalize">{goal.type} Goal</span>
                      <Badge variant="outline">{(goal.targetWords || 0).toLocaleString()} words</Badge>
                    </div>
                    <span className="text-sm text-gray-600">
                      {current.toLocaleString()} / {target.toLocaleString()}
                    </span>
                  </div>
                  <Progress value={isNaN(progress) ? 0 : progress} className="h-2" />
                  <p className="text-xs text-gray-500">
                    {isNaN(progress) ? 0 : progress.toFixed(1)}% complete
                    {goal.endDate && ` • Due ${new Date(goal.endDate).toLocaleDateString()}`}
                  </p>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Recent Achievements */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5 text-purple-500" />
            Recent Achievements
            <Badge variant="outline">{achievements?.length || 0} earned</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {achievements && achievements.length > 0 ? (
            <div className="grid gap-3">
              {achievements.slice(0, 6).map((achievement) => (
                <div
                  key={achievement.id}
                  className="flex items-center gap-3 p-3 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border border-purple-200"
                >
                  <div className="p-2 bg-white rounded-full shadow-sm">
                    {getAchievementIcon(achievement.type)}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">{achievement.name}</h4>
                    <p className="text-sm text-gray-600">{achievement.description}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Unlocked {new Date(achievement.unlockedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <Badge className="bg-purple-100 text-purple-800">
                    {achievement.badgeIcon}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Trophy className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Start Earning Achievements!</h3>
              <p className="text-gray-500 mb-4">Complete assignments and maintain writing streaks to unlock badges</p>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <Flame className="h-4 w-4 text-orange-500 mx-auto mb-1" />
                  <p className="font-medium">7-Day Streak</p>
                  <p className="text-gray-500">Write for a week</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <BookOpen className="h-4 w-4 text-blue-500 mx-auto mb-1" />
                  <p className="font-medium">First 1000</p>
                  <p className="text-gray-500">Write 1000 words</p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="text-center">
          <CardContent className="p-4">
            <BookOpen className="h-6 w-6 text-blue-500 mx-auto mb-2" />
            <div className="text-xl font-bold text-gray-900">{totalWordCount.toLocaleString()}</div>
            <p className="text-sm text-gray-600">Total Words</p>
          </CardContent>
        </Card>
        
        <Card className="text-center">
          <CardContent className="p-4">
            <Trophy className="h-6 w-6 text-yellow-500 mx-auto mb-2" />
            <div className="text-xl font-bold text-gray-900">{completedAssignments}</div>
            <p className="text-sm text-gray-600">Assignments Done</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}