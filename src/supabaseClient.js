import { createClient } from '@supabase/supabase-js';
import supabaseConfig from '../supabase-config';

const supabase = createClient(supabaseConfig.url, supabaseConfig.anonKey);

export default supabase;
