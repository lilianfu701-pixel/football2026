import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/messages?with=userId  — fetch conversation with a user
// GET /api/messages               — fetch inbox (latest message per conversation)
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const withUserId = req.nextUrl.searchParams.get("with");

  if (withUserId) {
    // Full conversation
    const { data, error } = await supabase
      .from("messages")
      .select("id, sender_id, receiver_id, content, is_read, created_at")
      .or(`and(sender_id.eq.${user.id},receiver_id.eq.${withUserId}),and(sender_id.eq.${withUserId},receiver_id.eq.${user.id})`)
      .order("created_at", { ascending: true });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Mark as read
    await supabase.from("messages")
      .update({ is_read: true })
      .eq("sender_id", withUserId)
      .eq("receiver_id", user.id)
      .eq("is_read", false);

    return NextResponse.json(data);
  }

  // Inbox: get all conversations (latest message per other user)
  const { data, error } = await supabase
    .from("messages")
    .select("id, sender_id, receiver_id, content, is_read, created_at")
    .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Deduplicate by conversation partner
  const seen = new Set<string>();
  const inbox = (data ?? []).filter((m) => {
    const partner = m.sender_id === user.id ? m.receiver_id : m.sender_id;
    if (seen.has(partner)) return false;
    seen.add(partner);
    return true;
  });

  return NextResponse.json(inbox);
}

// POST { receiver_id, content }
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { receiver_id, content } = (await req.json()) as { receiver_id: string; content: string };
  if (!receiver_id || !content?.trim()) return NextResponse.json({ error: "Invalid params" }, { status: 400 });
  if (receiver_id === user.id) return NextResponse.json({ error: "Cannot message yourself" }, { status: 400 });

  const { data, error } = await supabase.from("messages")
    .insert({ sender_id: user.id, receiver_id, content: content.trim() })
    .select("id, created_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Send notification
  await supabase.from("notifications").insert({
    user_id:      receiver_id,
    actor_id:     user.id,
    type:         "message",
    post_id:      null,
    reply_id:     null,
    message:      content.trim().slice(0, 100),
  }).then(() => null, () => null);

  return NextResponse.json({ ok: true, id: data.id });
}
