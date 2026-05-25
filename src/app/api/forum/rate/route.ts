import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { getMaxAmount, fmtGC } from "@/lib/forum/ratingCap";

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { post_id, reply_id, gc_amount, reason } = await req.json();

  if (!post_id || gc_amount === undefined || gc_amount === 0) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  // Resolve recipient: reply author if reply_id given, else post author
  let recipient_id: string | null = null;

  if (reply_id) {
    const { data: reply } = await supabase
      .from("forum_replies")
      .select("user_id")
      .eq("id", reply_id)
      .single();
    if (!reply) return NextResponse.json({ error: "Reply not found" }, { status: 404 });
    recipient_id = reply.user_id;
  } else {
    const { data: post } = await supabase
      .from("forum_posts")
      .select("user_id")
      .eq("id", post_id)
      .single();
    if (!post) return NextResponse.json({ error: "Post not found" }, { status: 404 });
    recipient_id = post.user_id;
  }

  if (!recipient_id) {
    return NextResponse.json({ error: "Target has no author" }, { status: 400 });
  }
  if (recipient_id === user.id) {
    return NextResponse.json({ error: "Cannot rate your own content" }, { status: 403 });
  }

  // Fetch recipient's GC balance and compute per-transaction cap
  const { data: recipient } = await supabase
    .from("users")
    .select("gc_balance")
    .eq("id", recipient_id)
    .single();
  const recipientBalance = recipient?.gc_balance ?? 0;
  const maxAmount = getMaxAmount(recipientBalance);

  if (Math.abs(gc_amount) > maxAmount) {
    return NextResponse.json(
      { error: `单次最多 ±${fmtGC(maxAmount)} GC（基于对方的财富等级）` },
      { status: 400 },
    );
  }

  // Check rater has enough GC for a reward
  if (gc_amount > 0) {
    const { data: rater } = await supabase
      .from("users")
      .select("gc_balance")
      .eq("id", user.id)
      .single();
    if (!rater || rater.gc_balance < gc_amount) {
      return NextResponse.json({ error: "Insufficient GC balance" }, { status: 402 });
    }
  }

  const { error } = await supabase
    .from("forum_ratings")
    .insert({
      post_id,
      reply_id:     reply_id ?? null,
      user_id:      user.id,
      recipient_id,
      gc_amount,
      reason:       reason?.trim() || null,
    });

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "Already rated this content" }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Fire-and-forget: notify recipient
  supabase.from("notifications").insert({
    user_id:   recipient_id,
    type:      "rating",
    actor_id:  user.id,
    post_id:   post_id ?? null,
    reply_id:  reply_id ?? null,
    gc_amount,
    reason:    reason?.trim() || null,
  }).then(() => {});

  return NextResponse.json({ ok: true });
}
