export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import MatchScoreForm from "./MatchScoreForm";
import AiPredictForm  from "./AiPredictForm";
import OddsForm       from "./OddsForm";
import type { AiPredictions } from "@/lib/aiModels";
import { getFlagUrl, getTeamDisplayName } from "@/lib/flags";

interface PageProps {
  params:       Promise<{ locale: string }>;
  searchParams: Promise<{ stage?: string }>;
}

export default async function AdminMatchesPage({ params, searchParams }: PageProps) {
  const { locale }         = await params;
  const { stage = "group" } = await searchParams;
  const zh = locale === "zh";
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/auth/login`);
  const { data: me } = await supabase.from("users").select("is_admin").eq("id", user.id).single();
  if (!me?.is_admin) redirect(`/${locale}`);

  const { data: matches } = await supabase
    .from("matches")
    .select("id, home_team, away_team, home_flag, away_flag, kickoff_time, home_score, away_score, status, group_name, stage, ai_predictions, odds_home, odds_draw, odds_away")
    .eq("stage", stage)
    .order("kickoff_time", { ascending: true });

  const stageOptions = [
    { key: "group",   label: zh ? "小组赛" : "Group Stage" },
    { key: "round32", label: zh ? "32强"   : "Round of 32" },
    { key: "round16", label: zh ? "16强"   : "Round of 16" },
    { key: "quarter", label: zh ? "四强"   : "Quarters" },
    { key: "semi",    label: zh ? "半决赛" : "Semis" },
    { key: "final",   label: zh ? "决赛"   : "Final" },
  ];

  return (
    <div className="min-h-screen bg-[#0A1628] text-white pb-24">
      <div className="pt-6 space-y-5">
        <div className="flex items-center gap-3">
          <Link href={`/${locale}/admin`} className="text-gray-500 hover:text-white">←</Link>
          <h1 className="text-xl font-black">⚽ {zh ? "赛事管理" : "Match Management"}</h1>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1">
          {stageOptions.map((s) => (
            <Link key={s.key} href={`/${locale}/admin/matches?stage=${s.key}`}
              className={`shrink-0 px-4 py-2 rounded-xl text-sm font-bold transition-colors ${
                stage === s.key ? "bg-[#FFD700] text-[#0A1628]" : "bg-[#0F2040] border border-[#1E3A5F] text-gray-400 hover:text-white"
              }`}>
              {s.label}
            </Link>
          ))}
        </div>

        <div className="space-y-3">
          {(matches ?? []).map((m) => (
            <div key={m.id} className="bg-[#0F2040] border border-[#1E3A5F] rounded-2xl p-4">
              {/* Teams */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  {getFlagUrl(m.home_team) && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={getFlagUrl(m.home_team)} alt={m.home_team} className="w-7 h-5 rounded object-cover" />
                  )}
                  <span className="text-sm font-bold text-white">{getTeamDisplayName(m.home_team, locale)}</span>
                </div>
                <div className="text-center px-3">
                  {m.home_score !== null && m.away_score !== null ? (
                    <span className="text-lg font-black text-[#FFD700]">{m.home_score} – {m.away_score}</span>
                  ) : (
                    <span className="text-xs text-gray-600">VS</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-white">{getTeamDisplayName(m.away_team, locale)}</span>
                  {getFlagUrl(m.away_team) && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={getFlagUrl(m.away_team)} alt={m.away_team} className="w-7 h-5 rounded object-cover" />
                  )}
                </div>
              </div>
              <p className="text-[10px] text-gray-600 mb-3">
                {new Date(m.kickoff_time).toLocaleString(zh ? "zh-CN" : "en-US")}
                {m.group_name && ` · ${zh ? m.group_name + "组" : "Group " + m.group_name}`}
              </p>
              <MatchScoreForm
                matchId={m.id}
                initialHome={m.home_score}
                initialAway={m.away_score}
                initialStatus={m.status}
                zh={zh}
              />
              <OddsForm
                matchId={m.id}
                initialHome={(m.odds_home as number | null) ?? null}
                initialDraw={(m.odds_draw as number | null) ?? null}
                initialAway={(m.odds_away as number | null) ?? null}
                zh={zh}
              />
              <AiPredictForm
                matchId={m.id}
                homeTeam={m.home_team}
                awayTeam={m.away_team}
                initial={(m.ai_predictions as AiPredictions) ?? null}
                zh={zh}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
