"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { lc } from "@/i18n/content";

interface Message {
  id:          number;
  sender_id:   string;
  receiver_id: string;
  content:     string;
  is_read:     boolean;
  created_at:  string;
}
interface Partner { id: string; nickname: string; avatar_url: string | null }

interface Props {
  locale:          string;
  zh:              boolean;
  myId:            string;
  partner:         Partner;
  initialMessages: Message[];
}

function formatTime(d: string, zh: boolean) {
  return new Date(d).toLocaleTimeString(zh ? "zh-CN" : "en-US", { hour: "2-digit", minute: "2-digit" });
}

function formatDate(d: string, zh: boolean, locale: string) {
  const date = new Date(d);
  const today = new Date();
  const yesterday = new Date(Date.now() - 86_400_000);
  const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  if (isSameDay(date, today))     return lc(locale, "今天", "Today");
  if (isSameDay(date, yesterday)) return lc(locale, "昨天", "Yesterday");
  return date.toLocaleDateString(zh ? "zh-CN" : "en-US", { month: "short", day: "numeric", year: date.getFullYear() !== today.getFullYear() ? "numeric" : undefined });
}

// Group consecutive messages: add date separators
interface MsgGroup {
  type:    "date" | "msg";
  label?:  string;
  msg?:    Message;
}

function buildGroups(messages: Message[], zh: boolean, locale: string): MsgGroup[] {
  const groups: MsgGroup[] = [];
  let lastDate = "";
  for (const m of messages) {
    const d = new Date(m.created_at).toDateString();
    if (d !== lastDate) {
      groups.push({ type: "date", label: formatDate(m.created_at, zh, locale) });
      lastDate = d;
    }
    groups.push({ type: "msg", msg: m });
  }
  return groups;
}

