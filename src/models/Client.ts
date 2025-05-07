import pool from '../config/database';
import { v4 as uuidv4 } from 'uuid';

export interface ClientData {
  id?: string;
  introducer_code?: string;
  customer_type: string;
  product: string;
  policy_?: string;
  insurance_provider: string;
  branch?: string;
  client_name: string;
  street1?: string;
  street2?: string;
  city?: string;
  district?: string;
  province?: string;
  telephone?: string;
  mobile_no: string;
  contact_person?: string;
  email?: string;
  social_media?: string;
  nic_proof?: string;
  dob_proof?: string;
  business_registration?: string;
  svat_proof?: string;
  vat_proof?: string;
  policy_type?: string;
  policy_no?: string;
  policy_period_from?: string;
  policy_period_to?: string;
  coverage?: string;
  sum_insured?: number;
  basic_premium?: number;
  srcc_premium?: number;
  tc_premium?: number;
  net_premium?: number;
  stamp_duty?: number;
  admin_fees?: number;
  road_safety_fee?: number;
  policy_fee?: number;
  vat_fee?: number;
  total_invoice?: number;
  debit_note?: string;
  payment_receipt?: string;
  commission_type?: string;
  commission_basic?: number;
  commission_srcc?: number;
  commission_tc?: number;
  sales_rep_id?: number;
  policies?: number;
}

export class Client {
  // Create a new client
  static async create(data: ClientData): Promise<string> {
    try {
      const clientId = data.id || `C${uuidv4().substring(0, 8)}`;
      
      // Create a clean copy of data without undefined values and remove the id field
      const cleanData: any = {};
      Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined && key !== 'id') {
          cleanData[key] = value;
        }
      });
      
      // Generate placeholder fields for the SQL query
      const fields = Object.keys(cleanData).join(', ');
      const placeholders = Object.keys(cleanData).map(() => '?').join(', ');
      
      const values = Object.values(cleanData);
      
      const query = `
        INSERT INTO clients (id, ${fields}) 
        VALUES (?, ${placeholders})
      `;
      
      console.log('Client create query:', query);
      console.log('Client create values length:', values.length);
      console.log('Client ID:', clientId);
      
      // Prepare final values array with clientId at the beginning
      const finalValues = [clientId, ...values];
      
      const [result]: any = await pool.query(query, finalValues);
      console.log('Client create result:', JSON.stringify(result, null, 2));
      return clientId;
    } catch (error) {
      console.error('Error creating client:', error);
      throw error;
    }
  }
  
  // Get a client by ID
  static async getById(id: string): Promise<ClientData | null> {
    try {
      const [rows]: any = await pool.query('SELECT * FROM clients WHERE id = ?', [id]);
      
      if (rows.length === 0) {
        return null;
      }
      
      return rows[0];
    } catch (error) {
      console.error('Error getting client by ID:', error);
      throw error;
    }
  }
  
  // Get all clients
  static async getAll(limit: number = 100, offset: number = 0): Promise<ClientData[]> {
    try {
      const [rows]: any = await pool.query(
        'SELECT * FROM clients ORDER BY created_at DESC LIMIT ? OFFSET ?',
        [limit, offset]
      );
      
      return rows;
    } catch (error) {
      console.error('Error getting all clients:', error);
      throw error;
    }
  }
  
  // Update a client
  static async update(id: string, data: Partial<ClientData>): Promise<boolean> {
    try {
      // Create a clean copy of data without undefined values
      const cleanData: any = {};
      Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined) {
          cleanData[key] = value;
        }
      });
      
      if (Object.keys(cleanData).length === 0) {
        // No fields to update
        console.log('No fields to update for client:', id);
        return true;
      }
      
      // Create SET clause for SQL
      const setClause = Object.keys(cleanData)
        .map(key => `${key} = ?`)
        .join(', ');
      
      const values = [...Object.values(cleanData), id];
      
      const query = `UPDATE clients SET ${setClause} WHERE id = ?`;
      console.log('Update query:', query);
      console.log('Update values length:', values.length);
      
      const [result]: any = await pool.query(query, values);
      console.log('Update result:', JSON.stringify(result, null, 2));
      
      return result.affectedRows > 0;
    } catch (error) {
      console.error('Error updating client:', error);
      throw error;
    }
  }
  
  // Delete a client
  static async delete(id: string): Promise<boolean> {
    try {
      const [result]: any = await pool.query('DELETE FROM clients WHERE id = ?', [id]);
      return result.affectedRows > 0;
    } catch (error) {
      console.error('Error deleting client:', error);
      throw error;
    }
  }
  
  // Search clients by various criteria
  static async search(criteria: Partial<ClientData>): Promise<ClientData[]> {
    try {
      const whereConditions = Object.keys(criteria)
        .map(key => `${key} LIKE ?`)
        .join(' OR ');
      
      const values = Object.values(criteria).map(value => `%${value}%`);
      
      const [rows]: any = await pool.query(
        `SELECT * FROM clients WHERE ${whereConditions} ORDER BY created_at DESC LIMIT 100`,
        values
      );
      
      return rows;
    } catch (error) {
      console.error('Error searching clients:', error);
      throw error;
    }
  }
  
  // Get clients by sales rep ID
  static async getBySalesRep(salesRepId: number): Promise<ClientData[]> {
    try {
      const [rows]: any = await pool.query(
        'SELECT * FROM clients WHERE sales_rep_id = ? ORDER BY created_at DESC',
        [salesRepId]
      );
      
      return rows;
    } catch (error) {
      console.error('Error getting clients by sales rep:', error);
      throw error;
    }
  }
} 