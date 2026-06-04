/**
 * GET  /api/admin/players  — paginated list with optional search & team filter
 * POST /api/admin/players  — create a new player
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: me } = await supabase
    .from("users").select("is_admin").eq("id", user.id).single();
  return me?.is_admin ? supabase : null;
}

export async function GET(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const q    = searchParams.get("q") ?? "";
  const team = searchParams.get("team") ?? "";
  const pos  = searchParams.get("position") ?? "";
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const size = 50;
  const from = (page - 1) * size;

  const service = createServiceClient();
  let query = service
    .from("players")
    .select("*", { count: "exact" })
    .order("team", { ascending: true })
    .order("position", { ascending: true })
    .order("name", { ascending: true })
    .range(from, from + size - 1);

  if (q) query = query.or(`name.ilike.%${q}%,name_zh.ilike.%${q}%,club.ilike.%${q}%`);
  if (team) query = query.eq("team", team);
  if (pos)  query = query.eq("position", pos);

  const { data, count, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data, count, page, size });
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as Record<string, unknown>;
  const service = createServiceClient();

  const { data, error } = await service
    .from("players")
    .insert({
      name:          body.name,
      name_zh:       body.name_zh ?? null,
      team:          body.team,
      country_code:  body.country_code ?? null,
      position:      body.position ?? null,
      shirt_number:  body.shirt_number ?? null,
      club:          body.club ?? null,
      age:           body.age ?? null,
      date_of_birth: body.date_of_birth ?? null,
      height_cm:     body.height_cm ?? null,
      market_value:  body.market_value ?? null,
      photo_url:     body.photo_url ?? null,
      bio_en:        body.bio_en ?? null,
      bio_zh:        body.bio_zh ?? null,
      golden_boot:   body.golden_boot ?? false,
      golden_ball:   body.golden_ball ?? false,
      golden_glove:  body.golden_glove ?? false,
      best_young:    body.best_young ?? false,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data }, { status: 201 });
}
