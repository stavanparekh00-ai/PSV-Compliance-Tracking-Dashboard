import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

/**
 * "Cloud mode" is active when both Supabase env vars are set. In that mode the
 * app shares one live dataset across everyone who signs in. Otherwise the app
 * runs in local mode (single static password + per-browser localStorage).
 */
export const isSupabaseConfigured = Boolean(url && anonKey);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url as string, anonKey as string)
  : null;

/** Primary key of the single shared state row. */
export const STATE_ROW_ID = 'singleton';
export const STATE_TABLE = 'app_state';
