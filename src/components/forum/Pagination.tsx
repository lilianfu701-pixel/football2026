import Link from "next/link";
import { lc } from "@/i18n/content";

interface Props {
  page:       number;
  totalPages: number;
  buildHref:  (page: number) => string;
  zh?:        boolean;
  locale:     string;
}

/** Generate the list of page-number tokens to show.
 *  Always includes: 1, last, and a window of ±2 around current.
 *  Inserts "…" gap tokens where needed.
 */
function buildPageList(current: number, total: number): (number | "…")[] {
  if (total <= 1) return [];
  const set = new Set<number>();
  set.add(1);
  set.add(total);
  for (let i = Math.max(1, current - 2); i <= Math.min(total, current + 2); i++) set.add(i);

  const sorted = [...set].sort((a, b) => a - b);
  const result: (number | "…")[] = [];
  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && sorted[i] - sorted[i - 1] > 1) result.push("…");
    result.push(sorted[i]);
  }
  return result;
}

export default function ForumPagination({ page, totalPages, buildHref, zh, locale }: Props) {
  if (totalPages <= 1) return null;
  const tokens = buildPageList(page, totalPages);

  const btnBase =
    "inline-flex items-center justify-center min-w-[32px] h-8 px-2 rounded-lg text-xs font-bold transition-colors";
  const btnActive  = `${btnBase} bg-[#FFD700] text-[#0A1628] pointer-events-none`;
  const btnNormal  = `${btnBase} bg-[#0F2040] border border-[#1E3A5F] text-gray-400 hover:text-white hover:border-[#1E3A5F]/80`;
  const btnDisabled = `${btnBase} bg-[#0A1628] border border-[#1E3A5F]/30 text-gray-700 pointer-events-none`;

  return (
    <div className="flex items-center justify-center gap-1 mt-6 flex-wrap">

      {/* First */}
      {page > 1 ? (
        <Link href={buildHref(1)} className={btnNormal} title={lc(locale, "首页", "First")}>
          «
        </Link>
      ) : (
        <span className={btnDisabled}>«</span>
      )}

      {/* Prev */}
      {page > 1 ? (
        <Link href={buildHref(page - 1)} className={btnNormal} title={lc(locale, "上一页", "Previous")}>
          ‹
        </Link>
      ) : (
        <span className={btnDisabled}>‹</span>
      )}

      {/* Page numbers */}
      {tokens.map((t, i) =>
        t === "…" ? (
          <span key={`ellipsis-${i}`} className="inline-flex items-center justify-center w-7 h-8 text-gray-600 text-xs">
            …
          </span>
        ) : t === page ? (
          <span key={t} className={btnActive}>{t}</span>
        ) : (
          <Link key={t} href={buildHref(t)} className={btnNormal}>{t}</Link>
        )
      )}

      {/* Next */}
      {page < totalPages ? (
        <Link href={buildHref(page + 1)} className={btnNormal} title={lc(locale, "下一页", "Next")}>
          ›
        </Link>
      ) : (
        <span className={btnDisabled}>›</span>
      )}

      {/* Last */}
      {page < totalPages ? (
        <Link href={buildHref(totalPages)} className={btnNormal} title={lc(locale, "尾页", "Last")}>
          »
        </Link>
      ) : (
        <span className={btnDisabled}>»</span>
      )}

      {/* Page info */}
      <span className="ml-2 text-xs text-gray-600">
        {zh ? `第 ${page} / ${totalPages} 页` : `Page ${page} of ${totalPages}`}
      </span>
    </div>
  );
}
