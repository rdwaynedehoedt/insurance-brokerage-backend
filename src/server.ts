import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import testRoutes from './routes/test';
import authRoutes from './routes/auth';
import clientRoutes from './routes/clients';

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

// Middleware to redirect old document paths that might be missing the /uploads prefix
app.use('/documents', (req: Request, res: Response, next: NextFunction) => {
  console.log(`[Path Correction] Redirecting from /documents${req.url} to /uploads/documents${req.url}`);
  res.redirect(`/uploads/documents${req.url}`);
});

// Logging middleware for static file requests
app.use('/uploads', (req: Request, res: Response, next: NextFunction) => {
  console.log(`[Static File Request] ${req.method} ${req.url}`);
  // Check if file exists before attempting to serve it
  const filePath = path.join(__dirname, '../uploads', req.url);
  fs.access(filePath, fs.constants.F_OK, (err) => {
    if (err) {
      console.error(`[Static File Error] File not found: ${filePath}`);
    } else {
      console.log(`[Static File Access] Serving: ${filePath}`);
    }
    next();
  });
});

// Set proper headers for static file serving
app.use('/uploads', (req: Request, res: Response, next: NextFunction) => {
  res.set('Cache-Control', 'no-cache');
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});

// Serve static files with improved error handling
app.use('/uploads', express.static(path.join(__dirname, '../uploads'), {
  fallthrough: false, // Return 404 if file not found
  index: false, // Disable directory index
  redirect: false // Disable directory redirects
}));

// Handle errors for static files
app.use('/uploads', (err: any, req: Request, res: Response, next: NextFunction) => {
  console.error(`[Static File Error] ${err.message} for ${req.url}`);
  res.status(404).json({ 
    success: false, 
    message: 'Document not found',
    path: req.url,
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
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

// Document testing endpoint to verify file access
app.get('/api/test-file-access', (req: Request, res: Response) => {
  const { path: filePath } = req.query;
  
  if (!filePath || typeof filePath !== 'string') {
    return res.status(400).json({ success: false, message: 'Path parameter is required' });
  }
  
  const fullPath = path.join(__dirname, '..', filePath.startsWith('/') ? filePath : `/${filePath}`);
  
  fs.access(fullPath, fs.constants.F_OK, (err) => {
    if (err) {
      return res.status(404).json({ 
        success: false, 
        message: 'File not found',
        path: fullPath,
        error: err.message
      });
    }
    
    res.json({
      success: true,
      message: 'File exists and is accessible',
      path: fullPath,
      relativePath: filePath
    });
  });
});

// Start server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
  console.log(`Uploads available at http://localhost:${port}/uploads`);
}); 