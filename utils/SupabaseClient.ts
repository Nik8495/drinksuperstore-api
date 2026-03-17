import { createClient } from '@supabase/supabase-js';
import './loadEnv.js';

const supabaseUrl = process.env['SUPABASE_URL'] || '';
const supabaseServiceKey = process.env['SUPABASE_SERVICE_ROLE_KEY'] || '';
const supabaseAnonKey = process.env['SUPABASE_ANON_KEY'] || '';

// Admin client (service role) for server-side DB operations
export const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// Public client for auth sign-in flows
export const supabaseAnon = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
