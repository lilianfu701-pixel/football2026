"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import TranslatedContent from "@/components/forum/TranslatedContent";
import PostActions from "@/app/[locale]/forum/thread/[id]/PostActions";

const RichTextEditor = dynamic(() => import("@/components/forum/RichTextEditor"), { ssr: false });

// ── Types ────────────────────────────────────────────────────────────────────
interface Props {
  // Content
  originalHtml:       string;
  cachedTranslations: Record<string, string>;
  defaultLang:        string;
  contentType:        "post_content" | "reply_content";
  contentId:          number;     // post.id or reply.id
  editedAt?:          string | null;

  // For posts only — allows title editing alongside content
  title?:             string;

  // Identity
  isPost:             boolean;
  userId:             string | null;
  authorId:           string | null;

  // PostActions passthrough
  locale:             string;
  zh:                 boolean;
  postId:             number;
  replyId?:           number;
  authorName:         string;
  isAdmin:            boolean;
  isLocked:           boolean;
  likeCount:          number;
  isLiked:            boolean;
  isFollowing?:       boolean;
  replyCount?:        number;
  quoteContent:       string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function timeAgoShort(dateStr: string, zh: boolean): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60_000);
  const h = Math.floor(diff / 3_600_000);
  const d = Math.floor(diff / 86_400_000);
  if (m < 1)   return zh ? "刚刚"       : "just now";
  if (m < 60)  return zh ? `${m}分钟前` : `${m}m ago`;
  if (h < 24)  return zh ? `${h}小时前` : `${h}h ago`;
  return             zh ? `${d}天前`   : `${d}d ago`;
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function EditableFloor({
  originalHtml, cachedTranslations, defaultLang, contentType, contentId, editedAt,
  title, isPost, userId, authorId,
  locale, zh, postId, replyId, authorName, isAdmin, isLocked,
  likeCount, isLiked, isFollowing, replyCount, quoteContent,
}: Props) {
  const router = useRouter();
  const isAuthor = !!(userId && userId === authorId);

  const [isEditing,   setIsEditing]   = useState(false);
  const [editContent, setEditContent] = useState(originalHtml);
  const [editTitle,   setEditTitle]   = useState(title ?? "");
  const [injectHtml,  setInjectHtml]  = useState("");   // triggers editor reset
  const [submitting,  setSubmitting]  = useState(false);
  const [editErr,     setEditErr]     = useState<string | null>(null);
  const initRef = useRef(false);

  function startEdit() {
    // Re-seed editor with original content on each open
    if (!initRef.current) {
      setInjectHtml(originalHtml);
      initRef.current = true;
    } else {
      // Toggle inject to re-trigger editor useEffect
      setInjectHtml("");
      requestAnimationFrame(() => setInjectHtml(originalHtml));
    }
    setEditContent(originalHtml);
    setEditTitle(title ?? "");
    setEditErr(null);
    setIsEditing(true);
  }

  function cancelEdit() {
    setIsEditing(false);
    setEditErr(null);
  }

  async function handleSave() {
    const hasImage = /<img[\s>]/.test(editContent);
    const textOnly = editContent
      .replace(/<[^>]*>/g, "")
      .replace(/&nbsp;/gi, " ")
      .replace(/\s+/g, " ")
      .trim();

    if (!textOnly && !hasImage) {
      setEditErr(zh ? "内容不能为空" : "Content cannot be empty");
      return;
    }
    if (isPost && !editTitle.trim()) {
      setEditErr(zh ? "标题不能为空" : "Title cannot be empty");
      return;
    }

    setSubmitting(true);
    setEditErr(null);
    try {
      const url  = isPost
        ? `/api/forum/post/${contentId}`
        : `/api/forum/reply/${contentId}`;
      const body = isPost
        ? { title: editTitle.trim(), content: editContent }
        : { content: editContent };

      const res  = await fetch(url, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setEditErr(data.error ?? (zh ? "保存失败" : "Failed to save"));
        return;
      }
      setIsEditing(false);
      router.refresh();   // re-fetch server component — updates content + title everywhere
    } catch {
      setEditErr(zh ? "网络错误" : "Network error");
    } finally {
      setSubmitting(false);
    }
  }

  // ── Edit mode ──────────────────────────────────────────────────────────────
  if (isEditing) {
    return (
      <>
        {/* Editor area */}
        <div className="flex-1 px-5 py-4 space-y-3">

          {/* Title input — posts only */}
          {isPost && (
            <div>
              <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest block mb-1.5">
                {zh ? "标题" : "Title"}
              </label>
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                maxLength={200}
                className="w-full bg-[#080F1F] border border-[#2A4A7F] rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 outline-none focus:border-[#FFD700]/40 transition-colors"
                placeholder={zh ? "帖子标题…" : "Post title…"}
              />
            </div>
          )}

          {/* Body editor */}
          <div>
            {isPost && (
              <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest block mb-1.5">
                {zh ? "正文" : "Content"}
              </label>
            )}
            <RichTextEditor
              value={editContent}
              onChange={setEditContent}
              injectHtml={injectHtml}
              zh={zh}
              placeholder={zh ? "编辑内容…" : "Edit content…"}
            />
          </div>

          {/* Error */}
          {editErr && (
            <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">
              ⚠ {editErr}
            </p>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              onClick={cancelEdit}
              className="px-4 py-2 text-xs text-gray-400 hover:text-white border border-[#1E3A5F] rounded-xl transition-colors"
            >
              {zh ? "取消" : "Cancel"}
            </button>
            <button
              onClick={handleSave}
              disabled={submitting}
              className="px-5 py-2 text-xs font-black bg-[#FFD700] text-[#0A1628] rounded-xl hover:bg-[#FFC200] transition-colors disabled:opacity-50"
            >
              {submitting ? "…" : (zh ? "💾 保存" : "💾 Save")}
            </button>
          </div>
        </div>
      </>
    );
  }

  // ── View mode ──────────────────────────────────────────────────────────────
  return (
    <>
      {/* Content body */}
      <div className="flex-1 px-5 py-4">
        <TranslatedContent
          originalHtml={originalHtml}
          cachedTranslations={cachedTranslations}
          defaultLang={defaultLang}
          type={contentType}
          id={contentId}
          zh={zh}
        />
        {/* Edited indicator */}
        {editedAt && (
          <p className="mt-3 text-[10px] text-gray-600 flex items-center gap-1">
            <span>✏️</span>
            <span>{zh ? `已编辑 · ${timeAgoShort(editedAt, zh)}` : `Edited · ${timeAgoShort(editedAt, zh)}`}</span>
          </p>
        )}
      </div>

      {/* Action bar */}
      <div className="border-t border-dashed border-[#1E3A5F]/60 px-4 py-2 bg-[#080F1F]/20">
        <PostActions
          locale={locale}
          postId={postId}
          replyId={replyId}
          userId={userId}
          authorId={authorId}
          authorName={authorName}
          isAdmin={isAdmin}
          isLocked={isLocked}
          likeCount={likeCount}
          isLiked={isLiked}
          isFollowing={isFollowing}
          replyCount={replyCount}
          quoteContent={quoteContent}
          zh={zh}
          isAuthor={isAuthor}
          onEditClick={!isLocked ? startEdit : undefined}
        />
      </div>
    </>
  );
}
