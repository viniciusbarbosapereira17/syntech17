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
  SupportTicket,
  SupportMessage,
  BlacklistEntry,
  AuditLog,
  Integration
} from '../../shared/types.js';

class ApiService {
  private getHeaders(): HeadersInit {
    const token = localStorage.getItem('syntech_token') || '';
    const userId = localStorage.getItem('syntech_user_id') || '';
    const companyId = localStorage.getItem('syntech_company_id') || '';

    return {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : '',
      'x-user-id': userId,
      'x-company-id': companyId,
    };
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const res = await fetch(endpoint, {
      ...options,
      headers: {
        ...this.getHeaders(),
        ...options.headers,
      },
    });

    if (!res.ok) {
      let errorMsg = 'Erro na requisição com o servidor.';
      try {
        const errorData = await res.json();
        errorMsg = errorData.error || errorData.message || errorMsg;
      } catch (e) {
        // fallback to status text
        errorMsg = res.statusText || errorMsg;
      }
      throw new Error(errorMsg);
    }

    return res.json();
  }

  // AUTH
  async login(email: string, password?: string) {
    return this.request<{ token: string; user: User; company?: Company }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  async adminLogin(email: string, password?: string) {
    return this.request<{ token: string; user: User }>('/api/auth/admin-login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  async register(data: any) {
    return this.request<{ token: string; user: User; company: Company }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getMe() {
    return this.request<{
      user: User;
      company?: Company;
      subscription?: Subscription;
      plan?: Plan;
      availableTenants?: { id: string; name: string; status: string }[];
    }>('/api/auth/me');
  }

  // CLIENT PORTAL
  async getDashboard() {
    return this.request<{
      company: Company;
      subscription: Subscription;
      plan: Plan;
      metrics: any;
      recentCampaigns: Campaign[];
      openTickets: SupportTicket[];
    }>('/api/portal/dashboard');
  }

  async getContacts(params?: { search?: string; tag?: string; listId?: string }) {
    const query = new URLSearchParams();
    if (params?.search) query.set('search', params.search);
    if (params?.tag) query.set('tag', params.tag);
    if (params?.listId) query.set('listId', params.listId);
    return this.request<{ total: number; contacts: Contact[] }>(`/api/portal/contacts?${query.toString()}`);
  }

  async createContact(data: Partial<Contact>) {
    return this.request<Contact>('/api/portal/contacts', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateContact(id: string, data: Partial<Contact>) {
    return this.request<Contact>(`/api/portal/contacts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteContact(id: string) {
    return this.request<{ message: string }>(`/api/portal/contacts/${id}`, {
      method: 'DELETE',
    });
  }

  async importContacts(contacts: any[], listId?: string, tags?: string[]) {
    return this.request<{ message: string; imported: number; duplicates: number; totalNow: number }>(
      '/api/portal/contacts/import',
      {
        method: 'POST',
        body: JSON.stringify({ contacts, listId, tags }),
      }
    );
  }

  async getLists() {
    return this.request<ContactList[]>('/api/portal/lists');
  }

  async createList(data: { name: string; description?: string }) {
    return this.request<ContactList>('/api/portal/lists', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateList(id: string, data: { name?: string; description?: string }) {
    return this.request<ContactList>(`/api/portal/lists/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteList(id: string) {
    return this.request<{ message: string }>(`/api/portal/lists/${id}`, {
      method: 'DELETE',
    });
  }

  async getTemplates() {
    return this.request<Template[]>('/api/portal/templates');
  }

  async createTemplate(data: Partial<Template>) {
    return this.request<Template>('/api/portal/templates', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async deleteTemplate(id: string) {
    return this.request<{ message: string }>(`/api/portal/templates/${id}`, {
      method: 'DELETE',
    });
  }

  async getMessages() {
    return this.request<Message[]>('/api/portal/messages');
  }

  async createMessage(data: Partial<Message>) {
    return this.request<Message>('/api/portal/messages', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async previewMessage(content: string, sampleData?: Record<string, string>) {
    return this.request<{ rendered: string }>('/api/portal/messages/preview', {
      method: 'POST',
      body: JSON.stringify({ content, sampleData }),
    });
  }

  async getCampaigns() {
    return this.request<Campaign[]>('/api/portal/campaigns');
  }

  async getCampaignDetails(id: string) {
    return this.request<{ campaign: Campaign; message?: Message; contactsQueue: any[]; totalQueue: number }>(
      `/api/portal/campaigns/${id}`
    );
  }

  async createCampaign(data: any) {
    return this.request<Campaign>('/api/portal/campaigns', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async campaignAction(id: string, action: 'pause' | 'resume' | 'cancel' | 'dispatch_step') {
    return this.request<Campaign>(`/api/portal/campaigns/${id}/action`, {
      method: 'POST',
      body: JSON.stringify({ action }),
    });
  }

  async getReportsSummary() {
    return this.request<any>('/api/portal/reports/summary');
  }

  async getSubscription() {
    return this.request<{
      company: Company;
      subscription: Subscription;
      plan: Plan;
      payments: Payment[];
      availablePlans: Plan[];
    }>('/api/portal/subscription');
  }

  async upgradeSubscription(planId: string, paymentMethod: string) {
    return this.request<{ message: string; plan: Plan; payment: Payment }>('/api/portal/subscription/upgrade', {
      method: 'POST',
      body: JSON.stringify({ planId, paymentMethod }),
    });
  }

  async getTickets() {
    return this.request<SupportTicket[]>('/api/portal/support/tickets');
  }

  async getTicketDetails(id: string) {
    return this.request<{ ticket: SupportTicket; messages: SupportMessage[] }>(`/api/portal/support/tickets/${id}`);
  }

  async createTicket(data: { subject: string; department: string; priority: string; message: string }) {
    return this.request<SupportTicket>('/api/portal/support/tickets', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async addTicketMessage(ticketId: string, message: string) {
    return this.request<SupportMessage>(`/api/portal/support/tickets/${ticketId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ message }),
    });
  }

  async getProfile() {
    return this.request<{ company: Company; users: User[]; integrations: Integration[] }>('/api/portal/profile');
  }

  async updateProfile(data: Partial<Company>) {
    return this.request<Company>('/api/portal/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async getBlacklist() {
    return this.request<BlacklistEntry[]>('/api/portal/blacklist');
  }

  async addToBlacklist(phone: string, reason: string) {
    return this.request<BlacklistEntry>('/api/portal/blacklist', {
      method: 'POST',
      body: JSON.stringify({ phone, reason }),
    });
  }

  async removeFromBlacklist(id: string) {
    return this.request<{ message: string }>(`/api/portal/blacklist/${id}`, {
      method: 'DELETE',
    });
  }

  // ADMIN ENDPOINTS
  async getAdminDashboard() {
    return this.request<any>('/api/admin/dashboard');
  }

  async getAdminCompanies(params?: { status?: string; search?: string }) {
    const query = new URLSearchParams();
    if (params?.status) query.set('status', params.status);
    if (params?.search) query.set('search', params.search);
    return this.request<any[]>(`/api/admin/clientes?${query.toString()}`);
  }

  async createAdminCompany(data: any) {
    return this.request<Company>('/api/admin/clientes', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateAdminCompany(id: string, data: any) {
    return this.request<Company>(`/api/admin/clientes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async resetClientAccess(id: string) {
    return this.request<{ message: string; resetLink: string }>(`/api/admin/clientes/${id}/reset-access`, {
      method: 'POST',
    });
  }

  async getAdminUsers(params?: { role?: string; companyId?: string }) {
    const query = new URLSearchParams();
    if (params?.role) query.set('role', params.role);
    if (params?.companyId) query.set('companyId', params.companyId);
    return this.request<any[]>(`/api/admin/usuarios?${query.toString()}`);
  }

  async createAdminUser(data: any) {
    return this.request<User>('/api/admin/usuarios', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateAdminUser(id: string, data: any) {
    return this.request<User>(`/api/admin/usuarios/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async getAdminPlans() {
    return this.request<Plan[]>('/api/admin/planos');
  }

  async createAdminPlan(data: any) {
    return this.request<Plan>('/api/admin/planos', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateAdminPlan(id: string, data: any) {
    return this.request<Plan>(`/api/admin/planos/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async getAdminSubscriptions() {
    return this.request<any[]>('/api/admin/assinaturas');
  }

  async updateAdminSubscription(id: string, data: any) {
    return this.request<Subscription>(`/api/admin/assinaturas/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async getAdminPayments() {
    return this.request<any[]>('/api/admin/pagamentos');
  }

  async getAdminSupport() {
    return this.request<SupportTicket[]>('/api/admin/suporte');
  }

  async getAdminTickets(_params?: { status?: string }) {
    return this.request<SupportTicket[]>('/api/admin/suporte');
  }

  async getAdminTicketDetails(id: string) {
    return this.request<{ ticket: SupportTicket; messages: SupportMessage[] }>(`/api/portal/support/tickets/${id}`);
  }

  async updateAdminTicket(id: string, data: any) {
    return this.request<SupportTicket>(`/api/admin/suporte/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async addAdminTicketMessage(ticketId: string, message: string) {
    return this.request<SupportMessage>(`/api/admin/suporte/${ticketId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ message }),
    });
  }

  async adminReplyTicket(ticketId: string, message: string, status?: string) {
    if (status) {
      await this.updateAdminTicket(ticketId, { status });
    }
    return this.addAdminTicketMessage(ticketId, message);
  }

  async getAdminCampaigns() {
    return this.request<any[]>('/api/admin/campanhas');
  }

  async getAdminLogs(params?: { companyId?: string; action?: string }) {
    const query = new URLSearchParams();
    if (params?.companyId) query.set('companyId', params.companyId);
    if (params?.action) query.set('action', params.action);
    return this.request<AuditLog[]>(`/api/admin/logs?${query.toString()}`);
  }

  async getAdminSettings() {
    return this.request<any>('/api/admin/configuracoes');
  }
}

export const api = new ApiService();
