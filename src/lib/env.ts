export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

/**
 * The app must render (with a setup notice) before Supabase is configured,
 * so every client factory and the auth proxy check this first.
 */
export const isSupabaseConfigured =
  supabaseUrl.length > 0 && supabaseAnonKey.length > 0;

/**
 * Which of the two required variables are absent, so the setup notice can
 * name them rather than making you check both. Names only — never values.
 */
export const missingSupabaseVars: string[] = [
  ...(supabaseUrl.length > 0 ? [] : ["NEXT_PUBLIC_SUPABASE_URL"]),
  ...(supabaseAnonKey.length > 0 ? [] : ["NEXT_PUBLIC_SUPABASE_ANON_KEY"]),
];
