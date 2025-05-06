import pool from '../config/database';
import { hashPassword } from '../utils/auth';

async function seedDatabase() {
  try {
    // Clear existing users
    await pool.query('DELETE FROM users');
    
    // Create admin user
    const hashedPassword = await hashPassword('admin123');
    
    await pool.query(
      'INSERT INTO users (email, password, first_name, last_name, role, phone_number, status, last_login) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)',
      ['admin@example.com', hashedPassword, 'Admin', 'User', 'admin', '+1234567890', 'active']
    );
    
    // Create manager user
    await pool.query(
      'INSERT INTO users (email, password, first_name, last_name, role, phone_number, status, last_login) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)',
      ['manager@example.com', hashedPassword, 'Manager', 'User', 'manager', '+1234567891', 'active']
    );
    
    // Create underwriter user
    await pool.query(
      'INSERT INTO users (email, password, first_name, last_name, role, phone_number, status, last_login) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)',
      ['underwriter@example.com', hashedPassword, 'Underwriter', 'User', 'underwriter', '+1234567892', 'active']
    );
    
    // Create sales user
    await pool.query(
      'INSERT INTO users (email, password, first_name, last_name, role, phone_number, status, last_login) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)',
      ['sales@example.com', hashedPassword, 'Sales', 'User', 'sales', '+1234567893', 'active']
    );
    
    console.log('Test users created successfully');
    console.log('Database seeding completed');
    
    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
}

seedDatabase(); 