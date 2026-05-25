import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getMaxAmount } from "@/lib/forum/ratingCap";

/**
 * POST /api/profile/transfer
 * Transfer GC between users — same cap logic as forum ratings.
 *
 * Body: { target_user_id: string, gc_amount: number (+ = give, - = deduct), reason?: string }
 *
 * Rules:
 *  - |gc_amount| ≤ getMaxAmount(recipientBalance)
 *  - Give (+): sender must have enough balance; deducted from sender, added to recipient
 *  - Deduct (-): deducted from recipient, added to sender (admin-style or mutual agreement)
 *  - Cannot transfer to self
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { target_user_id, gc_amount, reason } = body as {
    target_user_id: string;
    gc_amount:      number;
    reason?:        string;
  };

  if (!target_user_id || typeof gc_amount !== "number" || gc_amount === 0) {
    return NextResponse.json({ error: "Invalid params" }, { status: 400 });
  }

  if (target_user_id === user.id) {
    return NextResponse.json({ error: "Cannot transfer to yourself" }, { status: 400 });
  }

  const absAmount = Math.abs(gc_amount);

  // Fetch both users
  const [{ data: sender }, { data: recipient }] = await Promise.all([
    supabase.from("users").select("id, gc_balance, nickname").eq("id", user.id).single(),
    supabase.from("users").select("id, gc_balance, nickname").eq("id", target_user_id).single(),
  ]);

  if (!sender || !recipient) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Cap based on recipient balance
  const maxAmount = getMaxAmount(recipient.gc_balance ?? 0);
  if (absAmount > maxAmount) {
    return NextResponse.json(
      { error: `Amount exceeds limit (max ${maxAmount.toLocaleString()} GC)` },
      { status: 400 },
    );
  }

  const isGive = gc_amount > 0;

  if (isGive) {
    // Sender must have enough balance
    if ((sender.gc_balance ?? 0) < absAmount) {
      return NextResponse.json({ error: "Insufficient balance" }, { status: 400 });
    }

    // Deduct from sender, add to recipient
    const { error: e1 } = await supabase
      .from("users")
      .update({ gc_balance: (sender.gc_balance ?? 0) - absAmount })
      .eq("id", sender.id);

    const { error: e2 } = await supabase
      .from("users")
      .update({ gc_balance: (recipient.gc_balance ?? 0) + absAmount })
      .eq("id", recipient.id);

    if (e1 || e2) {
      return NextResponse.json({ error: "Transfer failed" }, { status: 500 });
    }

    // Transaction logs
    await supabase.from("transactions").insert([
      {
        user_id: sender.id,
        type:    "transfer_sent",
        amount:  -absAmount,
        description: `Transfer to ${recipient.nickname}${reason ? `: ${reason}` : ""}`,
      },
      {
        user_id: recipient.id,
        type:    "transfer_received",
        amount:  absAmount,
        description: `Transfer from ${sender.nickname}${reason ? `: ${reason}` : ""}`,
      },
    ]);

    // Notification to recipient
    supabase.from("notifications").insert({
      user_id:  recipient.id,
      type:     "rating",
      actor_id: sender.id,
      gc_amount: absAmount,
      reason:   reason?.trim() || null,
    }).then(() => {});

  } else {
    // Deduct mode: take from recipient, give to sender
    // Recipient must have enough balance (no negative)
    if ((recipient.gc_balance ?? 0) < absAmount) {
      return NextResponse.json({ error: "Target has insufficient balance" }, { status: 400 });
    }

    const { error: e1 } = await supabase
      .from("users")
      .update({ gc_balance: (recipient.gc_balance ?? 0) - absAmount })
      .eq("id", recipient.id);

    const { error: e2 } = await supabase
      .from("users")
      .update({ gc_balance: (sender.gc_balance ?? 0) + absAmount })
      .eq("id", sender.id);

    if (e1 || e2) {
      return NextResponse.json({ error: "Transfer failed" }, { status: 500 });
    }

    // Transaction logs
    await supabase.from("transactions").insert([
      {
        user_id: sender.id,
        type:    "transfer_received",
        amount:  absAmount,
        description: `Deducted from ${recipient.nickname}${reason ? `: ${reason}` : ""}`,
      },
      {
        user_id: recipient.id,
        type:    "transfer_sent",
        amount:  -absAmount,
        description: `Deducted by ${sender.nickname}${reason ? `: ${reason}` : ""}`,
      },
    ]);

    // Notification to recipient
    supabase.from("notifications").insert({
      user_id:  recipient.id,
      type:     "rating",
      actor_id: sender.id,
      gc_amount: -absAmount,
      reason:   reason?.trim() || null,
    }).then(() => {});
  }

  return NextResponse.json({ ok: true });
}
