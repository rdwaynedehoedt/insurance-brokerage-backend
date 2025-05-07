import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import testRoutes from './routes/test';
import authRoutes from './routes/auth';
import clientRoutes from './routes/clients';

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api', testRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/clients', clientRoutes);

// Basic route
app.get('/', (req: Request, res: Response) => {
  res.json({ message: 'Welcome to Insurance Brokerage API' });
});

// Start server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
}); 