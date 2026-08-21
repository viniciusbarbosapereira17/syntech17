import { getSupabase, isSupabaseConfigured } from './supabaseClient.js';
import {
  Company,
  User,
  Plan,
  Subscription,
  Payment,
  Contact,
  ContactList,
  Template,
  Message,
  Campaign,
  CampaignContact,
  SupportTicket,
  SupportMessage,
  BlacklistEntry,
  AuditLog,
  Integration
} from '../../shared/types.js';

// =============================================================================
// DATA MAPPERS (Database snake_case <-> Application camelCase)
// =============================================================================

function mapCompany(row: any): Company {
  return {
    id: row.id,
    name: row.name,
    tradeName: row.trade_name || row.tradeName || row.name,
    cnpj: row.cnpj,
    email: row.email,
    phone: row.phone,
    status: row.status || 'ACTIVE',
    planId: row.plan_id || row.planId,
    monthlyQuota: row.monthly_quota ?? row.monthlyQuota ?? 50000,
    usedQuota: row.used_quota ?? row.usedQuota ?? 0,
    contactLimit: row.contact_limit ?? row.contactLimit ?? 100000,
    contactCount: row.contact_count ?? row.contactCount ?? 0,
    senderPhone: row.sender_phone || row.senderPhone,
    senderVerified: Boolean(row.sender_verified ?? row.senderVerified),
    createdAt: row.created_at || row.createdAt || new Date().toISOString(),
    updatedAt: row.updated_at || row.updatedAt || new Date().toISOString(),
  };
}

function mapUser(row: any): User {
  return {
    id: row.id,
    companyId: row.company_id || row.companyId,
    name: row.name,
    email: row.email,
    role: row.role,
    phone: row.phone,
    avatarUrl: row.avatar_url || row.avatarUrl,
    isActive: row.is_active !== undefined ? Boolean(row.is_active) : (row.isActive !== undefined ? Boolean(row.isActive) : true),
    lastLoginAt: row.last_login_at || row.lastLoginAt,
    createdAt: row.created_at || row.createdAt || new Date().toISOString(),
    updatedAt: row.updated_at || row.updatedAt || new Date().toISOString(),
  };
}

function mapPlan(row: any): Plan {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description || '',
    price: Number(row.price || 0),
    interval: row.interval || 'MONTHLY',
    messageQuota: Number(row.message_quota ?? row.messageQuota ?? 0),
    contactLimit: Number(row.contact_limit ?? row.contactLimit ?? 0),
    maxSenders: Number(row.max_senders ?? row.maxSenders ?? 1),
    features: Array.isArray(row.features) ? row.features : (typeof row.features === 'string' ? JSON.parse(row.features) : []),
    isPopular: Boolean(row.is_popular ?? row.isPopular),
    isPublic: row.is_public !== undefined ? Boolean(row.is_public) : (row.isPublic !== undefined ? Boolean(row.isPublic) : true),
    createdAt: row.created_at || row.createdAt || new Date().toISOString(),
  };
}

function mapSubscription(row: any): Subscription {
  return {
    id: row.id,
    companyId: row.company_id || row.companyId,
    planId: row.plan_id || row.planId,
    status: row.status || 'ACTIVE',
    amount: Number(row.amount || 0),
    interval: row.interval || 'MONTHLY',
    currentPeriodStart: row.current_period_start || row.currentPeriodStart || new Date().toISOString(),
    currentPeriodEnd: row.current_period_end || row.currentPeriodEnd || new Date().toISOString(),
    autoRenew: row.auto_renew !== undefined ? Boolean(row.auto_renew) : (row.autoRenew !== undefined ? Boolean(row.autoRenew) : true),
    paymentMethod: row.payment_method || row.paymentMethod || 'PIX',
    createdAt: row.created_at || row.createdAt || new Date().toISOString(),
    updatedAt: row.updated_at || row.updatedAt || new Date().toISOString(),
  };
}

function mapPayment(row: any): Payment {
  return {
    id: row.id,
    companyId: row.company_id || row.companyId,
    subscriptionId: row.subscription_id || row.subscriptionId,
    amount: Number(row.amount || 0),
    status: row.status || 'PAID',
    paymentMethod: row.payment_method || row.paymentMethod || 'PIX',
    invoiceUrl: row.invoice_url || row.invoiceUrl,
    receiptNumber: row.receipt_number || row.receiptNumber || `REC-${Date.now()}`,
    paidAt: row.paid_at || row.paidAt,
    dueDate: row.due_date || row.dueDate || new Date().toISOString(),
    createdAt: row.created_at || row.createdAt || new Date().toISOString(),
  };
}

function mapContact(row: any, listIds: string[] = []): Contact {
  return {
    id: row.id,
    companyId: row.company_id || row.companyId,
    name: row.name,
    phone: row.phone,
    email: row.email,
    store: row.store,
    city: row.city,
    product: row.product,
    customAttributes: row.custom_attributes || row.customAttributes || {},
    tags: Array.isArray(row.tags) ? row.tags : [],
    listIds: listIds.length > 0 ? listIds : (Array.isArray(row.list_ids || row.listIds) ? (row.list_ids || row.listIds) : []),
    isBlacklisted: Boolean(row.is_blacklisted ?? row.isBlacklisted),
    createdAt: row.created_at || row.createdAt || new Date().toISOString(),
    updatedAt: row.updated_at || row.updatedAt || new Date().toISOString(),
  };
}

function mapContactList(row: any): ContactList {
  return {
    id: row.id,
    companyId: row.company_id || row.companyId,
    name: row.name,
    description: row.description,
    contactCount: Number(row.contact_count ?? row.contactCount ?? 0),
    createdAt: row.created_at || row.createdAt || new Date().toISOString(),
    updatedAt: row.updated_at || row.updatedAt || new Date().toISOString(),
  };
}

