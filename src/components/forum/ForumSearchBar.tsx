"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { lc } from "@/i18n/content";

interface Props {
  locale:        string;
  defaultValue?: string;
  zh?:           boolean;
}

export default function ForumSearchBar({ locale, defaultValue = "", zh = false }: Props) {
  const [query, setQuery] = useState(defaultValue);
  const router   = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    router.push(`/${locale}/forum/search?q=${encodeURIComponent(q)}`);
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2">
      <div className="relative flex-1">
        {/* Search icon */}
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none select-none">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
          </svg>
        </span>

        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={lc(locale, "搜索帖子标题、内容…", "Search posts, titles, content…")}
          className="w-full bg-[#080F1F] border border-[#1E3A5F] hover:border-[#2A4A7F]
                     focus:border-[#FFD700]/40 rounded-xl pl-9 pr-8 py-2.5 text-sm
                     text-white placeholder-gray-600 outline-none transition-colors"
        />

        {/* Clear button */}
        {query && (
          <button
            type="button"
            onClick={() => { setQuery(""); inputRef.current?.focus(); }}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-600
                       hover:text-white transition-colors leading-none text-xs"
          >
            ✕
          </button>
        )}
      </div>

      <button
        type="submit"
        disabled={!query.trim()}
        className="shrink-0 bg-[#FFD700] text-[#0A1628] font-black px-4 py-2.5
                   rounded-xl text-sm hover:bg-[#FFC200] transition-colors disabled:opacity-40"
      >
        {lc(locale, "搜索", "Search")}
      </button>
    </form>
  );
}
