import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").notNull().default("student"), // "student" or "teacher"
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull().unique(),
  department: text("department"),
  grade: text("grade"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const assignments = pgTable("assignments", {
  id: serial("id").primaryKey(),
  teacherId: integer("teacher_id").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  dueDate: timestamp("due_date"),
  status: text("status").notNull().default("active"), // "active", "completed", "overdue"
  aiPermissions: text("ai_permissions").notNull().default("full"), // "full", "limited", "none"
  allowBrainstorming: boolean("allow_brainstorming").notNull().default(true),
  allowOutlining: boolean("allow_outlining").notNull().default(true),
  allowGrammarCheck: boolean("allow_grammar_check").notNull().default(true),
  allowResearchHelp: boolean("allow_research_help").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const writingSessions = pgTable("writing_sessions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id"),
  assignmentId: integer("assignment_id"), // Links to specific assignment
  title: text("title").notNull(),
  content: text("content").notNull().default(""),
  wordCount: integer("word_count").notNull().default(0),
  status: text("status").notNull().default("draft"), // "draft", "submitted", "graded"
  submittedAt: timestamp("submitted_at"),
  teacherFeedback: text("teacher_feedback"),
  grade: text("grade"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const aiInteractions = pgTable("ai_interactions", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id"),
  prompt: text("prompt").notNull(),
  response: text("response").notNull(),
  isRestricted: boolean("is_restricted").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const classrooms = pgTable("classrooms", {
  id: serial("id").primaryKey(),
  teacherId: integer("teacher_id").notNull(),
  name: text("name").notNull(),
  subject: text("subject").notNull(),
  gradeLevel: text("grade_level"),
  classSize: integer("class_size").default(30),
  joinCode: text("join_code").notNull().unique(),
  description: text("description"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const classroomEnrollments = pgTable("classroom_enrollments", {
  id: serial("id").primaryKey(),
  classroomId: integer("classroom_id").notNull(),
  studentId: integer("student_id").notNull(),
  enrolledAt: timestamp("enrolled_at").notNull().defaultNow(),
  isActive: boolean("is_active").notNull().default(true),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  role: true,
  firstName: true,
  lastName: true,
  email: true,
  department: true,
  grade: true,
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
  submittedAt: true,
});

export const insertAiInteractionSchema = createInsertSchema(aiInteractions).omit({
  id: true,
  createdAt: true,
});

export const insertClassroomSchema = createInsertSchema(classrooms).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  joinCode: true, // Auto-generated
});

export const insertClassroomEnrollmentSchema = createInsertSchema(classroomEnrollments).omit({
  id: true,
  enrolledAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type Assignment = typeof assignments.$inferSelect;
export type InsertAssignment = z.infer<typeof insertAssignmentSchema>;
export type WritingSession = typeof writingSessions.$inferSelect;
export type InsertWritingSession = z.infer<typeof insertWritingSessionSchema>;
export type AiInteraction = typeof aiInteractions.$inferSelect;
export type InsertAiInteraction = z.infer<typeof insertAiInteractionSchema>;
export type Classroom = typeof classrooms.$inferSelect;
export type InsertClassroom = z.infer<typeof insertClassroomSchema>;
export type ClassroomEnrollment = typeof classroomEnrollments.$inferSelect;
export type InsertClassroomEnrollment = z.infer<typeof insertClassroomEnrollmentSchema>;
