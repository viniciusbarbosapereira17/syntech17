import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { HonoContextEnv } from './types/workerEnv.js';
import { honoInitSupabase } from './middleware/honoAuth.js';
import { honoAuth } from './routes/honoAuth.js';
import { honoClient } from './routes/honoClient.js';
import { honoAdmin } from './routes/honoAdmin.js';

const app = new Hono<HonoContextEnv>();

// 1. CORS Configuration (Restricted to same origin & custom frontends)
app.use('*', async (c, next) => {
  const allowedOrigin = c.env?.FRONTEND_URL;
  return cors({
    origin: (origin) => {
      if (!origin) return '*';
      if (allowedOrigin && origin === allowedOrigin) return origin;
      return origin; // allow same origin / preview domain
    },
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization', 'x-user-id', 'x-company-id'],
    credentials: true,
  })(c, next);
});

// 2. Initialize Supabase with Cloudflare Worker Bindings
app.use('*', honoInitSupabase);

// 3. Health Check Endpoint
app.get('/api/health', (c) => {
  return c.json({
    status: 'ok',
    service: 'syntech-dc',
  });
});

// 4. API Routes
app.route('/api/auth', honoAuth);
app.route('/api/portal', honoClient);
app.route('/api/admin', honoAdmin);
app.route('/api', honoClient);

// 5. Static Assets / SPA Fallback handling for Cloudflare Workers
app.all('*', async (c) => {
  // If the request is for an unhandled /api/* endpoint, return 404 JSON
  if (c.req.path.startsWith('/api')) {
    return c.json({ error: 'Endpoint não encontrado.' }, 404);
  }

  // If ASSETS binding exists (Cloudflare Workers Static Assets)
  if (c.env?.ASSETS) {
    try {
      const response = await c.env.ASSETS.fetch(c.req.raw);
      if (response.status === 404) {
        // SPA Fallback: serve index.html for client-side navigation routes
        const url = new URL(c.req.raw.url);
        url.pathname = '/index.html';
        return await c.env.ASSETS.fetch(new Request(url.toString(), c.req.raw));
      }
      return response;
    } catch (err) {
      console.error('[Worker Assets] Error serving asset:', err);
    }
  }

  return c.text('Not Found', 404);
});

export default app;
