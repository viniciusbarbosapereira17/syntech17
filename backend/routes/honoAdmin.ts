import { Hono } from 'hono';
import { HonoContextEnv } from '../types/workerEnv.js';
import { supabaseService } from '../db/supabaseService.js';
import { db } from '../db/store.js';
import { honoAuthMiddleware, honoRequireAdmin } from '../middleware/honoAuth.js';

export const honoAdmin = new Hono<HonoContextEnv>();

// Apply auth and admin check
honoAdmin.use('*', honoAuthMiddleware);
honoAdmin.use('*', honoRequireAdmin);

// ==========================================
// 1. ADMIN DASHBOARD
// ==========================================
honoAdmin.get('/dashboard', async (c) => {
  try {
    let companies = await supabaseService.getAllCompanies();
    if (companies.length === 0) companies = db.companies;

    let subscriptions = await supabaseService.getAllSubscriptions();
    if (subscriptions.length === 0) subscriptions = db.subscriptions;

    let tickets = await supabaseService.getSupportTickets();
    if (tickets.length === 0) tickets = db.supportTickets;

    let campaigns = await supabaseService.getAllCampaigns();
    if (campaigns.length === 0) campaigns = db.campaigns;

    let plans = await supabaseService.getAllPlans();
    if (plans.length === 0) plans = db.plans;

    const totalClients = companies.length;
    const activeClients = companies.filter(comp => comp.status === 'ACTIVE').length;
    const trialClients = companies.filter(comp => comp.status === 'TRIAL').length;
    const suspendedClients = companies.filter(comp => comp.status === 'SUSPENDED' || comp.status === 'BLOCKED').length;

    const activeSubscriptions = subscriptions.filter(s => s.status === 'ACTIVE').length;
    
    // Calculate total MRR
    const mrr = subscriptions
      .filter(s => s.status === 'ACTIVE' || s.status === 'TRIAL')
      .reduce((acc, curr) => acc + (curr.amount || 0), 0);

    const openTickets = tickets.filter(t => t.status === 'OPEN' || t.status === 'IN_PROGRESS').length;
    const urgentTickets = tickets.filter(t => t.priority === 'URGENT' && t.status !== 'CLOSED' && t.status !== 'RESOLVED').length;

    const totalPlatformMessages = campaigns.reduce((acc, camp) => acc + (camp.processedCount || 0), 0);
    const runningCampaigns = campaigns.filter(camp => camp.status === 'RUNNING').length;

    const recentActivity = (await supabaseService.getAuditLogs()).slice(0, 8);
    const recentTickets = tickets.slice(0, 5);

    return c.json({
      metrics: {
        totalClients,
        activeClients,
        trialClients,
        suspendedClients,
        activeSubscriptions,
        mrr,
        openTickets,
        urgentTickets,
        totalPlatformMessages,
        runningCampaigns,
      },
      companiesList: companies.map(comp => ({
        id: comp.id,
        name: comp.name,
        tradeName: comp.tradeName,
        cnpj: comp.cnpj,
        status: comp.status,
        plan: plans.find(p => p.id === comp.planId)?.name || 'Personalizado',
        usedQuota: comp.usedQuota,
        monthlyQuota: comp.monthlyQuota,
        createdAt: comp.createdAt,
      })),
      recentActivity: recentActivity.length > 0 ? recentActivity : db.auditLogs.slice(0, 8),
      recentTickets,
      recentCampaigns: campaigns.slice(0, 5),
    });
  } catch (error) {
    console.error('[HonoAdmin] /dashboard error:', error);
    return c.json({ error: 'Erro ao obter dados do dashboard administrativo.' }, 500);
  }
});

