import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** Redirects to a short-lived signed URL for one of the user's screenshots. */
export async function GET(request: NextRequest) {
  const path = request.nextUrl.searchParams.get("path");
  if (!path) return new NextResponse("Missing path", { status: 400 });

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });
  if (!path.startsWith(`${user.id}/`))
    return new NextResponse("Forbidden", { status: 403 });

  const { data, error } = await supabase.storage
    .from("trade-screenshots")
    .createSignedUrl(path, 60 * 60);
  if (error || !data)
    return new NextResponse(error?.message ?? "Not found", { status: 404 });

  return NextResponse.redirect(data.signedUrl);
}
