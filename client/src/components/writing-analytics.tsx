import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, TrendingDown, BarChart3, Target, BookOpen, Clock, Brain, Award } from "lucide-react";
import type { WritingSession } from "@shared/schema";

interface WritingAnalyticsProps {
  userId: number;
  userRole: "teacher" | "student";
  timeframe?: "week" | "month" | "semester";
}

interface AnalyticsData {
  vocabularyDiversity: number;
  averageSentenceLength: number;
  writingComplexity: number;
  improvementTrend: number;
  weeklyProgress: Array<{
    week: string;
    wordCount: number;
    sessionsCompleted: number;
  }>;
  styleMetrics: {
    readabilityScore: number;
    sentenceVariety: number;
    vocabularyGrowth: number;
  };
}

export default function WritingAnalytics({ userId, userRole, timeframe = "month" }: WritingAnalyticsProps) {
  // Get writing sessions for analysis
  const { data: writingSessions } = useQuery<WritingSession[]>({
    queryKey: [`/api/analytics/${userId}/sessions`],
  });

  // Get computed analytics data
  const { data: analytics } = useQuery<AnalyticsData>({
    queryKey: [`/api/analytics/${userId}/writing-stats`, timeframe],
  });

  const getTrendIcon = (trend: number) => {
    if (trend > 0) return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (trend < 0) return <TrendingDown className="h-4 w-4 text-red-500" />;
    return <BarChart3 className="h-4 w-4 text-gray-500" />;
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  const getProgressMessage = (score: number) => {
    if (score >= 90) return "Exceptional writing quality!";
    if (score >= 80) return "Strong writing skills developing";
    if (score >= 70) return "Good progress, keep improving";
    if (score >= 60) return "Steady improvement showing";
    return "Focus on fundamentals";
  };

  if (!analytics) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Writing Quality</p>
                <div className="flex items-center gap-2 mt-1">
                  <p className={`text-2xl font-bold ${getScoreColor(analytics.styleMetrics.readabilityScore)}`}>
                    {analytics.styleMetrics.readabilityScore}%
                  </p>
                  {getTrendIcon(analytics.improvementTrend)}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {getProgressMessage(analytics.styleMetrics.readabilityScore)}
                </p>
              </div>
              <Brain className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Vocabulary Growth</p>
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-2xl font-bold text-purple-600">
                    +{analytics.styleMetrics.vocabularyGrowth}%
                  </p>
                  <TrendingUp className="h-4 w-4 text-purple-500" />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Unique words per essay
                </p>
              </div>
              <BookOpen className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Sentence Variety</p>
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-2xl font-bold text-green-600">
                    {analytics.styleMetrics.sentenceVariety}%
                  </p>
                  {getTrendIcon(analytics.styleMetrics.sentenceVariety - 70)}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Structure complexity
                </p>
              </div>
              <Target className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analytics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Writing Style Analysis
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Vocabulary Diversity</span>
                  <span className="text-sm text-gray-600">{analytics.vocabularyDiversity}%</span>
                </div>
                <Progress value={analytics.vocabularyDiversity} className="h-2" />
                <p className="text-xs text-gray-500 mt-1">
                  {analytics.vocabularyDiversity > 75 ? "Excellent variety" : 
                   analytics.vocabularyDiversity > 50 ? "Good range" : "Try using more varied words"}
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Average Sentence Length</span>
                  <span className="text-sm text-gray-600">{analytics.averageSentenceLength} words</span>
                </div>
                <Progress value={Math.min((analytics.averageSentenceLength / 20) * 100, 100)} className="h-2" />
                <p className="text-xs text-gray-500 mt-1">
                  {analytics.averageSentenceLength > 15 ? "Good complexity" : 
                   analytics.averageSentenceLength > 10 ? "Moderate complexity" : "Try longer sentences"}
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Writing Complexity</span>
                  <span className="text-sm text-gray-600">{analytics.writingComplexity}%</span>
                </div>
                <Progress value={analytics.writingComplexity} className="h-2" />
                <p className="text-xs text-gray-500 mt-1">
                  {analytics.writingComplexity > 70 ? "Advanced writing" : 
                   analytics.writingComplexity > 50 ? "Developing complexity" : "Focus on varied structures"}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="font-medium text-gray-900">Recent Progress</h4>
              {analytics.weeklyProgress.slice(-4).map((week, index) => (
                <div key={week.week} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium">{week.week}</p>
                    <p className="text-xs text-gray-600">{week.sessionsCompleted} sessions completed</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold">{week.wordCount.toLocaleString()}</p>
                    <p className="text-xs text-gray-500">words written</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Writing Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5" />
            {userRole === "teacher" ? "Student Insights" : "Writing Insights"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h4 className="font-medium text-blue-900 mb-2">Strengths</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                {analytics.styleMetrics.readabilityScore > 80 && (
                  <li>• Clear and readable writing style</li>
                )}
                {analytics.styleMetrics.vocabularyGrowth > 10 && (
                  <li>• Expanding vocabulary usage</li>
                )}
                {analytics.styleMetrics.sentenceVariety > 75 && (
                  <li>• Good sentence structure variety</li>
                )}
                {analytics.vocabularyDiversity > 70 && (
                  <li>• Rich word choice and expression</li>
                )}
              </ul>
            </div>

            <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
              <h4 className="font-medium text-orange-900 mb-2">Growth Areas</h4>
              <ul className="text-sm text-orange-800 space-y-1">
                {analytics.styleMetrics.readabilityScore < 70 && (
                  <li>• Focus on clarity and flow</li>
                )}
                {analytics.styleMetrics.vocabularyGrowth < 5 && (
                  <li>• Try incorporating new vocabulary</li>
                )}
                {analytics.styleMetrics.sentenceVariety < 60 && (
                  <li>• Vary sentence structures more</li>
                )}
                {analytics.averageSentenceLength < 12 && (
                  <li>• Consider longer, more complex sentences</li>
                )}
              </ul>
            </div>
          </div>

          {userRole === "student" && (
            <div className="mt-4 p-4 bg-green-50 rounded-lg border border-green-200">
              <h4 className="font-medium text-green-900 mb-2">💡 Tips for Improvement</h4>
              <div className="text-sm text-green-800 space-y-1">
                <p>• Read your work aloud to check flow and clarity</p>
                <p>• Use a thesaurus to find more precise words</p>
                <p>• Combine short sentences for better rhythm</p>
                <p>• Ask your teacher for specific feedback on style</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}