// ==========================================
// 2. CLIENTES (Tenants Management)
// ==========================================
honoAdmin.get('/clientes', async (c) => {
  try {
    const status = c.req.query('status');
    const search = c.req.query('search');

    let list = await supabaseService.getAllCompanies(
      search ? String(search) : undefined,
      status ? String(status) : undefined
    );
    if (list.length === 0 && !search && !status) {
      list = db.companies;
    }

    const plans = await supabaseService.getAllPlans();
    const subscriptions = await supabaseService.getAllSubscriptions();
    const allUsers = await supabaseService.getAllUsers();
    const allCampaigns = await supabaseService.getAllCampaigns();

    const enriched = list.map(company => {
      const plan = plans.find(p => p.id === company.planId) || db.plans.find(p => p.id === company.planId);
      const subscription = subscriptions.find(s => s.companyId === company.id) || db.subscriptions.find(s => s.companyId === company.id);
      const users = allUsers.filter(u => u.companyId === company.id);
      const campaignsCount = allCampaigns.filter(camp => camp.companyId === company.id).length;

      return {
        ...company,
        planName: plan?.name || 'Personalizado',
        planPrice: plan?.price || 0,
        subscriptionStatus: subscription?.status || company.status,
        subscriptionPeriodEnd: subscription?.currentPeriodEnd,
        usersCount: users.length,
        campaignsCount,
      };
    });

    return c.json(enriched);
  } catch (error) {
    console.error('[HonoAdmin] GET /clientes error:', error);
    return c.json({ error: 'Erro ao listar clientes.' }, 500);
  }
});

honoAdmin.post('/clientes', async (c) => {
  try {
    const user = c.get('user')!;
    const body = await c.req.json().catch(() => ({}));
    const { name, tradeName, cnpj, email, phone, planId, status, monthlyQuota, contactLimit, adminName, adminEmail } = body;

    if (!name || !cnpj || !adminEmail || !adminName) {
      return c.json({ error: 'Razão Social, CNPJ, Nome e E-mail do Administrador são obrigatórios.' }, 400);
    }

    const plan = await supabaseService.getPlanById(planId || 'plan-starter') || db.plans[0];
    const companyId = `comp_${Date.now()}`;
    const userId = `usr_${Date.now()}`;

    const newCompany = await supabaseService.createCompany({
      id: companyId,
      name: String(name).trim(),
      tradeName: tradeName ? String(tradeName).trim() : String(name).trim(),
      cnpj: String(cnpj).trim(),
      email: email ? String(email).trim() : String(adminEmail).trim(),
      phone: phone ? String(phone).trim() : '+55 11 99999-0000',
      status: status || 'ACTIVE',
      planId: plan.id,
      monthlyQuota: monthlyQuota ? Number(monthlyQuota) : plan.messageQuota,
      usedQuota: 0,
      contactLimit: contactLimit ? Number(contactLimit) : plan.contactLimit,
      contactCount: 0,
      senderVerified: false,
    });

    await supabaseService.createUser({
      id: userId,
      companyId,
      name: String(adminName).trim(),
      email: String(adminEmail).trim(),
      role: 'CLIENT_ADMIN',
      phone: phone ? String(phone).trim() : undefined,
      isActive: true,
    });

    const now = new Date();
    await supabaseService.createSubscription({
      companyId,
      planId: plan.id,
      status: status === 'TRIAL' ? 'TRIAL' : 'ACTIVE',
      amount: plan.price,
      interval: 'MONTHLY',
      currentPeriodStart: now.toISOString(),
      currentPeriodEnd: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      autoRenew: true,
      paymentMethod: 'PIX',
    });

    await supabaseService.createAuditLog({
      userId: user.id,
      userEmail: user.email,
      action: 'ADMIN_CREATE_COMPANY',
      resource: 'Companies',
      resourceId: companyId,
      details: `Empresa "${name}" (CNPJ: ${cnpj}) cadastrada manualmente pelo administrador.`,
      ipAddress: c.req.header('cf-connecting-ip') || '127.0.0.1',
    });

    return c.json(newCompany, 201);
  } catch (error) {
    console.error('[HonoAdmin] POST /clientes error:', error);
    return c.json({ error: 'Erro ao cadastrar empresa.' }, 500);
  }
});

