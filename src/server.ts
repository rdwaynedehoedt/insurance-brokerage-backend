import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import testRoutes from './routes/test';
import authRoutes from './routes/auth';
import clientRoutes from './routes/clients';
import pool from './config/database';
// @ts-ignore - sqlite3 may not have proper type definitions in this project
import sqlite3 from 'sqlite3';

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../uploads/documents');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('Created uploads directory structure');
}

// Middleware
app.use(cors());
app.use(express.json());

// Middleware to handle root path of uploads directory
app.get('/uploads', (req: Request, res: Response) => {
  console.log('[Uploads Root] Request to list uploads directory');
  
  // Get a list of subdirectories in the uploads folder
  const uploadsPath = path.join(__dirname, '../uploads');
  
  try {
    const items = fs.readdirSync(uploadsPath);
    const directories = items.filter(item => 
      fs.statSync(path.join(uploadsPath, item)).isDirectory()
    );
    
    res.json({
      success: true,
      message: 'Uploads directory structure',
      directories
    });
  } catch (error) {
    console.error('[Uploads Root] Error reading uploads directory:', error);
    res.status(500).json({
      success: false,
      message: 'Error reading uploads directory',
      error: (error as Error).message
    });
  }
});

// Middleware to handle root path of documents directory
app.get('/uploads/documents', (req: Request, res: Response) => {
  console.log('[Documents Root] Request to list documents directory');
  
  // Get a list of client folders in the documents directory
  const documentsPath = path.join(__dirname, '../uploads/documents');
  
  try {
    if (!fs.existsSync(documentsPath)) {
      return res.status(404).json({
        success: false,
        message: 'Documents directory does not exist',
        path: documentsPath
      });
    }
    
    const items = fs.readdirSync(documentsPath);
    const clientFolders = items.filter(item => 
      fs.statSync(path.join(documentsPath, item)).isDirectory()
    );
    
    // Count temp folders
    const tempFolders = clientFolders.filter(folder => folder.startsWith('temp-'));
    
    res.json({
      success: true,
      message: 'Documents directory structure',
      totalClientFolders: clientFolders.length,
      tempFolders: tempFolders.length,
      clientFolders: clientFolders.sort()
    });
  } catch (error) {
    console.error('[Documents Root] Error reading documents directory:', error);
    res.status(500).json({
      success: false,
      message: 'Error reading documents directory',
      error: (error as Error).message
    });
  }
});

// Middleware to redirect old document paths that might be missing the /uploads prefix
app.use('/documents', (req: Request, res: Response, next: NextFunction) => {
  console.log(`[Path Correction] Redirecting from /documents${req.url} to /uploads/documents${req.url}`);
  
  // Check if the file actually exists before redirecting
  const targetPath = path.join(__dirname, '../uploads/documents', req.url);
  
  fs.access(targetPath, fs.constants.F_OK, (err) => {
    if (err) {
      console.error(`[Document Redirect] File not found at: ${targetPath}`);
      // Return a more helpful error message
      return res.status(404).json({ 
        success: false, 
        message: 'Document not found',
        path: `/documents${req.url}`,
        correctPath: `/uploads/documents${req.url}`,
        physicalPath: targetPath,
        error: 'File does not exist on the server'
      });
    }
    
    console.log(`[Document Redirect] File exists, redirecting to: /uploads/documents${req.url}`);
    res.redirect(`/uploads/documents${req.url}`);
  });
});

