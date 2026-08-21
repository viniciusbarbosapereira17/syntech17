import { Hono } from 'hono';
import { HonoContextEnv } from '../types/workerEnv.js';
import { supabaseService } from '../db/supabaseService.js';
import { db } from '../db/store.js';
import { honoAuthMiddleware } from '../middleware/honoAuth.js';
import { Contact, ContactList, Template, Message, Campaign } from '../../shared/types.js';

export const honoClient = new Hono<HonoContextEnv>();

// Apply auth middleware to all client routes
honoClient.use('*', honoAuthMiddleware);

// ==========================================
// 1. DASHBOARD
// ==========================================
honoClient.get('/dashboard', async (c) => {
  try {
    const companyId = c.get('companyId')!;

    let company = await supabaseService.getCompanyById(companyId);
    if (!company) {
      company = db.companies.find(comp => comp.id === companyId) || null;
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
    const activeCampaigns = campaigns.filter(camp => camp.status === 'RUNNING' || camp.status === 'SCHEDULED').length;
    
    let totalSent = 0;
    let totalFailed = 0;
    let totalPending = 0;
    let totalProcessed = 0;

    campaigns.forEach(camp => {
      totalSent += camp.successCount || 0;
      totalFailed += camp.failedCount || 0;
      totalPending += camp.pendingCount || 0;
      totalProcessed += camp.processedCount || 0;
    });

    const recentCampaigns = campaigns
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5);

    const openTickets = tickets.filter(t => t.status === 'OPEN' || t.status === 'IN_PROGRESS');

    return c.json({
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
    console.error('[HonoClient] /dashboard error:', error);
    return c.json({ error: 'Erro ao carregar dados do dashboard.' }, 500);
  }
});

// ==========================================
// 2. CONTACTS (CRUD, Filters, Import)
// ==========================================
honoClient.get('/contacts', async (c) => {
  try {
    const companyId = c.get('companyId')!;
    const search = c.req.query('search');
    const tag = c.req.query('tag');
    const listId = c.req.query('listId');

    const contacts = await supabaseService.getContacts(companyId, {
      search: search ? String(search) : undefined,
      tag: tag ? String(tag) : undefined,
      listId: listId ? String(listId) : undefined,
    });

    return c.json({
      total: contacts.length,
      contacts,
    });
  } catch (error) {
    console.error('[HonoClient] GET /contacts error:', error);
    return c.json({ error: 'Erro ao listar contatos.' }, 500);
  }
});

honoClient.post('/contacts', async (c) => {
  try {
    const companyId = c.get('companyId')!;
    const body = await c.req.json().catch(() => ({}));
    const { name, phone, email, store, city, product, tags, listIds, customAttributes } = body;

    if (!name || !phone) {
      return c.json({ error: 'Nome e telefone são obrigatórios.' }, 400);
    }

    let cleanPhone = String(phone).replace(/\D/g, '');
    if (!cleanPhone.startsWith('55') && cleanPhone.length >= 10) {
      cleanPhone = `55${cleanPhone}`;
    }
    const formattedPhone = `+${cleanPhone}`;

    const blacklist = await supabaseService.getBlacklist(companyId);
    const isBlacklisted = blacklist.some(b => b.phone.replace(/\D/g, '') === cleanPhone);

    const newContact = await supabaseService.createContact(companyId, {
      name: String(name).trim(),
      phone: formattedPhone,
      email: email ? String(email).trim() : undefined,
      store: store ? String(store).trim() : undefined,
      city: city ? String(city).trim() : undefined,
      product: product ? String(product).trim() : undefined,
      tags: Array.isArray(tags) ? tags : (tags ? [tags] : []),
      listIds: Array.isArray(listIds) ? listIds : (listIds ? [listIds] : []),
      customAttributes: customAttributes || {},
      isBlacklisted,
    });

    if (!newContact) {
      return c.json({ error: 'Falha ao salvar contato no banco de dados.' }, 500);
    }

    const allContacts = await supabaseService.getContacts(companyId);
    await supabaseService.updateCompany(companyId, { contactCount: allContacts.length });

    return c.json(newContact, 201);
  } catch (error) {
    console.error('[HonoClient] POST /contacts error:', error);
    return c.json({ error: 'Erro ao cadastrar contato.' }, 500);
  }
});

honoClient.put('/contacts/:id', async (c) => {
  try {
    const companyId = c.get('companyId')!;
    const id = c.req.param('id');
    const body = await c.req.json().catch(() => ({}));
    const { name, phone, email, store, city, product, tags, isBlacklisted, customAttributes } = body;

    const existing = await supabaseService.getContactById(companyId, id);
    if (!existing) {
      return c.json({ error: 'Contato não encontrado.' }, 404);
    }

    const updated = await supabaseService.updateContact(companyId, id, {
      name: name !== undefined ? String(name).trim() : undefined,
      phone: phone !== undefined ? String(phone).trim() : undefined,
      email: email !== undefined ? String(email).trim() : undefined,
      store: store !== undefined ? String(store).trim() : undefined,
      city: city !== undefined ? String(city).trim() : undefined,
      product: product !== undefined ? String(product).trim() : undefined,
      tags: Array.isArray(tags) ? tags : undefined,
      isBlacklisted: isBlacklisted !== undefined ? Boolean(isBlacklisted) : undefined,
      customAttributes: customAttributes !== undefined ? customAttributes : undefined,
    });

    return c.json(updated || existing);
  } catch (error) {
    console.error('[HonoClient] PUT /contacts/:id error:', error);
    return c.json({ error: 'Erro ao atualizar contato.' }, 500);
  }
});

honoClient.delete('/contacts/:id', async (c) => {
  try {
    const companyId = c.get('companyId')!;
    const id = c.req.param('id');

    const deleted = await supabaseService.deleteContact(companyId, id);
    if (!deleted) {
      const idx = db.contacts.findIndex(cont => cont.id === id && cont.companyId === companyId);
      if (idx !== -1) {
        db.contacts.splice(idx, 1);
      }
    }

    return c.json({ message: 'Contato excluído com sucesso.' });
  } catch (error) {
    console.error('[HonoClient] DELETE /contacts/:id error:', error);
    return c.json({ error: 'Erro ao remover contato.' }, 500);
  }
});

honoClient.post('/contacts/import', async (c) => {
  try {
    const companyId = c.get('companyId')!;
    const user = c.get('user')!;
    const body = await c.req.json().catch(() => ({}));
    const { contacts, listIds, defaultTags } = body;

    if (!Array.isArray(contacts) || contacts.length === 0) {
      return c.json({ error: 'Lista de contatos vazia ou inválida.' }, 400);
    }

    let importedCount = 0;
    let duplicateCount = 0;
    const blacklist = await supabaseService.getBlacklist(companyId);
    const existingList = await supabaseService.getContacts(companyId);
    const existingPhoneSet = new Set(existingList.map(item => item.phone.replace(/\D/g, '')));

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

    await supabaseService.createAuditLog({
      companyId,
      userId: user.id,
      userEmail: user.email,
      action: 'CONTACTS_IMPORTED',
      resource: 'Contacts',
      details: `Importação em massa finalizada: ${importedCount} importados, ${duplicateCount} duplicados ignorados.`,
      ipAddress: c.req.header('cf-connecting-ip') || '127.0.0.1',
    });

    return c.json({
      message: 'Importação concluída com sucesso.',
      imported: importedCount,
      duplicates: duplicateCount,
      totalProcessed: contacts.length,
    });
  } catch (error) {
    console.error('[HonoClient] /contacts/import error:', error);
    return c.json({ error: 'Erro ao importar contatos.' }, 500);
  }
});

// ==========================================
// 3. CONTACT LISTS (Segmentations)
// ==========================================
honoClient.get('/lists', async (c) => {
  try {
    const companyId = c.get('companyId')!;
    const lists = await supabaseService.getContactLists(companyId);
    return c.json(lists);
  } catch (error) {
    console.error('[HonoClient] GET /lists error:', error);
    return c.json({ error: 'Erro ao obter listas.' }, 500);
  }
});

honoClient.post('/lists', async (c) => {
  try {
    const companyId = c.get('companyId')!;
    const body = await c.req.json().catch(() => ({}));
    const { name, description } = body;

    if (!name) {
      return c.json({ error: 'Nome da lista é obrigatório.' }, 400);
    }

    const newList = await supabaseService.createContactList(companyId, {
      name: String(name).trim(),
      description: description ? String(description).trim() : '',
      contactCount: 0,
    });

    return c.json(newList, 201);
  } catch (error) {
    console.error('[HonoClient] POST /lists error:', error);
    return c.json({ error: 'Erro ao criar lista.' }, 500);
  }
});

honoClient.put('/lists/:id', async (c) => {
  try {
    const companyId = c.get('companyId')!;
    const id = c.req.param('id');
    const body = await c.req.json().catch(() => ({}));
    const { name, description } = body;

    const list = await supabaseService.getListById(companyId, id);
    if (!list) {
      return c.json({ error: 'Lista não encontrada.' }, 404);
    }

    const updated = await supabaseService.updateContactList(companyId, id, {
      name: name !== undefined ? String(name).trim() : undefined,
      description: description !== undefined ? String(description).trim() : undefined,
    });

    return c.json(updated || list);
  } catch (error) {
    console.error('[HonoClient] PUT /lists/:id error:', error);
    return c.json({ error: 'Erro ao atualizar lista.' }, 500);
  }
});

honoClient.delete('/lists/:id', async (c) => {
  try {
    const companyId = c.get('companyId')!;
    const id = c.req.param('id');

    await supabaseService.deleteContactList(companyId, id);
    return c.json({ message: 'Lista removida com sucesso.' });
  } catch (error) {
    console.error('[HonoClient] DELETE /lists/:id error:', error);
    return c.json({ error: 'Erro ao remover lista.' }, 500);
  }
});

// ==========================================
// 4. TEMPLATES (WhatsApp HSM Approved)
// ==========================================
honoClient.get('/templates', async (c) => {
  try {
    const companyId = c.get('companyId')!;
    const templates = await supabaseService.getTemplates(companyId);
    return c.json(templates);
  } catch (error) {
    console.error('[HonoClient] GET /templates error:', error);
    return c.json({ error: 'Erro ao listar templates.' }, 500);
  }
});

honoClient.post('/templates', async (c) => {
  try {
    const companyId = c.get('companyId')!;
    const body = await c.req.json().catch(() => ({}));
    const { name, category, content } = body;

    if (!name || !content) {
      return c.json({ error: 'Nome e conteúdo do template são obrigatórios.' }, 400);
    }

    const varMatches = String(content).match(/\{([a-zA-Z0-9_]+)\}/g) || [];
    const variables: string[] = Array.from(new Set(varMatches.map((v: string) => v.replace(/[{}]/g, ''))));

    const newTemplate = await supabaseService.createTemplate(companyId, {
      name: String(name).trim(),
      category: category || 'MARKETING',
      content: String(content).trim(),
      variables,
      status: 'APPROVED',
    });

    return c.json(newTemplate, 201);
  } catch (error) {
    console.error('[HonoClient] POST /templates error:', error);
    return c.json({ error: 'Erro ao criar template.' }, 500);
  }
});

honoClient.delete('/templates/:id', async (c) => {
  try {
    const companyId = c.get('companyId')!;
    const id = c.req.param('id');

    await supabaseService.deleteTemplate(companyId, id);
    return c.json({ message: 'Template removido com sucesso.' });
  } catch (error) {
    console.error('[HonoClient] DELETE /templates/:id error:', error);
    return c.json({ error: 'Erro ao remover template.' }, 500);
  }
});

// ==========================================
// 5. MESSAGES (Library & Preview)
// ==========================================
honoClient.get('/messages', async (c) => {
  try {
    const companyId = c.get('companyId')!;
    const messages = await supabaseService.getMessages(companyId);
    return c.json(messages);
  } catch (error) {
    console.error('[HonoClient] GET /messages error:', error);
    return c.json({ error: 'Erro ao listar mensagens.' }, 500);
  }
});

honoClient.post('/messages', async (c) => {
  try {
    const companyId = c.get('companyId')!;
    const body = await c.req.json().catch(() => ({}));
    const { title, content, templateId, mediaUrl, messageType } = body;

    if (!title || !content) {
      return c.json({ error: 'Título e conteúdo são obrigatórios.' }, 400);
    }

    const varMatches = String(content).match(/\{([a-zA-Z0-9_]+)\}/g) || [];
    const variables: string[] = Array.from(new Set(varMatches.map((v: string) => v.replace(/[{}]/g, ''))));

    const newMessage = await supabaseService.createMessage(companyId, {
      title: String(title).trim(),
      content: String(content).trim(),
      variables,
      templateId,
      mediaUrl,
      messageType: messageType || 'TEXT',
    });

    return c.json(newMessage, 201);
  } catch (error) {
    console.error('[HonoClient] POST /messages error:', error);
    return c.json({ error: 'Erro ao salvar mensagem.' }, 500);
  }
});

honoClient.post('/messages/preview', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const { content, sampleContact } = body;

  if (!content) {
    return c.json({ error: 'Conteúdo obrigatório.' }, 400);
  }

  const sample = sampleContact || {
    nome: 'Carlos Silva',
    empresa: 'FarmaVida Brasil',
    loja: 'Unidade Paulista',
    cidade: 'São Paulo',
    produto: 'Vitamina C + Zinco',
  };

  let rendered = String(content);
  Object.keys(sample).forEach(key => {
    const regex = new RegExp(`\\{${key}\\}`, 'gi');
    rendered = rendered.replace(regex, sample[key]);
  });

  return c.json({ rendered });
});

// ==========================================
// 6. CAMPAIGNS (Creation, Queue, Actions)
// ==========================================
honoClient.get('/campaigns', async (c) => {
  try {
    const companyId = c.get('companyId')!;
    const campaigns = await supabaseService.getCampaigns(companyId);
    return c.json(campaigns);
  } catch (error) {
    console.error('[HonoClient] GET /campaigns error:', error);
    return c.json({ error: 'Erro ao listar campanhas.' }, 500);
  }
});

honoClient.get('/campaigns/:id', async (c) => {
  try {
    const companyId = c.get('companyId')!;
    const id = c.req.param('id');

    const campaign = await supabaseService.getCampaignById(companyId, id);
    if (!campaign) {
      return c.json({ error: 'Campanha não encontrada.' }, 404);
    }

    const message = await supabaseService.getMessageById(companyId, campaign.messageId);
    const campaignContacts = await supabaseService.getCampaignContacts(companyId, id);

    return c.json({
      campaign,
      message,
      contactsQueue: campaignContacts,
    });
  } catch (error) {
    console.error('[HonoClient] GET /campaigns/:id error:', error);
    return c.json({ error: 'Erro ao obter detalhes da campanha.' }, 500);
  }
});

honoClient.post('/campaigns', async (c) => {
  try {
    const companyId = c.get('companyId')!;
    const user = c.get('user')!;
    const body = await c.req.json().catch(() => ({}));
    const { name, messageId, listIds, scheduledAt, settings, immediateDispatch } = body;

    if (!name || !messageId) {
      return c.json({ error: 'Nome da campanha e Mensagem são obrigatórios.' }, 400);
    }

    const company = await supabaseService.getCompanyById(companyId);
    const message = await supabaseService.getMessageById(companyId, messageId);

    if (!message) {
      return c.json({ error: 'Mensagem selecionada não foi encontrada.' }, 404);
    }

    let targetContacts: Contact[] = [];
    if (listIds && Array.isArray(listIds) && listIds.length > 0) {
      for (const lid of listIds) {
        const contactsInList = await supabaseService.getContacts(companyId, { listId: lid });
        targetContacts.push(...contactsInList);
      }
      const uniqueMap = new Map();
      targetContacts.forEach(cont => uniqueMap.set(cont.id, cont));
      targetContacts = Array.from(uniqueMap.values()).filter(cont => !cont.isBlacklisted);
    } else {
      const allContacts = await supabaseService.getContacts(companyId);
      targetContacts = allContacts.filter(cont => !cont.isBlacklisted);
    }

    if (targetContacts.length === 0) {
      return c.json({ error: 'Nenhum contato elegível encontrado para esta campanha.' }, 400);
    }

    const usedQuota = company?.usedQuota || 0;
    const monthlyQuota = company?.monthlyQuota || 50000;
    if (usedQuota + targetContacts.length > monthlyQuota) {
      return c.json({
        error: `Limite de cota excedido. A campanha requer ${targetContacts.length} envios, mas você só possui ${Math.max(0, monthlyQuota - usedQuota)} disponíveis.`,
      }, 400);
    }

    const total = targetContacts.length;
    const status = immediateDispatch ? 'RUNNING' : (scheduledAt ? 'SCHEDULED' : 'DRAFT');

    const newCampaign = await supabaseService.createCampaign(companyId, {
      name: String(name).trim(),
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
      return c.json({ error: 'Falha ao salvar campanha no Supabase.' }, 500);
    }

    if (immediateDispatch) {
      await supabaseService.updateCompany(companyId, {
        usedQuota: usedQuota + total,
      });
    }

    await supabaseService.createAuditLog({
      companyId,
      userId: user.id,
      userEmail: user.email,
      action: 'CAMPAIGN_CREATED',
      resource: 'Campaigns',
      resourceId: newCampaign.id,
      details: `Campanha "${name}" criada com ${total} destinatários. Status: ${status}.`,
      ipAddress: c.req.header('cf-connecting-ip') || '127.0.0.1',
    });

    return c.json(newCampaign, 201);
  } catch (error) {
    console.error('[HonoClient] POST /campaigns error:', error);
    return c.json({ error: 'Erro ao criar campanha.' }, 500);
  }
});

honoClient.post('/campaigns/:id/action', async (c) => {
  try {
    const companyId = c.get('companyId')!;
    const id = c.req.param('id');
    const body = await c.req.json().catch(() => ({}));
    const { action } = body;

    const campaign = await supabaseService.getCampaignById(companyId, id);
    if (!campaign) {
      return c.json({ error: 'Campanha não encontrada.' }, 404);
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
    return c.json(updated || campaign);
  } catch (error) {
    console.error('[HonoClient] /campaigns/:id/action error:', error);
    return c.json({ error: 'Erro ao alterar status da campanha.' }, 500);
  }
});

// ==========================================
// 7. REPORTS & ANALYTICS
// ==========================================
honoClient.get('/reports/summary', async (c) => {
  try {
    const companyId = c.get('companyId')!;
    const campaigns = await supabaseService.getCampaigns(companyId);

    let totalMessages = 0;
    let sentMessages = 0;
    let failedMessages = 0;

    campaigns.forEach(camp => {
      totalMessages += camp.processedCount || 0;
      sentMessages += camp.successCount || 0;
      failedMessages += camp.failedCount || 0;
    });

    const successRate = totalMessages > 0 ? ((sentMessages / totalMessages) * 100).toFixed(1) : '100';

    const campaignsSummary = campaigns.map(camp => ({
      id: camp.id,
      name: camp.name,
      status: camp.status,
      totalContacts: camp.totalContacts,
      sentCount: camp.successCount,
      failedCount: camp.failedCount,
      successRate: camp.processedCount > 0 ? ((camp.successCount / camp.processedCount) * 100).toFixed(1) : '100',
      createdAt: camp.createdAt,
    }));

    return c.json({
      totalMessages,
      sentMessages,
      failedMessages,
      successRate,
      campaignsSummary,
    });
  } catch (error) {
    console.error('[HonoClient] /reports/summary error:', error);
    return c.json({ error: 'Erro ao gerar relatório.' }, 500);
  }
});

// ==========================================
// 8. SUBSCRIPTION & BILLING
// ==========================================
honoClient.get('/subscription', async (c) => {
  try {
    const companyId = c.get('companyId')!;

    let company = await supabaseService.getCompanyById(companyId);
    let subscription = await supabaseService.getSubscriptionByCompany(companyId);
    let plan = company?.planId ? await supabaseService.getPlanById(company.planId) : null;
    const payments = await supabaseService.getPaymentsByCompany(companyId);
    const availablePlans = await supabaseService.getAllPlans();

    return c.json({
      company,
      subscription,
      plan: plan || availablePlans[0],
      payments,
      availablePlans: availablePlans.filter(p => p.isPublic),
    });
  } catch (error) {
    console.error('[HonoClient] GET /subscription error:', error);
    return c.json({ error: 'Erro ao carregar assinatura.' }, 500);
  }
});

honoClient.post('/subscription/upgrade', async (c) => {
  try {
    const companyId = c.get('companyId')!;
    const body = await c.req.json().catch(() => ({}));
    const { planId, paymentMethod } = body;

    const plan = await supabaseService.getPlanById(planId);
    if (!plan) {
      return c.json({ error: 'Plano não encontrado.' }, 404);
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

    await supabaseService.updateCompany(companyId, {
      planId: plan.id,
      monthlyQuota: plan.messageQuota,
      contactLimit: plan.contactLimit,
      status: 'ACTIVE',
    });

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

    return c.json({
      message: `Upgrade para o ${plan.name} realizado com sucesso!`,
      plan,
      subscription,
      payment: newPayment,
    });
  } catch (error) {
    console.error('[HonoClient] /subscription/upgrade error:', error);
    return c.json({ error: 'Erro ao realizar upgrade de plano.' }, 500);
  }
});

// ==========================================
// 9. SUPPORT & HELP DESK
// ==========================================
honoClient.get('/support/tickets', async (c) => {
  try {
    const companyId = c.get('companyId')!;
    const tickets = await supabaseService.getSupportTickets(companyId);
    return c.json(tickets);
  } catch (error) {
    console.error('[HonoClient] GET /support/tickets error:', error);
    return c.json({ error: 'Erro ao listar chamados.' }, 500);
  }
});

honoClient.get('/support/tickets/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const ticket = await supabaseService.getTicketById(id);

    if (!ticket) {
      return c.json({ error: 'Chamado não encontrado.' }, 404);
    }

    const messages = await supabaseService.getSupportMessages(id);
    return c.json({ ticket, messages });
  } catch (error) {
    console.error('[HonoClient] GET /support/tickets/:id error:', error);
    return c.json({ error: 'Erro ao obter chamado.' }, 500);
  }
});

honoClient.post('/support/tickets', async (c) => {
  try {
    const companyId = c.get('companyId')!;
    const user = c.get('user')!;
    const body = await c.req.json().catch(() => ({}));
    const { subject, department, priority, message } = body;

    if (!subject || !message) {
      return c.json({ error: 'Assunto e mensagem são obrigatórios.' }, 400);
    }

    const newTicket = await supabaseService.createSupportTicket(companyId, {
      userId: user.id,
      subject: String(subject).trim(),
      department: department || 'SUPORTE_TECNICO',
      priority: priority || 'MEDIUM',
      status: 'OPEN',
    });

    if (newTicket) {
      await supabaseService.createSupportMessage(newTicket.id, {
        userId: user.id,
        senderType: 'CLIENT',
        message: String(message).trim(),
      });
    }

    return c.json(newTicket, 201);
  } catch (error) {
    console.error('[HonoClient] POST /support/tickets error:', error);
    return c.json({ error: 'Erro ao abrir chamado.' }, 500);
  }
});

honoClient.post('/support/tickets/:id/messages', async (c) => {
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
      senderType: 'CLIENT',
      message: String(message).trim(),
    });

    await supabaseService.updateSupportTicket(id, { status: 'OPEN' });
    return c.json(newMsg, 201);
  } catch (error) {
    console.error('[HonoClient] POST /support/tickets/:id/messages error:', error);
    return c.json({ error: 'Erro ao enviar mensagem no chamado.' }, 500);
  }
});

