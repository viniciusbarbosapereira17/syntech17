import { Router, Response } from 'express';
import { supabaseService } from '../db/supabaseService.js';
import { db } from '../db/store.js';
import { AuthenticatedRequest, authMiddleware } from '../middleware/auth.js';
import { 
  Contact, 
  ContactList, 
  Template, 
  Message, 
  Campaign, 
  CampaignContact, 
  SupportTicket, 
  SupportMessage, 
  BlacklistEntry,
  Integration
} from '../../shared/types.js';
import { SyntechOfficialWhatsAppProvider } from '../providers/MessageProvider.js';

export const clientRouter = Router();

// Apply auth to all client routes
clientRouter.use(authMiddleware);

// ==========================================
// 1. DASHBOARD
// ==========================================
clientRouter.get('/dashboard', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const companyId = req.companyId!;

    let company = await supabaseService.getCompanyById(companyId);
    if (!company) {
      company = db.companies.find(c => c.id === companyId) || null;
    }

    let subscription = await supabaseService.getSubscriptionByCompany(companyId);
    if (!subscription) {
      subscription = db.subscriptions.find(s => s.companyId === companyId) || null;
    }

    let plan = company?.planId ? await supabaseService.getPlanById(company.planId) : null;
    if (!plan && company?.planId) {
      plan = db.plans.find(p => p.id === company?.planId) || null;
    }

    const contacts = await supabaseService.getContacts(companyId);
    const campaigns = await supabaseService.getCampaigns(companyId);
    const tickets = await supabaseService.getSupportTickets(companyId);

    const totalContacts = contacts.length || company?.contactCount || 0;
    const activeCampaigns = campaigns.filter(c => c.status === 'RUNNING' || c.status === 'SCHEDULED').length;
    
    let totalSent = 0;
    let totalFailed = 0;
    let totalPending = 0;
    let totalProcessed = 0;

    campaigns.forEach(c => {
      totalSent += c.successCount || 0;
      totalFailed += c.failedCount || 0;
      totalPending += c.pendingCount || 0;
      totalProcessed += c.processedCount || 0;
    });

    const recentCampaigns = campaigns
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5);

    const openTickets = tickets.filter(t => t.status === 'OPEN' || t.status === 'IN_PROGRESS');

    return res.json({
      company,
      subscription,
      plan,
      metrics: {
        totalContacts,
        activeCampaigns,
        totalCampaigns: campaigns.length,
        totalSent,
        totalFailed,
        totalPending,
        totalProcessed,
        successRate: totalProcessed > 0 ? ((totalSent / totalProcessed) * 100).toFixed(1) : '100',
        monthlyQuota: company?.monthlyQuota || 50000,
        usedQuota: company?.usedQuota || 0,
        remainingQuota: Math.max(0, (company?.monthlyQuota || 50000) - (company?.usedQuota || 0)),
        expirationDate: subscription?.currentPeriodEnd,
        subscriptionStatus: subscription?.status || 'ACTIVE',
      },
      recentCampaigns,
      openTickets,
    });
  } catch (error) {
    console.error('[ClientRoutes] /dashboard error:', error);
    return res.status(500).json({ error: 'Erro ao carregar dados do dashboard.' });
  }
});

// ==========================================
// 2. CONTACTS (CRUD, Filters, Import)
// ==========================================
clientRouter.get('/contacts', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const companyId = req.companyId!;
    const { search, tag, listId } = req.query;

    const contacts = await supabaseService.getContacts(companyId, {
      search: search ? String(search) : undefined,
      tag: tag ? String(tag) : undefined,
      listId: listId ? String(listId) : undefined,
    });

    return res.json({
      total: contacts.length,
      contacts,
    });
  } catch (error) {
    console.error('[ClientRoutes] GET /contacts error:', error);
    return res.status(500).json({ error: 'Erro ao listar contatos.' });
  }
});

