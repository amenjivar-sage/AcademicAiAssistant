import { db } from "./db";
import { eq, and } from "drizzle-orm";
import {
  users,
  assignments,
  writingSessions,
  aiInteractions,
  classrooms,
  classroomEnrollments,
  messages,
  inlineComments,
  type User,
  type InsertUser,
  type Assignment,
  type InsertAssignment,
  type WritingSession,
  type InsertWritingSession,
  type AiInteraction,
  type InsertAiInteraction,
  type Classroom,
  type InsertClassroom,
  type InlineComment,
  type InsertInlineComment,
  type Message,
  type InsertMessage,
} from "@shared/schema";
import type { IStorage } from "./storage";

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    console.log('Database username lookup for:', `"${username}"`);
    const [user] = await db.select().from(users).where(eq(users.username, username.trim()));
    console.log('Username database result:', user ? `Found: ${user.firstName} ${user.lastName}` : 'No user found');
    return user || undefined;
  }

  async createUser(userData: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(userData).returning();
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  async deleteUser(id: number): Promise<void> {
    console.log(`DatabaseStorage: Deleting user with ID ${id}`);
    const result = await db.delete(users).where(eq(users.id, id));
    console.log(`DatabaseStorage: Delete result:`, result);
  }

  async updateUserPassword(id: number, newPassword: string): Promise<void> {
    await db
      .update(users)
      .set({ password: newPassword, updatedAt: new Date() })
      .where(eq(users.id, id));
  }

  async updateUserStatus(id: number, isActive: boolean): Promise<void> {
    console.log(`DatabaseStorage: Updating user ${id} status to isActive=${isActive}`);
    const result = await db
      .update(users)
      .set({ isActive, updatedAt: new Date() })
      .where(eq(users.id, id));
    console.log(`DatabaseStorage: UpdateUserStatus result:`, result);
  }

  // Assignment operations
  async getAssignment(id: number): Promise<Assignment | undefined> {
    const [assignment] = await db.select().from(assignments).where(eq(assignments.id, id));
    return assignment || undefined;
  }

  async createAssignment(assignmentData: InsertAssignment): Promise<Assignment> {
    const [assignment] = await db.insert(assignments).values(assignmentData).returning();
    return assignment;
  }

  async updateAssignment(id: number, updates: Partial<InsertAssignment>): Promise<Assignment | undefined> {
    const [assignment] = await db
      .update(assignments)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(assignments.id, id))
      .returning();
    return assignment || undefined;
  }

  async getTeacherAssignments(teacherId: number): Promise<Assignment[]> {
    return await db.select().from(assignments).where(eq(assignments.teacherId, teacherId));
  }

  async markAssignmentComplete(id: number): Promise<Assignment | undefined> {
    const [assignment] = await db
      .update(assignments)
      .set({ status: "completed", updatedAt: new Date() })
      .where(eq(assignments.id, id))
      .returning();
    return assignment || undefined;
  }

  async checkOverdueAssignments(): Promise<Assignment[]> {
    const now = new Date();
    
    // First update overdue assignments
    await db
      .update(assignments)
      .set({ status: "overdue", updatedAt: new Date() })
      .where(and(
        eq(assignments.status, "active")
        // Note: We would need to add a dueDate comparison here if the column exists
      ));

    // Then return the overdue assignments
    return await db.select().from(assignments).where(eq(assignments.status, "overdue"));
  }

  // Writing session operations
  async getWritingSession(id: number): Promise<WritingSession | undefined> {
    console.log('DatabaseStorage.getWritingSession called with ID:', id);
    
    // Add retry logic for database read consistency
    let attempts = 0;
    const maxAttempts = 5;
    const baseDelay = 50; // Start with 50ms
    
    while (attempts < maxAttempts) {
      try {
        const sessions = await db.select().from(writingSessions).where(eq(writingSessions.id, id));
        const session = sessions[0];
        
        if (session) {
          console.log('Found session:', session.id, 'Title:', session.title, 'Content length:', session.content?.length || 0);
          return {
            ...session,
            pastedContent: session.pastedContent || []
          };
        }
        
        attempts++;
        if (attempts < maxAttempts) {
          const delay = baseDelay * Math.pow(2, attempts - 1); // Exponential backoff
          console.log(`Session ${id} not found, retrying in ${delay}ms... (attempt ${attempts}/${maxAttempts})`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      } catch (error) {
        console.error(`Database error in getWritingSession (attempt ${attempts + 1}):`, error);
        attempts++;
        if (attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, baseDelay * attempts));
        }
      }
    }
    
    console.error(`Session ${id} not found after ${maxAttempts} attempts`);
    return undefined;
  }

  async createWritingSession(sessionData: InsertWritingSession): Promise<WritingSession> {
    console.log('Creating session with data:', sessionData);
    const [session] = await db.insert(writingSessions).values({
      ...sessionData,
      pastedContent: sessionData.pastedContent || []
    }).returning();
    
    console.log('Session created in database:', session.id);
    
    // Immediately verify the session was created and can be retrieved
    const verification = await db.select().from(writingSessions).where(eq(writingSessions.id, session.id));
    if (verification.length === 0) {
      console.error('CRITICAL: Session was created but cannot be retrieved immediately');
      throw new Error('Session creation verification failed');
    }
    
    console.log('Session creation verified successfully:', session.id);
    return {
      ...session,
      pastedContent: session.pastedContent || []
    };
  }

  async updateWritingSession(id: number, updates: Partial<InsertWritingSession>): Promise<WritingSession | undefined> {
    const [session] = await db
      .update(writingSessions)
      .set({ 
        ...updates, 
        updatedAt: new Date(),
        pastedContent: updates.pastedContent || []
      })
      .where(eq(writingSessions.id, id))
      .returning();
    return session ? {
      ...session,
      pastedContent: session.pastedContent || []
    } : undefined;
  }

  async getUserWritingSessions(userId: number): Promise<WritingSession[]> {
    const sessions = await db.select().from(writingSessions).where(eq(writingSessions.userId, userId));
    return sessions.map(session => ({
      ...session,
      pastedContent: session.pastedContent || []
    }));
  }

  async getAssignmentSubmissions(assignmentId: number): Promise<(WritingSession & { student: User })[]> {
    const sessions = await db
      .select({
        id: writingSessions.id,
        userId: writingSessions.userId,
        assignmentId: writingSessions.assignmentId,
        title: writingSessions.title,
        content: writingSessions.content,
        wordCount: writingSessions.wordCount,
        status: writingSessions.status,
        submittedAt: writingSessions.submittedAt,
        teacherFeedback: writingSessions.teacherFeedback,
        grade: writingSessions.grade,
        pastedContent: writingSessions.pastedContent,
        createdAt: writingSessions.createdAt,
        updatedAt: writingSessions.updatedAt,
        student: {
          id: users.id,
          username: users.username,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
          role: users.role,
          department: users.department,
          grade: users.grade,
          createdAt: users.createdAt,
          updatedAt: users.updatedAt,
        }
      })
      .from(writingSessions)
      .leftJoin(users, eq(writingSessions.userId, users.id))
      .where(eq(writingSessions.assignmentId, assignmentId));

    return sessions.map(session => ({
      ...session,
      student: session.student!
    })) as (WritingSession & { student: User })[];
  }

  // AI interaction operations
  async createAiInteraction(interactionData: InsertAiInteraction): Promise<AiInteraction> {
    const [interaction] = await db.insert(aiInteractions).values(interactionData).returning();
    return interaction;
  }

  async getSessionInteractions(sessionId: number): Promise<AiInteraction[]> {
    return await db.select().from(aiInteractions).where(eq(aiInteractions.sessionId, sessionId));
  }

  // Grading operations
  async gradeWritingSession(sessionId: number, gradeData: { grade: string; teacherFeedback: string; status: string }): Promise<WritingSession | undefined> {
    const [session] = await db
      .update(writingSessions)
      .set({ 
        grade: gradeData.grade,
        teacherFeedback: gradeData.teacherFeedback,
        status: gradeData.status,
        updatedAt: new Date()
      })
      .where(eq(writingSessions.id, sessionId))
      .returning();
    return session || undefined;
  }

  // Message operations
  async createMessage(messageData: InsertMessage): Promise<Message> {
    const [message] = await db.insert(messages).values(messageData).returning();
    return message;
  }

  async getUserInboxMessages(userId: number): Promise<(Message & { sender: User })[]> {
    const messagesData = await db
      .select({
        id: messages.id,
        senderId: messages.senderId,
        receiverId: messages.receiverId,
        subject: messages.subject,
        content: messages.content,
        isRead: messages.isRead,
        createdAt: messages.createdAt,
        sender: {
          id: users.id,
          username: users.username,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
          role: users.role,
          department: users.department,
          grade: users.grade,
          createdAt: users.createdAt,
          updatedAt: users.updatedAt,
        }
      })
      .from(messages)
      .leftJoin(users, eq(messages.senderId, users.id))
      .where(eq(messages.receiverId, userId));

    return messagesData.map(msg => ({
      ...msg,
      sender: msg.sender!
    })) as (Message & { sender: User })[];
  }

  async getUserSentMessages(userId: number): Promise<(Message & { receiver: User })[]> {
    const messagesData = await db
      .select({
        id: messages.id,
        senderId: messages.senderId,
        receiverId: messages.receiverId,
        subject: messages.subject,
        content: messages.content,
        isRead: messages.isRead,
        createdAt: messages.createdAt,
        receiver: {
          id: users.id,
          username: users.username,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
          role: users.role,
          department: users.department,
          grade: users.grade,
          createdAt: users.createdAt,
          updatedAt: users.updatedAt,
        }
      })
      .from(messages)
      .leftJoin(users, eq(messages.receiverId, users.id))
      .where(eq(messages.senderId, userId));

    return messagesData.map(msg => ({
      ...msg,
      receiver: msg.receiver!
    })) as (Message & { receiver: User })[];
  }

  async markMessageAsRead(messageId: number): Promise<void> {
    await db.update(messages).set({ isRead: true }).where(eq(messages.id, messageId));
  }

  async getAvailableRecipients(userRole: string): Promise<User[]> {
    const targetRole = userRole === "teacher" ? "student" : "teacher";
    return await db.select().from(users).where(eq(users.role, targetRole));
  }

  // Classroom operations
  async createClassroom(classroomData: InsertClassroom): Promise<Classroom> {
    const joinCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    const [classroom] = await db.insert(classrooms).values({
      ...classroomData,
      joinCode,
      classSize: classroomData.classSize || 30,
    }).returning();
    return classroom;
  }

  async getTeacherClassrooms(teacherId: number): Promise<Classroom[]> {
    return await db.select().from(classrooms).where(eq(classrooms.teacherId, teacherId));
  }

  async getAllClassrooms(): Promise<Classroom[]> {
    return await db.select().from(classrooms);
  }

  async getStudentClassrooms(studentId: number): Promise<Classroom[]> {
    const classroomData = await db
      .select({
        id: classrooms.id,
        teacherId: classrooms.teacherId,
        name: classrooms.name,
        description: classrooms.description,
        subject: classrooms.subject,
        gradeLevel: classrooms.gradeLevel,
        classSize: classrooms.classSize,
        isActive: classrooms.isActive,
        joinCode: classrooms.joinCode,
        createdAt: classrooms.createdAt,
        updatedAt: classrooms.updatedAt,
      })
      .from(classrooms)
      .leftJoin(classroomEnrollments, eq(classrooms.id, classroomEnrollments.classroomId))
      .where(
        and(
          eq(classroomEnrollments.studentId, studentId),
          eq(classrooms.isActive, true)
        )
      );

    return classroomData;
  }

  async getClassroomStudents(classroomId: number): Promise<User[]> {
    const studentData = await db
      .select({
        id: users.id,
        username: users.username,
        email: users.email,
        password: users.password,
        firstName: users.firstName,
        lastName: users.lastName,
        role: users.role,
        department: users.department,
        grade: users.grade,
        isActive: users.isActive,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(users)
      .leftJoin(classroomEnrollments, eq(users.id, classroomEnrollments.studentId))
      .where(
        and(
          eq(classroomEnrollments.classroomId, classroomId),
          eq(users.role, 'student'),
          eq(users.isActive, true)
        )
      );

    return studentData;
  }

  async enrollStudentInClassroom(studentId: number, classroomId: number): Promise<void> {
    await db.insert(classroomEnrollments).values({
      studentId,
      classroomId
    });
  }

  async updateClassroom(id: number, updates: Partial<InsertClassroom>): Promise<Classroom | undefined> {
    const [classroom] = await db
      .update(classrooms)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(classrooms.id, id))
      .returning();
    return classroom || undefined;
  }

  // Inline comment operations
  async createInlineComment(commentData: InsertInlineComment): Promise<InlineComment> {
    const [comment] = await db.insert(inlineComments).values(commentData).returning();
    return comment;
  }

  async getSessionInlineComments(sessionId: number): Promise<InlineComment[]> {
    return await db.select().from(inlineComments).where(eq(inlineComments.sessionId, sessionId));
  }

  async deleteInlineComment(commentId: number): Promise<void> {
    await db.delete(inlineComments).where(eq(inlineComments.id, commentId));
  }

  // User email lookup method
  async getUserByEmail(email: string): Promise<User | undefined> {
    console.log('Database lookup for email:', email);
    const [user] = await db.select().from(users).where(eq(users.email, email));
    console.log('Database result:', user ? `Found user: ${user.firstName} ${user.lastName}` : 'No user found');
    return user;
  }

  // Student profile methods (simplified for now)
  async getStudentProfile(userId: number): Promise<any | undefined> {
    // Return basic user info as profile for now
    const user = await this.getUser(userId);
    return user ? { userId: user.id, name: `${user.firstName} ${user.lastName}` } : undefined;
  }

  async createStudentProfile(profile: any): Promise<any> {
    // For now, just return the profile data
    return profile;
  }

  async updateStudentProfile(userId: number, updates: any): Promise<any | undefined> {
    // For now, just return the updates
    return { userId, ...updates };
  }

  async updateLearningProgress(userId: number, interactionData: any): Promise<void> {
    // For now, just log the progress update
    console.log(`Learning progress updated for user ${userId}:`, interactionData);
  }
}