import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { authRouter } from './backend/routes/authRoutes.js';
import { clientRouter } from './backend/routes/clientRoutes.js';
import { adminRouter } from './backend/routes/adminRoutes.js';

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  // JSON & URL-encoded parsing
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // CORS configuration
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    const allowedOrigin = process.env.FRONTEND_URL;

    if (process.env.NODE_ENV === 'production' && allowedOrigin) {
      if (origin === allowedOrigin) {
        res.header('Access-Control-Allow-Origin', origin);
      }
    } else {
      res.header('Access-Control-Allow-Origin', origin || '*');
    }

    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, x-user-id, x-company-id');
    res.header('Access-Control-Allow-Credentials', 'true');

    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });

  // Health check endpoint for Production / Cloud Run
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      service: 'syntech-dc-api',
    });
  });

  // API Routes
  app.use('/api/auth', authRouter);
  app.use('/api/portal', clientRouter);
  app.use('/api/admin', adminRouter);
  app.use('/api', clientRouter);

  // Vite middleware for development / Static files in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[SYNTECH DC] Servidor corporativo iniciado com sucesso em http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('[SYNTECH DC] Erro crítico ao inicializar o servidor:', err);
  process.exit(1);
});