clientRouter.post('/contacts', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const companyId = req.companyId!;
    const { name, phone, email, store, city, product, tags, listIds, customAttributes } = req.body;

    if (!name || !phone) {
      return res.status(400).json({ error: 'Nome e telefone são obrigatórios.' });
    }

    // Format phone (+55...)
    let cleanPhone = phone.replace(/\D/g, '');
    if (!cleanPhone.startsWith('55') && cleanPhone.length >= 10) {
      cleanPhone = `55${cleanPhone}`;
    }
    const formattedPhone = `+${cleanPhone}`;

    // Check blacklist
    const blacklist = await supabaseService.getBlacklist(companyId);
    const isBlacklisted = blacklist.some(b => b.phone.replace(/\D/g, '') === cleanPhone);

    const newContact = await supabaseService.createContact(companyId, {
      name: name.trim(),
      phone: formattedPhone,
      email: email?.trim(),
      store: store?.trim(),
      city: city?.trim(),
      product: product?.trim(),
      tags: Array.isArray(tags) ? tags : (tags ? [tags] : []),
      listIds: Array.isArray(listIds) ? listIds : (listIds ? [listIds] : []),
      customAttributes: customAttributes || {},
      isBlacklisted,
    });

    if (!newContact) {
      return res.status(500).json({ error: 'Falha ao salvar contato no banco de dados.' });
    }

    // Update company contact count
    const allContacts = await supabaseService.getContacts(companyId);
    await supabaseService.updateCompany(companyId, { contactCount: allContacts.length });

    return res.status(201).json(newContact);
  } catch (error) {
    console.error('[ClientRoutes] POST /contacts error:', error);
    return res.status(500).json({ error: 'Erro ao cadastrar contato.' });
  }
});

clientRouter.put('/contacts/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const companyId = req.companyId!;
    const { id } = req.params;
    const { name, phone, email, store, city, product, tags, isBlacklisted, customAttributes } = req.body;

    const existing = await supabaseService.getContactById(companyId, id);
    if (!existing) {
      return res.status(404).json({ error: 'Contato não encontrado.' });
    }

    const updated = await supabaseService.updateContact(companyId, id, {
      name: name?.trim(),
      phone: phone?.trim(),
      email: email !== undefined ? email?.trim() : undefined,
      store: store !== undefined ? store?.trim() : undefined,
      city: city !== undefined ? city?.trim() : undefined,
      product: product !== undefined ? product?.trim() : undefined,
      tags: Array.isArray(tags) ? tags : undefined,
      isBlacklisted: isBlacklisted !== undefined ? Boolean(isBlacklisted) : undefined,
      customAttributes: customAttributes !== undefined ? customAttributes : undefined,
    });

    return res.json(updated || existing);
  } catch (error) {
    console.error('[ClientRoutes] PUT /contacts/:id error:', error);
    return res.status(500).json({ error: 'Erro ao atualizar contato.' });
  }
});

clientRouter.delete('/contacts/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const companyId = req.companyId!;
    const { id } = req.params;

    const deleted = await supabaseService.deleteContact(companyId, id);
    if (!deleted) {
      // Check store fallback
      const idx = db.contacts.findIndex(c => c.id === id && c.companyId === companyId);
      if (idx !== -1) {
        db.contacts.splice(idx, 1);
      }
    }

    return res.json({ message: 'Contato excluído com sucesso.' });
  } catch (error) {
    console.error('[ClientRoutes] DELETE /contacts/:id error:', error);
    return res.status(500).json({ error: 'Erro ao remover contato.' });
  }
});

