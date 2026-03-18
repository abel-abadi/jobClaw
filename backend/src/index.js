import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { initDb } from './db/schema.js';
import { startScheduler } from './scheduler/index.js';

import profileRoutes from './routes/profile.js';
import jobRoutes from './routes/jobs.js';
import applicationRoutes from './routes/applications.js';
import resumeRoutes from './routes/resume.js';
import settingsRoutes from './routes/settings.js';
import scanRoutes from './routes/scan.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve generated resume files (PDFs)
app.use('/resumes', express.static(join(__dirname, '..', 'resumes', 'generated')));

// Routes
app.use('/api/profile', profileRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/resume', resumeRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/scan', scanRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Initialize DB then start server
initDb();
startScheduler();

app.listen(PORT, () => {
  console.log(`🦞 jobClaw backend running on http://localhost:${PORT}`);
});
