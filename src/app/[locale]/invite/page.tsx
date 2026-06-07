export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import InvitePageClient from "./InvitePageClient";
import { PER_INVITE_GC } from "@/lib/inviteMilestones";
import { lc } from "@/i18n/content";

interface PageProps {
  params: Promise<{ locale: string }>;
}

export default async function InvitePage({ params }: PageProps) {
  const { locale } = await params;
  const zh = locale === "zh";
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  // ── My profile (real schema: invites are tracked via `referred_by`, there is
  //    no invite_count/invite_gc column on the users table) ─────────────────────
  const { data: myRow } = user
    ? await supabase
        .from("users")
        .select("nickname, referral_code, referred_by, gc_balance")
        .eq("id", user.id)
        .maybeSingle()
    : { data: null };

  // An invitee's `referred_by` stores the referrer's nickname OR referral_code.
  const myKeys = [myRow?.nickname, myRow?.referral_code].filter(
    (v): v is string => Boolean(v),
  );

  // ── Parallel: milestone claims + every invited user's referrer key ───────────
  const [claimsRes, refRowsRes] = await Promise.all([
    user
      ? supabase
          .from("invite_milestone_claims")
          .select("milestone")
          .eq("user_id", user.id)
      : Promise.resolve({ data: [] as { milestone: number }[] }),

    supabase.from("users").select("referred_by").not("referred_by", "is", null),
  ]);

  // Tally invites per referrer key across the whole user base.
  const countByKey: Record<string, number> = {};
  for (const r of (refRowsRes.data ?? []) as { referred_by: string | null }[]) {
    const k = r.referred_by;
    if (k) countByKey[k] = (countByKey[k] ?? 0) + 1;
  }

  const myInviteCount = myKeys.reduce((sum, k) => sum + (countByKey[k] ?? 0), 0);
  const claimedMilestones = (claimsRes.data ?? []).map((c) => c.milestone as number);

  const myProfile = myRow
    ? {
        username:     myRow.nickname ?? "Player",
        invite_count: myInviteCount,
        invite_gc:    myInviteCount * PER_INVITE_GC,
        referred_by:  myRow.referred_by ?? null,
        gc_balance:   myRow.gc_balance ?? 0,
      }
    : null;

  // ── Leaderboard: resolve display info for the top referrer keys ───────────────
  const topKeys = Object.entries(countByKey)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 80)
    .map(([k]) => k);

  type BoardRow = {
    nickname: string | null; referral_code: string | null;
    country_code: string | null; avatar_url: string | null;
  };
  const referrers: BoardRow[] = [];
  if (topKeys.length) {
    const [byNick, byCode] = await Promise.all([
      supabase.from("users").select("nickname, referral_code, country_code, avatar_url").in("nickname", topKeys),
      supabase.from("users").select("nickname, referral_code, country_code, avatar_url").in("referral_code", topKeys),
    ]);
    const seen = new Set<string>();
    for (const u of [...((byNick.data ?? []) as BoardRow[]), ...((byCode.data ?? []) as BoardRow[])]) {
      const id = u.nickname ?? u.referral_code ?? "";
      if (id && !seen.has(id)) { seen.add(id); referrers.push(u); }
    }
  }

  const leaderboard = referrers
    .map((u) => {
      const viaNick = u.nickname ? (countByKey[u.nickname] ?? 0) : 0;
      const viaCode = u.referral_code && u.referral_code !== u.nickname ? (countByKey[u.referral_code] ?? 0) : 0;
      const inviteCount = viaNick + viaCode;
      return {
        username:    u.nickname ?? "Player",
        inviteCount,
        inviteGc:    inviteCount * PER_INVITE_GC,
        countryCode: u.country_code ?? null,
        avatarUrl:   u.avatar_url ?? null,
      };
    })
    .filter((e) => e.inviteCount > 0)
    .sort((a, b) => b.inviteCount - a.inviteCount)
    .slice(0, 50);

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://football2026.net";

  // Compute user's rank in leaderboard
  const myRank = myProfile
    ? leaderboard.findIndex((e) => e.username === myProfile.username) + 1
    : 0;

  return (
    <div className="min-h-screen bg-[#0A1628] text-white pb-20">
      <div className="pt-6">

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-black text-white">
            🤝 {lc(locale, "邀请好友", "Invite Friends")}
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            {lc(locale, "每成功邀请一人，你和好友各得 500,000 GC", "Each invite earns you & your friend 500,000 GC each")}
          </p>
        </div>

        <InvitePageClient
          locale={locale}
          siteUrl={siteUrl}
          myProfile={myProfile}
          myRank={myRank}
          claimedMilestones={claimedMilestones}
          leaderboard={leaderboard}
        />
      </div>
    </div>
  );
}