clientRouter.post('/contacts/import', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const companyId = req.companyId!;
    const { contacts, listIds, defaultTags } = req.body;

    if (!Array.isArray(contacts) || contacts.length === 0) {
      return res.status(400).json({ error: 'Lista de contatos vazia ou inválida.' });
    }

    let importedCount = 0;
    let duplicateCount = 0;
    const blacklist = await supabaseService.getBlacklist(companyId);
    const existingList = await supabaseService.getContacts(companyId);
    const existingPhoneSet = new Set(existingList.map(c => c.phone.replace(/\D/g, '')));

    for (const raw of contacts) {
      if (!raw.phone || !raw.name) continue;

      let cleanPhone = String(raw.phone).replace(/\D/g, '');
      if (!cleanPhone.startsWith('55') && cleanPhone.length >= 10) {
        cleanPhone = `55${cleanPhone}`;
      }
      const formattedPhone = `+${cleanPhone}`;

      if (existingPhoneSet.has(cleanPhone)) {
        duplicateCount++;
        continue;
      }

      const isBlacklisted = blacklist.some(b => b.phone.replace(/\D/g, '') === cleanPhone);

      const contactItem: Partial<Contact> = {
        name: String(raw.name).trim(),
        phone: formattedPhone,
        email: raw.email ? String(raw.email).trim() : undefined,
        store: raw.store ? String(raw.store).trim() : (raw.loja ? String(raw.loja).trim() : undefined),
        city: raw.city ? String(raw.city).trim() : (raw.cidade ? String(raw.cidade).trim() : undefined),
        product: raw.product ? String(raw.product).trim() : (raw.produto ? String(raw.produto).trim() : undefined),
        tags: Array.isArray(raw.tags) ? raw.tags : (defaultTags || ['Importação CSV']),
        listIds: Array.isArray(listIds) ? listIds : [],
        isBlacklisted,
      };

      await supabaseService.createContact(companyId, contactItem);
      existingPhoneSet.add(cleanPhone);
      importedCount++;
    }

    // Update list counter if target list provided
    if (listIds && Array.isArray(listIds)) {
      for (const lid of listIds) {
        const listObj = await supabaseService.getListById(companyId, lid);
        if (listObj) {
          await supabaseService.updateContactList(companyId, lid, {
            contactCount: (listObj.contactCount || 0) + importedCount,
          });
        }
      }
    }

    // Audit log
    await supabaseService.createAuditLog({
      companyId,
      userId: req.user!.id,
      userEmail: req.user!.email,
      action: 'CONTACTS_IMPORTED',
      resource: 'Contacts',
      details: `Importação em massa finalizada: ${importedCount} importados, ${duplicateCount} duplicados ignorados.`,
      ipAddress: req.ip || '127.0.0.1',
    });

    return res.json({
      message: 'Importação concluída com sucesso.',
      imported: importedCount,
      duplicates: duplicateCount,
      totalProcessed: contacts.length,
    });
  } catch (error) {
    console.error('[ClientRoutes] /contacts/import error:', error);
    return res.status(500).json({ error: 'Erro ao importar contatos.' });
  }
});

// ==========================================
// 3. CONTACT LISTS (Segmentations)
// ==========================================
clientRouter.get('/lists', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const companyId = req.companyId!;
    const lists = await supabaseService.getContactLists(companyId);
    return res.json(lists);
  } catch (error) {
    console.error('[ClientRoutes] GET /lists error:', error);
    return res.status(500).json({ error: 'Erro ao obter listas.' });
  }
});

clientRouter.post('/lists', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const companyId = req.companyId!;
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Nome da lista é obrigatório.' });
    }

    const newList = await supabaseService.createContactList(companyId, {
      name: name.trim(),
      description: description?.trim() || '',
      contactCount: 0,
    });

    return res.status(201).json(newList);
  } catch (error) {
    console.error('[ClientRoutes] POST /lists error:', error);
    return res.status(500).json({ error: 'Erro ao criar lista.' });
  }
});

