"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import RichTextEditor from "@/components/forum/RichTextEditor";
import ReportModal from "@/components/forum/ReportModal";

interface Props {
  locale:        string;
  postId:        number;
  replyId?:      number;
  userId:        string | null;
  authorId?:     string | null;
  authorName?:   string;
  isAdmin?:      boolean;
  isLocked:      boolean;
  likeCount:     number;
  isLiked:       boolean;
  isFollowing?:  boolean;
  replyCount?:   number;
  showRating?:   boolean;
  zh?:           boolean;
  quoteContent?: string;   // HTML of the cell — used when "引用" is clicked

  // edit support
  isAuthor?:     boolean;          // true when userId === authorId (computed by parent)
  onEditClick?:  () => void;       // called when Edit button is clicked

  // render modes
  isHeaderMode?: boolean;
  isReplyMode?:  boolean;
  isReplyBox?:   boolean;
  isBookmarked?: boolean;
}

export default function PostActions({
  locale, postId, replyId, userId,
  authorId, authorName = "?",
  isAdmin = false,
  isLocked, likeCount, isLiked,
  isFollowing, showRating,
  zh = false,
  quoteContent,
  isAuthor = false,
  onEditClick,
  isHeaderMode, isReplyBox,
  isBookmarked = false,
}: Props) {
  const router = useRouter();

  const [liked,       setLiked]      = useState(isLiked);
  const [likes,       setLikes]      = useState(likeCount);
  const [following,   setFollowing]  = useState(isFollowing ?? false);
  const [bookmarked,  setBookmarked] = useState(isBookmarked);
  const [replyOpen,   setReplyOpen]  = useState(false);
  const [replyText,   setReplyText]  = useState("");
  const [injectHtml,  setInjectHtml] = useState("");
  const [submitting,  setSubmitting] = useState(false);
  const [replyErr,    setReplyErr]   = useState<string | null>(null);
  const [deleted,     setDeleted]    = useState(false);
  const [deleting,    setDeleting]   = useState(false);
  const [showReport,  setShowReport] = useState(false);

  // Bottom reply box: listen for quote events dispatched by cell PostActions
  useEffect(() => {
    if (!isReplyBox) return;
    function handler(e: Event) {
      const { html } = (e as CustomEvent<{ html: string }>).detail;
      setReplyText(html);
      setInjectHtml(html);
      setTimeout(() => {
        document.getElementById("reply-box")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 50);
    }
    window.addEventListener("forum:quote", handler);
    return () => window.removeEventListener("forum:quote", handler);
  }, [isReplyBox]);

  const isTarget = replyId ? "reply" : "post";
  const targetId = replyId ?? postId;

  // ── Admin delete ─────────────────────────────────────────────────────────
  async function handleDelete() {
    const isPost  = !replyId;
    const label   = isPost
      ? (zh ? "确定删除整个帖子？此操作不可恢复。" : "Delete this entire post? Cannot be undone.")
      : (zh ? "确定删除此楼？此操作不可恢复。"   : "Delete this reply? Cannot be undone.");
    if (!window.confirm(label)) return;

    setDeleting(true);
    const res = await fetch("/api/forum/admin/delete", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ type: isPost ? "post" : "reply", id: replyId ?? postId }),
    });
    setDeleting(false);
    if (res.ok) {
      setDeleted(true);
      if (isPost) {
        // Redirect back to forum on post deletion
        router.push(`/${locale}/forum`);
      } else {
        router.refresh();
      }
    }
  }

  // ── Like ─────────────────────────────────────────────────────────────────
  async function handleLike() {
    if (!userId) { router.push(`/${locale}/auth/login`); return; }
    const next = !liked;
    setLiked(next);
    setLikes((n) => n + (next ? 1 : -1));
    await fetch("/api/forum/like", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ target_type: isTarget, target_id: targetId, liked: next }),
    });
  }

  // ── Bookmark post ─────────────────────────────────────────────────────────
  async function handleBookmark() {
    if (!userId) { router.push(`/${locale}/auth/login`); return; }
    const next = !bookmarked;
    setBookmarked(next);
    await fetch("/api/forum/bookmark", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ post_id: postId, bookmarked: next }),
    });
  }

  // ── Follow post ───────────────────────────────────────────────────────────
  async function handleFollow() {
    if (!userId) { router.push(`/${locale}/auth/login`); return; }
    const next = !following;
    setFollowing(next);
    await fetch("/api/forum/follow", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ post_id: postId, following: next }),
    });
  }

  // ── Reply submit ──────────────────────────────────────────────────────────
  async function handleReply() {
    if (!userId) { router.push(`/${locale}/auth/login`); return; }
    // Strip tags + HTML entities; also allow image-only replies
    const hasImage = /<img[\s>]/.test(replyText);
    const textOnly = replyText
      .replace(/<[^>]*>/g, "")
      .replace(/&nbsp;/gi, " ")
      .replace(/&[a-z]+;/gi, " ")
      .trim();
    if (!textOnly && !hasImage) {
      setReplyErr(zh ? "回复内容不能为空" : "Reply cannot be empty");
      return;
    }

    setSubmitting(true);
    setReplyErr(null);
    try {
      const res  = await fetch("/api/forum/reply", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          post_id:   postId,
          content:   replyText,
          parent_id: replyId ?? null,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setReplyErr(data.error ?? "Failed"); return; }
      setReplyText("");
      setReplyOpen(false);
      router.refresh();
    } catch {
      setReplyErr(zh ? "网络错误" : "Network error");
    } finally {
      setSubmitting(false);
    }
  }

  // ── Header mode: bookmark + follow + recommend ───────────────────────────
  if (isHeaderMode) {
    return (
      <div className="flex items-center gap-2 flex-wrap">
        {/* Bookmark */}
        <button onClick={handleBookmark}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-bold transition-all ${
            bookmarked
              ? "bg-orange-500/15 border-orange-500/40 text-orange-400"
              : "bg-[#0A1628] border-[#1E3A5F] text-gray-400 hover:text-white"
          }`}>
          {bookmarked ? "🔖" : "🔖"} {zh ? "收藏" : "Bookmark"}
        </button>
        {/* Follow */}
        <button onClick={handleFollow}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-bold transition-all ${
            following
              ? "bg-[#FFD700]/15 border-[#FFD700]/40 text-[#FFD700]"
              : "bg-[#0A1628] border-[#1E3A5F] text-gray-400 hover:text-white"
          }`}>
          {following ? "⭐" : "☆"} {zh ? "关注" : "Follow"}
        </button>
        {/* Recommend */}
        <button onClick={handleLike}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-bold transition-all ${
            liked
              ? "bg-green-500/15 border-green-500/30 text-green-400"
              : "bg-[#0A1628] border-[#1E3A5F] text-gray-400 hover:text-white"
          }`}>
          👍 {zh ? "推荐" : "Recommend"}{likes > 0 ? ` (${likes})` : ""}
        </button>
      </div>
    );
  }

  // ── Reply box mode: full composer at bottom ───────────────────────────────
  if (isReplyBox) {
    if (!userId) {
      return (
        <div className="bg-[#0F2040] border border-[#1E3A5F] rounded-2xl px-5 py-6 text-center">
          <p className="text-gray-500 text-sm mb-3">
            {zh ? "登录后才能回复" : "Login to reply"}
          </p>
          <a href={`/${locale}/auth/login`}
            className="inline-block bg-[#FFD700] text-[#0A1628] font-black px-5 py-2.5 rounded-xl text-sm hover:bg-[#FFC200] transition-colors">
            {zh ? "登录" : "Login"}
          </a>
        </div>
      );
    }
    return (
      <div id="reply-box" className="bg-[#0F2040] border border-[#1E3A5F] rounded-2xl overflow-hidden">
        <div className="px-5 py-3 border-b border-[#1E3A5F]">
          <span className="text-sm font-black text-white">✍️ {zh ? "发表回复" : "Post a Reply"}</span>
        </div>
        <div className="p-4">
          <RichTextEditor
            value={replyText}
            onChange={setReplyText}
            injectHtml={injectHtml}
            zh={zh}
            placeholder={zh ? "写下你的回复…" : "Write your reply…"}
          />
          {replyErr && <p className="text-xs text-red-400 mt-2">⚠ {replyErr}</p>}
          <div className="flex justify-end mt-3">
            <button
              onClick={handleReply}
              disabled={submitting}
              className="bg-[#FFD700] text-[#0A1628] font-black px-6 py-2.5 rounded-xl text-sm hover:bg-[#FFC200] transition-colors disabled:opacity-50"
            >
              {submitting ? "…" : (zh ? "🚀 提交回复" : "🚀 Submit Reply")}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Cell action bar: ❤️ 引用 ⭐评分 🚩举报 💬回复 | ↑Top ───────────────────
  return (
    <>
      <div className="flex items-center gap-0.5 flex-wrap text-[11px]">

        {/* Like */}
        <button
          onClick={handleLike}
          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg font-bold transition-all border ${
            liked
              ? "bg-red-500/15 border-red-500/30 text-red-400"
              : "border-transparent text-gray-500 hover:text-white hover:border-[#1E3A5F]"
          }`}
        >
          ❤️ {likes > 0 ? likes : (zh ? "点赞" : "Like")}
        </button>

        {/* Quote */}
        {!isLocked && userId && (
          <button
            onClick={() => {
              // Build quoted HTML: strip tags, limit to ~150 chars, wrap in blockquote
              const plain = (quoteContent ?? "")
                .replace(/<img[^>]*>/gi, "")
                .replace(/<[^>]*>/g, " ")
                .replace(/&nbsp;/gi, " ")
                .replace(/\s+/g, " ")
                .trim();
              const MAX = 150;
              const excerpt = plain.length > MAX ? plain.slice(0, MAX) + "…" : plain;
              const html = excerpt
                ? `<blockquote><p><strong>@${authorName}：</strong></p><p>「${excerpt}」</p></blockquote><p></p>`
                : "";

              if (html) {
                // Inject into this cell's inline reply box
                setInjectHtml(html);
                setReplyText(html);
                setReplyOpen(true);
                // Also broadcast for the bottom reply box
                window.dispatchEvent(new CustomEvent("forum:quote", { detail: { html } }));
                setTimeout(() => {
                  document.getElementById(`inline-reply-${targetId}`)
                    ?.scrollIntoView({ behavior: "smooth", block: "nearest" });
                }, 80);
              } else {
                // No content — just open inline reply
                setReplyOpen(true);
              }
            }}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg font-bold border border-transparent text-gray-500 hover:text-white hover:border-[#1E3A5F] transition-all"
          >
            ⬅ {zh ? "引用" : "Quote"}
          </button>
        )}


        {/* Edit — author only */}
        {isAuthor && !isLocked && onEditClick && (
          <button
            onClick={onEditClick}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg font-bold border border-transparent text-gray-500 hover:text-[#FFD700] hover:border-[#1E3A5F] transition-all"
          >
            ✏️ {zh ? "编辑" : "Edit"}
          </button>
        )}

        {/* Admin: Delete */}
        {isAdmin && !deleted && (
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg font-bold border border-transparent text-gray-600 hover:text-red-400 hover:bg-red-500/10 hover:border-red-500/20 transition-all disabled:opacity-50"
          >
            🗑 {!replyId ? (zh ? "删除帖子" : "Del Post") : (zh ? "删除此楼" : "Del Floor")}
          </button>
        )}
        {deleted && (
          <span className="px-2.5 py-1.5 text-[11px] text-red-500/60">✓ {zh ? "已删除" : "Deleted"}</span>
        )}

        {/* Report */}
        {userId && (
          <button
            onClick={() => setShowReport(true)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg font-bold border border-transparent text-gray-500 hover:text-orange-400 hover:border-[#1E3A5F] transition-all">
            🚩 {zh ? "举报" : "Report"}
          </button>
        )}

        {/* Inline Reply */}
        {!isLocked && (
          <button
            onClick={() => {
              if (!userId) { router.push(`/${locale}/auth/login`); return; }
              setReplyOpen(v => !v);
              if (!replyOpen) {
                setTimeout(() => {
                  document.getElementById(`inline-reply-${targetId}`)
                    ?.scrollIntoView({ behavior: "smooth", block: "nearest" });
                }, 100);
              }
            }}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg font-bold border transition-all ${
              replyOpen
                ? "bg-[#FFD700]/15 border-[#FFD700]/40 text-[#FFD700]"
                : "border-transparent text-gray-500 hover:text-white hover:border-[#1E3A5F]"
            }`}
          >
            💬 {zh ? "回复" : "Reply"}
          </button>
        )}

        {/* Top */}
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="ml-auto flex items-center gap-1 px-2.5 py-1.5 rounded-lg font-bold border border-transparent text-gray-500 hover:text-white hover:border-[#1E3A5F] transition-all"
        >
          ↑ Top
        </button>
      </div>

      {/* Inline reply composer */}
      {replyOpen && !isLocked && userId && (
        <div id={`inline-reply-${targetId}`} className="mt-3 pt-3 border-t border-dashed border-[#1E3A5F]">
          <RichTextEditor
            value={replyText}
            onChange={setReplyText}
            injectHtml={injectHtml}
            zh={zh}
            placeholder={zh ? "写下你的回复…" : "Write your reply…"}
          />
          {replyErr && <p className="text-xs text-red-400 mt-2">⚠ {replyErr}</p>}
          <div className="flex items-center gap-2 mt-2 justify-end">
            <button
              onClick={() => { setReplyOpen(false); setReplyText(""); setReplyErr(null); }}
              className="px-4 py-2 text-xs text-gray-500 hover:text-white border border-[#1E3A5F] rounded-xl transition-colors"
            >
              {zh ? "取消" : "Cancel"}
            </button>
            <button
              onClick={handleReply}
              disabled={submitting}
              className="px-4 py-2 text-xs font-black bg-[#FFD700] text-[#0A1628] rounded-xl hover:bg-[#FFC200] transition-colors disabled:opacity-50"
            >
              {submitting ? "…" : (zh ? "提交" : "Submit")}
            </button>
          </div>
        </div>
      )}

      {/* Report modal */}
      {showReport && (
        <ReportModal
          postId={replyId ? undefined : postId}
          replyId={replyId}
          zh={zh}
          onClose={() => setShowReport(false)}
        />
      )}
    </>
  );
}
