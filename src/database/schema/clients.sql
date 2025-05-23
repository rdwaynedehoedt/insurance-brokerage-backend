-- Create clients table
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
    sales_rep_id VARCHAR(50),
    policies INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (sales_rep_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Create index on common search fields
CREATE INDEX idx_client_name ON clients(client_name);
CREATE INDEX idx_mobile_no ON clients(mobile_no);
CREATE INDEX idx_policy_no ON clients(policy_no);
CREATE INDEX idx_product ON clients(product);
CREATE INDEX idx_sales_rep ON clients(sales_rep_id); 