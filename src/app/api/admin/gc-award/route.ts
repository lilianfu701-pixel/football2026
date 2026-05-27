import { NextRequest, NextResponse } from "next/server";
import { createClient }              from "@/lib/supabase/server";
import { createServiceClient }       from "@/lib/supabase/service";

export async function POST(req: NextRequest) {
  // ── Auth: admin only ──────────────────────────────────────────────────────
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: me } = await supabase
    .from("users")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!me?.is_admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // ── Validate body ─────────────────────────────────────────────────────────
  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { user_id, gc_amount, action, note } = body as {
    user_id:   string;
    gc_amount: number;
    action:    string;
    note?:     string;
  };

  if (!user_id || typeof user_id !== "string") {
    return NextResponse.json({ error: "user_id required" }, { status: 400 });
  }
  if (typeof gc_amount !== "number" || !Number.isInteger(gc_amount) || gc_amount <= 0) {
    return NextResponse.json({ error: "gc_amount must be a positive integer" }, { status: 400 });
  }
  if (action !== "award" && action !== "deduct") {
    return NextResponse.json({ error: "action must be award or deduct" }, { status: 400 });
  }

  const service = createServiceClient();

  // ── Verify target user exists ─────────────────────────────────────────────
  const { data: target } = await service
    .from("users")
    .select("id, gc_balance")
    .eq("id", user_id)
    .single();

  if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 });

  // ── Perform atomic operation ──────────────────────────────────────────────
  const txType = action === "award" ? "admin_award" : "admin_deduct";
  const txNote = note?.trim() || (action === "award" ? "Admin award" : "Admin deduct");

  if (action === "award") {
    const { data: newBal, error } = await service.rpc("gc_credit_atomic", {
      p_user_id: user_id,
      p_amount:  gc_amount,
      p_tx_type: txType,
      p_desc:    txNote,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, new_balance: newBal });
  } else {
    const { data: newBal, error } = await service.rpc("gc_deduct_atomic", {
      p_user_id: user_id,
      p_amount:  gc_amount,
      p_tx_type: txType,
      p_desc:    txNote,
    });
    if (error) {
      if (error.message?.includes("insufficient_balance")) {
        return NextResponse.json({ error: "Insufficient GC balance" }, { status: 400 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true, new_balance: newBal });
  }
}
