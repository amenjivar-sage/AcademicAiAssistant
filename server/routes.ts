import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertWritingSessionSchema, insertAiInteractionSchema, insertAssignmentSchema, insertMessageSchema } from "@shared/schema";
import { z } from "zod";
import { checkRestrictedPrompt, generateAiResponse } from "./openai";

export async function registerRoutes(app: Express): Promise<Server> {

  // Demo user ID for memory storage
  const currentDemoUserId = 2; // Student user ID

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
      // Debug: Check all available sessions
      const allSessions = await storage.getUserWritingSessions(2); // Get all sessions for user 2
      console.log('Available sessions:', allSessions.map(s => s.id));
      
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

  const httpServer = createServer(app);
  return httpServer;
}