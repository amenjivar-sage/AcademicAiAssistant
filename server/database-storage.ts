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
    const [user] = await db.select().from(users).where(eq(users.username, username));
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
    await db.delete(users).where(eq(users.id, id));
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
    try {
      const [session] = await db.select().from(writingSessions).where(eq(writingSessions.id, id));
      console.log('Query returned session:', session ? 'found' : 'not found');
      if (session) {
        console.log('Found session:', session.id, 'Title:', session.title, 'Content length:', session.content?.length || 0);
        // Ensure pastedContent is properly handled
        return {
          ...session,
          pastedContent: session.pastedContent || []
        };
      } else {
        console.log('No session found with ID:', id);
        return undefined;
      }
    } catch (error) {
      console.error('Database error in getWritingSession:', error);
      return undefined;
    }
  }

  async createWritingSession(sessionData: InsertWritingSession): Promise<WritingSession> {
    const [session] = await db.insert(writingSessions).values({
      ...sessionData,
      pastedContent: sessionData.pastedContent || []
    }).returning();
    return {
      ...session,
      pastedContent: session.pastedContent || []
    };
  }

  async updateWritingSession(id: number, updates: Partial<InsertWritingSession>): Promise<WritingSession | undefined> {
    const [session] = await db
      .update(writingSessions)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(writingSessions.id, id))
      .returning();
    return session || undefined;
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
      .where(eq(classroomEnrollments.studentId, studentId));

    return classroomData;
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
}