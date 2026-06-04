/**
 * Wikipedia enrichment helper.
 * Fetches a player's lead photo + intro summary from Wikipedia (EN / ZH)
 * via the public MediaWiki API. Best-effort: returns nulls on any miss.
 *
 * Wikipedia requires a descriptive User-Agent or it returns 403.
 */

const USER_AGENT =
  "Football2026/1.0 (https://football2026.net; support@football2026.net)";

export interface WikiSummary {
  /** Thumbnail image URL from upload.wikimedia.org, or null */
  photoUrl: string | null;
  /** Plain-text intro paragraph, trimmed, or null */
  extract: string | null;
}

interface MwPage {
  pageid?: number;
  title?: string;
  missing?: string;
  extract?: string;
  thumbnail?: { source?: string };
}

interface MwResponse {
  query?: {
    pages?: Record<string, MwPage>;
  };
}

const MAX_EXTRACT_CHARS = 600;

/**
 * Query one Wikipedia language edition for a single title.
 * Uses redirects=1 so short names ("梅西", "Messi") resolve to the full article.
 */
export async function fetchWikiSummary(
  title: string,
  lang: "en" | "zh",
): Promise<WikiSummary> {
  const empty: WikiSummary = { photoUrl: null, extract: null };
  const clean = title.trim();
  if (!clean) return empty;

  const params = new URLSearchParams({
    action: "query",
    format: "json",
    prop: "pageimages|extracts",
    piprop: "thumbnail",
    pithumbsize: "400",
    exintro: "1",
    explaintext: "1",
    redirects: "1",
    titles: clean,
    formatversion: "2",
  });

  const url = `https://${lang}.wikipedia.org/w/api.php?${params.toString()}`;

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
      // Wikipedia data is stable enough; avoid caching stale empties aggressively
      next: { revalidate: 0 },
    });
    if (!res.ok) return empty;

    const json = (await res.json()) as MwResponse;
    // formatversion=2 returns pages as an array
    const pagesObj = json.query?.pages;
    const pages: MwPage[] = Array.isArray(pagesObj)
      ? (pagesObj as MwPage[])
      : Object.values(pagesObj ?? {});

    const page = pages[0];
    if (!page || page.missing !== undefined) return empty;

    let extract = (page.extract ?? "").trim();
    // Skip disambiguation pages
    if (/may refer to:|消歧义/.test(extract)) extract = "";
    if (extract.length > MAX_EXTRACT_CHARS) {
      extract = extract.slice(0, MAX_EXTRACT_CHARS).trimEnd() + "…";
    }

    return {
      photoUrl: page.thumbnail?.source ?? null,
      extract: extract || null,
    };
  } catch {
    return empty;
  }
}
