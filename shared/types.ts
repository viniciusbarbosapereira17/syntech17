export type UserRole = 
  | 'ADMIN' 
  | 'MANAGER' 
  | 'SUPPORT' 
  | 'OPERATOR' 
  | 'CLIENT_ADMIN' 
  | 'CLIENT_MEMBER';

export type CompanyStatus = 'ACTIVE' | 'SUSPENDED' | 'BLOCKED' | 'TRIAL';

export type SubscriptionStatus = 'ACTIVE' | 'TRIAL' | 'EXPIRED' | 'CANCELLED' | 'SUSPENDED';

export type CampaignStatus = 
  | 'DRAFT' 
  | 'SCHEDULED' 
  | 'RUNNING' 
  | 'PAUSED' 
  | 'COMPLETED' 
  | 'CANCELLED' 
  | 'FAILED';

export type MessageStatus = 
  | 'PENDING' 
  | 'QUEUED' 
  | 'SENT' 
  | 'DELIVERED' 
  | 'READ' 
  | 'FAILED';

export type TicketStatus = 
  | 'OPEN' 
  | 'IN_PROGRESS' 
  | 'WAITING_CLIENT' 
  | 'RESOLVED' 
  | 'CLOSED';

export type TicketPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export type TicketDepartment = 'COMERCIAL' | 'SUPORTE_TECNICO' | 'FINANCEIRO' | 'INTEGRACOES';

export interface Company {
  id: string;
  name: string;
  tradeName: string;
  cnpj: string;
  email: string;
  phone: string;
  status: CompanyStatus;
  planId: string;
  monthlyQuota: number;
  usedQuota: number;
  contactLimit: number;
  contactCount: number;
  senderPhone?: string;
  senderVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  companyId: string;
  name: string;
  email: string;
  role: UserRole;
  phone?: string;
  avatarUrl?: string;
  isActive: boolean;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Plan {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  interval: 'MONTHLY' | 'ANNUAL';
  messageQuota: number;
  contactLimit: number;
  maxSenders: number;
  features: string[];
  isPopular?: boolean;
  isPublic: boolean;
  createdAt: string;
}

export interface Subscription {
  id: string;
  companyId: string;
  planId: string;
  status: SubscriptionStatus;
  amount: number;
  interval: 'MONTHLY' | 'ANNUAL';
  currentPeriodStart: string;
  currentPeriodEnd: string;
  autoRenew: boolean;
  paymentMethod: 'PIX' | 'CREDIT_CARD' | 'BOLETO';
  createdAt: string;
  updatedAt: string;
}

export interface Payment {
  id: string;
  companyId: string;
  subscriptionId: string;
  amount: number;
  status: 'PAID' | 'PENDING' | 'FAILED' | 'REFUNDED';
  paymentMethod: 'PIX' | 'CREDIT_CARD' | 'BOLETO';
  invoiceUrl?: string;
  receiptNumber: string;
  paidAt?: string;
  dueDate: string;
  createdAt: string;
}

export interface Contact {
  id: string;
  companyId: string;
  name: string;
  phone: string;
  email?: string;
  store?: string;
  city?: string;
  product?: string;
  customAttributes?: Record<string, string>;
  tags: string[];
  listIds: string[];
  isBlacklisted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ContactList {
  id: string;
  companyId: string;
  name: string;
  description?: string;
  contactCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface Template {
  id: string;
  companyId: string;
  name: string;
  category: 'MARKETING' | 'UTILITY' | 'AUTHENTICATION' | 'NOTIFICATION';
  content: string;
  variables: string[];
  status: 'APPROVED' | 'PENDING' | 'REJECTED';
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  companyId: string;
  title: string;
  content: string;
  variables: string[];
  templateId?: string;
  mediaUrl?: string;
  messageType: 'TEXT' | 'IMAGE' | 'DOCUMENT' | 'AUDIO';
  createdAt: string;
  updatedAt: string;
}

export interface CampaignSettings {
  messagesPerMinute: number;
  retryOnFailure: boolean;
  maxRetries: number;
  respectBusinessHours: boolean;
  businessHoursStart?: string;
  businessHoursEnd?: string;
}

export interface Campaign {
  id: string;
  companyId: string;
  name: string;
  messageId: string;
  listIds: string[];
  senderId?: string;
  senderPhone?: string;
  status: CampaignStatus;
  scheduledAt?: string;
  startedAt?: string;
  completedAt?: string;
  totalContacts: number;
  processedCount: number;
  successCount: number;
  failedCount: number;
  pendingCount: number;
  settings: CampaignSettings;
  createdAt: string;
  updatedAt: string;
}

export interface CampaignContact {
  id: string;
  campaignId: string;
  companyId: string;
  contactId: string;
  contactName: string;
  phone: string;
  status: MessageStatus;
  renderedContent: string;
  errorReason?: string;
  providerMessageId?: string;
  sentAt?: string;
  deliveredAt?: string;
  readAt?: string;
}

export interface SupportTicket {
  id: string;
  companyId: string;
  companyName: string;
  userId: string;
  userName: string;
  userEmail: string;
  ticketNumber: string;
  subject: string;
  department: TicketDepartment;
  priority: TicketPriority;
  status: TicketStatus;
  assignedTo?: string;
  assignedName?: string;
  createdAt: string;
  updatedAt: string;
  closedAt?: string;
}

export interface SupportMessage {
  id: string;
  ticketId: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  senderType: 'CLIENT' | 'SUPPORT_AGENT';
  message: string;
  attachments?: string[];
  createdAt: string;
}

export interface Notification {
  id: string;
  companyId: string;
  userId?: string;
  title: string;
  message: string;
  type: 'INFO' | 'WARNING' | 'ALERT' | 'SUCCESS';
  isRead: boolean;
  link?: string;
  createdAt: string;
}

export interface BlacklistEntry {
  id: string;
  companyId: string;
  phone: string;
  reason: string;
  addedBy: string;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  companyId?: string;
  companyName?: string;
  userId: string;
  userEmail: string;
  action: string;
  resource: string;
  resourceId?: string;
  details: string;
  ipAddress: string;
  userAgent?: string;
  createdAt: string;
}

export interface Integration {
  id: string;
  companyId: string;
  providerName: string;
  providerType: 'WHATSAPP_OFFICIAL' | 'Z_API' | 'EVOLUTION' | 'WEBHOOK';
  status: 'CONNECTED' | 'DISCONNECTED' | 'ERROR';
  senderPhone?: string;
  wabaId?: string;
  apiKeyMasked?: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}
