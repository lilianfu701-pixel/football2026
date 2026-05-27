"use client";

import { Suspense, useEffect, useState } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";

function formatGc(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1).replace(/\.0$/, "")}B`;
  if (n >= 1_000_000)     return `${(n / 1_000_000).toFixed(0)}M`;
  return String(n);
}

type Status = "loading" | "success" | "failed" | "error";

function SuccessContent() {
  const params       = useParams();
  const searchParams = useSearchParams();
  const router       = useRouter();
  const locale       = (params.locale as string) || "zh";
  const zh           = locale === "zh";

  // Stripe: ?session_id=xxx   |   PayPal: ?type=paypal&gc=xxx
  const sessionId = searchParams.get("session_id");
  const type      = searchParams.get("type");       // "paypal"
  const gcParam   = searchParams.get("gc");         // PayPal pre-resolved amount

  const [status,   setStatus]   = useState<Status>("loading");
  const [gcAmount, setGcAmount] = useState<number>(0);
  const [priceCny, setPriceCny] = useState<number>(0);

  useEffect(() => {
    // ── Paddle / PayPal / USDT / WeChat / Alipay: amount already resolved server-side ──
    if ((type === "paddle" || type === "paypal" || type === "usdt" || type === "wechat" || type === "alipay") && gcParam) {
      setGcAmount(Number(gcParam));
      setStatus("success");
      return;
    }

    // ── Stripe: verify session ──
    if (!sessionId) { setStatus("error"); return; }

    fetch(`/api/topup/verify?session_id=${sessionId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.paid) {
          setGcAmount(data.gcAmount);
          setPriceCny((data.amountTotal ?? 0) / 100);
          setStatus("success");
        } else {
          setStatus("failed");
        }
      })
      .catch(() => setStatus("error"));
  }, [sessionId, type, gcParam]);

  // Auto-redirect after success
  useEffect(() => {
    if (status !== "success") return;
    const t = setTimeout(() => router.replace(`/${locale}/profile`), 5000);
    return () => clearTimeout(t);
  }, [status, locale, router]);

  const isWechat = type === "wechat";
  const isAlipay = type === "alipay";
  const isPaddle = type === "paddle";
  const isPayPal = type === "paypal";
  const isUsdt   = type === "usdt";

  /* ── Loading ── */
  if (status === "loading") {
    return (
      <div className="min-h-screen bg-[#0A1628] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[#1E3A5F] border-t-[#FFD700] rounded-full animate-spin" />
          <p className="text-gray-400 text-sm">{zh ? "正在确认支付…" : "Confirming payment…"}</p>
        </div>
      </div>
    );
  }

  /* ── Error / Failed ── */
  if (status === "error" || status === "failed") {
    return (
      <div className="min-h-screen bg-[#0A1628] flex items-center justify-center px-4">
        <div className="max-w-sm w-full text-center">
          <div className="text-6xl mb-4">⚠️</div>
          <h1 className="text-xl font-black text-white mb-2">
            {zh ? "支付验证失败" : "Payment verification failed"}
          </h1>
          <p className="text-gray-400 text-sm mb-6">
            {zh
              ? "如已扣款，GoalCoin 将在 5 分钟内自动到账。如有疑问请联系客服。"
              : "If charged, GoalCoin will be credited within 5 minutes. Contact support if needed."}
          </p>
          <Link
            href={`/${locale}/profile`}
            className="inline-block px-6 py-3 bg-[#FFD700] text-[#0A1628] font-black rounded-2xl hover:bg-[#FFC200] transition-colors"
          >
            {zh ? "返回个人主页" : "Back to Profile"}
          </Link>
        </div>
      </div>
    );
  }

  /* ── Success ── */
  return (
    <div className="min-h-screen bg-[#0A1628] flex items-center justify-center px-4">
      <div className="max-w-sm w-full">
        <div className="bg-gradient-to-b from-[#0F2040] to-[#0A1628] border border-[#FFD700]/30 rounded-3xl p-8 text-center shadow-2xl shadow-[#FFD700]/5">

          {/* Coin animation */}
          <div className="relative inline-flex items-center justify-center mb-6">
            <div
              className="absolute inset-0 rounded-full bg-[#FFD700]/10 animate-ping"
              style={{ animationDuration: "2s" }}
            />
            <div className="w-24 h-24 rounded-full bg-[#FFD700]/15 border-2 border-[#FFD700]/40 flex items-center justify-center text-5xl">
              🪙
            </div>
          </div>

          <h1 className="text-2xl font-black text-white mb-1">
            {zh ? "充值成功！" : "Top-up Successful!"}
          </h1>
          <p className="text-gray-500 text-sm mb-6">
            {isWechat
              ? (zh ? "通过微信支付完成" : "Paid via WeChat Pay")
              : isAlipay
                ? (zh ? "通过支付宝完成" : "Paid via Alipay")
                : isUsdt
                  ? (zh ? "通过 USDT TRC-20 完成支付" : "Paid via USDT TRC-20")
                  : isPayPal
                    ? (zh ? "通过 PayPal 完成支付" : "Paid via PayPal")
                    : isPaddle
                      ? (zh ? "通过银行卡完成支付" : "Paid via Card")
                      : priceCny > 0
                        ? (zh ? `已支付 ¥${priceCny}` : `Paid ¥${priceCny}`)
                        : (zh ? "支付完成" : "Payment complete")}
          </p>

          {/* GC Amount */}
          <div className="bg-[#FFD700]/10 border border-[#FFD700]/30 rounded-2xl px-6 py-5 mb-6">
            <p className="text-gray-400 text-xs mb-1">
              {zh ? "到账 GoalCoin" : "GoalCoin Credited"}
            </p>
            <p className="text-4xl font-black text-[#FFD700]">
              +{formatGc(gcAmount)}
            </p>
            <p className="text-gray-600 text-xs mt-1">GC</p>
          </div>

          <p className="text-gray-600 text-xs mb-6">
            {zh ? "GoalCoin 已到账，5 秒后自动跳转个人主页" : "GC credited · Redirecting in 5s"}
          </p>

          <div className="flex flex-col gap-2">
            <Link
              href={`/${locale}/profile`}
              className="block w-full py-3 bg-[#FFD700] text-[#0A1628] font-black rounded-2xl text-sm hover:bg-[#FFC200] transition-colors"
            >
              {zh ? "查看余额 →" : "View Balance →"}
            </Link>
            <Link
              href={`/${locale}/matches`}
              className="block w-full py-3 bg-[#0F2040] border border-[#1E3A5F] text-gray-300 font-bold rounded-2xl text-sm hover:border-gray-500 transition-colors"
            >
              {zh ? "去竞猜比赛" : "Go Predict Matches"}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function TopupSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0A1628] flex items-center justify-center">
          <div className="w-12 h-12 border-4 border-[#1E3A5F] border-t-[#FFD700] rounded-full animate-spin" />
        </div>
      }
    >
      <SuccessContent />
    </Suspense>
  );
}
