import { users, writingSessions, aiInteractions, type User, type InsertUser, type WritingSession, type InsertWritingSession, type AiInteraction, type InsertAiInteraction } from "@shared/schema";

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  getWritingSession(id: number): Promise<WritingSession | undefined>;
  createWritingSession(session: InsertWritingSession): Promise<WritingSession>;
  updateWritingSession(id: number, updates: Partial<InsertWritingSession>): Promise<WritingSession | undefined>;
  getUserWritingSessions(userId: number): Promise<WritingSession[]>;
  
  createAiInteraction(interaction: InsertAiInteraction): Promise<AiInteraction>;
  getSessionInteractions(sessionId: number): Promise<AiInteraction[]>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private writingSessions: Map<number, WritingSession>;
  private aiInteractions: Map<number, AiInteraction>;
  private currentUserId: number;
  private currentSessionId: number;
  private currentInteractionId: number;

  constructor() {
    this.users = new Map();
    this.writingSessions = new Map();
    this.aiInteractions = new Map();
    this.currentUserId = 1;
    this.currentSessionId = 1;
    this.currentInteractionId = 1;
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

  async getWritingSession(id: number): Promise<WritingSession | undefined> {
    return this.writingSessions.get(id);
  }

  async createWritingSession(insertSession: InsertWritingSession): Promise<WritingSession> {
    const id = this.currentSessionId++;
    const now = new Date();
    const session: WritingSession = {
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