// ==========================================
// 10. PROFILE & INTEGRATIONS
// ==========================================
honoClient.get('/profile', async (c) => {
  try {
    const companyId = c.get('companyId')!;
    const company = await supabaseService.getCompanyById(companyId);
    const users = await supabaseService.getAllUsers(companyId);
    const integrations = await supabaseService.getIntegrations(companyId);

    return c.json({
      company,
      users,
      integrations,
    });
  } catch (error) {
    console.error('[HonoClient] GET /profile error:', error);
    return c.json({ error: 'Erro ao carregar perfil.' }, 500);
  }
});

honoClient.put('/profile', async (c) => {
  try {
    const companyId = c.get('companyId')!;
    const body = await c.req.json().catch(() => ({}));
    const { tradeName, phone, email, senderPhone } = body;

    const updated = await supabaseService.updateCompany(companyId, {
      tradeName: tradeName ? String(tradeName).trim() : undefined,
      phone: phone ? String(phone).trim() : undefined,
      email: email ? String(email).trim() : undefined,
      senderPhone: senderPhone ? String(senderPhone).trim() : undefined,
    });

    return c.json(updated);
  } catch (error) {
    console.error('[HonoClient] PUT /profile error:', error);
    return c.json({ error: 'Erro ao atualizar perfil.' }, 500);
  }
});

