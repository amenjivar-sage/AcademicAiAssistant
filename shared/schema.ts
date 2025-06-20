import { pgTable, text, serial, integer, boolean, timestamp, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").notNull().default("student"), // "student", "teacher", "admin", "school_admin"
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
  classroomId: integer("classroom_id"), // Link to specific classroom (deprecated - use classroomIds)
  classroomIds: json("classroom_ids").default([]), // Array of classroom IDs this assignment is assigned to
  title: text("title").notNull(),
  description: text("description").notNull(),
  dueDate: timestamp("due_date"),
  status: text("status").notNull().default("active"), // "active", "completed", "overdue"
  aiPermissions: text("ai_permissions").notNull().default("full"), // "full", "limited", "none"
  allowBrainstorming: boolean("allow_brainstorming").notNull().default(true),
  allowOutlining: boolean("allow_outlining").notNull().default(true),
  allowGrammarCheck: boolean("allow_grammar_check").notNull().default(true),
  allowResearchHelp: boolean("allow_research_help").notNull().default(true),
  allowCopyPaste: boolean("allow_copy_paste").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const writingSessions = pgTable("writing_sessions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id"),
  assignmentId: integer("assignment_id"), // Links to specific assignment
  title: text("title").notNull(),
  content: text("content").notNull().default(""),
  pastedContent: json("pasted_content").default([]), // Array of {text, startIndex, endIndex, timestamp}
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

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  senderId: integer("sender_id").notNull(),
  receiverId: integer("receiver_id").notNull(),
  subject: text("subject").notNull(),
  content: text("content").notNull(),
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  createdAt: true,
});

// Writing streaks and achievements
export const writingStreaks = pgTable("writing_streaks", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  currentStreak: integer("current_streak").notNull().default(0),
  longestStreak: integer("longest_streak").notNull().default(0),
  lastWritingDate: timestamp("last_writing_date"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const achievements = pgTable("achievements", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  type: text("type").notNull(), // "streak", "wordcount", "assignment", "improvement"
  name: text("name").notNull(),
  description: text("description").notNull(),
  badgeIcon: text("badge_icon").notNull(),
  unlockedAt: timestamp("unlocked_at").notNull().defaultNow(),
});

export const writingGoals = pgTable("writing_goals", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  type: text("type").notNull(), // "daily", "weekly", "assignment"
  targetWords: integer("target_words").notNull(),
  currentProgress: integer("current_progress").notNull().default(0),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date"),
  isCompleted: boolean("is_completed").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

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

export const insertWritingStreakSchema = createInsertSchema(writingStreaks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAchievementSchema = createInsertSchema(achievements).omit({
  id: true,
  unlockedAt: true,
});

export const insertWritingGoalSchema = createInsertSchema(writingGoals).omit({
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
export type Feedback = typeof feedback.$inferSelect;
export type InsertFeedback = z.infer<typeof insertFeedbackSchema>;
export type ClassroomEnrollment = typeof classroomEnrollments.$inferSelect;
export type InsertClassroomEnrollment = z.infer<typeof insertClassroomEnrollmentSchema>;
export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type WritingStreak = typeof writingStreaks.$inferSelect;
export type InsertWritingStreak = z.infer<typeof insertWritingStreakSchema>;
export type Achievement = typeof achievements.$inferSelect;
export type InsertAchievement = z.infer<typeof insertAchievementSchema>;
export type WritingGoal = typeof writingGoals.$inferSelect;
export type InsertWritingGoal = z.infer<typeof insertWritingGoalSchema>;

// Inline comments table for teacher feedback on specific text selections
export const inlineComments = pgTable("inline_comments", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id").notNull().references(() => writingSessions.id),
  teacherId: integer("teacher_id").notNull().references(() => users.id),
  startIndex: integer("start_index").notNull(),
  endIndex: integer("end_index").notNull(),
  highlightedText: text("highlighted_text").notNull(),
  comment: text("comment").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertInlineCommentSchema = createInsertSchema(inlineComments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InlineComment = typeof inlineComments.$inferSelect;
export type InsertInlineComment = z.infer<typeof insertInlineCommentSchema>;

// Student learning profiles to track progress and adapt AI responses
export const studentProfiles = pgTable("student_profiles", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  writingLevel: text("writing_level").default("beginner"), // beginner, intermediate, advanced
  strengths: json("strengths").default([]), // array of identified strengths
  weaknesses: json("weaknesses").default([]), // array of areas needing improvement
  writingStyle: text("writing_style"), // descriptive, analytical, creative, etc.
  commonMistakes: json("common_mistakes").default([]), // recurring issues
  improvementAreas: json("improvement_areas").default([]), // current focus areas
  learningPreferences: json("learning_preferences").default({}), // how they learn best
  totalWordsWritten: integer("total_words_written").default(0),
  totalSessions: integer("total_sessions").default(0),
  averageGrade: text("average_grade"),
  lastInteractionSummary: text("last_interaction_summary"), // context from recent AI chats
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertStudentProfileSchema = createInsertSchema(studentProfiles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type StudentProfile = typeof studentProfiles.$inferSelect;
export type InsertStudentProfile = z.infer<typeof insertStudentProfileSchema>;