function mapTemplate(row: any): Template {
  return {
    id: row.id,
    companyId: row.company_id || row.companyId,
    name: row.name,
    category: row.category || 'MARKETING',
    content: row.content || '',
    variables: Array.isArray(row.variables) ? row.variables : (typeof row.variables === 'string' ? JSON.parse(row.variables) : []),
    status: row.status || 'APPROVED',
    rejectionReason: row.rejection_reason || row.rejectionReason,
    createdAt: row.created_at || row.createdAt || new Date().toISOString(),
    updatedAt: row.updated_at || row.updatedAt || new Date().toISOString(),
  };
}

function mapMessage(row: any): Message {
  return {
    id: row.id,
    companyId: row.company_id || row.companyId,
    title: row.title,
    content: row.content || '',
    variables: Array.isArray(row.variables) ? row.variables : (typeof row.variables === 'string' ? JSON.parse(row.variables) : []),
    templateId: row.template_id || row.templateId,
    mediaUrl: row.media_url || row.mediaUrl,
    messageType: row.message_type || row.messageType || 'TEXT',
    createdAt: row.created_at || row.createdAt || new Date().toISOString(),
    updatedAt: row.updated_at || row.updatedAt || new Date().toISOString(),
  };
}

function mapCampaign(row: any): Campaign {
  return {
    id: row.id,
    companyId: row.company_id || row.companyId,
    name: row.name,
    messageId: row.message_id || row.messageId,
    listIds: Array.isArray(row.list_ids || row.listIds) ? (row.list_ids || row.listIds) : [],
    senderId: row.sender_id || row.senderId,
    senderPhone: row.sender_phone || row.senderPhone,
    status: row.status || 'DRAFT',
    scheduledAt: row.scheduled_at || row.scheduledAt,
    startedAt: row.started_at || row.startedAt,
    completedAt: row.completed_at || row.completedAt,
    totalContacts: Number(row.total_contacts ?? row.totalContacts ?? 0),
    processedCount: Number(row.processed_count ?? row.processedCount ?? 0),
    successCount: Number(row.success_count ?? row.successCount ?? 0),
    failedCount: Number(row.failed_count ?? row.failedCount ?? 0),
    pendingCount: Number(row.pending_count ?? row.pendingCount ?? 0),
    settings: row.settings || {
      messagesPerMinute: 60,
      retryOnFailure: true,
      maxRetries: 2,
      respectBusinessHours: true,
    },
    createdAt: row.created_at || row.createdAt || new Date().toISOString(),
    updatedAt: row.updated_at || row.updatedAt || new Date().toISOString(),
  };
}

function mapCampaignContact(row: any): CampaignContact {
  return {
    id: row.id,
    campaignId: row.campaign_id || row.campaignId,
    companyId: row.company_id || row.companyId,
    contactId: row.contact_id || row.contactId || '',
    contactName: row.contact_name || row.contactName || 'Contato',
    phone: row.phone,
    status: row.status || 'PENDING',
    renderedContent: row.rendered_content || row.renderedContent || '',
    errorReason: row.error_reason || row.errorReason,
    providerMessageId: row.provider_message_id || row.providerMessageId,
    sentAt: row.sent_at || row.sentAt,
    deliveredAt: row.delivered_at || row.deliveredAt,
    readAt: row.read_at || row.readAt,
  };
}

function mapSupportTicket(row: any): SupportTicket {
  return {
    id: row.id,
    companyId: row.company_id || row.companyId,
    companyName: row.company_name || row.companyName || 'Empresa',
    userId: row.user_id || row.userId || '',
    userName: row.user_name || row.userName || 'Usuário',
    userEmail: row.user_email || row.userEmail || '',
    ticketNumber: row.ticket_number || row.ticketNumber || `#TKT-${Date.now()}`,
    subject: row.subject,
    department: row.department || 'SUPORTE_TECNICO',
    priority: row.priority || 'MEDIUM',
    status: row.status || 'OPEN',
    assignedTo: row.assigned_to || row.assignedTo,
    assignedName: row.assigned_name || row.assignedName,
    createdAt: row.created_at || row.createdAt || new Date().toISOString(),
    updatedAt: row.updated_at || row.updatedAt || new Date().toISOString(),
    closedAt: row.closed_at || row.closedAt,
  };
}

function mapSupportMessage(row: any): SupportMessage {
  return {
    id: row.id,
    ticketId: row.ticket_id || row.ticketId,
    userId: row.user_id || row.userId || '',
    userName: row.user_name || row.userName || 'Usuário',
    userRole: row.user_role || row.userRole || 'CLIENT_ADMIN',
    senderType: row.sender_type || row.senderType || 'CLIENT',
    message: row.message || '',
    attachments: Array.isArray(row.attachments) ? row.attachments : [],
    createdAt: row.created_at || row.createdAt || new Date().toISOString(),
  };
}

function mapBlacklist(row: any): BlacklistEntry {
  return {
    id: row.id,
    companyId: row.company_id || row.companyId,
    phone: row.phone,
    reason: row.reason || '',
    addedBy: row.added_by || row.addedBy || 'Sistema',
    createdAt: row.created_at || row.createdAt || new Date().toISOString(),
  };
}

function mapAuditLog(row: any): AuditLog {
  return {
    id: row.id,
    companyId: row.company_id || row.companyId,
    companyName: row.company_name || row.companyName,
    userId: row.user_id || row.userId || '',
    userEmail: row.user_email || row.userEmail || '',
    action: row.action,
    resource: row.resource,
    resourceId: row.resource_id || row.resourceId,
    details: row.details || '',
    ipAddress: row.ip_address || row.ipAddress || '127.0.0.1',
    userAgent: row.user_agent || row.userAgent,
    createdAt: row.created_at || row.createdAt || new Date().toISOString(),
  };
}

