-- =============================================================================
-- SYNTECH DC - SUPABASE POSTGRESQL SCHEMA & ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================================================

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Ensure RLS is active on all core tables
ALTER TABLE IF EXISTS companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS plans ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies: Multi-Tenant Isolation by company_id
-- Policy for Companies: Users can only see their own company unless admin
CREATE POLICY "Users can view their own company"
  ON companies
  FOR SELECT
  USING (
    auth.uid() IN (SELECT id FROM profiles WHERE company_id = companies.id)
    OR (auth.jwt() ->> 'role') IN ('ADMIN', 'MANAGER', 'SUPPORT')
  );

-- Policy for Contacts: Strict isolation by company_id
CREATE POLICY "Contacts tenant isolation"
  ON contacts
  FOR ALL
  USING (
    company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
    OR (auth.jwt() ->> 'role') IN ('ADMIN', 'MANAGER')
  );

-- Policy for Campaigns: Strict isolation by company_id
CREATE POLICY "Campaigns tenant isolation"
  ON campaigns
  FOR ALL
  USING (
    company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
    OR (auth.jwt() ->> 'role') IN ('ADMIN', 'MANAGER')
  );

-- Policy for Support Tickets: Strict isolation by company_id
CREATE POLICY "Support Tickets tenant isolation"
  ON support_tickets
  FOR ALL
  USING (
    company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
    OR (auth.jwt() ->> 'role') IN ('ADMIN', 'MANAGER', 'SUPPORT')
  );

-- Policy for Subscriptions: Read-only for tenant, full management for Admins
CREATE POLICY "Subscriptions view policy"
  ON subscriptions
  FOR SELECT
  USING (
    company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
    OR (auth.jwt() ->> 'role') IN ('ADMIN', 'MANAGER')
  );

-- Note: The backend Express API utilizes the secure SUPABASE_SERVICE_ROLE_KEY
-- server-side to enforce business rules and multi-tenant authorization filters,
-- while the public anon client is restricted to authenticated users.
