"use client";

import { useState } from "react";
import { lc } from "@/i18n/content";
import { useLocale } from "next-intl";

interface Props {
  postId?:  number;
  replyId?: number;
  zh:       boolean;
  onClose:  () => void;
}

const REASONS_ZH = [
  { value: "spam",        label: "垃圾信息" },
  { value: "abuse",       label: "骚扰/侮辱" },
  { value: "misleading",  label: "虚假信息" },
  { value: "illegal",     label: "违法内容" },
  { value: "other",       label: "其他" },
];
const REASONS_EN = [
  { value: "spam",        label: "Spam" },
  { value: "abuse",       label: "Abuse / Harassment" },
  { value: "misleading",  label: "Misinformation" },
  { value: "illegal",     label: "Illegal content" },
  { value: "other",       label: "Other" },
];

export default function ReportModal({ postId, replyId, zh, onClose }: Props) {
  const locale = useLocale();
  const [reason,     setReason]     = useState("spam");
  const [detail,     setDetail]     = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done,       setDone]       = useState(false);
  const [err,        setErr]        = useState<string | null>(null);

  const reasons = zh ? REASONS_ZH : REASONS_EN;

  async function handleSubmit() {
    setSubmitting(true);
    setErr(null);
    try {
      const res = await fetch("/api/forum/report", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ post_id: postId ?? null, reply_id: replyId ?? null, reason, detail }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.error === "already_reported") {
          setErr(lc(locale, "你已经举报过了", "Already reported"));
        } else {
          setErr(data.error ?? (lc(locale, "提交失败", "Failed")));
        }
        return;
      }
      setDone(true);
    } catch {
      setErr(lc(locale, "网络错误", "Network error"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-[#0F2040] border border-[#1E3A5F] rounded-2xl w-full max-w-sm shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#1E3A5F]">
          <h3 className="text-sm font-black text-white">
            🚩 {lc(locale, "举报内容", "Report Content")}
          </h3>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors text-lg">✕</button>
        </div>

        {done ? (
          <div className="px-5 py-8 text-center">
            <div className="text-4xl mb-3">✅</div>
            <p className="text-white font-bold">{lc(locale, "举报已提交", "Report submitted")}</p>
            <p className="text-xs text-gray-500 mt-1">{lc(locale, "我们会尽快审核", "We'll review it shortly")}</p>
            <button onClick={onClose}
              className="mt-4 px-5 py-2 bg-[#FFD700] text-[#0A1628] font-black rounded-xl text-sm hover:bg-[#FFC200]">
              {lc(locale, "关闭", "Close")}
            </button>
          </div>
        ) : (
          <div className="px-5 py-4 space-y-4">
            {/* Reason selector */}
            <div>
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-2">
                {lc(locale, "举报原因", "Reason")}
              </label>
              <div className="space-y-1.5">
                {reasons.map((r) => (
                  <label key={r.value}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer border transition-all ${
                      reason === r.value
                        ? "bg-red-500/10 border-red-500/40 text-red-300"
                        : "border-[#1E3A5F] text-gray-400 hover:border-[#2A4A7F]"
                    }`}>
                    <input type="radio" name="reason" value={r.value}
                      checked={reason === r.value}
                      onChange={() => setReason(r.value)}
                      className="accent-red-500" />
                    <span className="text-sm font-medium">{r.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Optional detail */}
            <div>
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-1.5">
                {lc(locale, "补充说明（可选）", "Additional detail (optional)")}
              </label>
              <textarea
                value={detail}
                onChange={(e) => setDetail(e.target.value)}
                maxLength={500}
                rows={3}
                className="w-full bg-[#080F1F] border border-[#2A4A7F] rounded-xl px-3 py-2 text-sm text-white placeholder-gray-600 outline-none focus:border-[#FFD700]/40 resize-none"
                placeholder={lc(locale, "描述问题…", "Describe the issue…")}
              />
            </div>

            {err && <p className="text-xs text-red-400">⚠ {err}</p>}

            <div className="flex gap-2 pt-1">
              <button onClick={onClose}
                className="flex-1 py-2.5 text-sm text-gray-400 border border-[#1E3A5F] rounded-xl hover:text-white transition-colors">
                {lc(locale, "取消", "Cancel")}
              </button>
              <button onClick={handleSubmit} disabled={submitting}
                className="flex-1 py-2.5 text-sm font-black bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors disabled:opacity-50">
                {submitting ? "…" : (lc(locale, "提交举报", "Submit"))}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
