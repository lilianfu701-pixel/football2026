/**
 * POST /api/forum/translate
 * Body: { type: "post_content"|"post_title"|"reply_content", id, target_lang }
 *
 * Supports any target language (zh, en, es, pt, ar, fr, de, ja, ko, …).
 * Uses forum_translations table for caching — no per-column schema changes needed.
 *
 * Returns: { translated, source_lang, cached }
 */
import { createClient } from "@/lib/supabase/server";
import { NextResponse }  from "next/server";
import { LANGUAGES }     from "@/lib/languages";

// ── DeepL language map ───────────────────────────────────────────────────────
function toDeepLCode(lang: string): string {
  const found = LANGUAGES.find((l) => l.code === lang);
  return found?.deepl ?? lang.toUpperCase();
}

// ── Google language map ──────────────────────────────────────────────────────
function toGoogleCode(lang: string): string {
  const found = LANGUAGES.find((l) => l.code === lang);
  return found?.google ?? lang;
}

// ── Providers ─────────────────────────────────────────────────────────────────
const DEEPL_URL  = "https://api-free.deepl.com/v2/translate";
const GOOGLE_URL = "https://translation.googleapis.com/language/translate/v2";

async function translateDeepL(
  text: string, targetLang: string,
): Promise<{ translated: string; source_lang: string }> {
  const res = await fetch(DEEPL_URL, {
    method:  "POST",
    headers: {
      "Authorization": `DeepL-Auth-Key ${process.env.DEEPL_API_KEY!}`,
      "Content-Type":  "application/json",
    },
    body: JSON.stringify({ text: [text], target_lang: toDeepLCode(targetLang) }),
  });
  if (!res.ok) throw new Error(`DeepL ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const t    = data.translations?.[0];
  return {
    translated:  (t?.text ?? "") as string,
    source_lang: ((t?.detected_source_language ?? "").toLowerCase() as string),
  };
}

async function translateGoogle(
  text: string, targetLang: string,
): Promise<{ translated: string; source_lang: string }> {
  const res = await fetch(`${GOOGLE_URL}?key=${process.env.GOOGLE_TRANSLATE_KEY!}`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ q: text, target: toGoogleCode(targetLang), format: "html" }),
  });
  if (!res.ok) throw new Error(`Google ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const t    = data.data?.translations?.[0];
  return {
    translated:  (t?.translatedText ?? "") as string,
    source_lang: ((t?.detectedSourceLanguage ?? "").toLowerCase() as string),
  };
}

async function translate(
  text: string, targetLang: string,
): Promise<{ translated: string; source_lang: string }> {
  if (process.env.DEEPL_API_KEY)        return translateDeepL(text, targetLang);
  if (process.env.GOOGLE_TRANSLATE_KEY)  return translateGoogle(text, targetLang);
  throw new Error("NO_PROVIDER: set DEEPL_API_KEY or GOOGLE_TRANSLATE_KEY in .env.local");
}

// ── Route handler ─────────────────────────────────────────────────────────────
export async function POST(req: Request) {
  const supabase = await createClient();

  let body: { type?: string; id?: number; target_lang?: string };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Bad JSON" }, { status: 400 }); }

  const { type, id, target_lang } = body;
  if (!type || !id || !target_lang) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const VALID_TYPES = ["post_content", "post_title", "reply_content"] as const;
  if (!VALID_TYPES.includes(type as (typeof VALID_TYPES)[number])) {
    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  }

  // ── 1. Check forum_translations cache ──────────────────────────────────────
  const { data: cached } = await supabase
    .from("forum_translations")
    .select("content")
    .eq("type", type)
    .eq("source_id", id)
    .eq("lang", target_lang)
    .maybeSingle();

  if (cached?.content) {
    return NextResponse.json({ translated: cached.content, cached: true });
  }

  // ── 2. Fetch source text from appropriate table ────────────────────────────
  const isTitle    = type === "post_title";
  const isReply    = type === "reply_content";
  const table      = isReply ? "forum_replies" : "forum_posts";
  const srcCol     = isTitle ? "title" : "content";

  const { data: row } = await supabase
    .from(table)
    .select(srcCol)
    .eq("id", id)
    .single();

  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const sourceText = (row as Record<string, string | null>)[srcCol] ?? "";
  if (!sourceText.trim()) {
    return NextResponse.json({ error: "Empty source text" }, { status: 400 });
  }

  // Strip <img> tags before translating — they don't need translation,
  // break URL encoding, and waste API quota.
  const textToTranslate = sourceText.replace(/<img[^>]*>/gi, "");
  if (!textToTranslate.trim()) {
    return NextResponse.json({ error: "Empty source text" }, { status: 400 });
  }

  // ── 3. Translate ───────────────────────────────────────────────────────────
  let result: { translated: string; source_lang: string };
  try {
    result = await translate(textToTranslate, target_lang);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Translation failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  // ── 4. Skip caching if source == target (no real translation happened) ─────
  const srcNorm = result.source_lang.split("-")[0].toLowerCase(); // "en-us" → "en"
  if (srcNorm && srcNorm === target_lang.toLowerCase()) {
    return NextResponse.json({
      translated:   sourceText,
      source_lang:  result.source_lang,
      same_language: true,
      cached:       false,
    });
  }

  // ── 5. Cache in forum_translations ────────────────────────────────────────
  await supabase.from("forum_translations").upsert({
    type,
    source_id:  id,
    lang:       target_lang,
    content:    result.translated,
    created_at: new Date().toISOString(),
  }, { onConflict: "type,source_id,lang" });

  return NextResponse.json({
    translated:  result.translated,
    source_lang: result.source_lang,
    cached:      false,
  });
}
