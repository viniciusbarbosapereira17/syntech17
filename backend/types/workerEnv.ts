import { User } from '../../shared/types.js';

export type Bindings = {
  SUPABASE_URL?: string;
  SUPABASE_ANON_KEY?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  JWT_SECRET?: string;
  FRONTEND_URL?: string;
  NODE_ENV?: string;
  ASSETS?: {
    fetch: (request: Request) => Promise<Response>;
  };
};

export type Variables = {
  user?: User;
  companyId?: string;
};

export type HonoContextEnv = {
  Bindings: Bindings;
  Variables: Variables;
};
