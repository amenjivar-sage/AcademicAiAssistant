import { users, writingSessions, aiInteractions, assignments, type User, type InsertUser, type WritingSession, type InsertWritingSession, type AiInteraction, type InsertAiInteraction, type Assignment, type InsertAssignment } from "@shared/schema";

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  getAssignment(id: number): Promise<Assignment | undefined>;
  createAssignment(assignment: InsertAssignment): Promise<Assignment>;
  updateAssignment(id: number, updates: Partial<InsertAssignment>): Promise<Assignment | undefined>;
  getTeacherAssignments(teacherId: number): Promise<Assignment[]>;
  
  getWritingSession(id: number): Promise<WritingSession | undefined>;
  createWritingSession(session: InsertWritingSession): Promise<WritingSession>;
  updateWritingSession(id: number, updates: Partial<InsertWritingSession>): Promise<WritingSession | undefined>;
  getUserWritingSessions(userId: number): Promise<WritingSession[]>;
  getAssignmentSubmissions(assignmentId: number): Promise<WritingSession[]>;
  
  createAiInteraction(interaction: InsertAiInteraction): Promise<AiInteraction>;
  getSessionInteractions(sessionId: number): Promise<AiInteraction[]>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private assignments: Map<number, Assignment>;
  private writingSessions: Map<number, WritingSession>;
  private aiInteractions: Map<number, AiInteraction>;
  private currentUserId: number;
  private currentAssignmentId: number;
  private currentSessionId: number;
  private currentInteractionId: number;

  constructor() {
    this.users = new Map();
    this.assignments = new Map();
    this.writingSessions = new Map();
    this.aiInteractions = new Map();
    this.currentUserId = 1;
    this.currentAssignmentId = 1;
    this.currentSessionId = 1;
    this.currentInteractionId = 1;

    // Create default teacher and student accounts
    this.initializeDefaultUsers();
  }

  private async initializeDefaultUsers() {
    // Default teacher
    const teacher: User = {
      id: 1,
      username: "teacher",
      password: "password123",
      role: "teacher",
      firstName: "Sarah",
      lastName: "Johnson",
      email: "teacher@zoeedu.com"
    };
    this.users.set(1, teacher);

    // Default student
    const student: User = {
      id: 2,
      username: "student",
      password: "password123",
      role: "student",
      firstName: "Alex",
      lastName: "Smith",
      email: "student@zoeedu.com"
    };
    this.users.set(2, student);

    this.currentUserId = 3;
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async getAssignment(id: number): Promise<Assignment | undefined> {
    return this.assignments.get(id);
  }

  async createAssignment(insertAssignment: InsertAssignment): Promise<Assignment> {
    const id = this.currentAssignmentId++;
    const now = new Date();
    const assignment: Assignment = {
      ...insertAssignment,
      id,
      createdAt: now,
      updatedAt: now,
    };
    this.assignments.set(id, assignment);
    return assignment;
  }

  async updateAssignment(id: number, updates: Partial<InsertAssignment>): Promise<Assignment | undefined> {
    const assignment = this.assignments.get(id);
    if (!assignment) return undefined;

    const updatedAssignment: Assignment = {
      ...assignment,
      ...updates,
      updatedAt: new Date(),
    };
    this.assignments.set(id, updatedAssignment);
    return updatedAssignment;
  }

  async getTeacherAssignments(teacherId: number): Promise<Assignment[]> {
    return Array.from(this.assignments.values()).filter(
      (assignment) => assignment.teacherId === teacherId
    );
  }

  async getWritingSession(id: number): Promise<WritingSession | undefined> {
    return this.writingSessions.get(id);
  }

  async createWritingSession(insertSession: InsertWritingSession): Promise<WritingSession> {
    const id = this.currentSessionId++;
    const now = new Date();
    const session: WritingSession = {
      userId: null,
      assignmentId: null,
      content: "",
      wordCount: 0,
      status: "draft",
      submittedAt: null,
      teacherFeedback: null,
      grade: null,
      ...insertSession,
      id,
      createdAt: now,
      updatedAt: now,
    };
    this.writingSessions.set(id, session);
    return session;
  }

  async updateWritingSession(id: number, updates: Partial<InsertWritingSession>): Promise<WritingSession | undefined> {
    const session = this.writingSessions.get(id);
    if (!session) return undefined;

    const updatedSession: WritingSession = {
      ...session,
      ...updates,
      updatedAt: new Date(),
    };
    this.writingSessions.set(id, updatedSession);
    return updatedSession;
  }

  async getUserWritingSessions(userId: number): Promise<WritingSession[]> {
    return Array.from(this.writingSessions.values()).filter(
      (session) => session.userId === userId
    );
  }

  async getAssignmentSubmissions(assignmentId: number): Promise<WritingSession[]> {
    return Array.from(this.writingSessions.values()).filter(
      (session) => session.assignmentId === assignmentId
    );
  }

  async createAiInteraction(insertInteraction: InsertAiInteraction): Promise<AiInteraction> {
    const id = this.currentInteractionId++;
    const interaction: AiInteraction = {
      ...insertInteraction,
      id,
      createdAt: new Date(),
    };
    this.aiInteractions.set(id, interaction);
    return interaction;
  }

  async getSessionInteractions(sessionId: number): Promise<AiInteraction[]> {
    return Array.from(this.aiInteractions.values()).filter(
      (interaction) => interaction.sessionId === sessionId
    );
  }
}

export const storage = new MemStorage();
