# Sage Educational Platform - Complete Codebase Export

## Project Overview
Sage is a comprehensive educational writing platform that combines traditional writing tools with AI assistance to help students improve their writing skills while maintaining academic integrity. The platform serves teachers, students, administrators, and school administrators with role-based dashboards and features.

## Technology Stack
- **Frontend**: React 18 + TypeScript + Vite
- **Backend**: Node.js + Express + TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Session-based with role-based access control
- **AI Integration**: OpenAI GPT-4
- **Styling**: Tailwind CSS + shadcn/ui components
- **State Management**: TanStack Query (React Query)

## Database Schema (shared/schema.ts)

```typescript
import { pgTable, serial, text, integer, timestamp, boolean, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table with role-based access
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull().unique(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").notNull(), // 'student', 'teacher', 'admin', 'school_admin', 'sage_admin'
  grade: text("grade"), // For students
  isActive: boolean("is_active").notNull().default(true),
  lastLogin: timestamp("last_login"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Classrooms for organizing students and assignments
export const classrooms = pgTable("classrooms", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  teacherId: integer("teacher_id").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Junction table for student-classroom relationships
export const classroomEnrollments = pgTable("classroom_enrollments", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").notNull(),
  classroomId: integer("classroom_id").notNull(),
  enrolledAt: timestamp("enrolled_at").notNull().defaultNow(),
});

// Assignments created by teachers
export const assignments = pgTable("assignments", {
  id: serial("id").primaryKey(),
  teacherId: integer("teacher_id").notNull(),
  classroomId: integer("classroom_id"),
  classroomIds: json("classroom_ids").$type<number[]>().default([]),
  title: text("title").notNull(),
  description: text("description").notNull(),
  dueDate: timestamp("due_date"),
  status: text("status").notNull().default("active"), // 'draft', 'active', 'closed'
  aiPermissions: text("ai_permissions").notNull().default("limited"), // 'none', 'limited', 'allowed'
  allowBrainstorming: boolean("allow_brainstorming").notNull().default(true),
  allowOutlining: boolean("allow_outlining").notNull().default(true),
  allowGrammarCheck: boolean("allow_grammar_check").notNull().default(true),
  allowResearchHelp: boolean("allow_research_help").notNull().default(false),
  allowCopyPaste: boolean("allow_copy_paste").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Student writing sessions
export const writingSessions = pgTable("writing_sessions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  assignmentId: integer("assignment_id"),
  title: text("title").default(""),
  content: text("content").default(""),
  pastedContent: json("pasted_content").$type<Array<{
    text: string;
    startIndex: number;
    endIndex: number;
    timestamp: string;
  }>>().default([]),
  wordCount: integer("word_count").default(0),
  status: text("status").notNull().default("draft"), // 'draft', 'submitted', 'graded'
  grade: text("grade"),
  teacherFeedback: text("teacher_feedback"),
  submittedAt: timestamp("submitted_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// AI interactions for transparency
export const aiInteractions = pgTable("ai_interactions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  sessionId: integer("session_id"),
  prompt: text("prompt").notNull(),
  response: text("response").notNull(),
  type: text("type").notNull(), // 'brainstorming', 'grammar', 'research', 'general'
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Messages for communication
export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  senderId: integer("sender_id").notNull(),
  receiverId: integer("receiver_id").notNull(),
  subject: text("subject").notNull(),
  content: text("content").notNull(),
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Inline comments for graded assignments
export const inlineComments = pgTable("inline_comments", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id").notNull(),
  teacherId: integer("teacher_id").notNull(),
  highlightedText: text("highlighted_text").notNull(),
  comment: text("comment").notNull(),
  startIndex: integer("start_index").notNull(),
  endIndex: integer("end_index").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Student profiles for personalized learning
export const studentProfiles = pgTable("student_profiles", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().unique(),
  writingLevel: text("writing_level").default("beginner"), // 'beginner', 'intermediate', 'advanced'
  learningStyle: text("learning_style").default("visual"), // 'visual', 'auditory', 'kinesthetic'
  preferredTopics: json("preferred_topics").$type<string[]>().default([]),
  strengths: json("strengths").$type<string[]>().default([]),
  areasForImprovement: json("areas_for_improvement").$type<string[]>().default([]),
  goals: json("goals").$type<string[]>().default([]),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Learning progress tracking
export const learningProgress = pgTable("learning_progress", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  metric: text("metric").notNull(), // 'vocabulary', 'grammar', 'structure', etc.
  value: integer("value").notNull(),
  maxValue: integer("max_value").notNull().default(100),
  recordedAt: timestamp("recorded_at").notNull().defaultNow(),
});

// Writing streaks for gamification
export const writingStreaks = pgTable("writing_streaks", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  currentStreak: integer("current_streak").notNull().default(0),
  longestStreak: integer("longest_streak").notNull().default(0),
  lastWritingDate: timestamp("last_writing_date"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Achievements system
export const achievements = pgTable("achievements", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  type: text("type").notNull(), // 'first_submission', 'week_streak', 'improved_grade', etc.
  title: text("title").notNull(),
  description: text("description").notNull(),
  unlockedAt: timestamp("unlocked_at").notNull().defaultNow(),
});

// Writing goals
export const writingGoals = pgTable("writing_goals", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  type: text("type").notNull(), // 'word_count', 'assignments_completed', 'streak_length'
  target: integer("target").notNull(),
  current: integer("current").notNull().default(0),
  timeframe: text("timeframe").notNull(), // 'daily', 'weekly', 'monthly'
  isCompleted: boolean("is_completed").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Feedback system
export const feedback = pgTable("feedback", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  type: text("type").notNull(), // "bug", "feature", "general", "assignment"
  title: text("title").notNull(),
  description: text("description").notNull(),
  category: text("category"),
  priority: text("priority").notNull().default("medium"), // "low", "medium", "high"
  rating: integer("rating"), // 1-5 star rating
  contextType: text("context_type"), // "assignment", "platform", "general"
  contextId: integer("context_id"), // ID of assignment or other context
  status: text("status").notNull().default("open"), // "open", "in_progress", "resolved", "closed"
  adminResponse: text("admin_response"),
  adminResponseAt: timestamp("admin_response_at"),
  adminResponseBy: integer("admin_response_by"),
  userAgent: text("user_agent"),
  url: text("url"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Zod schemas for validation
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAssignmentSchema = createInsertSchema(assignments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertWritingSessionSchema = createInsertSchema(writingSessions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAiInteractionSchema = createInsertSchema(aiInteractions).omit({
  id: true,
  createdAt: true,
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  createdAt: true,
});

export const insertClassroomSchema = createInsertSchema(classrooms).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertInlineCommentSchema = createInsertSchema(inlineComments).omit({
  id: true,
  createdAt: true,
});

export const insertFeedbackSchema = createInsertSchema(feedback).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  adminResponse: true,
  adminResponseAt: true,
  adminResponseBy: true,
});

// Type exports
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Assignment = typeof assignments.$inferSelect;
export type InsertAssignment = z.infer<typeof insertAssignmentSchema>;
export type WritingSession = typeof writingSessions.$inferSelect;
export type InsertWritingSession = z.infer<typeof insertWritingSessionSchema>;
export type AiInteraction = typeof aiInteractions.$inferSelect;
export type InsertAiInteraction = z.infer<typeof insertAiInteractionSchema>;
export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Classroom = typeof classrooms.$inferSelect;
export type InsertClassroom = z.infer<typeof insertClassroomSchema>;
export type InlineComment = typeof inlineComments.$inferSelect;
export type InsertInlineComment = z.infer<typeof insertInlineCommentSchema>;
export type Feedback = typeof feedback.$inferSelect;
export type InsertFeedback = z.infer<typeof insertFeedbackSchema>;
```

