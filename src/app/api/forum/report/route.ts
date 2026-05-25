import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// POST { post_id?, reply_id?, reason, detail? }
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { post_id, reply_id, reason, detail } =
    (await req.json()) as { post_id?: number; reply_id?: number; reason: string; detail?: string };

  const validReasons = ["spam", "abuse", "misleading", "illegal", "other"];
  if (!validReasons.includes(reason)) return NextResponse.json({ error: "Invalid reason" }, { status: 400 });
  if (!post_id && !reply_id) return NextResponse.json({ error: "Missing target" }, { status: 400 });

  // Prevent duplicate report from same user
  const query = supabase.from("forum_reports").select("id").eq("reporter_id", user.id);
  if (reply_id) query.eq("reply_id", reply_id);
  else          query.eq("post_id", post_id!);
  const { data: existing } = await query.maybeSingle();
  if (existing) return NextResponse.json({ error: "already_reported" }, { status: 409 });

  const { error } = await supabase.from("forum_reports").insert({
    reporter_id: user.id,
    post_id:     post_id ?? null,
    reply_id:    reply_id ?? null,
    reason,
    detail:      detail ?? null,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
