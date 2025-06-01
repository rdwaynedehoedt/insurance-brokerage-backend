import { Request, Response, Router } from 'express';
import { Client, ClientData } from '../models/Client';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';

const router = Router();

// File filter to restrict file types
const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, and PDF files are allowed.'));
  }
};

// Configure multer for file uploads with dynamic client folders
const storage = multer.diskStorage({
  destination: (req: any, file, cb) => {
    // Use client ID from request when available, otherwise use a temporary ID
    // We'll handle moving files later when the actual client ID is generated
    const clientId = req.params.id || `temp-${uuidv4()}`;
    
    // Create client-specific directory
    const clientDir = path.join(__dirname, '../../uploads/documents', clientId);
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(clientDir)) {
      fs.mkdirSync(clientDir, { recursive: true });
    }
    
    // Log for debugging
    console.log(`Storing document in directory: ${clientDir}`);
    
    cb(null, clientDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename with original extension
    const uniqueId = uuidv4();
    const fileExtension = path.extname(file.originalname);
    const documentType = req.body.documentType || file.fieldname;
    
    // Include document type in filename for better organization
    const filename = `${documentType}-${uniqueId}${fileExtension}`;
    console.log(`Generated filename: ${filename}`);
    
    cb(null, filename);
  }
});

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

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

// Create client with documents
router.post('/with-documents', 
  authenticate, 
  authorize(['admin', 'manager', 'sales']),
  upload.fields([
    { name: 'coverage_proof', maxCount: 1 },
    { name: 'sum_insured_proof', maxCount: 1 },
    { name: 'policy_fee_invoice', maxCount: 1 },
    { name: 'vat_debit_note', maxCount: 1 },
    { name: 'payment_receipt', maxCount: 1 },
    { name: 'nic_proof', maxCount: 1 },
    { name: 'dob_proof', maxCount: 1 },
    { name: 'business_registration_proof', maxCount: 1 },
    { name: 'svat_proof', maxCount: 1 },
    { name: 'vat_proof', maxCount: 1 }
  ]),
  async (req: AuthRequest, res: Response) => {
    try {
      const clientData: any = JSON.parse(JSON.stringify(req.body));
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      
      // Generate a temporary client id for the folder - with a recognizable prefix
      const tempClientId = `temp-${uuidv4()}`;
      console.log(`Using temporary client ID for document upload: ${tempClientId}`);
      
      // Set sales rep ID if not provided
      if (!clientData.sales_rep_id && req.user?.role === 'sales') {
        clientData.sales_rep_id = req.user.userId;
      }
      
      // Validate required fields
      const requiredFields = ['customer_type', 'product', 'insurance_provider', 'client_name', 'mobile_no'];
      const missingFields = requiredFields.filter(field => !clientData[field]);
      
      if (missingFields.length > 0) {
        return res.status(400).json({
          success: false,
          message: `Missing required fields: ${missingFields.join(', ')}`
        });
      }
      
      // Add file paths to client data
      Object.keys(files).forEach(fieldName => {
        const file = files[fieldName][0];
        const relativePath = `/uploads/documents/${tempClientId}/${file.filename}`;
        clientData[fieldName] = relativePath;
        console.log(`Document path for ${fieldName}: ${relativePath}`);
      });
      
      // Create the client
      const clientId = await Client.create(clientData);
      console.log(`Created client with ID: ${clientId}`);
      
      // Rename the temp folder to the actual client ID
      const tempDir = path.join(__dirname, '../../uploads/documents', tempClientId);
      const clientDir = path.join(__dirname, '../../uploads/documents', clientId);
      
      try {
      if (fs.existsSync(tempDir)) {
        // Create the client directory if it doesn't exist
        if (!fs.existsSync(path.dirname(clientDir))) {
          fs.mkdirSync(path.dirname(clientDir), { recursive: true });
        }
          
          if (fs.existsSync(clientDir)) {
            console.log(`Client directory already exists, removing to replace: ${clientDir}`);
            fs.rmSync(clientDir, { recursive: true, force: true });
          }
          
          console.log(`Moving documents from ${tempDir} to ${clientDir}`);
        
        // Rename the directory
        fs.renameSync(tempDir, clientDir);
        
        // Update the file paths in the database
        const updateData: any = {};
          let allFilesUpdated = true;
          
        Object.keys(files).forEach(fieldName => {
          const oldPath = clientData[fieldName];
          const newPath = oldPath.replace(tempClientId, clientId);
          updateData[fieldName] = newPath;
            
            // Verify the file was moved and exists in the new location
            const newFilePath = path.join(__dirname, '../../', newPath);
            if (!fs.existsSync(newFilePath)) {
              console.error(`File not found at new location: ${newFilePath}`);
              allFilesUpdated = false;
            } else {
              console.log(`File updated successfully at: ${newFilePath}`);
            }
            
            console.log(`Updating document path: ${oldPath} → ${newPath}`);
        });
        
        await Client.update(clientId, updateData);
          
          if (!allFilesUpdated) {
            console.warn(`Some files may not have been moved correctly for client ${clientId}`);
          }
        } else {
          console.error(`Temp directory not found: ${tempDir}`);
        }
      } catch (err) {
        console.error('Error moving client document files:', err);
        // Continue execution - we've already created the client record
        // Just log the error and return a warning in the response
      }
      
      // Automatically repair all document paths to ensure consistency
      try {
        console.log('Automatically repairing document paths after client creation');
        
        // Create the request URL to the internal API
        const apiUrl = 'http://localhost:5000/api/repair-all-documents';
        
        // Make the request to repair documents
        const repairResponse = await axios.get(apiUrl);
        
        if (repairResponse.data.success) {
          console.log(`Document repair successful: Fixed ${repairResponse.data.fixedPaths} paths, created ${repairResponse.data.createdDirectories} directories`);
        } else {
          console.warn('Document repair was not fully successful:', repairResponse.data);
        }
      } catch (repairError) {
        console.error('Error during automatic document repair:', repairError);
        // Continue with the response, this is just an enhancement
      }
      
      res.status(201).json({
        success: true,
        message: 'Client created successfully with documents',
        data: { id: clientId }
      });
    } catch (error) {
      console.error('Error creating client with documents:', error);
      res.status(500).json({ success: false, message: 'Failed to create client with documents' });
    }
  }
);

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

