"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Category {
  id: number;
  slug: string;
  name: string;
  name_zh: string;
  icon: string;
}

interface Post {
  id: number;
  title: string;
  user_id: string | null;
  is_pinned: boolean;
  is_locked: boolean;
  is_featured: boolean;
  is_deleted: boolean;
  reply_count: number;
  like_count: number;
  view_count: number;
  created_at: string;
  category_id: number;
  forum_categories:
    | { id: number; slug: string; name: string; name_zh: string; icon: string }
    | { id: number; slug: string; name: string; name_zh: string; icon: string }[];
  users: { nickname: string } | { nickname: string }[] | null;
}

interface Props {
  locale: string;
  posts: Post[];
  categories: Category[];
  totalPages: number;
  currentPage: number;
  currentCat: string;
  currentQ: string;
  currentFilter: string;
  totalCount: number;
}

const FILTER_OPTIONS = [
  { key: "all",     labelZh: "全部",   label: "All" },
  { key: "active",  labelZh: "正常",   label: "Active" },
  { key: "pinned",  labelZh: "置顶",   label: "Pinned" },
  { key: "locked",  labelZh: "锁定",   label: "Locked" },
  { key: "deleted", labelZh: "已删除", label: "Deleted" },
];

function getCat(post: Post) {
  return Array.isArray(post.forum_categories)
    ? post.forum_categories[0]
    : post.forum_categories;
}

function getUser(post: Post) {
  if (!post.users) return null;
  return Array.isArray(post.users) ? post.users[0] : post.users;
}

function timeAgo(iso: string, zh: boolean) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return zh ? "刚刚" : "just now";
  if (mins < 60) return zh ? `${mins}分钟前` : `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return zh ? `${hrs}小时前` : `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return zh ? `${days}天前` : `${days}d ago`;
}

