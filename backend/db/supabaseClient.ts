import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Cache client singleton instance
let supabaseClientInstance: SupabaseClient | null = null;

export interface SupabaseEnvConfig {
  SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  SUPABASE_ANON_KEY?: string;
}

/**
 * Initializes or returns the server-side Supabase client.
 * Uses SUPABASE_SERVICE_ROLE_KEY for administrative backend operations
 * and falls back to SUPABASE_ANON_KEY if needed.
 * 
 * Works seamlessly in both Cloudflare Workers (using c.env) and Node.js (using process.env).
 */
export function getSupabase(envConfig?: SupabaseEnvConfig): SupabaseClient | null {
  const supabaseUrl = envConfig?.SUPABASE_URL || (typeof process !== 'undefined' ? process.env?.SUPABASE_URL : undefined);
  const serviceRoleKey = envConfig?.SUPABASE_SERVICE_ROLE_KEY || envConfig?.SUPABASE_ANON_KEY || 
    (typeof process !== 'undefined' ? (process.env?.SUPABASE_SERVICE_ROLE_KEY || process.env?.SUPABASE_ANON_KEY) : undefined);

  if (!supabaseUrl || !serviceRoleKey) {
    if (!supabaseClientInstance) {
      console.warn('[Supabase] Warning: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not defined.');
    }
    return supabaseClientInstance;
  }

  // If we already have an instance with matching URL, reuse it
  if (supabaseClientInstance) {
    return supabaseClientInstance;
  }

  try {
    supabaseClientInstance = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    console.log('[Supabase] Server-side Supabase client initialized successfully.');
    return supabaseClientInstance;
  } catch (error) {
    console.error('[Supabase] Failed to initialize Supabase client:', error);
    return null;
  }
}

/**
 * Checks if Supabase credentials are configured in the environment.
 */
export function isSupabaseConfigured(envConfig?: SupabaseEnvConfig): boolean {
  const url = envConfig?.SUPABASE_URL || (typeof process !== 'undefined' ? process.env?.SUPABASE_URL : undefined);
  const key = envConfig?.SUPABASE_SERVICE_ROLE_KEY || envConfig?.SUPABASE_ANON_KEY || 
    (typeof process !== 'undefined' ? (process.env?.SUPABASE_SERVICE_ROLE_KEY || process.env?.SUPABASE_ANON_KEY) : undefined);
  return Boolean(url && key);
}

