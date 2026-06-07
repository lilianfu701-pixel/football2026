"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import Link from "next/link";
import TagSelector from "@/components/forum/TagSelector";
import { lc } from "@/i18n/content";

const RichTextEditor = dynamic(
  () => import("@/components/forum/RichTextEditor"),
  {
    ssr: false,
    loading: () => (
      <div className="border border-[#1E3A5F] rounded-xl bg-[#0A1628] h-64 flex items-center justify-center">
        <div className="w-6 h-6 rounded-full border-2 border-[#FFD700] border-t-transparent animate-spin" />
      </div>
    ),
  }
);

interface Category {
  id:      number;
  slug:    string;
  name:    string;
  name_zh: string;
  icon:    string;
}

interface Props {
  locale:       string;
  categories:   Category[];
  defaultCat:   string;
  defaultStage: string;
  isLoggedIn:   boolean;
}

const MATCH_STAGES = [
  { key: "group",   zh: "小组赛",  en: "Group Stage"    },
  { key: "round32", zh: "32强",    en: "Round of 32"    },
  { key: "round16", zh: "16强",    en: "Round of 16"    },
  { key: "quarter", zh: "四强",    en: "Quarter-finals" },
  { key: "semi",    zh: "半决赛",  en: "Semi-finals"    },
  { key: "third",   zh: "季军赛",  en: "3rd Place"      },
  { key: "final",   zh: "决赛",    en: "Final"          },
] as const;

function textLength(html: string) {
  return html.replace(/<[^>]*>/g, "").length;
}

