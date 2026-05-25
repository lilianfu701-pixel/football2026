import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ balance: 0 });

  const { data } = await supabase
    .from("users")
    .select("gc_balance")
    .eq("id", user.id)
    .single();

  return NextResponse.json({ balance: data?.gc_balance ?? 0 });
}
