"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import PredictionPanel from "./PredictionPanel";
import ScorePredictionPanel from "./ScorePredictionPanel";
import { getTeamColor } from "@/lib/teamColors";
import { getFlagUrl, getTeamDisplayName } from "@/lib/flags";
import type { ScoreBet } from "./ScorePredictionPanel";

interface TeamColors { primary: string; secondary: string; }

interface UserState {
  userId:      string | null;
  gcBalance:   number;
  nickname:    string;
  existingBet: { id?: string; prediction: string; gc_amount: number; status: string; potential_payout: number } | null;
  myScoreBets: ScoreBet[];
  isFollowing: boolean;
  myVote:      string | null;
}

interface Props {
  matchId:       string;
  locale:        string;
  zh:            boolean;
  homeTeam:      string;
  awayTeam:      string;
  homeFlag:      string;
  awayFlag:      string;
  poolHome:      number;
  poolDraw:      number;
  poolAway:      number;
  refOddsHome:   number;
  refOddsDraw:   number;
  refOddsAway:   number;
  homeColors:    TeamColors;
  awayColors:    TeamColors;
  stageLabel:    string;
  kickoffTime:   string;
  isFinished:    boolean;
}

export default function MatchUserSection({
  matchId, locale, zh,
  homeTeam, awayTeam, homeFlag, awayFlag,
  poolHome, poolDraw, poolAway,
  refOddsHome, refOddsDraw, refOddsAway,
  homeColors, awayColors,
  stageLabel, kickoffTime, isFinished,
}: Props) {
  const [userState, setUserState] = useState<UserState | null>(null);
  const [loading,   setLoading]   = useState(true);

  useEffect(() => {
    fetch(`/api/matches/${matchId}/user-state`)
      .then((r) => r.json())
      .then((d: UserState) => setUserState(d))
      .catch(() => setUserState({ userId: null, gcBalance: 0, nickname: "", existingBet: null, myScoreBets: [], isFollowing: false, myVote: null }))
      .finally(() => setLoading(false));
  }, [matchId]);

  if (isFinished) {
    const bet = userState?.existingBet;
    return (
      <div className="bg-[#0F2040] border border-[#1E3A5F] rounded-2xl p-5 text-center mb-4">
        <div className="text-3xl mb-2">🏁</div>
        <p className="text-gray-400 text-sm">
          {zh ? "比赛已结束，预测已关闭。" : "This match has ended. Predictions are closed."}
        </p>
        {bet && !loading && (
          <div className={`mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold ${
            bet.status === "won"  ? "bg-green-500/20 text-green-400" :
            bet.status === "lost" ? "bg-red-500/20 text-red-400" :
            "bg-gray-500/20 text-gray-400"
          }`}>
            {bet.status === "won"  ? (zh ? "🎉 恭喜获奖！" : "🎉 You won!") :
             bet.status === "lost" ? (zh ? "😔 下次加油"   : "😔 Better luck") :
             (zh ? "⏳ 等待结算"  : "⏳ Pending")}
          </div>
        )}
      </div>
    );
  }

  // Loading skeleton
  if (loading) {
    return (
      <div className="bg-[#0F2040] border border-[#1E3A5F] rounded-2xl p-5 mb-4 animate-pulse">
        <div className="h-4 w-32 bg-[#1E3A5F] rounded mb-4" />
        <div className="grid grid-cols-3 gap-3 mb-4">
          {[0,1,2].map((i) => <div key={i} className="h-20 bg-[#1E3A5F] rounded-xl" />)}
        </div>
        <div className="h-10 w-full bg-[#1E3A5F] rounded-xl" />
      </div>
    );
  }

  const { userId, gcBalance, nickname, existingBet, myScoreBets } = userState!;

  // Not logged in
  if (!userId) {
    return (
      <div className="bg-[#0F2040] border border-[#1E3A5F] rounded-2xl p-6 text-center mb-4">
        <div className="text-3xl mb-3">🔒</div>
        <p className="text-white font-bold mb-1">{zh ? "登录即可参与预测" : "Login to Predict"}</p>
        <p className="text-gray-500 text-sm mb-5">
          {zh ? "注册账号，参与预测，赢取GoalCoin！" : "Sign in to place your prediction and earn GoalCoins"}
        </p>
        <div className="flex gap-3 justify-center">
          <Link href={`/${locale}/auth/login`}
            className="px-6 py-2.5 bg-[#FFD700] text-[#0A1628] font-bold rounded-xl text-sm hover:bg-[#FFC200] transition-colors">
            {zh ? "登录" : "Login"}
          </Link>
          <Link href={`/${locale}/auth/register`}
            className="px-6 py-2.5 border border-[#1E3A5F] text-gray-300 font-semibold rounded-xl text-sm hover:border-[#FFD700]/50 hover:text-white transition-colors">
            {zh ? "免费注册" : "Register Free"}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Prediction Panel */}
      <div className="mb-4">
        <PredictionPanel
          matchId={matchId}
          locale={locale}
          homeTeam={homeTeam}
          awayTeam={awayTeam}
          homeTeamZh={getTeamDisplayName(homeTeam, "zh")}
          awayTeamZh={getTeamDisplayName(awayTeam, "zh")}
          homeFlag={homeFlag}
          awayFlag={awayFlag}
          poolHome={poolHome}
          poolDraw={poolDraw}
          poolAway={poolAway}
          refOddsHome={refOddsHome}
          refOddsDraw={refOddsDraw}
          refOddsAway={refOddsAway}
          gcBalance={gcBalance}
          username={nickname}
          stageLabel={stageLabel}
          existingBet={existingBet}
          homeColors={homeColors}
          awayColors={awayColors}
          kickoffTime={kickoffTime}
        />
      </div>

      {/* Score Prediction Panel */}
      <ScorePredictionPanel
        matchId={matchId}
        locale={locale}
        homeTeam={homeTeam}
        awayTeam={awayTeam}
        homeColors={homeColors}
        awayColors={awayColors}
        gcBalance={gcBalance}
        myBets={myScoreBets}
        kickoffTime={kickoffTime}
      />
    </>
  );
}
