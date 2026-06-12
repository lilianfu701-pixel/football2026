import { createServiceClient } from "@/lib/supabase/service";
import { createClient }        from "@/lib/supabase/server";
import { redirect }            from "next/navigation";
import ScorerAdminForm         from "./ScorerAdminForm";

export const dynamic = "force-dynamic";

interface Props { params: Promise<{ locale: string }> }

export default async function AdminScorersPage({ params }: Props) {
  const { locale } = await params;
  const zh = locale === "zh";

  // Auth guard
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/auth/login`);
  const { data: me } = await supabase.from("users").select("is_admin").eq("id", user.id).single();
  if (!me?.is_admin) redirect(`/${locale}`);

  const service = createServiceClient();
  const { data: scorers } = await service
    .from("top_scorers")
    .select("id,player_name,player_name_zh,team,photo_url,goals,assists,matches_played,sort_order,is_visible,updated_at")
    .order("sort_order", { ascending: true });

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-black text-white">
            {zh ? "⚽ 射手榜管理" : "⚽ Top Scorers Admin"}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {zh
              ? "手动更新进球数、助攻数；cron 会自动从 football-data.org 同步"
              : "Edit goals/assists manually — the cron also auto-syncs from football-data.org"}
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {(scorers ?? []).map((s) => (
          <ScorerAdminForm key={s.id} scorer={s} zh={zh} />
        ))}
      </div>

      {(!scorers || scorers.length === 0) && (
        <p className="text-gray-500 text-center py-12">
          {zh ? "暂无射手数据" : "No scorers found"}
        </p>
      )}
    </div>
  );
}
