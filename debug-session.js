// Quick debug script to test session retrieval directly
const { Pool } = require('@neondatabase/serverless');
const { drizzle } = require('drizzle-orm/neon-serverless');
const { eq } = require('drizzle-orm');
const { writingSessions } = require('./shared/schema');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle({ client: pool });

async function testSessionRetrieval() {
  try {
    console.log('Testing direct database query for session ID 2...');
    
    // Direct SQL query
    const result = await pool.query('SELECT * FROM writing_sessions WHERE id = $1', [2]);
    console.log('Direct SQL result:', result.rows);
    
    // Drizzle query
    const [session] = await db.select().from(writingSessions).where(eq(writingSessions.id, 2));
    console.log('Drizzle query result:', session);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

testSessionRetrieval();