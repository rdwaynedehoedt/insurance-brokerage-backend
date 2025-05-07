import pool from '../config/database';
import fs from 'fs';
import path from 'path';

async function initializeDatabase() {
  try {
    // Create database first
    await pool.query('CREATE DATABASE IF NOT EXISTS insurance_brokerage');
    console.log('Database created or already exists');
    
    // Switch to the database
    await pool.query('USE insurance_brokerage');
    console.log('Using insurance_brokerage database');
    
    // Create users table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT PRIMARY KEY AUTO_INCREMENT,
        email VARCHAR(255) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        role ENUM('admin', 'manager', 'underwriter', 'sales') NOT NULL,
        phone_number VARCHAR(20),
        is_active BOOLEAN DEFAULT true,
        last_login TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    console.log('Users table created successfully');
    
    // Create clients table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS clients (
        id VARCHAR(50) PRIMARY KEY,
        introducer_code VARCHAR(50),
        customer_type VARCHAR(50) NOT NULL,
        product VARCHAR(50) NOT NULL,
        policy_ VARCHAR(100),
        insurance_provider VARCHAR(100) NOT NULL,
        branch VARCHAR(100),
        client_name VARCHAR(255) NOT NULL,
        street1 VARCHAR(255),
        street2 VARCHAR(255),
        city VARCHAR(100),
        district VARCHAR(100),
        province VARCHAR(100),
        telephone VARCHAR(50),
        mobile_no VARCHAR(50) NOT NULL,
        contact_person VARCHAR(255),
        email VARCHAR(255),
        social_media VARCHAR(255),
        nic_proof VARCHAR(255),
        dob_proof VARCHAR(255),
        business_registration VARCHAR(255),
        svat_proof VARCHAR(255),
        vat_proof VARCHAR(255),
        policy_type VARCHAR(100),
        policy_no VARCHAR(100),
        policy_period_from VARCHAR(50),
        policy_period_to VARCHAR(50),
        coverage VARCHAR(255),
        sum_insured DECIMAL(15, 2) DEFAULT 0,
        basic_premium DECIMAL(15, 2) DEFAULT 0,
        srcc_premium DECIMAL(15, 2) DEFAULT 0,
        tc_premium DECIMAL(15, 2) DEFAULT 0,
        net_premium DECIMAL(15, 2) DEFAULT 0,
        stamp_duty DECIMAL(15, 2) DEFAULT 0,
        admin_fees DECIMAL(15, 2) DEFAULT 0,
        road_safety_fee DECIMAL(15, 2) DEFAULT 0,
        policy_fee DECIMAL(15, 2) DEFAULT 0,
        vat_fee DECIMAL(15, 2) DEFAULT 0,
        total_invoice DECIMAL(15, 2) DEFAULT 0,
        debit_note VARCHAR(100),
        payment_receipt VARCHAR(100),
        commission_type VARCHAR(50),
        commission_basic DECIMAL(15, 2) DEFAULT 0,
        commission_srcc DECIMAL(15, 2) DEFAULT 0,
        commission_tc DECIMAL(15, 2) DEFAULT 0,
        sales_rep_id INT,
        policies INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (sales_rep_id) REFERENCES users(id) ON DELETE SET NULL
      )
    `);
    console.log('Clients table created successfully');
    
    // Create indexes for clients table
    await pool.query('CREATE INDEX IF NOT EXISTS idx_client_name ON clients(client_name)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_mobile_no ON clients(mobile_no)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_policy_no ON clients(policy_no)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_product ON clients(product)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_sales_rep ON clients(sales_rep_id)');
    
    console.log('Client indexes created successfully');
    console.log('Database initialization completed');
    
    process.exit(0);
  } catch (error) {
    console.error('Error initializing database:', error);
    process.exit(1);
  }
}

initializeDatabase(); 