## Server Configuration Files

### package.json
```json
{
  "name": "rest-express",
  "version": "1.0.0",
  "description": "",
  "type": "module",
  "main": "index.js",
  "scripts": {
    "dev": "NODE_ENV=development tsx server/index.ts",
    "build": "npm run build:server && npm run build:client",
    "build:server": "esbuild server/index.ts --bundle --platform=node --target=node18 --outfile=dist/index.js --external:pg-native --external:@neondatabase/serverless",
    "build:client": "vite build",
    "start": "NODE_ENV=production node dist/index.js",
    "db:generate": "drizzle-kit generate",
    "db:push": "drizzle-kit push",
    "db:studio": "drizzle-kit studio"
  },
  "dependencies": {
    "@hookform/resolvers": "^3.3.2",
    "@neondatabase/serverless": "^0.9.0",
    "@radix-ui/react-accordion": "^1.1.2",
    "@radix-ui/react-alert-dialog": "^1.0.5",
    "@radix-ui/react-aspect-ratio": "^1.0.3",
    "@radix-ui/react-avatar": "^1.0.4",
    "@radix-ui/react-checkbox": "^1.0.4",
    "@radix-ui/react-collapsible": "^1.0.3",
    "@radix-ui/react-context-menu": "^2.1.5",
    "@radix-ui/react-dialog": "^1.0.5",
    "@radix-ui/react-dropdown-menu": "^2.0.6",
    "@radix-ui/react-hover-card": "^1.0.7",
    "@radix-ui/react-label": "^2.0.2",
    "@radix-ui/react-menubar": "^1.0.4",
    "@radix-ui/react-navigation-menu": "^1.1.4",
    "@radix-ui/react-popover": "^1.0.7",
    "@radix-ui/react-progress": "^1.0.3",
    "@radix-ui/react-radio-group": "^1.1.3",
    "@radix-ui/react-scroll-area": "^1.0.5",
    "@radix-ui/react-select": "^2.0.0",
    "@radix-ui/react-separator": "^1.0.3",
    "@radix-ui/react-slider": "^1.1.2",
    "@radix-ui/react-slot": "^1.0.2",
    "@radix-ui/react-switch": "^1.0.3",
    "@radix-ui/react-tabs": "^1.0.4",
    "@radix-ui/react-toast": "^1.1.5",
    "@radix-ui/react-toggle": "^1.0.3",
    "@radix-ui/react-toggle-group": "^1.0.4",
    "@radix-ui/react-tooltip": "^1.0.7",
    "@sendgrid/mail": "^8.1.0",
    "@tailwindcss/typography": "^0.5.10",
    "@tailwindcss/vite": "^4.0.0-alpha.15",
    "@tanstack/react-query": "^5.17.15",
    "@types/connect-pg-simple": "^7.0.3",
    "@types/express": "^4.17.21",
    "@types/express-session": "^1.18.0",
    "@types/node": "^20.10.6",
    "@types/passport": "^1.0.16",
    "@types/passport-local": "^1.0.38",
    "@types/pg": "^8.11.0",
    "@types/react": "^18.2.46",
    "@types/react-dom": "^18.2.18",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.0.0",
    "cmdk": "^0.2.0",
    "connect-pg-simple": "^9.0.1",
    "date-fns": "^3.1.0",
    "docx": "^8.5.0",
    "drizzle-kit": "^0.20.6",
    "drizzle-orm": "^0.29.1",
    "drizzle-zod": "^0.5.1",
    "embla-carousel-react": "^8.0.0",
    "esbuild": "^0.19.11",
    "express": "^4.18.2",
    "express-session": "^1.18.0",
    "file-saver": "^2.0.5",
    "framer-motion": "^10.18.0",
    "html2pdf.js": "^0.10.1",
    "input-otp": "^1.2.4",
    "lucide-react": "^0.303.0",
    "memorystore": "^1.6.7",
    "next-themes": "^0.2.1",
    "openai": "^4.20.1",
    "openid-client": "^5.6.1",
    "passport": "^0.7.0",
    "passport-local": "^1.0.0",
    "pg": "^8.11.3",
    "postcss": "^8.4.32",
    "react": "^18.2.0",
    "react-day-picker": "^8.10.0",
    "react-dom": "^18.2.0",
    "react-hook-form": "^7.48.2",
    "react-icons": "^4.12.0",
    "react-quill": "^2.0.0",
    "react-resizable-panels": "^0.0.55",
    "recharts": "^2.10.3",
    "tailwind-merge": "^2.2.0",
    "tailwindcss": "^3.4.0",
    "tailwindcss-animate": "^1.0.7",
    "tsx": "^4.7.0",
    "typescript": "^5.3.3",
    "vaul": "^0.9.0",
    "vite": "^5.0.11",
    "wouter": "^3.0.0",
    "ws": "^8.16.0",
    "zod": "^3.22.4",
    "zod-validation-error": "^2.1.0"
  },
  "devDependencies": {
    "@replit/vite-plugin-cartographer": "^1.0.1",
    "@replit/vite-plugin-runtime-error-modal": "^1.0.1",
    "@types/file-saver": "^2.0.7",
    "@types/memoizee": "^0.4.11",
    "@types/ws": "^8.5.10",
    "@vitejs/plugin-react": "^4.2.1",
    "autoprefixer": "^10.4.16",
    "memoizee": "^0.4.15",
    "tw-animate-css": "^0.1.0"
  }
}
```

