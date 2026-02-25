/**
 * Generates environment.production.ts from env vars (used by production build).
 * Set SUPABASE_URL and SUPABASE_ANON_KEY (e.g. in Vercel or locally).
 * npm run build runs this then ng build.
 */
const fs = require('fs');
const path = require('path');

const url = process.env.SUPABASE_URL || '';
const anonKey = process.env.SUPABASE_ANON_KEY || '';

const envDir = path.join(__dirname, '..', 'src', 'environments');

const content = `export const environment = {
  production: true,
  supabase: {
    url: '${url.replace(/'/g, "\\'")}',
    anonKey: '${anonKey.replace(/'/g, "\\'")}'
  }
};
`;

if (!fs.existsSync(envDir)) fs.mkdirSync(envDir, { recursive: true });

fs.writeFileSync(path.join(envDir, 'environment.production.ts'), content, 'utf8');

console.log('Generated environment.production.ts from env.');
