import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertWritingSessionSchema, insertAiInteractionSchema, insertAssignmentSchema, insertMessageSchema } from "@shared/schema";
import { z } from "zod";
import { checkRestrictedPrompt, generateAiResponse } from "./openai";

export async function registerRoutes(app: Express): Promise<Server> {

  // Debug middleware to log all requests
  app.use((req, res, next) => {
    if (req.url.includes('/api/writing-sessions/')) {
      console.log('=== REQUEST DEBUG ===');
      console.log('Method:', req.method);
      console.log('URL:', req.url);
      console.log('Params:', req.params);
      console.log('Route matched so far...');
    }
    next();
  });

  // Check email endpoint for registration
  app.post("/api/auth/check-email", async (req, res) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }

      // Check if email is already registered
      const existingUser = await storage.getUserByEmail(email);
      
      if (existingUser) {
        return res.status(400).json({ 
          valid: false, 
          message: "Email is already registered" 
        });
      }

      // For demo purposes, accept any valid email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ 
          valid: false, 
          message: "Invalid email format" 
        });
      }

      res.json({ valid: true, message: "Email is available" });
    } catch (error) {
      console.error("Error checking email:", error);
      res.status(500).json({ message: "Failed to check email" });
    }
  });

  // Registration endpoint
  app.post("/api/auth/register", async (req, res) => {
    try {
      const { email, firstName, lastName, role, grade, department, password } = req.body;
      
      // Validate required fields
      if (!email || !firstName || !lastName || !role || !password) {
        return res.status(400).json({ message: "All required fields must be provided" });
      }

      // Check if email is already registered
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "Email is already registered" });
      }

      // Generate username using the username generator
      const { generateUsernameFromEmail } = await import('./username-generator');
      const username = await generateUsernameFromEmail(email, storage);

      // Create new user
      const newUser = await storage.createUser({
        username,
        password,
        email,
        firstName,
        lastName,
        role,
        grade: grade || null,
        department: department || null
      });

      res.json({ 
        success: true, 
        message: "Account created successfully",
        username: newUser.username
      });
    } catch (error) {
      console.error("Error registering user:", error);
      res.status(500).json({ message: "Failed to create account" });
    }
  });

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

      // Update user's timestamp to mark as current session
      await storage.updateUserStatus(user.id, true);
      
      // Remove password from response
      const { password: _, ...userWithoutPassword } = user;
      
      res.json({
        user: userWithoutPassword,
        message: "Login successful"
      });
    } catch (error) {
      res.status(500).json({ message: "Login failed" });
    }
  });

  // Simple session store using database
  const getCurrentUser = async (): Promise<any> => {
    try {
      // For demo purposes, we'll store the current user ID in a simple way
      // In a real app, this would use proper session management
      const allUsers = await storage.getAllUsers();
      // Find the most recently updated user as a simple session approach
      const sortedUsers = allUsers.sort((a, b) => 
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
      return sortedUsers[0] || null;
    } catch (error) {
      console.error("Error getting current user:", error);
      return null;
    }
  };

  // Get current authenticated user endpoint  
  app.get("/api/auth/user", async (req, res) => {
    try {
      const currentUser = await getCurrentUser();
      console.log("Auth check - current user:", currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : "null");
      
      if (!currentUser) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      // Remove password from response
      const { password: _, ...userWithoutPassword } = currentUser;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Error fetching current user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Demo login endpoint
  app.post("/api/auth/demo-login", async (req, res) => {
    try {
      const { role, demoPassword } = req.body;
      
      // Check demo password
      if (demoPassword !== "demo2024") {
        return res.status(401).json({ message: "Invalid demo password" });
      }

      // Get demo users by role - use specific demo accounts
      const allUsers = await storage.getAllUsers();
      let demoUser;
      
      if (role === 'teacher') {
        // Always use Sarah Johnson (prof.johnson) as the demo teacher
        demoUser = allUsers.find(user => user.username === 'prof.johnson');
      } else if (role === 'student') {
        // Always use Alex Chen (alex.chen) as the demo student
        demoUser = allUsers.find(user => user.username === 'alex.chen');
      } else if (role === 'admin') {
        // Always use Dr. Patricia Williams (admin) as the demo admin
        demoUser = allUsers.find(user => user.username === 'admin');
      }
      
      if (!demoUser) {
        return res.status(404).json({ message: "Demo user not found for this role" });
      }

      // Update user's timestamp to mark as current session
      await storage.updateUserStatus(demoUser.id, true);
      
      // Remove password from response
      const { password: _, ...userWithoutPassword } = demoUser;
      
      console.log(`Demo login successful for ${role}: ${demoUser.firstName} ${demoUser.lastName}`);
      
      res.json({
        user: userWithoutPassword,
        message: "Demo login successful"
      });
    } catch (error) {
      console.error("Demo login error:", error);
      res.status(500).json({ message: "Demo login failed" });
    }
  });

  // Update writing session content with proper auto-save
  app.patch("/api/writing-sessions/:id", async (req, res) => {
    try {
      const sessionId = parseInt(req.params.id);
      const updateData = req.body;
      
      console.log('Auto-saving session:', sessionId, 'with data:', Object.keys(updateData));
      
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
      
      console.log('Session auto-saved successfully:', updatedSession.id, 'Status:', updatedSession.status);
      res.json(updatedSession);
    } catch (error) {
      console.error('Error auto-saving session:', error);
      res.status(500).json({ message: "Failed to auto-save session" });
    }
  });

  // Get specific writing session
  app.get("/api/writing-sessions/:id", async (req, res) => {
    try {
      const sessionId = parseInt(req.params.id);
      
      console.log('Fetching session:', sessionId);
      const session = await storage.getWritingSession(sessionId);
      
      if (session) {
        console.log('Session retrieved:', session.id, 'Status:', session.status, 'Grade:', session.grade);
        return res.json(session);
      }
      
      return res.status(404).json({ message: "Session not found" });
    } catch (error) {
      console.error('Error fetching session:', error);
      res.status(500).json({ message: "Failed to get writing session" });
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

  // Submit grade and feedback for writing session - FIXED VERSION
  app.post("/api/sessions/:sessionId/grade", async (req, res) => {
    try {
      const sessionId = parseInt(req.params.sessionId);
      const { grade, feedback } = req.body;

      console.log(`Grading session ${sessionId} with grade: ${grade}`);
      
      const updatedSession = await storage.gradeWritingSession(sessionId, {
        grade,
        teacherFeedback: feedback,
        status: "graded", // This ensures status is updated
      });

      if (!updatedSession) {
        return res.status(404).json({ message: "Writing session not found" });
      }

      console.log(`Successfully graded session ${sessionId}. Status: ${updatedSession.status}, Grade: ${updatedSession.grade}`);
      res.json(updatedSession);
    } catch (error) {
      console.error("Error submitting grade:", error);
      res.status(500).json({ message: "Failed to submit grade" });
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

  // Get teacher assignments (alternative endpoint used by frontend)
  app.get("/api/teacher/assignments", async (req, res) => {
    try {
      const currentUser = await getCurrentUser();
      if (!currentUser || currentUser.role !== 'teacher') {
        return res.status(401).json({ message: "Teacher authentication required" });
      }
      
      const assignments = await storage.getTeacherAssignments(currentUser.id);
      res.json(assignments);
    } catch (error) {
      console.error("Error fetching teacher assignments:", error);
      res.status(500).json({ message: "Failed to fetch teacher assignments" });
    }
  });

  // Get teacher classrooms (endpoint used by frontend)
  app.get("/api/teacher/classrooms", async (req, res) => {
    try {
      const currentUser = await getCurrentUser();
      if (!currentUser || currentUser.role !== 'teacher') {
        return res.status(401).json({ message: "Teacher authentication required" });
      }
      
      const classrooms = await storage.getTeacherClassrooms(currentUser.id);
      res.json(classrooms);
    } catch (error) {
      console.error("Error fetching teacher classrooms:", error);
      res.status(500).json({ message: "Failed to fetch teacher classrooms" });
    }
  });

  // Get student's classes
  app.get("/api/student/classes", async (req, res) => {
    try {
      const currentUser = await getCurrentUser();
      if (!currentUser || currentUser.role !== 'student') {
        return res.status(401).json({ message: "Student authentication required" });
      }
      
      const classes = await storage.getStudentClassrooms(currentUser.id);
      res.json(classes);
    } catch (error) {
      console.error("Error fetching student classes:", error);
      res.status(500).json({ message: "Failed to fetch classes" });
    }
  });

  // Get student's assignments
  app.get("/api/student/assignments", async (req, res) => {
    try {
      const currentUser = await getCurrentUser();
      if (!currentUser || currentUser.role !== 'student') {
        return res.status(401).json({ message: "Student authentication required" });
      }
      
      // Get student's enrolled classes
      const studentClasses = await storage.getStudentClassrooms(currentUser.id);
      
      // Get all assignments for classes the student is enrolled in
      let allAssignments: any[] = [];
      for (const classroom of studentClasses) {
        // For now, we'll get assignments from all teachers
        // In a real app, this would be filtered by classroom
        const assignments = await storage.getTeacherAssignments(classroom.teacherId || 1);
        allAssignments = allAssignments.concat(assignments.filter(a => a.classroomId === classroom.id));
      }
      
      // Get user's writing sessions to determine status
      const sessions = await storage.getUserWritingSessions(currentUser.id);
      
      // Add status to each assignment based on writing sessions
      const assignmentsWithStatus = allAssignments.map(assignment => {
        const session = sessions.find(s => s.assignmentId === assignment.id);
        
        let status = 'not_started';
        if (session) {
          if (session.status === 'submitted') {
            status = 'submitted';
          } else if (session.content && session.content.trim().length > 0) {
            status = 'in_progress';
          }
        }
        
        return {
          ...assignment,
          status,
          sessionId: session?.id || null
        };
      });
      
      res.json(assignmentsWithStatus);
    } catch (error) {
      console.error("Error fetching student assignments:", error);
      res.status(500).json({ message: "Failed to fetch assignments" });
    }
  });

  // Get student's writing sessions
  app.get("/api/student/writing-sessions", async (req, res) => {
    try {
      const currentUser = await getCurrentUser();
      if (!currentUser || currentUser.role !== 'student') {
        return res.status(401).json({ message: "Student authentication required" });
      }
      
      const sessions = await storage.getUserWritingSessions(currentUser.id);
      console.log('Student sessions for user', currentUser.id, ':', sessions.map(s => ({ id: s.id, assignmentId: s.assignmentId, hasContent: !!(s.content && s.content.trim()) })));
      res.json(sessions);
    } catch (error) {
      console.error("Error fetching student writing sessions:", error);
      res.status(500).json({ message: "Failed to fetch sessions" });
    }
  });

  // Get assignment submissions with student data
  app.get("/api/assignments/:assignmentId/submissions", async (req, res) => {
    try {
      const assignmentId = parseInt(req.params.assignmentId);
      console.log('Fetching submissions for assignment:', assignmentId);
      
      const submissions = await storage.getAssignmentSubmissions(assignmentId);
      console.log('Found submissions:', submissions.length);
      
      res.json(submissions);
    } catch (error) {
      console.error("Error fetching submissions:", error);
      res.status(500).json({ message: "Failed to fetch submissions" });
    }
  });

  // Get user writing sessions (for student dashboard)
  app.get("/api/users/:userId/writing-sessions", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const sessions = await storage.getUserWritingSessions(userId);
      
      // Filter and format sessions to show grade status clearly
      const formattedSessions = sessions.map(session => ({
        ...session,
        hasGrade: !!session.grade,
        hasFeedback: !!session.teacherFeedback
      }));
      
      console.log(`Found ${formattedSessions.length} sessions for user ${userId}`);
      res.json(formattedSessions);
    } catch (error) {
      console.error("Error fetching user sessions:", error);
      res.status(500).json({ message: "Failed to fetch sessions" });
    }
  });

  // Admin endpoints
  app.get("/api/admin/users", async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      // Filter out archived users (only show active users)
      const activeUsers = users.filter(user => user.isActive);
      res.json(activeUsers);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.get("/api/admin/archived-users", async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      // Filter to show only archived users
      const archivedUsers = users.filter(user => !user.isActive);
      res.json(archivedUsers);
    } catch (error) {
      console.error("Error fetching archived users:", error);
      res.status(500).json({ message: "Failed to fetch archived users" });
    }
  });

  app.get("/api/admin/user-stats", async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      const stats = {
        totalUsers: users.length,
        activeUsers: users.filter(u => u.isActive).length,
        teachers: users.filter(u => u.role === 'teacher').length,
        students: users.filter(u => u.role === 'student').length,
        admins: users.filter(u => u.role === 'admin').length
      };
      res.json(stats);
    } catch (error) {
      console.error("Error fetching user stats:", error);
      res.status(500).json({ message: "Failed to fetch user stats" });
    }
  });

  app.get("/api/admin/analytics", async (req, res) => {
    try {
      // Get basic analytics data
      const users = await storage.getAllUsers();
      const assignments = await storage.checkOverdueAssignments(); // Reuse this for total count
      
      const analytics = {
        totalUsers: users.length,
        activeUsers: users.filter(u => u.isActive).length,
        totalAssignments: assignments.length || 0,
        completedAssignments: 0, // Placeholder for now
        averageGrade: "B+", // Placeholder
        engagementRate: "85%", // Placeholder
        weeklyGrowth: 12, // Placeholder
        monthlyGrowth: 8 // Placeholder
      };
      
      res.json(analytics);
    } catch (error) {
      console.error("Error fetching analytics:", error);
      res.status(500).json({ message: "Failed to fetch analytics" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}