// Update client with documents
router.put('/:id/with-documents', 
  authenticate, 
  authorize(['admin', 'manager', 'sales']),
  upload.fields([
    { name: 'coverage_proof', maxCount: 1 },
    { name: 'sum_insured_proof', maxCount: 1 },
    { name: 'policy_fee_invoice', maxCount: 1 },
    { name: 'vat_debit_note', maxCount: 1 },
    { name: 'payment_receipt', maxCount: 1 },
    { name: 'nic_proof', maxCount: 1 },
    { name: 'dob_proof', maxCount: 1 },
    { name: 'business_registration_proof', maxCount: 1 },
    { name: 'svat_proof', maxCount: 1 },
    { name: 'vat_proof', maxCount: 1 }
  ]),
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const clientData: any = JSON.parse(JSON.stringify(req.body));
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      
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
      
      // Add file paths to client data
      Object.keys(files).forEach(fieldName => {
        const file = files[fieldName][0];
        const relativePath = `/uploads/documents/${file.filename}`;
        clientData[fieldName] = relativePath;
        
        // Delete old file if exists
        if (existingClient[fieldName as keyof typeof existingClient]) {
          const oldPath = path.join(__dirname, '../../', existingClient[fieldName as keyof typeof existingClient] as string);
          if (fs.existsSync(oldPath)) {
            fs.unlinkSync(oldPath);
          }
        }
      });
      
      // Update client data with document paths
      const success = await Client.update(id, clientData);
      
      if (!success) {
        return res.status(500).json({
          success: false,
          message: 'Failed to update client with documents'
        });
      }
      
      // Automatically repair all document paths after client update
      try {
        console.log('Automatically repairing document paths after client update');
        
        // Create the request URL to the internal API
        const apiUrl = 'http://localhost:5000/api/repair-all-documents';
        
        // Make the request to repair documents
        const repairResponse = await axios.get(apiUrl);
        
        if (repairResponse.data.success) {
          console.log(`Document repair successful: Fixed ${repairResponse.data.fixedPaths} paths, created ${repairResponse.data.createdDirectories} directories`);
        } else {
          console.warn('Document repair was not fully successful:', repairResponse.data);
        }
      } catch (repairError) {
        console.error('Error during automatic document repair:', repairError);
        // Continue with the response, this is just an enhancement
      }
      
      res.status(200).json({
        success: true,
        message: 'Client updated successfully with documents'
      });
    } catch (error) {
      console.error('Error updating client with documents:', error);
      res.status(500).json({ success: false, message: 'Failed to update client with documents' });
    }
  }
);

