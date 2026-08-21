import { Request, Response, NextFunction } from 'express';
import { supabaseService } from '../db/supabaseService.js';
import { db } from '../db/store.js';
import { User, UserRole } from '../../shared/types.js';

export interface AuthenticatedRequest extends Request {
  user?: User;
  companyId?: string;
}

export async function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const userHeaderId = req.headers['x-user-id'] as string;
  const companyHeaderId = req.headers['x-company-id'] as string;

  let user: User | null = null;
  let targetUserId = userHeaderId;

  if (!targetUserId && authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    targetUserId = token.replace('token_', '');
  }

  // 1. Try fetching from Supabase PostgreSQL
  if (targetUserId) {
    user = await supabaseService.findUserById(targetUserId);
  }

  // 2. Fallback to in-memory store if not in Supabase or Supabase is offline
  if (!user && targetUserId) {
    user = db.users.find(u => u.id === targetUserId && u.isActive) || null;
  }

  // 3. Fallback default user for immediate trial exploration if unauthenticated
  if (!user) {
    user = await supabaseService.findUserById('usr-farmavida-roberto');
    if (!user) {
      user = db.users.find(u => u.id === 'usr-farmavida-roberto') || null;
    }
  }

  if (!user || !user.isActive) {
    return res.status(401).json({ error: 'Não autorizado. Usuário não encontrado ou inativo.' });
  }

  req.user = user;
  
  // Allow tenant switching if header provided and allowed
  if (companyHeaderId && (user.role === 'ADMIN' || user.role === 'MANAGER' || user.companyId === companyHeaderId)) {
    req.companyId = companyHeaderId;
  } else {
    req.companyId = user.companyId;
  }

  next();
}

export function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: 'Autenticação necessária.' });
  }

  const internalRoles: UserRole[] = ['ADMIN', 'MANAGER', 'SUPPORT', 'OPERATOR'];
  if (!internalRoles.includes(req.user.role)) {
    return res.status(403).json({ error: 'Acesso restrito ao Painel Administrativo Interno SYNTECH DC.' });
  }

  next();
}

