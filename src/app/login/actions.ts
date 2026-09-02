"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function signIn(formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }

  // Seed the starter tags once per sign-in rather than on every page view.
  // The function is a no-op as soon as any tags exist, so edits are never
  // re-seeded.
  //
  // Wrapped because this must not block signing in. rpc() reports a Postgres
  // error in its result, but a transport failure, a timeout, or a missing
  // function throws — and an unhandled throw here takes down the whole sign-in
  // even though the credentials were already accepted above. Getting in
  // without your starter tags beats not getting in.
  try {
    await supabase.rpc("seed_defaults");
  } catch {
    // Non-fatal by design.
  }

  revalidatePath("/", "layout");
  redirect("/");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}
