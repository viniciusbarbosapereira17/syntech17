import { Router, Response } from 'express';
import { supabaseService } from '../db/supabaseService.js';
import { db } from '../db/store.js';
import { AuthenticatedRequest, authMiddleware, requireAdmin } from '../middleware/auth.js';
import { Company, User, Plan, Subscription, SupportMessage } from '../../shared/types.js';

export const adminRouter = Router();

// Apply auth and admin check
adminRouter.use(authMiddleware);
adminRouter.use(requireAdmin);

// ==========================================
// 1. ADMIN DASHBOARD
// ==========================================
adminRouter.get('/dashboard', async (req: AuthenticatedRequest, res: Response) => {
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
    const activeClients = companies.filter(c => c.status === 'ACTIVE').length;
    const trialClients = companies.filter(c => c.status === 'TRIAL').length;
    const suspendedClients = companies.filter(c => c.status === 'SUSPENDED' || c.status === 'BLOCKED').length;

    const activeSubscriptions = subscriptions.filter(s => s.status === 'ACTIVE').length;
    
    // Calculate total monthly recurring revenue (MRR)
    const mrr = subscriptions
      .filter(s => s.status === 'ACTIVE' || s.status === 'TRIAL')
      .reduce((acc, curr) => acc + (curr.amount || 0), 0);

    const openTickets = tickets.filter(t => t.status === 'OPEN' || t.status === 'IN_PROGRESS').length;
    const urgentTickets = tickets.filter(t => t.priority === 'URGENT' && t.status !== 'CLOSED' && t.status !== 'RESOLVED').length;

    const totalPlatformMessages = campaigns.reduce((acc, c) => acc + (c.processedCount || 0), 0);
    const runningCampaigns = campaigns.filter(c => c.status === 'RUNNING').length;

    const recentActivity = (await supabaseService.getAuditLogs()).slice(0, 8);
    const recentTickets = tickets.slice(0, 5);

    return res.json({
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
      companiesList: companies.map(c => ({
        id: c.id,
        name: c.name,
        tradeName: c.tradeName,
        cnpj: c.cnpj,
        status: c.status,
        plan: plans.find(p => p.id === c.planId)?.name || 'Personalizado',
        usedQuota: c.usedQuota,
        monthlyQuota: c.monthlyQuota,
        createdAt: c.createdAt,
      })),
      recentActivity: recentActivity.length > 0 ? recentActivity : db.auditLogs.slice(0, 8),
      recentTickets,
      recentCampaigns: campaigns.slice(0, 5),
    });
  } catch (error) {
    console.error('[AdminRoutes] /dashboard error:', error);
    return res.status(500).json({ error: 'Erro ao obter dados do dashboard administrativo.' });
  }
});

// ==========================================
// 2. CLIENTES (Tenants Management)
// ==========================================
adminRouter.get('/clientes', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { status, search } = req.query;
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
      const campaignsCount = allCampaigns.filter(c => c.companyId === company.id).length;

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

    return res.json(enriched);
  } catch (error) {
    console.error('[AdminRoutes] GET /clientes error:', error);
    return res.status(500).json({ error: 'Erro ao listar clientes.' });
  }
});

adminRouter.post('/clientes', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, tradeName, cnpj, email, phone, planId, status, monthlyQuota, contactLimit, adminName, adminEmail } = req.body;

    if (!name || !cnpj || !adminEmail || !adminName) {
      return res.status(400).json({ error: 'Razão Social, CNPJ, Nome e E-mail do Administrador são obrigatórios.' });
    }

    const plan = await supabaseService.getPlanById(planId || 'plan-starter') || db.plans[0];
    const companyId = `comp_${Date.now()}`;
    const userId = `usr_${Date.now()}`;

    const newCompany = await supabaseService.createCompany({
      id: companyId,
      name: name.trim(),
      tradeName: tradeName?.trim() || name.trim(),
      cnpj: cnpj.trim(),
      email: email?.trim() || adminEmail.trim(),
      phone: phone?.trim() || '+55 11 99999-0000',
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
      name: adminName.trim(),
      email: adminEmail.trim(),
      role: 'CLIENT_ADMIN',
      phone: phone?.trim(),
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
      userId: req.user!.id,
      userEmail: req.user!.email,
      action: 'ADMIN_CREATE_COMPANY',
      resource: 'Companies',
      resourceId: companyId,
      details: `Empresa "${name}" (CNPJ: ${cnpj}) cadastrada manualmente pelo administrador.`,
      ipAddress: req.ip || '127.0.0.1',
    });

    return res.status(201).json(newCompany);
  } catch (error) {
    console.error('[AdminRoutes] POST /clientes error:', error);
    return res.status(500).json({ error: 'Erro ao cadastrar empresa.' });
  }
});