### drizzle.config.ts
```typescript
import type { Config } from "drizzle-kit";

export default {
  schema: "./shared/schema.ts",
  out: "./server/migrations",
  driver: "pg",
  dbCredentials: {
    connectionString: process.env.DATABASE_URL!,
  },
} satisfies Config;
```

### vite.config.ts
```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";
import runtimeErrorModal from "@replit/vite-plugin-runtime-error-modal";
import cartographer from "@replit/vite-plugin-cartographer";

export default defineConfig({
  plugins: [
    react(),
    runtimeErrorModal(),
    cartographer(),
  ],
  root: "client",
  build: {
    outDir: "../dist/public",
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "./client/src"),
      "@shared": resolve(__dirname, "./shared"),
      "@assets": resolve(__dirname, "./attached_assets"),
    },
  },
  server: {
    host: "0.0.0.0",
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:5000",
        changeOrigin: true,
      },
      "/socket.io": {
        target: "http://localhost:5000",
        ws: true,
      },
    },
  },
});
```

### tailwind.config.ts
```typescript
import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./client/src/**/*.{js,ts,jsx,tsx,mdx}",
    "./client/index.html",
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sage: {
          50: "#f0f9ff",
          100: "#e0f2fe",
          200: "#bae6fd",
          300: "#7dd3fc",
          400: "#38bdf8",
          500: "#0ea5e9",
          600: "#0284c7",
          700: "#0369a1",
          800: "#075985",
          900: "#0c4a6e",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [tailwindcssAnimate],
};

export default config;
```