// Add enhanced static file handling with better error reporting for document files
// This helps diagnose and fix document access issues
app.use('/uploads/documents', (req, res, next) => {
  const requestPath = req.path;
  const fullPath = path.join(__dirname, '../uploads/documents', requestPath);
  
  console.log(`[Document Access] Request for: ${requestPath}`);
  
  // Check if file exists
  fs.access(fullPath, fs.constants.F_OK, (err) => {
    if (err) {
      console.error(`[Document Access] File not found: ${fullPath}`);
      
      // Try to detect temp directory pattern
      const tempDirMatch = requestPath.match(/^\/temp-([a-f0-9-]+)\//i);
      if (tempDirMatch) {
        const tempId = tempDirMatch[1];
        console.log(`[Document Access] Detected temp directory pattern: temp-${tempId}`);
        
        // Create the missing directory to help fix future requests
        const tempDirPath = path.join(__dirname, '../uploads/documents', `temp-${tempId}`);
        try {
          if (!fs.existsSync(tempDirPath)) {
            fs.mkdirSync(tempDirPath, { recursive: true });
            console.log(`[Document Access] Created missing temp directory: ${tempDirPath}`);
          }
        } catch (mkdirErr: unknown) {
          const error = mkdirErr as Error;
          console.error(`[Document Access] Failed to create temp directory: ${error.message}`);
        }
      }
      
      // Return a more helpful error instead of just 404
      return res.status(404).json({
        success: false,
        message: 'Document file not found',
        path: requestPath,
        error: 'The requested document does not exist on the server'
      });
    }
    
    // File exists, continue to static middleware
    next();
  });
});

// Regular static file middleware (keep the existing one)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Set proper headers for static file serving
app.use('/uploads', (req: Request, res: Response, next: NextFunction) => {
  res.set('Cache-Control', 'no-cache');
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  
  // Set proper Content-Type based on file extension
  const url = req.url;
  const ext = path.extname(url).toLowerCase();
  
  if (ext === '.png') {
    res.set('Content-Type', 'image/png');
  } else if (ext === '.jpg' || ext === '.jpeg') {
    res.set('Content-Type', 'image/jpeg');
  } else if (ext === '.gif') {
    res.set('Content-Type', 'image/gif');
  } else if (ext === '.pdf') {
    res.set('Content-Type', 'application/pdf');
  } else if (ext === '.svg') {
    res.set('Content-Type', 'image/svg+xml');
  }
  
  next();
});

// Serve static files with improved error handling
app.use('/uploads', express.static(path.join(__dirname, '../uploads'), {
  fallthrough: false, // Return 404 if file not found
  index: false, // Disable directory index
  redirect: false, // Disable directory redirects
  setHeaders: (res, filePath) => {
    // Set appropriate content type based on file extension
    const ext = path.extname(filePath).toLowerCase();
    
    if (ext === '.pdf') {
      res.setHeader('Content-Type', 'application/pdf');
    } else if (ext === '.jpg' || ext === '.jpeg') {
      res.setHeader('Content-Type', 'image/jpeg');
    } else if (ext === '.png') {
      res.setHeader('Content-Type', 'image/png');
    }
    
    // Prevent caching issues
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }
}));

// Handle errors for static files
app.use('/uploads', (err: any, req: Request, res: Response, next: NextFunction) => {
  console.error(`[Static File Error] ${err.message} for ${req.url}`);
  
  // Try to determine if this is a document request
  const isDocumentRequest = req.url.includes('/documents/');
  
  if (isDocumentRequest) {
    // Get the file path that was attempted
    const attemptedPath = path.join(__dirname, '../uploads', req.url);
    
    // Additional debugging information
    console.error(`[Document Error] Unable to serve: ${attemptedPath}`);
    
    // Check if parent directory exists
    const parentDir = path.dirname(attemptedPath);
    const parentDirExists = fs.existsSync(parentDir);
    console.error(`[Document Error] Parent directory exists: ${parentDirExists ? 'YES' : 'NO'} - ${parentDir}`);
    
    // For image files, return a placeholder image instead of JSON error
    if (req.url.match(/\.(jpg|jpeg|png|gif)$/i)) {
      // Return a placeholder image
      const placeholderPath = path.join(__dirname, '../assets/placeholder-document.png');
      
      if (fs.existsSync(placeholderPath)) {
        console.log(`[Document Error] Serving placeholder image: ${placeholderPath}`);
        return res.sendFile(placeholderPath);
      } else {
        // Generate a simple placeholder image using HTML
        res.writeHead(200, {'Content-Type': 'image/svg+xml'});
        res.end(`<svg xmlns="http://www.w3.org/2000/svg" width="300" height="200" viewBox="0 0 300 200">
          <rect width="300" height="200" fill="#f0f0f0"/>
          <text x="50%" y="50%" font-family="Arial" font-size="16" text-anchor="middle" fill="#555">
            Document Not Found
          </text>
          <text x="50%" y="65%" font-family="Arial" font-size="12" text-anchor="middle" fill="#999">
            ${path.basename(req.url)}
          </text>
        </svg>`);
        return;
      }
    }
  }
  
  res.status(404).json({
    success: false,
    message: 'Document not found',
    path: req.url,
    error: process.env.NODE_ENV === 'development' ? err.message : undefined,
    debugInfo: isDocumentRequest ? {
      requestUrl: req.url,
      fullPath: path.join(__dirname, '../uploads', req.url),
      pathExists: fs.existsSync(path.join(__dirname, '../uploads', req.url))
    } : undefined
  });
});

// Routes
app.use('/api', testRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/clients', clientRoutes);

// Basic route
app.get('/', (req: Request, res: Response) => {
  res.json({ message: 'Welcome to Insurance Brokerage API' });
});

// Add a diagnostic endpoint to test file access
app.get('/api/test-file-access', (req: Request, res: Response) => {
  const filePath = req.query.path as string;
  
  if (!filePath) {
    return res.status(400).json({ success: false, message: 'No file path provided' });
  }
  
  // Normalize path - remove leading slash if needed
  const normalizedPath = filePath.startsWith('/') 
    ? filePath.substring(1) 
    : filePath;
  
  // Create full path
  let fullPath = path.join(__dirname, '..', normalizedPath);
  
  // Alternative path with uploads prefix if needed
  let altPath = null;
  if (!normalizedPath.startsWith('uploads/') && normalizedPath.includes('/documents/')) {
    altPath = path.join(__dirname, '..', 'uploads', normalizedPath);
  }
  
  // Check if file exists at primary path
  const exists = fs.existsSync(fullPath);
  const altExists = altPath ? fs.existsSync(altPath) : false;
  
  let stats = null;
  let fileInfo = null;
  
  // Get file stats if it exists
  if (exists) {
    try {
      stats = fs.statSync(fullPath);
      fileInfo = {
        size: stats.size,
        created: stats.birthtime,
        modified: stats.mtime,
        isDirectory: stats.isDirectory()
      };
    } catch (err) {
      console.error('Error getting file stats:', err);
    }
  } else if (altExists && altPath) {
    // Try the alternative path
    try {
      stats = fs.statSync(altPath);
      fileInfo = {
        size: stats.size,
        created: stats.birthtime,
        modified: stats.mtime,
        isDirectory: stats.isDirectory(),
        note: 'File found at alternative path with uploads prefix'
      };
      fullPath = altPath; // Use the alt path that worked
    } catch (err) {
      console.error('Error getting file stats from alt path:', err);
    }
  }
  
  // Return diagnostic information
  res.json({
    success: exists || altExists,
    requestedPath: filePath,
    normalizedPath,
    fullPath,
    altPath,
    exists,
    altExists,
    fileInfo,
    message: exists 
      ? 'File exists' 
      : altExists 
        ? 'File exists at alternative path'
        : 'File not found at any location'
  });
});

// Fix document path for specific temp directory
app.get('/api/fix-temp-document', (req: Request, res: Response) => {
  const { tempId, clientId } = req.query;
  
  if (!tempId || !clientId || typeof tempId !== 'string' || typeof clientId !== 'string') {
    return res.status(400).json({ 
      success: false, 
      message: 'Both tempId and clientId parameters are required' 
    });
  }
  
  console.log(`[Fix Temp Document] Attempting to fix temp documents from ${tempId} to client ${clientId}`);
  
  try {
    // Verify the temp directory exists
    const tempDir = path.join(__dirname, '../uploads/documents', tempId);
    if (!fs.existsSync(tempDir)) {
      return res.status(404).json({
        success: false,
        message: 'Temp directory not found',
        tempDir
      });
    }
    
    // Create client directory if it doesn't exist
    const clientDir = path.join(__dirname, '../uploads/documents', clientId);
    if (!fs.existsSync(clientDir)) {
      fs.mkdirSync(clientDir, { recursive: true });
      console.log(`[Fix Temp Document] Created client directory: ${clientDir}`);
    }
    
    // Get list of files in temp directory
    const files = fs.readdirSync(tempDir);
    if (files.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No files found in temp directory',
        tempDir
      });
    }
    
    // Copy files from temp to client directory
    const results = {
      tempDir,
      clientDir,
      totalFiles: files.length,
      copiedFiles: 0,
      fileDetails: [] as any[]
    };
    
    for (const file of files) {
      const sourceFile = path.join(tempDir, file);
      const destFile = path.join(clientDir, file);
      
      console.log(`[Fix Temp Document] Copying ${sourceFile} to ${destFile}`);
      
      try {
        fs.copyFileSync(sourceFile, destFile);
        results.copiedFiles++;
        results.fileDetails.push({
          fileName: file,
          success: true,
          source: sourceFile,
          destination: destFile
        });
      } catch (err) {
        console.error(`[Fix Temp Document] Error copying file ${file}:`, err);
        results.fileDetails.push({
          fileName: file,
          success: false,
          source: sourceFile,
          error: (err as Error).message
        });
      }
    }
    
    res.json({
      success: true,
      message: `Copied ${results.copiedFiles} of ${results.totalFiles} files from temp directory to client directory`,
      results
    });
  } catch (error) {
    console.error('[Fix Temp Document] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fixing temp documents',
      error: (error as Error).message
    });
  }
});

