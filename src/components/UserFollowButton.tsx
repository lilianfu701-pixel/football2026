"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { lc } from "@/i18n/content";

interface Props {
  targetId:       string;
  initialFollow:  boolean;
  initialCount:   number;
  loggedIn:       boolean;
  locale:         string;
  zh:             boolean;
  compact?:       boolean;   // smaller pill variant
}

export default function UserFollowButton({
  targetId, initialFollow, initialCount, loggedIn, locale, zh, compact = false,
}: Props) {
  const router = useRouter();
  const [following, setFollowing] = useState(initialFollow);
  const [count,     setCount]     = useState(initialCount);
  const [loading,   setLoading]   = useState(false);

  async function toggle() {
    if (!loggedIn) return;
    setLoading(true);
    try {
      if (following) {
        const res = await fetch(`/api/user/follow?target_id=${targetId}`, { method: "DELETE" });
        if (res.ok) {
          const d = await res.json();
          setFollowing(false);
          setCount(d.followerCount ?? Math.max(0, count - 1));
          router.refresh();
        }
      } else {
        const res = await fetch("/api/user/follow", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ target_id: targetId }),
        });
        if (res.ok) {
          const d = await res.json();
          setFollowing(true);
          setCount(d.followerCount ?? count + 1);
          router.refresh();
        }
      }
    } finally {
      setLoading(false);
    }
  }

  if (!loggedIn) {
    return (
      <Link
        href={`/${locale}/auth/login`}
        className={`inline-flex items-center gap-1.5 font-bold rounded-xl transition-all ${
          compact
            ? "px-3 py-1.5 text-xs bg-[#FFD700] text-[#0A1628] hover:bg-[#FFC200]"
            : "px-5 py-2.5 text-sm bg-[#FFD700] text-[#0A1628] hover:bg-[#FFC200]"
        }`}
      >
        {lc(locale, "关注", "Follow")}
      </Link>
    );
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className={`inline-flex items-center gap-1.5 font-bold rounded-xl transition-all disabled:opacity-60 ${
        compact ? "px-3 py-1.5 text-xs" : "px-5 py-2.5 text-sm"
      } ${
        following
          ? "bg-[#1E3A5F] border border-[#1E3A5F] text-gray-300 hover:border-red-500/40 hover:text-red-400"
          : "bg-[#FFD700] text-[#0A1628] hover:bg-[#FFC200]"
      }`}
    >
      {loading ? (
        <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : following ? (
        <span>✓</span>
      ) : (
        <span>+</span>
      )}
      {following
        ? (lc(locale, "已关注", "Following"))
        : (lc(locale, "关注", "Follow"))}
      {count > 0 && !compact && (
        <span className={`text-[10px] font-normal opacity-70`}>
          {count >= 1000 ? `${(count / 1000).toFixed(1)}k` : count}
        </span>
      )}
    </button>
  );
}