// ==========================================
// 11. BLACKLIST / OPTOUT
// ==========================================
honoClient.get('/blacklist', async (c) => {
  try {
    const companyId = c.get('companyId')!;
    const list = await supabaseService.getBlacklist(companyId);
    return c.json(list);
  } catch (error) {
    console.error('[HonoClient] GET /blacklist error:', error);
    return c.json({ error: 'Erro ao listar blacklist.' }, 500);
  }
});

honoClient.post('/blacklist', async (c) => {
  try {
    const companyId = c.get('companyId')!;
    const user = c.get('user')!;
    const body = await c.req.json().catch(() => ({}));
    const { phone, reason } = body;

    if (!phone) {
      return c.json({ error: 'Número de telefone é obrigatório.' }, 400);
    }

    const cleanPhone = String(phone).replace(/\D/g, '');
    const formattedPhone = cleanPhone.startsWith('55') ? `+${cleanPhone}` : `+55${cleanPhone}`;

    const newEntry = await supabaseService.addToBlacklist(companyId, {
      phone: formattedPhone,
      reason: reason ? String(reason).trim() : 'Solicitação do destinatário (Opt-out)',
      addedBy: user.name,
    });

    return c.json(newEntry, 201);
  } catch (error) {
    console.error('[HonoClient] POST /blacklist error:', error);
    return c.json({ error: 'Erro ao adicionar à blacklist.' }, 500);
  }
});

honoClient.delete('/blacklist/:id', async (c) => {
  try {
    const companyId = c.get('companyId')!;
    const id = c.req.param('id');

    await supabaseService.removeFromBlacklist(companyId, id);
    return c.json({ message: 'Número removido da blacklist com sucesso.' });
  } catch (error) {
    console.error('[HonoClient] DELETE /blacklist/:id error:', error);
    return c.json({ error: 'Erro ao remover da blacklist.' }, 500);
  }
});
