"use client";

import { useEffect, useState, useRef } from "react";
import Image from "next/image";

export interface MentionUser {
  id:         string;
  nickname:   string;
  avatar_url: string | null;
}

interface Props {
  query:    string;                  // characters after "@"
  onSelect: (u: MentionUser) => void;
  onClose:  () => void;
  anchorTop:  number;                // page-Y of anchor (cursor bottom)
  anchorLeft: number;                // page-X of anchor
  activeIndex: number;
  onActiveChange: (i: number) => void;
}

export default function MentionDropdown({
  query, onSelect, onClose, anchorTop, anchorLeft, activeIndex, onActiveChange,
}: Props) {
  const [users,   setUsers]   = useState<MentionUser[]>([]);
  const [loading, setLoading] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/forum/mention-search?q=${encodeURIComponent(query)}`)
      .then((r) => r.json())
      .then((data: MentionUser[]) => {
        if (!cancelled) {
          setUsers(Array.isArray(data) ? data : []);
          setLoading(false);
        }
      })
      .catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [query]);

  // Scroll active item into view
  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-idx="${activeIndex}"]`) as HTMLElement | null;
    el?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (listRef.current && !listRef.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  if (!loading && users.length === 0) return null;

  return (
    <div
      ref={listRef}
      style={{ top: anchorTop + 4, left: anchorLeft, position: "fixed" }}
      className="z-[9999] bg-[#0F2040] border border-[#1E3A5F] rounded-xl shadow-2xl overflow-hidden min-w-[200px] max-w-[280px]"
    >
      {loading ? (
        <div className="flex items-center gap-2 px-4 py-3 text-xs text-gray-500">
          <div className="w-3 h-3 rounded-full border-2 border-[#FFD700] border-t-transparent animate-spin" />
          {/* searching */}
        </div>
      ) : (
        <div className="max-h-48 overflow-y-auto">
          {users.map((u, i) => (
            <button
              key={u.id}
              data-idx={i}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); onSelect(u); }}
              onMouseEnter={() => onActiveChange(i)}
              className={`flex items-center gap-3 w-full px-3 py-2.5 text-left transition-colors ${
                i === activeIndex
                  ? "bg-[#FFD700]/15 text-white"
                  : "text-gray-300 hover:bg-[#1E3A5F]/60"
              }`}
            >
              {u.avatar_url ? (
                <Image src={u.avatar_url} alt={u.nickname} width={28} height={28}
                  className="rounded-full object-cover border border-[#1E3A5F] shrink-0" unoptimized />
              ) : (
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#7C6FE0] to-[#4F46E5] flex items-center justify-center text-white font-black text-xs shrink-0 border border-[#1E3A5F]">
                  {u.nickname.slice(0, 1).toUpperCase()}
                </div>
              )}
              <span className="text-sm font-semibold truncate">@{u.nickname}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
