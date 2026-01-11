// src/server.ts
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import productsRoutes from './routes/products.routes.js';

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;
const apiVersion = process.env.API_VERSION || 'v1';

// ============================================
// MIDDLEWARES
// ============================================

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// ============================================
// ROUTES
// ============================================

// Health check
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Amazon Partner API Mock',
    version: apiVersion,
    status: 'running',
    timestamp: new Date().toISOString(),
  });
});

// API routes
app.use(`/api/${apiVersion}`, productsRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    message: `Cannot ${req.method} ${req.path}`,
  });
});

// Error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('❌ Server error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: err.message,
  });
});

// ============================================
// START SERVER
// ============================================

app.listen(port, () => {
  console.log('');
  console.log('╔════════════════════════════════════════════════╗');
  console.log('║   🚀  Amazon Partner API Mock - RUNNING       ║');
  console.log('╠════════════════════════════════════════════════╣');
  console.log(`║   📡  Server: http://localhost:${port}           ║`);
  console.log(`║   🔑  API Key: ${process.env.API_KEY?.substring(0, 20)}...  ║`);
  console.log(`║   📦  Version: ${apiVersion}                              ║`);
  console.log(`║   🗄️   Database: ${process.env.DB_NAME}       ║`);
  console.log('╚════════════════════════════════════════════════╝');
  console.log('');
  console.log('📋  Available endpoints:');
  console.log(`   GET    /api/${apiVersion}/products`);
  console.log(`   GET    /api/${apiVersion}/products/:asin`);
  console.log(`   PATCH  /api/${apiVersion}/products/:asin/price`);
  console.log('');
});