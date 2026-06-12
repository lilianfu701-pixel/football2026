"use client";

import { useEditor, EditorContent, Extension } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import ImageExt from "@tiptap/extension-image";
import Youtube from "@tiptap/extension-youtube";
import { Color } from "@tiptap/extension-color";
import { TextStyle } from "@tiptap/extension-text-style";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { useRef, useState, useCallback, useEffect } from "react";
import MentionDropdown, { type MentionUser } from "@/components/forum/MentionDropdown";
import { lc } from "@/i18n/content";
import { useLocale } from "next-intl";

// ── Custom FontSize extension ──────────────────────────────────────────────
const FontSize = Extension.create({
  name: "fontSize",
  addOptions() { return { types: ["textStyle"] }; },
  addGlobalAttributes() {
    return [{
      types: this.options.types,
      attributes: {
        fontSize: {
          default: null,
          parseHTML: (el: HTMLElement) => (el as HTMLElement).style.fontSize || null,
          renderHTML: (attrs: Record<string, string>) =>
            attrs.fontSize ? { style: `font-size: ${attrs.fontSize}` } : {},
        },
      },
    }];
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  addCommands(): any {
    return {
      setFontSize: (size: string) => ({ chain }: { chain: () => any }) =>
        chain().setMark("textStyle", { fontSize: size }).run(),
      unsetFontSize: () => ({ chain }: { chain: () => any }) =>
        chain().setMark("textStyle", { fontSize: null }).removeEmptyTextStyle().run(),
    };
  },
});

// ── Types ──────────────────────────────────────────────────────────────────
interface Props {
  value:      string;
  onChange:   (html: string) => void;
  placeholder?: string;
  zh?:        boolean;
  injectHtml?: string;   // when this string changes, replace editor content
}

// ── Preset palette ─────────────────────────────────────────────────────────
const COLORS = [
  { hex: "#FFFFFF", label: "White" },
  { hex: "#D1D5DB", label: "Silver" },
  { hex: "#F87171", label: "Red" },
  { hex: "#FB923C", label: "Orange" },
  { hex: "#FBBF24", label: "Yellow" },
  { hex: "#4ADE80", label: "Green" },
  { hex: "#60A5FA", label: "Blue" },
  { hex: "#C084FC", label: "Purple" },
  { hex: "#F472B6", label: "Pink" },
  { hex: "#34D399", label: "Teal" },
];

const FONT_SIZES = [
  { label: "S",   value: "0.75rem" },
  { label: "M",   value: "1rem"    },
  { label: "L",   value: "1.25rem" },
  { label: "XL",  value: "1.5rem"  },
  { label: "XXL", value: "2rem"    },
];

// ── Emoji data ────────────────────────────────────────────────────────────
const EMOJI_GROUPS = [
  {
    label: "⚽ 足球",
    emojis: ["⚽","🏆","🥇","🥈","🥉","🎯","🏅","🎖️","🏟️","👟","🦵","💪","🤜","✊","👊","🙌","👏","🤝","🫡","🫶"],
  },
  {
    label: "😄 表情",
    emojis: ["😀","😃","😄","😁","😆","😅","🤣","😂","😊","😇","🥰","😍","🤩","😎","🤓","🥳","🤪","😜","😝","🤑","😤","😡","🤬","🤯","😱","😨","😰","😢","😭","😤"],
  },
  {
    label: "👍 手势",
    emojis: ["👍","👎","👌","✌️","🤞","🤟","🤘","🤙","👈","👉","👆","👇","☝️","✋","🤚","🖐️","🖖","🤜","🤛","💪","🫱","🫲","🫳","🫴","🫵"],
  },
  {
    label: "🔥 符号",
    emojis: ["🔥","💥","⭐","🌟","✨","💫","🎉","🎊","🎈","🎁","🏆","🥇","💎","👑","🎯","📣","📢","💡","⚡","🌈","❤️","🧡","💛","💚","💙","💜","🖤","❤️‍🔥","💯","🚀"],
  },
  {
    label: "😴 其他",
    emojis: ["🤔","🧐","🤨","😐","😑","😶","🙄","😏","😒","🤥","😬","🤐","😷","🤒","🤕","🤢","🥴","😵","💀","👻","🤖","💩","🐐","🦁","🐯","🦊","🐻","🐼","🦅","🦋"],
  },
];
// ── Toolbar button ─────────────────────────────────────────────────────────
function Btn({
  active, onClick, title, children, danger,
}: {
  active?: boolean; onClick: () => void; title: string;
  children: React.ReactNode; danger?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      onMouseDown={(e) => { e.preventDefault(); onClick(); }}
      className={`
        w-9 h-9 flex items-center justify-center rounded-lg text-base font-bold transition-all
        ${active
          ? "bg-[#FFD700]/25 text-[#FFD700] border border-[#FFD700]/40"
          : danger
            ? "text-red-400 hover:bg-red-500/10"
            : "text-gray-400 hover:text-white hover:bg-[#1E3A5F]/80"}
      `}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <div className="w-px h-7 bg-[#1E3A5F] mx-1 shrink-0" />;
}

// ── Main component ─────────────────────────────────────────────────────────
export default function RichTextEditor({ value, onChange, placeholder, zh, injectHtml }: Props) {
  const locale = useLocale();
  const [uploading,       setUploading]       = useState(false);
  const [videoUploading,  setVideoUploading]  = useState(false);
  const [uploadError,     setUploadError]     = useState<string | null>(null);
  const [showColors,   setShowColors]   = useState(false);
  const [showSizes,    setShowSizes]    = useState(false);
  const [linkUrl,      setLinkUrl]      = useState("");
  const [showLinkBox,  setShowLinkBox]  = useState(false);
  const [ytUrl,        setYtUrl]        = useState("");
  const [showYtBox,    setShowYtBox]    = useState(false);
  const [showEmoji,    setShowEmoji]    = useState(false);
  const [emojiGroup,   setEmojiGroup]   = useState(0);

  // ── @mention state ────────────────────────────────────────────────────────
  type MentionState = { query: string; from: number; top: number; left: number; activeIdx: number } | null;
  const [mentionState, setMentionState] = useState<MentionState>(null);
  const mentionRef = useRef<MentionState>(null);
  mentionRef.current = mentionState;

  // Keep a stable ref to onChange so the useEffect below never needs to re-run
  const onChangeRef = useRef(onChange);
  useEffect(() => { onChangeRef.current = onChange; }, [onChange]);

  const editor = useEditor({
    immediatelyRender: false,   // required for Next.js SSR in Tiptap v3
    extensions: [
      StarterKit.configure({
        heading:   { levels: [2, 3] },
        codeBlock: { HTMLAttributes: { class: "bg-[#0A1628] rounded-lg p-3 text-sm font-mono text-green-300 my-2 overflow-x-auto" } },
        blockquote: { HTMLAttributes: { class: "border-l-4 border-[#FFD700]/50 pl-4 text-gray-400 italic my-2" } },
      }),
      TextStyle,
      FontSize,
      Color,
      Underline,
      ImageExt.configure({
        inline: false,
        HTMLAttributes: { class: "max-w-full rounded-xl my-3 border border-[#1E3A5F]" },
      }),
      Youtube.configure({
        width:  640, height: 360,
        HTMLAttributes: { class: "w-full rounded-xl overflow-hidden my-3 aspect-video" },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { class: "text-[#60A5FA] underline hover:text-[#93C5FD]", target: "_blank", rel: "noopener noreferrer" },
      }),
      Placeholder.configure({
        placeholder: placeholder ?? (lc(locale, "分享你的想法…", "Share your thoughts…")),
      }),
    ],
    content: value || "",
    editorProps: {
      attributes: {
        class: "outline-none min-h-[220px] text-gray-200 text-sm leading-relaxed prose-invert focus:outline-none",
      },
    },
  });

  // Wire up the update listener via editor.on() — the reliable pattern in Tiptap v3
  useEffect(() => {
    if (!editor) return;
    const handleUpdate = () => {
      onChangeRef.current(editor.getHTML());

      // ── @mention detection ──────────────────────────────────────────────
      const { state, view } = editor;
      const { from } = state.selection;
      // Look back up to 40 chars for @word pattern at cursor
      const textBefore = state.doc.textBetween(Math.max(0, from - 40), from, "\0");
      const match = /@([\w一-龥]{0,20})$/.exec(textBefore);
      if (match) {
        try {
          const coords = view.coordsAtPos(from);
          setMentionState({
            query:     match[1],
            from:      from - match[0].length,
            top:       coords.bottom,
            left:      coords.left,
            activeIdx: 0,
          });
        } catch {
          setMentionState(null);
        }
      } else {
        setMentionState(null);
      }
    };
    editor.on("update", handleUpdate);
    return () => { editor.off("update", handleUpdate); };
  }, [editor]);

  // Insert mention when user selects from dropdown
  const insertMention = useCallback((user: MentionUser) => {
    if (!editor || !mentionState) return;
    const { from: mentionFrom } = mentionState;
    const { from: curFrom } = editor.state.selection;
    const mentionHtml = `<span class="mention" data-user-id="${user.id}">@${user.nickname}</span>&nbsp;`;
    editor.chain()
      .focus()
      .deleteRange({ from: mentionFrom, to: curFrom })
      .insertContentAt(mentionFrom, mentionHtml)
      .run();
    setMentionState(null);
  }, [editor, mentionState]);

  // Inject external content (e.g. quoted reply) when injectHtml changes
  useEffect(() => {
    if (!editor || !injectHtml) return;
    editor.commands.setContent(injectHtml);
    onChangeRef.current(injectHtml);
    // Move cursor to end
    editor.commands.focus("end");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [injectHtml]);

  // ── Image upload handler ───────────────────────────────────────────────
  const handleImageUpload = useCallback(async (file: File) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setUploadError(lc(locale, "图片大小不能超过 5MB", "Image must be under 5 MB"));
      return;
    }
    setUploading(true);
    setUploadError(null);
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res  = await fetch("/api/forum/upload-image", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) { setUploadError(data.error ?? "Upload failed"); return; }
      editor?.chain().focus().setImage({ src: data.url }).run();
    } catch {
      setUploadError(lc(locale, "上传失败，请重试", "Upload failed, please retry"));
    } finally {
      setUploading(false);
    }
  }, [editor, zh]);

  // ── Video upload handler ──────────────────────────────────────────────
  const handleVideoUpload = useCallback(async (file: File) => {
    if (!file) return;
    if (file.size > 100 * 1024 * 1024) {
      setUploadError(lc(locale, "视频大小不能超过 100MB", "Video must be under 100 MB"));
      return;
    }
    setVideoUploading(true);
    setUploadError(null);
    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setUploadError(lc(locale, "请先登录再上传视频", "Please login to upload videos"));
        return;
      }
      const fd = new FormData();
      fd.append("video", file);
      const res = await fetch("https://v.xunni.org/api/upload", {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) { setUploadError(data.error ?? "Upload failed"); return; }
      // Normalize URL to v.xunni.org domain
      const videoUrl: string = (data.url as string).replace("v.football2026.net", "v.xunni.org");
      editor?.chain().focus().insertContent(
        `<p><video controls preload="metadata" src="${videoUrl}" style="width:100%;max-width:640px;border-radius:12px;margin:8px 0"></video></p>`
      ).run();
    } catch {
      setUploadError(lc(locale, "视频上传失败，请重试", "Video upload failed, please retry"));
    } finally {
      setVideoUploading(false);
    }
  }, [editor, locale]);

  // ── Video file picker ─────────────────────────────────────────────────
  const triggerVideoSelect = useCallback(() => {
    if (videoUploading) return;
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "video/mp4,video/webm,video/quicktime";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) handleVideoUpload(file);
    };
    input.click();
  }, [videoUploading, handleVideoUpload]);

  // ── Image file picker — JS-only, never touches the DOM ────────────────
  const triggerFileSelect = useCallback(() => {
    if (uploading) return;
    const input = document.createElement("input");
    input.type   = "file";
    input.accept = "image/jpeg,image/png,image/gif,image/webp";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) handleImageUpload(file);
    };
    input.click();
  }, [uploading, handleImageUpload]);

  // ── YouTube embed ──────────────────────────────────────────────────────
  const insertYoutube = useCallback(() => {
    if (!ytUrl.trim()) return;
    editor?.chain().focus().setYoutubeVideo({ src: ytUrl }).run();
    setYtUrl("");
    setShowYtBox(false);
  }, [editor, ytUrl]);

  // ── Link insert ────────────────────────────────────────────────────────
  const insertLink = useCallback(() => {
    if (!linkUrl.trim()) {
      editor?.chain().focus().unsetLink().run();
    } else {
      const url = linkUrl.startsWith("http") ? linkUrl : `https://${linkUrl}`;
      editor?.chain().focus().setLink({ href: url }).run();
    }
    setLinkUrl("");
    setShowLinkBox(false);
  }, [editor, linkUrl]);

  if (!editor) return null;

  const isActive = (name: string, attrs?: Record<string, unknown>) =>
    attrs ? editor.isActive(name, attrs) : editor.isActive(name);

  return (
    <div className="border border-[#1E3A5F] rounded-xl overflow-hidden focus-within:border-[#FFD700]/50 transition-colors">

      {/* ── Toolbar ── */}
      <div className="flex flex-wrap items-center gap-1 px-3 py-2.5 bg-[#0A1628] border-b border-[#1E3A5F]">

        {/* Text style */}
        <Btn active={isActive("bold")}        onClick={() => editor.chain().focus().toggleBold().run()}        title="Bold (Ctrl+B)">B</Btn>
        <Btn active={isActive("italic")}      onClick={() => editor.chain().focus().toggleItalic().run()}      title="Italic (Ctrl+I)"><em>I</em></Btn>
        <Btn active={isActive("underline")}   onClick={() => editor.chain().focus().toggleUnderline().run()}   title="Underline (Ctrl+U)"><u>U</u></Btn>
        <Btn active={isActive("strike")}      onClick={() => editor.chain().focus().toggleStrike().run()}      title="Strikethrough"><s>S</s></Btn>

        <Divider />

        {/* Headings */}
        <Btn active={isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} title="Heading 2">H2</Btn>
        <Btn active={isActive("heading", { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} title="Heading 3">H3</Btn>

        <Divider />

        {/* Lists */}
        <Btn active={isActive("bulletList")}  onClick={() => editor.chain().focus().toggleBulletList().run()}  title="Bullet list">≡</Btn>
        <Btn active={isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()} title="Ordered list">①</Btn>

        <Divider />

        {/* Block */}
        <Btn active={isActive("blockquote")} onClick={() => editor.chain().focus().toggleBlockquote().run()} title="Quote">"</Btn>
        <Btn active={isActive("codeBlock")}  onClick={() => editor.chain().focus().toggleCodeBlock().run()}  title="Code block">{`</>`}</Btn>
        <Btn active={false} onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Divider">—</Btn>

        <Divider />

        {/* Font Size */}
        <div className="relative">
          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); setShowSizes(v => !v); setShowColors(false); setShowLinkBox(false); setShowYtBox(false); }}
            className="flex items-center gap-1.5 px-2.5 h-9 rounded-lg text-sm font-bold text-gray-400 hover:text-white hover:bg-[#1E3A5F]/80 transition-all"
            title="Font size"
          >
            <span>Aa</span>
            <span className="text-[10px] text-gray-600">▼</span>
          </button>
          {showSizes && (
            <div className="absolute top-full left-0 mt-1 bg-[#0F2040] border border-[#1E3A5F] rounded-xl overflow-hidden z-50 shadow-xl">
              {FONT_SIZES.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    (editor.chain().focus() as any).setFontSize(s.value).run();
                    setShowSizes(false);
                  }}
                  className="flex items-center gap-3 w-full px-4 py-2 text-left hover:bg-[#1E3A5F]/60 transition-colors"
                  style={{ fontSize: s.value }}
                >
                  <span className="text-white">{s.label}</span>
                  <span className="text-gray-500 text-xs">{s.value}</span>
                </button>
              ))}
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  (editor.chain().focus() as any).unsetFontSize().run();
                  setShowSizes(false);
                }}
                className="flex items-center w-full px-4 py-2 text-gray-500 text-xs hover:bg-[#1E3A5F]/60 border-t border-[#1E3A5F] transition-colors"
              >
                {lc(locale, "清除大小", "Clear size")}
              </button>
            </div>
          )}
        </div>

        {/* Color Picker */}
        <div className="relative">
          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); setShowColors(v => !v); setShowSizes(false); setShowLinkBox(false); setShowYtBox(false); }}
            className="flex items-center gap-1.5 px-2.5 h-9 rounded-lg text-sm font-bold text-gray-400 hover:text-white hover:bg-[#1E3A5F]/80 transition-all"
            title="Text color"
          >
            <span className="text-base font-black" style={{ color: editor.getAttributes("textStyle").color || "#ffffff" }}>A</span>
            <span className="text-[10px] text-gray-600">▼</span>
          </button>
          {showColors && (
            <div className="absolute top-full left-0 mt-1 bg-[#0F2040] border border-[#1E3A5F] rounded-xl p-3 z-50 shadow-xl w-40">
              <div className="grid grid-cols-5 gap-1.5 mb-2">
                {COLORS.map((c) => (
                  <button
                    key={c.hex}
                    type="button"
                    title={c.label}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      editor.chain().focus().setColor(c.hex).run();
                      setShowColors(false);
                    }}
                    className="w-6 h-6 rounded-full border-2 border-transparent hover:border-white/60 transition-all"
                    style={{ backgroundColor: c.hex }}
                  />
                ))}
              </div>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  editor.chain().focus().unsetColor().run();
                  setShowColors(false);
                }}
                className="text-[10px] text-gray-500 hover:text-white transition-colors w-full text-center"
              >
                {lc(locale, "清除颜色", "Clear color")}
              </button>
            </div>
          )}
        </div>

        <Divider />

        {/* Link */}
        <div className="relative">
          <Btn
            active={isActive("link")}
            onClick={() => { setShowLinkBox(v => !v); setShowColors(false); setShowSizes(false); setShowYtBox(false); if (isActive("link")) setLinkUrl(editor.getAttributes("link").href ?? ""); }}
            title="Link"
          >
            🔗
          </Btn>
          {showLinkBox && (
            <div className="absolute top-full left-0 mt-1 bg-[#0F2040] border border-[#1E3A5F] rounded-xl p-3 z-50 shadow-xl w-64">
              <p className="text-[10px] text-gray-500 mb-2 font-semibold uppercase tracking-wide">
                {lc(locale, "插入链接", "Insert link")}
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); insertLink(); }}}
                  placeholder="https://..."
                  className="flex-1 bg-[#0A1628] border border-[#1E3A5F] rounded-lg px-2 py-1 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-[#FFD700]/50"
                />
                <button
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); insertLink(); }}
                  className="px-3 py-1 bg-[#FFD700] text-[#0A1628] font-black text-xs rounded-lg hover:bg-[#FFC200] transition-colors"
                >
                  OK
                </button>
              </div>
              {isActive("link") && (
                <button
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().unsetLink().run(); setShowLinkBox(false); }}
                  className="mt-2 text-[10px] text-red-400 hover:text-red-300 transition-colors"
                >
                  {lc(locale, "删除链接", "Remove link")}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Image Upload */}
        <Btn
          active={false}
          onClick={triggerFileSelect}
          title={lc(locale, "上传图片", "Upload image")}
        >
          {uploading ? (
            <div className="w-3 h-3 rounded-full border-2 border-[#FFD700] border-t-transparent animate-spin" />
          ) : (
            <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-5 h-5">
              {/* Blue sky background */}
              <rect x="1" y="2" width="18" height="16" rx="2.5" fill="#2563EB"/>
              {/* Green hills */}
              <path d="M1 18 L1 13 L6 8 L10 12 L14 7 L19 11 L19 18 Z" fill="#16A34A"/>
              {/* Yellow sun */}
              <circle cx="5" cy="6.5" r="2.3" fill="#FCD34D"/>
              {/* Frame border */}
              <rect x="1" y="2" width="18" height="16" rx="2.5" stroke="#93C5FD" strokeWidth="1.5" fill="none"/>
            </svg>
          )}
        </Btn>

        {/* Video Upload */}
        <Btn
          active={false}
          onClick={triggerVideoSelect}
          title={lc(locale, "上传视频 (MP4/WebM, 最大100MB)", "Upload video (MP4/WebM, max 100MB)")}
        >
          {videoUploading ? (
            <div className="w-3 h-3 rounded-full border-2 border-[#FFD700] border-t-transparent animate-spin" />
          ) : (
            <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-5 h-5">
              <rect x="1" y="3" width="18" height="14" rx="2.5" fill="#7C3AED"/>
              <polygon points="8,7 8,13 14,10" fill="#FCD34D"/>
              <rect x="1" y="3" width="18" height="14" rx="2.5" stroke="#A78BFA" strokeWidth="1.5" fill="none"/>
            </svg>
          )}
        </Btn>

        {/* YouTube */}
        <div className="relative">
          <Btn
            active={false}
            onClick={() => { setShowYtBox(v => !v); setShowColors(false); setShowSizes(false); setShowLinkBox(false); }}
            title="YouTube"
          >
            ▶️
          </Btn>
          {showYtBox && (
            <div className="absolute top-full right-0 mt-1 bg-[#0F2040] border border-[#1E3A5F] rounded-xl p-3 z-50 shadow-xl w-72">
              <p className="text-[10px] text-gray-500 mb-2 font-semibold uppercase tracking-wide">
                {lc(locale, "嵌入 YouTube 视频", "Embed YouTube video")}
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={ytUrl}
                  onChange={(e) => setYtUrl(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); insertYoutube(); }}}
                  placeholder="https://youtube.com/watch?v=..."
                  className="flex-1 bg-[#0A1628] border border-[#1E3A5F] rounded-lg px-2 py-1 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-[#FFD700]/50"
                />
                <button
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); insertYoutube(); }}
                  className="px-3 py-1 bg-[#FFD700] text-[#0A1628] font-black text-xs rounded-lg hover:bg-[#FFC200] transition-colors"
                >
                  OK
                </button>
              </div>
              <p className="text-[9px] text-gray-600 mt-1.5">
                {lc(locale, "支持 youtube.com 和 youtu.be 链接", "Supports youtube.com and youtu.be links")}
              </p>
            </div>
          )}
        </div>

        {/* Emoji Picker */}
        <div className="relative">
          <Btn
            active={showEmoji}
            onClick={() => { setShowEmoji(v => !v); setShowColors(false); setShowSizes(false); setShowLinkBox(false); setShowYtBox(false); }}
            title={lc(locale, "插入表情", "Insert emoji")}
          >
            😊
          </Btn>
          {showEmoji && (
            <div className="absolute top-full right-0 mt-1 bg-[#0F2040] border border-[#1E3A5F] rounded-xl z-50 shadow-xl w-72">
              {/* Group tabs */}
              <div className="flex border-b border-[#1E3A5F] overflow-x-auto">
                {EMOJI_GROUPS.map((g, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onMouseDown={(e) => { e.preventDefault(); setEmojiGroup(idx); }}
                    className={`shrink-0 px-2 py-2 text-sm transition-colors ${
                      emojiGroup === idx
                        ? "text-[#FFD700] border-b-2 border-[#FFD700] -mb-px"
                        : "text-gray-500 hover:text-gray-300"
                    }`}
                  >
                    {g.label.split(" ")[0]}
                  </button>
                ))}
              </div>
              {/* Emoji grid */}
              <div className="p-2 grid grid-cols-8 gap-0.5 max-h-48 overflow-y-auto">
                {EMOJI_GROUPS[emojiGroup].emojis.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      editor.chain().focus().insertContent(emoji).run();
                      setShowEmoji(false);
                    }}
                    className="w-8 h-8 flex items-center justify-center text-lg rounded hover:bg-[#1E3A5F]/80 transition-colors"
                    title={emoji}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <Divider />

        {/* Undo / Redo */}
        <Btn active={false} onClick={() => editor.chain().focus().undo().run()} title="Undo">↩</Btn>
        <Btn active={false} onClick={() => editor.chain().focus().redo().run()} title="Redo">↪</Btn>

      </div>

      {/* ── Editor Area ── */}
      <div
        className="px-4 py-3 bg-[#0A1628] min-h-[220px] cursor-text rich-editor"
        onClick={() => editor.commands.focus()}
        onKeyDown={(e) => {
          const ms = mentionRef.current;
          if (!ms) return;
          if (e.key === "Escape") { e.preventDefault(); setMentionState(null); return; }
          if (e.key === "ArrowDown") { e.preventDefault(); setMentionState((s) => s ? { ...s, activeIdx: s.activeIdx + 1 } : s); return; }
          if (e.key === "ArrowUp")   { e.preventDefault(); setMentionState((s) => s ? { ...s, activeIdx: Math.max(0, s.activeIdx - 1) } : s); return; }
        }}
      >
        <EditorContent editor={editor} />
      </div>

      {/* ── @mention dropdown ── */}
      {mentionState && (
        <MentionDropdown
          query={mentionState.query}
          onSelect={insertMention}
          onClose={() => setMentionState(null)}
          anchorTop={mentionState.top}
          anchorLeft={mentionState.left}
          activeIndex={mentionState.activeIdx}
          onActiveChange={(i) => setMentionState((s) => s ? { ...s, activeIdx: i } : s)}
        />
      )}

      {/* Upload error */}
      {uploadError && (
        <div className="px-4 py-2 bg-red-500/10 border-t border-red-500/20 text-red-400 text-xs flex items-center justify-between">
          <span>⚠ {uploadError}</span>
          <button type="button" onClick={() => setUploadError(null)} className="text-red-400/60 hover:text-red-400">✕</button>
        </div>
      )}

      {/* Char counter */}
      <div className="px-4 py-1.5 bg-[#0A1628] border-t border-[#1E3A5F]/40 flex items-center justify-between">
        <span className="text-[10px] text-gray-600">
          {lc(locale, "支持图片、视频、YouTube", "Supports images, videos & YouTube")}
        </span>
        <span className="text-[10px] text-gray-600">
          {editor.storage.characterCount?.characters?.() ?? editor.getText().length} / 10,000
        </span>
      </div>
    </div>
  );
}