function mapIntegration(row: any): Integration {
  return {
    id: row.id,
    companyId: row.company_id || row.companyId,
    providerName: row.provider_name || row.providerName || 'Meta Cloud API Direct',
    providerType: row.provider_type || row.providerType || 'WHATSAPP_OFFICIAL',
    status: row.status || 'CONNECTED',
    senderPhone: row.sender_phone || row.senderPhone,
    wabaId: row.waba_id || row.wabaId,
    apiKeyMasked: row.api_key_masked || row.apiKeyMasked,
    isDefault: row.is_default !== undefined ? Boolean(row.is_default) : (row.isDefault !== undefined ? Boolean(row.isDefault) : true),
    createdAt: row.created_at || row.createdAt || new Date().toISOString(),
    updatedAt: row.updated_at || row.updatedAt || new Date().toISOString(),
  };
}

// =============================================================================
// SUPABASE REPOSITORY SERVICE LAYER (17 Entities + Multi-Tenant Enforcement)
// =============================================================================

export class SupabaseDatabaseService {
  private static instance: SupabaseDatabaseService;

  public static getInstance(): SupabaseDatabaseService {
    if (!SupabaseDatabaseService.instance) {
      SupabaseDatabaseService.instance = new SupabaseDatabaseService();
    }
    return SupabaseDatabaseService.instance;
  }

