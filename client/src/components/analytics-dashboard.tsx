import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Calendar, Target, TrendingUp, Clock, BookOpen, Brain, Award, Flame, BarChart3 } from "lucide-react";

interface AnalyticsDashboardProps {
  userId: number;
}

export function AnalyticsDashboard({ userId }: AnalyticsDashboardProps) {
  const { data: streakData, isLoading: streakLoading } = useQuery({
    queryKey: [`/api/users/${userId}/streak`],
  });

  const { data: goals, isLoading: goalsLoading } = useQuery({
    queryKey: [`/api/users/${userId}/goals`],
  });

  const { data: achievements, isLoading: achievementsLoading } = useQuery({
    queryKey: [`/api/users/${userId}/achievements`],
  });

  const { data: sessionStats, isLoading: sessionStatsLoading } = useQuery({
    queryKey: [`/api/analytics/${userId}/sessions`],
  });

  const { data: writingStats, isLoading: writingStatsLoading } = useQuery({
    queryKey: [`/api/analytics/${userId}/writing-stats`],
  });

  const isLoading = streakLoading || goalsLoading || achievementsLoading || sessionStatsLoading || writingStatsLoading;

  if (isLoading) {
    return <div className="flex items-center justify-center p-8 text-gray-500">Loading analytics...</div>;
  }

  // Provide default values for missing data
  const safeStreakData = streakData || { currentStreak: 0, longestStreak: 0 };
  const safeGoals = Array.isArray(goals) ? goals : [];
  const safeAchievements = Array.isArray(achievements) ? achievements : [];
  const safeSessionStats = sessionStats || { totalSessions: 0, avgWordsPerSession: 0, totalWords: 0 };
  const safeWritingStats = writingStats || { 
    weeklyProgress: [], 
    monthlyStats: { wordsWritten: 0, sessionsCompleted: 0 },
    avgWordsPerDay: 0,
    mostProductiveDay: 'Monday',
    weeklyGoal: 500
  };

  const unlockedAchievements = safeAchievements.filter((a: any) => a.unlockedAt);
  const lockedAchievements = safeAchievements.filter((a: any) => !a.unlockedAt);

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Flame className="h-8 w-8 text-orange-500" />
              <div>
                <p className="text-2xl font-bold">{safeStreakData?.currentStreak || 0}</p>
                <p className="text-sm text-muted-foreground">Day Streak</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <BookOpen className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{safeSessionStats?.totalSessions || 0}</p>
                <p className="text-sm text-muted-foreground">Total Sessions</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{safeSessionStats.totalWords?.toLocaleString() || 0}</p>
                <p className="text-sm text-muted-foreground">Words Written</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Award className="h-8 w-8 text-purple-500" />
              <div>
                <p className="text-2xl font-bold">{unlockedAchievements.length}</p>
                <p className="text-sm text-muted-foreground">Achievements</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Goals Progress */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Target className="h-5 w-5" />
            <span>Writing Goals</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {goals.map((goal: any) => {
            const percentage = Math.round((goal.current / goal.target) * 100);
            return (
              <div key={goal.id} className="space-y-2">
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="font-medium">{goal.title}</h4>
                    <p className="text-sm text-muted-foreground">{goal.description}</p>
                  </div>
                  <Badge variant={percentage >= 100 ? "default" : "secondary"}>
                    {goal.current}/{goal.target}
                  </Badge>
                </div>
                <Progress value={Math.min(percentage, 100)} className="h-2" />
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Writing Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <BarChart3 className="h-5 w-5" />
              <span>Writing Progress</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm">Average Words/Day</span>
                <span className="font-medium">{safeWritingStats?.avgWordsPerDay || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Most Productive Day</span>
                <span className="font-medium">{safeWritingStats?.mostProductiveDay || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Weekly Goal</span>
                <span className="font-medium">{safeWritingStats?.weeklyGoal || 0} words</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Sessions Completed</span>
                <span className="font-medium">{safeWritingStats?.monthlyStats?.sessionsCompleted || 0}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Brain className="h-5 w-5" />
              <span>AI Learning Assistant</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm">Total AI Interactions</span>
                <span className="font-medium">{writingStats.aiUsageStats.totalInteractions}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Adaptive Level</span>
                <Badge variant="outline">{writingStats.aiUsageStats.adaptiveLevel}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Learning Progress</span>
                <span className="font-medium text-green-600">{writingStats.aiUsageStats.learningProgress}</span>
              </div>
            </div>
            
            <div className="space-y-2">
              <p className="text-sm font-medium">Help Categories Used:</p>
              {Object.entries(writingStats.aiUsageStats.helpCategories).map(([category, count]) => (
                <div key={category} className="flex justify-between items-center">
                  <span className="text-sm capitalize">{category}</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-16 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-500 h-2 rounded-full" 
                        style={{ width: `${(count as number / writingStats.aiUsageStats.totalInteractions) * 100}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium">{count}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Achievements */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Award className="h-5 w-5" />
            <span>Achievements</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {achievements.map((achievement: any) => (
              <div 
                key={achievement.id} 
                className={`p-4 rounded-lg border-2 ${
                  achievement.unlockedAt 
                    ? 'border-green-200 bg-green-50' 
                    : 'border-gray-200 bg-gray-50 opacity-60'
                }`}
              >
                <div className="text-center">
                  <div className="text-2xl mb-2">{achievement.icon}</div>
                  <h4 className="font-medium">{achievement.name}</h4>
                  <p className="text-sm text-muted-foreground mt-1">{achievement.description}</p>
                  {achievement.unlockedAt && (
                    <p className="text-xs text-green-600 mt-2">
                      Unlocked {new Date(achievement.unlockedAt).toLocaleDateString()}
                    </p>
                  )}
                  {!achievement.unlockedAt && (
                    <Badge variant="secondary" className="mt-2">Locked</Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Weekly Progress Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Calendar className="h-5 w-5" />
            <span>Weekly Progress</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {sessionStats.weeklyProgress.map((week: any, index: number) => (
              <div key={index} className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">{week.week}</span>
                  <div className="text-sm text-muted-foreground">
                    {week.sessions} sessions • {week.words} words
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-500 h-2 rounded-full transition-all duration-300" 
                    style={{ width: `${(week.words / 2000) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Time Distribution */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Clock className="h-5 w-5" />
            <span>Writing Time Preferences</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Object.entries(sessionStats.timeDistribution).map(([time, percentage]) => (
              <div key={time} className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium capitalize">{time}</span>
                  <span className="text-sm text-muted-foreground">{percentage}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-purple-500 h-2 rounded-full" 
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}