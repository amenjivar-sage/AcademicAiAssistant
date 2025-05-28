import { users, writingSessions, aiInteractions, assignments, type User, type InsertUser, type WritingSession, type InsertWritingSession, type AiInteraction, type InsertAiInteraction, type Assignment, type InsertAssignment } from "@shared/schema";
import { drizzle } from "drizzle-orm/node-postgres";
import { eq } from "drizzle-orm";
import { Pool } from "pg";

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getAllUsers(): Promise<User[]>;
  deleteUser(id: number): Promise<void>;
  
  getAssignment(id: number): Promise<Assignment | undefined>;
  createAssignment(assignment: InsertAssignment): Promise<Assignment>;
  updateAssignment(id: number, updates: Partial<InsertAssignment>): Promise<Assignment | undefined>;
  getTeacherAssignments(teacherId: number): Promise<Assignment[]>;
  markAssignmentComplete(id: number): Promise<Assignment | undefined>;
  checkOverdueAssignments(): Promise<Assignment[]>;
  
  getWritingSession(id: number): Promise<WritingSession | undefined>;
  createWritingSession(session: InsertWritingSession): Promise<WritingSession>;
  updateWritingSession(id: number, updates: Partial<InsertWritingSession>): Promise<WritingSession | undefined>;
  getUserWritingSessions(userId: number): Promise<WritingSession[]>;
  getAssignmentSubmissions(assignmentId: number): Promise<WritingSession[]>;
  
  createAiInteraction(interaction: InsertAiInteraction): Promise<AiInteraction>;
  getSessionInteractions(sessionId: number): Promise<AiInteraction[]>;
  
  gradeWritingSession(sessionId: number, gradeData: { grade: string; teacherFeedback: string; status: string }): Promise<WritingSession | undefined>;
}

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const db = drizzle(pool);



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

    this.initializeDefaultUsers();
    this.initializeSampleSubmissions();
  }

  private initializeDefaultUsers() {
    // Default teacher
    const teacher: User = {
      id: 1,
      username: "teacher",
      password: "password123",
      role: "teacher",
      firstName: "Sarah",
      lastName: "Johnson",
      email: "teacher@sage.com"
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
      email: "student@sage.com"
    };
    this.users.set(2, student);

    this.currentUserId = 3;
  }

  private initializeSampleSubmissions() {
    // Create a sample assignment first
    const assignment: Assignment = {
      id: 1,
      teacherId: 1,
      title: "Personal Narrative Essay",
      description: "Write a personal narrative about a meaningful experience that changed your perspective. Your essay should include vivid details, clear chronological structure, and reflection on the significance of the event.",
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Due in 1 week
      status: "active",
      aiPermissions: "limited",
      allowBrainstorming: true,
      allowOutlining: true,
      allowGrammarCheck: true,
      allowResearchHelp: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.assignments.set(1, assignment);
    this.currentAssignmentId = 2;

    // Add more student users
    const maria: User = {
      id: 3,
      username: "maria.gonzalez",
      password: "password123",
      role: "student",
      firstName: "Maria",
      lastName: "Gonzalez",
      email: "maria.gonzalez@school.edu",
      department: null,
      grade: "7th",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.users.set(3, maria);

    const alex: User = {
      id: 4,
      username: "alex.chen",
      password: "password123",
      role: "student",
      firstName: "Alex",
      lastName: "Chen",
      email: "alex.chen@school.edu",
      department: null,
      grade: "7th",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.users.set(4, alex);

    this.currentUserId = 5;

    // Sample student submissions
    const submission1: WritingSession = {
      id: 1,
      userId: 2,
      assignmentId: 1,
      title: "The Day I Learned to Stand Up",
      content: `The cafeteria was buzzing with its usual chaos when I witnessed something that would change how I view courage forever. It was a typical Tuesday, and I was sitting with my friends when I noticed Marcus, a quiet kid from my math class, being surrounded by three older students near the lunch line.

"Hey, Marcus, where's our lunch money?" one of them sneered, while the others blocked his path. I watched as Marcus's face turned red, his hands trembling as he reached into his pocket. My stomach churned with a mixture of anger and fear.

For weeks, I had noticed Marcus looking increasingly withdrawn. His clothes were getting more worn, and he rarely brought lunch anymore. Now I understood why. These bullies had been taking his money, probably for months.

My first instinct was to look away, to pretend I hadn't seen anything. After all, what could I do? I wasn't particularly big or strong, and these were eighth graders while I was just a seventh grader. But as I watched Marcus hand over his crumpled dollar bills, something inside me snapped.

Before I could think twice, I stood up. My legs felt like jelly, but I walked over to the group anyway. "Leave him alone," I said, my voice shakier than I would have liked.

The bullies turned to look at me, surprised. "What did you say, kid?"

"I said leave him alone. There are teachers everywhere, and if you don't stop, I'm going to make sure they know exactly what's happening here."

For a moment that felt like an eternity, we all stood there in silence. Then, unexpectedly, other students began to stand up too. Sarah from my English class, then Jake from the basketball team, then more and more students. The bullies, suddenly outnumbered and exposed, mumbled something about "whatever" and walked away.

Marcus looked at me with tears in his eyes. "Thank you," he whispered.

That day taught me that courage isn't about being fearless – it's about doing the right thing even when you're terrified. Sometimes, all it takes is one person to stand up for what's right, and others will follow. I learned that staying silent in the face of injustice makes you complicit, but speaking up, even with a shaky voice, can change everything.`,
      wordCount: 356,
      status: "submitted",
      submittedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      teacherFeedback: null,
      grade: null,
      createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    };

    const submission2: WritingSession = {
      id: 2,
      userId: 3,
      assignmentId: 1,
      title: "Moving to a New Country",
      content: `When my family told me we were moving from Mexico to the United States, I thought it would be an adventure. I was wrong – it was one of the hardest experiences of my life, but also the most transformative.

The airplane ride felt endless. I pressed my face against the small window, watching my homeland disappear beneath the clouds. Everything I knew – my friends, my school, my grandmother's house where we had Sunday dinners – was getting smaller and smaller until it vanished completely.

Landing in Chicago was overwhelming. The airport was massive, filled with people speaking rapid English that I barely understood despite years of studying the language in school. The sounds, the smells, even the way people walked was different. I clung to my mother's hand as we navigated through customs, feeling more lost than I ever had in my thirteen years of life.

Starting at Lincoln Middle School was terrifying. On my first day, I stood outside the main office, my schedule clutched in my sweaty palm, watching hundreds of students rush past me. They all seemed to know exactly where they were going, while I couldn't even figure out how to open my locker.

The language barrier was the worst part. I could read English fairly well, but speaking it with confidence was another story entirely. In my science class, I knew the answer to a question about photosynthesis, but when I raised my hand, the words came out jumbled and accented. Some kids giggled, and I felt my cheeks burn with embarrassment.

For weeks, I ate lunch alone, too afraid to approach any groups. I missed the easy friendships I had back home, where communication flowed naturally and I never had to worry about choosing the wrong words.

But slowly, things began to change. Mrs. Rodriguez, my English teacher, paired me with Emma, a patient girl who helped me practice pronunciation after school. In art class, I discovered that creativity doesn't require words – my drawings spoke for themselves. When I painted a piece about missing my homeland, my classmates gathered around, asking questions and sharing their own stories of loss and change.

Moving to a new country taught me that home isn't just a place – it's something you carry inside you and something you can create wherever you are. The experience of being an outsider had given me empathy for others who felt different or displaced.`,
      wordCount: 387,
      status: "submitted",
      submittedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      teacherFeedback: null,
      grade: null,
      createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    };

    const submission3: WritingSession = {
      id: 3,
      userId: 4,
      assignmentId: 1,
      title: "The Science Fair Disaster",
      content: `Science had always been my worst subject, so when our teacher announced the mandatory science fair project, I felt my stomach drop. While my classmates excitedly discussed their elaborate experiments, I sat there feeling completely overwhelmed.

I decided to test which type of soil would help plants grow best. It seemed simple enough – plant some seeds, add different soils, water them, and measure the growth. What could go wrong?

Everything, as it turned out.

First, I forgot to label my pots properly, so after a week I had no idea which soil was which. Then, I overwatered half of them and forgot to water the others entirely. My "controlled experiment" had become completely uncontrolled.

Two weeks before the science fair, I stared at my pathetic display of dead and dying plants. Most of my classmates were already creating their poster boards and practicing their presentations. I was ready to give up and accept the failing grade.

That's when my dad found me crying at the kitchen table. Instead of lecturing me about procrastination, he sat down and asked, "What did you learn from this?"

"That I'm terrible at science," I replied.

"No," he said gently. "You learned about what doesn't work. That's actually the most important part of science."

He helped me realize that my "failed" experiment was actually a perfect example of why controlled variables matter in scientific research. We spent the next week documenting everything that had gone wrong and why, turning my disaster into a presentation about the importance of proper experimental design.

On the day of the science fair, I was nervous as I stood next to my poster titled "Why My Experiment Failed: A Study in What Not to Do." While other students displayed their successful results, I explained to judges how forgetting to label variables, inconsistent watering, and poor planning had ruined my original hypothesis.

To my amazement, the judges were impressed. They said my honest analysis of experimental errors was more valuable than many of the "perfect" projects, because real science involves learning from mistakes and improving methodology.

This experience changed how I approach challenges in all areas of my life. Now, when something doesn't go as planned, instead of giving up, I ask myself: "What can I learn from this?" That science fair "disaster" taught me that sometimes our biggest failures can become our most important lessons.`,
      wordCount: 445,
      status: "graded",
      submittedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      teacherFeedback: "Excellent reflection on learning from failure! Your narrative structure is clear and engaging, and you've done a wonderful job showing rather than telling your emotional journey. The dialogue with your father is particularly effective. Your conclusion ties everything together nicely and shows real personal growth. For future writing, consider adding more specific sensory details to help readers visualize the scenes even more vividly.",
      grade: "A-",
      createdAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    };

    // Add submissions to storage
    this.writingSessions.set(1, submission1);
    this.writingSessions.set(2, submission2);
    this.writingSessions.set(3, submission3);
    this.currentSessionId = 4;
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
    const now = new Date();
    const user: User = { 
      ...insertUser, 
      id,
      department: insertUser.department || null,
      grade: insertUser.grade || null,
      isActive: true,
      createdAt: now,
      updatedAt: now
    };
    this.users.set(id, user);
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  async deleteUser(id: number): Promise<void> {
    this.users.delete(id);
  }

  async getAssignment(id: number): Promise<Assignment | undefined> {
    return this.assignments.get(id);
  }

  async createAssignment(insertAssignment: InsertAssignment): Promise<Assignment> {
    const id = this.currentAssignmentId++;
    const now = new Date();
    const assignment: Assignment = {
      dueDate: null,
      status: "active",
      aiPermissions: "full",
      allowBrainstorming: true,
      allowOutlining: true,
      allowGrammarCheck: true,
      allowResearchHelp: true,
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

  async markAssignmentComplete(id: number): Promise<Assignment | undefined> {
    const assignment = this.assignments.get(id);
    if (!assignment) return undefined;

    const updatedAssignment: Assignment = {
      ...assignment,
      status: "completed",
      updatedAt: new Date(),
    };
    this.assignments.set(id, updatedAssignment);
    return updatedAssignment;
  }

  async checkOverdueAssignments(): Promise<Assignment[]> {
    const now = new Date();
    const assignments = Array.from(this.assignments.values());
    
    // Update overdue assignments
    assignments.forEach(assignment => {
      if (assignment.dueDate && assignment.status === "active" && assignment.dueDate < now) {
        assignment.status = "overdue";
        assignment.updatedAt = new Date();
        this.assignments.set(assignment.id, assignment);
      }
    });

    return assignments.filter(assignment => assignment.status === "overdue");
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
      sessionId: null,
      isRestricted: false,
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

  async gradeWritingSession(sessionId: number, gradeData: { grade: string; teacherFeedback: string; status: string }): Promise<WritingSession | undefined> {
    const session = this.writingSessions.get(sessionId);
    if (!session) {
      return undefined;
    }

    const updatedSession: WritingSession = {
      ...session,
      grade: gradeData.grade,
      teacherFeedback: gradeData.teacherFeedback,
      status: gradeData.status,
      updatedAt: new Date(),
    };

    this.writingSessions.set(sessionId, updatedSession);
    return updatedSession;
  }
}

export const storage = new MemStorage();
