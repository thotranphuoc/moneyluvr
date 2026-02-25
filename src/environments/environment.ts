/**
 * Default env (dev). For local dev, run: SUPABASE_URL=... SUPABASE_ANON_KEY=... node scripts/generate-env.js
 * Then use the generated file, or set keys here only locally (do not commit keys).
 */
export const environment = {
  production: false,
  supabase: {
    url: 'https://qugibmbrwskzjnbgnalm.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF1Z2libWJyd3NrempuYmduYWxtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE4OTc2NTMsImV4cCI6MjA4NzQ3MzY1M30.Sb6qiRoA_XbRMT8Js4xNxNSFWAFS23Wbn4EMfcCraqI'
  }
};