honoAdmin.put('/clientes/:id', async (c) => {
  try {
    const user = c.get('user')!;
    const id = c.req.param('id');
    const body = await c.req.json().catch(() => ({}));
    const { name, tradeName, cnpj, email, phone, status, planId, monthlyQuota, usedQuota, contactLimit, senderPhone, senderVerified } = body;

    const company = await supabaseService.getCompanyById(id);
    if (!company) {
      return c.json({ error: 'Empresa não encontrada.' }, 404);
    }

    const updated = await supabaseService.updateCompany(id, {
      name: name ? String(name).trim() : undefined,
      tradeName: tradeName ? String(tradeName).trim() : undefined,
      cnpj: cnpj ? String(cnpj).trim() : undefined,
      email: email ? String(email).trim() : undefined,
      phone: phone ? String(phone).trim() : undefined,
      status,
      planId,
      monthlyQuota: monthlyQuota !== undefined ? Number(monthlyQuota) : undefined,
      usedQuota: usedQuota !== undefined ? Number(usedQuota) : undefined,
      contactLimit: contactLimit !== undefined ? Number(contactLimit) : undefined,
      senderPhone: senderPhone ? String(senderPhone).trim() : undefined,
      senderVerified: senderVerified !== undefined ? Boolean(senderVerified) : undefined,
    });

    if (status) {
      const sub = await supabaseService.getSubscriptionByCompany(id);
      if (sub) {
        let newSubStatus = sub.status;
        if (status === 'ACTIVE') newSubStatus = 'ACTIVE';
        if (status === 'SUSPENDED' || status === 'BLOCKED') newSubStatus = 'SUSPENDED';
        if (status === 'TRIAL') newSubStatus = 'TRIAL';
        await supabaseService.updateSubscription(sub.id, { status: newSubStatus });
      }
    }

    await supabaseService.createAuditLog({
      userId: user.id,
      userEmail: user.email,
      action: 'ADMIN_UPDATE_COMPANY',
      resource: 'Companies',
      resourceId: id,
      details: `Configurações da empresa ${company.name} atualizadas pelo administrador.`,
      ipAddress: c.req.header('cf-connecting-ip') || '127.0.0.1',
    });

    return c.json(updated || company);
  } catch (error) {
    console.error('[HonoAdmin] PUT /clientes/:id error:', error);
    return c.json({ error: 'Erro ao atualizar cliente.' }, 500);
  }
});

honoAdmin.post('/clientes/:id/reset-access', async (c) => {
  try {
    const user = c.get('user')!;
    const id = c.req.param('id');
    const company = await supabaseService.getCompanyById(id);
    if (!company) {
      return c.json({ error: 'Empresa não encontrada.' }, 404);
    }

    const users = await supabaseService.getAllUsers(id);
    const adminUser = users.find(u => u.role === 'CLIENT_ADMIN') || users[0];

    const resetToken = `rst_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const resetLink = `https://syntechdc.com.br/redefinir-senha?token=${resetToken}`;

    await supabaseService.createAuditLog({
      userId: user.id,
      userEmail: user.email,
      action: 'ADMIN_RESET_PASSWORD',
      resource: 'Users',
      resourceId: adminUser?.id,
      details: `Link de redefinição de credenciais gerado para o cliente ${company.name} (${adminUser?.email}).`,
      ipAddress: c.req.header('cf-connecting-ip') || '127.0.0.1',
    });

    return c.json({
      message: `Link de redefinição gerado com sucesso para ${adminUser?.email || company.email}.`,
      resetLink,
    });
  } catch (error) {
    console.error('[HonoAdmin] reset-access error:', error);
    return c.json({ error: 'Erro ao resetar acesso.' }, 500);
  }
});