clientRouter.put('/lists/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const companyId = req.companyId!;
    const { id } = req.params;
    const { name, description } = req.body;

    const list = await supabaseService.getListById(companyId, id);
    if (!list) {
      return res.status(404).json({ error: 'Lista não encontrada.' });
    }

    const updated = await supabaseService.updateContactList(companyId, id, {
      name: name?.trim(),
      description: description !== undefined ? description?.trim() : undefined,
    });

    return res.json(updated || list);
  } catch (error) {
    console.error('[ClientRoutes] PUT /lists/:id error:', error);
    return res.status(500).json({ error: 'Erro ao atualizar lista.' });
  }
});

clientRouter.delete('/lists/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const companyId = req.companyId!;
    const { id } = req.params;

    await supabaseService.deleteContactList(companyId, id);
    return res.json({ message: 'Lista removida com sucesso.' });
  } catch (error) {
    console.error('[ClientRoutes] DELETE /lists/:id error:', error);
    return res.status(500).json({ error: 'Erro ao remover lista.' });
  }
});

// ==========================================
// 4. TEMPLATES (WhatsApp HSM Approved)
// ==========================================
clientRouter.get('/templates', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const companyId = req.companyId!;
    const templates = await supabaseService.getTemplates(companyId);
    return res.json(templates);
  } catch (error) {
    console.error('[ClientRoutes] GET /templates error:', error);
    return res.status(500).json({ error: 'Erro ao listar templates.' });
  }
});

clientRouter.post('/templates', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const companyId = req.companyId!;
    const { name, category, content } = req.body;

    if (!name || !content) {
      return res.status(400).json({ error: 'Nome e conteúdo do template são obrigatórios.' });
    }

    // Extract dynamic variables like {nome}, {loja}
    const varMatches = content.match(/\{([a-zA-Z0-9_]+)\}/g) || [];
    const variables: string[] = Array.from(new Set(varMatches.map((v: string) => v.replace(/[{}]/g, ''))));

    const newTemplate = await supabaseService.createTemplate(companyId, {
      name: name.trim(),
      category: category || 'MARKETING',
      content: content.trim(),
      variables,
      status: 'APPROVED',
    });

    return res.status(201).json(newTemplate);
  } catch (error) {
    console.error('[ClientRoutes] POST /templates error:', error);
    return res.status(500).json({ error: 'Erro ao criar template.' });
  }
});

clientRouter.delete('/templates/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const companyId = req.companyId!;
    const { id } = req.params;

    await supabaseService.deleteTemplate(companyId, id);
    return res.json({ message: 'Template removido com sucesso.' });
  } catch (error) {
    console.error('[ClientRoutes] DELETE /templates/:id error:', error);
    return res.status(500).json({ error: 'Erro ao remover template.' });
  }
});

// ==========================================
// 5. MESSAGES (Library & Custom Messages)
// ==========================================
clientRouter.get('/messages', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const companyId = req.companyId!;
    const messages = await supabaseService.getMessages(companyId);
    return res.json(messages);
  } catch (error) {
    console.error('[ClientRoutes] GET /messages error:', error);
    return res.status(500).json({ error: 'Erro ao listar mensagens.' });
  }
});

clientRouter.post('/messages', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const companyId = req.companyId!;
    const { title, content, templateId, mediaUrl, messageType } = req.body;

    if (!title || !content) {
      return res.status(400).json({ error: 'Título e conteúdo são obrigatórios.' });
    }

    const varMatches = content.match(/\{([a-zA-Z0-9_]+)\}/g) || [];
    const variables: string[] = Array.from(new Set(varMatches.map((v: string) => v.replace(/[{}]/g, ''))));

    const newMessage = await supabaseService.createMessage(companyId, {
      title: title.trim(),
      content: content.trim(),
      variables,
      templateId,
      mediaUrl,
      messageType: messageType || 'TEXT',
    });

    return res.status(201).json(newMessage);
  } catch (error) {
    console.error('[ClientRoutes] POST /messages error:', error);
    return res.status(500).json({ error: 'Erro ao salvar mensagem.' });
  }
});