export default function ConversationClient({ locale, zh, myId, partner, initialMessages }: Props) {
  const [messages,  setMessages]  = useState<Message[]>(initialMessages);
  const [text,      setText]      = useState("");
  const [sending,   setSending]   = useState(false);
  const [err,       setErr]       = useState<string | null>(null);
  const bottomRef  = useRef<HTMLDivElement>(null);
  const inputRef   = useRef<HTMLInputElement>(null);
  const latestIdRef = useRef<number>(initialMessages[initialMessages.length - 1]?.id ?? 0);

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Poll for new messages every 4 s
  const poll = useCallback(async () => {
    try {
      const res  = await fetch(`/api/messages?with=${partner.id}`);
      if (!res.ok) return;
      const data: Message[] = await res.json();
      if (!Array.isArray(data)) return;
      const latest = data[data.length - 1]?.id ?? 0;
      if (latest > latestIdRef.current) {
        latestIdRef.current = latest;
        setMessages(data);
      }
    } catch { /* ignore */ }
  }, [partner.id]);

  useEffect(() => {
    const id = setInterval(poll, 4_000);
    return () => clearInterval(id);
  }, [poll]);

  async function send() {
    const content = text.trim();
    if (!content || sending) return;
    setText("");
    setSending(true);
    setErr(null);
    try {
      const res  = await fetch("/api/messages", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ receiver_id: partner.id, content }),
      });
      const data = await res.json();
      if (!res.ok) { setErr(data.error ?? "Failed"); setText(content); return; }
      const newMsg: Message = {
        id:          data.id,
        sender_id:   myId,
        receiver_id: partner.id,
        content,
        is_read:     false,
        created_at:  new Date().toISOString(),
      };
      setMessages((prev) => [...prev, newMsg]);
      latestIdRef.current = data.id;
    } catch {
      setErr(lc(locale, "发送失败，请重试", "Failed to send, please retry"));
      setText(content);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  }

  const groups = buildGroups(messages, zh, locale);

  return (
    <div className="flex flex-col bg-[#0A1628] text-white" style={{ height: "100dvh" }}>

      {/* ── Header ── */}
      <div className="shrink-0 flex items-center gap-3 px-4 py-3 bg-[#0F2040]/95 border-b border-[#1E3A5F] backdrop-blur-md z-10">
        <Link
          href={`/${locale}/messages`}
          className="w-9 h-9 flex items-center justify-center rounded-xl text-gray-400 hover:text-white hover:bg-[#1E3A5F] transition-colors shrink-0"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>

        <Link href={`/${locale}/profile/${partner.id}`} className="flex items-center gap-2.5 flex-1 min-w-0 hover:opacity-80 transition-opacity">
          {partner.avatar_url ? (
            <Image src={partner.avatar_url} alt={partner.nickname} width={38} height={38}
              className="rounded-full object-cover border border-[#1E3A5F] shrink-0" unoptimized />
          ) : (
            <div className="w-[38px] h-[38px] rounded-full bg-gradient-to-br from-[#7C6FE0] to-[#4F46E5] flex items-center justify-center text-white font-black text-sm border border-[#1E3A5F] shrink-0">
              {partner.nickname.slice(0, 1).toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <p className="text-sm font-black text-white truncate">{partner.nickname}</p>
            <p className="text-[10px] text-gray-500">{lc(locale, "点击查看主页", "View profile")}</p>
          </div>
        </Link>
      </div>

      {/* ── Messages ── */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-3 py-16">
            <div className="text-4xl">👋</div>
            <p className="text-gray-400 text-sm font-bold">
              {zh ? `开始和 ${partner.nickname} 聊天吧！` : `Start chatting with ${partner.nickname}!`}
            </p>
          </div>
        )}

        <div className="space-y-1">
          {groups.map((g, i) => {
            if (g.type === "date") {
              return (
                <div key={`date-${i}`} className="flex items-center gap-3 py-3">
                  <div className="flex-1 h-px bg-[#1E3A5F]" />
                  <span className="text-[10px] text-gray-600 font-medium px-2">{g.label}</span>
                  <div className="flex-1 h-px bg-[#1E3A5F]" />
                </div>
              );
            }

            const m = g.msg!;
            const isMine = m.sender_id === myId;
            // Check if next msg is from same sender (for tail removal)
            const nextGroup = groups[i + 1];
            const nextMsg = nextGroup?.type === "msg" ? nextGroup.msg : null;
            const isLast = !nextMsg || nextMsg.sender_id !== m.sender_id;

            return (
              <div key={m.id} className={`flex ${isMine ? "justify-end" : "justify-start"} ${isLast ? "mb-2" : "mb-0.5"}`}>
                {/* Partner avatar for last message in group */}
                {!isMine && (
                  <div className="w-7 shrink-0 mr-2 flex items-end">
                    {isLast ? (
                      partner.avatar_url ? (
                        <Image src={partner.avatar_url} alt="" width={26} height={26}
                          className="rounded-full object-cover border border-[#1E3A5F]" unoptimized />
                      ) : (
                        <div className="w-[26px] h-[26px] rounded-full bg-gradient-to-br from-[#7C6FE0] to-[#4F46E5] flex items-center justify-center text-white font-black text-[10px]">
                          {partner.nickname.slice(0, 1).toUpperCase()}
                        </div>
                      )
                    ) : null}
                  </div>
                )}

                <div className={`max-w-[72%] ${isMine ? "items-end" : "items-start"} flex flex-col gap-0.5`}>
                  <div className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
                    isMine
                      ? `bg-[#FFD700] text-[#0A1628] font-medium ${isLast ? "rounded-br-sm" : ""}`
                      : `bg-[#0F2040] border border-[#1E3A5F] text-white ${isLast ? "rounded-bl-sm" : ""}`
                  }`}>
                    {m.content}
                  </div>
                  {isLast && (
                    <div className={`flex items-center gap-1 px-1 ${isMine ? "flex-row-reverse" : ""}`}>
                      <span className="text-[10px] text-gray-600">{formatTime(m.created_at, zh)}</span>
                      {isMine && (
                        <span className={`text-[10px] ${m.is_read ? "text-[#FFD700]/60" : "text-gray-600"}`}>
                          {m.is_read ? (lc(locale, "已读", "✓✓")) : (lc(locale, "未读", "✓"))}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <div ref={bottomRef} />
      </div>

      {/* ── Input ── */}
      <div className="shrink-0 bg-[#0F2040]/95 border-t border-[#1E3A5F] backdrop-blur-md">
        {err && (
          <p className="text-xs text-red-400 px-4 pt-2 pb-0">⚠ {err}</p>
        )}
        <div className="flex gap-2 px-3 py-3">
          <input
            ref={inputRef}
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            maxLength={1000}
            placeholder={lc(locale, "输入消息…", "Type a message…")}
            className="flex-1 bg-[#080F1F] border border-[#2A4A7F] rounded-2xl px-4 py-2.5 text-sm text-white placeholder-gray-600 outline-none focus:border-[#FFD700]/40 transition-colors"
          />
          <button
            onClick={send}
            disabled={!text.trim() || sending}
            className="w-11 h-11 flex items-center justify-center bg-[#FFD700] text-[#0A1628] rounded-2xl hover:bg-[#FFC200] transition-all disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
          >
            {sending ? (
              <div className="w-4 h-4 border-2 border-[#0A1628]/30 border-t-[#0A1628] rounded-full animate-spin" />
            ) : (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
