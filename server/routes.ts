import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertWritingSessionSchema, insertAiInteractionSchema, insertAssignmentSchema, insertMessageSchema } from "@shared/schema";
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

  // Student routes
  app.get("/api/student/classes", async (req, res) => {
    try {
      // Return only classes that the student has actually enrolled in
      const studentId = 1; // In real app, get from auth session
      const classrooms = await storage.getStudentClassrooms(studentId);
      res.json(classrooms);
    } catch (error) {
      console.error("Error fetching student classes:", error);
      res.status(500).json({ message: "Failed to fetch classes" });
    }
  });

  app.get("/api/student/assignments", async (req, res) => {
    try {
      const userId = 1; // Current student user
      const teacherId = 1; // For demo, get teacher's assignments
      
      // Get all assignments
      const assignments = await storage.getTeacherAssignments(teacherId);
      
      // Get user's writing sessions to determine status
      const sessions = await storage.getUserWritingSessions(userId);
      
      // Add status to each assignment based on writing sessions
      const assignmentsWithStatus = assignments.map(assignment => {
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
      res.status(500).json({ message: "Failed to get assignments" });
    }
  });

  // Get specific assignment by ID
  app.get("/api/assignments/:id", async (req, res) => {
    try {
      const assignmentId = parseInt(req.params.id);
      const assignment = await storage.getAssignment(assignmentId);
      if (!assignment) {
        return res.status(404).json({ message: "Assignment not found" });
      }
      res.json(assignment);
    } catch (error) {
      res.status(500).json({ message: "Failed to get assignment" });
    }
  });

  // Get writing session for specific assignment
  app.get("/api/writing-sessions/:assignmentId", async (req, res) => {
    try {
      const assignmentId = parseInt(req.params.assignmentId);
      const userId = 1; // Default student user for demo
      
      // Find session for this user and assignment
      const sessions = await storage.getUserWritingSessions(userId);
      const session = sessions.find(s => s.assignmentId === assignmentId);
      
      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }
      
      res.json(session);
    } catch (error) {
      res.status(500).json({ message: "Failed to get session" });
    }
  });

  // Create writing session
  app.post("/api/writing-sessions", async (req, res) => {
    try {
      const sessionData = insertWritingSessionSchema.parse(req.body);
      const session = await storage.createWritingSession(sessionData);
      res.json(session);
    } catch (error) {
      res.status(500).json({ message: "Failed to create writing session" });
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
  
  // Get student's writing sessions
  app.get("/api/student/writing-sessions", async (req, res) => {
    try {
      const userId = 1; // Default student user for demo
      const sessions = await storage.getUserWritingSessions(userId);
      console.log('Student sessions for user', userId, ':', sessions.map(s => ({ id: s.id, assignmentId: s.assignmentId, hasContent: !!(s.content && s.content.trim()) })));
      res.json(sessions);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch sessions" });
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

  // Get or create writing session for specific assignment
  app.get("/api/writing-sessions/:sessionId", async (req, res) => {
    try {
      const sessionId = parseInt(req.params.sessionId);
      const { assignmentId } = req.query;
      console.log('GET session request - sessionId:', sessionId, 'assignmentId:', assignmentId);
      console.log('All sessions in memory:', Array.from((storage as any).writingSessions.keys()));
      
      // If sessionId is 0, check if session exists for this assignment, or create new one
      if (sessionId === 0 && assignmentId) {
        console.log('Triggering session creation logic for assignment:', assignmentId);
        const userId = 1; // Default student user for demo
        const existingSessions = await storage.getUserWritingSessions(userId);
        const existingSession = existingSessions.find(s => s.assignmentId === parseInt(assignmentId as string));
        
        if (existingSession) {
          console.log('Found existing session:', existingSession.id, 'for assignment:', assignmentId);
          res.json(existingSession);
        } else {
          console.log('Creating new session for assignment:', assignmentId);
          const newSession = await storage.createWritingSession({
            userId,
            assignmentId: parseInt(assignmentId as string),
            title: "",
            content: "",
            wordCount: 0,
            status: "draft"
          });
          console.log('Created new session:', newSession.id);
          res.json(newSession);
        }
      } else {
        console.log('Fetching session with ID:', sessionId, 'Type:', typeof sessionId);
        console.log('Storage type:', storage.constructor.name);
        const session = await storage.getWritingSession(sessionId);
        console.log('Found session:', session ? `YES - ID: ${session.id}` : 'NO');
        if (!session) {
          return res.status(404).json({ message: "Session not found" });
        }
        res.json(session);
      }
    } catch (error) {
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

  // Unsubmit writing session - TEST ROUTE
  app.patch("/api/writing-sessions/:sessionId/unsubmit", async (req, res) => {
    console.log("=== UNSUBMIT ROUTE HIT ===");
    console.log("Session ID:", req.params.sessionId);
    
    try {
      const sessionId = parseInt(req.params.sessionId);
      console.log("Parsed session ID:", sessionId);
      
      // Get current session first
      const currentSession = await storage.getWritingSession(sessionId);
      console.log("Current session before update:", currentSession);
      
      if (!currentSession) {
        console.log("Session not found:", sessionId);
        return res.status(404).json({ message: "Session not found" });
      }
      
      // Update the session
      const updatedSession = await storage.updateWritingSession(sessionId, {
        status: "draft",
      });
      
      console.log("Updated session after storage call:", updatedSession);
      
      // Force set the response headers to ensure JSON
      res.setHeader('Content-Type', 'application/json');
      res.status(200).json(updatedSession);
    } catch (error) {
      console.error("Error unsubmitting session:", error);
      res.status(500).json({ message: "Failed to unsubmit session", error: error.message });
    }
  });

  // Get session interactions (chat history)
  app.get("/api/session/:sessionId/interactions", async (req, res) => {
    try {
      const sessionId = parseInt(req.params.sessionId);
      const interactions = await storage.getSessionInteractions(sessionId);
      res.json(interactions);
    } catch (error) {
      console.error("Error fetching interactions:", error);
      res.status(500).json({ message: "Failed to fetch chat history" });
    }
  });

  // AI assistance endpoint
  app.post("/api/ai/chat", async (req, res) => {
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

  // Get teacher's classrooms (using same pattern as assignments)
  app.get("/api/teacher/classrooms", async (req, res) => {
    try {
      // For demo, use teacher ID 1 (same as assignments)
      const teacherId = 1;
      console.log("Fetching classrooms for teacher:", teacherId);
      const teacherClassrooms = await storage.getTeacherClassrooms(teacherId);
      console.log("Found classrooms:", teacherClassrooms);
      res.json(teacherClassrooms);
    } catch (error) {
      console.error("Error fetching classrooms:", error);
      res.status(500).json({ message: "Failed to get classrooms" });
    }
  });

  // Class enrollment route
  app.post("/api/classes/join", async (req, res) => {
    try {
      const { joinCode, studentId } = req.body;
      
      if (!joinCode || !studentId) {
        return res.status(400).json({ message: "Join code and student ID are required" });
      }
      
      // Find classroom by join code across all teachers
      const allClassrooms = await storage.getAllClassrooms();
      const classroom = allClassrooms.find(c => c.joinCode === joinCode.toUpperCase());
      
      if (!classroom) {
        return res.status(404).json({ message: "Class not found with this join code" });
      }
      
      // Enroll the student in the classroom
      await storage.enrollStudentInClassroom(studentId, classroom.id);
      
      // Return the classroom data
      res.json(classroom);
    } catch (error) {
      console.error("Error joining class:", error);
      res.status(500).json({ message: "Failed to join class" });
    }
  });

  // Create classroom
  app.post("/api/classrooms", async (req, res) => {
    try {
      const classroomData = req.body;
      const classroom = await storage.createClassroom(classroomData);
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

  // Citation generation endpoint
  app.post("/api/citations/generate", async (req, res) => {
    try {
      const { type, title, author, publicationDate, publisher, url, accessDate, journal, volume, issue, pages, format } = req.body;
      
      let citation = "";
      
      if (format === "MLA") {
        // Generate MLA style citations based on source type
        switch (type) {
          case "book":
            citation = `${author}. *${title}*. ${publisher || "Publisher"}, ${publicationDate}.`;
            break;
          case "journal":
            citation = `${author}. "${title}." *${journal}*, vol. ${volume || "1"}${issue ? `, no. ${issue}` : ""}, ${publicationDate}, pp. ${pages || "1-10"}.`;
            break;
          case "website":
            citation = `${author}. "${title}." *Website Name*, ${publicationDate}, ${url || "URL"}. Accessed ${accessDate || "Date"}.`;
            break;
          case "newspaper":
            citation = `${author}. "${title}." *${publisher || "Newspaper Name"}*, ${publicationDate}.`;
            break;
          default:
            citation = `${author}. *${title}*. ${publicationDate}.`;
        }
      } else {
        // Generate APA style citations based on source type
        switch (type) {
          case "book":
            citation = `${author} (${publicationDate}). *${title}*. ${publisher || "Publisher"}.`;
            break;
          case "journal":
            citation = `${author} (${publicationDate}). ${title}. *${journal}*, ${volume}${issue ? `(${issue})` : ""}, ${pages || "pp. 1-10"}.`;
            break;
          case "website":
            citation = `${author} (${publicationDate}). ${title}. Retrieved ${accessDate || "Date"}, from ${url || "URL"}`;
            break;
          case "newspaper":
            citation = `${author} (${publicationDate}). ${title}. *${publisher || "Newspaper Name"}*.`;
            break;
          default:
            citation = `${author} (${publicationDate}). *${title}*.`;
        }
      }
      
      res.json({ citation });
    } catch (error) {
      console.error("Error generating citation:", error);
      res.status(500).json({ message: "Failed to generate citation" });
    }
  });



  const httpServer = createServer(app);
  return httpServer;
}
