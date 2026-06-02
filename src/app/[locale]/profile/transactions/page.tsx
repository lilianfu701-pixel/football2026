import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatGc } from "@/lib/levels";
import { gcTransactionLabel } from "@/lib/gcTransactionLabels";

interface TransactionsPageProps {
  params:       Promise<{ locale: string }>;
  searchParams: Promise<{ page?: string; filter?: string }>;
}

interface TxRow {
  id: string | number;
  type: string;
  amount: number;
  note: string | null;
  created_at: string;
}

const ITEMS_PER_PAGE = 20;

// Filter chips: key maps to the `type` values bucketed under it.
const FILTERS: { key: string; labelZh: string; labelEn: string; types: string[] | null }[] = [
  { key: "all",      labelZh: "全部",     labelEn: "All",       types: null },
  { key: "income",   labelZh: "收入",     labelEn: "Income",    types: null },
  { key: "expense",  labelZh: "支出",     labelEn: "Expense",   types: null },
  { key: "topup",    labelZh: "充值",     labelEn: "Top Up",    types: ["topup"] },
  { key: "bet",      labelZh: "预测",     labelEn: "Bets",      types: ["bet_placed", "bet_won", "bet_refunded"] },
  { key: "reward",   labelZh: "奖励",     labelEn: "Rewards",   types: ["daily_checkin", "welcome_bonus", "share_reward", "forum_post", "forum_like", "profile_reward"] },
  { key: "transfer", labelZh: "转账",     labelEn: "Transfers", types: ["transfer_sent", "transfer_received"] },
];

export default async function TransactionsPage({ params, searchParams }: TransactionsPageProps) {
  const { locale } = await params;
  const { page: pageStr = "1", filter = "all" } = await searchParams;
  const zh = locale === "zh";

  const itemPage = Math.max(1, parseInt(pageStr, 10) || 1);
  const from = (itemPage - 1) * ITEMS_PER_PAGE;
  const to = from + ITEMS_PER_PAGE - 1;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${locale}/auth/login`);
  }

  // Build the query with the active filter applied at the database level.
  const activeFilter = FILTERS.find((f) => f.key === filter) ?? FILTERS[0];

  let query = supabase
    .from("gc_transactions")
    .select("id, type, amount, note, created_at", { count: "exact" })
    .eq("user_id", user.id);

  if (activeFilter.key === "income") {
    query = query.gt("amount", 0);
  } else if (activeFilter.key === "expense") {
    query = query.lt("amount", 0);
  } else if (activeFilter.types) {
    query = query.in("type", activeFilter.types);
  }

  const { data: txData, count } = await query
    .order("created_at", { ascending: false })
    .range(from, to);

  const transactions = (txData ?? []) as TxRow[];
  const totalCount = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / ITEMS_PER_PAGE));

  function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleString(zh ? "zh-CN" : "en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function pageHref(p: number): string {
    return `/${locale}/profile/transactions?filter=${filter}&page=${p}`;
  }

  return (
    <div className="text-white space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white">
            {zh ? "GC 全部流水" : "All GC Transactions"}
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {zh ? `共 ${totalCount} 条记录` : `${totalCount} records`}
          </p>
        </div>
        <Link
          href={`/${locale}/profile`}
          className="shrink-0 text-xs text-gray-400 hover:text-white border border-[#1E3A5F] hover:border-[#FFD700]/50 rounded-xl px-3 py-2 transition-colors"
        >
          ← {zh ? "返回概览" : "Back"}
        </Link>
      </div>

      {/* Filter chips */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {FILTERS.map((f) => {
          const active = f.key === activeFilter.key;
          return (
            <Link
              key={f.key}
              href={`/${locale}/profile/transactions?filter=${f.key}&page=1`}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap shrink-0 transition-all ${
                active
                  ? "bg-[#FFD700] text-[#0A1628]"
                  : "bg-[#0F2040] border border-[#1E3A5F] text-gray-400 hover:text-white"
              }`}
            >
              {zh ? f.labelZh : f.labelEn}
            </Link>
          );
        })}
      </div>

      {/* Transaction list */}
      <div className="bg-[#0F2040] border border-[#1E3A5F] rounded-2xl p-5">
        {transactions.length > 0 ? (
          <div className="space-y-1">
            {transactions.map((tx) => {
              const isPositive = tx.amount > 0;
              return (
                <div
                  key={tx.id}
                  className="flex items-center justify-between gap-3 py-3 border-b border-[#1E3A5F] last:border-0"
                >
                  <div className="min-w-0">
                    <p className="text-sm text-white font-semibold">
                      {gcTransactionLabel(tx.type, zh)}
                    </p>
                    {tx.note && (
                      <p className="text-xs text-gray-500 truncate">{tx.note}</p>
                    )}
                    <p className="text-[10px] text-gray-600 mt-0.5">
                      {formatDate(tx.created_at)}
                    </p>
                  </div>
                  <span
                    className={`text-sm font-black shrink-0 ${
                      isPositive ? "text-green-400" : "text-red-400"
                    }`}
                  >
                    {isPositive ? "+" : ""}
                    {formatGc(tx.amount)} GC
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12 text-gray-600 text-sm">
            {zh ? "暂无交易记录" : "No transactions found"}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          {itemPage > 1 && (
            <Link
              href={pageHref(itemPage - 1)}
              className="px-3 py-1.5 bg-[#0F2040] border border-[#1E3A5F] rounded-lg text-xs text-gray-400 hover:text-white transition-colors"
            >
              {zh ? "上一页" : "Prev"}
            </Link>
          )}
          <span className="text-xs text-gray-500">
            {itemPage} / {totalPages}
          </span>
          {itemPage < totalPages && (
            <Link
              href={pageHref(itemPage + 1)}
              className="px-3 py-1.5 bg-[#0F2040] border border-[#1E3A5F] rounded-lg text-xs text-gray-400 hover:text-white transition-colors"
            >
              {zh ? "下一页" : "Next"}
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