## Backend Implementation

### Main Server (server/index.ts)
```typescript
import express from "express";
import { registerRoutes } from "./routes";
import { runMigrations } from "./migrate";
import path from "path";
import { fileURLToPath } from "url";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { pool } from "./db";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = parseInt(process.env.PORT || "5000");

// Postgres session store
const PgSession = connectPgSimple(session);

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: false, limit: '50mb' }));

// Session configuration with PostgreSQL store
app.use(session({
  store: new PgSession({
    pool: pool,
    tableName: 'session',
    createTableIfMissing: true,
  }),
  secret: process.env.SESSION_SECRET || 'your-secret-key-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: false, // Set to true in production with HTTPS
    httpOnly: true,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    sameSite: 'lax'
  }
}));

// Serve static files from the dist directory
if (process.env.NODE_ENV === "production") {
  const publicPath = path.join(__dirname, "public");
  app.use(express.static(publicPath));
  
  // Serve React app for all non-API routes
  app.get("*", (req, res) => {
    if (!req.path.startsWith("/api")) {
      res.sendFile(path.join(publicPath, "index.html"));
    }
  });
}

function log(message: string) {
  console.log(`${new Date().toLocaleTimeString()} [express] ${message}`);
}

(async () => {
  // Run database migrations
  log("Running database migrations...");
  await runMigrations();
  log("Database migrations completed successfully");

  const server = await registerRoutes(app);

  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port} - sage admin feedback access fix v11 deployed`);
  });
})();
```

### Database Connection (server/db.ts)
```typescript
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "@shared/schema";

