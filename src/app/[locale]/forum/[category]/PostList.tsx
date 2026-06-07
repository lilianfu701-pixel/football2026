"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { getWealthLevel } from "@/lib/levels";
import { needsTranslation } from "@/lib/languages";
import { lc } from "@/i18n/content";

export interface PostItem {
  id:            number;
  title:         string;
  is_pinned:     boolean;
  is_locked:     boolean;
  is_featured?:  boolean;
  view_count:    number;
  reply_count:   number;
  like_count:    number;
  last_reply_at: string | null;
  created_at:    string;
  user_id:       string | null;
  author?: {
    id:         string;
    nickname:   string;
    avatar_url: string | null;
    gc_balance: number;
  };
}

type TagRow = { id: number; name: string; name_zh: string | null; color: string | null };

interface Props {
  posts:               PostItem[];
  cachedTranslations:  Record<number, string>; // postId → translated title
  postTagsMap?:        Record<number, TagRow[]>;
  locale:              string;
  zh:                  boolean;
  catSlug:             string;
}

function timeAgo(dateStr: string, zh: boolean, locale: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  const h = Math.floor(diff / 3600000);
  const d = Math.floor(diff / 86400000);
  if (m < 1)  return lc(locale, "刚刚", "just now");
  if (m < 60) return zh ? `${m}分钟前` : `${m}m ago`;
  if (h < 24) return zh ? `${h}小时前` : `${h}h ago`;
  if (d < 30) return zh ? `${d}天前`   : `${d}d ago`;
  return new Date(dateStr).toLocaleDateString(zh ? "zh-CN" : "en-US", { month: "short", day: "numeric" });
}

const BATCH   = 4;   // concurrent translation requests per tick
const STAGGER = 400; // ms between batches

export default function PostList({ posts, cachedTranslations, postTagsMap = {}, locale, zh, catSlug }: Props) {
  const [trans,   setTrans]   = useState<Record<number, string>>(cachedTranslations);
  const [loading, setLoading] = useState<Set<number>>(new Set());
  const fetchedRef = useRef<Set<number>>(new Set());
  const noProviderRef = useRef(false);

  // Auto-fetch missing translations for titles in a different language
  useEffect(() => {
    if (noProviderRef.current) return;

    const queue = posts.filter((p) =>
      !trans[p.id] &&
      !fetchedRef.current.has(p.id) &&
      needsTranslation(p.title, locale),
    );
    if (!queue.length) return;

    // Mark all as queued immediately so re-renders don't re-queue
    queue.forEach((p) => fetchedRef.current.add(p.id));

    async function fetchOne(p: PostItem) {
      try {
        const res  = await fetch("/api/forum/translate", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ type: "post_title", id: p.id, target_lang: locale }),
        });
        const data = await res.json();
        if (!res.ok) {
          if (data.error?.includes("NO_PROVIDER")) noProviderRef.current = true;
          return;
        }
        if (!data.same_language && data.translated) {
          setTrans((prev) => ({ ...prev, [p.id]: data.translated }));
        }
      } catch { /* network error — ignore */ }
    }

    async function runBatches() {
      for (let i = 0; i < queue.length; i += BATCH) {
        if (noProviderRef.current) break;
        const batch = queue.slice(i, i + BATCH);

        setLoading((prev) => new Set([...prev, ...batch.map((p) => p.id)]));
        await Promise.all(batch.map(fetchOne));
        setLoading((prev) => {
          const n = new Set(prev);
          batch.forEach((p) => n.delete(p.id));
          return n;
        });

        if (i + BATCH < queue.length) {
          await new Promise((r) => setTimeout(r, STAGGER));
        }
      }
    }

    runBatches();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locale]); // only run once on mount / locale change

  return (
    <div className="bg-[#0F2040] border border-[#1E3A5F] rounded-2xl overflow-hidden divide-y divide-[#1E3A5F]/60">
      {posts.map((p) => {
        const author     = p.author;
        const wl         = getWealthLevel(author?.gc_balance ?? 0);
        const name       = author?.nickname ?? (lc(locale, "系统", "System"));
        const transTitle = trans[p.id];
        const isLoading  = loading.has(p.id);
        const tags       = postTagsMap[p.id] ?? [];

        return (
          <Link
            key={p.id}
            href={`/${locale}/forum/thread/${p.id}`}
            className="flex items-center gap-4 px-5 py-4 hover:bg-[#1E3A5F]/30 transition-colors group"
          >
            {/* Avatar */}
            <div className="relative shrink-0">
              {author?.avatar_url ? (
                <Image src={author.avatar_url} alt={name}
                  width={38} height={38} className="rounded-full object-cover" unoptimized />
              ) : (
                <div className={`w-[38px] h-[38px] rounded-full flex items-center justify-center text-white font-black text-sm ${
                  author
                    ? "bg-gradient-to-br from-[#7C6FE0] to-[#4F46E5]"
                    : "bg-gradient-to-br from-[#FFD700]/40 to-[#F59E0B]/40"
                }`}>
                  {author ? name.slice(0, 1).toUpperCase() : "⚽"}
                </div>
              )}
              <div className="absolute -bottom-0.5 -right-0.5 text-[10px]">{wl.icon}</div>
            </div>

            {/* Title + translation + meta */}
            <div className="flex-1 min-w-0">
              {/* Title row */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {p.is_pinned && (
                  <span className="text-[9px] font-black bg-red-500/15 text-red-400 px-1.5 py-0.5 rounded border border-red-500/20">
                    {lc(locale, "置顶", "PIN")}
                  </span>
                )}
                {p.is_locked && (
                  <span className="text-[9px] font-black bg-gray-500/15 text-gray-400 px-1.5 py-0.5 rounded border border-gray-500/20">
                    🔒
                  </span>
                )}
                {p.is_featured && (
                  <span className="text-[9px] font-black bg-[#FFD700]/10 text-[#FFD700] px-1.5 py-0.5 rounded border border-[#FFD700]/25">
                    ⭐
                  </span>
                )}
                <span className="text-sm font-semibold text-white group-hover:text-[#FFD700] transition-colors line-clamp-1">
                  {p.title}
                </span>
                {/* Inline loading spinner for translation */}
                {isLoading && (
                  <span className="w-2.5 h-2.5 rounded-full border border-gray-600 border-t-[#FFD700] animate-spin shrink-0" />
                )}
              </div>

              {/* Translated title — auto-shown when available */}
              {transTitle && (
                <p className="text-xs text-gray-400 mt-0.5 line-clamp-1 pl-0.5">
                  {transTitle}
                </p>
              )}

              {/* Tags row */}
              {tags.length > 0 && (
                <div className="flex gap-1 flex-wrap mt-1">
                  {tags.map((tag) => {
                    const label = zh ? (tag.name_zh ?? tag.name) : tag.name;
                    const color = tag.color ?? "#6B7280";
                    return (
                      <span key={tag.id} style={{ color, borderColor: color + "40", backgroundColor: color + "15" }}
                        className="text-[9px] font-bold px-1.5 py-0.5 rounded-full border">
                        #{label}
                      </span>
                    );
                  })}
                </div>
              )}

              {/* Meta row */}
              <div className="flex items-center gap-2 mt-0.5 text-[10px] text-gray-500">
                <span>@{name}</span>
                <span className="text-gray-600">·</span>
                <span>{timeAgo(p.last_reply_at ?? p.created_at, zh, locale)}</span>
              </div>
            </div>

            {/* Stats */}
            <div className="flex flex-col items-end gap-1 shrink-0 text-[10px] text-gray-500">
              <span>💬 {p.reply_count}</span>
              <span>❤️ {p.like_count}</span>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
