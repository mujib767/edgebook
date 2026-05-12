import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

function createSupabaseClient() {
  const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;

  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
    const missing = [
      ...(!SUPABASE_URL ? ['SUPABASE_URL'] : []),
      ...(!SUPABASE_PUBLISHABLE_KEY ? ['SUPABASE_PUBLISHABLE_KEY'] : []),
    ];
    throw new Error(`Missing Supabase environment variable(s): ${missing.join(', ')}`);
  }

  // Use ws package for server-side WebSocket support (Node.js < 22)
  const isServer = typeof window === 'undefined';
  
  return createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: {
      storage: isServer ? undefined : localStorage,
      persistSession: true,
      autoRefreshToken: true,
    },
    realtime: isServer ? {
      transport: require('ws'),
    } : undefined,
  });
}

let _supabase: ReturnType<typeof createSupabaseClient> | undefined;

export const supabase = new Proxy({} as ReturnType<typeof createSupabaseClient>, {
  get(_, prop, receiver) {
    if (!_supabase) _supabase = createSupabaseClient();
    return Reflect.get(_supabase, prop, receiver);
  },
});