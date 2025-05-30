import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertWritingSessionSchema, insertAiInteractionSchema, insertAssignmentSchema, insertMessageSchema } from "@shared/schema";
import { z } from "zod";
import { checkRestrictedPrompt, generateAiResponse } from "./openai";

export async function registerRoutes(app: Express): Promise<Server> {

  // Demo user ID for memory storage
  const currentDemoUserId = 1; // Student user ID

  // Authentication routes
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ message: "Username and password are required" });
      }

      const user = await storage.getUserByUsername(username);
      
      if (!user || user.password !== password) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Remove password from response
      const { password: _, ...userWithoutPassword } = user;
      
      res.json({
        user: userWithoutPassword,
        message: "Login successful"
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get current user (demo implementation)
  app.get("/api/auth/user", async (req, res) => {
    try {
      const user = await storage.getUser(currentDemoUserId);
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }
      
      const { password: _, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Get user error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get writing session by ID
  app.get("/api/writing-sessions/:sessionId", async (req, res) => {
    const sessionId = parseInt(req.params.sessionId);
    console.log('Session retrieval request for ID:', sessionId);
    
    try {
      const session = await storage.getWritingSession(sessionId);
      if (session) {
        console.log('Session found:', session.id);
        return res.json(session);
      } else {
        console.log('Session not found:', sessionId);
        return res.status(404).json({ message: "Session not found" });
      }
    } catch (error) {
      console.error('Error retrieving session:', error);
      return res.status(500).json({ message: "Failed to get session" });
    }
  });

  // Update writing session content
  app.patch("/api/writing-sessions/:id", async (req, res) => {
    try {
      const sessionId = parseInt(req.params.id);
      const updateData = req.body;
      
      console.log('Updating session:', sessionId, 'with data:', Object.keys(updateData));
      
      // Calculate word count if content is provided
      if (updateData.content) {
        const words = updateData.content.trim().split(/\s+/).filter((word: string) => word.length > 0);
        updateData.wordCount = words.length;
      }
      
      // Convert submittedAt ISO string to Date object if present
      if (updateData.submittedAt && typeof updateData.submittedAt === 'string') {
        updateData.submittedAt = new Date(updateData.submittedAt);
      }
      
      const updatedSession = await storage.updateWritingSession(sessionId, updateData);
      
      if (!updatedSession) {
        return res.status(404).json({ message: "Session not found" });
      }
      
      console.log('Session updated successfully:', updatedSession.id);
      res.json(updatedSession);
    } catch (error) {
      console.error('Error updating session:', error);
      res.status(500).json({ message: "Failed to update session" });
    }
  });

  // Create new writing session
  app.post("/api/writing-sessions", async (req, res) => {
    try {
      const sessionData = req.body;
      
      // Calculate word count if content is provided
      if (sessionData.content) {
        const words = sessionData.content.trim().split(/\s+/).filter((word: string) => word.length > 0);
        sessionData.wordCount = words.length;
      }
      
      const newSession = await storage.createWritingSession(sessionData);
      console.log('Created new session:', newSession.id, 'for assignment:', sessionData.assignmentId);
      
      res.json(newSession);
    } catch (error) {
      console.error('Error creating writing session:', error);
      res.status(500).json({ message: "Failed to create session" });
    }
  });

  // Get assignments for teacher
  app.get("/api/assignments/teacher/:teacherId", async (req, res) => {
    try {
      const teacherId = parseInt(req.params.teacherId);
      const assignments = await storage.getTeacherAssignments(teacherId);
      res.json(assignments);
    } catch (error) {
      console.error("Error fetching assignments:", error);
      res.status(500).json({ message: "Failed to fetch assignments" });
    }
  });

  // Teacher API routes (missing from clean routes)
  app.get("/api/teacher/assignments", async (req, res) => {
    try {
      const teacherId = 1; // Demo teacher ID
      const assignments = await storage.getTeacherAssignments(teacherId);
      res.json(assignments);
    } catch (error) {
      console.error("Error fetching teacher assignments:", error);
      res.status(500).json({ message: "Failed to fetch assignments" });
    }
  });

  app.get("/api/teacher/classrooms", async (req, res) => {
    try {
      const teacherId = 1; // Demo teacher ID
      const classrooms = await storage.getTeacherClassrooms(teacherId);
      res.json(classrooms);
    } catch (error) {
      console.error("Error fetching teacher classrooms:", error);
      res.status(500).json({ message: "Failed to fetch classrooms" });
    }
  });

  // Get assignment submissions for teacher grading
  app.get("/api/assignments/:assignmentId/submissions", async (req, res) => {
    try {
      const assignmentId = parseInt(req.params.assignmentId);
      const submissions = await storage.getAssignmentSubmissions(assignmentId);
      res.json(submissions);
    } catch (error) {
      console.error("Error fetching assignment submissions:", error);
      res.status(500).json({ message: "Failed to fetch submissions" });
    }
  });

  // Get user writing sessions  
  app.get("/api/users/:userId/writing-sessions", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      console.log('Fetching sessions for user:', userId);
      const sessions = await storage.getUserWritingSessions(userId);
      console.log('Found sessions:', sessions.length);
      res.json(sessions);
    } catch (error) {
      console.error("Error fetching sessions:", error);
      res.status(500).json({ message: "Failed to fetch sessions" });
    }
  });

  // Get all users (for admin/debug)
  app.get("/api/users", async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users.map(u => ({ ...u, password: undefined }))); // Remove passwords
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  // Student API routes
  app.get("/api/student/writing-sessions", async (req, res) => {
    try {
      const studentId = currentDemoUserId; // Student user ID
      const sessions = await storage.getUserWritingSessions(studentId);
      res.json(sessions);
    } catch (error) {
      console.error("Error fetching student writing sessions:", error);
      res.status(500).json({ message: "Failed to fetch sessions" });
    }
  });

  app.get("/api/student/assignments", async (req, res) => {
    try {
      const studentId = currentDemoUserId;
      const studentClassrooms = await storage.getStudentClassrooms(studentId);
      const classroomIds = studentClassrooms.map(c => c.id);
      
      // Get all assignments for student's classrooms
      const allAssignments = await storage.getTeacherAssignments(1); // Teacher 1's assignments
      const studentAssignments = allAssignments.filter(a => 
        classroomIds.includes(a.classroomId || 0)
      );
      
      res.json(studentAssignments);
    } catch (error) {
      console.error("Error fetching student assignments:", error);
      res.status(500).json({ message: "Failed to fetch assignments" });
    }
  });

  app.get("/api/student/classes", async (req, res) => {
    try {
      const studentId = currentDemoUserId;
      const classes = await storage.getStudentClassrooms(studentId);
      res.json(classes);
    } catch (error) {
      console.error("Error fetching student classes:", error);
      res.status(500).json({ message: "Failed to fetch classes" });
    }
  });

  // Classroom management routes
  app.post("/api/classrooms", async (req, res) => {
    try {
      const classroomData = req.body;
      classroomData.teacherId = 1; // Demo teacher ID
      const classroom = await storage.createClassroom(classroomData);
      res.json(classroom);
    } catch (error) {
      console.error("Error creating classroom:", error);
      res.status(500).json({ message: "Failed to create classroom" });
    }
  });

  app.post("/api/classes/join", async (req, res) => {
    try {
      const { joinCode } = req.body;
      const studentId = currentDemoUserId;
      
      // Find classroom by join code
      const allClassrooms = await storage.getAllClassrooms();
      const classroom = allClassrooms.find(c => c.joinCode === joinCode);
      
      if (!classroom) {
        return res.status(404).json({ message: "Invalid join code" });
      }
      
      // Enroll student in classroom
      await storage.enrollStudentInClassroom(studentId, classroom.id);
      res.json({ message: "Successfully joined classroom", classroom });
    } catch (error) {
      console.error("Error joining classroom:", error);
      res.status(500).json({ message: "Failed to join classroom" });
    }
  });

  // Assignment creation route
  app.post("/api/assignments", async (req, res) => {
    try {
      const assignmentData = req.body;
      assignmentData.teacherId = 1; // Demo teacher ID
      
      console.log('Creating assignment:', assignmentData);
      const assignment = await storage.createAssignment(assignmentData);
      
      console.log('Assignment created successfully:', assignment.id);
      res.json(assignment);
    } catch (error) {
      console.error("Error creating assignment:", error);
      res.status(500).json({ message: "Failed to create assignment" });
    }
  });

  // Get individual assignment by ID
  app.get("/api/assignments/:id", async (req, res) => {
    try {
      const assignmentId = parseInt(req.params.id);
      console.log('Fetching assignment:', assignmentId);
      
      const assignment = await storage.getAssignment(assignmentId);
      
      if (!assignment) {
        console.log('Assignment not found:', assignmentId);
        return res.status(404).json({ message: "Assignment not found" });
      }
      
      console.log('Assignment found:', assignment.id);
      res.json(assignment);
    } catch (error) {
      console.error("Error fetching assignment:", error);
      res.status(500).json({ message: "Failed to fetch assignment" });
    }
  });

  // Inline comments routes
  app.get("/api/sessions/:sessionId/comments", async (req, res) => {
    try {
      const sessionId = parseInt(req.params.sessionId);
      const comments = await storage.getSessionInlineComments(sessionId);
      res.json(comments);
    } catch (error) {
      console.error("Error fetching inline comments:", error);
      res.status(500).json({ error: "Failed to fetch comments" });
    }
  });

  app.post("/api/sessions/:sessionId/comments", async (req, res) => {
    try {
      const sessionId = parseInt(req.params.sessionId);
      const commentData = {
        ...req.body,
        sessionId,
        teacherId: 1 // Default teacher ID for demo
      };
      const comment = await storage.createInlineComment(commentData);
      res.json(comment);
    } catch (error) {
      console.error("Error creating inline comment:", error);
      res.status(500).json({ error: "Failed to create comment" });
    }
  });

  app.delete("/api/sessions/:sessionId/comments/:commentId", async (req, res) => {
    try {
      const commentId = parseInt(req.params.commentId);
      await storage.deleteInlineComment(commentId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting inline comment:", error);
      res.status(500).json({ error: "Failed to delete comment" });
    }
  });

  // Submit grade and feedback for writing session
  app.post("/api/sessions/:sessionId/grade", async (req, res) => {
    try {
      const sessionId = parseInt(req.params.sessionId);
      const { grade, feedback } = req.body;

      const updatedSession = await storage.gradeWritingSession(sessionId, {
        grade,
        teacherFeedback: feedback,
        status: "graded",
      });

      if (!updatedSession) {
        return res.status(404).json({ message: "Writing session not found" });
      }

      res.json(updatedSession);
    } catch (error) {
      console.error("Error submitting grade:", error);
      res.status(500).json({ message: "Failed to submit grade" });
    }
  });

  // AI chat assistance endpoint with adaptive learning
  app.post("/api/ai/chat", async (req, res) => {
    try {
      const { sessionId, prompt, userId } = req.body;
      
      if (!prompt) {
        return res.status(400).json({ message: "Prompt is required" });
      }

      // Import AI functions
      const { checkRestrictedPrompt, generateAiResponse } = await import("./openai");
      
      // Check if the prompt is restricted
      const isRestricted = checkRestrictedPrompt(prompt);
      
      // Get student profile for personalized responses
      let studentProfile;
      if (userId) {
        try {
          studentProfile = await storage.getStudentProfile(userId);
          // Update learning progress with this interaction
          await storage.updateLearningProgress(userId, { prompt, sessionId });
        } catch (error) {
          console.error("Failed to load student profile:", error);
          // Continue without profile
        }
      }
      
      let response;
      if (isRestricted) {
        response = "❌ This type of assistance goes beyond what I can help with. Try asking for brainstorming ideas, writing feedback, or research guidance instead!";
      } else {
        // Generate personalized AI response using student profile
        response = await generateAiResponse(prompt, studentProfile);
      }

      // Store the AI interaction if we have a valid session
      if (sessionId && sessionId > 0) {
        console.log("Saving AI interaction for session:", sessionId);
        try {
          const interaction = await storage.createAiInteraction({
            sessionId,
            prompt,
            response,
            isRestricted,
          });
          console.log("AI interaction saved:", interaction.id);
        } catch (error) {
          console.error("Failed to save AI interaction:", error);
        }
      }

      res.json({
        response,
        isRestricted,
      });
    } catch (error) {
      console.error("AI help error:", error);
      res.status(500).json({ message: "Failed to generate AI response" });
    }
  });

  // Get AI interactions for a session (chat history)
  app.get("/api/session/:sessionId/interactions", async (req, res) => {
    try {
      const sessionId = parseInt(req.params.sessionId);
      console.log("Fetching interactions for session:", sessionId);
      
      const interactions = await storage.getSessionInteractions(sessionId);
      console.log("Found interactions:", interactions.length);
      
      res.json(interactions);
    } catch (error) {
      console.error("Error fetching session interactions:", error);
      res.status(500).json({ message: "Failed to fetch interactions" });
    }
  });

  // Student learning profile endpoints for adaptive AI
  app.get("/api/students/:userId/learning-profile", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const profile = await storage.getStudentProfile(userId);
      
      if (!profile) {
        // Create a default profile if none exists
        const newProfile = await storage.createStudentProfile({
          userId,
          writingLevel: "beginner",
          strengths: [],
          weaknesses: [],
          commonMistakes: [],
          improvementAreas: [],
          learningPreferences: {},
          totalWordsWritten: 0,
          totalSessions: 0,
        });
        return res.json(newProfile);
      }
      
      res.json(profile);
    } catch (error) {
      console.error("Error fetching learning profile:", error);
      res.status(500).json({ message: "Failed to fetch learning profile" });
    }
  });

  app.put("/api/students/:userId/learning-profile", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const updates = req.body;
      
      const updatedProfile = await storage.updateStudentProfile(userId, updates);
      if (!updatedProfile) {
        return res.status(404).json({ message: "Student profile not found" });
      }
      
      res.json(updatedProfile);
    } catch (error) {
      console.error("Error updating learning profile:", error);
      res.status(500).json({ message: "Failed to update learning profile" });
    }
  });

  // Get all student profiles for teacher overview
  app.get("/api/teacher/student-profiles", async (req, res) => {
    try {
      const students = await storage.getAllUsers();
      const studentProfiles = [];
      
      for (const student of students.filter(u => u.role === 'student')) {
        const profile = await storage.getStudentProfile(student.id);
        studentProfiles.push({
          student,
          profile: profile || {
            writingLevel: "beginner",
            strengths: [],
            weaknesses: [],
            totalSessions: 0,
            lastInteractionSummary: "No interactions yet"
          }
        });
      }
      
      res.json(studentProfiles);
    } catch (error) {
      console.error("Error fetching student profiles:", error);
      res.status(500).json({ message: "Failed to fetch student profiles" });
    }
  });

  // Analytics endpoints with demo data
  app.get("/api/users/:userId/streak", async (req, res) => {
    const userId = parseInt(req.params.userId);
    // Demo writing streak data
    const streakData = {
      currentStreak: 7,
      longestStreak: 15,
      totalDays: 42,
      streakHistory: [
        { date: "2025-05-24", hasWritten: true, wordCount: 234 },
        { date: "2025-05-25", hasWritten: true, wordCount: 456 },
        { date: "2025-05-26", hasWritten: true, wordCount: 123 },
        { date: "2025-05-27", hasWritten: false, wordCount: 0 },
        { date: "2025-05-28", hasWritten: true, wordCount: 567 },
        { date: "2025-05-29", hasWritten: true, wordCount: 234 },
        { date: "2025-05-30", hasWritten: true, wordCount: 345 }
      ]
    };
    res.json(streakData);
  });

  app.get("/api/users/:userId/goals", async (req, res) => {
    const userId = parseInt(req.params.userId);
    // Demo writing goals
    const goals = [
      {
        id: 1,
        type: "daily_words",
        target: 250,
        current: 178,
        title: "Daily Writing Goal",
        description: "Write at least 250 words every day",
        deadline: "2025-05-31",
        isActive: true
      },
      {
        id: 2,
        type: "weekly_sessions",
        target: 5,
        current: 3,
        title: "Weekly Writing Sessions",
        description: "Complete 5 writing sessions this week",
        deadline: "2025-06-01",
        isActive: true
      },
      {
        id: 3,
        type: "monthly_assignments",
        target: 4,
        current: 2,
        title: "Monthly Assignments",
        description: "Submit 4 assignments this month",
        deadline: "2025-06-30",
        isActive: true
      }
    ];
    res.json(goals);
  });

  app.get("/api/users/:userId/achievements", async (req, res) => {
    const userId = parseInt(req.params.userId);
    // Demo achievements
    const achievements = [
      {
        id: 1,
        name: "First Steps",
        description: "Complete your first writing assignment",
        icon: "🎯",
        unlockedAt: "2025-05-15",
        category: "milestone"
      },
      {
        id: 2,
        name: "Word Warrior",
        description: "Write over 1,000 words in a single session",
        icon: "⚔️",
        unlockedAt: "2025-05-22",
        category: "writing"
      },
      {
        id: 3,
        name: "Streak Master",
        description: "Maintain a 7-day writing streak",
        icon: "🔥",
        unlockedAt: "2025-05-30",
        category: "consistency"
      },
      {
        id: 4,
        name: "AI Collaborator",
        description: "Successfully use AI assistance for learning",
        icon: "🤖",
        unlockedAt: "2025-05-28",
        category: "learning"
      },
      {
        id: 5,
        name: "Perfect Grade",
        description: "Receive an A+ on an assignment",
        icon: "⭐",
        unlockedAt: null,
        category: "excellence"
      }
    ];
    res.json(achievements);
  });

  app.get("/api/analytics/:userId/sessions", async (req, res) => {
    const userId = parseInt(req.params.userId);
    // Demo session analytics
    const sessionAnalytics = {
      totalSessions: 23,
      averageSessionLength: 45, // minutes
      totalWordsWritten: 5847,
      sessionsThisWeek: 5,
      sessionsThisMonth: 18,
      weeklyProgress: [
        { week: "Week 1", sessions: 3, words: 756 },
        { week: "Week 2", sessions: 4, words: 1024 },
        { week: "Week 3", sessions: 5, words: 1456 },
        { week: "Week 4", sessions: 6, words: 1789 },
        { week: "Current", sessions: 5, words: 822 }
      ],
      timeDistribution: {
        morning: 35,
        afternoon: 45,
        evening: 20
      }
    };
    res.json(sessionAnalytics);
  });

  app.get("/api/analytics/:userId/writing-stats", async (req, res) => {
    const userId = parseInt(req.params.userId);
    // Demo writing statistics
    const writingStats = {
      averageWordsPerSession: 254,
      vocabularyGrowth: {
        uniqueWords: 1247,
        newWordsThisWeek: 23,
        complexityScore: 7.2
      },
      writingSpeed: {
        wordsPerMinute: 12,
        improvement: "+15%"
      },
      grammarProgress: {
        accuracy: 89,
        commonMistakes: ["comma splices", "subject-verb agreement"],
        improvement: "+12%"
      },
      aiUsageStats: {
        totalInteractions: 34,
        helpCategories: {
          brainstorming: 12,
          grammar: 8,
          research: 6,
          structure: 8
        },
        adaptiveLevel: "intermediate",
        learningProgress: "+25%"
      },
      monthlyTrends: [
        { month: "January", words: 1200, quality: 7.1 },
        { month: "February", words: 1456, quality: 7.4 },
        { month: "March", words: 1678, quality: 7.8 },
        { month: "April", words: 1834, quality: 8.1 },
        { month: "May", words: 1925, quality: 8.3 }
      ]
    };
    res.json(writingStats);
  });

  // Teacher analytics for class overview
  app.get("/api/analytics/teacher/:teacherId/class-overview", async (req, res) => {
    const teacherId = parseInt(req.params.teacherId);
    // Demo class analytics
    const classOverview = {
      totalStudents: 24,
      activeWriters: 18,
      averageClassGrade: "B+",
      assignmentCompletion: 78,
      aiUsageTrends: {
        studentsUsingAI: 16,
        averageInteractionsPerStudent: 12,
        mostCommonHelpType: "brainstorming"
      },
      classProgress: {
        wordsWrittenThisMonth: 45678,
        averageWordsPerStudent: 1903,
        improvementRate: "+18%"
      },
      strugglingStudents: [
        { name: "Alex Johnson", issue: "Low engagement", lastActive: "3 days ago" },
        { name: "Sarah Chen", issue: "Grammar patterns", improvement: "needed" }
      ],
      topPerformers: [
        { name: "Maria Rodriguez", achievement: "Consistent A grades", streak: 12 },
        { name: "David Kim", achievement: "Most improved", growth: "+45%" }
      ]
    };
    res.json(classOverview);
  });

  // Teacher goal management endpoints
  app.get("/api/teacher/:teacherId/goals", async (req, res) => {
    const teacherId = parseInt(req.params.teacherId);
    // Demo teacher goals
    const goals = [
      {
        id: 1,
        teacherId,
        classroomId: 1,
        type: "daily_words",
        title: "Daily Writing Practice",
        description: "Students should write at least 250 words every day to build consistency",
        target: 250,
        deadline: "2025-06-30",
        isActive: true,
        assignedStudents: 18,
        completionRate: 67,
        createdAt: "2025-05-20"
      },
      {
        id: 2,
        teacherId,
        classroomId: 1,
        type: "weekly_sessions",
        title: "Weekly Writing Sessions",
        description: "Complete at least 4 writing sessions per week",
        target: 4,
        deadline: "2025-06-07",
        isActive: true,
        assignedStudents: 18,
        completionRate: 83,
        createdAt: "2025-05-25"
      },
      {
        id: 3,
        teacherId,
        classroomId: 1,
        type: "grammar_accuracy",
        title: "Grammar Improvement",
        description: "Achieve 90% grammar accuracy in writing assignments",
        target: 90,
        deadline: "2025-07-15",
        isActive: true,
        assignedStudents: 18,
        completionRate: 45,
        createdAt: "2025-05-28"
      }
    ];
    res.json(goals);
  });

  app.post("/api/teacher/goals", async (req, res) => {
    try {
      const goalData = req.body;
      // In a real implementation, this would save to database
      const newGoal = {
        id: Date.now(), // Simple ID generation for demo
        ...goalData,
        assignedStudents: 18, // Demo count
        completionRate: 0,
        createdAt: new Date().toISOString()
      };
      res.json(newGoal);
    } catch (error) {
      console.error('Error creating goal:', error);
      res.status(500).json({ message: "Failed to create goal" });
    }
  });

  app.patch("/api/teacher/goals/:goalId", async (req, res) => {
    try {
      const goalId = parseInt(req.params.goalId);
      const updates = req.body;
      // In a real implementation, this would update the database
      const updatedGoal = {
        id: goalId,
        ...updates,
        updatedAt: new Date().toISOString()
      };
      res.json(updatedGoal);
    } catch (error) {
      console.error('Error updating goal:', error);
      res.status(500).json({ message: "Failed to update goal" });
    }
  });

  app.delete("/api/teacher/goals/:goalId", async (req, res) => {
    try {
      const goalId = parseInt(req.params.goalId);
      // In a real implementation, this would delete from database
      res.json({ message: "Goal deleted successfully" });
    } catch (error) {
      console.error('Error deleting goal:', error);
      res.status(500).json({ message: "Failed to delete goal" });
    }
  });

  // Get students in a classroom
  app.get("/api/teacher/classrooms/:classroomId/students", async (req, res) => {
    const classroomId = parseInt(req.params.classroomId);
    // Demo student list
    const students = [
      { id: 1, name: "Alice Johnson", email: "alice.j@school.edu", progress: 85 },
      { id: 2, name: "Bob Smith", email: "bob.s@school.edu", progress: 72 },
      { id: 3, name: "Maria Rodriguez", email: "maria.r@school.edu", progress: 94 },
      { id: 4, name: "David Kim", email: "david.k@school.edu", progress: 78 },
      { id: 5, name: "Sarah Chen", email: "sarah.c@school.edu", progress: 61 }
    ];
    res.json(students);
  });

  const httpServer = createServer(app);
  return httpServer;
}