export default function ForumAdminClient({
  locale, posts, categories, totalPages, currentPage,
  currentCat, currentQ, currentFilter, totalCount,
}: Props) {
  const zh = locale === "zh";
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState(currentQ);
  const [actionMsg, setActionMsg] = useState<{ id: number; text: string; ok: boolean } | null>(null);

  function buildHref(overrides: Record<string, string | number>) {
    const p: Record<string, string> = {
      cat: currentCat,
      q: currentQ,
      page: String(currentPage),
      filter: currentFilter,
      ...Object.fromEntries(Object.entries(overrides).map(([k, v]) => [k, String(v)])),
    };
    const qs = new URLSearchParams(
      Object.entries(p).filter(([, v]) => v !== "" && v !== "1")
    ).toString();
    return `/${locale}/admin/forum${qs ? `?${qs}` : ""}`;
  }

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    router.push(buildHref({ q: search, page: 1 }));
  }

  async function doAction(postId: number, action: string) {
    setActionMsg(null);
    const res = await fetch("/api/forum/admin/manage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ post_id: postId, action }),
    });
    const d = await res.json();
    if (!res.ok) {
      setActionMsg({ id: postId, text: d.error ?? "Failed", ok: false });
      return;
    }
    setActionMsg({ id: postId, text: zh ? "操作成功" : "Done", ok: true });
    startTransition(() => { router.refresh(); });
  }

  async function doDelete(postId: number, restore = false) {
    setActionMsg(null);
    // Restore = set is_deleted=false via manage endpoint; delete = use delete endpoint
    let res: Response;
    if (restore) {
      res = await fetch("/api/forum/admin/manage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ post_id: postId, action: "restore" }),
      });
    } else {
      res = await fetch("/api/forum/admin/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "post", id: postId }),
      });
    }
    const d = await res.json();
    if (!res.ok) {
      setActionMsg({ id: postId, text: d.error ?? "Failed", ok: false });
      return;
    }
    setActionMsg({ id: postId, text: restore ? (zh ? "已恢复" : "Restored") : (zh ? "已删除" : "Deleted"), ok: true });
    startTransition(() => { router.refresh(); });
  }

  return (
    <div className="space-y-4">
      {/* ── Filters row ── */}
      <div className="bg-[#0F2040] border border-[#1E3A5F] rounded-2xl p-4 space-y-3">
        {/* Search */}
        <form onSubmit={submitSearch} className="flex gap-2">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={zh ? "搜索标题…" : "Search title…"}
            className="flex-1 bg-[#0A1628] border border-[#1E3A5F] rounded-xl px-4 py-2 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-[#FFD700]/50"
          />
          <button
            type="submit"
            className="px-5 py-2 bg-[#FFD700] text-[#0A1628] font-black text-sm rounded-xl hover:bg-[#FFC200] transition-colors"
          >
            {zh ? "搜索" : "Search"}
          </button>
        </form>

        {/* Category tabs */}
        <div className="flex gap-2 flex-wrap">
          <Link
            href={buildHref({ cat: "", page: 1 })}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              currentCat === "" ? "bg-[#FFD700] text-[#0A1628]" : "bg-[#0A1628] border border-[#1E3A5F] text-gray-400 hover:text-white"
            }`}
          >
            {zh ? "全部版块" : "All"}
          </Link>
          {categories.map((c) => (
            <Link
              key={c.id}
              href={buildHref({ cat: String(c.id), page: 1 })}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                currentCat === String(c.id)
                  ? "bg-[#FFD700] text-[#0A1628]"
                  : "bg-[#0A1628] border border-[#1E3A5F] text-gray-400 hover:text-white"
              }`}
            >
              {c.icon} {zh ? c.name_zh : c.name}
            </Link>
          ))}
        </div>

        {/* Status filter */}
        <div className="flex gap-2 flex-wrap">
          {FILTER_OPTIONS.map((f) => (
            <Link
              key={f.key}
              href={buildHref({ filter: f.key, page: 1 })}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                currentFilter === f.key
                  ? "bg-blue-500/20 border border-blue-500/50 text-blue-300"
                  : "bg-[#0A1628] border border-[#1E3A5F] text-gray-500 hover:text-white"
              }`}
            >
              {zh ? f.labelZh : f.label}
            </Link>
          ))}
        </div>
      </div>

      {/* ── Count ── */}
      <p className="text-gray-500 text-xs px-1">
        {zh ? `共 ${totalCount} 条结果` : `${totalCount} result${totalCount !== 1 ? "s" : ""}`}
      </p>

      {/* ── Post list ── */}
      <div className="space-y-2">
        {posts.length === 0 && (
          <div className="py-16 text-center text-gray-600 text-sm">
            {zh ? "暂无帖子" : "No posts found"}
          </div>
        )}
        {posts.map((post) => {
          const cat = getCat(post);
          const user = getUser(post);
          const isMsg = actionMsg?.id === post.id;
          return (
            <div
              key={post.id}
              className={`bg-[#0F2040] border rounded-2xl p-4 transition-opacity ${
                post.is_deleted ? "border-red-500/20 opacity-60" : "border-[#1E3A5F]"
              } ${isPending ? "opacity-50" : ""}`}
            >
              <div className="flex items-start gap-3">
                {/* Status badges */}
                <div className="flex flex-col gap-1 items-center pt-0.5 shrink-0">
                  {post.is_pinned   && <span title="Pinned"   className="text-[10px] text-[#FFD700]">📌</span>}
                  {post.is_locked   && <span title="Locked"   className="text-[10px] text-blue-400">🔒</span>}
                  {post.is_featured && <span title="Featured" className="text-[10px] text-purple-400">⭐</span>}
                  {post.is_deleted  && <span title="Deleted"  className="text-[10px] text-red-400">🗑</span>}
                  {!post.is_pinned && !post.is_locked && !post.is_featured && !post.is_deleted && (
                    <span className="text-[10px] text-gray-700">#</span>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    {cat && (
                      <span className="text-[10px] bg-[#0A1628] border border-[#1E3A5F] text-gray-500 px-1.5 py-0.5 rounded-full">
                        {cat.icon} {zh ? cat.name_zh : cat.name}
                      </span>
                    )}
                    <span className="text-gray-600 text-[10px]">#{post.id}</span>
                  </div>
                  <p className="text-sm font-bold text-white truncate leading-snug">{post.title}</p>
                  <p className="text-[10px] text-gray-600 mt-1">
                    {user?.nickname ?? (zh ? "未知用户" : "Unknown")}
                    {" · "}{timeAgo(post.created_at, zh)}
                    {" · "}💬{post.reply_count} 👍{post.like_count} 👁{post.view_count}
                  </p>
                  {isMsg && (
                    <p className={`text-[10px] mt-1 ${actionMsg.ok ? "text-green-400" : "text-red-400"}`}>
                      {actionMsg.ok ? "✓" : "⚠"} {actionMsg.text}
                    </p>
                  )}
                </div>

                {/* Action buttons */}
                <div className="flex flex-wrap gap-1.5 shrink-0 justify-end max-w-[200px]">
                  {/* View */}
                  <a
                    href={`/${locale}/forum/${getCat(post)?.slug ?? "general"}/${post.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-2.5 py-1 text-[10px] font-bold rounded-lg bg-gray-700/30 text-gray-400 hover:text-white transition-colors"
                  >
                    {zh ? "查看" : "View"}
                  </a>

                  {/* Pin / Unpin */}
                  <button
                    onClick={() => doAction(post.id, post.is_pinned ? "unpin" : "pin")}
                    disabled={isPending}
                    className={`px-2.5 py-1 text-[10px] font-bold rounded-lg transition-colors disabled:opacity-40 ${
                      post.is_pinned
                        ? "bg-yellow-500/20 border border-yellow-500/40 text-yellow-400 hover:bg-yellow-500/30"
                        : "bg-[#0A1628] border border-[#1E3A5F] text-gray-500 hover:text-white"
                    }`}
                  >
                    {post.is_pinned ? (zh ? "取消置顶" : "Unpin") : (zh ? "置顶" : "Pin")}
                  </button>

                  {/* Lock / Unlock */}
                  <button
                    onClick={() => doAction(post.id, post.is_locked ? "unlock" : "lock")}
                    disabled={isPending}
                    className={`px-2.5 py-1 text-[10px] font-bold rounded-lg transition-colors disabled:opacity-40 ${
                      post.is_locked
                        ? "bg-blue-500/20 border border-blue-500/40 text-blue-400 hover:bg-blue-500/30"
                        : "bg-[#0A1628] border border-[#1E3A5F] text-gray-500 hover:text-white"
                    }`}
                  >
                    {post.is_locked ? (zh ? "解锁" : "Unlock") : (zh ? "锁定" : "Lock")}
                  </button>

                  {/* Feature / Unfeature */}
                  <button
                    onClick={() => doAction(post.id, post.is_featured ? "unfeature" : "feature")}
                    disabled={isPending}
                    className={`px-2.5 py-1 text-[10px] font-bold rounded-lg transition-colors disabled:opacity-40 ${
                      post.is_featured
                        ? "bg-purple-500/20 border border-purple-500/40 text-purple-400 hover:bg-purple-500/30"
                        : "bg-[#0A1628] border border-[#1E3A5F] text-gray-500 hover:text-white"
                    }`}
                  >
                    {post.is_featured ? (zh ? "取消精华" : "Unfeature") : (zh ? "设精华" : "Feature")}
                  </button>

                  {/* Delete / Restore */}
                  {post.is_deleted ? (
                    <button
                      onClick={() => doDelete(post.id, true)}
                      disabled={isPending}
                      className="px-2.5 py-1 text-[10px] font-bold rounded-lg bg-green-500/10 border border-green-500/30 text-green-400 hover:bg-green-500/20 transition-colors disabled:opacity-40"
                    >
                      {zh ? "恢复" : "Restore"}
                    </button>
                  ) : (
                    <button
                      onClick={() => doDelete(post.id, false)}
                      disabled={isPending}
                      className="px-2.5 py-1 text-[10px] font-bold rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 transition-colors disabled:opacity-40"
                    >
                      {zh ? "删除" : "Delete"}
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Pagination ── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2 pb-6">
          {currentPage > 1 && (
            <Link
              href={buildHref({ page: currentPage - 1 })}
              className="px-4 py-2 bg-[#0F2040] border border-[#1E3A5F] text-gray-400 rounded-xl text-sm hover:text-white transition-colors"
            >
              {zh ? "上一页" : "Prev"}
            </Link>
          )}
          <span className="text-gray-500 text-sm">
            {currentPage} / {totalPages}
          </span>
          {currentPage < totalPages && (
            <Link
              href={buildHref({ page: currentPage + 1 })}
              className="px-4 py-2 bg-[#0F2040] border border-[#1E3A5F] text-gray-400 rounded-xl text-sm hover:text-white transition-colors"
            >
              {zh ? "下一页" : "Next"}
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
