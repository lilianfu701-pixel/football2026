import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/forum/mention-search?q=xxx
// Returns up to 8 users matching the nickname prefix (must be logged in)
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json([], { status: 200 });

  const q = (req.nextUrl.searchParams.get("q") ?? "").trim();
  if (!q) return NextResponse.json([]);

  const { data } = await supabase
    .from("users")
    .select("id, nickname, avatar_url")
    .ilike("nickname", `${q}%`)
    .neq("id", user.id)
    .limit(8);

  return NextResponse.json(data ?? []);
}