// Upload a specific document for a client
router.post('/:id/documents', 
  authenticate, 
  authorize(['admin', 'manager', 'sales']),
  upload.single('document'),
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { documentType } = req.body;
      
      if (!req.file || !documentType) {
        return res.status(400).json({
          success: false,
          message: 'File and document type are required'
        });
      }
      
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
      
      // Ensure client directory exists
      const clientDir = path.join(__dirname, '../../uploads/documents', id);
      if (!fs.existsSync(clientDir)) {
        fs.mkdirSync(clientDir, { recursive: true });
      }
      
      const relativePath = `/uploads/documents/${id}/${req.file.filename}`;
      
      // Delete old file if exists
      if (existingClient[documentType as keyof typeof existingClient]) {
        const oldFilePath = existingClient[documentType as keyof typeof existingClient] as string;
        const oldFullPath = path.join(__dirname, '../../', oldFilePath);
        
        if (fs.existsSync(oldFullPath)) {
          fs.unlinkSync(oldFullPath);
        }
      }
      
      // Update client with new document path
      const updateData: any = { [documentType]: relativePath };
      const updated = await Client.update(id, updateData);
      
      if (!updated) {
        return res.status(500).json({
          success: false,
          message: 'Failed to update client document'
        });
      }
      
      // Return information useful for previewing the document
      const fileName = path.basename(req.file.filename);
      const fileType = req.file.mimetype;
      const fileSize = req.file.size;
      
      res.status(200).json({
        success: true,
        message: 'Document uploaded successfully',
        data: { 
          documentUrl: relativePath,
          fileName, 
          fileType,
          fileSize
        }
      });
    } catch (error) {
      console.error('Error uploading document:', error);
      res.status(500).json({ success: false, message: 'Failed to upload document' });
    }
  }
);

// Delete a specific document for a client
router.delete('/:id/documents/:documentType', 
  authenticate, 
  authorize(['admin', 'manager', 'sales']),
  async (req: AuthRequest, res: Response) => {
    try {
      const { id, documentType } = req.params;
      
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
      
      // Delete file if exists
      if (existingClient[documentType as keyof typeof existingClient]) {
        const filePath = existingClient[documentType as keyof typeof existingClient] as string;
        const fullPath = path.join(__dirname, '../../', filePath);
        
        if (fs.existsSync(fullPath)) {
          fs.unlinkSync(fullPath);
        }
      } else {
        return res.status(404).json({
          success: false,
          message: 'Document not found'
        });
      }
      
      // Update client to remove document path
      const updateData: any = { [documentType]: null };
      const updated = await Client.update(id, updateData);
      
      if (!updated) {
        return res.status(500).json({
          success: false,
          message: 'Failed to delete client document'
        });
      }
      
      res.status(200).json({
        success: true,
        message: 'Document deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting document:', error);
      res.status(500).json({ success: false, message: 'Failed to delete document' });
    }
  }
);

// Delete a client
router.delete('/:id', authenticate, authorize(['admin', 'manager']), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    
    // Check if client exists
    const existingClient = await Client.getById(id);
    if (!existingClient) {
      return res.status(404).json({ success: false, message: 'Client not found' });
    }
    
    // Delete all associated documents
    const documentFields = [
      'coverage_proof', 'sum_insured_proof', 'policy_fee_invoice',
      'vat_debit_note', 'payment_receipt', 'nic_proof',
      'dob_proof', 'business_registration_proof', 'svat_proof', 'vat_proof'
    ];
    
    documentFields.forEach(field => {
      const filePath = existingClient[field as keyof typeof existingClient];
      if (filePath) {
        const fullPath = path.join(__dirname, '../../', filePath as string);
        if (fs.existsSync(fullPath)) {
          fs.unlinkSync(fullPath);
        }
      }
    });
    
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

// Serve document files securely
router.get('/:id/documents/:filename', 
  authenticate, 
  authorize(['admin', 'manager', 'sales']), 
  async (req: AuthRequest, res: Response) => {
    try {
      const { id, filename } = req.params;
      
      // Check if client exists
      const existingClient = await Client.getById(id);
      if (!existingClient) {
        return res.status(404).json({ success: false, message: 'Client not found' });
      }
      
      // Sales reps can only access their own clients' documents
      if (
        req.user?.role === 'sales' && 
        existingClient.sales_rep_id !== req.user.userId
      ) {
        return res.status(403).json({
          success: false,
          message: 'You are not authorized to access this client\'s documents'
        });
      }
      
      // Construct the file path
      const filePath = path.join(__dirname, '../../uploads/documents', id, filename);
      
      // Check if file exists
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({
          success: false,
          message: 'Document not found'
        });
      }
      
      // Determine the content type based on file extension
      const ext = path.extname(filename).toLowerCase();
      let contentType = 'application/octet-stream'; // Default
      
      if (ext === '.pdf') {
        contentType = 'application/pdf';
      } else if (ext === '.jpg' || ext === '.jpeg') {
        contentType = 'image/jpeg';
      } else if (ext === '.png') {
        contentType = 'image/png';
      }
      
      // Set headers for content disposition
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
      
      // Stream the file
      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);
    } catch (error) {
      console.error('Error serving document:', error);
      res.status(500).json({ success: false, message: 'Failed to serve document' });
    }
  }
);

