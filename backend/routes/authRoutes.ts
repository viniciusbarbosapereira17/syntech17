import { Router, Request, Response } from 'express';
import { supabaseService } from '../db/supabaseService.js';
import { db } from '../db/store.js';
import { getSupabase } from '../db/supabaseClient.js';
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
  let createdAuthUserId: string | null = null;
  let createdCompanyId: string | null = null;

  try {
    const { companyName, tradeName, cnpj, adminName, adminEmail, phone, password, planId } = req.body;

    if (!companyName || !companyName.trim()) {
      return res.status(400).json({ error: 'A Razão Social da empresa é obrigatória.' });
    }
    if (!cnpj || !cnpj.trim()) {
      return res.status(400).json({ error: 'O CNPJ da empresa é obrigatório.' });
    }
    if (!adminName || !adminName.trim()) {
      return res.status(400).json({ error: 'O nome do gestor responsável é obrigatório.' });
    }
    if (!adminEmail || !adminEmail.trim() || !adminEmail.includes('@')) {
      return res.status(400).json({ error: 'Por favor, informe um e-mail corporativo válido.' });
    }
    if (!password || String(password).length < 6) {
      return res.status(400).json({ error: 'A senha de acesso deve possuir no mínimo 6 caracteres.' });
    }

    const cleanEmail = String(adminEmail).toLowerCase().trim();
    const cleanCnpj = String(cnpj).trim();

    // Check existing user or CNPJ in Supabase
    const existingUser = await supabaseService.findUserByEmail(cleanEmail);
    if (existingUser) {
      return res.status(409).json({ error: 'Este e-mail já está cadastrado no sistema.' });
    }

    const existingCompany = await supabaseService.findCompanyByCnpj(cleanCnpj);
    if (existingCompany) {
      return res.status(409).json({ error: `O CNPJ ${cleanCnpj} já está cadastrado para a empresa "${existingCompany.name}".` });
    }

    // 3. Supabase Auth User Creation (auth.users)
    const supabase = getSupabase();
    let authUserId: string = crypto.randomUUID();

    if (supabase) {
      try {
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
          email: cleanEmail,
          password: String(password),
          email_confirm: true,
          user_metadata: {
            name: adminName.trim(),
            phone: phone?.trim(),
            role: 'CLIENT_ADMIN',
          },
        });

        if (authError) {
          console.warn('[AuthRoutes] Supabase auth.admin.createUser:', authError.message);
          if (authError.message?.toLowerCase().includes('already') || (authError as any).status === 422) {
            return res.status(409).json({ error: 'Este e-mail já está registrado no serviço de autenticação.' });
          }

          const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
            email: cleanEmail,
            password: String(password),
            options: {
              data: {
                name: adminName.trim(),
                phone: phone?.trim(),
                role: 'CLIENT_ADMIN',
              },
            },
          });

          if (signUpError) {
            console.error('[AuthRoutes] Supabase auth.signUp error:', signUpError);
            return res.status(400).json({ error: `Falha na autenticação do Supabase: ${signUpError.message}` });
          }

          if (signUpData.user?.id) {
            authUserId = signUpData.user.id;
            createdAuthUserId = authUserId;
          }
        } else if (authData.user?.id) {
          authUserId = authData.user.id;
          createdAuthUserId = authUserId;
        }
      } catch (authErr: any) {
        console.error('[AuthRoutes] Supabase Auth exception:', authErr);
        return res.status(500).json({ error: `Erro no Supabase Auth: ${authErr.message || authErr}` });
      }
    }

    // 4. Resolve Plan
    const plans = await supabaseService.getAllPlans();
    const selectedPlanId = planId || 'plan-pro';
    const plan = (plans.length > 0 ? plans.find(p => p.id === selectedPlanId || p.slug === selectedPlanId) : null) || plans[0] || db.plans[0];

    const companyId = crypto.randomUUID();

    // 5. Create Company in public.companies
    const newCompany = await supabaseService.createCompany({
      id: companyId,
      name: companyName.trim(),
      tradeName: tradeName?.trim() || companyName.trim(),
      cnpj: cleanCnpj,
      email: cleanEmail,
      phone: phone?.trim() || '+55 11 99999-0000',
      status: 'TRIAL',
      planId: plan.id,
      monthlyQuota: plan.messageQuota || 50000,
      usedQuota: 0,
      contactLimit: plan.contactLimit || 100000,
      senderVerified: false,
    });

    if (!newCompany) {
      if (supabase && createdAuthUserId) {
        try { await supabase.auth.admin.deleteUser(createdAuthUserId); } catch (e) { /* ignore */ }
      }
      return res.status(500).json({ error: 'Falha ao gravar registro da empresa no Supabase.' });
    }

    createdCompanyId = newCompany.id;

    // 6. Create Profile in public.profiles (auth.users.id -> profiles.id -> companies.id)
    const newProfile = await supabaseService.createProfile({
      id: authUserId,
      companyId: newCompany.id,
      name: adminName.trim(),
      email: cleanEmail,
      role: 'CLIENT_ADMIN',
      phone: phone?.trim() || null,
      isActive: true,
    });

    if (!newProfile) {
      await supabaseService.deleteCompany(newCompany.id);
      if (supabase && createdAuthUserId) {
        try { await supabase.auth.admin.deleteUser(createdAuthUserId); } catch (e) { /* ignore */ }
      }
      return res.status(500).json({ error: 'Falha ao criar o perfil do usuário gestor em public.profiles no Supabase.' });
    }

    // 7. Create Subscription Trial in public.subscriptions
    const now = new Date();
    const endDate = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000); // 14 days trial
    const subscriptionId = crypto.randomUUID();
    const newSubscription = await supabaseService.createSubscription({
      id: subscriptionId,
      companyId: newCompany.id,
      planId: plan.id,
      status: 'TRIAL',
      amount: plan.price || 0,
      interval: 'MONTHLY',
      currentPeriodStart: now.toISOString(),
      currentPeriodEnd: endDate.toISOString(),
      autoRenew: false,
      paymentMethod: 'PIX',
    });

    if (!newSubscription) {
      await supabaseService.deleteProfile(newProfile.id);
      await supabaseService.deleteCompany(newCompany.id);
      if (supabase && createdAuthUserId) {
        try { await supabase.auth.admin.deleteUser(createdAuthUserId); } catch (e) { /* ignore */ }
      }
      return res.status(500).json({ error: 'Falha ao registrar assinatura de teste no Supabase.' });
    }

    // 8. Create Default Onboarding Template in public.templates
    const templateId = crypto.randomUUID();
    const newTemplate = await supabaseService.createTemplate(newCompany.id, {
      id: templateId,
      name: 'Boas-Vindas Padrão Syntech',
      category: 'UTILITY',
      content: 'Olá *{nome}*! Bem-vindo à {empresa}. Estamos à disposição para atendê-lo na unidade {loja} ({cidade}).',
      variables: ['nome', 'empresa', 'loja', 'cidade'],
      status: 'APPROVED',
    });

    if (!newTemplate) {
      await supabaseService.deleteSubscription(subscriptionId);
      await supabaseService.deleteProfile(newProfile.id);
      await supabaseService.deleteCompany(newCompany.id);
      if (supabase && createdAuthUserId) {
        try { await supabase.auth.admin.deleteUser(createdAuthUserId); } catch (e) { /* ignore */ }
      }
      return res.status(500).json({ error: 'Falha ao provisionar template inicial no Supabase.' });
    }

    // 9. Audit log in public.audit_logs (user_id = profiles.id)
    await supabaseService.createAuditLog({
      id: crypto.randomUUID(),
      companyId: newCompany.id,
      companyName: newCompany.name,
      userId: newProfile.id,
      userEmail: newProfile.email,
      action: 'COMPANY_REGISTERED',
      resource: 'Auth',
      details: `Conta corporativa criada com sucesso para ${newCompany.name} (CNPJ: ${newCompany.cnpj}). Usuário gestor: ${newProfile.name}.`,
      ipAddress: req.ip || '127.0.0.1',
    });

    return res.status(201).json({
      message: 'Conta corporativa criada com sucesso!',
      token: `token_${newProfile.id}`,
      user: newProfile,
      company: newCompany,
    });
  } catch (error: any) {
    console.error('[AuthRoutes] Register error:', error);
    if (createdCompanyId) {
      try { await supabaseService.deleteCompany(createdCompanyId); } catch (e) { /* ignore */ }
    }
    if (createdAuthUserId) {
      const supabase = getSupabase();
      if (supabase) {
        try { await supabase.auth.admin.deleteUser(createdAuthUserId); } catch (e) { /* ignore */ }
      }
    }
    return res.status(500).json({ error: error?.message || 'Erro ao cadastrar empresa.' });
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