clientRouter.post('/messages/preview', (req: AuthenticatedRequest, res: Response) => {
  const { content, sampleContact } = req.body;

  if (!content) {
    return res.status(400).json({ error: 'Conteúdo obrigatório.' });
  }

  const sample = sampleContact || {
    nome: 'Carlos Silva',
    empresa: 'FarmaVida Brasil',
    loja: 'Unidade Paulista',
    cidade: 'São Paulo',
    produto: 'Vitamina C + Zinco',
  };

  let rendered = content;
  Object.keys(sample).forEach(key => {
    const regex = new RegExp(`\\{${key}\\}`, 'gi');
    rendered = rendered.replace(regex, sample[key]);
  });

  return res.json({ rendered });
});

// ==========================================
// 6. CAMPAIGNS (Creation, Queue, Monitor)
// ==========================================
clientRouter.get('/campaigns', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const companyId = req.companyId!;
    const campaigns = await supabaseService.getCampaigns(companyId);
    return res.json(campaigns);
  } catch (error) {
    console.error('[ClientRoutes] GET /campaigns error:', error);
    return res.status(500).json({ error: 'Erro ao listar campanhas.' });
  }
});

clientRouter.get('/campaigns/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const companyId = req.companyId!;
    const { id } = req.params;

    const campaign = await supabaseService.getCampaignById(companyId, id);
    if (!campaign) {
      return res.status(404).json({ error: 'Campanha não encontrada.' });
    }

    const message = await supabaseService.getMessageById(companyId, campaign.messageId);
    const campaignContacts = await supabaseService.getCampaignContacts(companyId, id);

    return res.json({
      campaign,
      message,
      contactsQueue: campaignContacts,
    });
  } catch (error) {
    console.error('[ClientRoutes] GET /campaigns/:id error:', error);
    return res.status(500).json({ error: 'Erro ao obter detalhes da campanha.' });
  }
});

clientRouter.post('/campaigns', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const companyId = req.companyId!;
    const { name, messageId, listIds, scheduledAt, settings, immediateDispatch } = req.body;

    if (!name || !messageId) {
      return res.status(400).json({ error: 'Nome da campanha e Mensagem são obrigatórios.' });
    }

    const company = await supabaseService.getCompanyById(companyId);
    const message = await supabaseService.getMessageById(companyId, messageId);

    if (!message) {
      return res.status(404).json({ error: 'Mensagem selecionada não foi encontrada.' });
    }

    // Determine target contacts
    let targetContacts: Contact[] = [];
    if (listIds && Array.isArray(listIds) && listIds.length > 0) {
      for (const lid of listIds) {
        const contactsInList = await supabaseService.getContacts(companyId, { listId: lid });
        targetContacts.push(...contactsInList);
      }
      // Deduplicate
      const uniqueMap = new Map();
      targetContacts.forEach(c => uniqueMap.set(c.id, c));
      targetContacts = Array.from(uniqueMap.values()).filter(c => !c.isBlacklisted);
    } else {
      const allContacts = await supabaseService.getContacts(companyId);
      targetContacts = allContacts.filter(c => !c.isBlacklisted);
    }

    if (targetContacts.length === 0) {
      return res.status(400).json({ error: 'Nenhum contato elegível encontrado para esta campanha.' });
    }

    // Check company quota
    const usedQuota = company?.usedQuota || 0;
    const monthlyQuota = company?.monthlyQuota || 50000;
    if (usedQuota + targetContacts.length > monthlyQuota) {
      return res.status(400).json({
        error: `Limite de cota excedido. A campanha requer ${targetContacts.length} envios, mas você só possui ${Math.max(0, monthlyQuota - usedQuota)} disponíveis.`,
      });
    }

    const total = targetContacts.length;
    const status = immediateDispatch ? 'RUNNING' : (scheduledAt ? 'SCHEDULED' : 'DRAFT');

    const newCampaign = await supabaseService.createCampaign(companyId, {
      name: name.trim(),
      messageId,
      listIds: Array.isArray(listIds) ? listIds : [],
      senderPhone: company?.senderPhone || '+55 11 99123-4567',
      status,
      scheduledAt: scheduledAt || undefined,
      startedAt: immediateDispatch ? new Date().toISOString() : undefined,
      totalContacts: total,
      processedCount: immediateDispatch ? total : 0,
      successCount: immediateDispatch ? Math.round(total * 0.98) : 0,
      failedCount: immediateDispatch ? Math.round(total * 0.02) : 0,
      pendingCount: immediateDispatch ? 0 : total,
      settings: settings || {
        messagesPerMinute: 60,
        retryOnFailure: true,
        maxRetries: 2,
        respectBusinessHours: true,
      },
    });

    if (!newCampaign) {
      return res.status(500).json({ error: 'Falha ao salvar campanha no Supabase.' });
    }

    // Update company quota
    if (immediateDispatch) {
      await supabaseService.updateCompany(companyId, {
        usedQuota: usedQuota + total,
      });
    }

    // Audit log
    await supabaseService.createAuditLog({
      companyId,
      userId: req.user!.id,
      userEmail: req.user!.email,
      action: 'CAMPAIGN_CREATED',
      resource: 'Campaigns',
      resourceId: newCampaign.id,
      details: `Campanha "${name}" criada com ${total} destinatários. Status: ${status}.`,
      ipAddress: req.ip || '127.0.0.1',
    });

    return res.status(201).json(newCampaign);
  } catch (error) {
    console.error('[ClientRoutes] POST /campaigns error:', error);
    return res.status(500).json({ error: 'Erro ao criar campanha.' });
  }
});

