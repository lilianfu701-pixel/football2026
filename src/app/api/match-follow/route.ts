import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// POST { match_id, following: bool }
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { match_id, following } = (await req.json()) as { match_id: number; following: boolean };
  if (!match_id) return NextResponse.json({ error: "Invalid params" }, { status: 400 });

  if (following) {
    await supabase.from("match_follows").upsert(
      { user_id: user.id, match_id },
      { onConflict: "user_id,match_id" }
    );
  } else {
    await supabase.from("match_follows")
      .delete()
      .eq("user_id", user.id)
      .eq("match_id", match_id);
  }

  return NextResponse.json({ ok: true });
}