// Document repair endpoint to create missing directories
app.get('/api/repair-document-structure', (req: Request, res: Response) => {
  console.log('[Repair Documents] Starting document structure repair');
  
  try {
    // Ensure the main uploads directory exists
    const uploadsDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
      console.log(`[Repair Documents] Created uploads directory: ${uploadsDir}`);
    }
    
    // Ensure the documents directory exists
    const documentsDir = path.join(__dirname, '../uploads/documents');
    if (!fs.existsSync(documentsDir)) {
      fs.mkdirSync(documentsDir, { recursive: true });
      console.log(`[Repair Documents] Created documents directory: ${documentsDir}`);
    }
    
    // Create the specific temp directory if provided
    const { tempId } = req.query;
    if (tempId && typeof tempId === 'string') {
      const tempDir = path.join(__dirname, '../uploads/documents', tempId);
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
        console.log(`[Repair Documents] Created temp directory: ${tempDir}`);
      }
    }
    
    // Return success response with directory status
    res.json({
      success: true,
      message: 'Document structure verified and repaired if needed',
      directories: {
        uploadsExists: fs.existsSync(uploadsDir),
        documentsExists: fs.existsSync(documentsDir),
        tempDirExists: tempId ? fs.existsSync(path.join(documentsDir, tempId as string)) : undefined,
        tempDir: tempId ? path.join(documentsDir, tempId as string) : undefined
      }
    });
  } catch (error) {
    console.error('[Repair Documents] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error repairing document structure',
      error: (error as Error).message
    });
  }
});

