-- Create database if it doesn't exist
CREATE DATABASE IF NOT EXISTS insurance_brokerage;

-- Use the database
USE insurance_brokerage;

-- Create users table
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
);

-- Insert default admin user (password: admin123)
INSERT INTO users (email, password, first_name, last_name, role, phone_number)
VALUES (
    'admin@example.com',
    '$2a$10$X7UrH5YxX5YxX5YxX5YxX.5YxX5YxX5YxX5YxX5YxX5YxX5YxX5Yx',
    'Admin',
    'User',
    'admin',
    '+1234567890'
) ON DUPLICATE KEY UPDATE id=id; 