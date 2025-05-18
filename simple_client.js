const mysql = require('mysql2/promise');
const { v4: uuidv4 } = require('uuid');

async function addSimpleClient() {
  try {
    // Create MySQL connection
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'insurance_brokerage'
    });

    console.log('Connected to database');
    
    // Get table structure
    const [columns] = await connection.query('SHOW COLUMNS FROM clients');
    console.log('Table columns:');
    columns.forEach(col => {
      console.log(`${col.Field}: ${col.Type} ${col.Null === 'YES' ? 'NULL' : 'NOT NULL'}`);
    });
    
    // Create a simple client with only required fields
    const clientId = uuidv4();
    
    const query = `
      INSERT INTO clients (
        id, 
        customer_type, 
        product, 
        insurance_provider, 
        client_name, 
        mobile_no
      ) VALUES (?, ?, ?, ?, ?, ?)
    `;
    
    const params = [
      clientId,
      'Individual',
      'Motor Insurance',
      'ABC Insurance',
      'Test Client',
      '+94771234567'
    ];
    
    const [result] = await connection.execute(query, params);
    console.log(`Inserted client with ID: ${clientId}`);
    console.log(`Affected rows: ${result.affectedRows}`);
    
    // Close connection
    await connection.end();
    console.log('Database connection closed');
    
  } catch (error) {
    console.error('Error adding simple client:', error);
  }
}

addSimpleClient(); 