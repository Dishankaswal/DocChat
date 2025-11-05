const { createClient } = require('@supabase/supabase-js');
const config = require('./supabase-config');

// Create Supabase client
const supabase = createClient(config.url, config.anonKey);

// For server-side operations (keep service role key secret!)
const supabaseAdmin = createClient(config.url, config.serviceRoleKey);

module.exports = {
  supabase,
  supabaseAdmin
};