// ==========================================
// 3. USUÁRIOS (Internal Staff & Client Users)
// ==========================================
honoAdmin.get('/usuarios', async (c) => {
  try {
    const role = c.req.query('role');
    const search = c.req.query('search');
    const companyId = c.req.query('companyId');

    let list = await supabaseService.getAllUsers(
      companyId ? String(companyId) : undefined,
      search ? String(search) : undefined,
      role ? String(role) : undefined
    );
    if (list.length === 0 && !role && !search && !companyId) {
      list = db.users;
    }

    const companies = await supabaseService.getAllCompanies();

    const enriched = list.map(user => {
      const comp = companies.find(compItem => compItem.id === user.companyId) || db.companies.find(compItem => compItem.id === user.companyId);
      return {
        ...user,
        companyName: comp?.tradeName || comp?.name || (user.role.startsWith('CLIENT') ? 'Empresa Desconhecida' : 'SYNTECH DC (Interno)'),
      };
    });

    return c.json(enriched);
  } catch (error) {
    console.error('[HonoAdmin] GET /usuarios error:', error);
    return c.json({ error: 'Erro ao listar usuários.' }, 500);
  }
});

honoAdmin.post('/usuarios', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const { name, email, role, phone, companyId, isActive } = body;

    if (!name || !email || !role) {
      return c.json({ error: 'Nome, e-mail e cargo são obrigatórios.' }, 400);
    }

    const newUser = await supabaseService.createUser({
      name: String(name).trim(),
      email: String(email).trim().toLowerCase(),
      role: role as any,
      phone: phone ? String(phone).trim() : undefined,
      companyId: String(role).startsWith('CLIENT') ? (companyId || c.get('companyId')) : undefined,
      isActive: isActive !== false,
    });

    return c.json(newUser, 201);
  } catch (error) {
    console.error('[HonoAdmin] POST /usuarios error:', error);
    return c.json({ error: 'Erro ao cadastrar usuário.' }, 500);
  }
});

honoAdmin.put('/usuarios/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json().catch(() => ({}));
    const { name, role, phone, isActive, avatarUrl } = body;

    const user = await supabaseService.findUserById(id);
    if (!user) {
      return c.json({ error: 'Usuário não encontrado.' }, 404);
    }

    const updated = await supabaseService.updateUser(id, {
      name: name ? String(name).trim() : undefined,
      role: role as any,
      phone: phone !== undefined ? (phone ? String(phone).trim() : undefined) : undefined,
      isActive: isActive !== undefined ? Boolean(isActive) : undefined,
      avatarUrl: avatarUrl !== undefined ? avatarUrl : undefined,
    });

    return c.json(updated || user);
  } catch (error) {
    console.error('[HonoAdmin] PUT /usuarios/:id error:', error);
    return c.json({ error: 'Erro ao atualizar usuário.' }, 500);
  }
});

// ==========================================
// 4. PLANOS (Plans Management)
// ==========================================
honoAdmin.get('/planos', async (c) => {
  try {
    let plans = await supabaseService.getAllPlans();
    if (plans.length === 0) plans = db.plans;
    return c.json(plans);
  } catch (error) {
    console.error('[HonoAdmin] GET /planos error:', error);
    return c.json({ error: 'Erro ao listar planos.' }, 500);
  }
});

honoAdmin.post('/planos', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const { name, slug, description, price, interval, messageQuota, contactLimit, maxSenders, features, isPublic } = body;

    if (!name || !price || !messageQuota) {
      return c.json({ error: 'Nome, preço e cota de mensagens são obrigatórios.' }, 400);
    }

    const newPlan = await supabaseService.createPlan({
      name: String(name).trim(),
      slug: slug || String(name).toLowerCase().replace(/\s+/g, '-'),
      description: description ? String(description).trim() : '',
      price: Number(price),
      interval: interval || 'MONTHLY',
      messageQuota: Number(messageQuota),
      contactLimit: Number(contactLimit) || 50000,
      maxSenders: Number(maxSenders) || 1,
      features: Array.isArray(features) ? features : [],
      isPublic: isPublic !== false,
    });

    return c.json(newPlan, 201);
  } catch (error) {
    console.error('[HonoAdmin] POST /planos error:', error);
    return c.json({ error: 'Erro ao criar plano.' }, 500);
  }
});