// Missing document handler endpoint to save placeholder files
app.post('/api/create-placeholder-document', (req: Request, res: Response) => {
  const { documentPath } = req.body;
  
  if (!documentPath || typeof documentPath !== 'string') {
    return res.status(400).json({
      success: false,
      message: 'documentPath parameter is required'
    });
  }
  
  try {
    // Handle both paths with and without /uploads prefix
    let normalizedPath = documentPath;
    if (documentPath.startsWith('/documents/') && !documentPath.startsWith('/uploads/documents/')) {
      normalizedPath = `/uploads${documentPath}`;
    }
    
    // Make sure the path is inside the uploads directory for security
    if (!normalizedPath.startsWith('/uploads/documents/')) {
      return res.status(400).json({
        success: false,
        message: 'Invalid document path. Must be within /uploads/documents/',
        providedPath: documentPath,
        normalizedPath: normalizedPath
      });
    }
    
    // Get the full file path
    const fullPath = path.join(__dirname, '..', normalizedPath);
    
    // Create parent directories if they don't exist
    const parentDir = path.dirname(fullPath);
    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
      console.log(`[Create Placeholder] Created directory: ${parentDir}`);
    }
    
    // Determine file type based on extension
    const ext = path.extname(fullPath).toLowerCase();
    
    // Create placeholder file based on type
    if (ext === '.pdf') {
      // For PDF, you might want to use a library like PDFKit to generate a simple PDF
      // This is a simple example - in production, you might want a more robust solution
      fs.writeFileSync(fullPath, '%PDF-1.4\n1 0 obj\n<</Type/Catalog/Pages 2 0 R>>\nendobj\n2 0 obj\n<</Type/Pages/Kids[3 0 R]/Count 1>>\nendobj\n3 0 obj\n<</Type/Page/MediaBox[0 0 595 842]/Parent 2 0 R/Resources<<>>>>\nendobj\nxref\n0 4\n0000000000 65535 f\n0000000010 00000 n\n0000000053 00000 n\n0000000102 00000 n\ntrailer\n<</Size 4/Root 1 0 R>>\nstartxref\n178\n%%EOF');
    } else if (ext === '.jpg' || ext === '.jpeg' || ext === '.png') {
      // For images, create a simple placeholder image
      // This requires image libraries like Sharp or Jimp for proper implementation
      // For now, copying a static placeholder would be easier
      const placeholderPath = path.join(__dirname, '../assets/placeholder-document.png');
      
      if (fs.existsSync(placeholderPath)) {
        fs.copyFileSync(placeholderPath, fullPath);
      } else {
        // Create a minimal blank image if no placeholder exists
        // This is a very basic PNG file that will display as a small white square
        const minimalPNG = Buffer.from([
          0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D, 
          0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 
          0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0x15, 0xC4, 0x89, 0x00, 0x00, 0x00, 
          0x0D, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9C, 0x63, 0x60, 0x60, 0x60, 0x60, 
          0x00, 0x00, 0x00, 0x05, 0x00, 0x01, 0x5A, 0xFA, 0x19, 0x4D, 0x00, 0x00, 
          0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82
        ]);
        fs.writeFileSync(fullPath, minimalPNG);
      }
    } else {
      // For other files create an empty file
      fs.writeFileSync(fullPath, `Placeholder for ${path.basename(fullPath)}`);
    }
    
    console.log(`[Create Placeholder] Created placeholder file: ${fullPath}`);
    
    res.json({
      success: true,
      message: 'Placeholder document created successfully',
      path: normalizedPath,
      fullPath: fullPath
    });
  } catch (error) {
    console.error('[Create Placeholder] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating placeholder document',
      error: (error as Error).message
    });
  }
});

