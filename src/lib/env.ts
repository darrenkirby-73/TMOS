/**
 * Supabase configuration.
 *
 * Server code reads these at request time, so saving them in the hosting
 * dashboard is enough — but only for pages that are actually rendered per
 * request. A page prerendered into static HTML captures whatever this said
 * during the build, and keeps serving that. Every authenticated page is
 * therefore pinned dynamic in src/app/(app)/layout.tsx.
 */
export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

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
