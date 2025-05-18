const mysql = require('mysql2/promise');
const { v4: uuidv4 } = require('uuid');

const fakeClients = [
  {
    id: uuidv4(),
    introducer_code: 'INT001',
    customer_type: 'Individual',
    product: 'Motor Insurance',
    policy_: 'Comprehensive',
    insurance_provider: 'ABC Insurance',
    branch: 'Central Branch',
    client_name: 'John Smith',
    street1: '123 Main St',
    street2: 'Apt 4B',
    city: 'Colombo',
    district: 'Colombo',
    province: 'Western',
    telephone: '+94112345678',
    mobile_no: '+94771234567',
    contact_person: 'John Smith',
    email: 'john.smith@example.com',
    social_media: '@johnsmith',
    policy_type: 'Annual',
    policy_no: 'POL-123456',
    policy_period_from: '2023-01-01',
    policy_period_to: '2024-01-01',
    coverage: 'Full Coverage',
    sum_insured: 2500000,
    basic_premium: 25000,
    srcc_premium: 1000,
    tc_premium: 500,
    net_premium: 26500,
    stamp_duty: 250,
    admin_fees: 500,
    road_safety_fee: 100,
    policy_fee: 150,
    vat_fee: 3975,
    total_invoice: 31475,
    debit_note: 'DN-123456',
    payment_receipt: 'PR-123456',
    commission_type: 'Standard',
    commission_basic: 2500,
    commission_srcc: 100,
    commission_tc: 50,
    sales_rep_id: 4 // Sales user
  },
  {
    id: uuidv4(),
    introducer_code: 'INT002',
    customer_type: 'Corporate',
    product: 'Fire Insurance',
    policy_: 'Standard',
    insurance_provider: 'XYZ Insurance',
    branch: 'North Branch',
    client_name: 'Tech Solutions Ltd',
    street1: '456 Business Park',
    street2: 'Tower B, Floor 5',
    city: 'Kandy',
    district: 'Kandy',
    province: 'Central',
    telephone: '+94812345678',
    mobile_no: '+94772345678',
    contact_person: 'Sarah Johnson',
    email: 'info@techsolutions.com',
    social_media: '@techsolutions',
    policy_type: 'Annual',
    policy_no: 'POL-789012',
    policy_period_from: '2023-02-15',
    policy_period_to: '2024-02-15',
    coverage: 'Standard Coverage',
    sum_insured: 10000000,
    basic_premium: 100000,
    srcc_premium: 5000,
    tc_premium: 2500,
    net_premium: 107500,
    stamp_duty: 1000,
    admin_fees: 2000,
    policy_fee: 500,
    vat_fee: 16125,
    total_invoice: 127125,
    debit_note: 'DN-789012',
    payment_receipt: 'PR-789012',
    commission_type: 'Premium',
    commission_basic: 15000,
    commission_srcc: 750,
    commission_tc: 375,
    sales_rep_id: 4 // Sales user
  },
  {
    id: uuidv4(),
    introducer_code: 'INT003',
    customer_type: 'Individual',
    product: 'Health Insurance',
    policy_: 'Premium',
    insurance_provider: 'Health First Insurance',
    branch: 'East Branch',
    client_name: 'Mary Williams',
    street1: '789 Health Avenue',
    street2: '',
    city: 'Galle',
    district: 'Galle',
    province: 'Southern',
    telephone: '+94912345678',
    mobile_no: '+94773456789',
    contact_person: 'Mary Williams',
    email: 'mary.williams@example.com',
    social_media: '@marywilliams',
    policy_type: 'Annual',
    policy_no: 'POL-345678',
    policy_period_from: '2023-03-10',
    policy_period_to: '2024-03-10',
    coverage: 'Premium Coverage',
    sum_insured: 1500000,
    basic_premium: 45000,
    srcc_premium: 0,
    tc_premium: 0,
    net_premium: 45000,
    stamp_duty: 250,
    admin_fees: 1000,
    policy_fee: 300,
    vat_fee: 6750,
    total_invoice: 53300,
    debit_note: 'DN-345678',
    payment_receipt: 'PR-345678',
    commission_type: 'Standard',
    commission_basic: 4500,
    commission_srcc: 0,
    commission_tc: 0,
    sales_rep_id: 4 // Sales user
  },
  {
    id: uuidv4(),
    introducer_code: 'INT004',
    customer_type: 'Corporate',
    product: 'Liability Insurance',
    policy_: 'Comprehensive',
    insurance_provider: 'Secure Insurance',
    branch: 'West Branch',
    client_name: 'Global Traders Inc',
    street1: '101 Trade Center',
    street2: 'Suite 200',
    city: 'Jaffna',
    district: 'Jaffna',
    province: 'Northern',
    telephone: '+94212345678',
    mobile_no: '+94774567890',
    contact_person: 'Robert Chen',
    email: 'info@globaltraders.com',
    social_media: '@globaltraders',
    policy_type: 'Annual',
    policy_no: 'POL-901234',
    policy_period_from: '2023-04-20',
    policy_period_to: '2024-04-20',
    coverage: 'Full Coverage',
    sum_insured: 5000000,
    basic_premium: 75000,
    srcc_premium: 3000,
    tc_premium: 1500,
    net_premium: 79500,
    stamp_duty: 750,
    admin_fees: 1500,
    policy_fee: 400,
    vat_fee: 11925,
    total_invoice: 94075,
    debit_note: 'DN-901234',
    payment_receipt: 'PR-901234',
    commission_type: 'Premium',
    commission_basic: 11250,
    commission_srcc: 450,
    commission_tc: 225,
    sales_rep_id: 4 // Sales user
  },
  {
    id: uuidv4(),
    introducer_code: 'INT005',
    customer_type: 'Individual',
    product: 'Travel Insurance',
    policy_: 'Standard',
    insurance_provider: 'Travel Safe Insurance',
    branch: 'South Branch',
    client_name: 'David Brown',
    street1: '234 Palm Road',
    street2: '',
    city: 'Negombo',
    district: 'Gampaha',
    province: 'Western',
    telephone: '+94112345679',
    mobile_no: '+94775678901',
    contact_person: 'David Brown',
    email: 'david.brown@example.com',
    social_media: '@davidbrown',
    policy_type: 'Short Term',
    policy_no: 'POL-567890',
    policy_period_from: '2023-05-15',
    policy_period_to: '2023-06-15',
    coverage: 'Standard Coverage',
    sum_insured: 500000,
    basic_premium: 5000,
    srcc_premium: 0,
    tc_premium: 0,
    net_premium: 5000,
    stamp_duty: 100,
    admin_fees: 300,
    policy_fee: 100,
    vat_fee: 750,
    total_invoice: 6250,
    debit_note: 'DN-567890',
    payment_receipt: 'PR-567890',
    commission_type: 'Standard',
    commission_basic: 500,
    commission_srcc: 0,
    commission_tc: 0,
    sales_rep_id: 4 // Sales user
  }
];

