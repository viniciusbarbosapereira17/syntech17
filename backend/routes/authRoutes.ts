import { Router, Request, Response } from 'express';
import { supabaseService } from '../db/supabaseService.js';
import { db } from '../db/store.js';
import { AuthenticatedRequest, authMiddleware } from '../middleware/auth.js';
import { Company, User } from '../../shared/types.js';

export const authRouter = Router();

// Client login
authRouter.post('/login', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'E-mail é obrigatório.' });
    }

    const cleanEmail = email.toLowerCase().trim();

    // 1. Fetch from Supabase PostgreSQL
    let user = await supabaseService.findUserByEmail(cleanEmail);

    // 2. Fallback to store if not found in Supabase
    if (!user) {
      user = db.users.find(u => u.email.toLowerCase() === cleanEmail) || null;
    }

    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'Credenciais inválidas ou conta inativa.' });
    }

    // Fetch company
    let company: Company | null = null;
    if (user.companyId) {
      company = await supabaseService.getCompanyById(user.companyId);
      if (!company) {
        company = db.companies.find(c => c.id === user.companyId) || null;
      }
    }

    // Update last login
    const lastLoginAt = new Date().toISOString();
    user.lastLoginAt = lastLoginAt;
    await supabaseService.updateUser(user.id, { lastLoginAt });

    // Audit log in Supabase
    await supabaseService.createAuditLog({
      companyId: user.companyId,
      companyName: company?.name,
      userId: user.id,
      userEmail: user.email,
      action: 'USER_LOGIN',
      resource: 'Auth',
      details: `Login realizado com sucesso no Supabase para o usuário ${user.name}.`,
      ipAddress: req.ip || '127.0.0.1',
    });

    return res.json({
      token: `token_${user.id}`,
      user,
      company,
    });
  } catch (error) {
    console.error('[AuthRoutes] Login error:', error);
    return res.status(500).json({ error: 'Erro interno ao processar autenticação.' });
  }
});

// Admin login
authRouter.post('/admin-login', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'E-mail administrativo é obrigatório.' });
    }

    const cleanEmail = email.toLowerCase().trim();
    let user = await supabaseService.findUserByEmail(cleanEmail);

    if (!user) {
      user = db.users.find(u => u.email.toLowerCase() === cleanEmail) || null;
    }

    const internalRoles = ['ADMIN', 'MANAGER', 'SUPPORT', 'OPERATOR'];

    if (!user || !internalRoles.includes(user.role)) {
      return res.status(403).json({ error: 'Acesso restrito. Este usuário não possui credenciais administrativas.' });
    }

    const lastLoginAt = new Date().toISOString();
    user.lastLoginAt = lastLoginAt;
    await supabaseService.updateUser(user.id, { lastLoginAt });

    await supabaseService.createAuditLog({
      userId: user.id,
      userEmail: user.email,
      action: 'ADMIN_LOGIN',
      resource: 'AdminAuth',
      details: `Acesso autenticado ao Painel Administrativo pelo operador ${user.name} (${user.role}).`,
      ipAddress: req.ip || '127.0.0.1',
    });

    return res.json({
      token: `token_${user.id}`,
      user,
    });
  } catch (error) {
    console.error('[AuthRoutes] Admin login error:', error);
    return res.status(500).json({ error: 'Erro interno ao processar login administrativo.' });
  }
});

