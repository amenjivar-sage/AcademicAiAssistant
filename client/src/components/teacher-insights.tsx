import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Trophy, TrendingUp, TrendingDown, AlertTriangle, Star, Target, MessageSquare, Award } from "lucide-react";
import MessagingSystem from "@/components/messaging-system";
import type { User, Achievement, WritingStreak, WritingSession } from "@shared/schema";

interface TeacherInsightsProps {
  teacherId: number;
}

interface StudentInsight {
  student: User;
  totalWords: number;
  completedAssignments: number;
  currentStreak: number;
  recentAchievements: Achievement[];
  writingQuality: number;
  needsAttention: boolean;
  improvementTrend: number;
  lastActivity: Date;
}

export default function TeacherInsights({ teacherId }: TeacherInsightsProps) {
  // Get student insights for this teacher's classes
  const { data: studentInsights } = useQuery<StudentInsight[]>({
    queryKey: [`/api/teacher/${teacherId}/student-insights`],
  });

  // Get class achievement leaderboard
  const { data: leaderboard } = useQuery<Array<{
    student: User;
    totalScore: number;
    achievements: number;
    streak: number;
  }>>({
    queryKey: [`/api/teacher/${teacherId}/leaderboard`],
  });

  const getStatusColor = (needsAttention: boolean, trend: number) => {
    if (needsAttention) return "text-red-600";
    if (trend > 0) return "text-green-600";
    return "text-yellow-600";
  };

  const getStatusIcon = (needsAttention: boolean, trend: number) => {
    if (needsAttention) return <AlertTriangle className="h-4 w-4 text-red-500" />;
    if (trend > 0) return <TrendingUp className="h-4 w-4 text-green-500" />;
    return <TrendingDown className="h-4 w-4 text-yellow-500" />;
  };

  const getAttentionMessage = (insight: StudentInsight) => {
    if (insight.needsAttention) {
      const daysSinceActivity = Math.floor((Date.now() - insight.lastActivity.getTime()) / (1000 * 60 * 60 * 24));
      if (daysSinceActivity > 7) return "No activity for over a week";
      if (insight.completedAssignments === 0) return "No assignments completed";
      if (insight.writingQuality < 60) return "Writing quality concerns";
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Class Performance Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6 text-center">
            <Trophy className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
            <div className="text-2xl font-bold">{studentInsights?.filter(s => !s.needsAttention).length || 0}</div>
            <p className="text-sm text-gray-600">Students on Track</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6 text-center">
            <AlertTriangle className="h-8 w-8 text-red-500 mx-auto mb-2" />
            <div className="text-2xl font-bold">{studentInsights?.filter(s => s.needsAttention).length || 0}</div>
            <p className="text-sm text-gray-600">Need Attention</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6 text-center">
            <Star className="h-8 w-8 text-blue-500 mx-auto mb-2" />
            <div className="text-2xl font-bold">
              {studentInsights?.reduce((sum, s) => sum + s.recentAchievements.length, 0) || 0}
            </div>
            <p className="text-sm text-gray-600">Recent Achievements</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6 text-center">
            <TrendingUp className="h-8 w-8 text-green-500 mx-auto mb-2" />
            <div className="text-2xl font-bold">
              {Math.round(studentInsights?.reduce((sum, s) => sum + s.writingQuality, 0) / (studentInsights?.length || 1)) || 0}%
            </div>
            <p className="text-sm text-gray-600">Avg Writing Quality</p>
          </CardContent>
        </Card>
      </div>

      {/* Achievement Leaderboard */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5" />
            Class Achievement Leaderboard
          </CardTitle>
        </CardHeader>
        <CardContent>
          {leaderboard && leaderboard.length > 0 ? (
            <div className="space-y-3">
              {leaderboard.slice(0, 10).map((entry, index) => (
                <div
                  key={entry.student.id}
                  className={`flex items-center justify-between p-3 rounded-lg ${
                    index === 0 ? "bg-yellow-50 border border-yellow-200" :
                    index === 1 ? "bg-gray-50 border border-gray-200" :
                    index === 2 ? "bg-orange-50 border border-orange-200" :
                    "bg-blue-50 border border-blue-100"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                      index === 0 ? "bg-yellow-500 text-white" :
                      index === 1 ? "bg-gray-500 text-white" :
                      index === 2 ? "bg-orange-500 text-white" :
                      "bg-blue-500 text-white"
                    }`}>
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium">{entry.student.firstName} {entry.student.lastName}</p>
                      <p className="text-sm text-gray-600">{entry.achievements} achievements • {entry.streak} day streak</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold">{entry.totalScore}</p>
                    <p className="text-xs text-gray-500">points</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Trophy className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No student achievements yet</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Student Status Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Student Progress Monitor
          </CardTitle>
        </CardHeader>
        <CardContent>
          {studentInsights && studentInsights.length > 0 ? (
            <div className="space-y-4">
              {studentInsights.map((insight) => (
                <div
                  key={insight.student.id}
                  className={`p-4 rounded-lg border-l-4 ${
                    insight.needsAttention 
                      ? "border-l-red-500 bg-red-50" 
                      : insight.improvementTrend > 0 
                        ? "border-l-green-500 bg-green-50"
                        : "border-l-gray-500 bg-gray-50"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="font-medium text-gray-900">
                          {insight.student.firstName} {insight.student.lastName}
                        </h4>
                        {getStatusIcon(insight.needsAttention, insight.improvementTrend)}
                        {insight.needsAttention && (
                          <Badge variant="destructive" className="text-xs">
                            Needs Attention
                          </Badge>
                        )}
                        {insight.currentStreak > 7 && (
                          <Badge className="bg-orange-100 text-orange-800 text-xs">
                            🔥 {insight.currentStreak} day streak
                          </Badge>
                        )}
                      </div>

                      <div className="grid grid-cols-4 gap-4 mb-3 text-sm">
                        <div>
                          <p className="text-gray-500">Total Words</p>
                          <p className="font-medium">{insight.totalWords.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Completed</p>
                          <p className="font-medium">{insight.completedAssignments} assignments</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Writing Quality</p>
                          <p className={`font-medium ${getStatusColor(insight.needsAttention, insight.improvementTrend)}`}>
                            {insight.writingQuality}%
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-500">Recent Achievements</p>
                          <p className="font-medium">{insight.recentAchievements.length}</p>
                        </div>
                      </div>

                      {getAttentionMessage(insight) && (
                        <div className="mb-3">
                          <p className="text-sm text-red-700 font-medium">
                            ⚠️ {getAttentionMessage(insight)}
                          </p>
                        </div>
                      )}

                      {insight.recentAchievements.length > 0 && (
                        <div className="flex gap-2 flex-wrap">
                          {insight.recentAchievements.slice(0, 3).map((achievement) => (
                            <Badge key={achievement.id} className="bg-purple-100 text-purple-800 text-xs">
                              {achievement.badgeIcon} {achievement.name}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <MessagingSystem 
                        currentUserId={teacherId} 
                        currentUserRole="teacher"
                        recipientId={insight.student.id}
                        recipientName={`${insight.student.firstName} ${insight.student.lastName}`}
                      >
                        <Button variant="outline" size="sm">
                          <MessageSquare className="h-4 w-4 mr-1" />
                          Message
                        </Button>
                      </MessagingSystem>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Target className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No student data available yet</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}