honoAdmin.put('/planos/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const plan = await supabaseService.getPlanById(id);
    if (!plan) {
      return c.json({ error: 'Plano não encontrado.' }, 404);
    }

    const body = await c.req.json().catch(() => ({}));
    const { name, description, price, messageQuota, contactLimit, maxSenders, features, isPublic, isPopular } = body;

    const updated = await supabaseService.updatePlan(id, {
      name: name ? String(name).trim() : undefined,
      description,
      price: price !== undefined ? Number(price) : undefined,
      messageQuota: messageQuota !== undefined ? Number(messageQuota) : undefined,
      contactLimit: contactLimit !== undefined ? Number(contactLimit) : undefined,
      maxSenders: maxSenders !== undefined ? Number(maxSenders) : undefined,
      features,
      isPublic: isPublic !== undefined ? Boolean(isPublic) : undefined,
      isPopular: isPopular !== undefined ? Boolean(isPopular) : undefined,
    });

    return c.json(updated || plan);
  } catch (error) {
    console.error('[HonoAdmin] PUT /planos/:id error:', error);
    return c.json({ error: 'Erro ao atualizar plano.' }, 500);
  }
});

// ==========================================
// 5. ASSINATURAS & PAGAMENTOS
// ==========================================
honoAdmin.get('/assinaturas', async (c) => {
  try {
    let subscriptions = await supabaseService.getAllSubscriptions();
    if (subscriptions.length === 0) subscriptions = db.subscriptions;

    const companies = await supabaseService.getAllCompanies();
    const plans = await supabaseService.getAllPlans();

    const enriched = subscriptions.map(sub => {
      const comp = companies.find(compItem => compItem.id === sub.companyId) || db.companies.find(compItem => compItem.id === sub.companyId);
      const plan = plans.find(p => p.id === sub.planId) || db.plans.find(p => p.id === sub.planId);
      return {
        ...sub,
        companyName: comp?.tradeName || comp?.name || 'Empresa Desconhecida',
        cnpj: comp?.cnpj,
        planName: plan?.name || 'Plano Personalizado',
      };
    });

    return c.json(enriched);
  } catch (error) {
    console.error('[HonoAdmin] GET /assinaturas error:', error);
    return c.json({ error: 'Erro ao listar assinaturas.' }, 500);
  }
});

honoAdmin.put('/assinaturas/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json().catch(() => ({}));
    const { status, currentPeriodEnd, amount, autoRenew } = body;

    const updated = await supabaseService.updateSubscription(id, {
      status,
      currentPeriodEnd,
      amount: amount !== undefined ? Number(amount) : undefined,
      autoRenew: autoRenew !== undefined ? Boolean(autoRenew) : undefined,
    });

    return c.json(updated);
  } catch (error) {
    console.error('[HonoAdmin] PUT /assinaturas/:id error:', error);
    return c.json({ error: 'Erro ao atualizar assinatura.' }, 500);
  }
});

honoAdmin.get('/pagamentos', async (c) => {
  try {
    let payments = await supabaseService.getAllPayments();
    if (payments.length === 0) payments = db.payments;

    const companies = await supabaseService.getAllCompanies();

    const enriched = payments.map(p => {
      const comp = companies.find(compItem => compItem.id === p.companyId) || db.companies.find(compItem => compItem.id === p.companyId);
      return {
        ...p,
        companyName: comp?.tradeName || comp?.name || 'Empresa Desconhecida',
        cnpj: comp?.cnpj,
      };
    });

    return c.json(enriched);
  } catch (error) {
    console.error('[HonoAdmin] GET /pagamentos error:', error);
    return c.json({ error: 'Erro ao listar pagamentos.' }, 500);
  }
});

// ==========================================
// 6. SUPORTE GLOBAL
// ==========================================
honoAdmin.get('/suporte', async (c) => {
  try {
    let tickets = await supabaseService.getSupportTickets();
    if (tickets.length === 0) tickets = db.supportTickets;
    return c.json(tickets);
  } catch (error) {
    console.error('[HonoAdmin] GET /suporte error:', error);
    return c.json({ error: 'Erro ao listar chamados.' }, 500);
  }
});