// Client registration (new company & admin user)
authRouter.post('/register', async (req: Request, res: Response) => {
  try {
    const { companyName, tradeName, cnpj, email, phone, adminName, adminEmail, planId } = req.body;

    if (!companyName || !cnpj || !adminEmail || !adminName) {
      return res.status(400).json({ error: 'Por favor, preencha todos os campos obrigatórios.' });
    }

    // Check existing user or CNPJ in Supabase
    const existingUser = await supabaseService.findUserByEmail(adminEmail);
    if (existingUser) {
      return res.status(409).json({ error: 'Este e-mail já está cadastrado.' });
    }

    // Get selected plan
    const plans = await supabaseService.getAllPlans();
    const selectedPlanId = planId || 'plan-starter';
    const plan = (plans.length > 0 ? plans.find(p => p.id === selectedPlanId) : null) || db.plans[0];

    const companyId = `comp_${Date.now()}`;
    const userId = `usr_${Date.now()}`;

    // Create Company in Supabase
    const newCompany = await supabaseService.createCompany({
      id: companyId,
      name: companyName,
      tradeName: tradeName || companyName,
      cnpj,
      email: email || adminEmail,
      phone: phone || '+55 11 99999-0000',
      status: 'TRIAL',
      planId: plan.id,
      monthlyQuota: plan.messageQuota || 50000,
      usedQuota: 0,
      contactLimit: plan.contactLimit || 100000,
      senderVerified: false,
    });

    // Create User in Supabase
    const newUser = await supabaseService.createUser({
      id: userId,
      companyId: companyId,
      name: adminName,
      email: adminEmail,
      role: 'CLIENT_ADMIN',
      phone,
      isActive: true,
    });

    // Create Subscription in Supabase
    const now = new Date();
    const endDate = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000); // 14 days trial
    await supabaseService.createSubscription({
      companyId,
      planId: plan.id,
      status: 'TRIAL',
      amount: plan.price,
      interval: 'MONTHLY',
      currentPeriodStart: now.toISOString(),
      currentPeriodEnd: endDate.toISOString(),
      autoRenew: false,
      paymentMethod: 'PIX',
    });

    // Create default onboarding template
    await supabaseService.createTemplate(companyId, {
      name: 'Boas-Vindas Padrão Syntech',
      category: 'UTILITY',
      content: 'Olá *{nome}*! Bem-vindo à {empresa}. Estamos à disposição para atendê-lo na unidade {loja} ({cidade}).',
      variables: ['nome', 'empresa', 'loja', 'cidade'],
      status: 'APPROVED',
    });

    // Also update in-memory store for instant zero-latency caching
    if (newCompany && newUser) {
      db.companies.push(newCompany);
      db.users.push(newUser);
    }

    return res.status(201).json({
      message: 'Conta empresarial criada com sucesso!',
      token: `token_${newUser?.id || userId}`,
      user: newUser || { id: userId, companyId, name: adminName, email: adminEmail, role: 'CLIENT_ADMIN', isActive: true, createdAt: now.toISOString(), updatedAt: now.toISOString() },
      company: newCompany || { id: companyId, name: companyName, tradeName: tradeName || companyName, cnpj, email: adminEmail, phone: phone || '', status: 'TRIAL', planId: plan.id, monthlyQuota: 50000, usedQuota: 0, contactLimit: 100000, contactCount: 0, senderVerified: false, createdAt: now.toISOString(), updatedAt: now.toISOString() },
    });
  } catch (error) {
    console.error('[AuthRoutes] Register error:', error);
    return res.status(500).json({ error: 'Erro ao cadastrar empresa.' });
  }
});

// Current User & Active Company
authRouter.get('/me', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    const activeCompanyId = req.companyId || user.companyId;

    let company: Company | null = null;
    if (activeCompanyId) {
      company = await supabaseService.getCompanyById(activeCompanyId);
      if (!company) {
        company = db.companies.find(c => c.id === activeCompanyId) || null;
      }
    }

    let subscription = activeCompanyId ? await supabaseService.getSubscriptionByCompany(activeCompanyId) : null;
    if (!subscription && activeCompanyId) {
      subscription = db.subscriptions.find(s => s.companyId === activeCompanyId) || null;
    }

    let plan = company?.planId ? await supabaseService.getPlanById(company.planId) : null;
    if (!plan && company?.planId) {
      plan = db.plans.find(p => p.id === company?.planId) || null;
    }

    let availableTenants;
    if (user.role === 'ADMIN' || user.role === 'MANAGER') {
      const allCompanies = await supabaseService.getAllCompanies();
      const list = allCompanies.length > 0 ? allCompanies : db.companies;
      availableTenants = list.map(c => ({ id: c.id, name: c.name, status: c.status }));
    }

    return res.json({
      user,
      company,
      subscription,
      plan,
      availableTenants,
    });
  } catch (error) {
    console.error('[AuthRoutes] /me error:', error);
    return res.status(500).json({ error: 'Erro ao obter dados de sessão.' });
  }
});