// Download document files
router.get('/:id/documents/:filename/download', 
  authenticate, 
  authorize(['admin', 'manager', 'sales']), 
  async (req: AuthRequest, res: Response) => {
    try {
      const { id, filename } = req.params;
      
      // Check if client exists
      const existingClient = await Client.getById(id);
      if (!existingClient) {
        return res.status(404).json({ success: false, message: 'Client not found' });
      }
      
      // Sales reps can only access their own clients' documents
      if (
        req.user?.role === 'sales' && 
        existingClient.sales_rep_id !== req.user.userId
      ) {
        return res.status(403).json({
          success: false,
          message: 'You are not authorized to access this client\'s documents'
        });
      }
      
      // Construct the file path
      const filePath = path.join(__dirname, '../../uploads/documents', id, filename);
      
      // Check if file exists
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({
          success: false,
          message: 'Document not found'
        });
      }
      
      // Extract original filename from the document type
      const parts = filename.split('-');
      const documentType = parts[0];
      const originalExt = path.extname(filename);
      
      // Try to get a friendly filename
      const friendlyNames: { [key: string]: string } = {
        'coverage_proof': 'Coverage Proof',
        'sum_insured_proof': 'Sum Insured Proof',
        'policy_fee_invoice': 'Policy Fee Invoice',
        'vat_debit_note': 'VAT Debit Note',
        'payment_receipt': 'Payment Receipt',
        'nic_proof': 'NIC Proof',
        'dob_proof': 'DOB Proof',
        'business_registration_proof': 'Business Registration',
        'svat_proof': 'SVAT Proof',
        'vat_proof': 'VAT Proof'
      };
      
      // Use friendly name if available, otherwise use the document type
      const displayName = friendlyNames[documentType] || documentType;
      const downloadFilename = `${existingClient.client_name} - ${displayName}${originalExt}`;
      
      // Set headers for content disposition as attachment for download
      res.setHeader('Content-Type', 'application/octet-stream');
      res.setHeader('Content-Disposition', `attachment; filename="${downloadFilename}"`);
      
      // Stream the file
      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);
    } catch (error) {
      console.error('Error downloading document:', error);
      res.status(500).json({ success: false, message: 'Failed to download document' });
    }
  }
);

