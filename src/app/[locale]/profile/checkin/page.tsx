import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getWealthLevel } from "@/lib/levels";
import CheckinClient from "./CheckinClient";

interface Props {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const zh = locale === "zh";
  return {
    title: zh ? "每日签到 | Football2026" : "Daily Check-in | Football2026",
  };
}

export default async function CheckinPage({ params }: Props) {
  const { locale } = await params;
  const zh = locale === "zh";
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/${locale}/auth/login`);
  }

  const today     = new Date().toISOString().split("T")[0];
  const sevenAgo  = new Date(Date.now() - 6 * 86_400_000).toISOString().split("T")[0];

  const [profileRes, todayRes, historyRes] = await Promise.all([
    supabase
      .from("users")
      .select("gc_balance, wealth_level")
      .eq("id", user.id)
      .single(),

    supabase
      .from("check_ins")
      .select("date, streak, gc_earned")
      .eq("user_id", user.id)
      .eq("date", today)
      .maybeSingle(),

    supabase
      .from("check_ins")
      .select("date, streak, gc_earned")
      .eq("user_id", user.id)
      .gte("date", sevenAgo)
      .order("date", { ascending: false }),
  ]);

  const profile     = profileRes.data;
  const gcBalance   = profile?.gc_balance ?? 0;
  const todayRow    = todayRes.data;
  const history     = (historyRes.data ?? []) as { date: string; streak: number; gc_earned: number }[];

  const todayCheckedIn = !!todayRow;
  const streak     = todayRow?.streak ?? (history[0]?.date === today ? history[0].streak : 0);
  const wl         = getWealthLevel(gcBalance);

  // Estimate today's GC if not yet checked in
  const streakBonus    = Math.min(Math.max(streak - 1, 0), 30) * 0.01;
  const dailyGcEstimate = todayCheckedIn
    ? (todayRow?.gc_earned ?? 0)
    : Math.floor(wl.dailyFreeGc * (1 + streakBonus));

  return (
    <div className="min-h-screen bg-[#0A1628] text-white pb-20">
      <div className="pt-8">
        {/* Header */}
        <div className="mb-5">
          <h1 className="text-2xl font-black text-white">
            📅 {zh ? "每日签到" : "Daily Check-in"}
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {zh ? "每天签到免费领取 GC，连签奖励更高！" : "Check in daily for free GC — streaks earn more!"}
          </p>
        </div>

        <CheckinClient
          locale={locale}
          userId={user.id}
          gcBalance={gcBalance}
          todayCheckedIn={todayCheckedIn}
          streak={streak}
          dailyGcEstimate={dailyGcEstimate}
          recentHistory={history}
          wealthLevel={{
            name:        wl.name,
            nameZh:      wl.nameZh,
            icon:        wl.icon,
            color:       wl.color,
            dailyFreeGc: wl.dailyFreeGc,
          }}
        />
      </div>
    </div>
  );
}
