import { db } from "./db";
import { users, assignments, classrooms, classroomEnrollments } from "@shared/schema";

export async function seedDatabase() {
  try {
    // Check if data already exists
    const existingUsers = await db.select().from(users).limit(1);
    if (existingUsers.length > 0) {
      console.log('Database already seeded, skipping...');
      return;
    }

    console.log('Seeding database with initial data...');

    // Create demo users
    const [teacher] = await db.insert(users).values({
      username: "prof.johnson",
      email: "sarah.johnson@university.edu",
      firstName: "Sarah",
      lastName: "Johnson",
      role: "teacher",
      department: "English Literature",
      password: "demo123",
    }).returning();

    const [student] = await db.insert(users).values({
      username: "alex.chen",
      email: "alex.chen@student.edu",
      firstName: "Alex",
      lastName: "Chen", 
      role: "student",
      grade: "Senior",
      password: "demo123",
    }).returning();

    const [maria] = await db.insert(users).values({
      username: "maria.rodriguez",
      email: "maria.rodriguez@student.edu",
      firstName: "Maria",
      lastName: "Rodriguez",
      role: "student", 
      grade: "Junior",
      password: "demo123",
    }).returning();

    const [alexander] = await db.insert(users).values({
      username: "alexander.menjivar",
      email: "alexander.menjivar@student.edu",
      firstName: "Alexander",
      lastName: "Menjivar",
      role: "student", 
      grade: "Senior",
      password: "Dodgers23",
    }).returning();

    // Create demo classroom
    const [classroom] = await db.insert(classrooms).values({
      teacherId: teacher.id,
      name: "Creative Writing Workshop",
      description: "An advanced course in creative writing techniques and storytelling",
      subject: "English",
      gradeLevel: "College",
      classSize: 30,
      joinCode: "CW2024",
    }).returning();

    // Enroll students in the classroom
    await db.insert(classroomEnrollments).values([
      {
        classroomId: classroom.id,
        studentId: student.id,
      },
      {
        classroomId: classroom.id,
        studentId: maria.id,
      },
      {
        classroomId: classroom.id,
        studentId: alexander.id,
      }
    ]);

    // Create demo assignment
    await db.insert(assignments).values({
      teacherId: teacher.id,
      classroomId: classroom.id,
      title: "Character Development Essay",
      description: "Write a 500-word essay analyzing character development in your favorite novel. Focus on how the author uses dialogue, actions, and internal thoughts to reveal personality traits.",
      status: "active",
      aiPermissions: "limited",
      allowCopyPaste: false,
      allowBrainstorming: true,
    });

    console.log('Database seeded successfully!');
  } catch (error) {
    console.error('Error seeding database:', error);
  }
}