// Add a diagnostic endpoint to check and fix document paths
router.post('/diagnostic/check-documents', 
  authenticate, 
  authorize(['admin']), 
  async (req: AuthRequest, res: Response) => {
    try {
      // Get all clients
      const allClients = await Client.getAll();
      
      const results = {
        totalClients: allClients.length,
        checkedDocuments: 0,
        missingFiles: 0,
        tempFiles: 0,
        fixedPaths: 0,
        errors: [] as string[],
        details: [] as any[]
      };
      
      // Document fields to check
      const documentFields = [
        'coverage_proof', 'sum_insured_proof', 'policy_fee_invoice',
        'vat_debit_note', 'payment_receipt', 'nic_proof',
        'dob_proof', 'business_registration_proof', 'svat_proof', 'vat_proof'
      ];
      
      // Process each client
      for (const client of allClients) {
        // Skip if client has no ID
        if (!client.id) {
          results.errors.push(`Client has no ID: ${client.client_name}`);
          continue;
        }
        
        const clientId = client.id;
        const clientResult = {
          clientId,
          clientName: client.client_name,
          documents: [] as any[],
          tempPathsFixed: 0,
          missingFiles: 0
        };
        
        // Check if client directory exists, create if not
        const clientDir = path.join(__dirname, '../../uploads/documents', clientId);
        if (!fs.existsSync(clientDir)) {
          fs.mkdirSync(clientDir, { recursive: true });
          console.log(`Created missing client directory: ${clientDir}`);
        }
        
        // Check each document field
        for (const field of documentFields) {
          const docPath = client[field as keyof typeof client] as string | undefined;
          
          if (!docPath) continue;
          
          results.checkedDocuments++;
          
          const docResult = {
            field,
            originalPath: docPath,
            newPath: null as string | null,
            status: 'ok',
            error: null as string | null
          };
          
          // Check for temp paths
          if (docPath.includes('temp-')) {
            results.tempFiles++;
            docResult.status = 'temp-path';
            
            try {
              // Extract filename
              const tempMatch = docPath.match(/\/uploads\/documents\/temp-[^\/]+\/([^\/]+)$/);
              if (tempMatch && tempMatch[1]) {
                const filename = tempMatch[1];
                const fullTempPath = path.join(__dirname, '../../', docPath);
                const newRelativePath = `/uploads/documents/${clientId}/${filename}`;
                const newFullPath = path.join(__dirname, '../../', newRelativePath);
                
                // Check if original file exists
                if (fs.existsSync(fullTempPath)) {
                  try {
                    // Make sure target directory exists
                    if (!fs.existsSync(path.dirname(newFullPath))) {
                      fs.mkdirSync(path.dirname(newFullPath), { recursive: true });
                    }
                    
                    // Copy file to correct location (using copy instead of move to be safe)
                    fs.copyFileSync(fullTempPath, newFullPath);
                    console.log(`Copied temp file to client directory: ${fullTempPath} → ${newFullPath}`);
                    
                    // Update database record
                    const updateData = { [field]: newRelativePath };
                    await Client.update(clientId, updateData);
                    
                    docResult.newPath = newRelativePath;
                    docResult.status = 'fixed';
                    results.fixedPaths++;
                    clientResult.tempPathsFixed++;
                  } catch (copyErr) {
                    const errorMsg = `Error copying file: ${(copyErr as Error).message}`;
                    docResult.error = errorMsg;
                    docResult.status = 'error';
                    results.errors.push(errorMsg);
                  }
                } else {
                  // Temp file doesn't exist
                  docResult.status = 'missing-temp-file';
                  docResult.error = `Temp file not found: ${fullTempPath}`;
                  results.missingFiles++;
                  clientResult.missingFiles++;
                }
              }
            } catch (err) {
              const errorMsg = `Error processing temp path: ${(err as Error).message}`;
              docResult.error = errorMsg;
              docResult.status = 'error';
              results.errors.push(errorMsg);
            }
          } else {
            // Regular path, check if file exists
            const fullPath = path.join(__dirname, '../../', docPath);
            if (!fs.existsSync(fullPath)) {
              docResult.status = 'missing-file';
              docResult.error = `File not found: ${fullPath}`;
              results.missingFiles++;
              clientResult.missingFiles++;
            }
          }
          
          clientResult.documents.push(docResult);
        }
        
        // Only add client result if it has documents or issues
        if (clientResult.documents.length > 0) {
          results.details.push(clientResult);
        }
      }
      
      res.json({
        success: true,
        message: 'Document diagnostic completed',
        results
      });
    } catch (error) {
      console.error('Error running document diagnostic:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to run document diagnostic',
        error: (error as Error).message
      });
    }
  }
);