// Fix document paths in database for a specific client
app.post('/api/fix-client-document-paths', async (req: Request, res: Response) => {
  const { clientId, tempId } = req.body;
  
  if (!clientId) {
    return res.status(400).json({
      success: false,
      message: 'clientId parameter is required'
    });
  }
  
  console.log(`[Fix Client Paths] Repairing document paths for client: ${clientId}`);
  
  try {
    // First check if client exists in database
    const clientQuery = `
      SELECT * FROM clients 
      WHERE id = ?
    `;
    
    const db = new sqlite3.Database(path.join(__dirname, '../data/insurance_brokerage.db'));
    
    // Use promise-based approach for better error handling
    const getClient = () => {
      return new Promise<any>((resolve, reject) => {
        db.get(clientQuery, [clientId], (err: Error | null, row: any) => {
          if (err) reject(err);
          else resolve(row);
        });
      });
    };
    
    const client = await getClient();
    
    if (!client) {
      db.close();
      return res.status(404).json({
        success: false,
        message: `Client with ID ${clientId} not found`
      });
    }
    
    // Document fields that might contain paths
    const documentFields = [
      'coverage_proof', 'sum_insured_proof', 'policy_fee_invoice',
      'vat_debit_note', 'payment_receipt', 'nic_proof',
      'dob_proof', 'business_registration_proof', 'svat_proof', 'vat_proof'
    ];
    
    // Map to collect needed updates
    const updates: Record<string, string> = {};
    const createdPlaceholders: string[] = [];
    
    // Examine each document field
    for (const field of documentFields) {
      const currentPath = client[field];
      
      // Skip fields without a path
      if (!currentPath) continue;
      
      const targetTempId = tempId || 'temp-placeholder';
      
      // Check if path is missing /uploads prefix
      if (currentPath.startsWith('/documents/') && !currentPath.startsWith('/uploads/documents/')) {
        updates[field] = `/uploads${currentPath}`;
      }
      
      // Check if path contains temp directory and needs to be fixed
      if (currentPath.includes('/temp-') && !currentPath.includes(`/${clientId}/`)) {
        // Extract filename from path
        const filename = path.basename(currentPath);
        const newPath = `/uploads/documents/${clientId}/${filename}`;
        updates[field] = newPath;
        
        // Create placeholder file in client directory
        const fullPath = path.join(__dirname, '..', newPath);
        const parentDir = path.dirname(fullPath);
        
        // Create directory if needed
        if (!fs.existsSync(parentDir)) {
          fs.mkdirSync(parentDir, { recursive: true });
        }
        
        // Create empty placeholder file if it doesn't exist
        if (!fs.existsSync(fullPath)) {
          // Create a simple placeholder based on file extension
          const ext = path.extname(fullPath).toLowerCase();
          if (ext === '.pdf') {
            fs.writeFileSync(fullPath, '%PDF-1.4\n1 0 obj\n<</Type/Catalog/Pages 2 0 R>>\nendobj\n2 0 obj\n<</Type/Pages/Kids[3 0 R]/Count 1>>\nendobj\n3 0 obj\n<</Type/Page/MediaBox[0 0 595 842]/Parent 2 0 R/Resources<<>>>>\nendobj\nxref\n0 4\n0000000000 65535 f\n0000000010 00000 n\n0000000053 00000 n\n0000000102 00000 n\ntrailer\n<</Size 4/Root 1 0 R>>\nstartxref\n178\n%%EOF');
          } else if (['.jpg', '.jpeg', '.png', '.gif'].includes(ext)) {
            // For images, copy the placeholder SVG
            const placeholderPath = path.join(__dirname, '../assets/placeholder-document.svg');
            if (fs.existsSync(placeholderPath)) {
              fs.copyFileSync(placeholderPath, fullPath);
            } else {
              fs.writeFileSync(fullPath, `Placeholder for ${filename}`);
            }
          } else {
            fs.writeFileSync(fullPath, `Placeholder for ${filename}`);
          }
          
          createdPlaceholders.push(fullPath);
        }
      }
    }
    
    // If there are updates to make
    if (Object.keys(updates).length > 0) {
      // Build SQL update statement
      const fields = Object.keys(updates);
      const placeholders = fields.map(() => '?').join(', ');
      const setClauses = fields.map(field => `${field} = ?`).join(', ');
      const values = fields.map(field => updates[field]);
      values.push(clientId);
      
      const updateQuery = `
        UPDATE clients
        SET ${setClauses}
        WHERE id = ?
      `;
      
      const updateClient = () => {
        return new Promise<void>((resolve, reject) => {
          db.run(updateQuery, [...values], (err: Error | null) => {
            if (err) reject(err);
            else resolve();
          });
        });
      };
      
      await updateClient();
      
      db.close();
      
      return res.json({
        success: true,
        message: `Updated ${Object.keys(updates).length} document paths for client ${clientId}`,
        updatedFields: fields,
        updates,
        createdPlaceholders
      });
    } else {
      db.close();
      return res.json({
        success: true,
        message: `No document paths needed updates for client ${clientId}`
      });
    }
  } catch (error) {
    console.error('[Fix Client Paths] Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fixing client document paths',
      error: (error as Error).message
    });
  }
});

