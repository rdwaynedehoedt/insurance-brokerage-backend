import { Router, Request, Response } from 'express';
import pool from '../config/database';

const router = Router();

router.get('/test-db', async (req: Request, res: Response) => {
  try {
    // Test basic connection
    const [connectionTest] = await pool.query('SELECT 1 + 1 AS result');
    
    // Test users table
    const [users] = await pool.query('SELECT COUNT(*) as userCount FROM users');
    
    res.json({ 
      message: 'Database connection successful',
      connectionTest,
      users,
      databaseInfo: {
        host: process.env.DB_HOST,
        database: process.env.DB_NAME,
        port: process.env.DB_PORT
      }
    });
  } catch (error) {
    console.error('Database connection error:', error);
    res.status(500).json({ 
      message: 'Database connection failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router; 