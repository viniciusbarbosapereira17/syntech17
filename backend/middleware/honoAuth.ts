import { Context, Next } from 'hono';
import { HonoContextEnv } from '../types/workerEnv.js';
import { supabaseService } from '../db/supabaseService.js';
import { db } from '../db/store.js';
import { getSupabase } from '../db/supabaseClient.js';
import { User, UserRole } from '../../shared/types.js';

/**
 * Ensures Supabase is initialized with Worker environment bindings
 */
export async function honoInitSupabase(c: Context<HonoContextEnv>, next: Next) {
  if (c.env?.SUPABASE_URL && (c.env?.SUPABASE_SERVICE_ROLE_KEY || c.env?.SUPABASE_ANON_KEY)) {
    getSupabase({
      SUPABASE_URL: c.env.SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY: c.env.SUPABASE_SERVICE_ROLE_KEY,
      SUPABASE_ANON_KEY: c.env.SUPABASE_ANON_KEY,
    });
  }
  await next();
}

/**
 * Authentication middleware for Hono Worker
 */
export async function honoAuthMiddleware(c: Context<HonoContextEnv>, next: Next) {
  const authHeader = c.req.header('authorization');
  const userHeaderId = c.req.header('x-user-id');
  const companyHeaderId = c.req.header('x-company-id');

  let user: User | null = null;
  let targetUserId = userHeaderId;

  if (!targetUserId && authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    targetUserId = token.replace('token_', '');
  }

  // 1. Try fetching user from Supabase PostgreSQL
  if (targetUserId) {
    user = await supabaseService.findUserById(targetUserId);
  }

  // 2. Fallback to store only if user was specifically requested by ID and exists in store (e.g. quick demo button)
  if (!user && targetUserId) {
    user = db.users.find(u => u.id === targetUserId && u.isActive) || null;
  }

  if (!user || !user.isActive) {
    return c.json({ error: 'Não autorizado. Sessão inválida ou expirada.' }, 401);
  }

  c.set('user', user);

  // Multi-tenant: Allow tenant switching if header provided and user has permission
  if (companyHeaderId && (user.role === 'ADMIN' || user.role === 'MANAGER' || user.companyId === companyHeaderId)) {
    c.set('companyId', companyHeaderId);
  } else {
    c.set('companyId', user.companyId);
  }

  await next();
}

/**
 * RBAC middleware for internal Admin Panel
 */
export async function honoRequireAdmin(c: Context<HonoContextEnv>, next: Next) {
  const user = c.get('user');
  if (!user) {
    return c.json({ error: 'Autenticação necessária.' }, 401);
  }

  const internalRoles: UserRole[] = ['ADMIN', 'MANAGER', 'SUPPORT', 'OPERATOR'];
  if (!internalRoles.includes(user.role)) {
    return c.json({ error: 'Acesso restrito ao Painel Administrativo Interno SYNTECH DC.' }, 403);
  }

  await next();
}