adminRouter.put('/clientes/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name, tradeName, cnpj, email, phone, status, planId, monthlyQuota, usedQuota, contactLimit, senderPhone, senderVerified } = req.body;

    const company = await supabaseService.getCompanyById(id);
    if (!company) {
      return res.status(404).json({ error: 'Empresa não encontrada.' });
    }

    const updated = await supabaseService.updateCompany(id, {
      name: name?.trim(),
      tradeName: tradeName?.trim(),
      cnpj: cnpj?.trim(),
      email: email?.trim(),
      phone: phone?.trim(),
      status,
      planId,
      monthlyQuota: monthlyQuota !== undefined ? Number(monthlyQuota) : undefined,
      usedQuota: usedQuota !== undefined ? Number(usedQuota) : undefined,
      contactLimit: contactLimit !== undefined ? Number(contactLimit) : undefined,
      senderPhone: senderPhone?.trim(),
      senderVerified: senderVerified !== undefined ? Boolean(senderVerified) : undefined,
    });

    // Update corresponding subscription status if company status changed
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
      userId: req.user!.id,
      userEmail: req.user!.email,
      action: 'ADMIN_UPDATE_COMPANY',
      resource: 'Companies',
      resourceId: id,
      details: `Configurações da empresa ${company.name} atualizadas pelo administrador.`,
      ipAddress: req.ip || '127.0.0.1',
    });

    return res.json(updated || company);
  } catch (error) {
    console.error('[AdminRoutes] PUT /clientes/:id error:', error);
    return res.status(500).json({ error: 'Erro ao atualizar cliente.' });
  }
});

adminRouter.post('/clientes/:id/reset-access', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const company = await supabaseService.getCompanyById(id);
    if (!company) {
      return res.status(404).json({ error: 'Empresa não encontrada.' });
    }

    const users = await supabaseService.getAllUsers(id);
    const adminUser = users.find(u => u.role === 'CLIENT_ADMIN') || users[0];

    const resetToken = `rst_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const resetLink = `https://syntechdc.com.br/redefinir-senha?token=${resetToken}`;

    await supabaseService.createAuditLog({
      userId: req.user!.id,
      userEmail: req.user!.email,
      action: 'ADMIN_RESET_PASSWORD',
      resource: 'Users',
      resourceId: adminUser?.id,
      details: `Link de redefinição de credenciais gerado para o cliente ${company.name} (${adminUser?.email}).`,
      ipAddress: req.ip || '127.0.0.1',
    });

    return res.json({
      message: `Link de redefinição gerado com sucesso para ${adminUser?.email || company.email}.`,
      resetLink,
    });
  } catch (error) {
    console.error('[AdminRoutes] reset-access error:', error);
    return res.status(500).json({ error: 'Erro ao resetar acesso.' });
  }
});

// ==========================================
// 3. USUÁRIOS (Internal Staff & Client Users)
// ==========================================
adminRouter.get('/usuarios', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { role, search, companyId } = req.query;
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
      const comp = companies.find(c => c.id === user.companyId) || db.companies.find(c => c.id === user.companyId);
      return {
        ...user,
        companyName: comp?.tradeName || comp?.name || (user.role.startsWith('CLIENT') ? 'Empresa Desconhecida' : 'SYNTECH DC (Interno)'),
      };
    });

    return res.json(enriched);
  } catch (error) {
    console.error('[AdminRoutes] GET /usuarios error:', error);
    return res.status(500).json({ error: 'Erro ao listar usuários.' });
  }
});

adminRouter.post('/usuarios', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, email, role, phone, companyId, isActive } = req.body;

    if (!name || !email || !role) {
      return res.status(400).json({ error: 'Nome, e-mail e cargo são obrigatórios.' });
    }

    const newUser = await supabaseService.createUser({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      role: role as any,
      phone: phone?.trim(),
      companyId: role.startsWith('CLIENT') ? (companyId || req.companyId) : undefined,
      isActive: isActive !== false,
    });

    return res.status(201).json(newUser);
  } catch (error) {
    console.error('[AdminRoutes] POST /usuarios error:', error);
    return res.status(500).json({ error: 'Erro ao cadastrar usuário.' });
  }
});

