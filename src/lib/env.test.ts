import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * env.ts reads process.env at module scope, so each case needs a fresh
 * import with the environment already in place.
 */
async function loadEnv(vars: Record<string, string | undefined>) {
  vi.resetModules();
  for (const [k, v] of Object.entries(vars)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  return import("./env");
}

const original = { ...process.env };
beforeEach(() => vi.resetModules());
afterEach(() => {
  process.env = { ...original };
});

const KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.body.sig";
const URL_OK = "https://njhisvelihjilrwmlnpv.supabase.co";

describe("supabase config validation", () => {
  it("accepts a well-formed pair", async () => {
    const env = await loadEnv({
      NEXT_PUBLIC_SUPABASE_URL: URL_OK,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: KEY,
    });
    expect(env.isSupabaseConfigured).toBe(true);
    expect(env.configProblems).toEqual([]);
    expect(env.missingSupabaseVars).toEqual([]);
  });

  it("trims whitespace that survives a paste", async () => {
    const env = await loadEnv({
      NEXT_PUBLIC_SUPABASE_URL: `  ${URL_OK}\n`,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: `${KEY} `,
    });
    expect(env.supabaseUrl).toBe(URL_OK);
    expect(env.supabaseAnonKey).toBe(KEY);
    expect(env.isSupabaseConfigured).toBe(true);
  });

  it("names the non-ASCII character rather than letting fetch throw", async () => {
    // U+2192 RIGHTWARDS ARROW — what a copied "Settings → API" label leaves
    // behind. Header values are Latin-1, so this fails inside fetch with a
    // byte offset and no variable name.
    const env = await loadEnv({
      NEXT_PUBLIC_SUPABASE_URL: URL_OK,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "Settings → API",
    });
    expect(env.isSupabaseConfigured).toBe(false);
    expect(env.configProblems).toHaveLength(1);
    expect(env.configProblems[0]).toContain("NEXT_PUBLIC_SUPABASE_ANON_KEY");
    expect(env.configProblems[0]).toContain("U+2192");
    expect(env.configProblems[0]).toContain("position 9");
    // Not reported as absent — it is present, just unusable.
    expect(env.missingSupabaseVars).toEqual([]);
  });

  it("rejects a url that isn't one", async () => {
    const env = await loadEnv({
      NEXT_PUBLIC_SUPABASE_URL: "njhisvelihjilrwmlnpv.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: KEY,
    });
    expect(env.isSupabaseConfigured).toBe(false);
    expect(env.configProblems[0]).toContain("not a URL");
  });

  it("still reports genuinely absent variables as missing", async () => {
    const env = await loadEnv({
      NEXT_PUBLIC_SUPABASE_URL: undefined,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: undefined,
    });
    expect(env.isSupabaseConfigured).toBe(false);
    expect(env.missingSupabaseVars).toEqual([
      "NEXT_PUBLIC_SUPABASE_URL",
      "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    ]);
    expect(env.configProblems).toEqual([]);
  });
});
