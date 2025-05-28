import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertWritingSessionSchema, insertAiInteractionSchema, insertAssignmentSchema } from "@shared/schema";
import { z } from "zod";
import { checkRestrictedPrompt, generateAiResponse } from "./openai";

export async function registerRoutes(app: Express): Promise<Server> {

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

  // Teacher routes
  app.get("/api/teacher/assignments", async (req, res) => {
    try {
      // For demo, use teacher ID 1
      const teacherId = 1;
      const assignments = await storage.getTeacherAssignments(teacherId);
      res.json(assignments);
    } catch (error) {
      res.status(500).json({ message: "Failed to get assignments" });
    }
  });

  app.post("/api/assignments", async (req, res) => {
    try {
      const assignmentData = insertAssignmentSchema.parse(req.body);
      const assignment = await storage.createAssignment(assignmentData);
      res.json(assignment);
    } catch (error) {
      res.status(500).json({ message: "Failed to create assignment" });
    }
  });

  app.patch("/api/assignments/:id", async (req, res) => {
    try {
      const assignmentId = parseInt(req.params.id);
      const assignmentData = insertAssignmentSchema.parse(req.body);
      const assignment = await storage.updateAssignment(assignmentId, assignmentData);
      res.json(assignment);
    } catch (error) {
      res.status(500).json({ message: "Failed to update assignment" });
    }
  });

  app.post("/api/assignments/:id/complete", async (req, res) => {
    try {
      const assignmentId = parseInt(req.params.id);
      const assignment = await storage.markAssignmentComplete(assignmentId);
      if (!assignment) {
        return res.status(404).json({ message: "Assignment not found" });
      }
      res.json(assignment);
    } catch (error) {
      res.status(500).json({ message: "Failed to mark assignment as complete" });
    }
  });

  app.get("/api/assignments/overdue", async (req, res) => {
    try {
      const overdueAssignments = await storage.checkOverdueAssignments();
      res.json(overdueAssignments);
    } catch (error) {
      res.status(500).json({ message: "Failed to check overdue assignments" });
    }
  });

  app.get("/api/teacher/assignments/:id/submissions", async (req, res) => {
    try {
      const assignmentId = parseInt(req.params.id);
      const submissions = await storage.getAssignmentSubmissions(assignmentId);
      res.json(submissions);
    } catch (error) {
      res.status(500).json({ message: "Failed to get submissions" });
    }
  });
  
  // Get or create a default writing session
  app.get("/api/session", async (req, res) => {
    try {
      // For demo purposes, use a default user ID of 1
      const userId = 1;
      
      // Get existing sessions for user
      const sessions = await storage.getUserWritingSessions(userId);
      
      if (sessions.length > 0) {
        // Return the most recent session
        const session = sessions.sort((a, b) => 
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        )[0];
        res.json(session);
      } else {
        // Create a new session
        const newSession = await storage.createWritingSession({
          userId,
          title: "New Writing Session",
          content: "",
          wordCount: 0,
        });
        res.json(newSession);
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to get or create session" });
    }
  });

  // Update writing session content
  app.patch("/api/session/:id", async (req, res) => {
    try {
      const sessionId = parseInt(req.params.id);
      const updateData = req.body;
      
      // Calculate word count if content is provided
      if (updateData.content) {
        const words = updateData.content.trim().split(/\s+/).filter((word: string) => word.length > 0);
        updateData.wordCount = words.length;
      }
      
      const updatedSession = await storage.updateWritingSession(sessionId, updateData);
      
      if (!updatedSession) {
        return res.status(404).json({ message: "Session not found" });
      }
      
      res.json(updatedSession);
    } catch (error) {
      res.status(500).json({ message: "Failed to update session" });
    }
  });

  // AI assistance endpoint
  app.post("/api/ai-help", async (req, res) => {
    try {
      const { sessionId, prompt } = req.body;
      
      if (!sessionId || !prompt) {
        return res.status(400).json({ message: "Session ID and prompt are required" });
      }

      // Check if prompt is restricted
      const isRestricted = checkRestrictedPrompt(prompt);
      
      let response: string;
      
      if (isRestricted) {
        response = "❌ Sorry! This type of AI help isn't allowed. Try asking for brainstorming, outlining, or feedback instead. I'm here to help you learn and improve your own writing skills, not to do the work for you.";
      } else {
        // Generate helpful AI response using OpenAI
        response = await generateAiResponse(prompt);
      }

      // Store the interaction
      const interaction = await storage.createAiInteraction({
        sessionId: parseInt(sessionId),
        prompt,
        response,
        isRestricted,
      });

      res.json({
        response,
        isRestricted,
        interaction,
      });
    } catch (error) {
      console.error("AI help error:", error);
      res.status(500).json({ message: "Failed to generate AI response" });
    }
  });

  // Get AI interaction history for a session
  app.get("/api/session/:id/interactions", async (req, res) => {
    try {
      const sessionId = parseInt(req.params.id);
      const interactions = await storage.getSessionInteractions(sessionId);
      res.json(interactions);
    } catch (error) {
      res.status(500).json({ message: "Failed to get interactions" });
    }
  });

  // Get assignment submissions (for teachers)
  app.get("/api/assignments/:id/submissions", async (req, res) => {
    try {
      const assignmentId = parseInt(req.params.id);
      const submissions = await storage.getAssignmentSubmissions(assignmentId);
      res.json(submissions);
    } catch (error) {
      console.error("Error fetching submissions:", error);
      res.status(500).json({ message: "Failed to fetch submissions" });
    }
  });

  // Submit grade and feedback for a writing session
  app.post("/api/sessions/:id/grade", async (req, res) => {
    try {
      const sessionId = parseInt(req.params.id);
      const { grade, feedback } = req.body;
      
      if (!grade || !feedback) {
        return res.status(400).json({ message: "Grade and feedback are required" });
      }

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

  // Messaging Routes
  app.post("/api/messages", async (req, res) => {
    try {
      const messageData = insertMessageSchema.parse(req.body);
      const message = await storage.createMessage(messageData);
      res.json(message);
    } catch (error) {
      console.error("Error creating message:", error);
      res.status(400).json({ error: "Failed to send message" });
    }
  });

  app.get("/api/messages/inbox/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const messages = await storage.getUserInboxMessages(userId);
      res.json(messages);
    } catch (error) {
      console.error("Error fetching inbox:", error);
      res.status(500).json({ error: "Failed to fetch messages" });
    }
  });

  app.get("/api/messages/sent/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const messages = await storage.getUserSentMessages(userId);
      res.json(messages);
    } catch (error) {
      console.error("Error fetching sent messages:", error);
      res.status(500).json({ error: "Failed to fetch sent messages" });
    }
  });

  app.patch("/api/messages/:messageId/read", async (req, res) => {
    try {
      const messageId = parseInt(req.params.messageId);
      await storage.markMessageAsRead(messageId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error marking message as read:", error);
      res.status(500).json({ error: "Failed to mark message as read" });
    }
  });

  app.get("/api/users/recipients/:userRole", async (req, res) => {
    try {
      const userRole = req.params.userRole;
      const recipients = await storage.getAvailableRecipients(userRole);
      res.json(recipients);
    } catch (error) {
      console.error("Error fetching recipients:", error);
      res.status(500).json({ error: "Failed to fetch recipients" });
    }
  });

  // Create classroom
  app.post("/api/classrooms", async (req, res) => {
    try {
      const classroomData = req.body;
      // Generate a simple join code for now
      const joinCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      const classroom = { ...classroomData, joinCode, id: Date.now() };
      res.json(classroom);
    } catch (error) {
      console.error("Error creating classroom:", error);
      res.status(500).json({ message: "Failed to create classroom" });
    }
  });

  // Update classroom
  app.patch("/api/classrooms/:id", async (req, res) => {
    try {
      const classroomId = parseInt(req.params.id);
      const updates = req.body;
      const classroom = { ...updates, id: classroomId };
      res.json(classroom);
    } catch (error) {
      res.status(500).json({ message: "Failed to update classroom" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