adminRouter.put('/usuarios/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name, role, phone, isActive, avatarUrl } = req.body;

    const user = await supabaseService.findUserById(id);
    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }

    const updated = await supabaseService.updateUser(id, {
      name: name?.trim(),
      role: role as any,
      phone: phone !== undefined ? phone?.trim() : undefined,
      isActive: isActive !== undefined ? Boolean(isActive) : undefined,
      avatarUrl: avatarUrl !== undefined ? avatarUrl : undefined,
    });

    return res.json(updated || user);
  } catch (error) {
    console.error('[AdminRoutes] PUT /usuarios/:id error:', error);
    return res.status(500).json({ error: 'Erro ao atualizar usuário.' });
  }
});

// ==========================================
// 4. PLANOS (Plans Management)
// ==========================================
adminRouter.get('/planos', async (req: AuthenticatedRequest, res: Response) => {
  try {
    let plans = await supabaseService.getAllPlans();
    if (plans.length === 0) plans = db.plans;
    return res.json(plans);
  } catch (error) {
    console.error('[AdminRoutes] GET /planos error:', error);
    return res.status(500).json({ error: 'Erro ao listar planos.' });
  }
});

adminRouter.post('/planos', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, slug, description, price, interval, messageQuota, contactLimit, maxSenders, features, isPublic } = req.body;

    if (!name || !price || !messageQuota) {
      return res.status(400).json({ error: 'Nome, preço e cota de mensagens são obrigatórios.' });
    }

    const newPlan = await supabaseService.createPlan({
      name: name.trim(),
      slug: slug || name.toLowerCase().replace(/\s+/g, '-'),
      description: description?.trim() || '',
      price: Number(price),
      interval: interval || 'MONTHLY',
      messageQuota: Number(messageQuota),
      contactLimit: Number(contactLimit) || 50000,
      maxSenders: Number(maxSenders) || 1,
      features: Array.isArray(features) ? features : [],
      isPublic: isPublic !== false,
    });

    return res.status(201).json(newPlan);
  } catch (error) {
    console.error('[AdminRoutes] POST /planos error:', error);
    return res.status(500).json({ error: 'Erro ao criar plano.' });
  }
});

adminRouter.put('/planos/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const plan = await supabaseService.getPlanById(id);
    if (!plan) {
      return res.status(404).json({ error: 'Plano não encontrado.' });
    }

    const { name, description, price, messageQuota, contactLimit, maxSenders, features, isPublic, isPopular } = req.body;

    const updated = await supabaseService.updatePlan(id, {
      name: name?.trim(),
      description,
      price: price !== undefined ? Number(price) : undefined,
      messageQuota: messageQuota !== undefined ? Number(messageQuota) : undefined,
      contactLimit: contactLimit !== undefined ? Number(contactLimit) : undefined,
      maxSenders: maxSenders !== undefined ? Number(maxSenders) : undefined,
      features,
      isPublic: isPublic !== undefined ? Boolean(isPublic) : undefined,
      isPopular: isPopular !== undefined ? Boolean(isPopular) : undefined,
    });

    return res.json(updated || plan);
  } catch (error) {
    console.error('[AdminRoutes] PUT /planos/:id error:', error);
    return res.status(500).json({ error: 'Erro ao atualizar plano.' });
  }
});

// ==========================================
// 5. ASSINATURAS & PAGAMENTOS
// ==========================================
adminRouter.get('/assinaturas', async (req: AuthenticatedRequest, res: Response) => {
  try {
    let subscriptions = await supabaseService.getAllSubscriptions();
    if (subscriptions.length === 0) subscriptions = db.subscriptions;

    const companies = await supabaseService.getAllCompanies();
    const plans = await supabaseService.getAllPlans();

    const enriched = subscriptions.map(sub => {
      const comp = companies.find(c => c.id === sub.companyId) || db.companies.find(c => c.id === sub.companyId);
      const plan = plans.find(p => p.id === sub.planId) || db.plans.find(p => p.id === sub.planId);
      return {
        ...sub,
        companyName: comp?.tradeName || comp?.name || 'Empresa Desconhecida',
        cnpj: comp?.cnpj,
        planName: plan?.name || 'Plano Personalizado',
      };
    });

    return res.json(enriched);
  } catch (error) {
    console.error('[AdminRoutes] GET /assinaturas error:', error);
    return res.status(500).json({ error: 'Erro ao listar assinaturas.' });
  }
});

adminRouter.put('/assinaturas/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status, currentPeriodEnd, amount, autoRenew } = req.body;

    const updated = await supabaseService.updateSubscription(id, {
      status,
      currentPeriodEnd,
      amount: amount !== undefined ? Number(amount) : undefined,
      autoRenew: autoRenew !== undefined ? Boolean(autoRenew) : undefined,
    });

    return res.json(updated);
  } catch (error) {
    console.error('[AdminRoutes] PUT /assinaturas/:id error:', error);
    return res.status(500).json({ error: 'Erro ao atualizar assinatura.' });
  }
});

