import { Hono } from 'hono';
import { HonoContextEnv } from '../types/workerEnv.js';
import { supabaseService } from '../db/supabaseService.js';
import { db } from '../db/store.js';
import { getSupabase } from '../db/supabaseClient.js';
import { honoAuthMiddleware } from '../middleware/honoAuth.js';
import { Company, User } from '../../shared/types.js';

export const honoAuth = new Hono<HonoContextEnv>();

// 1. Client login
honoAuth.post('/login', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const { email, password } = body;

    if (!email) {
      return c.json({ error: 'E-mail é obrigatório.' }, 400);
    }

    const cleanEmail = String(email).toLowerCase().trim();

    // 1. If password provided and Supabase is configured, verify via Supabase Auth
    const supabase = getSupabase(c.env);
    if (supabase && password) {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: password,
      });

      if (!authError && authData.user) {
        let user = await supabaseService.findUserById(authData.user.id);
        if (!user) {
          user = await supabaseService.findUserByEmail(cleanEmail);
        }

        if (user && user.isActive) {
          let company: Company | null = null;
          if (user.companyId) {
            company = await supabaseService.getCompanyById(user.companyId);
          }

          const lastLoginAt = new Date().toISOString();
          user.lastLoginAt = lastLoginAt;
          await supabaseService.updateUser(user.id, { lastLoginAt });

          await supabaseService.createAuditLog({
            companyId: user.companyId,
            companyName: company?.name,
            userId: user.id,
            userEmail: user.email,
            action: 'USER_LOGIN',
            resource: 'Auth',
            details: `Login Supabase Auth realizado com sucesso para o usuário ${user.name}.`,
            ipAddress: c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for') || '127.0.0.1',
          });

          return c.json({
            token: authData.session?.access_token || `token_${user.id}`,
            user,
            company,
          });
        }
      }
    }

    // 2. Fetch from Supabase PostgreSQL users table
    let user = await supabaseService.findUserByEmail(cleanEmail);

    // 3. Fallback to demo store if not found in Supabase (for demo quick access)
    if (!user) {
      user = db.users.find(u => u.email.toLowerCase() === cleanEmail) || null;
    }

    if (!user || !user.isActive) {
      return c.json({ error: 'Credenciais inválidas ou conta inativa.' }, 401);
    }

    // Fetch company
    let company: Company | null = null;
    if (user.companyId) {
      company = await supabaseService.getCompanyById(user.companyId);
      if (!company) {
        company = db.companies.find(comp => comp.id === user?.companyId) || null;
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
      details: `Login realizado com sucesso para o usuário ${user.name}.`,
      ipAddress: c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for') || '127.0.0.1',
    });

    return c.json({
      token: `token_${user.id}`,
      user,
      company,
    });
  } catch (error) {
    console.error('[HonoAuth] Login error:', error);
    return c.json({ error: 'Erro interno ao processar autenticação.' }, 500);
  }
});

// 2. Admin login
honoAuth.post('/admin-login', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const { email } = body;

    if (!email) {
      return c.json({ error: 'E-mail administrativo é obrigatório.' }, 400);
    }

    const cleanEmail = String(email).toLowerCase().trim();
    let user = await supabaseService.findUserByEmail(cleanEmail);

    if (!user) {
      user = db.users.find(u => u.email.toLowerCase() === cleanEmail) || null;
    }

    const internalRoles = ['ADMIN', 'MANAGER', 'SUPPORT', 'OPERATOR'];

    if (!user || !internalRoles.includes(user.role)) {
      return c.json({ error: 'Acesso restrito. Este usuário não possui credenciais administrativas.' }, 403);
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
      ipAddress: c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for') || '127.0.0.1',
    });

    return c.json({
      token: `token_${user.id}`,
      user,
    });
  } catch (error) {
    console.error('[HonoAuth] Admin login error:', error);
    return c.json({ error: 'Erro interno ao processar login administrativo.' }, 500);
  }
});

