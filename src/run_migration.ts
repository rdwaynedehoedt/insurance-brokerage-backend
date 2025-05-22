import { up, down } from './migrations/add_document_fields';

async function runMigration() {
  try {
    // Run the migration
    console.log('Starting migration...');
    await up();
    console.log('Migration completed successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

runMigration(); 