adminRouter.get('/pagamentos', async (req: AuthenticatedRequest, res: Response) => {
  try {
    let payments = await supabaseService.getAllPayments();
    if (payments.length === 0) payments = db.payments;

    const companies = await supabaseService.getAllCompanies();

    const enriched = payments.map(p => {
      const comp = companies.find(c => c.id === p.companyId) || db.companies.find(c => c.id === p.companyId);
      return {
        ...p,
        companyName: comp?.tradeName || comp?.name || 'Empresa Desconhecida',
        cnpj: comp?.cnpj,
      };
    });

    return res.json(enriched);
  } catch (error) {
    console.error('[AdminRoutes] GET /pagamentos error:', error);
    return res.status(500).json({ error: 'Erro ao listar pagamentos.' });
  }
});

// ==========================================
// 6. SUPORTE GLOBAL (Syntech Helpdesk)
// ==========================================
adminRouter.get('/suporte', async (req: AuthenticatedRequest, res: Response) => {
  try {
    let tickets = await supabaseService.getSupportTickets();
    if (tickets.length === 0) tickets = db.supportTickets;
    return res.json(tickets);
  } catch (error) {
    console.error('[AdminRoutes] GET /suporte error:', error);
    return res.status(500).json({ error: 'Erro ao listar chamados.' });
  }
});

adminRouter.put('/suporte/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status, priority, assignedTo } = req.body;

    const updated = await supabaseService.updateSupportTicket(id, {
      status,
      priority,
      assignedTo,
      closedAt: (status === 'CLOSED' || status === 'RESOLVED') ? new Date().toISOString() : undefined,
    });

    return res.json(updated);
  } catch (error) {
    console.error('[AdminRoutes] PUT /suporte/:id error:', error);
    return res.status(500).json({ error: 'Erro ao atualizar chamado.' });
  }
});

adminRouter.post('/suporte/:id/messages', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Mensagem não pode ser vazia.' });
    }

    const ticket = await supabaseService.getTicketById(id);
    if (!ticket) {
      return res.status(404).json({ error: 'Chamado não encontrado.' });
    }

    const newMsg = await supabaseService.createSupportMessage(id, {
      userId: req.user!.id,
      senderType: 'SUPPORT_AGENT',
      message: message.trim(),
    });

    await supabaseService.updateSupportTicket(id, { status: 'WAITING_CLIENT' });
    return res.status(201).json(newMsg);
  } catch (error) {
    console.error('[AdminRoutes] POST /suporte/:id/messages error:', error);
    return res.status(500).json({ error: 'Erro ao responder chamado.' });
  }
});

// ==========================================
// 7. CAMPANHAS GLOBAIS & AUDITORIA
// ==========================================
adminRouter.get('/campanhas', async (req: AuthenticatedRequest, res: Response) => {
  try {
    let campaigns = await supabaseService.getAllCampaigns();
    if (campaigns.length === 0) campaigns = db.campaigns;

    const companies = await supabaseService.getAllCompanies();

    const enriched = campaigns.map(c => {
      const comp = companies.find(cmp => cmp.id === c.companyId) || db.companies.find(cmp => cmp.id === c.companyId);
      return {
        ...c,
        companyName: comp?.tradeName || comp?.name || 'Empresa',
      };
    });

    return res.json(enriched);
  } catch (error) {
    console.error('[AdminRoutes] GET /campanhas error:', error);
    return res.status(500).json({ error: 'Erro ao listar campanhas globais.' });
  }
});

adminRouter.get('/logs', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { companyId, action } = req.query;
    let logs = await supabaseService.getAuditLogs({
      companyId: companyId ? String(companyId) : undefined,
      action: action ? String(action) : undefined,
    });
    if (logs.length === 0 && !companyId && !action) {
      logs = db.auditLogs;
    }
    return res.json(logs);
  } catch (error) {
    console.error('[AdminRoutes] GET /logs error:', error);
    return res.status(500).json({ error: 'Erro ao obter logs de auditoria.' });
  }
});

// ==========================================
// 8. CONFIGURAÇÕES DA PLATAFORMA SYNTECH DC
// ==========================================
adminRouter.get('/configuracoes', (req: AuthenticatedRequest, res: Response) => {
  return res.json({
    platformName: 'SYNTECH DC - Disparos Corporativos',
    environment: process.env.NODE_ENV || 'production',
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