// 3. Client registration (REAL SUPABASE CADASTRO)
honoAuth.post('/register', async (c) => {
  let createdAuthUserId: string | null = null;
  let createdCompanyId: string | null = null;
  const supabase = getSupabase(c.env);

  try {
    const body = await c.req.json().catch(() => ({}));
    const { companyName, tradeName, cnpj, adminName, adminEmail, phone, password, planId } = body;

    // 1. Mandatory Fields Validation
    if (!companyName || !companyName.trim()) {
      return c.json({ error: 'A Razão Social da empresa é obrigatória.' }, 400);
    }
    if (!cnpj || !cnpj.trim()) {
      return c.json({ error: 'O CNPJ da empresa é obrigatório.' }, 400);
    }
    if (!adminName || !adminName.trim()) {
      return c.json({ error: 'O nome do gestor responsável é obrigatório.' }, 400);
    }
    if (!adminEmail || !adminEmail.trim() || !adminEmail.includes('@')) {
      return c.json({ error: 'Por favor, informe um e-mail corporativo válido.' }, 400);
    }
    if (!password || String(password).length < 6) {
      return c.json({ error: 'A senha de acesso deve possuir no mínimo 6 caracteres.' }, 400);
    }

    const cleanEmail = String(adminEmail).toLowerCase().trim();
    const cleanCnpj = String(cnpj).trim();

    // 2. Duplicate Check in Supabase
    const existingUser = await supabaseService.findUserByEmail(cleanEmail);
    if (existingUser) {
      return c.json({ error: 'Este e-mail já está cadastrado no sistema.' }, 409);
    }

    const existingCompany = await supabaseService.findCompanyByCnpj(cleanCnpj);
    if (existingCompany) {
      return c.json({ error: `O CNPJ ${cleanCnpj} já está cadastrado para a empresa "${existingCompany.name}".` }, 409);
    }

    // 3. Supabase Auth User Creation (auth.users)
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
          console.warn('[HonoAuth] Supabase auth.admin.createUser:', authError.message);
          if (authError.message?.toLowerCase().includes('already') || (authError as any).status === 422) {
            return c.json({ error: 'Este e-mail já está registrado no serviço de autenticação.' }, 409);
          }

          // Fallback to signUp if service role admin endpoint is not permitted
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
            console.error('[HonoAuth] Supabase auth.signUp error:', signUpError);
            return c.json({ error: `Falha na autenticação do Supabase: ${signUpError.message}` }, 400);
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
        console.error('[HonoAuth] Supabase Auth exception:', authErr);
        return c.json({ error: `Erro no Supabase Auth: ${authErr.message || authErr}` }, 500);
      }
    }

    // 4. Resolve Plan
    const plans = await supabaseService.getAllPlans();
    const selectedPlanId = planId || 'plan-pro';
    const plan = (plans.length > 0 ? plans.find(p => p.id === selectedPlanId || p.slug === selectedPlanId) : null) || plans[0] || db.plans[0];

    // 5. Create Company in public.companies (REAL SUPABASE INSERT)
    const companyId = crypto.randomUUID();
    const newCompany = await supabaseService.createCompany({
      id: companyId,
      name: companyName.trim(),
      tradeName: tradeName?.trim() || companyName.trim(),
      cnpj: cleanCnpj,
      email: cleanEmail,
      phone: phone?.trim() || '+55 11 99999-0000',
      status: 'TRIAL',
      planId: plan?.id || null,
      monthlyQuota: plan?.messageQuota || 50000,
      usedQuota: 0,
      contactLimit: plan?.contactLimit || 100000,
      senderVerified: false,
    });

    if (!newCompany) {
      // Rollback Auth user
      if (supabase && createdAuthUserId) {
        try { await supabase.auth.admin.deleteUser(createdAuthUserId); } catch (e) { /* ignore rollback err */ }
      }
      return c.json({ error: 'Não foi possível registrar a empresa no banco de dados Supabase. Verifique os dados e tente novamente.' }, 500);
    }

    createdCompanyId = newCompany.id;

    // 6. Create Profile in public.profiles linked to auth.users.id & company_id (REAL SUPABASE INSERT)
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
      // Atomic Rollback: delete company and delete auth user
      await supabaseService.deleteCompany(newCompany.id);
      if (supabase && createdAuthUserId) {
        try { await supabase.auth.admin.deleteUser(createdAuthUserId); } catch (e) { /* ignore rollback err */ }
      }
      return c.json({ error: 'Não foi possível criar o perfil do usuário gestor em public.profiles no Supabase.' }, 500);
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
      // Complete atomic rollback
      await supabaseService.deleteProfile(newProfile.id);
      await supabaseService.deleteCompany(newCompany.id);
      if (supabase && createdAuthUserId) {
        try { await supabase.auth.admin.deleteUser(createdAuthUserId); } catch (e) { /* ignore rollback err */ }
      }
      return c.json({ error: 'Não foi possível registrar a assinatura de teste no Supabase.' }, 500);
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
      // Complete atomic rollback
      await supabaseService.deleteSubscription(subscriptionId);
      await supabaseService.deleteProfile(newProfile.id);
      await supabaseService.deleteCompany(newCompany.id);
      if (supabase && createdAuthUserId) {
        try { await supabase.auth.admin.deleteUser(createdAuthUserId); } catch (e) { /* ignore rollback err */ }
      }
      return c.json({ error: 'Não foi possível provisionar o modelo de mensagem inicial no Supabase.' }, 500);
    }

    // 9. Audit Log in public.audit_logs (user_id = profiles.id)
    await supabaseService.createAuditLog({
      id: crypto.randomUUID(),
      companyId: newCompany.id,
      companyName: newCompany.name,
      userId: newProfile.id,
      userEmail: newProfile.email,
      action: 'COMPANY_REGISTERED',
      resource: 'Auth',
      details: `Conta corporativa criada com sucesso para ${newCompany.name} (CNPJ: ${newCompany.cnpj}). Gestor: ${newProfile.name}.`,
      ipAddress: c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for') || '127.0.0.1',
    });

    // 10. Return REAL Data
    return c.json({
      message: 'Conta corporativa criada com sucesso!',
      token: `token_${newProfile.id}`,
      user: newProfile,
      company: newCompany,
    }, 201);
  } catch (error: any) {
    console.error('[HonoAuth] Register error:', error);

    // Rollback if partially created
    if (createdCompanyId) {
      try { await supabaseService.deleteCompany(createdCompanyId); } catch (e) { /* ignore rollback err */ }
    }
    if (supabase && createdAuthUserId) {
      try { await supabase.auth.admin.deleteUser(createdAuthUserId); } catch (e) { /* ignore rollback err */ }
    }

    return c.json({ error: error?.message || 'Erro interno ao processar cadastro de empresa no Supabase.' }, 500);
  }
});

// 4. Current User & Active Company
honoAuth.get('/me', honoAuthMiddleware, async (c) => {
  try {
    const user = c.get('user')!;
    const activeCompanyId = c.get('companyId') || user.companyId;

    let company: Company | null = null;
    if (activeCompanyId) {
      company = await supabaseService.getCompanyById(activeCompanyId);
      if (!company) {
        company = db.companies.find(comp => comp.id === activeCompanyId) || null;
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
      availableTenants = list.map(comp => ({ id: comp.id, name: comp.name, status: comp.status }));
    }

    return c.json({
      user,
      company,
      subscription,
      plan,
      availableTenants,
    });
  } catch (error) {
    console.error('[HonoAuth] /me error:', error);
    return c.json({ error: 'Erro ao obter dados de sessão.' }, 500);
  }
});
