export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import ReportActions from "./ReportActions";

interface PageProps {
  params:       Promise<{ locale: string }>;
  searchParams: Promise<{ status?: string }>;
}

export default async function AdminReportsPage({ params, searchParams }: PageProps) {
  const { locale }          = await params;
  const { status = "pending" } = await searchParams;
  const zh = locale === "zh";
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/auth/login`);
  const { data: me } = await supabase.from("users").select("is_admin").eq("id", user.id).single();
  if (!me?.is_admin) redirect(`/${locale}`);

  const { data: reports } = await supabase
    .from("forum_reports")
    .select("id, reason, detail, status, created_at, reporter_id, post_id, reply_id")
    .eq("status", status)
    .order("created_at", { ascending: false })
    .limit(50);

  // Batch fetch reporters
  const reporterIds = [...new Set((reports ?? []).map((r) => r.reporter_id))];
  const { data: reporters } = reporterIds.length
    ? await supabase.from("users").select("id, nickname").in("id", reporterIds)
    : { data: [] };
  const reporterMap = new Map((reporters ?? []).map((u) => [u.id, u.nickname]));

  const REASON_ZH: Record<string, string> = {
    spam: "垃圾信息", abuse: "骚扰/侮辱", misleading: "虚假信息", illegal: "违法内容", other: "其他",
  };

  const tabs = [
    { key: "pending",    label: zh ? "待审核" : "Pending" },
    { key: "reviewed",   label: zh ? "已处理" : "Reviewed" },
    { key: "dismissed",  label: zh ? "已忽略" : "Dismissed" },
  ];

  return (
    <div className="min-h-screen bg-[#0A1628] text-white pb-24">
      <div className="pt-6 space-y-5">
        <div className="flex items-center gap-3">
          <Link href={`/${locale}/admin`} className="text-gray-500 hover:text-white">←</Link>
          <h1 className="text-xl font-black">🚩 {zh ? "举报审核" : "Content Reports"}</h1>
        </div>

        {/* Status tabs */}
        <div className="flex gap-2">
          {tabs.map((t) => (
            <Link key={t.key} href={`/${locale}/admin/reports?status=${t.key}`}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors ${
                status === t.key ? "bg-[#FFD700] text-[#0A1628]" : "bg-[#0F2040] border border-[#1E3A5F] text-gray-400 hover:text-white"
              }`}>
              {t.label}
            </Link>
          ))}
        </div>

        <div className="bg-[#0F2040] border border-[#1E3A5F] rounded-2xl overflow-hidden">
          {!reports?.length ? (
            <div className="py-12 text-center text-gray-500">{zh ? "暂无举报" : "No reports"}</div>
          ) : (
            <div className="divide-y divide-[#1E3A5F]/40">
              {reports.map((r) => (
                <div key={r.id} className="px-5 py-4 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="text-[10px] font-black text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded">
                        {zh ? (REASON_ZH[r.reason] ?? r.reason) : r.reason}
                      </span>
                      <p className="text-xs text-gray-500 mt-1">
                        {zh ? "举报人" : "Reporter"}: {reporterMap.get(r.reporter_id) ?? "?"}
                        {" · "}
                        {new Date(r.created_at).toLocaleDateString(zh ? "zh-CN" : "en-US")}
                      </p>
                      {r.detail && <p className="text-sm text-gray-300 mt-1">"{r.detail}"</p>}
                      <div className="flex items-center gap-2 mt-1.5 text-xs">
                        {r.post_id && (
                          <Link href={`/${locale}/forum/thread/${r.post_id}`}
                            className="text-blue-400 hover:underline">
                            {zh ? "查看帖子 →" : "View post →"}
                          </Link>
                        )}
                        {r.reply_id && (
                          <span className="text-gray-500">{zh ? `回复 #${r.reply_id}` : `Reply #${r.reply_id}`}</span>
                        )}
                      </div>
                    </div>
                    {status === "pending" && (
                      <ReportActions reportId={r.id} zh={zh} />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