clientRouter.post('/campaigns/:id/action', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const companyId = req.companyId!;
    const { id } = req.params;
    const { action } = req.body;

    const campaign = await supabaseService.getCampaignById(companyId, id);
    if (!campaign) {
      return res.status(404).json({ error: 'Campanha não encontrada.' });
    }

    let updatedStatus = campaign.status;

    if (action === 'PAUSE') {
      updatedStatus = 'PAUSED';
    } else if (action === 'RESUME' || action === 'START') {
      updatedStatus = 'RUNNING';
    } else if (action === 'CANCEL') {
      updatedStatus = 'CANCELLED';
    }

    const updated = await supabaseService.updateCampaign(companyId, id, { status: updatedStatus });
    return res.json(updated || campaign);
  } catch (error) {
    console.error('[ClientRoutes] /campaigns/:id/action error:', error);
    return res.status(500).json({ error: 'Erro ao alterar status da campanha.' });
  }
});

// ==========================================
// 7. REPORTS & ANALYTICS
// ==========================================
clientRouter.get('/reports/summary', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const companyId = req.companyId!;
    const campaigns = await supabaseService.getCampaigns(companyId);

    let totalMessages = 0;
    let sentMessages = 0;
    let failedMessages = 0;

    campaigns.forEach(c => {
      totalMessages += c.processedCount || 0;
      sentMessages += c.successCount || 0;
      failedMessages += c.failedCount || 0;
    });

    const successRate = totalMessages > 0 ? ((sentMessages / totalMessages) * 100).toFixed(1) : '100';

    const campaignsSummary = campaigns.map(c => ({
      id: c.id,
      name: c.name,
      status: c.status,
      totalContacts: c.totalContacts,
      sentCount: c.successCount,
      failedCount: c.failedCount,
      successRate: c.processedCount > 0 ? ((c.successCount / c.processedCount) * 100).toFixed(1) : '100',
      createdAt: c.createdAt,
    }));

    return res.json({
      totalMessages,
      sentMessages,
      failedMessages,
      successRate,
      campaignsSummary,
    });
  } catch (error) {
    console.error('[ClientRoutes] /reports/summary error:', error);
    return res.status(500).json({ error: 'Erro ao gerar relatório.' });
  }
});

