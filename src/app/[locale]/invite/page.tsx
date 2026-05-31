import { createClient } from "@/lib/supabase/server";
import InvitePageClient from "./InvitePageClient";

interface PageProps {
  params: Promise<{ locale: string }>;
}

export default async function InvitePage({ params }: PageProps) {
  const { locale } = await params;
  const zh = locale === "zh";
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  // ── Parallel fetches ──────────────────────────────────────────────────────
  const [profileRes, claimsRes, boardRes] = await Promise.all([
    user
      ? supabase
          .from("users")
          .select("nickname, invite_count, invite_gc, referred_by, gc_balance")
          .eq("id", user.id)
          .single()
      : Promise.resolve({ data: null }),

    user
      ? supabase
          .from("invite_milestone_claims")
          .select("milestone")
          .eq("user_id", user.id)
      : Promise.resolve({ data: [] }),

    supabase
      .from("users")
      .select("nickname, invite_count, invite_gc, country_code, avatar_url")
      .gt("invite_count", 0)
      .order("invite_count", { ascending: false })
      .limit(50),
  ]);

  const myProfileRaw = profileRes.data ?? null;
  const myProfile = myProfileRaw
    ? { ...myProfileRaw, username: myProfileRaw.nickname ?? "Player" }
    : null;
  const claimedMilestones = (claimsRes.data ?? []).map((c) => c.milestone as number);
  const leaderboard = (boardRes.data ?? []).map((r) => ({
    username:    (r.nickname    as string | null) ?? "Player",
    inviteCount: r.invite_count as number,
    inviteGc:    r.invite_gc    as number,
    countryCode: (r.country_code as string | null) ?? null,
    avatarUrl:   (r.avatar_url  as string | null) ?? null,
  }));

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
            🤝 {zh ? "邀请好友" : "Invite Friends"}
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            {zh
              ? "每成功邀请一人，你和好友各得 500,000 GC"
              : "Each invite earns you & your friend 500,000 GC each"}
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