// Automatic document path repair tool
app.get('/api/repair-all-documents', async (req: Request, res: Response) => {
  console.log('[Repair All Documents] Starting comprehensive document repair');
  
  try {
    // Get all clients from the database
    const [clients]: any = await pool.query('SELECT * FROM clients');
    console.log(`[Repair All Documents] Found ${clients.length} clients to check`);
    
    const results = {
      success: true,
      clientsProcessed: clients.length,
      fixedPaths: 0,
      createdDirectories: 0,
      errors: [] as string[]
    };
    
    // Document fields that may contain file paths
    const documentFields = [
      'coverage_proof', 'sum_insured_proof', 'policy_fee_invoice', 
      'vat_debit_note', 'payment_receipt', 'nic_proof',
      'dob_proof', 'business_registration_proof', 'svat_proof', 'vat_proof'
    ];
    
    // Process each client
    for (const client of clients) {
      if (!client.id) continue;
      
      const clientId = client.id;
      const updates: Record<string, string> = {};
      
      // First create client directory if it doesn't exist
      const clientDir = path.join(__dirname, '../uploads/documents', clientId);
      if (!fs.existsSync(clientDir)) {
        fs.mkdirSync(clientDir, { recursive: true });
        results.createdDirectories++;
        console.log(`[Repair All Documents] Created client directory: ${clientDir}`);
      }
      
      // Check temporary directories referenced in document paths
      for (const field of documentFields) {
        const docPath = client[field];
        
        if (!docPath) continue;
        
        // Check for paths with temp directories
        const tempMatch = docPath.match(/\/uploads\/documents\/(temp-[a-f0-9-]+)\/([^\/]+)$/);
        if (tempMatch && tempMatch.length === 3) {
          const tempId = tempMatch[1];
          const filename = tempMatch[2];
          
          // Create temp directory if it doesn't exist
          const tempDir = path.join(__dirname, '../uploads/documents', tempId);
          if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
            results.createdDirectories++;
            console.log(`[Repair All Documents] Created temp directory: ${tempDir}`);
          }
          
          // Check if file exists in temp directory
          const tempFilePath = path.join(tempDir, filename);
          if (!fs.existsSync(tempFilePath)) {
            // Create placeholder file
            try {
              fs.writeFileSync(tempFilePath, 'Document placeholder created by repair tool');
              console.log(`[Repair All Documents] Created placeholder file: ${tempFilePath}`);
              results.fixedPaths++;
            } catch (fileErr: unknown) {
              const error = fileErr as Error;
              const errMsg = `Failed to create placeholder file ${tempFilePath}: ${error.message}`;
              console.error(`[Repair All Documents] ${errMsg}`);
              results.errors.push(errMsg);
            }
          }
        }
        
        // Check for paths missing the uploads prefix
        else if (docPath.startsWith('/documents/') && !docPath.startsWith('/uploads/documents/')) {
          const correctedPath = `/uploads${docPath}`;
          updates[field] = correctedPath;
          results.fixedPaths++;
          console.log(`[Repair All Documents] Fixed path: ${docPath} → ${correctedPath}`);
        }
      }
      
      // Update client record if needed
      if (Object.keys(updates).length > 0) {
        try {
          await pool.query('UPDATE clients SET ? WHERE id = ?', [updates, clientId]);
          console.log(`[Repair All Documents] Updated ${Object.keys(updates).length} paths for client ${clientId}`);
        } catch (dbErr: unknown) {
          const error = dbErr as Error;
          const errMsg = `Database error updating client ${clientId}: ${error.message}`;
          console.error(`[Repair All Documents] ${errMsg}`);
          results.errors.push(errMsg);
        }
      }
    }
    
    res.json(results);
  } catch (error: unknown) {
    const err = error as Error;
    console.error('[Repair All Documents] Error:', err);
    res.status(500).json({
      success: false,
      message: 'Error repairing documents',
      error: err.message
    });
  }
});

// Start server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
  console.log(`Uploads available at http://localhost:${port}/uploads`);
}); 