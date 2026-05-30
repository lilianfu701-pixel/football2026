import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import FeaturedMatchesClient from "./FeaturedMatchesClient";

interface Props { params: Promise<{ locale: string }> }

export default async function FeaturedMatchesPage({ params }: Props) {
  const { locale } = await params;
  const zh = locale === "zh";
  const service = createServiceClient();

  // All matches ordered by kickoff_time
  const { data: allMatches } = await service
    .from("matches")
    .select("id, match_code, home_team, away_team, kickoff_time, stage, group_name, status, is_featured")
    .order("kickoff_time", { ascending: true });

  const matches = (allMatches ?? []) as {
    id: number;
    match_code: string | null;
    home_team: string;
    away_team: string;
    kickoff_time: string;
    stage: string;
    group_name: string | null;
    status: string;
    is_featured: boolean;
  }[];

  const featured = matches.filter((m) => m.is_featured);

  return (
    <div className="pt-8">
      <div className="mb-6">
        <h1 className="text-2xl font-black text-white">
          🔥 {zh ? "焦点对决管理" : "Featured Matches"}
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          {zh
            ? "按赛事编码（如 A1、C2、M73）手动设置首页焦点对决区，最多显示 4 场"
            : "Manually pin matches by code (e.g. A1, C2, M73) to the homepage Featured section. Max 4 shown."}
        </p>
      </div>

      <FeaturedMatchesClient
        locale={locale}
        allMatches={matches}
        featuredMatches={featured}
      />
    </div>
  );
}