  // ---------------------------------------------------------------------------
  // 1. COMPANIES (Tenants)
  // ---------------------------------------------------------------------------
  async getCompanyById(id: string): Promise<Company | null> {
    const supabase = getSupabase();
    if (!supabase) return null;

    const { data, error } = await supabase
      .from('companies')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) return null;
    return mapCompany(data);
  }

  async getAllCompanies(search?: string, status?: string): Promise<Company[]> {
    const supabase = getSupabase();
    if (!supabase) return [];

    let query = supabase.from('companies').select('*').order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }
    if (search) {
      query = query.or(`name.ilike.%${search}%,trade_name.ilike.%${search}%,cnpj.ilike.%${search}%,email.ilike.%${search}%`);
    }

    const { data, error } = await query;
    if (error || !data) return [];
    return data.map(mapCompany);
  }

  async createCompany(payload: Partial<Company>): Promise<Company | null> {
    const supabase = getSupabase();
    if (!supabase) return null;

    const id = payload.id || `comp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const record = {
      id,
      name: payload.name,
      trade_name: payload.tradeName || payload.name,
      cnpj: payload.cnpj,
      email: payload.email,
      phone: payload.phone,
      status: payload.status || 'ACTIVE',
      plan_id: payload.planId,
      monthly_quota: payload.monthlyQuota || 50000,
      used_quota: payload.usedQuota || 0,
      contact_limit: payload.contactLimit || 100000,
      sender_phone: payload.senderPhone,
      sender_verified: payload.senderVerified || false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('companies')
      .insert(record)
      .select()
      .single();

    if (error || !data) {
      console.error('[Supabase] Error creating company:', error);
      return null;
    }
    return mapCompany(data);
  }

  async updateCompany(id: string, updates: Partial<Company>): Promise<Company | null> {
    const supabase = getSupabase();
    if (!supabase) return null;

    const dbPayload: any = {
      updated_at: new Date().toISOString(),
    };

    if (updates.name !== undefined) dbPayload.name = updates.name;
    if (updates.tradeName !== undefined) dbPayload.trade_name = updates.tradeName;
    if (updates.cnpj !== undefined) dbPayload.cnpj = updates.cnpj;
    if (updates.email !== undefined) dbPayload.email = updates.email;
    if (updates.phone !== undefined) dbPayload.phone = updates.phone;
    if (updates.status !== undefined) dbPayload.status = updates.status;
    if (updates.planId !== undefined) dbPayload.plan_id = updates.planId;
    if (updates.monthlyQuota !== undefined) dbPayload.monthly_quota = updates.monthlyQuota;
    if (updates.usedQuota !== undefined) dbPayload.used_quota = updates.usedQuota;
    if (updates.contactLimit !== undefined) dbPayload.contact_limit = updates.contactLimit;
    if (updates.senderPhone !== undefined) dbPayload.sender_phone = updates.senderPhone;
    if (updates.senderVerified !== undefined) dbPayload.sender_verified = updates.senderVerified;

    const { data, error } = await supabase
      .from('companies')
      .update(dbPayload)
      .eq('id', id)
      .select()
      .single();

    if (error || !data) {
      console.error('[Supabase] Error updating company:', error);
      return null;
    }
    return mapCompany(data);
  }

  // ---------------------------------------------------------------------------
  // 2. USERS / PROFILES
  // ---------------------------------------------------------------------------
  async findUserByEmail(email: string): Promise<User | null> {
    const supabase = getSupabase();
    if (!supabase) return null;

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email.toLowerCase().trim())
      .single();

    if (error || !data) return null;
    return mapUser(data);
  }

  async findUserById(id: string): Promise<User | null> {
    const supabase = getSupabase();
    if (!supabase) return null;

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) return null;
    return mapUser(data);
  }

  async getAllUsers(companyId?: string, search?: string, role?: string): Promise<User[]> {
    const supabase = getSupabase();
    if (!supabase) return [];

    let query = supabase.from('users').select('*').order('created_at', { ascending: false });

    if (companyId) {
      query = query.eq('company_id', companyId);
    }
    if (role) {
      query = query.eq('role', role);
    }
    if (search) {
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`);
    }

    const { data, error } = await query;
    if (error || !data) return [];
    return data.map(mapUser);
  }

  async createUser(payload: Partial<User>): Promise<User | null> {
    const supabase = getSupabase();
    if (!supabase) return null;

    const id = payload.id || `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const record = {
      id,
      company_id: payload.companyId,
      name: payload.name,
      email: payload.email?.toLowerCase().trim(),
      password_hash: 'syntech_auth_bcrypt_hash',
      role: payload.role || 'CLIENT_ADMIN',
      phone: payload.phone,
      avatar_url: payload.avatarUrl,
      is_active: payload.isActive !== false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('users')
      .insert(record)
      .select()
      .single();

    if (error || !data) {
      console.error('[Supabase] Error creating user:', error);
      return null;
    }
    return mapUser(data);
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | null> {
    const supabase = getSupabase();
    if (!supabase) return null;

    const dbPayload: any = {
      updated_at: new Date().toISOString(),
    };

    if (updates.name !== undefined) dbPayload.name = updates.name;
    if (updates.role !== undefined) dbPayload.role = updates.role;
    if (updates.phone !== undefined) dbPayload.phone = updates.phone;
    if (updates.avatarUrl !== undefined) dbPayload.avatar_url = updates.avatarUrl;
    if (updates.isActive !== undefined) dbPayload.is_active = updates.isActive;
    if (updates.lastLoginAt !== undefined) dbPayload.last_login_at = updates.lastLoginAt;

    const { data, error } = await supabase
      .from('users')
      .update(dbPayload)
      .eq('id', id)
      .select()
      .single();

    if (error || !data) {
      console.error('[Supabase] Error updating user:', error);
      return null;
    }
    return mapUser(data);
  }

  // ---------------------------------------------------------------------------
  // 3. PLANS
  // ---------------------------------------------------------------------------
  async getAllPlans(): Promise<Plan[]> {
    const supabase = getSupabase();
    if (!supabase) return [];

    const { data, error } = await supabase
      .from('plans')
      .select('*')
      .order('price', { ascending: true });

    if (error || !data) return [];
    return data.map(mapPlan);
  }

  async getPlanById(id: string): Promise<Plan | null> {
    const supabase = getSupabase();
    if (!supabase) return null;

    const { data, error } = await supabase
      .from('plans')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) return null;
    return mapPlan(data);
  }

  async createPlan(payload: Partial<Plan>): Promise<Plan | null> {
    const supabase = getSupabase();
    if (!supabase) return null;

    const id = payload.id || `plan_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const record = {
      id,
      name: payload.name,
      slug: payload.slug || payload.name?.toLowerCase().replace(/\s+/g, '-'),
      description: payload.description || '',
      price: payload.price || 0,
      interval: payload.interval || 'MONTHLY',
      message_quota: payload.messageQuota || 0,
      contact_limit: payload.contactLimit || 0,
      max_senders: payload.maxSenders || 1,
      features: payload.features || [],
      is_popular: payload.isPopular || false,
      is_public: payload.isPublic !== false,
      created_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('plans')
      .insert(record)
      .select()
      .single();

    if (error || !data) return null;
    return mapPlan(data);
  }

  async updatePlan(id: string, updates: Partial<Plan>): Promise<Plan | null> {
    const supabase = getSupabase();
    if (!supabase) return null;

    const dbPayload: any = {};
    if (updates.name !== undefined) dbPayload.name = updates.name;
    if (updates.description !== undefined) dbPayload.description = updates.description;
    if (updates.price !== undefined) dbPayload.price = updates.price;
    if (updates.messageQuota !== undefined) dbPayload.message_quota = updates.messageQuota;
    if (updates.contactLimit !== undefined) dbPayload.contact_limit = updates.contactLimit;
    if (updates.maxSenders !== undefined) dbPayload.max_senders = updates.maxSenders;
    if (updates.features !== undefined) dbPayload.features = updates.features;
    if (updates.isPublic !== undefined) dbPayload.is_public = updates.isPublic;
    if (updates.isPopular !== undefined) dbPayload.is_popular = updates.isPopular;

    const { data, error } = await supabase
      .from('plans')
      .update(dbPayload)
      .eq('id', id)
      .select()
      .single();

    if (error || !data) return null;
    return mapPlan(data);
  }

  // ---------------------------------------------------------------------------
  // 4. SUBSCRIPTIONS
  // ---------------------------------------------------------------------------
  async getSubscriptionByCompany(companyId: string): Promise<Subscription | null> {
    const supabase = getSupabase();
    if (!supabase) return null;

    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data) return null;
    return mapSubscription(data);
  }

  async getAllSubscriptions(): Promise<Subscription[]> {
    const supabase = getSupabase();
    if (!supabase) return [];

    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .order('created_at', { ascending: false });

    if (error || !data) return [];
    return data.map(mapSubscription);
  }

  async createSubscription(payload: Partial<Subscription>): Promise<Subscription | null> {
    const supabase = getSupabase();
    if (!supabase) return null;

    const id = payload.id || `sub_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const record = {
      id,
      company_id: payload.companyId,
      plan_id: payload.planId,
      status: payload.status || 'ACTIVE',
      amount: payload.amount || 0,
      interval: payload.interval || 'MONTHLY',
      current_period_start: payload.currentPeriodStart || new Date().toISOString(),
      current_period_end: payload.currentPeriodEnd || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      auto_renew: payload.autoRenew !== false,
      payment_method: payload.paymentMethod || 'PIX',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('subscriptions')
      .insert(record)
      .select()
      .single();

    if (error || !data) return null;
    return mapSubscription(data);
  }

  async updateSubscription(id: string, updates: Partial<Subscription>): Promise<Subscription | null> {
    const supabase = getSupabase();
    if (!supabase) return null;

    const dbPayload: any = {
      updated_at: new Date().toISOString(),
    };
    if (updates.status !== undefined) dbPayload.status = updates.status;
    if (updates.amount !== undefined) dbPayload.amount = updates.amount;
    if (updates.currentPeriodEnd !== undefined) dbPayload.current_period_end = updates.currentPeriodEnd;
    if (updates.autoRenew !== undefined) dbPayload.auto_renew = updates.autoRenew;
    if (updates.planId !== undefined) dbPayload.plan_id = updates.planId;

    const { data, error } = await supabase
      .from('subscriptions')
      .update(dbPayload)
      .eq('id', id)
      .select()
      .single();

    if (error || !data) return null;
    return mapSubscription(data);
  }

  // ---------------------------------------------------------------------------
  // 5. PAYMENTS
  // ---------------------------------------------------------------------------
  async getPaymentsByCompany(companyId: string): Promise<Payment[]> {
    const supabase = getSupabase();
    if (!supabase) return [];

    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });

    if (error || !data) return [];
    return data.map(mapPayment);
  }

  async getAllPayments(): Promise<Payment[]> {
    const supabase = getSupabase();
    if (!supabase) return [];

    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .order('created_at', { ascending: false });

    if (error || !data) return [];
    return data.map(mapPayment);
  }

  async createPayment(payload: Partial<Payment>): Promise<Payment | null> {
    const supabase = getSupabase();
    if (!supabase) return null;

    const id = payload.id || `pay_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const record = {
      id,
      company_id: payload.companyId,
      subscription_id: payload.subscriptionId,
      amount: payload.amount || 0,
      status: payload.status || 'PAID',
      payment_method: payload.paymentMethod || 'PIX',
      receipt_number: payload.receiptNumber || `REC-${Date.now()}`,
      invoice_url: payload.invoiceUrl,
      paid_at: payload.paidAt || new Date().toISOString(),
      due_date: payload.dueDate || new Date().toISOString(),
      created_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('payments')
      .insert(record)
      .select()
      .single();

    if (error || !data) return null;
    return mapPayment(data);
  }

  // ---------------------------------------------------------------------------
  // 6. CONTACTS (Multi-Tenant Enforced)
  // ---------------------------------------------------------------------------
  async getContacts(companyId: string, filter?: { search?: string; tag?: string; listId?: string }): Promise<Contact[]> {
    const supabase = getSupabase();
    if (!supabase) return [];

    let query = supabase
      .from('contacts')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });

    if (filter?.search) {
      const s = filter.search;
      query = query.or(`name.ilike.%${s}%,phone.ilike.%${s}%,email.ilike.%${s}%,city.ilike.%${s}%,store.ilike.%${s}%,product.ilike.%${s}%`);
    }

    if (filter?.tag) {
      query = query.contains('tags', [filter.tag]);
    }

    const { data, error } = await query;
    if (error || !data) return [];

    // If listId provided, query members
    if (filter?.listId) {
      const { data: memberRows } = await supabase
        .from('contact_list_members')
        .select('contact_id')
        .eq('company_id', companyId)
        .eq('list_id', filter.listId);

      const contactIdsInList = new Set((memberRows || []).map((m: any) => m.contact_id));
      return data.filter(c => contactIdsInList.has(c.id)).map(c => mapContact(c, [filter.listId!]));
    }

    return data.map(c => mapContact(c));
  }

  async getContactById(companyId: string, id: string): Promise<Contact | null> {
    const supabase = getSupabase();
    if (!supabase) return null;

    const { data, error } = await supabase
      .from('contacts')
      .select('*')
      .eq('company_id', companyId)
      .eq('id', id)
      .single();

    if (error || !data) return null;
    return mapContact(data);
  }

  async createContact(companyId: string, payload: Partial<Contact>): Promise<Contact | null> {
    const supabase = getSupabase();
    if (!supabase) return null;

    const id = payload.id || `ct_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const record = {
      id,
      company_id: companyId,
      name: payload.name,
      phone: payload.phone,
      email: payload.email,
      store: payload.store,
      city: payload.city,
      product: payload.product,
      custom_attributes: payload.customAttributes || {},
      tags: payload.tags || [],
      is_blacklisted: Boolean(payload.isBlacklisted),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('contacts')
      .insert(record)
      .select()
      .single();

    if (error || !data) {
      console.error('[Supabase] Error creating contact:', error);
      return null;
    }

    // Associate with list if provided
    if (payload.listIds && payload.listIds.length > 0) {
      for (const listId of payload.listIds) {
        await supabase.from('contact_list_members').insert({
          id: `clm_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          company_id: companyId,
          list_id: listId,
          contact_id: id,
          created_at: new Date().toISOString(),
        });
      }
    }

    return mapContact(data, payload.listIds || []);
  }

  async updateContact(companyId: string, id: string, updates: Partial<Contact>): Promise<Contact | null> {
    const supabase = getSupabase();
    if (!supabase) return null;

    const dbPayload: any = {
      updated_at: new Date().toISOString(),
    };

    if (updates.name !== undefined) dbPayload.name = updates.name;
    if (updates.phone !== undefined) dbPayload.phone = updates.phone;
    if (updates.email !== undefined) dbPayload.email = updates.email;
    if (updates.store !== undefined) dbPayload.store = updates.store;
    if (updates.city !== undefined) dbPayload.city = updates.city;
    if (updates.product !== undefined) dbPayload.product = updates.product;
    if (updates.customAttributes !== undefined) dbPayload.custom_attributes = updates.customAttributes;
    if (updates.tags !== undefined) dbPayload.tags = updates.tags;
    if (updates.isBlacklisted !== undefined) dbPayload.is_blacklisted = updates.isBlacklisted;

    const { data, error } = await supabase
      .from('contacts')
      .update(dbPayload)
      .eq('company_id', companyId)
      .eq('id', id)
      .select()
      .single();

    if (error || !data) return null;
    return mapContact(data);
  }

  async deleteContact(companyId: string, id: string): Promise<boolean> {
    const supabase = getSupabase();
    if (!supabase) return false;

    const { error } = await supabase
      .from('contacts')
      .delete()
      .eq('company_id', companyId)
      .eq('id', id);

    return !error;
  }

  // ---------------------------------------------------------------------------
  // 7. CONTACT LISTS & MEMBERS
  // ---------------------------------------------------------------------------
  async getContactLists(companyId: string): Promise<ContactList[]> {
    const supabase = getSupabase();
    if (!supabase) return [];

    const { data, error } = await supabase
      .from('contact_lists')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });

    if (error || !data) return [];
    return data.map(mapContactList);
  }

  async getListById(companyId: string, id: string): Promise<ContactList | null> {
    const supabase = getSupabase();
    if (!supabase) return null;

    const { data, error } = await supabase
      .from('contact_lists')
      .select('*')
      .eq('company_id', companyId)
      .eq('id', id)
      .single();

    if (error || !data) return null;
    return mapContactList(data);
  }

  async createContactList(companyId: string, payload: Partial<ContactList>): Promise<ContactList | null> {
    const supabase = getSupabase();
    if (!supabase) return null;

    const id = payload.id || `list_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const record = {
      id,
      company_id: companyId,
      name: payload.name,
      description: payload.description || '',
      contact_count: payload.contactCount || 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('contact_lists')
      .insert(record)
      .select()
      .single();

    if (error || !data) return null;
    return mapContactList(data);
  }

  async updateContactList(companyId: string, id: string, updates: Partial<ContactList>): Promise<ContactList | null> {
    const supabase = getSupabase();
    if (!supabase) return null;

    const dbPayload: any = {
      updated_at: new Date().toISOString(),
    };
    if (updates.name !== undefined) dbPayload.name = updates.name;
    if (updates.description !== undefined) dbPayload.description = updates.description;
    if (updates.contactCount !== undefined) dbPayload.contact_count = updates.contactCount;

    const { data, error } = await supabase
      .from('contact_lists')
      .update(dbPayload)
      .eq('company_id', companyId)
      .eq('id', id)
      .select()
      .single();

    if (error || !data) return null;
    return mapContactList(data);
  }

  async deleteContactList(companyId: string, id: string): Promise<boolean> {
    const supabase = getSupabase();
    if (!supabase) return false;

    // Delete members first
    await supabase.from('contact_list_members').delete().eq('company_id', companyId).eq('list_id', id);
    const { error } = await supabase.from('contact_lists').delete().eq('company_id', companyId).eq('id', id);
    return !error;
  }

  // ---------------------------------------------------------------------------
  // 8. TEMPLATES
  // ---------------------------------------------------------------------------
  async getTemplates(companyId: string): Promise<Template[]> {
    const supabase = getSupabase();
    if (!supabase) return [];

    const { data, error } = await supabase
      .from('templates')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });

    if (error || !data) return [];
    return data.map(mapTemplate);
  }

  async createTemplate(companyId: string, payload: Partial<Template>): Promise<Template | null> {
    const supabase = getSupabase();
    if (!supabase) return null;

    const id = payload.id || `tpl_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const record = {
      id,
      company_id: companyId,
      name: payload.name,
      category: payload.category || 'MARKETING',
      content: payload.content || '',
      variables: payload.variables || [],
      status: payload.status || 'APPROVED',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('templates')
      .insert(record)
      .select()
      .single();

    if (error || !data) return null;
    return mapTemplate(data);
  }

  async deleteTemplate(companyId: string, id: string): Promise<boolean> {
    const supabase = getSupabase();
    if (!supabase) return false;

    const { error } = await supabase
      .from('templates')
      .delete()
      .eq('company_id', companyId)
      .eq('id', id);

    return !error;
  }

  // ---------------------------------------------------------------------------
  // 9. MESSAGES
  // ---------------------------------------------------------------------------
  async getMessages(companyId: string): Promise<Message[]> {
    const supabase = getSupabase();
    if (!supabase) return [];

    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });

    if (error || !data) return [];
    return data.map(mapMessage);
  }

  async getMessageById(companyId: string, id: string): Promise<Message | null> {
    const supabase = getSupabase();
    if (!supabase) return null;

    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('company_id', companyId)
      .eq('id', id)
      .single();

    if (error || !data) return null;
    return mapMessage(data);
  }

  async createMessage(companyId: string, payload: Partial<Message>): Promise<Message | null> {
    const supabase = getSupabase();
    if (!supabase) return null;

    const id = payload.id || `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const record = {
      id,
      company_id: companyId,
      title: payload.title,
      content: payload.content || '',
      variables: payload.variables || [],
      template_id: payload.templateId,
      media_url: payload.mediaUrl,
      message_type: payload.messageType || 'TEXT',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('messages')
      .insert(record)
      .select()
      .single();

    if (error || !data) return null;
    return mapMessage(data);
  }

  // ---------------------------------------------------------------------------
  // 10. CAMPAIGNS & CAMPAIGN CONTACTS
  // ---------------------------------------------------------------------------
  async getCampaigns(companyId: string): Promise<Campaign[]> {
    const supabase = getSupabase();
    if (!supabase) return [];

    const { data, error } = await supabase
      .from('campaigns')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });

    if (error || !data) return [];
    return data.map(mapCampaign);
  }

  async getAllCampaigns(): Promise<Campaign[]> {
    const supabase = getSupabase();
    if (!supabase) return [];

    const { data, error } = await supabase
      .from('campaigns')
      .select('*')
      .order('created_at', { ascending: false });

    if (error || !data) return [];
    return data.map(mapCampaign);
  }

  async getCampaignById(companyId: string, id: string): Promise<Campaign | null> {
    const supabase = getSupabase();
    if (!supabase) return null;

    const { data, error } = await supabase
      .from('campaigns')
      .select('*')
      .eq('company_id', companyId)
      .eq('id', id)
      .single();

    if (error || !data) return null;
    return mapCampaign(data);
  }

  async createCampaign(companyId: string, payload: Partial<Campaign>): Promise<Campaign | null> {
    const supabase = getSupabase();
    if (!supabase) return null;

    const id = payload.id || `cmp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const record = {
      id,
      company_id: companyId,
      name: payload.name,
      message_id: payload.messageId,
      sender_phone: payload.senderPhone,
      status: payload.status || 'DRAFT',
      scheduled_at: payload.scheduledAt,
      started_at: payload.startedAt,
      completed_at: payload.completedAt,
      total_contacts: payload.totalContacts || 0,
      processed_count: payload.processedCount || 0,
      success_count: payload.successCount || 0,
      failed_count: payload.failedCount || 0,
      pending_count: payload.pendingCount || 0,
      settings: payload.settings || {
        messagesPerMinute: 60,
        retryOnFailure: true,
        maxRetries: 2,
        respectBusinessHours: true,
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('campaigns')
      .insert(record)
      .select()
      .single();

    if (error || !data) return null;
    return mapCampaign(data);
  }

  async updateCampaign(companyId: string, id: string, updates: Partial<Campaign>): Promise<Campaign | null> {
    const supabase = getSupabase();
    if (!supabase) return null;

    const dbPayload: any = {
      updated_at: new Date().toISOString(),
    };

    if (updates.status !== undefined) dbPayload.status = updates.status;
    if (updates.startedAt !== undefined) dbPayload.started_at = updates.startedAt;
    if (updates.completedAt !== undefined) dbPayload.completed_at = updates.completedAt;
    if (updates.processedCount !== undefined) dbPayload.processed_count = updates.processedCount;
    if (updates.successCount !== undefined) dbPayload.success_count = updates.successCount;
    if (updates.failedCount !== undefined) dbPayload.failed_count = updates.failedCount;
    if (updates.pendingCount !== undefined) dbPayload.pending_count = updates.pendingCount;

    const { data, error } = await supabase
      .from('campaigns')
      .update(dbPayload)
      .eq('company_id', companyId)
      .eq('id', id)
      .select()
      .single();

    if (error || !data) return null;
    return mapCampaign(data);
  }

  async getCampaignContacts(companyId: string, campaignId: string): Promise<CampaignContact[]> {
    const supabase = getSupabase();
    if (!supabase) return [];

    const { data, error } = await supabase
      .from('campaign_contacts')
      .select('*')
      .eq('company_id', companyId)
      .eq('campaign_id', campaignId);

    if (error || !data) return [];
    return data.map(mapCampaignContact);
  }

  async createCampaignContact(companyId: string, payload: Partial<CampaignContact>): Promise<CampaignContact | null> {
    const supabase = getSupabase();
    if (!supabase) return null;

    const id = payload.id || `cc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const record = {
      id,
      company_id: companyId,
      campaign_id: payload.campaignId,
      contact_id: payload.contactId,
      phone: payload.phone,
      status: payload.status || 'PENDING',
      rendered_content: payload.renderedContent || '',
      provider_message_id: payload.providerMessageId,
      sent_at: payload.sentAt,
      delivered_at: payload.deliveredAt,
      created_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('campaign_contacts')
      .insert(record)
      .select()
      .single();

    if (error || !data) return null;
    return mapCampaignContact(data);
  }

  // ---------------------------------------------------------------------------
  // 11. SUPPORT TICKETS & MESSAGES
  // ---------------------------------------------------------------------------
  async getSupportTickets(companyId?: string): Promise<SupportTicket[]> {
    const supabase = getSupabase();
    if (!supabase) return [];

    let query = supabase.from('support_tickets').select('*').order('created_at', { ascending: false });
    if (companyId) {
      query = query.eq('company_id', companyId);
    }

    const { data, error } = await query;
    if (error || !data) return [];
    return data.map(mapSupportTicket);
  }

  async getTicketById(id: string): Promise<SupportTicket | null> {
    const supabase = getSupabase();
    if (!supabase) return null;

    const { data, error } = await supabase
      .from('support_tickets')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) return null;
    return mapSupportTicket(data);
  }

  async createSupportTicket(companyId: string, payload: Partial<SupportTicket>): Promise<SupportTicket | null> {
    const supabase = getSupabase();
    if (!supabase) return null;

    const id = payload.id || `tkt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const record = {
      id,
      company_id: companyId,
      user_id: payload.userId,
      ticket_number: payload.ticketNumber || `SYN-${Math.floor(1000 + Math.random() * 9000)}`,
      subject: payload.subject,
      department: payload.department || 'SUPORTE_TECNICO',
      priority: payload.priority || 'MEDIUM',
      status: payload.status || 'OPEN',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('support_tickets')
      .insert(record)
      .select()
      .single();

    if (error || !data) return null;
    return mapSupportTicket(data);
  }

  async updateSupportTicket(id: string, updates: Partial<SupportTicket>): Promise<SupportTicket | null> {
    const supabase = getSupabase();
    if (!supabase) return null;

    const dbPayload: any = {
      updated_at: new Date().toISOString(),
    };
    if (updates.status !== undefined) dbPayload.status = updates.status;
    if (updates.priority !== undefined) dbPayload.priority = updates.priority;
    if (updates.assignedTo !== undefined) dbPayload.assigned_to = updates.assignedTo;
    if (updates.closedAt !== undefined) dbPayload.closed_at = updates.closedAt;

    const { data, error } = await supabase
      .from('support_tickets')
      .update(dbPayload)
      .eq('id', id)
      .select()
      .single();

    if (error || !data) return null;
    return mapSupportTicket(data);
  }

  async getSupportMessages(ticketId: string): Promise<SupportMessage[]> {
    const supabase = getSupabase();
    if (!supabase) return [];

    const { data, error } = await supabase
      .from('support_messages')
      .select('*')
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: true });

    if (error || !data) return [];
    return data.map(mapSupportMessage);
  }

  async createSupportMessage(ticketId: string, payload: Partial<SupportMessage>): Promise<SupportMessage | null> {
    const supabase = getSupabase();
    if (!supabase) return null;

    const id = payload.id || `smsg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const record = {
      id,
      ticket_id: ticketId,
      user_id: payload.userId,
      sender_type: payload.senderType || 'CLIENT',
      message: payload.message || '',
      attachments: payload.attachments || [],
      created_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('support_messages')
      .insert(record)
      .select()
      .single();

    if (error || !data) return null;
    return mapSupportMessage(data);
  }

  // ---------------------------------------------------------------------------
  // 12. BLACKLIST
  // ---------------------------------------------------------------------------
  async getBlacklist(companyId: string): Promise<BlacklistEntry[]> {
    const supabase = getSupabase();
    if (!supabase) return [];

    const { data, error } = await supabase
      .from('blacklist')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });

    if (error || !data) return [];
    return data.map(mapBlacklist);
  }

  async addToBlacklist(companyId: string, payload: Partial<BlacklistEntry>): Promise<BlacklistEntry | null> {
    const supabase = getSupabase();
    if (!supabase) return null;

    const id = payload.id || `bl_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const record = {
      id,
      company_id: companyId,
      phone: payload.phone,
      reason: payload.reason || '',
      added_by: payload.addedBy || 'Operador',
      created_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('blacklist')
      .insert(record)
      .select()
      .single();

    if (error || !data) return null;
    return mapBlacklist(data);
  }

  async removeFromBlacklist(companyId: string, id: string): Promise<boolean> {
    const supabase = getSupabase();
    if (!supabase) return false;

    const { error } = await supabase
      .from('blacklist')
      .delete()
      .eq('company_id', companyId)
      .eq('id', id);

    return !error;
  }

  // ---------------------------------------------------------------------------
  // 13. AUDIT LOGS
  // ---------------------------------------------------------------------------
  async getAuditLogs(filter?: { companyId?: string; action?: string }): Promise<AuditLog[]> {
    const supabase = getSupabase();
    if (!supabase) return [];

    let query = supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(100);

    if (filter?.companyId) {
      query = query.eq('company_id', filter.companyId);
    }
    if (filter?.action) {
      query = query.eq('action', filter.action);
    }

    const { data, error } = await query;
    if (error || !data) return [];
    return data.map(mapAuditLog);
  }

  async createAuditLog(payload: Partial<AuditLog>): Promise<AuditLog | null> {
    const supabase = getSupabase();
    if (!supabase) return null;

    const id = payload.id || `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const record = {
      id,
      company_id: payload.companyId,
      user_id: payload.userId,
      user_email: payload.userEmail || '',
      action: payload.action || 'ACTION',
      resource: payload.resource || 'System',
      resource_id: payload.resourceId,
      details: payload.details || '',
      ip_address: payload.ipAddress || '127.0.0.1',
      user_agent: payload.userAgent,
      created_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('audit_logs')
      .insert(record)
      .select()
      .single();

    if (error || !data) return null;
    return mapAuditLog(data);
  }

  // ---------------------------------------------------------------------------
  // 14. INTEGRATIONS
  // ---------------------------------------------------------------------------
  async getIntegrations(companyId: string): Promise<Integration[]> {
    const supabase = getSupabase();
    if (!supabase) return [];

    const { data, error } = await supabase
      .from('integrations')
      .select('*')
      .eq('company_id', companyId);

    if (error || !data) return [];
    return data.map(mapIntegration);
  }

  async createIntegration(companyId: string, payload: Partial<Integration>): Promise<Integration | null> {
    const supabase = getSupabase();
    if (!supabase) return null;

    const id = payload.id || `int_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const record = {
      id,
      company_id: companyId,
      provider_name: payload.providerName || 'Meta Cloud API Direct',
      provider_type: payload.providerType || 'WHATSAPP_OFFICIAL',
      status: payload.status || 'CONNECTED',
      sender_phone: payload.senderPhone,
      waba_id: payload.wabaId,
      api_key_masked: payload.apiKeyMasked,
      is_default: payload.isDefault !== false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('integrations')
      .insert(record)
      .select()
      .single();

    if (error || !data) return null;
    return mapIntegration(data);
  }

  async updateIntegration(companyId: string, id: string, updates: Partial<Integration>): Promise<Integration | null> {
    const supabase = getSupabase();
    if (!supabase) return null;

    const dbPayload: any = {
      updated_at: new Date().toISOString(),
    };
    if (updates.status !== undefined) dbPayload.status = updates.status;
    if (updates.senderPhone !== undefined) dbPayload.sender_phone = updates.senderPhone;
    if (updates.isDefault !== undefined) dbPayload.is_default = updates.isDefault;

    const { data, error } = await supabase
      .from('integrations')
      .update(dbPayload)
      .eq('company_id', companyId)
      .eq('id', id)
      .select()
      .single();

    if (error || !data) return null;
    return mapIntegration(data);
  }
}

export const supabaseService = SupabaseDatabaseService.getInstance();