export default function NewPostForm({
  locale, categories, defaultCat, defaultStage, isLoggedIn,
}: Props) {
  const zh     = locale === "zh";
  const router = useRouter();

  // Initialise catId/catSlug from server-provided defaultCat — stable, no async
  const defaultCatObj = categories.find((c) => c.slug === defaultCat) ?? null;

  const [catId,   setCatId]   = useState<number | null>(defaultCatObj?.id ?? null);
  const [catSlug, setCatSlug] = useState<string>(defaultCatObj?.slug ?? "");
  const [stage,   setStage]   = useState<string>(defaultStage);
  const [title,   setTitle]   = useState("");
  const [content, setContent] = useState("");
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState<string | null>(null);
  const [selectedTags, setSelectedTags] = useState<number[]>([]);

  const isMatchCat = catSlug === "match";

  // Redirect if not logged in
  useEffect(() => {
    if (!isLoggedIn) router.push(`/${locale}/auth/login`);
  }, [isLoggedIn, locale, router]);

  function handleCatSelect(c: Category) {
    setCatId(c.id);
    setCatSlug(c.slug);
    if (c.slug !== "match") setStage("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!catId)               { setError(lc(locale, "请选择板块", "Select a category")); return; }
    if (isMatchCat && !stage) { setError(lc(locale, "请选择赛事阶段", "Select a stage"));    return; }
    if (!title.trim())        { setError(lc(locale, "标题不能为空", "Title is required"));  return; }
    if (!content || textLength(content) === 0) {
      setError(lc(locale, "内容不能为空", "Content is required")); return;
    }
    if (title.length > 120)          { setError(lc(locale, "标题最多 120 字", "Title max 120 chars")); return; }
    if (textLength(content) > 10000) { setError(lc(locale, "内容过长", "Content too long"));    return; }

    setLoading(true);
    setError(null);
    try {
      const body: Record<string, unknown> = {
        category_id: catId,
        title:       title.trim(),
        content,
      };
      if (isMatchCat && stage) body.stage = stage;
      if (selectedTags.length > 0) body.tag_ids = selectedTags;

      const res  = await fetch("/api/forum/post", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? (lc(locale, "发帖失败", "Failed"))); return; }
      router.push(`/${locale}/forum/thread/${data.id}`);
    } catch {
      setError(lc(locale, "网络错误，请重试", "Network error"));
    } finally {
      setLoading(false);
    }
  }

  if (!isLoggedIn) return (
    <div className="text-center py-10">
      <p className="text-gray-500 text-sm mb-4">{lc(locale, "请先登录", "Please login first")}</p>
      <Link href={`/${locale}/auth/login`}
        className="inline-block bg-[#FFD700] text-[#0A1628] font-black px-5 py-2.5 rounded-xl text-sm">
        {lc(locale, "登录", "Login")}
      </Link>
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-5">

      {/* ── Category selector ─────────────────────────────────────────────── */}
      <div>
        <label className="block text-xs text-gray-500 uppercase tracking-widest font-bold mb-2">
          {lc(locale, "选择板块", "Category")}
          <span className="ml-1 text-red-400">*</span>
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {categories.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => handleCatSelect(c)}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-semibold transition-all text-left ${
                catId === c.id
                  ? "bg-[#FFD700]/15 border-[#FFD700]/50 text-[#FFD700]"
                  : "bg-[#0A1628] border-[#1E3A5F] text-gray-400 hover:text-white hover:border-[#2A4A7F]"
              }`}
            >
              <span className="text-base shrink-0">{c.icon}</span>
              <span className="truncate">{zh ? c.name_zh : c.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Stage — only for Match Talk ───────────────────────────────────── */}
      {isMatchCat && (
        <div>
          <label className="block text-xs text-gray-500 uppercase tracking-widest font-bold mb-2">
            {lc(locale, "赛事阶段", "Stage")}
            <span className="ml-1 text-red-400">*</span>
          </label>
          <div className="flex flex-wrap gap-2">
            {MATCH_STAGES.map((s) => (
              <button
                key={s.key}
                type="button"
                onClick={() => setStage(s.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors border ${
                  stage === s.key
                    ? "bg-[#FFD700]/15 border-[#FFD700]/50 text-[#FFD700]"
                    : "bg-[#0A1628] border-[#1E3A5F] text-gray-400 hover:text-white"
                }`}
              >
                {zh ? s.zh : s.en}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Title ─────────────────────────────────────────────────────────── */}
      <div>
        <label className="block text-xs text-gray-500 uppercase tracking-widest font-bold mb-2">
          {lc(locale, "标题", "Title")}
          <span className="ml-1 text-red-400">*</span>
          <span className="ml-2 text-gray-600 normal-case font-normal">
            ({lc(locale, "最多 120 字", "max 120 chars")})
          </span>
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={lc(locale, "写一个吸引人的标题…", "Write a compelling title…")}
          maxLength={120}
          className="w-full bg-[#0A1628] border border-[#1E3A5F] focus:border-[#FFD700] rounded-xl px-4 py-3 text-white text-sm placeholder-gray-600 focus:outline-none transition-colors"
        />
        <p className="text-[10px] text-gray-600 mt-1 text-right">{title.length}/120</p>
      </div>

      {/* ── Rich Text Editor ──────────────────────────────────────────────── */}
      <div>
        <label className="block text-xs text-gray-500 uppercase tracking-widest font-bold mb-2">
          {lc(locale, "正文", "Content")}
          <span className="ml-1 text-red-400">*</span>
          <span className="ml-2 text-gray-600 normal-case font-normal">
            ({lc(locale, "支持图片、视频、富文本", "supports images, video, rich text")})
          </span>
        </label>
        <RichTextEditor
          value={content}
          onChange={setContent}
          zh={zh}
          placeholder={lc(locale, "分享你的想法、分析、预测观点…支持图片上传和 YouTube 视频嵌入", "Share your thoughts, analysis, predictions… supports image uploads and YouTube embeds")}
        />
      </div>

      {/* ── Tags ──────────────────────────────────────────────────────────── */}
      <TagSelector
        selected={selectedTags}
        onChange={setSelectedTags}
        zh={zh}
        maxTags={3}
      />

      {/* ── Error ─────────────────────────────────────────────────────────── */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-4 py-3 rounded-xl">
          ⚠ {error}
        </div>
      )}

      {/* ── Submit ────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={loading}
          className="flex-1 bg-[#FFD700] text-[#0A1628] font-black py-3.5 rounded-xl text-sm hover:bg-[#FFC200] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (lc(locale, "发布中…", "Publishing…")) : `🚀 ${lc(locale, "发布帖子", "Publish Post")}`}
        </button>
        <Link
          href={`/${locale}/forum`}
          className="px-5 py-3.5 border border-[#1E3A5F] text-gray-400 font-semibold rounded-xl text-sm hover:text-white transition-colors"
        >
          {lc(locale, "取消", "Cancel")}
        </Link>
      </div>

    </form>
  );
}
