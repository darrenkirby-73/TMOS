/**
 * Supabase configuration.
 *
 * Server code reads these at request time, so saving them in the hosting
 * dashboard is enough — but only for pages that are actually rendered per
 * request. A page prerendered into static HTML captures whatever this said
 * during the build, and keeps serving that. Every authenticated page is
 * therefore pinned dynamic in src/app/(app)/layout.tsx.
 */

// Trimmed: a trailing newline or space survives a copy-paste into a hosting
// dashboard and is invisible in every UI that shows it back to you.
export const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim();
export const supabaseAnonKey = (
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ""
).trim();

/**
 * Characters that cannot survive the trip.
 *
 * The anon key goes out as an HTTP header, and header values are Latin-1 —
 * anything above U+00FF throws `Cannot convert argument to a ByteString`
 * from deep inside fetch, naming a byte offset and nothing else. That is an
 * unreadable way to learn you pasted a dashboard label along with the key,
 * so catch it here where we can say which variable and which character.
 */
function badCharacter(name: string, value: string): string | null {
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i);
    if (code > 126 || code < 32) {
      const shown = code > 126 ? value[i] : "a control character";
      const point = `U+${code.toString(16).toUpperCase().padStart(4, "0")}`;
      return `${name} contains ${shown} (${point}) at position ${i}. Supabase URLs and keys are plain ASCII — this usually means dashboard text was copied along with the value.`;
    }
  }
  return null;
}

function badUrl(value: string): string | null {
  if (value === "") return null;
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return `NEXT_PUBLIC_SUPABASE_URL is not a URL. It should look like https://<project-ref>.supabase.co`;
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    return `NEXT_PUBLIC_SUPABASE_URL must be an http(s) URL, not ${parsed.protocol}`;
  }
  return null;
}

/**
 * Problems that make the configuration certain to fail, as opposed to
 * merely absent. Only conditions that cannot possibly work are listed — a
 * false positive here would take the app down.
 */
export const configProblems: string[] = [
  badCharacter("NEXT_PUBLIC_SUPABASE_URL", supabaseUrl),
  badCharacter("NEXT_PUBLIC_SUPABASE_ANON_KEY", supabaseAnonKey),
  badUrl(supabaseUrl),
].filter((problem): problem is string => problem !== null);

/**
 * Which of the two required variables are absent, so the setup notice can
 * name them rather than making you check both. Names only — never values.
 */
export const missingSupabaseVars: string[] = [
  ...(supabaseUrl.length > 0 ? [] : ["NEXT_PUBLIC_SUPABASE_URL"]),
  ...(supabaseAnonKey.length > 0 ? [] : ["NEXT_PUBLIC_SUPABASE_ANON_KEY"]),
];

/**
 * The app must render (with a setup notice) before Supabase is configured,
 * so every client factory and the auth proxy check this first. Unusable
 * configuration counts as unconfigured: the notice can explain itself, an
 * exception from inside fetch cannot.
 */
export const isSupabaseConfigured =
  missingSupabaseVars.length === 0 && configProblems.length === 0;
