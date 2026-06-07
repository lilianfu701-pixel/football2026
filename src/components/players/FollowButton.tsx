"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { lc } from "@/i18n/content";

interface FollowButtonProps {
  playerId: number;
  locale:   string;
}

export default function FollowButton({ playerId, locale }: FollowButtonProps) {
  const router = useRouter();
  const zh = locale === "zh";

  const [following, setFollowing] = useState(false);
  const [loggedIn, setLoggedIn]   = useState(false);
  const [loading, setLoading]     = useState(true);
  const [busy, setBusy]           = useState(false);
  const loaded = useRef(false);

  // Fetch follow + login status once on mount.
  useEffect(() => {
    if (loaded.current) return;
    loaded.current = true;

    let active = true;
    (async () => {
      try {
        const res = await fetch(`/api/players/${playerId}/follow`, { cache: "no-store" });
        const data = await res.json() as { following?: boolean; loggedIn?: boolean };
        if (active) {
          setFollowing(Boolean(data.following));
          setLoggedIn(Boolean(data.loggedIn));
        }
      } catch {
        /* leave defaults on error */
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => { active = false; };
  }, [playerId]);

  async function toggle() {
    if (!loggedIn) {
      router.push(`/${locale}/auth/login`);
      return;
    }
    if (busy) return;

    setBusy(true);
    const next = !following;
    setFollowing(next); // optimistic

    try {
      const res = await fetch(`/api/players/${playerId}/follow`, {
        method: next ? "POST" : "DELETE",
      });
      if (!res.ok) throw new Error("request failed");
      const data = await res.json() as { following?: boolean };
      setFollowing(Boolean(data.following));
    } catch {
      setFollowing(!next); // roll back
    } finally {
      setBusy(false);
    }
  }

  const label = loading
    ? "···"
    : following
      ? (lc(locale, "已关注", "Following"))
      : (lc(locale, "+ 关注", "+ Follow"));

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy || loading}
      aria-pressed={following}
      className={`text-xs font-black px-4 py-1.5 rounded-full border transition-colors disabled:opacity-60 ${
        following
          ? "text-gray-300 bg-white/5 border-[#1E3A5F] hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30"
          : "text-[#0A1628] bg-[#FFD700] border-[#FFD700] hover:bg-[#FFD700]/90"
      }`}
    >
      {label}
    </button>
  );
}
