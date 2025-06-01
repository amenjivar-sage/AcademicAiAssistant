import { users, writingSessions, aiInteractions, assignments, messages, classrooms, inlineComments, type User, type InsertUser, type WritingSession, type InsertWritingSession, type AiInteraction, type InsertAiInteraction, type Assignment, type InsertAssignment, type Message, type InsertMessage, type Classroom, type InsertClassroom, type InlineComment, type InsertInlineComment } from "@shared/schema";
import { drizzle } from "drizzle-orm/node-postgres";
import { eq } from "drizzle-orm";
import { Pool } from "pg";

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getAllUsers(): Promise<User[]>;
  deleteUser(id: number): Promise<void>;
  updateUserPassword(id: number, newPassword: string): Promise<void>;
  updateUserStatus(id: number, isActive: boolean): Promise<void>;
  
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
  getAssignmentSubmissions(assignmentId: number): Promise<(WritingSession & { student: User })[]>;
  
  createAiInteraction(interaction: InsertAiInteraction): Promise<AiInteraction>;
  getSessionInteractions(sessionId: number): Promise<AiInteraction[]>;
  
  gradeWritingSession(sessionId: number, gradeData: { grade: string; teacherFeedback: string; status: string }): Promise<WritingSession | undefined>;
  
  // Message operations
  createMessage(message: InsertMessage): Promise<Message>;
  getUserInboxMessages(userId: number): Promise<(Message & { sender: User })[]>;
  getUserSentMessages(userId: number): Promise<(Message & { receiver: User })[]>;
  markMessageAsRead(messageId: number): Promise<void>;
  getAvailableRecipients(userRole: string): Promise<User[]>;
  
  // Classroom operations
  createClassroom(classroom: InsertClassroom): Promise<Classroom>;
  getTeacherClassrooms(teacherId: number): Promise<Classroom[]>;
  getAllClassrooms(): Promise<Classroom[]>;
  getStudentClassrooms(studentId: number): Promise<Classroom[]>;
  enrollStudentInClassroom(studentId: number, classroomId: number): Promise<void>;
  updateClassroom(id: number, updates: Partial<InsertClassroom>): Promise<Classroom | undefined>;
  
  // Inline comment operations
  createInlineComment(comment: InsertInlineComment): Promise<InlineComment>;
  getSessionInlineComments(sessionId: number): Promise<InlineComment[]>;
  deleteInlineComment(commentId: number): Promise<void>;
  
  // Student profile operations for adaptive AI
  getStudentProfile(userId: number): Promise<any | undefined>;
  createStudentProfile(profile: any): Promise<any>;
  updateStudentProfile(userId: number, updates: any): Promise<any | undefined>;
  updateLearningProgress(userId: number, interactionData: any): Promise<void>;
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
  private messages: Map<number, Message>;
  private classrooms: Map<number, any>;
  private enrollments: Map<string, boolean>; // key: "studentId-classroomId"
  private inlineComments: Map<number, any>;
  private studentProfiles: Map<number, any>;
  private currentUserId: number;
  private currentAssignmentId: number;
  private currentSessionId: number;
  private currentInteractionId: number;
  private currentMessageId: number;
  private currentClassroomId: number;

  constructor() {
    this.users = new Map();
    this.assignments = new Map();
    this.writingSessions = new Map();
    this.aiInteractions = new Map();
    this.messages = new Map();
    this.classrooms = new Map();
    this.enrollments = new Map();
    this.inlineComments = new Map();
    this.studentProfiles = new Map();
    this.currentUserId = 1;
    this.currentAssignmentId = 1;
    this.currentSessionId = 1;
    this.currentInteractionId = 1;
    this.currentMessageId = 1;
    this.currentClassroomId = 1;

    // Start with completely empty storage - no sample data
    // this.initializeDefaultUsers();
    // this.initializeSampleClassrooms();
    // this.initializeSampleSubmissions();
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
      email: "teacher@sage.com",
      grade: null,
      department: null,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
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
      email: "student@sage.com",
      grade: "10",
      department: null,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.users.set(2, student);

    this.currentUserId = 3;
  }

  private initializeSampleClassrooms() {
    // Create a sample classroom for the teacher
    const classroom = {
      id: 1,
      teacherId: 1,
      name: "Creative Writing 101",
      description: "Introduction to creative writing with focus on personal narratives and storytelling techniques",
      subject: "English",
      joinCode: "ENG101A",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.classrooms.set(1, classroom);
    this.currentClassroomId = 2;
  }

  private initializeSampleSubmissions() {
    // Create a sample assignment first
    const assignment: Assignment = {
      id: 1,
      teacherId: 1,
      classroomId: 1, // Tied to Creative Writing 101 class
      title: "Personal Narrative Essay",
      description: "Write a personal narrative about a meaningful experience that changed your perspective. Your essay should include vivid details, clear chronological structure, and reflection on the significance of the event.",
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Due in 1 week
      status: "active",
      aiPermissions: "limited",
      allowBrainstorming: true,
      allowOutlining: true,
      allowGrammarCheck: true,
      allowResearchHelp: false,
      allowCopyPaste: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.assignments.set(1, assignment);

    // Add more assignments to the Creative Writing class
    const assignment2: Assignment = {
      id: 2,
      teacherId: 1,
      classroomId: 1,
      title: "Character Analysis: To Kill a Mockingbird",
      description: "Analyze the character development of Scout Finch throughout the novel. Discuss how her understanding of justice and morality evolves through key events.",
      dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      status: "active",
      aiPermissions: "limited",
      allowBrainstorming: true,
      allowOutlining: true,
      allowGrammarCheck: true,
      allowResearchHelp: false,
      allowCopyPaste: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.assignments.set(2, assignment2);

    const assignment3: Assignment = {
      id: 3,
      teacherId: 1,
      classroomId: 1,
      title: "Creative Short Story",
      description: "Write an original short story in any genre. Your story should have a clear beginning, middle, and end, with well-developed characters and compelling conflict.",
      dueDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000),
      status: "active",
      aiPermissions: "full",
      allowBrainstorming: true,
      allowOutlining: true,
      allowGrammarCheck: true,
      allowResearchHelp: true,
      allowCopyPaste: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.assignments.set(3, assignment3);

    const assignment4: Assignment = {
      id: 4,
      teacherId: 1,
      classroomId: 1,
      title: "Poetry Portfolio",
      description: "Create a collection of 5 original poems exploring different themes and styles. Include at least one sonnet, one free verse, and one haiku.",
      dueDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // Overdue
      status: "active",
      aiPermissions: "limited",
      allowBrainstorming: true,
      allowOutlining: false,
      allowGrammarCheck: true,
      allowResearchHelp: false,
      allowCopyPaste: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.assignments.set(4, assignment4);

    this.currentAssignmentId = 5;

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
      pastedContent: [],
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
      pastedContent: [],
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
      pastedContent: [],
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

    // Add submissions for the newer assignments (ID 2, 3, 4)
    const submission4: WritingSession = {
      id: 4,
      userId: 3,
      assignmentId: 4,
      title: "Climate Change Solutions",
      pastedContent: [],
      content: `Climate change is one of the biggest challenges facing our planet today. Rising temperatures, melting ice caps, and extreme weather events are becoming more frequent and severe. However, there are many solutions we can implement to address this crisis.

Renewable energy is perhaps the most important solution. Solar panels, wind turbines, and hydroelectric power can replace fossil fuels that release carbon dioxide into the atmosphere. Many countries are already making significant investments in clean energy infrastructure.

Individual actions also matter. We can reduce our carbon footprint by using public transportation, recycling, eating less meat, and being more conscious about our energy consumption at home. Small changes by millions of people can have a big impact.

Governments need to implement policies that encourage sustainable practices and penalize companies that pollute excessively. Carbon taxes and emissions standards can help drive the transition to cleaner technologies.

Education is crucial too. The more people understand about climate science and environmental issues, the more likely they are to support necessary changes and make better choices in their daily lives.`,
      wordCount: 178,
      status: "submitted",
      submittedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      teacherFeedback: null,
      grade: null,
      createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    };

    const submission5: WritingSession = {
      id: 5,
      userId: 4,
      assignmentId: 4,
      title: "My Plan to Save the Environment",
      pastedContent: [],
      content: `I think the environment is very important and we need to do something about pollution and global warming. There are many things we can do to help save our planet.

First, we should recycle more. I always try to put my bottles and cans in the recycling bin instead of the trash. My family also tries to use less plastic bags when we go shopping.

Cars make a lot of pollution so we should drive less. I ride my bike to school when the weather is nice instead of having my mom drive me. Walking is good too and its good exercise.

We should also save energy at home. I try to turn off lights when I leave a room and my mom says we should unplug things when we're not using them because they still use electricity.

Trees are important because they clean the air. We planted a tree in our backyard last year and it's already getting bigger. I think more people should plant trees.

If everyone does their part we can make the Earth a better place for future generations.`,
      wordCount: 171,
      status: "submitted",
      submittedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      teacherFeedback: null,
      grade: null,
      createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    };

    const submission6: WritingSession = {
      id: 6,
      userId: 2,
      assignmentId: 2,
      title: "The Future of Renewable Energy",
      pastedContent: [],
      content: `As we stand at the crossroads of environmental crisis and technological innovation, renewable energy emerges as our most promising path toward a sustainable future. The transition from fossil fuels to clean energy sources represents not just an environmental necessity, but an economic opportunity that could reshape global markets.

Solar energy has experienced remarkable growth over the past decade. The cost of solar panels has plummeted by over 80% since 2010, making solar power competitive with traditional energy sources in many regions. Countries like Germany and Denmark have demonstrated that it's possible to generate significant portions of national energy needs from renewable sources without compromising economic stability.

Wind energy presents another compelling opportunity. Offshore wind farms can generate enormous amounts of electricity without taking up valuable land space. The consistency of ocean winds makes offshore installations particularly efficient, and advancing turbine technology continues to improve energy capture rates.

However, the transition to renewable energy faces significant challenges. Energy storage remains a critical bottleneck – we need better battery technology to store solar and wind energy for use during periods when the sun isn't shining or the wind isn't blowing. Additionally, upgrading electrical grids to handle distributed energy sources requires substantial infrastructure investment.

Despite these challenges, the momentum toward renewable energy appears unstoppable. Government incentives, corporate sustainability commitments, and growing public awareness are driving unprecedented investment in clean energy technologies. The question is no longer whether we will transition to renewable energy, but how quickly we can make it happen.`,
      wordCount: 267,
      status: "submitted",
      submittedAt: new Date(Date.now() - 12 * 60 * 60 * 1000),
      teacherFeedback: null,
      grade: null,
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(Date.now() - 12 * 60 * 60 * 1000),
    };

    this.writingSessions.set(4, submission4);
    this.writingSessions.set(5, submission5);
    this.writingSessions.set(6, submission6);
    this.currentSessionId = 7;
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.email === email,
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

  async updateUserPassword(id: number, newPassword: string): Promise<void> {
    const user = this.users.get(id);
    if (user) {
      user.password = newPassword;
      user.updatedAt = new Date();
      this.users.set(id, user);
    }
  }

  async updateUserStatus(id: number, isActive: boolean): Promise<void> {
    const user = this.users.get(id);
    if (user) {
      user.isActive = isActive;
      user.updatedAt = new Date();
      this.users.set(id, user);
    }
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
      pastedContent: [],
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

    // Handle special case for unsubmitting - clear submittedAt when status changes to draft
    let finalUpdates: any = { ...updates };
    if (updates.status === "draft") {
      finalUpdates.submittedAt = null;
    }

    const updatedSession: WritingSession = {
      ...session,
      ...finalUpdates,
      updatedAt: new Date(),
    };
    
    console.log("Storage: Updating session", id, "with updates:", finalUpdates);
    console.log("Storage: Final updated session:", updatedSession);
    
    this.writingSessions.set(id, updatedSession);
    return updatedSession;
  }

  async getUserWritingSessions(userId: number): Promise<WritingSession[]> {
    return Array.from(this.writingSessions.values()).filter(
      (session) => session.userId === userId
    );
  }

  async getAssignmentSubmissions(assignmentId: number): Promise<(WritingSession & { student: User })[]> {
    const sessions = Array.from(this.writingSessions.values()).filter(
      (session) => session.assignmentId === assignmentId
    );
    
    // Add student information to each submission
    return sessions.map(session => {
      const student = this.users.get(session.userId || 0);
      return {
        ...session,
        student: student || {
          id: 0,
          username: "unknown",
          firstName: "Unknown",
          lastName: "Student",
          email: "unknown@example.com",
          role: "student",
          password: "",
          department: null,
          grade: null,
          isActive: false,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      };
    });
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

  // Message operations
  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const message: Message = {
      id: this.currentMessageId++,
      ...insertMessage,
      isRead: false,
      createdAt: new Date(),
    };

    this.messages.set(message.id, message);
    return message;
  }

  async getUserInboxMessages(userId: number): Promise<(Message & { sender: User })[]> {
    const userMessages = Array.from(this.messages.values())
      .filter(message => message.receiverId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    return userMessages.map(message => ({
      ...message,
      sender: this.users.get(message.senderId)!,
    }));
  }

  async getUserSentMessages(userId: number): Promise<(Message & { receiver: User })[]> {
    const sentMessages = Array.from(this.messages.values())
      .filter(message => message.senderId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    return sentMessages.map(message => ({
      ...message,
      receiver: this.users.get(message.receiverId)!,
    }));
  }

  async markMessageAsRead(messageId: number): Promise<void> {
    const message = this.messages.get(messageId);
    if (message) {
      this.messages.set(messageId, { ...message, isRead: true });
    }
  }

  async getAvailableRecipients(userRole: string): Promise<User[]> {
    const targetRole = userRole === "teacher" ? "student" : "teacher";
    return Array.from(this.users.values()).filter(user => user.role === targetRole);
  }

  // Classroom operations
  async createClassroom(classroomData: any): Promise<any> {
    const id = this.currentClassroomId++;
    const joinCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    const classroom = {
      ...classroomData,
      id,
      joinCode,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.classrooms.set(id, classroom);
    return classroom;
  }

  async getTeacherClassrooms(teacherId: number): Promise<any[]> {
    return Array.from(this.classrooms.values()).filter(
      (classroom) => classroom.teacherId === teacherId
    );
  }

  async getAllClassrooms(): Promise<any[]> {
    return Array.from(this.classrooms.values());
  }

  async getStudentClassrooms(studentId: number): Promise<any[]> {
    console.log("Getting student classrooms for student ID:", studentId);
    console.log("All enrollments:", Array.from(this.enrollments.keys()));
    
    const enrolledClassroomIds = Array.from(this.enrollments.keys())
      .filter(key => key.startsWith(`${studentId}-`))
      .map(key => parseInt(key.split('-')[1]));
    
    console.log("Enrolled classroom IDs:", enrolledClassroomIds);
    console.log("All classrooms:", Array.from(this.classrooms.values()).map(c => ({ id: c.id, name: c.name, isActive: c.isActive })));
    
    const studentClassrooms = Array.from(this.classrooms.values())
      .filter(classroom => enrolledClassroomIds.includes(classroom.id) && classroom.isActive);
    
    console.log("Student classrooms result:", studentClassrooms);
    return studentClassrooms;
  }

  async enrollStudentInClassroom(studentId: number, classroomId: number): Promise<void> {
    const enrollmentKey = `${studentId}-${classroomId}`;
    console.log("Enrolling student with key:", enrollmentKey);
    this.enrollments.set(enrollmentKey, true);
  }

  async updateClassroom(id: number, updates: any): Promise<any | undefined> {
    const classroom = this.classrooms.get(id);
    if (!classroom) return undefined;

    const updatedClassroom = {
      ...classroom,
      ...updates,
      updatedAt: new Date(),
    };
    this.classrooms.set(id, updatedClassroom);
    return updatedClassroom;
  }

  // Inline comment operations
  async createInlineComment(comment: any): Promise<any> {
    const id = Date.now(); // Simple ID generation
    const newComment = {
      ...comment,
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.inlineComments.set(id, newComment);
    return newComment;
  }

  async getSessionInlineComments(sessionId: number): Promise<any[]> {
    return Array.from(this.inlineComments.values())
      .filter((comment: any) => comment.sessionId === sessionId);
  }

  async deleteInlineComment(commentId: number): Promise<void> {
    this.inlineComments.delete(commentId);
  }

  // Student profile operations for adaptive AI
  async getStudentProfile(userId: number): Promise<any | undefined> {
    // Initialize student profiles if not exists
    if (!this.studentProfiles) {
      this.studentProfiles = new Map();
    }
    return this.studentProfiles.get(userId);
  }

  async createStudentProfile(profile: any): Promise<any> {
    if (!this.studentProfiles) {
      this.studentProfiles = new Map();
    }
    const id = Date.now();
    const newProfile = {
      ...profile,
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.studentProfiles.set(profile.userId, newProfile);
    return newProfile;
  }

  async updateStudentProfile(userId: number, updates: any): Promise<any | undefined> {
    if (!this.studentProfiles) {
      this.studentProfiles = new Map();
    }
    const existing = this.studentProfiles.get(userId);
    if (!existing) return undefined;
    
    const updated = {
      ...existing,
      ...updates,
      updatedAt: new Date(),
    };
    this.studentProfiles.set(userId, updated);
    return updated;
  }

  async updateLearningProgress(userId: number, interactionData: any): Promise<void> {
    let profile = await this.getStudentProfile(userId);
    if (!profile) {
      profile = await this.createStudentProfile({
        userId,
        writingLevel: "beginner",
        strengths: [],
        weaknesses: [],
        commonMistakes: [],
        improvementAreas: [],
        learningPreferences: {},
        totalWordsWritten: 0,
        totalSessions: 0,
      });
    }

    // Update learning data based on interaction
    const updates: any = {
      lastInteractionSummary: interactionData.prompt,
      totalSessions: profile.totalSessions + 1,
    };

    await this.updateStudentProfile(userId, updates);
  }
}

// Import database storage for production deployment
import { DatabaseStorage } from "./database-storage";

export const storage = new DatabaseStorage();
