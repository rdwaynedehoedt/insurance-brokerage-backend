import pool from '../config/database';

async function up() {
  try {
    console.log('Running migration: Adding document fields to clients table...');
    
    // Add new document fields to clients table
    await pool.query(`
      ALTER TABLE clients
      ADD COLUMN coverage_proof VARCHAR(255) NULL,
      ADD COLUMN sum_insured_proof VARCHAR(255) NULL,
      ADD COLUMN policy_fee_invoice VARCHAR(255) NULL,
      ADD COLUMN vat_debit_note VARCHAR(255) NULL,
      ADD COLUMN business_registration_proof VARCHAR(255) NULL
    `);
    
    console.log('Migration successful: Document fields added to clients table.');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
}

async function down() {
  try {
    console.log('Rolling back migration: Removing document fields from clients table...');
    
    // Remove document fields from clients table
    await pool.query(`
      ALTER TABLE clients
      DROP COLUMN coverage_proof,
      DROP COLUMN sum_insured_proof,
      DROP COLUMN policy_fee_invoice,
      DROP COLUMN vat_debit_note,
      DROP COLUMN business_registration_proof
    `);
    
    console.log('Rollback successful: Document fields removed from clients table.');
  } catch (error) {
    console.error('Rollback failed:', error);
    throw error;
  }
}

export { up, down }; 