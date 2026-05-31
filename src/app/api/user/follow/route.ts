import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// POST /api/user/follow  { target_id }  → follow
// DELETE /api/user/follow?target_id=xxx  → unfollow
// GET /api/user/follow?target_id=xxx  → { following: bool, followerCount, followingCount }

export async function GET(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { searchParams } = new URL(req.url);
  const targetId = searchParams.get("target_id");

  if (!targetId) return NextResponse.json({ error: "Missing target_id" }, { status: 400 });

  const [followRes, targetRes] = await Promise.all([
    user
      ? supabase.from("user_follows")
          .select("id")
          .eq("follower_id", user.id)
          .eq("following_id", targetId)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    supabase.from("users")
      .select("follower_count, following_count")
      .eq("id", targetId)
      .single(),
  ]);

  return NextResponse.json({
    following:      !!followRes.data,
    followerCount:  targetRes.data?.follower_count  ?? 0,
    followingCount: targetRes.data?.following_count ?? 0,
  });
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { target_id } = await req.json();
  if (!target_id || target_id === user.id) {
    return NextResponse.json({ error: "Invalid target" }, { status: 400 });
  }

  // Insert follow (ignore if already exists via ON CONFLICT DO NOTHING)
  const { error } = await supabase.from("user_follows").insert({
    follower_id:  user.id,
    following_id: target_id,
  });

  if (error && error.code !== "23505") {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Sync counts manually (since trigger dollar-quoting fails in some envs)
  await Promise.all([
    (async () => {
      const { error: rpcErr } = await supabase.rpc("increment_follow_counts", {
        p_follower_id:  user.id,
        p_following_id: target_id,
        p_delta: 1,
      });
      if (rpcErr) {
        // Fallback: direct update if RPC not available
        const { data: td } = await supabase.from("users").select("follower_count, id").eq("id", target_id).single();
        if (td) await supabase.from("users").update({ follower_count: ((td as { follower_count?: number }).follower_count ?? 0) + 1 }).eq("id", target_id);
        const { data: fd } = await supabase.from("users").select("following_count, id").eq("id", user.id).single();
        if (fd) await supabase.from("users").update({ following_count: ((fd as { following_count?: number }).following_count ?? 0) + 1 }).eq("id", user.id);
      }
    })(),
  ]);

  // Notify the followed user
  supabase.from("notifications").insert({
    user_id:  target_id,
    type:     "follow",
    actor_id: user.id,
  }).then(() => {});

  // Return updated counts
  const { data: target } = await supabase
    .from("users").select("follower_count, following_count").eq("id", target_id).single();

  return NextResponse.json({
    following:     true,
    followerCount: target?.follower_count ?? 0,
  });
}

export async function DELETE(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const targetId = searchParams.get("target_id");
  if (!targetId) return NextResponse.json({ error: "Missing target_id" }, { status: 400 });

  const { error } = await supabase.from("user_follows")
    .delete()
    .eq("follower_id", user.id)
    .eq("following_id", targetId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Sync counts (same fallback approach)
  const decrement = async (id: string, field: "follower_count" | "following_count") => {
    const { data } = await supabase.from("users").select(`${field}, id`).eq("id", id).single();
    if (data) await supabase.from("users").update({ [field]: Math.max(0, ((data as Record<string, number>)[field] ?? 0) - 1) }).eq("id", id);
  };
  await Promise.all([
    decrement(targetId, "follower_count"),
    decrement(user.id,  "following_count"),
  ]);

  const { data: target } = await supabase
    .from("users").select("follower_count, following_count").eq("id", targetId).single();

  return NextResponse.json({
    following:     false,
    followerCount: target?.follower_count ?? 0,
  });
}
