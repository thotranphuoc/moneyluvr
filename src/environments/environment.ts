/**
 * Default env (dev). For local dev, run: SUPABASE_URL=... SUPABASE_ANON_KEY=... node scripts/generate-env.js
 * Then use the generated file, or set keys here only locally (do not commit keys).
 */
export const environment = {
  production: false,
  supabase: {
    url: '',
    anonKey: ''
  }
};
