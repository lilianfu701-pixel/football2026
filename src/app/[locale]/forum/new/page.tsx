export const dynamic = "force-dynamic";

// Server component — fetches categories, passes to client form
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import NewPostForm from "./NewPostForm";

interface PageProps {
  params:      Promise<{ locale: string }>;
  searchParams: Promise<{ cat?: string; stage?: string }>;
}

// Slugs that are system-only boards — users cannot post here
const LOCKED_SLUGS = ["match"];

export default async function NewPostPage({ params, searchParams }: PageProps) {
  const { locale }          = await params;
  const { cat = "", stage = "" } = await searchParams;
  const zh = locale === "zh";

  const supabase = await createClient();

  // Auth check (server-side)
  const { data: { user } } = await supabase.auth.getUser();

  // Fetch open categories (no FK joins, no client-side async)
  const { data: allCats } = await supabase
    .from("forum_categories")
    .select("id, slug, name, name_zh, icon")
    .order("sort_order");

  const categories = (allCats ?? []).filter(
    (c: { slug: string }) => !LOCKED_SLUGS.includes(c.slug)
  );

  // Detect if user came from a locked board
  const fromLockedBoard = LOCKED_SLUGS.includes(cat);

  return (
    <div className="min-h-screen bg-[#0A1628] text-white pb-20">
      <div className="pt-6">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
          <Link href={`/${locale}/forum`} className="hover:text-white transition-colors">
            {zh ? "论坛" : "Forum"}
          </Link>
          <span>/</span>
          <span className="text-white">{zh ? "发新帖" : "New Post"}</span>
        </div>

        <div className="mb-6">
          <h1 className="text-2xl font-black text-white">✏️ {zh ? "发新帖" : "New Post"}</h1>
          <p className="text-gray-500 text-sm mt-1">
            {zh ? "分享你的观点，参与讨论" : "Share your thoughts and join the discussion"}
          </p>
        </div>

        <div className="bg-[#0F2040] border border-[#1E3A5F] rounded-2xl p-6">
          {fromLockedBoard ? (
            /* Locked-board notice */
            <div className="text-center py-10 space-y-4">
              <div className="text-5xl">📌</div>
              <h2 className="text-lg font-black text-white">
                {zh ? "此板块为系统专属" : "This board is for official posts only"}
              </h2>
              <p className="text-sm text-gray-500 max-w-sm mx-auto">
                {zh
                  ? "赛事讨论板块的帖子由系统自动生成，用户无法在此发帖。请选择其他板块参与讨论。"
                  : "Match threads are created automatically. Please choose another board."}
              </p>
              <div className="flex justify-center gap-3 pt-2">
                <Link
                  href={`/${locale}/forum/${cat}`}
                  className="px-5 py-2.5 border border-[#1E3A5F] text-gray-400 rounded-xl text-sm hover:text-white transition-colors"
                >
                  {zh ? "返回板块" : "Back to board"}
                </Link>
                <Link
                  href={`/${locale}/forum/new`}
                  className="px-5 py-2.5 bg-[#FFD700] text-[#0A1628] font-black rounded-xl text-sm hover:bg-[#FFC200] transition-colors"
                >
                  {zh ? "选择其他板块发帖" : "Post in another board"}
                </Link>
              </div>
            </div>
          ) : (
            <NewPostForm
              locale={locale}
              categories={categories as { id: number; slug: string; name: string; name_zh: string; icon: string }[]}
              defaultCat={cat}
              defaultStage={stage}
              isLoggedIn={!!user}
            />
          )}
        </div>

      </div>
    </div>
  );
}
