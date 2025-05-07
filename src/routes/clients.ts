import { Request, Response, Router } from 'express';
import { Client, ClientData } from '../models/Client';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';

const router = Router();

// Get all clients - accessible to managers and sales reps
router.get('/', authenticate, authorize(['admin', 'manager', 'sales']), async (req: AuthRequest, res: Response) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
    const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;
    
    const clients = await Client.getAll(limit, offset);
    
    res.status(200).json({ success: true, data: clients });
  } catch (error) {
    console.error('Error getting clients:', error);
    res.status(500).json({ success: false, message: 'Failed to get clients' });
  }
});

// Get client by ID
router.get('/:id', authenticate, authorize(['admin', 'manager', 'sales']), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const client = await Client.getById(id);
    
    if (!client) {
      return res.status(404).json({ success: false, message: 'Client not found' });
    }
    
    res.status(200).json({ success: true, data: client });
  } catch (error) {
    console.error('Error getting client by ID:', error);
    res.status(500).json({ success: false, message: 'Failed to get client' });
  }
});

// Create a new client
router.post('/', authenticate, authorize(['admin', 'manager', 'sales']), async (req: AuthRequest, res: Response) => {
  try {
    const clientData: ClientData = req.body;
    
    console.log('Received client data:', JSON.stringify(clientData, null, 2));
    
    // Set sales rep ID if not provided
    if (!clientData.sales_rep_id && req.user?.role === 'sales') {
      clientData.sales_rep_id = req.user.userId;
      console.log('Setting sales_rep_id to:', clientData.sales_rep_id);
    }
    
    // Validate required fields
    const requiredFields = ['customer_type', 'product', 'insurance_provider', 'client_name', 'mobile_no'];
    const missingFields = requiredFields.filter(field => !clientData[field as keyof ClientData]);
    
    if (missingFields.length > 0) {
      console.log('Missing required fields:', missingFields);
      return res.status(400).json({
        success: false,
        message: `Missing required fields: ${missingFields.join(', ')}`
      });
    }
    
    const clientId = await Client.create(clientData);
    console.log('Client created with ID:', clientId);
    
    res.status(201).json({
      success: true,
      message: 'Client created successfully',
      data: { id: clientId }
    });
  } catch (error) {
    console.error('Error creating client:', error);
    res.status(500).json({ success: false, message: 'Failed to create client' });
  }
});

// Update a client
router.put('/:id', authenticate, authorize(['admin', 'manager', 'sales']), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const clientData: Partial<ClientData> = req.body;
    
    // Check if client exists
    const existingClient = await Client.getById(id);
    if (!existingClient) {
      return res.status(404).json({ success: false, message: 'Client not found' });
    }
    
    // Sales reps can only update their own clients
    if (
      req.user?.role === 'sales' && 
      existingClient.sales_rep_id !== req.user.userId
    ) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to update this client'
      });
    }
    
    const updated = await Client.update(id, clientData);
    
    if (!updated) {
      return res.status(500).json({
        success: false,
        message: 'Failed to update client'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Client updated successfully'
    });
  } catch (error) {
    console.error('Error updating client:', error);
    res.status(500).json({ success: false, message: 'Failed to update client' });
  }
});

// Delete a client
router.delete('/:id', authenticate, authorize(['admin', 'manager']), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    
    // Check if client exists
    const existingClient = await Client.getById(id);
    if (!existingClient) {
      return res.status(404).json({ success: false, message: 'Client not found' });
    }
    
    const deleted = await Client.delete(id);
    
    if (!deleted) {
      return res.status(500).json({
        success: false,
        message: 'Failed to delete client'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Client deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting client:', error);
    res.status(500).json({ success: false, message: 'Failed to delete client' });
  }
});

// Search clients
router.post('/search', authenticate, authorize(['admin', 'manager', 'sales']), async (req: AuthRequest, res: Response) => {
  try {
    const searchCriteria: Partial<ClientData> = req.body;
    
    // Sales reps can only search their own clients
    if (req.user?.role === 'sales') {
      searchCriteria.sales_rep_id = req.user.userId;
    }
    
    const clients = await Client.search(searchCriteria);
    
    res.status(200).json({ success: true, data: clients });
  } catch (error) {
    console.error('Error searching clients:', error);
    res.status(500).json({ success: false, message: 'Failed to search clients' });
  }
});

// Get clients by sales rep ID
router.get('/sales-rep/:id', authenticate, authorize(['admin', 'manager']), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    
    const clients = await Client.getBySalesRep(parseInt(id));
    
    res.status(200).json({ success: true, data: clients });
  } catch (error) {
    console.error('Error getting clients by sales rep:', error);
    res.status(500).json({ success: false, message: 'Failed to get clients by sales rep' });
  }
});

export default router; 