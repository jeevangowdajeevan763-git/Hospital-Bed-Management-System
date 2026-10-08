// Get these from Supabase: Project Settings > API
const SUPABASE_URL = "https://ogiyfjozusjxzvwjpmxy.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_4z1pFGVvWqJuy0rknKiDxg_zGgWXgiM";

// "db" is used by all other JS files
const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);