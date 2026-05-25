import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data: me } = await supabase.from("users").select("is_admin").eq("id", user.id).single();
  if (!me?.is_admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { report_id, status } = (await req.json()) as { report_id: number; status: string };
  if (!report_id || !["reviewed", "dismissed"].includes(status))
    return NextResponse.json({ error: "Invalid params" }, { status: 400 });

  const { error } = await supabase.from("forum_reports").update({ status }).eq("id", report_id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
