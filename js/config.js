// ══════════════════════════════════════════════════════════
// SUPABASE CONFIGURATION
// ══════════════════════════════════════════════════════════
// Replace these with your Supabase project credentials.
// 1. Go to https://supabase.com → New Project
// 2. Go to Settings → API
// 3. Copy the "Project URL" and "anon public" key below
// ══════════════════════════════════════════════════════════

const SUPABASE_URL = 'YOUR_SUPABASE_URL';       // e.g. https://xyzcompany.supabase.co
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY'; // e.g. eyJhbGci...

// Initialize Supabase client
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
