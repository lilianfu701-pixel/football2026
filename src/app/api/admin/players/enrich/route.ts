/**
 * POST /api/admin/players/enrich
 * Backfills player photo_url + bio_en + bio_zh from Wikipedia.
 *
 * Processes a small batch per call (avoids serverless timeout); the client
 * loops until `remaining` reaches 0. By default only fills players that are
 * still missing a photo or an English bio. Pass { force: true } to re-fetch all.
 *
 * Body: { force?: boolean, batch?: number }
 */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { fetchWikiSummary } from "@/lib/wikipedia";

const DEFAULT_BATCH = 15;
const MAX_BATCH = 30;

interface PlayerLite {
  id: number;
  name: string;
  name_zh: string | null;
  photo_url: string | null;
  bio_en: string | null;
  bio_zh: string | null;
}

export async function POST(req: Request) {
  // Auth: must be admin
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: me } = await supabase
    .from("users")
    .select("is_admin")
    .eq("id", user.id)
    .single();
  if (!me?.is_admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = (await req.json().catch(() => ({}))) as {
    force?: boolean;
    batch?: number;
    afterId?: number;
  };
  const force = body.force === true;
  const batch = Math.min(Math.max(body.batch ?? DEFAULT_BATCH, 1), MAX_BATCH);
  const afterId = Number.isFinite(body.afterId) ? Number(body.afterId) : 0;

  const service = createServiceClient();

  // Pick players needing enrichment.
  // - Non-force: rows still missing photo_url OR bio_en (filter shrinks each call).
  // - Force: walk all rows by id cursor (afterId), re-fetching everything.
  let query = service
    .from("players")
    .select("id, name, name_zh, photo_url, bio_en, bio_zh")
    .order("id")
    .limit(batch);
  if (force) {
    query = query.gt("id", afterId);
  } else {
    query = query.or("photo_url.is.null,bio_en.is.null");
  }

  const { data: players, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = (players ?? []) as PlayerLite[];

  let updatedPhotos = 0;
  let updatedBios = 0;
  let processed = 0;

  for (const p of rows) {
    processed++;

    // EN by english name; ZH by chinese name (fallback to english name)
    const [en, zh] = await Promise.all([
      fetchWikiSummary(p.name, "en"),
      fetchWikiSummary(p.name_zh?.trim() || p.name, "zh"),
    ]);

    const patch: Record<string, string> = {};

    const photo = en.photoUrl ?? zh.photoUrl;
    if (photo && (force || !p.photo_url)) {
      patch.photo_url = photo;
    }
    if (en.extract && (force || !p.bio_en)) {
      patch.bio_en = en.extract;
    }
    if (zh.extract && (force || !p.bio_zh)) {
      patch.bio_zh = zh.extract;
    }

    if (Object.keys(patch).length > 0) {
      const { error: upErr } = await service
        .from("players")
        .update(patch)
        .eq("id", p.id);
      if (!upErr) {
        if (patch.photo_url) updatedPhotos++;
        if (patch.bio_en || patch.bio_zh) updatedBios++;
      }
    }
  }

  const lastId = rows.length ? rows[rows.length - 1].id : afterId;

  // How many still need work after this batch?
  let remaining = 0;
  if (!force) {
    const { count } = await service
      .from("players")
      .select("id", { count: "exact", head: true })
      .or("photo_url.is.null,bio_en.is.null");
    remaining = count ?? 0;
  } else {
    // Force mode: rows with id beyond our cursor still to visit.
    const { count: totalAfter } = await service
      .from("players")
      .select("id", { count: "exact", head: true })
      .gt("id", lastId);
    remaining = totalAfter ?? 0;
  }

  return NextResponse.json({
    ok: true,
    processed,
    updated_photos: updatedPhotos,
    updated_bios: updatedBios,
    remaining,
    next_after_id: lastId,
    done: rows.length < batch || remaining === 0,
  });
}
