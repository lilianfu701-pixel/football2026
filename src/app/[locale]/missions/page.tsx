export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import MissionsClient, { type UserStats } from "./MissionsClient";

interface Props {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const zh = locale === "zh";
  return {
    title: zh ? "任务中心 | Football2026" : "Missions | Football2026",
    description: zh
      ? "完成每日任务和成就挑战，提升 GoalCoin 等级。"
      : "Complete daily tasks and achievement challenges on Football2026.",
  };
}

export default async function MissionsPage({ params }: Props) {
  const { locale } = await params;
  const supabase   = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return <MissionsClient locale={locale} userId={null} stats={null} />;
  }

  const today      = new Date().toISOString().split("T")[0];
  const todayStart = today + "T00:00:00.000Z";

  const [
    profileRes,
    todayCheckinRes,
    todayBetsRes,
    allBetsRes,
    maxStreakRes,
    currentStreakRes,
    postCountRes,
  ] = await Promise.all([
    supabase
      .from("users")
      .select("gc_balance, invite_count")
      .eq("id", user.id)
      .single(),

    supabase
      .from("check_ins")
      .select("id")
      .eq("user_id", user.id)
      .eq("date", today)
      .maybeSingle(),

    supabase
      .from("bets")
      .select("id")
      .eq("user_id", user.id)
      .gte("created_at", todayStart),

    supabase
      .from("bets")
      .select("status, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),

    supabase
      .from("check_ins")
      .select("streak")
      .eq("user_id", user.id)
      .order("streak", { ascending: false })
      .limit(1)
      .maybeSingle(),

    supabase
      .from("check_ins")
      .select("streak, date")
      .eq("user_id", user.id)
      .order("date", { ascending: false })
      .limit(1)
      .maybeSingle(),

    supabase
      .from("forum_posts")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id),
  ]);

  const profile      = profileRes.data;
  const allBets      = (allBetsRes.data ?? []) as { status: string; created_at: string }[];
  const settledBets  = allBets.filter((b) => b.status !== "pending");
  const wonBets      = settledBets.filter((b) => b.status === "won").length;

  let consecutiveWins = 0;
  for (const b of settledBets) {
    if (b.status === "won") consecutiveWins++;
    else break;
  }

  const stats: UserStats = {
    todayCheckin:    !!todayCheckinRes.data,
    todayBetCount:   todayBetsRes.data?.length ?? 0,
    totalBets:       allBets.length,
    wonBets,
    consecutiveWins,
    maxStreak:       maxStreakRes.data?.streak    ?? 0,
    currentStreak:   currentStreakRes.data?.streak ?? 0,
    inviteCount:     profile?.invite_count ?? 0,
    postCount:       postCountRes.count    ?? 0,
    gcBalance:       profile?.gc_balance   ?? 0,
  };

  return <MissionsClient locale={locale} userId={user.id} stats={stats} />;
}
