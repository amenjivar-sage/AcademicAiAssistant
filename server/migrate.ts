import { db } from './db';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { sql } from 'drizzle-orm';

export async function runMigrations() {
  console.log('Running database migrations...');
  
  try {
    // Create tables if they don't exist using raw SQL
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'student',
        first_name TEXT NOT NULL,
        last_name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        department TEXT,
        grade TEXT,
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS assignments (
        id SERIAL PRIMARY KEY,
        teacher_id INTEGER NOT NULL,
        classroom_id INTEGER,
        classroom_ids JSON DEFAULT '[]',
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        due_date TIMESTAMP,
        status TEXT NOT NULL DEFAULT 'active',
        ai_permissions TEXT NOT NULL DEFAULT 'full',
        allow_brainstorming BOOLEAN NOT NULL DEFAULT true,
        allow_outlining BOOLEAN NOT NULL DEFAULT true,
        allow_grammar_check BOOLEAN NOT NULL DEFAULT true,
        allow_research_help BOOLEAN NOT NULL DEFAULT true,
        allow_copy_paste BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS writing_sessions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER,
        assignment_id INTEGER,
        title TEXT NOT NULL,
        content TEXT NOT NULL DEFAULT '',
        pasted_content JSON DEFAULT '[]',
        word_count INTEGER NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'draft',
        submitted_at TIMESTAMP,
        teacher_feedback TEXT,
        grade TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS ai_interactions (
        id SERIAL PRIMARY KEY,
        session_id INTEGER,
        prompt TEXT NOT NULL,
        response TEXT NOT NULL,
        is_restricted BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS classrooms (
        id SERIAL PRIMARY KEY,
        teacher_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        subject TEXT NOT NULL,
        grade_level TEXT,
        class_size INTEGER DEFAULT 30,
        join_code TEXT NOT NULL UNIQUE,
        description TEXT,
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS classroom_enrollments (
        id SERIAL PRIMARY KEY,
        classroom_id INTEGER NOT NULL,
        student_id INTEGER NOT NULL,
        enrolled_at TIMESTAMP NOT NULL DEFAULT NOW(),
        is_active BOOLEAN NOT NULL DEFAULT true
      );
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        sender_id INTEGER NOT NULL,
        receiver_id INTEGER NOT NULL,
        subject TEXT NOT NULL,
        content TEXT NOT NULL,
        is_read BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS feedback (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        category TEXT,
        priority TEXT NOT NULL DEFAULT 'medium',
        rating INTEGER,
        context_type TEXT,
        context_id INTEGER,
        status TEXT NOT NULL DEFAULT 'open',
        admin_response TEXT,
        admin_response_at TIMESTAMP,
        admin_response_by INTEGER,
        user_agent TEXT,
        url TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS inline_comments (
        id SERIAL PRIMARY KEY,
        session_id INTEGER NOT NULL REFERENCES writing_sessions(id),
        teacher_id INTEGER NOT NULL REFERENCES users(id),
        start_index INTEGER NOT NULL,
        end_index INTEGER NOT NULL,
        highlighted_text TEXT NOT NULL,
        comment TEXT NOT NULL,
        created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
      );
    `);

    console.log('Database migrations completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
}