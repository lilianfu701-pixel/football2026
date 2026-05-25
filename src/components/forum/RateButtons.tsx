"use client";

import { useState } from "react";
import dynamic from "next/dynamic";

const RatingModal = dynamic(() => import("./RatingModal"), { ssr: false });

interface Props {
  postId:          number;
  replyId?:        number;
  authorId:        string | null;
  authorName:      string;
  authorBalance?:  number;   // recipient's gc_balance — drives the rating cap
  userId:          string | null;
  locale:          string;
  zh?:             boolean;
}

export default function RateButtons({
  postId, replyId, authorId, authorName, authorBalance = 0, userId, locale, zh,
}: Props) {
  const [showModal, setShowModal] = useState(false);
  const [mode,      setMode]      = useState<"reward" | "punish">("reward");
  const [done,      setDone]      = useState(false);

  // Must be logged in and target must have an author
  if (!userId || !authorId) return null;
  if (done) return (
    <span className="text-[10px] text-[#FFD700]/50 font-bold px-1">
      ✓ {zh ? "已操作" : "Done"}
    </span>
  );

  return (
    <>
      <div className="flex items-center gap-1">
        <button
          onClick={() => { setMode("reward"); setShowModal(true); }}
          className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-black
                     bg-[#FFD700]/10 border border-[#FFD700]/30 text-[#FFD700]/80
                     hover:bg-[#FFD700]/20 hover:border-[#FFD700]/55 hover:text-[#FFD700]
                     transition-all"
        >
          🎁 {zh ? "打赏" : "Tip"}
        </button>
        <button
          onClick={() => { setMode("punish"); setShowModal(true); }}
          className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-black
                     bg-red-500/8 border border-red-500/25 text-red-400/70
                     hover:bg-red-500/18 hover:border-red-500/45 hover:text-red-400
                     transition-all"
        >
          🔨 {zh ? "扣分" : "Punish"}
        </button>
      </div>

      {showModal && (
        <RatingModal
          postId={postId}
          replyId={replyId}
          authorName={authorName}
          recipientBalance={authorBalance}
          initialMode={mode}
          locale={locale}
          zh={!!zh}
          onClose={() => setShowModal(false)}
          onDone={() => { setDone(true); setShowModal(false); }}
        />
      )}
    </>
  );
}
