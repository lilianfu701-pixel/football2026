"use client";

import { useState, useEffect } from "react";

interface Props {
  matchId: number;
  homeTeam: string;
  awayTeam: string;
  locale: string;
}

const ALERTS = (homeTeam: string, awayTeam: string, zh: boolean) => [
  {
    icon: "⏰",
    title: zh ? "开赛提醒" : "Kick-off Alert",
    body: zh ? `${homeTeam} vs ${awayTeam} 即将开赛！` : `${homeTeam} vs ${awayTeam} starts soon!`,
  },
  {
    icon: "⚽",
    title: zh ? "进球快报" : "Goal Alert",
    body: zh ? `进球！${homeTeam} 1 - 0 ${awayTeam}` : `GOAL! ${homeTeam} 1 - 0 ${awayTeam}`,
  },
  {
    icon: "🟡",
    title: zh ? "红黄牌事件" : "Card Event",
    body: zh ? `${homeTeam} 球员收到黄牌` : `${homeTeam} player receives a yellow card`,
  },
  {
    icon: "🏁",
    title: zh ? "全场结束" : "Final Result",
    body: zh ? `全场：${homeTeam} 2 - 1 ${awayTeam}` : `FT: ${homeTeam} 2 - 1 ${awayTeam}`,
  },
];

export default function FollowButton({ matchId, homeTeam, awayTeam, locale }: Props) {
  const zh = locale === "zh";
  const storageKey = `follow_${matchId}`;

  const [following, setFollowing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [permDenied, setPermDenied] = useState(false);

  useEffect(() => {
    setFollowing(!!localStorage.getItem(storageKey));
  }, [storageKey]);

  async function handleConfirm() {
    if (!("Notification" in window)) {
      alert(zh ? "您的浏览器不支持通知功能" : "Your browser doesn't support notifications");
      return;
    }
    const perm = await Notification.requestPermission();
    if (perm === "granted") {
      localStorage.setItem(storageKey, "1");
      setFollowing(true);
      setShowModal(false);
      setPermDenied(false);
      // Show a real sample notification
      new Notification(zh ? `⚽ 关注成功！` : "⚽ Following match!", {
        body: zh
          ? `${homeTeam} vs ${awayTeam} 开赛时将第一时间通知您`
          : `You'll be notified when ${homeTeam} vs ${awayTeam} starts`,
        icon: "/favicon.ico",
      });
    } else {
      setPermDenied(true);
    }
  }

  function handleUnfollow(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    localStorage.removeItem(storageKey);
    setFollowing(false);
  }

  function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (following) {
      handleUnfollow(e);
    } else {
      setShowModal(true);
    }
  }

  const alerts = ALERTS(homeTeam, awayTeam, zh);

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={handleClick}
        className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-semibold border transition-all shrink-0 ${
          following
            ? "bg-[#FFD700]/15 text-[#FFD700] border-[#FFD700]/40"
            : "bg-transparent text-gray-400 border-[#1E3A5F] hover:text-white hover:border-[#7C6FE0]/50"
        }`}
      >
        <span className="text-sm">{following ? "🔔" : "🔕"}</span>
        <span>{following ? (zh ? "已关注" : "Following") : (zh ? "关注比赛" : "Follow")}</span>
      </button>

      {/* Modal overlay */}
      {showModal && (
        <div
          className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-4"
          onClick={() => { setShowModal(false); setPermDenied(false); }}
        >
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

          <div
            className="relative bg-[#0D1E3A] border border-[#1E3A5F] rounded-2xl w-full max-w-sm shadow-2xl shadow-black/80 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-5 pt-5 pb-3">
              <h3 className="text-white font-black text-lg">
                🔔 {zh ? "关注这场比赛" : "Follow This Match"}
              </h3>
              <p className="text-gray-400 text-xs mt-1">
                {zh
                  ? `${homeTeam} vs ${awayTeam} · 开赛及进球时推送通知`
                  : `${homeTeam} vs ${awayTeam} · Get push alerts`}
              </p>
            </div>

            {/* Notification preview list */}
            <div className="px-5 pb-3 space-y-2">
              {alerts.map((a) => (
                <div key={a.icon} className="flex items-center gap-3 bg-[#0A1628] border border-[#1E3A5F]/60 rounded-xl px-3 py-2.5">
                  {/* App icon mock */}
                  <div className="w-8 h-8 rounded-lg bg-[#FFD700]/10 border border-[#FFD700]/20 flex items-center justify-center shrink-0 text-base">
                    ⚽
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-bold text-gray-400">Football2026</span>
                      <span className="text-[10px] text-gray-600">· {zh ? "刚刚" : "now"}</span>
                    </div>
                    <p className="text-xs font-semibold text-white truncate">{a.icon} {a.title}</p>
                    <p className="text-[11px] text-gray-400 truncate">{a.body}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Platform explanation */}
            <div className="mx-5 mb-4 bg-[#0A1628] rounded-xl p-3 space-y-2">
              <div className="flex items-start gap-2 text-[11px] text-gray-400">
                <span className="text-base shrink-0">💻</span>
                <span>
                  {zh
                    ? "电脑端：通知弹出在屏幕右下角（Windows）或右上角（macOS），即使网页最小化也会显示"
                    : "Desktop: Notifications pop up at bottom-right (Windows) or top-right (macOS), even when minimized"}
                </span>
              </div>
              <div className="flex items-start gap-2 text-[11px] text-gray-400">
                <span className="text-base shrink-0">📱</span>
                <span>
                  {zh
                    ? "手机端：通知出现在锁屏和通知栏，手机熄屏时也能收到"
                    : "Mobile: Alerts appear on your lock screen and notification center, even with screen off"}
                </span>
              </div>
            </div>

            {/* Permission denied warning */}
            {permDenied && (
              <div className="mx-5 mb-3 bg-red-500/10 border border-red-500/30 rounded-xl px-3 py-2 text-xs text-red-400">
                {zh
                  ? "⚠️ 您拒绝了通知权限。请点击浏览器地址栏左侧的🔒图标 → 通知 → 允许，然后刷新页面重试。"
                  : "⚠️ Notifications blocked. Click the 🔒 icon in your address bar → Notifications → Allow, then refresh."}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 px-5 pb-5">
              <button
                onClick={handleConfirm}
                className="flex-1 bg-[#FFD700] text-[#0A1628] font-black py-2.5 rounded-xl text-sm hover:bg-[#FFC200] transition-colors"
              >
                {zh ? "开启通知" : "Enable Notifications"}
              </button>
              <button
                onClick={() => { setShowModal(false); setPermDenied(false); }}
                className="px-4 py-2.5 border border-[#1E3A5F] text-gray-400 font-semibold rounded-xl text-sm hover:text-white hover:border-gray-500 transition-colors"
              >
                {zh ? "以后" : "Later"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