// ==========================================
// 8. SUBSCRIPTION & BILLING
// ==========================================
clientRouter.get('/subscription', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const companyId = req.companyId!;

    let company = await supabaseService.getCompanyById(companyId);
    let subscription = await supabaseService.getSubscriptionByCompany(companyId);
    let plan = company?.planId ? await supabaseService.getPlanById(company.planId) : null;
    const payments = await supabaseService.getPaymentsByCompany(companyId);
    const availablePlans = await supabaseService.getAllPlans();

    return res.json({
      company,
      subscription,
      plan: plan || availablePlans[0],
      payments,
      availablePlans: availablePlans.filter(p => p.isPublic),
    });
  } catch (error) {
    console.error('[ClientRoutes] GET /subscription error:', error);
    return res.status(500).json({ error: 'Erro ao carregar assinatura.' });
  }
});

clientRouter.post('/subscription/upgrade', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const companyId = req.companyId!;
    const { planId, paymentMethod } = req.body;

    const plan = await supabaseService.getPlanById(planId);
    if (!plan) {
      return res.status(404).json({ error: 'Plano não encontrado.' });
    }

    const now = new Date();
    const endDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    let subscription = await supabaseService.getSubscriptionByCompany(companyId);
    if (subscription) {
      subscription = await supabaseService.updateSubscription(subscription.id, {
        planId: plan.id,
        status: 'ACTIVE',
        amount: plan.price,
        currentPeriodEnd: endDate.toISOString(),
      });
    } else {
      subscription = await supabaseService.createSubscription({
        companyId,
        planId: plan.id,
        status: 'ACTIVE',
        amount: plan.price,
        currentPeriodStart: now.toISOString(),
        currentPeriodEnd: endDate.toISOString(),
      });
    }

    // Update company quota
    await supabaseService.updateCompany(companyId, {
      planId: plan.id,
      monthlyQuota: plan.messageQuota,
      contactLimit: plan.contactLimit,
      status: 'ACTIVE',
    });

    // Create payment receipt
    const newPayment = await supabaseService.createPayment({
      companyId,
      subscriptionId: subscription?.id,
      amount: plan.price,
      status: 'PAID',
      paymentMethod: paymentMethod || 'PIX',
      receiptNumber: `SYN-REC-${Date.now().toString().slice(-6)}`,
      paidAt: now.toISOString(),
      dueDate: now.toISOString(),
    });

    return res.json({
      message: `Upgrade para o ${plan.name} realizado com sucesso!`,
      plan,
      subscription,
      payment: newPayment,
    });
  } catch (error) {
    console.error('[ClientRoutes] /subscription/upgrade error:', error);
    return res.status(500).json({ error: 'Erro ao realizar upgrade de plano.' });
  }
});

// ==========================================
// 9. SUPPORT & HELP DESK
// ==========================================
clientRouter.get('/support/tickets', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const companyId = req.companyId!;
    const tickets = await supabaseService.getSupportTickets(companyId);
    return res.json(tickets);
  } catch (error) {
    console.error('[ClientRoutes] GET /support/tickets error:', error);
    return res.status(500).json({ error: 'Erro ao listar chamados.' });
  }
});

clientRouter.get('/support/tickets/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const ticket = await supabaseService.getTicketById(id);

    if (!ticket) {
      return res.status(404).json({ error: 'Chamado não encontrado.' });
    }

    const messages = await supabaseService.getSupportMessages(id);
    return res.json({ ticket, messages });
  } catch (error) {
    console.error('[ClientRoutes] GET /support/tickets/:id error:', error);
    return res.status(500).json({ error: 'Erro ao obter chamado.' });
  }
});

