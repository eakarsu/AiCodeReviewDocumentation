import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import codeReviewsRouter from './routes/codeReviews.js';
import documentationRouter from './routes/documentation.js';
import codeAnalysisRouter from './routes/codeAnalysis.js';
import apiDocsRouter from './routes/apiDocs.js';
import readmeGeneratorRouter from './routes/readmeGenerator.js';
import codeCommentsRouter from './routes/codeComments.js';
import securityScanRouter from './routes/securityScan.js';
import performanceRouter from './routes/performance.js';
import testGenerationRouter from './routes/testGeneration.js';
import refactoringRouter from './routes/refactoring.js';

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Feature routes
app.use('/api/code-reviews', codeReviewsRouter);
app.use('/api/documentation', documentationRouter);
app.use('/api/code-analysis', codeAnalysisRouter);
app.use('/api/api-docs', apiDocsRouter);
app.use('/api/readme-generator', readmeGeneratorRouter);
app.use('/api/code-comments', codeCommentsRouter);
app.use('/api/security-scan', securityScanRouter);
app.use('/api/performance', performanceRouter);
app.use('/api/test-generation', testGenerationRouter);
app.use('/api/refactoring', refactoringRouter);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  res.status(500).json({ error: 'Internal server error', message: err.message });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
});
