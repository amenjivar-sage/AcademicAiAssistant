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

      // Remove password from response
      const { password: _, ...userWithoutPassword } = user;
      
      // Set current logged-in user
      currentLoggedInUser = user;
      
      res.json({
        user: userWithoutPassword,
        message: "Login successful"
      });
    } catch (error) {
      res.status(500).json({ message: "Login failed" });
    }
  });

  // Track current logged-in user (simple approach for demo)
  let currentLoggedInUser: any = null;

  // Get current authenticated user endpoint  
  app.get("/api/auth/user", async (req, res) => {
    try {
      if (!currentLoggedInUser) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      // Remove password from response
      const { password: _, ...userWithoutPassword } = currentLoggedInUser;
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

      // Get demo users by role
      const allUsers = await storage.getAllUsers();
      const demoUser = allUsers.find(user => user.role === role);
      
      if (!demoUser) {
        return res.status(404).json({ message: "Demo user not found for this role" });
      }

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
      // Use teacher ID 1 for demo (Sarah Johnson)
      const teacherId = 1;
      const assignments = await storage.getTeacherAssignments(teacherId);
      res.json(assignments);
    } catch (error) {
      console.error("Error fetching teacher assignments:", error);
      res.status(500).json({ message: "Failed to fetch teacher assignments" });
    }
  });

  // Get teacher classrooms (endpoint used by frontend)
  app.get("/api/teacher/classrooms", async (req, res) => {
    try {
      // Use teacher ID 1 for demo (Sarah Johnson)
      const teacherId = 1;
      const classrooms = await storage.getTeacherClassrooms(teacherId);
      res.json(classrooms);
    } catch (error) {
      console.error("Error fetching teacher classrooms:", error);
      res.status(500).json({ message: "Failed to fetch teacher classrooms" });
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