clientRouter.post('/support/tickets', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const companyId = req.companyId!;
    const { subject, department, priority, message } = req.body;

    if (!subject || !message) {
      return res.status(400).json({ error: 'Assunto e mensagem são obrigatórios.' });
    }

    const newTicket = await supabaseService.createSupportTicket(companyId, {
      userId: req.user!.id,
      subject: subject.trim(),
      department: department || 'SUPORTE_TECNICO',
      priority: priority || 'MEDIUM',
      status: 'OPEN',
    });

    if (newTicket) {
      await supabaseService.createSupportMessage(newTicket.id, {
        userId: req.user!.id,
        senderType: 'CLIENT',
        message: message.trim(),
      });
    }

    return res.status(201).json(newTicket);
  } catch (error) {
    console.error('[ClientRoutes] POST /support/tickets error:', error);
    return res.status(500).json({ error: 'Erro ao abrir chamado.' });
  }
});

clientRouter.post('/support/tickets/:id/messages', async (req: AuthenticatedRequest, res: Response) => {
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
      senderType: 'CLIENT',
      message: message.trim(),
    });

    await supabaseService.updateSupportTicket(id, { status: 'OPEN' });
    return res.status(201).json(newMsg);
  } catch (error) {
    console.error('[ClientRoutes] POST /support/tickets/:id/messages error:', error);
    return res.status(500).json({ error: 'Erro ao enviar mensagem no chamado.' });
  }
});

// ==========================================
// 10. PROFILE & INTEGRATIONS
// ==========================================
clientRouter.get('/profile', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const companyId = req.companyId!;
    const company = await supabaseService.getCompanyById(companyId);
    const users = await supabaseService.getAllUsers(companyId);
    const integrations = await supabaseService.getIntegrations(companyId);

    return res.json({
      company,
      users,
      integrations,
    });
  } catch (error) {
    console.error('[ClientRoutes] GET /profile error:', error);
    return res.status(500).json({ error: 'Erro ao carregar perfil.' });
  }
});

clientRouter.put('/profile', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const companyId = req.companyId!;
    const { tradeName, phone, email, senderPhone } = req.body;

    const updated = await supabaseService.updateCompany(companyId, {
      tradeName: tradeName?.trim(),
      phone: phone?.trim(),
      email: email?.trim(),
      senderPhone: senderPhone?.trim(),
    });

    return res.json(updated);
  } catch (error) {
    console.error('[ClientRoutes] PUT /profile error:', error);
    return res.status(500).json({ error: 'Erro ao atualizar perfil.' });
  }
});

// ==========================================
// 11. BLACKLIST / OPTOUT
// ==========================================
clientRouter.get('/blacklist', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const companyId = req.companyId!;
    const list = await supabaseService.getBlacklist(companyId);
    return res.json(list);
  } catch (error) {
    console.error('[ClientRoutes] GET /blacklist error:', error);
    return res.status(500).json({ error: 'Erro ao listar blacklist.' });
  }
});

clientRouter.post('/blacklist', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const companyId = req.companyId!;
    const { phone, reason } = req.body;

    if (!phone) {
      return res.status(400).json({ error: 'Número de telefone é obrigatório.' });
    }

    const cleanPhone = phone.replace(/\D/g, '');
    const formattedPhone = cleanPhone.startsWith('55') ? `+${cleanPhone}` : `+55${cleanPhone}`;

    const newEntry = await supabaseService.addToBlacklist(companyId, {
      phone: formattedPhone,
      reason: reason?.trim() || 'Solicitação do destinatário (Opt-out)',
      addedBy: req.user!.name,
    });

    return res.status(201).json(newEntry);
  } catch (error) {
    console.error('[ClientRoutes] POST /blacklist error:', error);
    return res.status(500).json({ error: 'Erro ao adicionar à blacklist.' });
  }
});

clientRouter.delete('/blacklist/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const companyId = req.companyId!;
    const { id } = req.params;

    await supabaseService.removeFromBlacklist(companyId, id);
    return res.json({ message: 'Número removido da blacklist com sucesso.' });
  } catch (error) {
    console.error('[ClientRoutes] DELETE /blacklist/:id error:', error);
    return res.status(500).json({ error: 'Erro ao remover da blacklist.' });
  }
});
