import Link from "next/link";
import { LoadError, SetupNotice } from "@/components/setup-notice";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import type { Tag } from "@/lib/types";
import { ListsEditor } from "./lists-editor";

export default async function SettingsPage() {
  let tags: Tag[] = [];
  let error: string | null = null;

  if (isSupabaseConfigured) {
    const supabase = await createClient();
    const res = await supabase.from("tags").select("*").order("label");
    error = res.error?.message ?? null;
    tags = (res.data as Tag[]) ?? [];
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-muted">
          The vocabulary the app offers you. Everything here started as a
          placeholder — none of it is authoritative, and it&apos;s meant to
          become yours.{" "}
          <Link
            href="/settings/systems"
            className="text-accent hover:underline"
          >
            Trading systems →
          </Link>
        </p>
      </div>
      {!isSupabaseConfigured ? (
        <SetupNotice />
      ) : error ? (
        <LoadError message={error} />
      ) : (
        <>
          <ListsEditor tags={tags} />
          <p className="text-xs text-faint">
            Trades store these as text, not as references. Renaming or removing
            an entry changes what the app suggests from now on; it leaves
            logged trades alone unless you explicitly ask otherwise.
          </p>
        </>
      )}
    </div>
  );
}
