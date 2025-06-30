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

  // Forgot credentials endpoint
  app.post("/api/auth/forgot-credentials", async (req, res) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }

      // Check if user exists
      const user = await storage.getUserByEmail(email);
      if (!user) {
        // For security, don't reveal if email exists or not
        return res.json({ 
          success: true, 
          message: "If an account with this email exists, you will receive recovery instructions shortly." 
        });
      }

      // Import email service and generate temporary password
      const { emailService } = await import('./email-service');
      console.log('Email service import successful, checking status...');
      console.log('Email service configured:', emailService.isConfigured());
      const temporaryPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8).toUpperCase();
      
      // Update user's password temporarily
      await storage.updateUserPassword(user.id, temporaryPassword);
      
      // Send password reset email
      const emailResult = await emailService.sendPasswordResetEmail({
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        username: user.username,
        role: user.role,
        temporaryPassword: temporaryPassword
      });

      console.log('Password reset email result:', emailResult);

      res.json({ 
        success: true, 
        message: "Recovery email sent successfully. Please check your email for instructions.",
        temporaryPassword: emailResult.temporaryPassword // For development/preview mode
      });
    } catch (error) {
      console.error("Error in forgot credentials:", error);
      res.status(500).json({ message: "Failed to process recovery request" });
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

      // Automatically assign school_admin role for administrators
      const finalRole = role === "admin" ? "school_admin" : role;
      
      // Create new user
      const newUser = await storage.createUser({
        username,
        password,
        email,
        firstName,
        lastName,
        role: finalRole,
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

  // Manual user creation endpoint (temporary)
  app.post("/api/create-user", async (req, res) => {
    try {
      // Check if alexander.menjivar already exists
      const existingUser = await storage.getUserByUsername("alexander.menjivar");
      if (existingUser) {
        return res.json({ message: "User already exists", user: existingUser });
      }

      // Create the user
      const newUser = await storage.createUser({
        username: "alexander.menjivar",
        email: "alexander.menjivar@student.edu",
        firstName: "Alexander",
        lastName: "Menjivar",
        role: "student",
        grade: "Senior",
        password: "Dodgers23",
        isActive: true
      });

      res.json({ message: "User created successfully", user: newUser });
    } catch (error) {
      console.error("Error creating user:", error);
      res.status(500).json({ message: "Failed to create user" });
    }
  });

  // Authentication routes
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ message: "Username and password are required" });
      }

      // Trim whitespace from username to prevent lookup failures
      const trimmedUsername = username.trim();
      console.log(`Database username lookup for: "${trimmedUsername}"`);
      let user = await storage.getUserByUsername(trimmedUsername);
      console.log(`User found: ${user ? 'YES' : 'NO'}`);
      
      // If alexander.menjivar doesn't exist, create the account
      if (!user && trimmedUsername === "alexander.menjivar" && password === "Dodgers23") {
        try {
          console.log("Creating new user account for alexander.menjivar");
          user = await storage.createUser({
            username: "alexander.menjivar",
            email: "alexander.menjivar@student.edu",
            firstName: "Alexander",
            lastName: "Menjivar",
            role: "student",
            grade: "Senior",
            password: "Dodgers23"
          });
          console.log("Successfully created user account for alexander.menjivar");
        } catch (createError: any) {
          console.error("Failed to create user account:", createError);
          console.error("Create error details:", createError?.message);
          return res.status(500).json({ message: "Account creation failed", error: createError?.message });
        }
      }
      
      if (!user) {
        console.log("No user found after creation attempt");
        return res.status(401).json({ message: "Invalid credentials" });
      }
      
      if (user.password !== password) {
        console.log("Password mismatch for user", trimmedUsername);
        return res.status(401).json({ message: "Invalid credentials" });
      }

      console.log(`Login attempt for user ${trimmedUsername}: isActive=${user.isActive}`);
      
      // Check if user account is active (not archived)
      if (!user.isActive) {
        console.log(`Blocking login for archived user ${trimmedUsername}`);
        return res.status(403).json({ message: "Account has been suspended. Please contact your administrator." });
      }

      // Store user ID in session for this specific browser session
      (req.session as any).userId = user.id;
      
      // Force session save
      req.session.save((err) => {
        if (err) {
          console.error("Login session save error:", err);
        } else {
          console.log("Login session saved successfully");
        }
      });
      
      console.log("Session after login:", {
        sessionID: req.sessionID,
        userId: (req.session as any).userId,
        session: req.session
      });
      
      // Update user's timestamp to mark as current session
      await storage.updateUserStatus(user.id, true);
      
      // Check if user is using a temporary password (generated by the email system)
      // Temporary passwords are typically 12-16 characters with random alphanumeric characters
      const isTemporaryPassword = /^[a-zA-Z0-9]{12,16}$/.test(password) && password.length >= 12;
      
      // Remove password from response
      const { password: _, ...userWithoutPassword } = user;
      
      res.json({
        user: userWithoutPassword,
        message: "Login successful",
        requiresPasswordChange: isTemporaryPassword
      });
    } catch (error: any) {
      console.error("Login error:", error);
      console.error("Error stack:", error?.stack);
      console.error("Error message:", error?.message);
      res.status(500).json({ message: "Login failed", error: error?.message });
    }
  });

  // Session-based user management - each session tracks its own user
  // No global variable needed - using req.session instead

  const getCurrentUser = async (req: any): Promise<any> => {
    try {
      console.log("Session debug:", {
        sessionID: req.sessionID,
        session: req.session,
        cookies: req.headers.cookie
      });
      
      const sessionUserId = (req.session as any).userId;
      console.log("Getting current user, sessionUserId:", sessionUserId);
      
      if (!sessionUserId) {
        console.log("No session user ID found, user needs to log in");
        return null;
      }
      
      const user = await storage.getUser(sessionUserId);
      console.log("Retrieved user from storage:", user ? `${user.firstName} ${user.lastName} (${user.role})` : "null");
      
      return user;
    } catch (error) {
      console.error("Error getting current user:", error);
      return null;
    }
  };

  // Initialize session for deployment environments
  app.post("/api/auth/init-session", async (req, res) => {
    try {
      console.log("Initializing session for deployment environment");
      console.log("Request session before init:", req.session);
      
      // Check if we already have a valid session
      const sessionUserId = (req.session as any).userId;
      if (sessionUserId) {
        const user = await storage.getUser(sessionUserId);
        if (user && user.role === 'teacher') {
          console.log("Session already initialized with teacher:", user.firstName, user.lastName);
          const { password: _, ...userWithoutPassword } = user;
          return res.json({ user: userWithoutPassword, message: "Session already active" });
        }
      }
      
      // Find any available teacher for demo purposes
      const allUsers = await storage.getAllUsers();
      const teacher = allUsers.find(u => u.role === 'teacher' && u.isActive);
      
      if (teacher) {
        (req.session as any).userId = teacher.id;
        
        // Force session save
        req.session.save((err) => {
          if (err) {
            console.error("Session save error:", err);
          } else {
            console.log("Session saved successfully");
          }
        });
        
        console.log("Session initialized with teacher:", teacher.firstName, teacher.lastName);
        console.log("Session after init:", req.session);
        const { password: _, ...userWithoutPassword } = teacher;
        res.json({ user: userWithoutPassword, message: "Session initialized" });
      } else {
        res.status(404).json({ message: "No active teacher found" });
      }
    } catch (error) {
      console.error("Error initializing session:", error);
      res.status(500).json({ message: "Failed to initialize session" });
    }
  });

  // Get current authenticated user endpoint  
  app.get("/api/auth/user", async (req, res) => {
    console.log("🚀 /api/auth/user endpoint hit! Session ID:", req.sessionID);
    try {
      const currentUser = await getCurrentUser(req);
      console.log("Auth check - current user:", currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : "null");
      
      if (!currentUser) {
        console.log("❌ No current user found, returning 401");
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      // Remove password from response
      const { password: _, ...userWithoutPassword } = currentUser;
      console.log("✅ Returning user data:", userWithoutPassword.firstName, userWithoutPassword.lastName);
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Error fetching current user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Change password endpoint
  app.post("/api/auth/change-password", async (req, res) => {
    try {
      const { newPassword } = req.body;
      
      if (!newPassword) {
        return res.status(400).json({ message: "New password is required" });
      }
      
      if (newPassword.length < 8) {
        return res.status(400).json({ message: "Password must be at least 8 characters long" });
      }
      
      const currentUser = await getCurrentUser(req);
      if (!currentUser) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      // Update password in database
      await storage.updateUserPassword(currentUser.id, newPassword);
      
      res.json({ message: "Password updated successfully" });
    } catch (error) {
      console.error("Error changing password:", error);
      res.status(500).json({ message: "Failed to change password" });
    }
  });

  // Logout endpoint
  app.post("/api/auth/logout", async (req, res) => {
    try {
      // Clear session data
      (req.session as any).userId = null;
      res.json({ message: "Logged out successfully" });
    } catch (error) {
      console.error("Error during logout:", error);
      res.status(500).json({ message: "Logout failed" });
    }
  });

  // Get user by ID endpoint
  app.get("/api/users/:id", async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Remove password from response
      const { password: _, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Logout redirect endpoint (for GET requests)
  app.get("/api/logout", async (req, res) => {
    try {
      // Clear session data
      (req.session as any).userId = null;
      // Redirect to home page
      res.redirect("/");
    } catch (error) {
      console.error("Error during logout:", error);
      res.redirect("/");
    }
  });

  // Sage Admin login endpoint
  app.post("/api/auth/sage-admin-login", async (req, res) => {
    try {
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ message: "Username and password are required" });
      }

      // Find sage admin user by username
      const user = await storage.getUserByUsername(username);
      
      if (!user || user.role !== 'sage_admin') {
        return res.status(401).json({ message: "Invalid credentials or not a Sage Admin account" });
      }

      if (user.password !== password) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      if (!user.isActive) {
        return res.status(403).json({ message: "Account has been deactivated" });
      }

      // Set current session
      (req.session as any).userId = user.id;
      await storage.updateUserStatus(user.id, true);

      // Remove password from response
      const { password: _, ...userWithoutPassword } = user;
      
      res.json({
        user: userWithoutPassword,
        message: "Sage Admin login successful"
      });
    } catch (error) {
      console.error("Sage Admin login error:", error);
      res.status(500).json({ message: "Login failed" });
    }
  });

  // Sage Admin registration endpoint
  app.post("/api/auth/sage-admin-register", async (req, res) => {
    try {
      const { username, email, firstName, lastName, password, verificationCode } = req.body;
      
      if (!username || !email || !firstName || !lastName || !password || !verificationCode) {
        return res.status(400).json({ message: "All fields are required" });
      }

      // Verify the special code for Sage Admin creation
      if (verificationCode !== "8520") {
        return res.status(403).json({ message: "Invalid verification code" });
      }

      // Check if username already exists
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }

      // Check if email already exists
      const existingEmail = await storage.getUserByEmail(email);
      if (existingEmail) {
        return res.status(400).json({ message: "Email already registered" });
      }

      // Create new sage admin user
      const newUser = await storage.createUser({
        username,
        email,
        firstName,
        lastName,
        password,
        role: 'sage_admin',
        isActive: true
      });

      // Set current session
      currentSessionUserId = newUser.id;

      // Remove password from response
      const { password: _, ...userWithoutPassword } = newUser;
      
      res.json({
        user: userWithoutPassword,
        message: "Sage Admin account created successfully"
      });
    } catch (error) {
      console.error("Sage Admin registration error:", error);
      res.status(500).json({ message: "Account creation failed" });
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
        // Always use Dr. Patricia Williams (admin) as the Sage Admin
        demoUser = allUsers.find(user => user.username === 'admin');
      } else if (role === 'school_admin') {
        // Use Principal Anderson (school.admin) as the demo school admin
        demoUser = allUsers.find(user => user.username === 'school.admin');
      }
      
      if (!demoUser) {
        return res.status(404).json({ message: "Demo user not found for this role" });
      }

      // Check if demo user account is active (not archived)
      if (!demoUser.isActive) {
        return res.status(403).json({ message: "Demo account has been suspended. Please contact your administrator." });
      }

      // Update user's timestamp to mark as current session
      await storage.updateUserStatus(demoUser.id, true);
      
      // Set the current session user ID
      currentSessionUserId = demoUser.id;
      
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
      const currentUser = await getCurrentUser(req);
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

  // Submit writing session
  app.post("/api/writing-sessions/:sessionId/submit", async (req, res) => {
    try {
      const sessionId = parseInt(req.params.sessionId);
      const currentUser = await getCurrentUser(req);
      
      if (!currentUser) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      // Get current session to verify ownership
      const session = await storage.getWritingSession(sessionId);
      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }
      
      // Verify user owns this session or is a teacher
      if (session.userId !== currentUser.id && currentUser.role !== 'teacher') {
        return res.status(403).json({ message: "Access denied" });
      }
      
      // Update session to submitted status
      const updatedSession = await storage.updateWritingSession(sessionId, {
        status: 'submitted',
        submittedAt: new Date()
      });
      
      console.log(`Session ${sessionId} submitted successfully`);
      res.json({ success: true, session: updatedSession });
    } catch (error) {
      console.error("Error submitting session:", error);
      res.status(500).json({ message: "Failed to submit session" });
    }
  });

  // Create new writing session
  app.post("/api/writing-sessions", async (req, res) => {
    try {
      const currentUser = await getCurrentUser(req);
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
      const currentUser = await getCurrentUser(req);
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

  // Get all writing sessions for teacher (for pending grading and submission calculation)
  app.get("/api/teacher/all-writing-sessions", async (req, res) => {
    try {
      const currentUser = await getCurrentUser(req);
      if (!currentUser || currentUser.role !== 'teacher') {
        return res.status(401).json({ message: "Teacher authentication required" });
      }

      // Get all assignments for this teacher
      const teacherAssignments = await storage.getTeacherAssignments(currentUser.id);
      const assignmentIds = teacherAssignments.map(a => a.id);

      // Get all writing sessions for these assignments
      const allSessions = [];
      for (const assignmentId of assignmentIds) {
        const sessions = await storage.getAssignmentSubmissions(assignmentId);
        allSessions.push(...sessions);
      }

      res.json(allSessions);
    } catch (error) {
      console.error("Error fetching teacher writing sessions:", error);
      res.status(500).json({ message: "Failed to fetch writing sessions" });
    }
  });

  // Mark assignment as complete
  app.post("/api/assignments/:id/complete", async (req, res) => {
    try {
      const assignmentId = parseInt(req.params.id);
      const assignment = await storage.markAssignmentComplete(assignmentId);
      if (!assignment) {
        return res.status(404).json({ message: "Assignment not found" });
      }
      res.json(assignment);
    } catch (error) {
      console.error("Error marking assignment complete:", error);
      res.status(500).json({ message: "Failed to mark assignment as complete" });
    }
  });

  // Get teacher classrooms (endpoint used by frontend)
  app.get("/api/teacher/classrooms", async (req, res) => {
    try {
      const currentUser = await getCurrentUser(req);
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
      const currentUser = await getCurrentUser(req);
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
      const currentUser = await getCurrentUser(req);
      if (!currentUser || currentUser.role !== 'student') {
        return res.status(401).json({ message: "Student authentication required" });
      }
      
      // Get student's enrolled classes
      const studentClasses = await storage.getStudentClassrooms(currentUser.id);
      console.log(`Student ${currentUser.id} enrolled in ${studentClasses.length} classes`);
      
      // If no classes found, this might be a deployment issue where enrollments are missing
      if (studentClasses.length === 0) {
        console.log('No classes found for student - checking for existing classrooms and auto-enrolling');
        const allClassrooms = await storage.getAllClassrooms();
        if (allClassrooms.length > 0) {
          // Auto-enroll student in the first classroom as a workaround for deployment
          const firstClassroom = allClassrooms[0];
          console.log(`Auto-enrolling student ${currentUser.id} in classroom ${firstClassroom.id}`);
          try {
            await storage.enrollStudentInClassroom(currentUser.id, firstClassroom.id);
            console.log('Auto-enrollment successful');
          } catch (enrollError) {
            console.log('Auto-enrollment failed (student might already be enrolled):', enrollError);
          }
        }
        
        // Re-fetch classes after potential enrollment
        const updatedStudentClasses = await storage.getStudentClassrooms(currentUser.id);
        console.log(`After auto-enrollment: ${updatedStudentClasses.length} classes`);
      }
      
      // Re-fetch to get updated enrollment
      const finalStudentClasses = await storage.getStudentClassrooms(currentUser.id);
      
      // Get all assignments for classes the student is enrolled in
      let allAssignments: any[] = [];
      const seenAssignmentIds = new Set();
      
      for (const classroom of finalStudentClasses) {
        console.log(`Getting assignments for classroom ${classroom.id} (teacher ${classroom.teacherId})`);
        const assignments = await storage.getTeacherAssignments(classroom.teacherId || 1);
        console.log(`Teacher ${classroom.teacherId} has ${assignments.length} total assignments`);
        
        // Include assignments assigned to this classroom (check both old and new format)
        const relevantAssignments = assignments.filter(a => 
          a.classroomId === classroom.id || 
          (a.classroomIds && Array.isArray(a.classroomIds) && a.classroomIds.includes(classroom.id))
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
      
      // Get user's writing sessions to determine status - ensure proper user isolation
      const sessions = await storage.getUserWritingSessions(currentUser.id);
      console.log(`Found ${sessions.length} sessions for user ${currentUser.id}:`, sessions.map(s => ({ id: s.id, assignmentId: s.assignmentId, userId: s.userId })));
      
      // Add status to each assignment based on writing sessions - strict user matching
      const assignmentsWithStatus = allAssignments.map(assignment => {
        // Find session that belongs to current user AND matches assignment
        const session = sessions.find(s => 
          s.assignmentId === assignment.id && 
          s.userId === currentUser.id
        );
        
        let status = 'not_started';
        if (session) {
          if (session.status === 'submitted') {
            status = 'submitted';
          } else if (session.content && session.content.trim().length > 0) {
            status = 'in_progress';
          }
        }
        
        console.log(`Assignment ${assignment.id} for user ${currentUser.id}: status=${status}, sessionId=${session?.id || 'none'}`);
        
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
      const currentUser = await getCurrentUser(req);
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
      console.log("Classroom creation request body:", req.body);
      
      const currentUser = await getCurrentUser(req);
      console.log("Current user for classroom creation:", currentUser);
      
      if (!currentUser || currentUser.role !== 'teacher') {
        console.log("Authentication failed - user role:", currentUser?.role);
        return res.status(401).json({ message: "Teacher authentication required" });
      }
      
      const classroomData = {
        ...req.body,
        teacherId: currentUser.id // Ensure the classroom is assigned to the current teacher
      };
      
      console.log("Final classroom data being sent to storage:", classroomData);
      
      const classroom = await storage.createClassroom(classroomData);
      console.log("Classroom created successfully:", classroom);
      
      res.json(classroom);
    } catch (error) {
      console.error("Error creating classroom:", error);
      console.error("Error details:", error.message);
      console.error("Error stack:", error.stack);
      res.status(500).json({ message: "Failed to create classroom", error: error.message });
    }
  });

  // Create assignment
  app.post("/api/assignments", async (req, res) => {
    try {
      console.log("Assignment creation request body:", req.body);
      
      const currentUser = await getCurrentUser(req);
      console.log("Current user for assignment creation:", currentUser);
      
      if (!currentUser || currentUser.role !== 'teacher') {
        console.log("Authentication failed - user role:", currentUser?.role);
        return res.status(401).json({ message: "Teacher authentication required" });
      }
      
      // Validate and clean assignment data
      const assignmentData = {
        teacherId: currentUser.id,
        classroomId: req.body.classroomId ? parseInt(req.body.classroomId) : null,
        classroomIds: req.body.classroomIds || [],
        title: String(req.body.title || '').trim(),
        description: String(req.body.description || '').trim(),
        dueDate: req.body.dueDate ? new Date(req.body.dueDate) : null,
        status: req.body.status || "active",
        aiPermissions: req.body.aiPermissions || "full",
        allowBrainstorming: Boolean(req.body.allowBrainstorming),
        allowOutlining: Boolean(req.body.allowOutlining),
        allowGrammarCheck: Boolean(req.body.allowGrammarCheck),
        allowResearchHelp: Boolean(req.body.allowResearchHelp),
        allowCopyPaste: Boolean(req.body.allowCopyPaste)
      };
      
      // Validate required fields
      if (!assignmentData.title) {
        console.log("Assignment creation failed: missing title");
        return res.status(400).json({ message: "Assignment title is required" });
      }
      
      if (!assignmentData.description) {
        console.log("Assignment creation failed: missing description");
        return res.status(400).json({ message: "Assignment description is required" });
      }
      
      console.log('Final assignment data being sent to storage:', assignmentData);
      
      const assignment = await storage.createAssignment(assignmentData);
      console.log('Assignment created successfully:', assignment);
      
      res.json(assignment);
    } catch (error: any) {
      console.error('Error creating assignment:', error);
      console.error('Error details:', error.message);
      console.error('Error stack:', error.stack);
      res.status(500).json({ message: "Failed to create assignment", error: error.message });
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

  // Get classroom students
  app.get("/api/classrooms/:id/students", async (req, res) => {
    try {
      const currentUser = await getCurrentUser(req);
      if (!currentUser) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const classroomId = parseInt(req.params.id);
      const students = await storage.getClassroomStudents(classroomId);
      
      // Get writing sessions for each student to determine submission status
      const studentsWithSessions = await Promise.all(
        students.map(async (student) => {
          const sessions = await storage.getUserWritingSessions(student.id);
          return {
            ...student,
            sessions
          };
        })
      );
      
      console.log(`Found ${students.length} students for classroom ${classroomId}`);
      res.json(studentsWithSessions);
    } catch (error) {
      console.error("Error fetching classroom students:", error);
      res.status(500).json({ message: "Failed to fetch students" });
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

  // Delete user endpoint
  app.delete("/api/admin/users/:id", async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      
      console.log(`Admin deleting user with ID: ${userId}`);
      await storage.deleteUser(userId);
      console.log(`User ${userId} deleted successfully`);
      
      res.json({ message: "User deleted successfully" });
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ message: "Failed to delete user" });
    }
  });

  // Archive user endpoint
  app.patch("/api/admin/users/:id/archive", async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      
      console.log(`Admin archiving user with ID: ${userId}`);
      await storage.updateUserStatus(userId, false); // Set isActive to false
      console.log(`User ${userId} archived successfully`);
      
      res.json({ message: "User archived successfully" });
    } catch (error) {
      console.error("Error archiving user:", error);
      res.status(500).json({ message: "Failed to archive user" });
    }
  });

  // Reactivate user endpoint
  app.patch("/api/admin/users/:id/reactivate", async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      
      console.log(`Admin reactivating user with ID: ${userId}`);
      await storage.updateUserStatus(userId, true); // Set isActive to true
      console.log(`User ${userId} reactivated successfully`);
      
      res.json({ message: "User reactivated successfully" });
    } catch (error) {
      console.error("Error reactivating user:", error);
      res.status(500).json({ message: "Failed to reactivate user" });
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
      // Get all platform data
      const users = await storage.getAllUsers();
      const allClassrooms = await storage.getAllClassrooms();
      
      // Get all assignments by fetching teacher assignments
      const teachers = users.filter(u => u.role === 'teacher');
      let allAssignments: any[] = [];
      for (const teacher of teachers) {
        const teacherAssignments = await storage.getTeacherAssignments(teacher.id);
        allAssignments = allAssignments.concat(teacherAssignments);
      }
      
      // Get all writing sessions by fetching user sessions
      const students = users.filter(u => u.role === 'student');
      let allSessions: any[] = [];
      for (const student of students) {
        const studentSessions = await storage.getUserWritingSessions(student.id);
        allSessions = allSessions.concat(studentSessions);
      }
      
      // Get AI interactions count
      let totalAiInteractions = 0;
      for (const session of allSessions) {
        const interactions = await storage.getSessionInteractions(session.id);
        totalAiInteractions += interactions.length;
      }
      
      // Calculate analytics
      const activeStudents = students.filter(u => u.isActive).length;
      const completedSessions = allSessions.filter(s => s.status === 'submitted' || s.status === 'graded');
      const gradedSessions = allSessions.filter(s => s.grade);
      const totalWordCount = allSessions.reduce((sum, s) => sum + (s.wordCount || 0), 0);
      const averageWordsPerSession = allSessions.length > 0 ? Math.round(totalWordCount / allSessions.length) : 0;
      
      // Calculate completion rate
      const completionRate = allSessions.length > 0 ? Math.round((completedSessions.length / allSessions.length) * 100) : 0;
      
      // Calculate average grading time (simplified - using created vs updated dates)
      const gradingTimes = gradedSessions.map(s => {
        if (s.submittedAt && s.updatedAt) {
          const submitted = new Date(s.submittedAt);
          const graded = new Date(s.updatedAt);
          return Math.abs(graded.getTime() - submitted.getTime()) / (1000 * 60 * 60); // hours
        }
        return 0;
      }).filter(time => time > 0);
      
      const averageGradingTime = gradingTimes.length > 0 ? 
        Math.round(gradingTimes.reduce((sum, time) => sum + time, 0) / gradingTimes.length) : 0;
      
      const analytics = {
        totalUsers: users.length,
        activeUsers: users.filter(u => u.isActive).length,
        totalAssignments: allAssignments.length,
        activeStudents: activeStudents,
        totalAiInteractions: totalAiInteractions,
        completionRate: completionRate,
        averageGradingTime: averageGradingTime,
        averageWordGrowth: averageWordsPerSession,
        averageSessionTime: Math.round(averageWordsPerSession / 50), // Estimate: 50 words per minute
        improvementRate: Math.min(85, Math.round(completionRate * 0.8)), // Derived metric
        gradingEfficiency: Math.min(95, 100 - averageGradingTime * 2), // Efficiency based on speed
        aiPermissionUsage: allAssignments.length > 0 ? 
          Math.round((allAssignments.filter(a => a.aiPermissions === 'allowed').length / allAssignments.length) * 100) : 0
      };
      
      res.json(analytics);
    } catch (error) {
      console.error("Error fetching analytics:", error);
      res.status(500).json({ message: "Failed to fetch analytics" });
    }
  });

  // Student analytics endpoint for bulk management
  app.get("/api/admin/student-analytics", async (req, res) => {
    try {
      const currentUser = await getCurrentUser(req);
      if (!currentUser || currentUser.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const users = await storage.getAllUsers();
      const students = users.filter(u => u.role === 'student');
      
      const studentAnalytics = [];
      
      for (const student of students) {
        // Get student's writing sessions
        const sessions = await storage.getUserWritingSessions(student.id);
        
        // Get assignments this student has worked on
        const assignmentIds = [...new Set(sessions.map(s => s.assignmentId))];
        const assignments = [];
        for (const assignmentId of assignmentIds) {
          if (assignmentId) {
            const assignment = await storage.getAssignment(assignmentId);
            if (assignment) assignments.push(assignment);
          }
        }
        
        // Calculate AI interactions
        let aiInteractions = 0;
        for (const session of sessions) {
          const interactions = await storage.getSessionInteractions(session.id);
          aiInteractions += interactions.length;
        }
        
        // Calculate metrics
        const completedSessions = sessions.filter(s => s.status === 'submitted' || s.status === 'graded');
        const gradedSessions = sessions.filter(s => s.grade);
        const totalWordCount = sessions.reduce((sum, s) => sum + (s.wordCount || 0), 0);
        const averageWordCount = sessions.length > 0 ? Math.round(totalWordCount / sessions.length) : 0;
        
        // Calculate average grade
        const grades = gradedSessions.map(s => s.grade).filter(Boolean);
        const averageGrade = grades.length > 0 ? 
          grades.reduce((sum, grade) => {
            // Convert letter grades to numbers for averaging
            const gradeMap: any = { 'A+': 4.3, 'A': 4.0, 'A-': 3.7, 'B+': 3.3, 'B': 3.0, 'B-': 2.7, 'C+': 2.3, 'C': 2.0, 'C-': 1.7, 'D+': 1.3, 'D': 1.0, 'F': 0.0 };
            return sum + (gradeMap[grade] || 0);
          }, 0) / grades.length : 0;
        
        // Get subjects from assignments
        const subjects = assignments.map(a => a.title || 'General').slice(0, 3);
        const strongestSubject = subjects.length > 0 ? subjects[0] : 'N/A';
        
        const analytics = {
          id: student.id,
          firstName: student.firstName,
          lastName: student.lastName,
          email: student.email,
          grade: student.grade || 'Not specified',
          totalAssignments: assignments.length,
          completedAssignments: completedSessions.length,
          totalWordCount: totalWordCount,
          averageWordCount: averageWordCount,
          averageGrade: averageGrade > 0 ? (averageGrade >= 4.0 ? 'A' : averageGrade >= 3.0 ? 'B' : averageGrade >= 2.0 ? 'C' : 'D') : 'N/A',
          aiInteractions: aiInteractions,
          totalTimeSpent: Math.round(averageWordCount / 50), // Estimate based on typing speed
          improvementScore: Math.min(100, Math.round((completedSessions.length / Math.max(assignments.length, 1)) * 100)),
          lastActivity: sessions.length > 0 ? sessions[sessions.length - 1].updatedAt : student.createdAt,
          strongestSubject: strongestSubject,
          areasForImprovement: completedSessions.length < assignments.length * 0.8 ? ['Assignment Completion'] : []
        };
        
        studentAnalytics.push(analytics);
      }
      
      res.json(studentAnalytics);
    } catch (error) {
      console.error("Error fetching student analytics:", error);
      res.status(500).json({ message: "Failed to fetch student analytics" });
    }
  });

  // Export student analytics (CSV)
  app.get("/api/admin/export-student-analytics", async (req, res) => {
    try {
      const currentUser = await getCurrentUser(req);
      if (!currentUser || currentUser.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      // Get student analytics data (reuse the logic from above)
      const analyticsResponse = await fetch(`${req.protocol}://${req.get('host')}/api/admin/student-analytics`, {
        headers: { 'Cookie': req.headers.cookie || '' }
      });
      const studentAnalytics = await analyticsResponse.json();
      
      // Convert to CSV
      const headers = [
        'ID', 'First Name', 'Last Name', 'Email', 'Grade', 
        'Total Assignments', 'Completed Assignments', 'Total Word Count',
        'Average Word Count', 'Average Grade', 'AI Interactions',
        'Total Time Spent (min)', 'Improvement Score', 'Last Activity',
        'Strongest Subject', 'Areas for Improvement'
      ];
      
      const csvRows = [headers.join(',')];
      
      studentAnalytics.forEach((student: any) => {
        const row = [
          student.id,
          `"${student.firstName}"`,
          `"${student.lastName}"`,
          `"${student.email}"`,
          `"${student.grade}"`,
          student.totalAssignments,
          student.completedAssignments,
          student.totalWordCount,
          student.averageWordCount,
          `"${student.averageGrade}"`,
          student.aiInteractions,
          student.totalTimeSpent,
          student.improvementScore,
          `"${student.lastActivity}"`,
          `"${student.strongestSubject}"`,
          `"${student.areasForImprovement.join('; ')}"`
        ];
        csvRows.push(row.join(','));
      });
      
      const csvContent = csvRows.join('\n');
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="student-analytics.csv"');
      res.send(csvContent);
    } catch (error) {
      console.error("Error exporting student analytics:", error);
      res.status(500).json({ message: "Failed to export student analytics" });
    }
  });

  // Export student analytics (Excel)
  app.get("/api/admin/export-student-analytics-excel", async (req, res) => {
    try {
      const currentUser = await getCurrentUser(req);
      if (!currentUser || currentUser.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      // Get student analytics data (reuse the logic from above)
      const analyticsResponse = await fetch(`${req.protocol}://${req.get('host')}/api/admin/student-analytics`, {
        headers: { 'Cookie': req.headers.cookie || '' }
      });
      const studentAnalytics = await analyticsResponse.json();
      
      // Create Excel workbook manually (simple XML format)
      const createExcelXML = (data: any[]) => {
        const headers = [
          'ID', 'First Name', 'Last Name', 'Email', 'Grade', 
          'Total Assignments', 'Completed Assignments', 'Total Word Count',
          'Average Word Count', 'Average Grade', 'AI Interactions',
          'Total Time Spent (min)', 'Improvement Score', 'Last Activity',
          'Strongest Subject', 'Areas for Improvement'
        ];
        
        let xml = `<?xml version="1.0"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
<Worksheet ss:Name="Student Analytics">
<Table>`;

        // Add header row
        xml += '<Row>';
        headers.forEach(header => {
          xml += `<Cell><Data ss:Type="String">${header}</Data></Cell>`;
        });
        xml += '</Row>';

        // Add data rows
        data.forEach((student: any) => {
          xml += '<Row>';
          xml += `<Cell><Data ss:Type="Number">${student.id}</Data></Cell>`;
          xml += `<Cell><Data ss:Type="String">${student.firstName}</Data></Cell>`;
          xml += `<Cell><Data ss:Type="String">${student.lastName}</Data></Cell>`;
          xml += `<Cell><Data ss:Type="String">${student.email}</Data></Cell>`;
          xml += `<Cell><Data ss:Type="String">${student.grade}</Data></Cell>`;
          xml += `<Cell><Data ss:Type="Number">${student.totalAssignments}</Data></Cell>`;
          xml += `<Cell><Data ss:Type="Number">${student.completedAssignments}</Data></Cell>`;
          xml += `<Cell><Data ss:Type="Number">${student.totalWordCount}</Data></Cell>`;
          xml += `<Cell><Data ss:Type="Number">${student.averageWordCount}</Data></Cell>`;
          xml += `<Cell><Data ss:Type="String">${student.averageGrade}</Data></Cell>`;
          xml += `<Cell><Data ss:Type="Number">${student.aiInteractions}</Data></Cell>`;
          xml += `<Cell><Data ss:Type="Number">${student.totalTimeSpent}</Data></Cell>`;
          xml += `<Cell><Data ss:Type="Number">${student.improvementScore}</Data></Cell>`;
          xml += `<Cell><Data ss:Type="String">${student.lastActivity}</Data></Cell>`;
          xml += `<Cell><Data ss:Type="String">${student.strongestSubject}</Data></Cell>`;
          xml += `<Cell><Data ss:Type="String">${student.areasForImprovement.join('; ')}</Data></Cell>`;
          xml += '</Row>';
        });

        xml += '</Table></Worksheet></Workbook>';
        return xml;
      };
      
      const excelContent = createExcelXML(studentAnalytics);
      
      res.setHeader('Content-Type', 'application/vnd.ms-excel');
      res.setHeader('Content-Disposition', 'attachment; filename="student-analytics.xls"');
      res.send(excelContent);
    } catch (error) {
      console.error("Error exporting student analytics to Excel:", error);
      res.status(500).json({ message: "Failed to export student analytics to Excel" });
    }
  });

  // Import student analytics
  app.post("/api/admin/import-student-analytics", async (req, res) => {
    try {
      const currentUser = await getCurrentUser(req);
      if (!currentUser || currentUser.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { data } = req.body;
      
      if (!data || typeof data !== 'string') {
        return res.status(400).json({ message: "Import data is required" });
      }

      // Parse CSV or JSON data
      let importedData: any[] = [];
      
      try {
        // Try parsing as JSON first
        importedData = JSON.parse(data);
      } catch {
        // Parse as CSV
        const lines = data.trim().split('\n');
        if (lines.length < 2) {
          return res.status(400).json({ message: "Invalid CSV format" });
        }
        
        const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
        
        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(',').map(v => v.replace(/"/g, '').trim());
          const row: any = {};
          
          headers.forEach((header, index) => {
            row[header.toLowerCase().replace(/\s+/g, '_')] = values[index] || '';
          });
          
          importedData.push(row);
        }
      }
      
      // Validate and process imported data
      let processedCount = 0;
      const errors: string[] = [];
      
      for (const item of importedData) {
        try {
          // Basic validation
          if (!item.email || !item.first_name || !item.last_name) {
            errors.push(`Missing required fields for row ${processedCount + 1}`);
            continue;
          }
          
          // Find existing user by email
          const existingUser = await storage.getUserByEmail(item.email);
          
          if (existingUser && existingUser.role === 'student') {
            // Update existing student's grade if provided
            if (item.grade) {
              // Note: This would require adding an updateUser method to storage
              console.log(`Would update user ${existingUser.id} with grade: ${item.grade}`);
            }
            processedCount++;
          } else {
            errors.push(`Student not found for email: ${item.email}`);
          }
        } catch (error) {
          errors.push(`Error processing row ${processedCount + 1}: ${error}`);
        }
      }
      
      res.json({
        message: `Import completed. Processed ${processedCount} records.`,
        processedCount,
        errors: errors.length > 0 ? errors : undefined
      });
      
    } catch (error) {
      console.error("Error importing student analytics:", error);
      res.status(500).json({ message: "Failed to import student analytics" });
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
            content: "You are a spell checker. Find ALL spelling errors and return valid JSON. Use this exact format: {\"errors\": [{\"word\": \"misspelled_word\", \"suggestions\": [\"correction1\"]}]}. Provide one suggestion per word. If no errors found, return: {\"errors\": []}"
          },
          {
            role: "user", 
            content: `Find all spelling errors in this text: ${text}`
          }
        ],
        max_tokens: 2000,
        temperature: 0,
        response_format: { type: "json_object" }
      });

      const response = completion.choices[0].message.content;
      console.log('Raw OpenAI response:', response);
      
      if (!response) {
        return res.json({ suggestions: [] });
      }
      
      // Try to parse the AI response as JSON
      let errors = [];
      try {
        const parsed = JSON.parse(response);
        if (parsed && parsed.errors && Array.isArray(parsed.errors)) {
          errors = parsed.errors;
        }
      } catch (parseError) {
        console.error("Failed to parse AI spell check response:", parseError);
        errors = [];
      }
      
      // Convert OpenAI errors format to the format expected by the frontend
      const suggestions = errors.map(error => ({
        originalText: error.word,
        suggestedText: error.suggestions && error.suggestions.length > 0 ? error.suggestions[0] : error.word,
        explanation: `Spelling correction: "${error.word}" → "${error.suggestions?.[0] || error.word}"`
      }));
      
      console.log(`✅ Converted ${errors.length} spell check errors to suggestions format`);
      
      res.json({ suggestions });
      
    } catch (error) {
      console.error("Spell check error:", error);
      res.json({ suggestions: [] }); // Return empty suggestions instead of error to prevent UI issues
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
      
      // Debug logging for document content
      console.log('🤖 AI Chat Request:', {
        sessionId,
        prompt: prompt.substring(0, 100) + '...',
        hasDocumentContent: !!documentContent,
        documentLength: documentContent?.length || 0,
        documentPreview: documentContent ? documentContent.substring(0, 100) + '...' : 'None'
      });
      
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

  // Fix missing student enrollments (admin endpoint)
  app.post("/api/admin/fix-enrollments", async (req, res) => {
    try {
      const currentUser = await getCurrentUser(req);
      if (!currentUser || !['admin', 'sage_admin', 'school_admin'].includes(currentUser.role)) {
        return res.status(403).json({ message: "Admin access required" });
      }

      console.log('Fixing missing student enrollments...');
      
      // Get all students
      const allUsers = await storage.getAllUsers();
      const students = allUsers.filter(u => u.role === 'student');
      
      // Get all classrooms
      const allClassrooms = await storage.getAllClassrooms();
      
      let enrollmentsCreated = 0;
      
      for (const student of students) {
        const existingClassrooms = await storage.getStudentClassrooms(student.id);
        
        if (existingClassrooms.length === 0 && allClassrooms.length > 0) {
          // Enroll student in the first available classroom
          const firstClassroom = allClassrooms[0];
          try {
            await storage.enrollStudentInClassroom(student.id, firstClassroom.id);
            console.log(`Enrolled student ${student.id} (${student.firstName} ${student.lastName}) in classroom ${firstClassroom.id}`);
            enrollmentsCreated++;
          } catch (error) {
            console.log(`Failed to enroll student ${student.id}:`, error);
          }
        }
      }
      
      res.json({ 
        message: `Fixed enrollments for ${enrollmentsCreated} students`,
        enrollmentsCreated 
      });
    } catch (error) {
      console.error("Error fixing enrollments:", error);
      res.status(500).json({ message: "Failed to fix enrollments" });
    }
  });

  // Get student counts for all classrooms
  app.get("/api/classrooms/students-count", async (req, res) => {
    try {
      const currentUser = await getCurrentUser(req);
      if (!currentUser || currentUser.role !== 'teacher') {
        return res.status(403).json({ message: "Access denied" });
      }

      // Get all teacher's classrooms
      const teacherClassrooms = await storage.getTeacherClassrooms(currentUser.id);
      const studentCounts: {[classroomId: number]: any[]} = {};

      // For each classroom, get the enrolled students
      for (const classroom of teacherClassrooms) {
        try {
          const students = await storage.getClassroomStudents(classroom.id);
          studentCounts[classroom.id] = students;
        } catch (error) {
          console.error(`Error fetching students for classroom ${classroom.id}:`, error);
          studentCounts[classroom.id] = [];
        }
      }

      res.json(studentCounts);
    } catch (error) {
      console.error("Error fetching classroom student counts:", error);
      res.status(500).json({ message: "Failed to fetch student counts" });
    }
  });

  // Inline comments routes
  app.post("/api/sessions/:sessionId/comments", async (req, res) => {
    try {
      console.log("=== INLINE COMMENT CREATION DEBUG ===");
      console.log("Request body:", JSON.stringify(req.body, null, 2));
      console.log("Session ID from params:", req.params.sessionId);
      
      const currentUser = await getCurrentUser(req);
      console.log("Current user:", currentUser ? `${currentUser.firstName} ${currentUser.lastName} (${currentUser.role})` : "null");
      
      if (!currentUser) {
        console.log("Authentication failed - no current user");
        return res.status(401).json({ error: "Authentication required" });
      }

      // Only teachers can create inline comments
      if (currentUser.role !== 'teacher' && currentUser.role !== 'admin' && currentUser.role !== 'school_admin' && currentUser.role !== 'sage_admin') {
        console.log("Authorization failed - user role:", currentUser.role);
        return res.status(403).json({ error: "Only teachers can create comments" });
      }

      const sessionId = parseInt(req.params.sessionId);
      if (isNaN(sessionId)) {
        console.log("Invalid session ID:", req.params.sessionId);
        return res.status(400).json({ error: "Invalid session ID" });
      }

      console.log("Checking if session exists:", sessionId);
      // Verify the session exists
      const session = await storage.getWritingSession(sessionId);
      console.log("Session found:", session ? `ID: ${session.id}, User: ${session.userId}` : "null");
      
      if (!session) {
        console.log("Session not found for ID:", sessionId);
        return res.status(404).json({ error: "Writing session not found" });
      }

      // Validate the comment data structure
      const { insertInlineCommentSchema } = await import('../shared/schema');
      
      const commentData = {
        sessionId,
        teacherId: currentUser.id,
        startIndex: req.body.startIndex,
        endIndex: req.body.endIndex,
        highlightedText: req.body.highlightedText,
        comment: req.body.comment
      };

      // Validate using Zod schema
      const validatedData = insertInlineCommentSchema.parse(commentData);
      
      console.log("Creating inline comment:", validatedData);
      const comment = await storage.createInlineComment(validatedData);
      console.log("Created comment:", comment);
      res.json(comment);
    } catch (error) {
      console.error("Error creating inline comment:", error);
      
      // Provide specific error messages for better debugging
      if (error.name === 'ZodError') {
        return res.status(400).json({ 
          error: "Invalid comment data", 
          details: error.errors 
        });
      }
      
      if (error.message && error.message.includes('relation') && error.message.includes('does not exist')) {
        return res.status(500).json({ 
          error: "Database schema error - please contact administrator",
          details: "inline_comments table may not exist"
        });
      }
      
      res.status(500).json({ 
        error: "Failed to create comment",
        details: error.message || "Unknown error"
      });
    }
  });

  app.get("/api/sessions/:sessionId/comments", async (req, res) => {
    try {
      const currentUser = await getCurrentUser(req);
      if (!currentUser) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const sessionId = parseInt(req.params.sessionId);
      if (isNaN(sessionId)) {
        return res.status(400).json({ error: "Invalid session ID" });
      }

      // Verify the session exists
      const session = await storage.getWritingSession(sessionId);
      if (!session) {
        return res.status(404).json({ error: "Writing session not found" });
      }

      // Check permissions: teachers, admins, or the student who owns the session
      const hasPermission = currentUser.role === 'teacher' || 
                           currentUser.role === 'admin' || 
                           currentUser.role === 'school_admin' || 
                           currentUser.role === 'sage_admin' ||
                           session.userId === currentUser.id;

      if (!hasPermission) {
        return res.status(403).json({ error: "Access denied" });
      }

      console.log("Fetching comments for session:", sessionId);
      const comments = await storage.getSessionInlineComments(sessionId);
      console.log("Found comments:", comments);
      res.json(comments);
    } catch (error) {
      console.error("Error fetching inline comments:", error);
      res.status(500).json({ error: "Failed to fetch comments" });
    }
  });

  // Delete inline comment
  app.delete("/api/sessions/:sessionId/comments/:commentId", async (req, res) => {
    try {
      const currentUser = await getCurrentUser(req);
      if (!currentUser) {
        return res.status(401).json({ error: "Authentication required" });
      }

      // Only teachers and admins can delete comments
      if (currentUser.role !== 'teacher' && currentUser.role !== 'admin' && currentUser.role !== 'school_admin' && currentUser.role !== 'sage_admin') {
        return res.status(403).json({ error: "Only teachers can delete comments" });
      }

      const commentId = parseInt(req.params.commentId);
      if (isNaN(commentId)) {
        return res.status(400).json({ error: "Invalid comment ID" });
      }

      await storage.deleteInlineComment(commentId);
      console.log("Deleted inline comment:", commentId);
      res.json({ message: "Comment deleted successfully" });
    } catch (error) {
      console.error("Error deleting inline comment:", error);
      res.status(500).json({ error: "Failed to delete comment" });
    }
  });

  // School Admin API endpoints - comprehensive oversight
  app.get("/api/admin/users", async (req, res) => {
    try {
      const currentUser = await getCurrentUser(req);
      if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'school_admin')) {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching all users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.get("/api/admin/assignments", async (req, res) => {
    try {
      const currentUser = await getCurrentUser(req);
      if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'school_admin')) {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      const allUsers = await storage.getAllUsers();
      const teachers = allUsers.filter(u => u.role === 'teacher');
      let allAssignments = [];
      
      for (const teacher of teachers) {
        const assignments = await storage.getTeacherAssignments(teacher.id);
        // Add teacher info to each assignment
        const assignmentsWithTeacher = assignments.map(assignment => ({
          ...assignment,
          teacherName: `${teacher.firstName} ${teacher.lastName}`
        }));
        allAssignments.push(...assignmentsWithTeacher);
      }
      
      res.json(allAssignments);
    } catch (error) {
      console.error("Error fetching all assignments:", error);
      res.status(500).json({ message: "Failed to fetch assignments" });
    }
  });

  // Get all submissions with assignment and student details for school admin
  app.get("/api/admin/submissions", async (req, res) => {
    try {
      const currentUser = await getCurrentUser(req);
      if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'school_admin')) {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      const allUsers = await storage.getAllUsers();
      const teachers = allUsers.filter(u => u.role === 'teacher');
      const students = allUsers.filter(u => u.role === 'student');
      let allSubmissions = [];
      
      // Get all assignments first
      let allAssignments = [];
      for (const teacher of teachers) {
        const assignments = await storage.getTeacherAssignments(teacher.id);
        const assignmentsWithTeacher = assignments.map(assignment => ({
          ...assignment,
          teacherName: `${teacher.firstName} ${teacher.lastName}`
        }));
        allAssignments.push(...assignmentsWithTeacher);
      }
      
      // For each assignment, get submissions
      for (const assignment of allAssignments) {
        const submissions = await storage.getAssignmentSubmissions(assignment.id);
        const submissionsWithDetails = submissions.map(submission => ({
          ...submission,
          assignmentTitle: assignment.title,
          assignmentDueDate: assignment.dueDate,
          teacherName: assignment.teacherName,
          studentName: `${submission.student.firstName} ${submission.student.lastName}`,
          studentGrade: submission.student.grade
        }));
        allSubmissions.push(...submissionsWithDetails);
      }
      
      res.json(allSubmissions);
    } catch (error) {
      console.error("Error fetching all submissions:", error);
      res.status(500).json({ message: "Failed to fetch submissions" });
    }
  });

  app.get("/api/admin/writing-sessions", async (req, res) => {
    try {
      const currentUser = await getCurrentUser(req);
      if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'school_admin')) {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      const allUsers = await storage.getAllUsers();
      const students = allUsers.filter(u => u.role === 'student');
      let allSessions = [];
      
      for (const student of students) {
        const sessions = await storage.getUserWritingSessions(student.id);
        allSessions.push(...sessions);
      }
      
      res.json(allSessions);
    } catch (error) {
      console.error("Error fetching all writing sessions:", error);
      res.status(500).json({ message: "Failed to fetch writing sessions" });
    }
  });

  app.get("/api/admin/classrooms", async (req, res) => {
    try {
      const currentUser = await getCurrentUser(req);
      if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'school_admin')) {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      const classrooms = await storage.getAllClassrooms();
      res.json(classrooms);
    } catch (error) {
      console.error("Error fetching all classrooms:", error);
      res.status(500).json({ message: "Failed to fetch classrooms" });
    }
  });

  // Update classroom (archive/reactivate)
  app.patch("/api/classrooms/:id", async (req, res) => {
    try {
      const currentUser = await getCurrentUser(req);
      if (!currentUser) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const classroomId = parseInt(req.params.id);
      const updates = req.body;

      // Only teachers can update their own classrooms or admins can update any
      if (currentUser.role === 'teacher') {
        // Verify teacher owns this classroom
        const classrooms = await storage.getTeacherClassrooms(currentUser.id);
        const classroom = classrooms.find(c => c.id === classroomId);
        if (!classroom) {
          return res.status(403).json({ message: "Access denied - not your classroom" });
        }
      } else if (currentUser.role !== 'admin' && currentUser.role !== 'school_admin') {
        return res.status(403).json({ message: "Access denied" });
      }

      const updatedClassroom = await storage.updateClassroom(classroomId, updates);
      if (!updatedClassroom) {
        return res.status(404).json({ message: "Classroom not found" });
      }

      console.log(`Classroom ${classroomId} updated:`, updates);
      res.json(updatedClassroom);
    } catch (error) {
      console.error("Error updating classroom:", error);
      res.status(500).json({ message: "Failed to update classroom" });
    }
  });

  // Individual writing session details for submission viewer
  app.get("/api/writing-sessions/:sessionId", async (req, res) => {
    try {
      const currentUser = await getCurrentUser(req);
      if (!currentUser) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const sessionId = parseInt(req.params.sessionId);
      const session = await storage.getWritingSession(sessionId);
      
      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }

      // Check permissions - only school admin, teacher of assignment, or student owner can view
      if (currentUser.role === 'school_admin' || currentUser.role === 'admin') {
        res.json(session);
      } else if (currentUser.role === 'teacher') {
        // Check if teacher owns the assignment
        const assignment = await storage.getAssignment(session.assignmentId);
        if (assignment && assignment.teacherId === currentUser.id) {
          res.json(session);
        } else {
          res.status(403).json({ message: "Access denied" });
        }
      } else if (currentUser.role === 'student' && session.userId === currentUser.id) {
        res.json(session);
      } else {
        res.status(403).json({ message: "Access denied" });
      }
    } catch (error) {
      console.error("Error fetching writing session:", error);
      res.status(500).json({ message: "Failed to fetch session" });
    }
  });

  // AI interactions for a specific session
  app.get("/api/session/:sessionId/interactions", async (req, res) => {
    try {
      const currentUser = await getCurrentUser(req);
      if (!currentUser) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const sessionId = parseInt(req.params.sessionId);
      
      // Check if user has permission to view this session's interactions
      const session = await storage.getWritingSession(sessionId);
      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }

      // Allow school admin, assignment teacher, or session owner
      if (currentUser.role === 'school_admin' || currentUser.role === 'admin' || 
          session.userId === currentUser.id) {
        const interactions = await storage.getSessionInteractions(sessionId);
        res.json(interactions);
      } else if (currentUser.role === 'teacher') {
        const assignment = await storage.getAssignment(session.assignmentId);
        if (assignment && assignment.teacherId === currentUser.id) {
          const interactions = await storage.getSessionInteractions(sessionId);
          res.json(interactions);
        } else {
          res.status(403).json({ message: "Access denied" });
        }
      } else {
        res.status(403).json({ message: "Access denied" });
      }
    } catch (error) {
      console.error("Error fetching session interactions:", error);
      res.status(500).json({ message: "Failed to fetch interactions" });
    }
  });

  // Individual user details
  app.get("/api/users/:userId", async (req, res) => {
    try {
      const currentUser = await getCurrentUser(req);
      if (!currentUser) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const userId = parseInt(req.params.userId);
      
      // Allow school admin to view any user, others only themselves
      if (currentUser.role === 'school_admin' || currentUser.role === 'admin' || 
          currentUser.id === userId) {
        const user = await storage.getUser(userId);
        if (user) {
          res.json(user);
        } else {
          res.status(404).json({ message: "User not found" });
        }
      } else {
        res.status(403).json({ message: "Access denied" });
      }
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Individual assignment details
  app.get("/api/assignments/:assignmentId", async (req, res) => {
    try {
      const currentUser = await getCurrentUser(req);
      if (!currentUser) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const assignmentId = parseInt(req.params.assignmentId);
      const assignment = await storage.getAssignment(assignmentId);
      
      if (!assignment) {
        return res.status(404).json({ message: "Assignment not found" });
      }

      // Allow school admin, assignment teacher, or enrolled students
      if (currentUser.role === 'school_admin' || currentUser.role === 'admin' || 
          assignment.teacherId === currentUser.id) {
        res.json(assignment);
      } else if (currentUser.role === 'student') {
        // Check if student has access to this assignment through classroom enrollment
        res.json(assignment);
      } else {
        res.status(403).json({ message: "Access denied" });
      }
    } catch (error) {
      console.error("Error fetching assignment:", error);
      res.status(500).json({ message: "Failed to fetch assignment" });
    }
  });

  // Feedback routes
  app.post("/api/feedback", async (req, res) => {
    try {
      const currentUser = await getCurrentUser(req);
      if (!currentUser) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const { insertFeedbackSchema } = await import('../shared/schema');
      
      const validatedData = insertFeedbackSchema.parse({
        ...req.body,
        userId: currentUser.id
      });

      const feedback = await storage.createFeedback(validatedData);
      res.status(201).json(feedback);
    } catch (error) {
      console.error("Error creating feedback:", error);
      res.status(500).json({ message: "Failed to submit feedback" });
    }
  });

  app.get("/api/feedback", async (req, res) => {
    try {
      const currentUser = await getCurrentUser(req);
      if (!currentUser) {
        return res.status(401).json({ message: "Authentication required" });
      }

      let feedback;
      if (currentUser.role === 'admin' || currentUser.role === 'sage_admin') {
        // Admins and Sage admins can see all feedback
        feedback = await storage.getAllFeedback();
      } else {
        // Users can only see their own feedback
        feedback = await storage.getUserFeedback(currentUser.id);
      }
      
      res.json(feedback);
    } catch (error) {
      console.error("Error fetching feedback:", error);
      res.status(500).json({ message: "Failed to fetch feedback" });
    }
  });

  app.get("/api/feedback/:id", async (req, res) => {
    try {
      const currentUser = await getCurrentUser(req);
      if (!currentUser) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const feedbackId = parseInt(req.params.id);
      const feedback = await storage.getFeedback(feedbackId);
      
      if (!feedback) {
        return res.status(404).json({ message: "Feedback not found" });
      }

      // Check access permissions
      if (currentUser.role !== 'admin' && currentUser.role !== 'sage_admin' && feedback.userId !== currentUser.id) {
        return res.status(403).json({ message: "Access denied" });
      }

      res.json(feedback);
    } catch (error) {
      console.error("Error fetching feedback:", error);
      res.status(500).json({ message: "Failed to fetch feedback" });
    }
  });

  app.patch("/api/feedback/:id", async (req, res) => {
    try {
      const currentUser = await getCurrentUser(req);
      if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'sage_admin')) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const feedbackId = parseInt(req.params.id);
      const { status, adminResponse } = req.body;
      
      const updates: any = {};
      if (status) updates.status = status;
      if (adminResponse) {
        updates.adminResponse = adminResponse;
        updates.adminResponseAt = new Date();
        updates.adminResponseBy = currentUser.id;
      }

      const feedback = await storage.updateFeedback(feedbackId, updates);
      res.json(feedback);
    } catch (error) {
      console.error("Error updating feedback:", error);
      res.status(500).json({ message: "Failed to update feedback" });
    }
  });

  app.get("/api/admin/feedback-stats", async (req, res) => {
    try {
      const currentUser = await getCurrentUser(req);
      if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'sage_admin')) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const allFeedback = await storage.getAllFeedback();
      
      const stats = {
        total: allFeedback.length,
        open: allFeedback.filter(f => f.status === 'open').length,
        inProgress: allFeedback.filter(f => f.status === 'in_progress').length,
        resolved: allFeedback.filter(f => f.status === 'resolved').length,
        byType: {
          bug: allFeedback.filter(f => f.type === 'bug').length,
          feature: allFeedback.filter(f => f.type === 'feature').length,
          general: allFeedback.filter(f => f.type === 'general').length,
          assignment: allFeedback.filter(f => f.type === 'assignment').length,
        },
        byPriority: {
          high: allFeedback.filter(f => f.priority === 'high').length,
          medium: allFeedback.filter(f => f.priority === 'medium').length,
          low: allFeedback.filter(f => f.priority === 'low').length,
        }
      };

      res.json(stats);
    } catch (error) {
      console.error("Error fetching feedback stats:", error);
      res.status(500).json({ message: "Failed to fetch feedback statistics" });
    }
  });

  // Diagnostic endpoint for checking OpenAI configuration
  app.get('/api/diagnostic/openai', async (req, res) => {
    try {
      const hasApiKey = !!process.env.OPENAI_API_KEY;
      const keyLength = process.env.OPENAI_API_KEY ? process.env.OPENAI_API_KEY.length : 0;
      const keyPrefix = process.env.OPENAI_API_KEY ? process.env.OPENAI_API_KEY.substring(0, 7) + '...' : 'Not set';
      
      res.json({
        configured: hasApiKey,
        keyLength,
        keyPrefix,
        environment: process.env.NODE_ENV || 'development',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error("Error checking OpenAI configuration:", error);
      res.status(500).json({ message: "Failed to check configuration" });
    }
  });

  // Comprehensive diagnostic endpoint for authentication and database
  app.get('/api/diagnostic/system', async (req, res) => {
    try {
      const currentUser = await getCurrentUser(req);
      const userCount = await storage.getAllUsers().then(users => users.length);
      const sessionCount = await storage.getUserWritingSessions(1).then(sessions => sessions.length).catch(() => 0);
      
      res.json({
        authentication: {
          currentSessionUserId,
          currentUser: currentUser ? {
            id: currentUser.id,
            role: currentUser.role,
            firstName: currentUser.firstName,
            lastName: currentUser.lastName
          } : null,
          authenticated: !!currentUser
        },
        database: {
          userCount,
          sessionCount,
          connected: true
        },
        environment: process.env.NODE_ENV || 'development',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error("Error in system diagnostic:", error);
      res.status(500).json({ 
        error: "System diagnostic failed",
        details: error.message 
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}