import { createClient } from "@supabase/supabase-js";
import { notFound } from "next/navigation";
import { getTeamColor } from "@/lib/teamColors";
import FanMapEmbed from "@/components/matches/FanMapEmbed";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function FanMapEmbedPage({ params }: PageProps) {
  const { id } = await params;
  const matchId = parseInt(id);
  if (isNaN(matchId)) notFound();

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  const { data: match } = await supabase
    .from("matches")
    .select("id, home_team, away_team, status, match_time")
    .eq("id", matchId)
    .single();

  if (!match) notFound();

  const homeColors = getTeamColor(match.home_team as string);
  const awayColors = getTeamColor(match.away_team as string);

  return (
    <div className="bg-[#0B1A30] min-h-screen p-3 flex flex-col">
      <FanMapEmbed
        matchId={matchId}
        homeTeam={match.home_team as string}
        awayTeam={match.away_team as string}
        homeColors={homeColors}
        awayColors={awayColors}
      />
      <p className="text-center mt-2">
        <a
          href={`https://www.football2026.net/matches/${matchId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[10px] text-gray-600 hover:text-gray-400 transition-colors"
        >
          football2026.net
        </a>
      </p>
    </div>
  );
}