honoAdmin.put('/suporte/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json().catch(() => ({}));
    const { status, priority, assignedTo } = body;

    const updated = await supabaseService.updateSupportTicket(id, {
      status,
      priority,
      assignedTo,
      closedAt: (status === 'CLOSED' || status === 'RESOLVED') ? new Date().toISOString() : undefined,
    });

    return c.json(updated);
  } catch (error) {
    console.error('[HonoAdmin] PUT /suporte/:id error:', error);
    return c.json({ error: 'Erro ao atualizar chamado.' }, 500);
  }
});

honoAdmin.post('/suporte/:id/messages', async (c) => {
  try {
    const id = c.req.param('id');
    const user = c.get('user')!;
    const body = await c.req.json().catch(() => ({}));
    const { message } = body;

    if (!message) {
      return c.json({ error: 'Mensagem não pode ser vazia.' }, 400);
    }

    const ticket = await supabaseService.getTicketById(id);
    if (!ticket) {
      return c.json({ error: 'Chamado não encontrado.' }, 404);
    }

    const newMsg = await supabaseService.createSupportMessage(id, {
      userId: user.id,
      senderType: 'SUPPORT_AGENT',
      message: String(message).trim(),
    });

    await supabaseService.updateSupportTicket(id, { status: 'WAITING_CLIENT' });
    return c.json(newMsg, 201);
  } catch (error) {
    console.error('[HonoAdmin] POST /suporte/:id/messages error:', error);
    return c.json({ error: 'Erro ao responder chamado.' }, 500);
  }
});

// ==========================================
// 7. CAMPANHAS GLOBAIS & AUDITORIA
// ==========================================
honoAdmin.get('/campanhas', async (c) => {
  try {
    let campaigns = await supabaseService.getAllCampaigns();
    if (campaigns.length === 0) campaigns = db.campaigns;

    const companies = await supabaseService.getAllCompanies();

    const enriched = campaigns.map(camp => {
      const comp = companies.find(cmp => cmp.id === camp.companyId) || db.companies.find(cmp => cmp.id === camp.companyId);
      return {
        ...camp,
        companyName: comp?.tradeName || comp?.name || 'Empresa',
      };
    });

    return c.json(enriched);
  } catch (error) {
    console.error('[HonoAdmin] GET /campanhas error:', error);
    return c.json({ error: 'Erro ao listar campanhas globais.' }, 500);
  }
});

honoAdmin.get('/logs', async (c) => {
  try {
    const companyId = c.req.query('companyId');
    const action = c.req.query('action');

    let logs = await supabaseService.getAuditLogs({
      companyId: companyId ? String(companyId) : undefined,
      action: action ? String(action) : undefined,
    });
    if (logs.length === 0 && !companyId && !action) {
      logs = db.auditLogs;
    }
    return c.json(logs);
  } catch (error) {
    console.error('[HonoAdmin] GET /logs error:', error);
    return c.json({ error: 'Erro ao obter logs de auditoria.' }, 500);
  }
});

// ==========================================
// 8. CONFIGURAÇÕES DA PLATAFORMA SYNTECH DC
// ==========================================
honoAdmin.get('/configuracoes', (c) => {
  return c.json({
    platformName: 'SYNTECH DC - Disparos Corporativos',
    environment: c.env?.NODE_ENV || 'production',
    metaApiVersion: 'v21.0',
    globalRateLimit: '500 mensagens / segundo',
    wabaConnected: true,
    cloudHealth: 'HEALTHY',
    maintenanceMode: false,
    databaseEngine: 'Supabase PostgreSQL Enterprise (Managed Cloud)',
    officialGateways: [
      { id: 'gw-01', name: 'Meta Cloud API Direct (Primary US-East)', status: 'ACTIVE', latency: '42ms', throughput: '99.98%' },
      { id: 'gw-02', name: 'Meta Cloud API Direct (Secondary SA-East/SP)', status: 'ACTIVE', latency: '18ms', throughput: '99.99%' },
      { id: 'gw-03', name: 'Z-API / BSP Fallback Enterprise', status: 'STANDBY', latency: '110ms', throughput: '99.85%' },
    ],
  });
});