async function addFakeClients() {
  try {
    // Create MySQL connection
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'insurance_brokerage'
    });

    console.log('Connected to database');
    
    // Clear existing clients if needed
    // Uncomment this if you want to clear existing clients first
    // await connection.execute('DELETE FROM clients');
    // console.log('Cleared existing clients');
    
    // Insert fake clients
    let insertedCount = 0;
    
    for (const client of fakeClients) {
      try {
        await connection.execute(
          `INSERT INTO clients (
            id, introducer_code, customer_type, product, policy_, insurance_provider,
            branch, client_name, street1, street2, city, district, province,
            telephone, mobile_no, contact_person, email, social_media,
            policy_type, policy_no, policy_period_from, policy_period_to,
            coverage, sum_insured, basic_premium, srcc_premium, tc_premium,
            net_premium, stamp_duty, admin_fees, road_safety_fee, policy_fee,
            vat_fee, total_invoice, debit_note, payment_receipt,
            commission_type, commission_basic, commission_srcc, commission_tc,
            sales_rep_id
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            client.id, client.introducer_code, client.customer_type, client.product, client.policy_, client.insurance_provider,
            client.branch, client.client_name, client.street1, client.street2, client.city, client.district, client.province,
            client.telephone, client.mobile_no, client.contact_person, client.email, client.social_media,
            client.policy_type, client.policy_no, client.policy_period_from, client.policy_period_to,
            client.coverage, client.sum_insured, client.basic_premium, client.srcc_premium, client.tc_premium,
            client.net_premium, client.stamp_duty, client.admin_fees, client.road_safety_fee, client.policy_fee,
            client.vat_fee, client.total_invoice, client.debit_note, client.payment_receipt,
            client.commission_type, client.commission_basic, client.commission_srcc, client.commission_tc,
            client.sales_rep_id
          ]
        );
        insertedCount++;
      } catch (err) {
        console.error(`Error inserting client ${client.client_name}:`, err.message);
      }
    }
    
    console.log(`Successfully inserted ${insertedCount} fake clients`);
    
    // Close connection
    await connection.end();
    console.log('Database connection closed');
    
  } catch (error) {
    console.error('Error adding fake clients:', error);
  }
}

addFakeClients(); 