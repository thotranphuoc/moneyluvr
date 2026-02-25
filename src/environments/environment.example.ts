/**
 * Copy or use: SUPABASE_URL=... SUPABASE_ANON_KEY=... node scripts/generate-env.js
 * Then environment.production.ts is generated for production build.
 * Get URL and anon key from Supabase Dashboard → Project Settings → API.
 */
export const environment = {
  production: false,
  supabase: {
    url: '',
    anonKey: ''
  }
};