// Add a fix endpoint for document paths with incorrect structure
router.post('/diagnostic/fix-document-paths', 
  authenticate, 
  authorize(['admin']), 
  async (req: AuthRequest, res: Response) => {
    try {
      // Get all clients
      const allClients = await Client.getAll();
      
      const results = {
        totalClients: allClients.length,
        checkedPaths: 0,
        fixedPaths: 0,
        errors: [] as string[],
        details: [] as any[]
      };
      
      // Document fields to check
      const documentFields = [
        'coverage_proof', 'sum_insured_proof', 'policy_fee_invoice',
        'vat_debit_note', 'payment_receipt', 'nic_proof',
        'dob_proof', 'business_registration_proof', 'svat_proof', 'vat_proof'
      ];
      
      // Process each client
      for (const client of allClients) {
        // Skip if client has no ID
        if (!client.id) {
          results.errors.push(`Client has no ID: ${client.client_name}`);
          continue;
        }
        
        const clientId = client.id;
        const clientResult = {
          clientId,
          clientName: client.client_name,
          pathsChecked: 0,
          pathsFixed: 0
        };
        
        // Check document paths
        const updates: Record<string, string> = {};
        
        for (const field of documentFields) {
          const docPath = client[field as keyof typeof client] as string | undefined;
          
          if (!docPath) continue;
          
          clientResult.pathsChecked++;
          results.checkedPaths++;
          
          // Check for paths missing the uploads prefix
          if (docPath.startsWith('/documents/') && !docPath.startsWith('/uploads/documents/')) {
            const fixedPath = `/uploads${docPath}`;
            updates[field] = fixedPath;
            
            clientResult.pathsFixed++;
            results.fixedPaths++;
            
            console.log(`Fixing document path for client ${clientId}, ${field}: ${docPath} → ${fixedPath}`);
          }
        }
        
        // Update client if any paths need fixing
        if (Object.keys(updates).length > 0) {
          try {
            await Client.update(clientId, updates);
            results.details.push(clientResult);
          } catch (updateError) {
            const errorMsg = `Failed to update client ${clientId}: ${(updateError as Error).message}`;
            results.errors.push(errorMsg);
            console.error(errorMsg);
          }
        }
      }
      
      res.json({
        success: true,
        message: 'Document paths fixed',
        results
      });
    } catch (error) {
      console.error('Error fixing document paths:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to fix document paths',
        error: (error as Error).message
      });
    }
  }
);

// Add a direct download link generator endpoint
router.get('/:id/documents/:documentType/direct-link', 
  authenticate, 
  authorize(['admin', 'manager', 'sales']), 
  async (req: AuthRequest, res: Response) => {
    try {
      const { id, documentType } = req.params;
      
      // Check if client exists
      const existingClient = await Client.getById(id);
      if (!existingClient) {
        return res.status(404).json({ success: false, message: 'Client not found' });
      }
      
      // Sales reps can only access their own clients' documents
      if (
        req.user?.role === 'sales' && 
        existingClient.sales_rep_id !== req.user.userId
      ) {
        return res.status(403).json({
          success: false,
          message: 'You are not authorized to access this client\'s documents'
        });
      }
      
      // Get the document path from the client
      const docPath = existingClient[documentType as keyof typeof existingClient] as string;
      
      if (!docPath) {
        return res.status(404).json({
          success: false,
          message: 'Document not found'
        });
      }
      
      // Extract the filename from the path
      let filename = '';
      const lastSlashIndex = docPath.lastIndexOf('/');
      if (lastSlashIndex !== -1) {
        filename = docPath.substring(lastSlashIndex + 1);
      } else {
        filename = docPath;
      }
      
      // Create a direct download URL
      // Use the server's protocol and host
      const protocol = req.protocol;
      const host = req.get('host');
      
      // Construct the direct download URL
      const downloadUrl = `${protocol}://${host}/api/clients/${id}/documents/${filename}/download`;
      
      // Return the direct download URL
      res.status(200).json({
        success: true,
        documentType,
        filename,
        downloadUrl,
        directAccessUrl: `${protocol}://${host}${docPath}`
      });
    } catch (error) {
      console.error('Error creating direct download link:', error);
      res.status(500).json({ success: false, message: 'Failed to create download link' });
    }
  }
);

export default router; 