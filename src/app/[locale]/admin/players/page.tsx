import { createServiceClient } from "@/lib/supabase/service";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import PlayersClient from "./PlayersClient";

interface PageProps {
  params:       Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string; team?: string; position?: string; page?: string }>;
}

export default async function AdminPlayersPage({ params, searchParams }: PageProps) {
  const { locale }                              = await params;
  const { q = "", team = "", position = "", page: pageStr = "1" } = await searchParams;
  const zh   = locale === "zh";
  const page = Math.max(1, parseInt(pageStr, 10));
  const size = 50;
  const from = (page - 1) * size;

  // Auth guard
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/auth/login`);
  const { data: me } = await supabase.from("users").select("is_admin").eq("id", user.id).single();
  if (!me?.is_admin) redirect(`/${locale}`);

  const service = createServiceClient();

  // Build query
  let query = service
    .from("players")
    .select("*", { count: "exact" })
    .order("team").order("position").order("name")
    .range(from, from + size - 1);

  if (q)        query = query.or(`name.ilike.%${q}%,name_zh.ilike.%${q}%,club.ilike.%${q}%`);
  if (team)     query = query.eq("team", team);
  if (position) query = query.eq("position", position);

  const { data: players, count } = await query;

  // Distinct teams for filter dropdown
  const { data: teamRows } = await service
    .from("players")
    .select("team")
    .order("team");
  const teams = [...new Set((teamRows ?? []).map((r) => r.team as string))];

  // Total count for stats
  const { count: totalCount } = await service
    .from("players")
    .select("id", { count: "exact", head: true });

  return (
    <div className="pt-6 pb-24 text-white space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href={`/${locale}/admin`} className="text-gray-500 hover:text-white text-sm">←</Link>
        <div className="flex-1">
          <h1 className="text-xl font-black">
            ⚽ {zh ? "球员管理" : "Player Management"}
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            {zh
              ? `共 ${totalCount ?? 0} 名球员 · 可搜索、编辑或手动添加`
              : `${totalCount ?? 0} players total · Search, edit, or add manually`}
          </p>
        </div>
      </div>

      <PlayersClient
        locale={locale}
        initialPlayers={(players ?? []) as import("./PlayersClient").PlayerRow[]}
        totalCount={count ?? 0}
        page={page}
        pageSize={size}
        initialQ={q}
        initialTeam={team}
        initialPosition={position}
        teams={teams}
      />
    </div>
  );
}