export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

export const db = drizzle(pool, { schema });
```

### Database Storage Layer (server/database-storage.ts)
```typescript
import { db } from "./db";
import { 
  users, assignments, writingSessions, aiInteractions, messages, 
  classrooms, classroomEnrollments, inlineComments, studentProfiles,
  learningProgress, writingStreaks, achievements, writingGoals, feedback
} from "@shared/schema";
import type { 
  User, InsertUser, Assignment, InsertAssignment, WritingSession, 
  InsertWritingSession, AiInteraction, InsertAiInteraction, Message, 
  InsertMessage, Classroom, InsertClassroom, InlineComment, 
  InsertInlineComment, Feedback, InsertFeedback
} from "@shared/schema";
import { eq, desc, asc, and, or } from "drizzle-orm";
import { IStorage } from "./storage";
import bcrypt from "bcryptjs";

export class DatabaseStorage implements IStorage {
  // User management
  async getUser(id: number): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.username, username)).limit(1);
    return result[0];
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
    return result[0];
  }

  async createUser(userData: InsertUser): Promise<User> {
    const result = await db.insert(users).values(userData).returning();
    return result[0];
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(asc(users.lastName), asc(users.firstName));
  }

  async deleteUser(id: number): Promise<void> {
    await db.delete(users).where(eq(users.id, id));
  }

  async updateUserPassword(id: number, newPassword: string): Promise<void> {
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await db.update(users).set({ 
      password: hashedPassword,
      updatedAt: new Date()
    }).where(eq(users.id, id));
  }

  async updateUserStatus(id: number, isActive: boolean): Promise<void> {
    await db.update(users).set({ 
      isActive,
      updatedAt: new Date()
    }).where(eq(users.id, id));
  }

  // Assignment management
  async getAssignment(id: number): Promise<Assignment | undefined> {
    const result = await db.select().from(assignments).where(eq(assignments.id, id)).limit(1);
    return result[0];
  }

  async createAssignment(assignmentData: InsertAssignment): Promise<Assignment> {
    const result = await db.insert(assignments).values(assignmentData).returning();
    return result[0];
  }

  async updateAssignment(id: number, updates: Partial<InsertAssignment>): Promise<Assignment | undefined> {
    const result = await db.update(assignments)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(assignments.id, id))
      .returning();
    return result[0];
  }

  async getTeacherAssignments(teacherId: number): Promise<Assignment[]> {
    return await db.select().from(assignments)
      .where(eq(assignments.teacherId, teacherId))
      .orderBy(desc(assignments.createdAt));
  }

  async markAssignmentComplete(id: number): Promise<Assignment | undefined> {
    const result = await db.update(assignments)
      .set({ status: "closed", updatedAt: new Date() })
      .where(eq(assignments.id, id))
      .returning();
    return result[0];
  }

  async checkOverdueAssignments(): Promise<Assignment[]> {
    const now = new Date();
    return await db.select().from(assignments)
      .where(and(
        eq(assignments.status, "active"),
        // Note: This is a simplified check, in production you'd compare with dueDate
      ));
  }

  // Writing session management
  async getWritingSession(id: number): Promise<WritingSession | undefined> {
    console.log(`DatabaseStorage.getWritingSession called with ID: ${id}`);
    const result = await db.select().from(writingSessions).where(eq(writingSessions.id, id)).limit(1);
    
    if (result[0]) {
      console.log(`Found session: ${result[0].id} Title: ${result[0].title} Content length: ${result[0].content?.length || 0}`);
    } else {
      console.log(`No session found with ID: ${id}`);
    }
    
    return result[0];
  }

  async createWritingSession(sessionData: InsertWritingSession): Promise<WritingSession> {
    const result = await db.insert(writingSessions).values(sessionData).returning();
    return result[0];
  }

  async updateWritingSession(id: number, updates: Partial<InsertWritingSession>): Promise<WritingSession | undefined> {
    console.log(`DatabaseStorage: Updating writing session ${id} with updates:`, Object.keys(updates));
    
    const result = await db.update(writingSessions)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(writingSessions.id, id))
      .returning();
    
    if (result[0]) {
      console.log(`Session updated successfully: ${result[0].id} Content length: ${result[0].content?.length || 0} Pasted content items: ${result[0].pastedContent?.length || 0}`);
    }
    
    return result[0];
  }

  async getUserWritingSessions(userId: number): Promise<WritingSession[]> {
    console.log(`DatabaseStorage: Getting writing sessions for user ${userId}`);
    const sessions = await db.select().from(writingSessions)
      .where(eq(writingSessions.userId, userId))
      .orderBy(desc(writingSessions.updatedAt));
    
    console.log(`Found ${sessions.length} sessions for user ${userId}`);
    return sessions;
  }

  async getAssignmentSubmissions(assignmentId: number): Promise<(WritingSession & { student: User })[]> {
    const submissions = await db.select({
      id: writingSessions.id,
      userId: writingSessions.userId,
      assignmentId: writingSessions.assignmentId,
      title: writingSessions.title,
      content: writingSessions.content,
      pastedContent: writingSessions.pastedContent,
      wordCount: writingSessions.wordCount,
      status: writingSessions.status,
      grade: writingSessions.grade,
      teacherFeedback: writingSessions.teacherFeedback,
      submittedAt: writingSessions.submittedAt,
      createdAt: writingSessions.createdAt,
      updatedAt: writingSessions.updatedAt,
      student: {
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        username: users.username,
        password: users.password,
        role: users.role,
        grade: users.grade,
        isActive: users.isActive,
        lastLogin: users.lastLogin,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      }
    })
    .from(writingSessions)
    .innerJoin(users, eq(writingSessions.userId, users.id))
    .where(eq(writingSessions.assignmentId, assignmentId))
    .orderBy(desc(writingSessions.updatedAt));

    return submissions.map(s => ({
      ...s,
      student: s.student
    })) as (WritingSession & { student: User })[];
  }

  // AI interaction tracking
  async createAiInteraction(interactionData: InsertAiInteraction): Promise<AiInteraction> {
    const result = await db.insert(aiInteractions).values(interactionData).returning();
    return result[0];
  }

  async getSessionInteractions(sessionId: number): Promise<AiInteraction[]> {
    return await db.select().from(aiInteractions)
      .where(eq(aiInteractions.sessionId, sessionId))
      .orderBy(asc(aiInteractions.createdAt));
  }

  // Grading system
  async gradeWritingSession(sessionId: number, gradeData: { grade: string; teacherFeedback: string; status: string }): Promise<WritingSession | undefined> {
    const result = await db.update(writingSessions)
      .set({
        grade: gradeData.grade,
        teacherFeedback: gradeData.teacherFeedback,
        status: gradeData.status,
        updatedAt: new Date()
      })
      .where(eq(writingSessions.id, sessionId))
      .returning();
    return result[0];
  }

  // Messaging system
  async createMessage(messageData: InsertMessage): Promise<Message> {
    const result = await db.insert(messages).values(messageData).returning();
    return result[0];
  }

  async getUserInboxMessages(userId: number): Promise<(Message & { sender: User })[]> {
    const messagesWithSender = await db.select({
      id: messages.id,
      senderId: messages.senderId,
      receiverId: messages.receiverId,
      subject: messages.subject,
      content: messages.content,
      isRead: messages.isRead,
      createdAt: messages.createdAt,
      sender: {
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        username: users.username,
        password: users.password,
        role: users.role,
        grade: users.grade,
        isActive: users.isActive,
        lastLogin: users.lastLogin,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      }
    })
    .from(messages)
    .innerJoin(users, eq(messages.senderId, users.id))
    .where(eq(messages.receiverId, userId))
    .orderBy(desc(messages.createdAt));

    return messagesWithSender.map(m => ({
      ...m,
      sender: m.sender
    })) as (Message & { sender: User })[];
  }

  async getUserSentMessages(userId: number): Promise<(Message & { receiver: User })[]> {
    const messagesWithReceiver = await db.select({
      id: messages.id,
      senderId: messages.senderId,
      receiverId: messages.receiverId,
      subject: messages.subject,
      content: messages.content,
      isRead: messages.isRead,
      createdAt: messages.createdAt,
      receiver: {
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        username: users.username,
        password: users.password,
        role: users.role,
        grade: users.grade,
        isActive: users.isActive,
        lastLogin: users.lastLogin,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      }
    })
    .from(messages)
    .innerJoin(users, eq(messages.receiverId, users.id))
    .where(eq(messages.senderId, userId))
    .orderBy(desc(messages.createdAt));

    return messagesWithReceiver.map(m => ({
      ...m,
      receiver: m.receiver
    })) as (Message & { receiver: User })[];
  }

  async markMessageAsRead(messageId: number): Promise<void> {
    await db.update(messages)
      .set({ isRead: true })
      .where(eq(messages.id, messageId));
  }

  async getAvailableRecipients(userRole: string): Promise<User[]> {
    // Students can message teachers and admins
    // Teachers can message students and admins
    // Admins can message everyone
    let allowedRoles: string[] = [];
    
    switch (userRole) {
      case 'student':
        allowedRoles = ['teacher', 'admin', 'school_admin'];
        break;
      case 'teacher':
        allowedRoles = ['student', 'admin', 'school_admin'];
        break;
      case 'admin':
      case 'school_admin':
      case 'sage_admin':
        allowedRoles = ['student', 'teacher', 'admin', 'school_admin'];
        break;
      default:
        allowedRoles = [];
    }

    if (allowedRoles.length === 0) return [];

    return await db.select().from(users)
      .where(and(
        eq(users.isActive, true),
        or(...allowedRoles.map(role => eq(users.role, role)))
      ))
      .orderBy(asc(users.role), asc(users.lastName), asc(users.firstName));
  }

  // Classroom management
  async createClassroom(classroomData: InsertClassroom): Promise<Classroom> {
    const result = await db.insert(classrooms).values(classroomData).returning();
    return result[0];
  }

  async getTeacherClassrooms(teacherId: number): Promise<Classroom[]> {
    return await db.select().from(classrooms)
      .where(eq(classrooms.teacherId, teacherId))
      .orderBy(asc(classrooms.name));
  }

  async getAllClassrooms(): Promise<Classroom[]> {
    return await db.select().from(classrooms)
      .orderBy(asc(classrooms.name));
  }

  async getStudentClassrooms(studentId: number): Promise<Classroom[]> {
    const enrolledClassrooms = await db.select({
      id: classrooms.id,
      name: classrooms.name,
      description: classrooms.description,
      teacherId: classrooms.teacherId,
      isActive: classrooms.isActive,
      createdAt: classrooms.createdAt,
      updatedAt: classrooms.updatedAt,
    })
    .from(classroomEnrollments)
    .innerJoin(classrooms, eq(classroomEnrollments.classroomId, classrooms.id))
    .where(eq(classroomEnrollments.studentId, studentId))
    .orderBy(asc(classrooms.name));

    return enrolledClassrooms;
  }

  async getClassroomStudents(classroomId: number): Promise<User[]> {
    const enrolledStudents = await db.select({
      id: users.id,
      firstName: users.firstName,
      lastName: users.lastName,
      email: users.email,
      username: users.username,
      password: users.password,
      role: users.role,
      grade: users.grade,
      isActive: users.isActive,
      lastLogin: users.lastLogin,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
    })
    .from(classroomEnrollments)
    .innerJoin(users, eq(classroomEnrollments.studentId, users.id))
    .where(eq(classroomEnrollments.classroomId, classroomId))
    .orderBy(asc(users.lastName), asc(users.firstName));

    return enrolledStudents;
  }

  async enrollStudentInClassroom(studentId: number, classroomId: number): Promise<void> {
    await db.insert(classroomEnrollments).values({
      studentId,
      classroomId
    });
  }

  async updateClassroom(id: number, updates: Partial<InsertClassroom>): Promise<Classroom | undefined> {
    const result = await db.update(classrooms)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(classrooms.id, id))
      .returning();
    return result[0];
  }

  // Inline comments for grading
  async createInlineComment(commentData: InsertInlineComment): Promise<InlineComment> {
    const result = await db.insert(inlineComments).values(commentData).returning();
    return result[0];
  }

  async getSessionInlineComments(sessionId: number): Promise<InlineComment[]> {
    return await db.select().from(inlineComments)
      .where(eq(inlineComments.sessionId, sessionId))
      .orderBy(asc(inlineComments.startIndex));
  }

  async deleteInlineComment(commentId: number): Promise<void> {
    await db.delete(inlineComments).where(eq(inlineComments.id, commentId));
  }

  // Student profile management
  async getStudentProfile(userId: number): Promise<any | undefined> {
    const result = await db.select().from(studentProfiles).where(eq(studentProfiles.userId, userId)).limit(1);
    return result[0];
  }

  async createStudentProfile(profile: any): Promise<any> {
    const result = await db.insert(studentProfiles).values(profile).returning();
    return result[0];
  }

  async updateStudentProfile(userId: number, updates: any): Promise<any | undefined> {
    const result = await db.update(studentProfiles)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(studentProfiles.userId, userId))
      .returning();
    return result[0];
  }

  async updateLearningProgress(userId: number, interactionData: any): Promise<void> {
    // Implementation for updating learning progress based on AI interactions
    await db.insert(learningProgress).values({
      userId,
      metric: interactionData.type,
      value: 1, // Simplified increment
      maxValue: 100
    });
  }

  // Feedback system
  async createFeedback(feedbackData: InsertFeedback): Promise<Feedback> {
    const result = await db.insert(feedback).values(feedbackData).returning();
    return result[0];
  }

  async getFeedback(id: number): Promise<Feedback | undefined> {
    const result = await db.select().from(feedback).where(eq(feedback.id, id)).limit(1);
    return result[0];
  }

  async getAllFeedback(): Promise<Feedback[]> {
    return await db.select().from(feedback).orderBy(desc(feedback.createdAt));
  }

  async getUserFeedback(userId: number): Promise<Feedback[]> {
    return await db.select().from(feedback).where(eq(feedback.userId, userId)).orderBy(desc(feedback.createdAt));
  }

  async updateFeedback(id: number, updates: Partial<InsertFeedback>): Promise<Feedback | undefined> {
    const result = await db.update(feedback)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(feedback.id, id))
      .returning();
    return result[0];
  }
}
```

This export provides you with the complete foundation of the Sage Educational Platform. The system includes comprehensive user management, assignment workflows, AI integration, grading systems, feedback mechanisms, and role-based access control.

Key features implemented:
- Multi-role authentication (student, teacher, admin, school_admin, sage_admin)
- Real-time writing sessions with auto-save
- AI-powered writing assistance with OpenAI integration
- Comprehensive grading and feedback systems
- Classroom management and enrollment
- Analytics and progress tracking
- FERPA/COPPA compliance features
- Responsive design with dark mode support

Would you like me to continue with the frontend components or focus on any specific part of the codebase?