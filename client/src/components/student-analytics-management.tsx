import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { 
  Upload, 
  Download, 
  FileSpreadsheet, 
  BarChart3, 
  TrendingUp, 
  Users, 
  BookOpen,
  Award,
  Clock,
  Target,
  Eye,
  Filter
} from 'lucide-react';

interface StudentAnalytics {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  grade: string;
  totalAssignments: number;
  completedAssignments: number;
  totalWordCount: number;
  averageWordCount: number;
  averageGrade: string;
  aiInteractions: number;
  totalTimeSpent: number; // in minutes
  improvementScore: number;
  lastActivity: string;
  strongestSubject: string;
  areasForImprovement: string[];
}

export default function StudentAnalyticsManagement() {
  const [importData, setImportData] = useState('');
  const [filterGrade, setFilterGrade] = useState('all');
  const [filterPerformance, setFilterPerformance] = useState('all');
  const [selectedStudent, setSelectedStudent] = useState<number | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch student analytics data
  const { data: studentAnalytics, isLoading } = useQuery({
    queryKey: ['/api/admin/student-analytics'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/admin/student-analytics');
      return response.json();
    },
  });

  // Bulk import mutation
  const importMutation = useMutation({
    mutationFn: async (data: string) => {
      const response = await apiRequest('POST', '/api/admin/import-student-analytics', {
        data: data
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Import Successful",
        description: "Student analytics data has been imported successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/student-analytics'] });
      setImportData('');
    },
    onError: (error: any) => {
      toast({
        title: "Import Failed",
        description: error.message || "Failed to import student analytics data.",
        variant: "destructive",
      });
    },
  });

  // Export function
  const handleExport = async () => {
    try {
      const response = await apiRequest('GET', '/api/admin/export-student-analytics');
      const data = await response.text();
      
      const blob = new Blob([data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `student-analytics-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "Export Successful",
        description: "Student analytics data has been exported to CSV.",
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to export student analytics data.",
        variant: "destructive",
      });
    }
  };

  const handleImport = () => {
    if (!importData.trim()) {
      toast({
        title: "Import Error",
        description: "Please provide data to import.",
        variant: "destructive",
      });
      return;
    }
    importMutation.mutate(importData);
  };

  // Filter analytics data
  const filteredAnalytics = studentAnalytics?.filter((student: StudentAnalytics) => {
    if (filterGrade !== 'all' && student.grade !== filterGrade) return false;
    if (filterPerformance !== 'all') {
      const completionRate = student.totalAssignments > 0 ? 
        (student.completedAssignments / student.totalAssignments) * 100 : 0;
      if (filterPerformance === 'high' && completionRate < 80) return false;
      if (filterPerformance === 'medium' && (completionRate < 60 || completionRate >= 80)) return false;
      if (filterPerformance === 'low' && completionRate >= 60) return false;
    }
    return true;
  }) || [];

  // Calculate summary statistics
  const summaryStats = {
    totalStudents: filteredAnalytics.length,
    averageCompletion: filteredAnalytics.length > 0 ? 
      Math.round(filteredAnalytics.reduce((sum: number, s: StudentAnalytics) => 
        sum + (s.totalAssignments > 0 ? (s.completedAssignments / s.totalAssignments) * 100 : 0), 0
      ) / filteredAnalytics.length) : 0,
    totalWordCount: filteredAnalytics.reduce((sum: number, s: StudentAnalytics) => sum + s.totalWordCount, 0),
    averageAiInteractions: filteredAnalytics.length > 0 ? 
      Math.round(filteredAnalytics.reduce((sum: number, s: StudentAnalytics) => sum + s.aiInteractions, 0) / filteredAnalytics.length) : 0
  };

  return (
    <div className="space-y-6">
      {/* Header with Import/Export */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Student Analytics Management</h2>
          <p className="text-gray-600">Comprehensive student performance tracking and analysis</p>
        </div>
        <div className="flex items-center space-x-3">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" className="flex items-center gap-2">
                <Upload className="h-4 w-4" />
                Import Analytics
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Import Student Analytics Data</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="import-data">CSV Data or JSON Format</Label>
                  <Textarea
                    id="import-data"
                    placeholder="Paste CSV data or JSON analytics data here..."
                    value={importData}
                    onChange={(e) => setImportData(e.target.value)}
                    rows={12}
                    className="font-mono text-sm"
                  />
                </div>
                <div className="flex justify-end space-x-2">
                  <Button 
                    onClick={handleImport}
                    disabled={importMutation.isPending}
                    className="flex items-center gap-2"
                  >
                    <Upload className="h-4 w-4" />
                    {importMutation.isPending ? 'Importing...' : 'Import Data'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          
          <Button 
            onClick={handleExport}
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Export Analytics
          </Button>
        </div>
      </div>

      {/* Summary Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Students</CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{summaryStats.totalStudents}</div>
            <p className="text-xs text-muted-foreground">Active students tracked</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Completion</CardTitle>
            <Target className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{summaryStats.averageCompletion}%</div>
            <p className="text-xs text-muted-foreground">Assignment completion rate</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Words Written</CardTitle>
            <BookOpen className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {summaryStats.totalWordCount.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">Across all students</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg AI Interactions</CardTitle>
            <TrendingUp className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{summaryStats.averageAiInteractions}</div>
            <p className="text-xs text-muted-foreground">Per student</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filter Analytics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="grade-filter">Grade Level</Label>
              <Select value={filterGrade} onValueChange={setFilterGrade}>
                <SelectTrigger>
                  <SelectValue placeholder="All Grades" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Grades</SelectItem>
                  <SelectItem value="6th">6th Grade</SelectItem>
                  <SelectItem value="7th">7th Grade</SelectItem>
                  <SelectItem value="8th">8th Grade</SelectItem>
                  <SelectItem value="9th">9th Grade</SelectItem>
                  <SelectItem value="10th">10th Grade</SelectItem>
                  <SelectItem value="11th">11th Grade</SelectItem>
                  <SelectItem value="12th">12th Grade</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="performance-filter">Performance Level</Label>
              <Select value={filterPerformance} onValueChange={setFilterPerformance}>
                <SelectTrigger>
                  <SelectValue placeholder="All Performance Levels" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Levels</SelectItem>
                  <SelectItem value="high">High Performers (80%+)</SelectItem>
                  <SelectItem value="medium">Medium Performers (60-79%)</SelectItem>
                  <SelectItem value="low">Needs Support (&lt;60%)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Student Analytics Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Detailed Student Analytics
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Loading analytics data...</div>
          ) : filteredAnalytics.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No analytics data available</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-2">Student</th>
                    <th className="text-left py-3 px-2">Grade</th>
                    <th className="text-center py-3 px-2">Assignments</th>
                    <th className="text-center py-3 px-2">Completion</th>
                    <th className="text-center py-3 px-2">Word Count</th>
                    <th className="text-center py-3 px-2">Avg Grade</th>
                    <th className="text-center py-3 px-2">AI Usage</th>
                    <th className="text-center py-3 px-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAnalytics.map((student: StudentAnalytics) => {
                    const completionRate = student.totalAssignments > 0 ? 
                      Math.round((student.completedAssignments / student.totalAssignments) * 100) : 0;
                    
                    return (
                      <tr key={student.id} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-2">
                          <div>
                            <div className="font-medium">{student.firstName} {student.lastName}</div>
                            <div className="text-xs text-gray-500">{student.email}</div>
                          </div>
                        </td>
                        <td className="py-3 px-2">
                          <Badge variant="outline">{student.grade}</Badge>
                        </td>
                        <td className="py-3 px-2 text-center">
                          {student.completedAssignments}/{student.totalAssignments}
                        </td>
                        <td className="py-3 px-2 text-center">
                          <Badge variant={
                            completionRate >= 80 ? 'default' : 
                            completionRate >= 60 ? 'secondary' : 'destructive'
                          }>
                            {completionRate}%
                          </Badge>
                        </td>
                        <td className="py-3 px-2 text-center">
                          {student.totalWordCount.toLocaleString()}
                        </td>
                        <td className="py-3 px-2 text-center">
                          <Badge variant="outline">{student.averageGrade || 'N/A'}</Badge>
                        </td>
                        <td className="py-3 px-2 text-center">
                          {student.aiInteractions}
                        </td>
                        <td className="py-3 px-2 text-center">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedStudent(student.id)}
                          >
                            <Eye className="h-3 w-3" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}