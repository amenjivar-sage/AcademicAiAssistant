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

      // Update session to current user
      currentSessionUserId = user.id;
      
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

  // Simple session store - in production this would use proper session management
  let currentSessionUserId: number | null = null;

  const getCurrentUser = async (): Promise<any> => {
    try {
      if (!currentSessionUserId) {
        // Default to teacher for demo - user can switch via login
        currentSessionUserId = 12; // Jason Menjivar (teacher)
      }
      
      const user = await storage.getUser(currentSessionUserId);
      return user;
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

  // Logout endpoint
  app.post("/api/auth/logout", async (req, res) => {
    try {
      // Clear session data
      currentSessionUserId = null;
      res.json({ message: "Logged out successfully" });
    } catch (error) {
      console.error("Error during logout:", error);
      res.status(500).json({ message: "Logout failed" });
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
      const currentUser = await getCurrentUser();
      if (!currentUser) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const sessionId = parseInt(req.params.id);
      
      // First verify the session exists and belongs to the current user
      const existingSession = await storage.getWritingSession(sessionId);
      if (!existingSession) {
        return res.status(404).json({ message: "Session not found" });
      }
      
      if (existingSession.userId !== currentUser.id) {
        return res.status(403).json({ message: "Access denied: You can only update your own sessions" });
      }
      
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
      const currentUser = await getCurrentUser();
      if (!currentUser) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const sessionData = {
        ...req.body,
        userId: currentUser.id // Always use the authenticated user's ID
      };
      
      console.log('Creating session with data:', sessionData);
      
      // Calculate word count if content is provided
      if (sessionData.content) {
        const words = sessionData.content.trim().split(/\s+/).filter((word: string) => word.length > 0);
        sessionData.wordCount = words.length;
      }
      
      const newSession = await storage.createWritingSession(sessionData);
      console.log('Session created in database:', newSession.id);
      
      // Verify the session was created
      const verificationSession = await storage.getWritingSession(newSession.id);
      if (!verificationSession) {
        console.error('Session creation verification failed for session:', newSession.id);
        return res.status(500).json({ message: "Failed to verify session creation" });
      }
      
      console.log('Session creation verified successfully:', verificationSession.id);
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

  // Get specific assignment by ID (must come before /assignments/teacher to avoid route conflicts)
  app.get("/api/assignments/:id", async (req, res) => {
    try {
      const assignmentId = parseInt(req.params.id);
      const assignment = await storage.getAssignment(assignmentId);
      if (!assignment) {
        return res.status(404).json({ message: "Assignment not found" });
      }
      res.json(assignment);
    } catch (error) {
      console.error("Error fetching assignment:", error);
      res.status(500).json({ message: "Failed to get assignment" });
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
      
      console.log(`Fetching assignments for teacher ID: ${currentUser.id}`);
      const assignments = await storage.getTeacherAssignments(currentUser.id);
      console.log(`Found ${assignments.length} assignments:`, assignments.map(a => ({ id: a.id, title: a.title, teacherId: a.teacherId })));
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
      const seenAssignmentIds = new Set();
      
      for (const classroom of studentClasses) {
        console.log(`Getting assignments for classroom ${classroom.id} (teacher ${classroom.teacherId})`);
        const assignments = await storage.getTeacherAssignments(classroom.teacherId || 1);
        console.log(`Teacher ${classroom.teacherId} has ${assignments.length} total assignments`);
        
        // Include both classroom-specific assignments AND general assignments from this teacher
        const relevantAssignments = assignments.filter(a => 
          a.classroomId === classroom.id || a.classroomId === null
        );
        console.log(`Filtered to ${relevantAssignments.length} relevant assignments for student`);
        
        // Avoid duplicates when students are in multiple classes from same teacher
        for (const assignment of relevantAssignments) {
          if (!seenAssignmentIds.has(assignment.id)) {
            allAssignments.push(assignment);
            seenAssignmentIds.add(assignment.id);
          }
        }
      }
      
      console.log(`Final student assignment count: ${allAssignments.length}`);
      
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
      
      // Check if student is already enrolled
      const studentClasses = await storage.getStudentClassrooms(studentId);
      const alreadyEnrolled = studentClasses.some(c => c.id === classroom.id);
      
      if (alreadyEnrolled) {
        return res.status(409).json({ message: "Student is already enrolled in this class" });
      }
      
      // Enroll the student in the classroom
      await storage.enrollStudentInClassroom(studentId, classroom.id);
      
      // Return the classroom data
      res.json(classroom);
    } catch (error) {
      console.error("Error joining class:", error);
      if (error.message && error.message.includes("already enrolled")) {
        return res.status(409).json({ message: "Student is already enrolled in this class" });
      }
      res.status(500).json({ message: "Failed to join class" });
    }
  });

  // Create classroom
  app.post("/api/classrooms", async (req, res) => {
    try {
      const currentUser = await getCurrentUser();
      if (!currentUser || currentUser.role !== 'teacher') {
        return res.status(401).json({ message: "Teacher authentication required" });
      }
      
      const classroomData = {
        ...req.body,
        teacherId: currentUser.id // Ensure the classroom is assigned to the current teacher
      };
      
      const classroom = await storage.createClassroom(classroomData);
      res.json(classroom);
    } catch (error) {
      console.error("Error creating classroom:", error);
      res.status(500).json({ message: "Failed to create classroom" });
    }
  });

  // Create assignment
  app.post("/api/assignments", async (req, res) => {
    try {
      const currentUser = await getCurrentUser();
      if (!currentUser || currentUser.role !== 'teacher') {
        return res.status(401).json({ message: "Teacher authentication required" });
      }
      
      const assignmentData = {
        ...req.body,
        teacherId: currentUser.id, // Ensure assignment is assigned to current teacher
        dueDate: req.body.dueDate ? new Date(req.body.dueDate) : null // Convert date string to Date object
      };
      
      console.log('Creating assignment with data:', assignmentData);
      const assignment = await storage.createAssignment(assignmentData);
      console.log('Assignment created successfully:', assignment.id);
      res.json(assignment);
    } catch (error) {
      console.error('Error creating assignment:', error);
      res.status(500).json({ message: "Failed to create assignment" });
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

  // AI spell check endpoint
  app.post("/api/ai/spell-check", async (req, res) => {
    try {
      const { text } = req.body;
      
      if (!text || typeof text !== 'string') {
        return res.status(400).json({ error: "Text is required" });
      }

      // Create a fresh OpenAI instance for spell checking
      const OpenAI = (await import('openai')).default;
      
      if (!process.env.OPENAI_API_KEY) {
        console.error('OpenAI API key not found');
        return res.json([]);
      }
      
      const openai = new OpenAI({ 
        apiKey: process.env.OPENAI_API_KEY
      });
      
      console.log('Making spell check API call...');
      
      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are a spell checker. Return ONLY a valid JSON array with no additional text. Format: [{\"word\": \"misspelled_word\", \"suggestions\": [\"correction1\", \"correction2\"]}]. If no errors found, return: []"
          },
          {
            role: "user", 
            content: `Identify spelling errors in this text: "${text}"`
          }
        ],
        max_tokens: 500,
        temperature: 0
      });

      const response = completion.choices[0].message.content;
      console.log('Raw OpenAI response:', response);
      
      if (!response) {
        return res.json([]);
      }
      
      // Try to parse the AI response as JSON
      let errors = [];
      try {
        errors = JSON.parse(response);
        if (!Array.isArray(errors)) {
          errors = [];
        }
      } catch (parseError) {
        console.error("Failed to parse AI spell check response:", parseError);
        errors = [];
      }
      
      res.json(errors);
      
    } catch (error) {
      console.error("Spell check error:", error);
      res.json([]); // Return empty array instead of error to prevent UI issues
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
      const { sessionId, prompt, documentContent } = req.body;
      
      if (!prompt) {
        return res.status(400).json({ message: "Prompt is required" });
      }

      // Import OpenAI functions
      const { checkRestrictedPrompt, generateAiResponseWithHistory } = await import('./openai');

      // Check if prompt is restricted
      const isRestricted = checkRestrictedPrompt(prompt);
      
      let response: string;
      
      if (isRestricted) {
        response = "❌ Sorry! This type of AI help isn't allowed. Try asking for brainstorming, outlining, or feedback instead. I'm here to help you learn and improve your own writing skills, not to do the work for you.";
      } else {
        // Get conversation history for context if we have a session
        let conversationHistory: any[] = [];
        if (sessionId && sessionId > 0) {
          conversationHistory = await storage.getSessionInteractions(sessionId);
        }
        
        // Generate helpful AI response using OpenAI with conversation history and document context
        response = await generateAiResponseWithHistory(prompt, conversationHistory, documentContent);
      }

      // Store the interaction if we have a valid session
      if (sessionId && sessionId > 0) {
        await storage.createAiInteraction({
          sessionId: parseInt(sessionId),
          prompt,
          response,
          isRestricted,
        });
      }

      res.json({
        response,
        isRestricted,
        sessionId: sessionId || null
      });
      
    } catch (error) {
      console.error("AI chat error:", error);
      res.status(500).json({ 
        message: "Failed to generate AI response",
        response: "Sorry, I'm having trouble connecting right now. Please try again in a moment.",
        isRestricted: false
      });
    }
  });

  // Get students for a specific teacher
  app.get("/api/teacher/:teacherId/students", async (req, res) => {
    try {
      const teacherId = parseInt(req.params.teacherId);
      
      // Get teacher's classrooms
      const classrooms = await storage.getTeacherClassrooms(teacherId);
      
      // Get all students enrolled in these classrooms
      const allStudents: any[] = [];
      const studentIds = new Set<number>();
      
      for (const classroom of classrooms) {
        const studentsInClass = await storage.getClassroomStudents(classroom.id);
        for (const student of studentsInClass) {
          if (!studentIds.has(student.id)) {
            studentIds.add(student.id);
            // Get student's writing sessions for performance metrics
            const sessions = await storage.getUserWritingSessions(student.id);
            const completedAssignments = sessions.filter(s => s.status === 'submitted').length;
            const totalWords = sessions.reduce((sum, s) => sum + (s.wordCount || 0), 0);
            
            allStudents.push({
              id: student.id,
              name: `${student.firstName} ${student.lastName}`,
              email: student.email,
              grade: student.grade,
              status: completedAssignments > 2 ? 'excellent' : completedAssignments > 0 ? 'active' : 'needs_attention',
              completedAssignments,
              totalWords,
              lastActivity: sessions.length > 0 ? sessions[sessions.length - 1].updatedAt : student.createdAt,
              progress: Math.min(100, (completedAssignments / 3) * 100),
              streak: Math.min(completedAssignments, 7),
              classrooms: [classroom.name]
            });
          }
        }
      }
      
      res.json(allStudents);
    } catch (error) {
      console.error("Error fetching teacher students:", error);
      res.status(500).json({ message: "Failed to fetch students" });
    }
  });

  // Get student insights for teacher dashboard
  app.get("/api/teacher/:teacherId/student-insights", async (req, res) => {
    try {
      res.json([]); // Return empty array for now
    } catch (error) {
      console.error("Error fetching student insights:", error);
      res.status(500).json({ message: "Failed to fetch student insights" });
    }
  });

  // Get leaderboard for teacher dashboard
  app.get("/api/teacher/:teacherId/leaderboard", async (req, res) => {
    try {
      res.json([]); // Return empty array for now
    } catch (error) {
      console.error("Error fetching leaderboard:", error);
      res.status(500).json({ message: "Failed to fetch leaderboard" });
    }
  });

  // Get teacher goals
  app.get("/api/teacher/:teacherId/goals", async (req, res) => {
    try {
      res.json([]); // Return empty array for now
    } catch (error) {
      console.error("Error fetching teacher goals:", error);
      res.status(500).json({ message: "Failed to fetch goals" });
    }
  });

  // Student analytics endpoints
  app.get("/api/users/:userId/streak", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      // Calculate streak based on writing sessions
      const sessions = await storage.getUserWritingSessions(userId);
      const currentStreak = 3; // Simplified for now
      const longestStreak = 7; // Simplified for now
      
      res.json({ currentStreak, longestStreak });
    } catch (error) {
      console.error("Error fetching user streak:", error);
      res.status(500).json({ message: "Failed to fetch streak data" });
    }
  });

  app.get("/api/users/:userId/goals", async (req, res) => {
    try {
      const goals = [
        { id: 1, title: "Write 500 words this week", progress: 75, target: 500, current: 375 },
        { id: 2, title: "Complete 3 assignments", progress: 66, target: 3, current: 2 }
      ];
      res.json(goals);
    } catch (error) {
      console.error("Error fetching user goals:", error);
      res.status(500).json({ message: "Failed to fetch goals" });
    }
  });

  app.get("/api/users/:userId/achievements", async (req, res) => {
    try {
      const achievements = [
        { id: 1, title: "First Draft", description: "Complete your first writing session", unlockedAt: new Date() },
        { id: 2, title: "Word Warrior", description: "Write 1000 words in one session", unlockedAt: null },
        { id: 3, title: "Streak Master", description: "Write for 5 days in a row", unlockedAt: new Date() }
      ];
      res.json(achievements);
    } catch (error) {
      console.error("Error fetching user achievements:", error);
      res.status(500).json({ message: "Failed to fetch achievements" });
    }
  });

  app.get("/api/analytics/:userId/sessions", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const sessions = await storage.getUserWritingSessions(userId);
      
      const totalSessions = sessions.length;
      const totalWords = sessions.reduce((sum, session) => sum + (session.wordCount || 0), 0);
      const avgWordsPerSession = totalSessions > 0 ? Math.round(totalWords / totalSessions) : 0;
      
      res.json({ totalSessions, avgWordsPerSession, totalWords });
    } catch (error) {
      console.error("Error fetching session analytics:", error);
      res.status(500).json({ message: "Failed to fetch session data" });
    }
  });

  app.get("/api/analytics/:userId/writing-stats", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const sessions = await storage.getUserWritingSessions(userId);
      
      const totalWords = sessions.reduce((sum, session) => sum + (session.wordCount || 0), 0);
      const sessionsCompleted = sessions.filter(s => s.status === 'submitted').length;
      
      const writingStats = {
        weeklyProgress: [
          { day: 'Mon', words: 120 },
          { day: 'Tue', words: 250 },
          { day: 'Wed', words: 180 },
          { day: 'Thu', words: 300 },
          { day: 'Fri', words: 220 },
          { day: 'Sat', words: 150 },
          { day: 'Sun', words: 200 }
        ],
        monthlyStats: { wordsWritten: totalWords, sessionsCompleted },
        avgWordsPerDay: Math.round(totalWords / 30),
        mostProductiveDay: 'Thursday',
        weeklyGoal: 1500
      };
      
      res.json(writingStats);
    } catch (error) {
      console.error("Error fetching writing stats:", error);
      res.status(500).json({ message: "Failed to fetch writing statistics" });
    }
  });

  // Inline comments routes
  app.post("/api/sessions/:sessionId/comments", async (req, res) => {
    try {
      const sessionId = parseInt(req.params.sessionId);
      const currentUser = await getCurrentUser();
      
      const commentData = {
        ...req.body,
        sessionId,
        teacherId: currentUser?.id || req.body.teacherId || 1
      };
      
      console.log("Creating inline comment:", commentData);
      const comment = await storage.createInlineComment(commentData);
      console.log("Created comment:", comment);
      res.json(comment);
    } catch (error) {
      console.error("Error creating inline comment:", error);
      res.status(500).json({ error: "Failed to create comment" });
    }
  });

  app.get("/api/sessions/:sessionId/comments", async (req, res) => {
    try {
      const sessionId = parseInt(req.params.sessionId);
      console.log("Fetching comments for session:", sessionId);
      const comments = await storage.getSessionInlineComments(sessionId);
      console.log("Found comments:", comments);
      res.json(comments);
    } catch (error) {
      console.error("Error fetching inline comments:", error);
      res.status(500).json({ error: "Failed to fetch comments" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}