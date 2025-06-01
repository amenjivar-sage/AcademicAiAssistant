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
      res.status(500).json({ message: "Login failed" });
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

  const httpServer = createServer(app);
  return httpServer;
}