"use client";

import { Suspense, useState, useEffect, useRef } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Script from "next/script";
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";

// ── Paddle.js global typing ──────────────────────────────────────────────────
interface PaddleEvent {
  name?: string;
  data?: { custom_data?: { gc_amount?: string | number } | null };
}
interface PaddleGlobal {
  Environment?: { set: (env: "sandbox" | "production") => void };
  Initialize: (opts: { token: string; eventCallback?: (e: PaddleEvent) => void }) => void;
  // NOTE: `Window.Paddle` is also declared in a mobile file; keep this shape in
  // sync. The optional `settings` is passed via a cast at the call site so the
  // two global declarations stay structurally identical (avoids TS2717).
  Checkout: { open: (opts: { transactionId: string }) => void };
}
declare global {
  interface Window {
    Paddle?: PaddleGlobal;
  }
}

interface Package {
  id:        string;
  gc:        number;
  label:     string;
  priceUsd:  string;   // charged by Card / PayPal / USDT
  priceCny:  string;   // reference for CNY users
  priceUsdt: number;   // exact USDT amount
  bonus:     number;
  popular?:  boolean;
  best?:     boolean;
}

const PACKAGES: Package[] = [
  { id: "s1",  gc: 100_000,    label: "10万",   priceUsd: "$1.99",  priceCny: "≈¥14",  priceUsdt: 1.99,  bonus: 0  },
  { id: "s2",  gc: 300_000,    label: "30万",   priceUsd: "$4.99",  priceCny: "≈¥34",  priceUsdt: 4.99,  bonus: 10 },
  { id: "s3",  gc: 600_000,    label: "60万",   priceUsd: "$8.99",  priceCny: "≈¥61",  priceUsdt: 8.99,  bonus: 20, popular: true },
  { id: "s4",  gc: 1_000_000,  label: "100万",  priceUsd: "$13.99", priceCny: "≈¥95",  priceUsdt: 13.99, bonus: 30 },
  { id: "s5",  gc: 3_000_000,  label: "300万",  priceUsd: "$34.99", priceCny: "≈¥238", priceUsdt: 34.99, bonus: 50, best: true },
  { id: "s6",  gc: 10_000_000, label: "1000万", priceUsd: "$99.99", priceCny: "≈¥680", priceUsdt: 99.99, bonus: 80 },
];

const FREE_WAYS = [
  { icon: "📅", title: "每日签到",     desc: "每天登录领取签到奖励，连续签到额外加成",      link: "/profile",          linkLabel: "去签到"   },
  { icon: "⚽", title: "预测比赛",     desc: "预测比赛结果，赢取高额 GoalCoin 积分奖励",    link: "/matches",          linkLabel: "去预测"   },
  { icon: "🎯", title: "预测比分",     desc: "精准预测比分，积分倍增，赢取更多",            link: "/matches",          linkLabel: "去预测"   },
  { icon: "👤", title: "完善个人资料", desc: "填写头像、国家、Bio 等信息，各得奖励",         link: "/profile/settings", linkLabel: "去完善"   },
  { icon: "🎁", title: "邀请好友",     desc: "邀请朋友注册，双方各得 50 万 GC",           link: "/invite",           linkLabel: "去邀请"   },
  { icon: "🏆", title: "排行榜奖励",   desc: "登上排行榜赛季前列，赢取丰厚奖励",           link: "/leaderboard",      linkLabel: "查看榜单" },
];

function formatGcBig(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(0)}B GC`;
  if (n >= 1_000_000)     return `${(n / 1_000_000).toFixed(0)}M GC`;
  return `${n} GC`;
}

type PayMethod = "paddle" | "paypal" | "usdt";

// Inlined at build time. Empty if the env var wasn't set when the bundle was built
// (locally: restart `next dev`; on Vercel: add the var then redeploy).
const PADDLE_TOKEN = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN ?? "";

// Wait up to `tries * stepMs` for the async Paddle.js script to appear on window.
function waitForPaddle(tries = 20, stepMs = 150): Promise<boolean> {
  return new Promise((resolve) => {
    let n = 0;
    const tick = () => {
      if (typeof window !== "undefined" && window.Paddle) return resolve(true);
      if (n++ >= tries) return resolve(false);
      setTimeout(tick, stepMs);
    };
    tick();
  });
}

// ── Main content (needs Suspense for useSearchParams) ────────────────────────
function TopupContent() {
  const params       = useParams();
  const router       = useRouter();
  const searchParams = useSearchParams();
  const locale       = (params.locale as string) || "zh";
  const zh           = locale === "zh";

  const [selected,   setSelected]   = useState<string | null>(null);
  const [payMethod,  setPayMethod]  = useState<PayMethod>("paddle");
  const [paying,     setPaying]     = useState(false);
  const [payErr,     setPayErr]     = useState<string | null>(null);
  const [tab,        setTab]        = useState<"buy" | "free">("buy");

  // USDT-specific state
  const [usdtPaymentId, setUsdtPaymentId] = useState<string | null>(null);
  const [usdtAddress,   setUsdtAddress]   = useState<string | null>(null);
  const [usdtPayAmount, setUsdtPayAmount] = useState<number | null>(null);
  const [usdtStatus,    setUsdtStatus]    = useState<"idle" | "pending" | "completed">("idle");
  const [copied,        setCopied]        = useState<"addr" | "amount" | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Paddle.js readiness
  const paddleReady = useRef(false);
  function initPaddle() {
    if (paddleReady.current || !window.Paddle) return;
    const token = PADDLE_TOKEN;
    if (!token) return; // surfaced as an error when the user tries to pay
    if (process.env.NEXT_PUBLIC_PADDLE_SANDBOX === "true" && window.Paddle.Environment) {
      window.Paddle.Environment.set("sandbox");
    }
    window.Paddle.Initialize({
      token,
      // GC is credited by the webhook (source of truth); pass gc for display only.
      eventCallback: (event) => {
        if (event.name !== "checkout.completed") return;
        const gc = event.data?.custom_data?.gc_amount ?? "";
        router.replace(`/${locale}/profile/topup/success?type=paddle&gc=${gc}`);
      },
    });
    paddleReady.current = true;
  }

  // Toast if user cancelled out of Stripe
  const cancelled = searchParams.get("cancelled") === "1";
  useEffect(() => {
    if (cancelled) setPayErr(zh ? "支付已取消" : "Payment cancelled");
  }, [cancelled, zh]);

  // Reset error + USDT state when package or method changes
  useEffect(() => {
    setPayErr(null);
    setUsdtPaymentId(null);
    setUsdtAddress(null);
    setUsdtPayAmount(null);
    setUsdtStatus("idle");
    if (pollRef.current) clearInterval(pollRef.current);
  }, [selected, payMethod]);

  // Stop polling on unmount
  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

  // ── USDT: create order & get unique address ──────────────────────────────
  async function handleCreateUsdtOrder() {
    if (!selected || paying) return;
    setPaying(true);
    setPayErr(null);
    try {
      const res  = await fetch("/api/topup/usdt", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ packageId: selected }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPayErr(data.error ?? (zh ? "创建订单失败，请重试" : "Failed to create order"));
        setPaying(false);
        return;
      }
      setUsdtPaymentId(data.paymentId);
      setUsdtAddress(data.payAddress);
      setUsdtPayAmount(data.payAmount);
      setUsdtStatus("pending");
      startPolling(data.paymentId, data.gcAmount);
    } catch {
      setPayErr(zh ? "网络错误，请重试" : "Network error, please retry");
    }
    setPaying(false);
  }

  // ── USDT: poll status every 15s ─────────────────────────────────────────
  function startPolling(paymentId: string, gcAmount: number) {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const res  = await fetch(`/api/topup/usdt/status/${paymentId}`);
        const data = await res.json();
        if (data.status === "completed") {
          clearInterval(pollRef.current!);
          setUsdtStatus("completed");
          router.replace(`/${locale}/profile/topup/success?type=usdt&gc=${gcAmount}`);
        }
      } catch { /* silent — next tick will retry */ }
    }, 15_000);
  }

  async function checkUsdtManually() {
    if (!usdtPaymentId) return;
    try {
      const res  = await fetch(`/api/topup/usdt/status/${usdtPaymentId}`);
      const data = await res.json();
      if (data.status === "completed") {
        setUsdtStatus("completed");
        router.replace(`/${locale}/profile/topup/success?type=usdt&gc=${data.gcAmount}`);
      } else {
        setPayErr(zh ? "⏳ 暂未检测到到账，通常需 1-5 分钟，请稍候" : "⏳ Not detected yet, usually 1-5 min");
      }
    } catch {
      setPayErr(zh ? "查询失败，请重试" : "Query failed, please retry");
    }
  }

  function copyText(text: string, key: "addr" | "amount") {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(null), 1800);
    });
  }

  const pkg    = PACKAGES.find((p) => p.id === selected);
  const totalGc = pkg ? Math.floor(pkg.gc * (1 + pkg.bonus / 100)) : 0;

  // ── Paddle handler (inline overlay via Paddle.js) ─────────────────────────
  async function handlePaddle() {
    if (!selected || paying) return;
    setPayErr(null);

    // Token must be baked into the build. If empty, configuration is the problem,
    // not a transient state — tell the user clearly and stop.
    if (!PADDLE_TOKEN) {
      setPayErr(zh ? "银行卡支付暂未开放，请选择其他方式" : "Card payment is unavailable, please use another method");
      return;
    }

    setPaying(true);

    // Paddle.js loads async (afterInteractive); a fast click can beat it. Wait briefly.
    const ready = await waitForPaddle();
    initPaddle();
    if (!ready || !paddleReady.current || !window.Paddle) {
      setPayErr(zh ? "支付组件加载中，请稍后重试" : "Checkout is loading, please retry in a moment");
      setPaying(false);
      return;
    }

    try {
      const res  = await fetch("/api/topup/paddle", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ packageId: selected, locale }),
      });
      const data = await res.json();
      if (!res.ok || !data.transactionId) {
        setPayErr(data.error ?? (zh ? "创建订单失败，请重试" : "Failed to create order"));
        setPaying(false);
        return;
      }
      // Force the Paddle checkout overlay language to match the site locale,
      // instead of Paddle auto-detecting from the browser language. `settings`
      // is valid at runtime; cast keeps it compatible with the shared global type.
      window.Paddle.Checkout.open({
        transactionId: data.transactionId,
        settings: { locale: zh ? "zh-Hans" : "en" },
      } as { transactionId: string });
      setPaying(false); // overlay is now open; release the button
    } catch {
      setPayErr(zh ? "网络错误，请重试" : "Network error, please retry");
      setPaying(false);
    }
  }

  // ── PayPal handlers ─────────────────────────────────────────────────────
  async function createPayPalOrder() {
    setPayErr(null);
    try {
      const res  = await fetch("/api/topup/paypal/create", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ packageId: selected }),
      });
      const data = await res.json();
      if (!res.ok || !data.orderID) {
        const msg = data.error ?? "Create order failed";
        setPayErr(zh ? `创建订单失败：${msg}` : `Create order failed: ${msg}`);
        throw new Error(msg);
      }
      return data.orderID as string;
    } catch (err) {
      // If we haven't set payErr yet (network-level failure), set it now
      if (!payErr) {
        const msg = err instanceof Error ? err.message : String(err);
        setPayErr(zh ? `网络错误：${msg}` : `Network error: ${msg}`);
      }
      throw err;
    }
  }

  async function onPayPalApprove(data: { orderID: string }) {
    setPaying(true);
    setPayErr(null);
    try {
      const res  = await fetch("/api/topup/paypal/capture", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ orderID: data.orderID, packageId: selected }),
      });
      const result = await res.json();
      if (!res.ok) {
        setPayErr(result.error ?? (zh ? "支付捕获失败，请联系客服" : "Capture failed, please contact support"));
        setPaying(false);
        return;
      }
      // Redirect to success page with GC amount
      router.replace(`/${locale}/profile/topup/success?type=paypal&gc=${result.gcAmount}`);
    } catch {
      setPayErr(zh ? "网络错误，请重试" : "Network error, please retry");
      setPaying(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0A1628] text-white pb-24">
      {/* Paddle.js — powers the inline card checkout overlay */}
      <Script
        src="https://cdn.paddle.com/paddle/v2/paddle.js"
        strategy="afterInteractive"
        onLoad={initPaddle}
      />
      <div className="max-w-2xl mx-auto px-4 pt-6">

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => router.back()}
            className="w-9 h-9 flex items-center justify-center rounded-xl text-gray-400 hover:text-white hover:bg-[#1E3A5F] transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="text-xl font-black text-white">
              🪙 {zh ? "GoalCoin 充值" : "Top Up GoalCoin"}
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">
              {zh ? "GoalCoin 为虚拟娱乐积分，不具备实际货币价值" : "GoalCoin is virtual entertainment points with no monetary value"}
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-5">
          {(["buy", "free"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all border ${
                tab === t
                  ? "bg-[#FFD700]/15 border-[#FFD700]/40 text-[#FFD700]"
                  : "bg-[#0F2040] border-[#1E3A5F] text-gray-400 hover:text-gray-200"
              }`}
            >
              {t === "buy" ? `💳 ${zh ? "购买充值" : "Buy GC"}` : `🎁 ${zh ? "免费获取" : "Earn Free"}`}
            </button>
          ))}
        </div>

        {/* ── Buy tab ── */}
        {tab === "buy" && (
          <>
            {/* Package grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-5">
              {PACKAGES.map((p) => {
                const isSelected = selected === p.id;
                const tgc = Math.floor(p.gc * (1 + p.bonus / 100));
                return (
                  <button
                    key={p.id}
                    onClick={() => setSelected(p.id)}
                    className={`relative flex flex-col items-center gap-1.5 p-4 rounded-2xl border-2 transition-all ${
                      isSelected
                        ? "bg-[#FFD700]/10 border-[#FFD700] shadow-lg shadow-[#FFD700]/10"
                        : "bg-[#0F2040] border-[#1E3A5F] hover:border-gray-500/50"
                    }`}
                  >
                    {p.popular && (
                      <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-blue-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full whitespace-nowrap">
                        {zh ? "热门" : "Popular"}
                      </span>
                    )}
                    {p.best && (
                      <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-[#FFD700] text-[#0A1628] text-[9px] font-black px-2 py-0.5 rounded-full whitespace-nowrap">
                        {zh ? "超值" : "Best Value"}
                      </span>
                    )}
                    <span className="text-2xl">🪙</span>
                    <span className="text-base font-black text-white">{p.label}</span>
                    {p.bonus > 0 && (
                      <span className="text-[10px] font-bold text-green-400 bg-green-500/10 border border-green-500/20 px-1.5 py-0.5 rounded-full">
                        +{p.bonus}% {zh ? "赠送" : "Bonus"}
                      </span>
                    )}
                    {p.bonus > 0 && (
                      <span className="text-[9px] text-gray-500">
                        {zh ? "实得" : "Total"} {formatGcBig(tgc)}
                      </span>
                    )}
                    <span className={`text-lg font-black mt-1 ${isSelected ? "text-[#FFD700]" : "text-gray-200"}`}>
                      {p.priceUsd}
                    </span>
                    <span className="text-[10px] text-gray-600">{p.priceCny}</span>
                  </button>
                );
              })}
            </div>

            {/* ── Payment method selector ── */}
            {selected && (
              <div className="mb-4">
                <p className="text-xs text-gray-500 mb-2 font-medium">
                  {zh ? "选择支付方式" : "Payment method"}
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {/* Paddle (Card) */}
                  <button
                    onClick={() => setPayMethod("paddle")}
                    className={`flex flex-col items-center justify-center gap-1 py-3 px-2 rounded-xl border-2 transition-all text-xs font-bold ${
                      payMethod === "paddle"
                        ? "bg-[#0052CC]/15 border-[#0052CC] text-white"
                        : "bg-[#0F2040] border-[#1E3A5F] text-gray-400 hover:border-gray-500"
                    }`}
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <rect x="2" y="5" width="20" height="14" rx="2"/>
                      <path d="M2 10h20"/>
                      <path strokeLinecap="round" d="M6 15h4"/>
                      <path strokeLinecap="round" d="M14 15h4"/>
                    </svg>
                    <span>{zh ? "银行卡" : "Card"}</span>
                  </button>

                  {/* PayPal */}
                  <button
                    onClick={() => setPayMethod("paypal")}
                    className={`flex flex-col items-center justify-center gap-1 py-3 px-2 rounded-xl border-2 transition-all text-xs font-bold ${
                      payMethod === "paypal"
                        ? "bg-[#003087]/20 border-[#009CDE] text-white"
                        : "bg-[#0F2040] border-[#1E3A5F] text-gray-400 hover:border-gray-500"
                    }`}
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.304 2.42 1.012 4.287-.023.143-.047.288-.077.437-.983 5.05-4.349 6.797-8.647 6.797h-2.19c-.524 0-.968.382-1.05.9l-1.12 7.106zm14.146-14.42a3.35 3.35 0 0 0-.607-.541c-.013.076-.026.175-.041.254-.59 3.025-2.566 4.643-5.813 4.643H12.58c-.524 0-.968.382-1.05.9l-1.37 8.668-.386 2.432a.641.641 0 0 0 .633.74h4.023c.524 0 .968-.382 1.05-.9l.427-2.706.01-.055c.083-.518.527-.9 1.05-.9h.666c3.29 0 5.867-1.337 6.62-5.203.314-1.613.152-2.96-.63-3.933a2.83 2.83 0 0 0-.477-.398z"/>
                    </svg>
                    <span>PayPal</span>
                  </button>

                  {/* USDT */}
                  <button
                    onClick={() => setPayMethod("usdt")}
                    className={`flex flex-col items-center justify-center gap-1 py-3 px-2 rounded-xl border-2 transition-all text-xs font-bold ${
                      payMethod === "usdt"
                        ? "bg-[#26A17B]/15 border-[#26A17B] text-white"
                        : "bg-[#0F2040] border-[#1E3A5F] text-gray-400 hover:border-gray-500"
                    }`}
                  >
                    <svg className="w-5 h-5" viewBox="0 0 32 32" fill="currentColor">
                      <path d="M16 0C7.163 0 0 7.163 0 16s7.163 16 16 16 16-7.163 16-16S24.837 0 16 0z" fill="#26A17B"/>
                      <path d="M17.922 17.383v-.002c-.108.008-.665.042-1.922.042-1.001 0-1.714-.03-1.965-.042v.003c-3.888-.171-6.79-.848-6.79-1.658 0-.809 2.902-1.486 6.79-1.66v2.644c.254.018.982.061 1.988.061 1.207 0 1.812-.05 1.899-.06v-2.643c3.88.173 6.775.85 6.775 1.658 0 .81-2.895 1.485-6.775 1.657m0-3.59v-2.366h5.414V8.896H8.595v2.531h5.414v2.365c-4.4.202-7.709 1.074-7.709 2.118 0 1.044 3.309 1.915 7.709 2.118v7.582h3.913v-7.584c4.393-.202 7.694-1.073 7.694-2.116 0-1.043-3.301-1.914-7.694-2.117" fill="#fff"/>
                    </svg>
                    <span>USDT</span>
                  </button>
                </div>
              </div>
            )}

            {/* ── Error toast ── */}
            {payErr && (
              <div className="mb-3 flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-2.5">
                <span className="text-red-400 text-sm">⚠</span>
                <p className="text-red-400 text-sm flex-1">{payErr}</p>
                <button onClick={() => setPayErr(null)} className="text-red-400/60 hover:text-red-400 text-xs">✕</button>
              </div>
            )}

            {/* ── Paddle (Card) button ── */}
            {payMethod === "paddle" && selected && (
              <button
                onClick={handlePaddle}
                disabled={paying}
                className="w-full py-3.5 rounded-2xl font-black text-base transition-all disabled:opacity-40 disabled:cursor-not-allowed bg-[#0052CC] text-white hover:bg-[#0047B3] shadow-lg shadow-[#0052CC]/20"
              >
                {paying ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    {zh ? "跳转中…" : "Redirecting…"}
                  </span>
                ) : (
                  zh ? "💳 前往银行卡支付" : "💳 Pay with Card"
                )}
              </button>
            )}

            {payMethod === "paddle" && !selected && (
              <div className="w-full py-3.5 rounded-2xl font-black text-base text-center opacity-40 cursor-not-allowed bg-[#0052CC]/20 border border-[#0052CC]/30 text-[#4D8FD6]">
                {zh ? "请先选择充值套餐" : "Select a package first"}
              </div>
            )}

            {/* ── PayPal buttons ── */}
            {payMethod === "paypal" && selected && (
              <PayPalScriptProvider
                options={{
                  clientId: process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID ?? "",
                  currency: "USD",
                  intent:   "capture",
                  locale:   zh ? "zh_CN" : "en_US",
                }}
              >
                <div className="rounded-2xl overflow-hidden">
                  <PayPalButtons
                    style={{ layout: "vertical", color: "gold", shape: "rect", label: "pay", height: 48 }}
                    disabled={paying}
                    createOrder={createPayPalOrder}
                    onApprove={onPayPalApprove}
                    onError={(err) => {
                      console.error("[PayPal onError]", err);
                      // Only show generic message if createOrder didn't already set a specific one
                      setPayErr((prev) => prev ?? (zh ? "PayPal 支付出错，请重试" : "PayPal error, please try again"));
                    }}
                    onCancel={() => setPayErr(zh ? "PayPal 支付已取消" : "PayPal payment cancelled")}
                  />
                </div>
              </PayPalScriptProvider>
            )}

            {/* Placeholder when no package selected and paypal chosen */}
            {payMethod === "paypal" && !selected && (
              <div className="w-full py-3.5 rounded-2xl font-black text-base text-center opacity-40 cursor-not-allowed bg-[#003087]/30 border border-[#009CDE]/30 text-[#009CDE]">
                {zh ? "请先选择充值套餐" : "Select a package first"}
              </div>
            )}

            {/* ── USDT TRC-20 panel ── */}
            {payMethod === "usdt" && !selected && (
              <div className="w-full py-3.5 rounded-2xl font-black text-base text-center opacity-40 cursor-not-allowed bg-[#26A17B]/10 border border-[#26A17B]/30 text-[#26A17B]">
                {zh ? "请先选择充值套餐" : "Select a package first"}
              </div>
            )}

            {payMethod === "usdt" && selected && pkg && (
              <div className="space-y-3">

                {/* ── Idle: show package info + generate button ── */}
                {usdtStatus === "idle" && (
                  <>
                    <div className="bg-[#0B1E10] border border-[#26A17B]/40 rounded-2xl p-4">
                      <p className="text-[11px] font-black text-[#26A17B] uppercase tracking-wider mb-3">
                        {zh ? "USDT TRC-20 自动到账" : "USDT TRC-20 Auto-Detection"}
                      </p>
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-[10px] bg-[#26A17B]/20 border border-[#26A17B]/40 text-[#26A17B] font-black px-2.5 py-1 rounded-full">
                          TRC-20 · TRON
                        </span>
                        <span className="text-[10px] text-gray-500">
                          {zh ? "请勿使用其他网络" : "Do NOT use other networks"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between bg-[#0A1628] rounded-xl px-3.5 py-2.5 mb-3 border border-[#1E3A5F]">
                        <div>
                          <p className="text-[10px] text-gray-500 mb-0.5">{zh ? "应付金额" : "Amount to pay"}</p>
                          <p className="text-lg font-black text-white">
                            {pkg.priceUsdt.toFixed(2)}
                            <span className="text-[#26A17B] ml-1">USDT</span>
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] text-gray-500 mb-0.5">{zh ? "获得" : "You get"}</p>
                          <p className="text-sm font-black text-[#FFD700]">{formatGcBig(totalGc)}</p>
                        </div>
                      </div>
                      <p className="text-[10px] text-gray-500 leading-relaxed">
                        {zh
                          ? "点击下方按钮，系统将为本次订单生成一个专属 TRC-20 收款地址，转账后自动识别到账，无需提交 TxID。"
                          : "Click below to generate a unique TRC-20 address for this order. Payment is detected automatically — no TxID needed."}
                      </p>
                    </div>

                    <button
                      onClick={handleCreateUsdtOrder}
                      disabled={paying}
                      className="w-full py-3.5 rounded-2xl font-black text-base transition-all disabled:opacity-40 disabled:cursor-not-allowed bg-[#26A17B] text-white hover:bg-[#1e8a68] shadow-lg shadow-[#26A17B]/20"
                    >
                      {paying ? (
                        <span className="flex items-center justify-center gap-2">
                          <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          {zh ? "生成中…" : "Generating…"}
                        </span>
                      ) : (
                        zh ? "⬡ 生成专属付款地址" : "⬡ Generate Payment Address"
                      )}
                    </button>
                  </>
                )}

                {/* ── Pending: show unique address + QR + manual check ── */}
                {usdtStatus === "pending" && usdtAddress && (
                  <>
                    <div className="bg-[#0B1E10] border border-[#26A17B]/40 rounded-2xl p-4">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-[11px] font-black text-[#26A17B] uppercase tracking-wider">
                          {zh ? "专属收款地址" : "Your Payment Address"}
                        </p>
                        <span className="flex items-center gap-1.5 text-[10px] text-amber-400">
                          <span className="inline-block w-1.5 h-1.5 bg-amber-400 rounded-full animate-pulse" />
                          {zh ? "等待收款…" : "Awaiting payment…"}
                        </span>
                      </div>

                      {/* Network badge */}
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-[10px] bg-[#26A17B]/20 border border-[#26A17B]/40 text-[#26A17B] font-black px-2.5 py-1 rounded-full">
                          TRC-20 · TRON
                        </span>
                        <span className="text-[10px] text-gray-500">
                          {zh ? "请勿使用其他网络" : "Do NOT use other networks"}
                        </span>
                      </div>

                      {/* Exact amount */}
                      <div className="flex items-center justify-between bg-[#0A1628] rounded-xl px-3.5 py-2.5 mb-2 border border-[#1E3A5F]">
                        <div>
                          <p className="text-[10px] text-gray-500 mb-0.5">{zh ? "转账金额（精确）" : "Exact amount to send"}</p>
                          <p className="text-lg font-black text-white">
                            {usdtPayAmount?.toFixed(6)}
                            <span className="text-[#26A17B] ml-1">USDT</span>
                          </p>
                        </div>
                        <button
                          onClick={() => copyText(usdtPayAmount?.toFixed(6) ?? "", "amount")}
                          className="flex items-center gap-1 text-[10px] font-bold text-[#26A17B] bg-[#26A17B]/10 hover:bg-[#26A17B]/20 border border-[#26A17B]/30 px-2.5 py-1.5 rounded-lg transition-colors"
                        >
                          {copied === "amount" ? (zh ? "已复制 ✓" : "Copied ✓") : (zh ? "复制金额" : "Copy")}
                        </button>
                      </div>

                      {/* Address + QR */}
                      <div className="flex items-start gap-3 bg-[#0A1628] rounded-xl px-3.5 py-2.5 border border-[#1E3A5F]">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=${encodeURIComponent(usdtAddress)}&bgcolor=0A1628&color=26A17B&margin=1&format=png`}
                          alt="USDT address QR"
                          width={72}
                          height={72}
                          className="rounded-lg shrink-0 border border-[#26A17B]/30"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] text-gray-500 mb-1">{zh ? "收款地址 (TRC-20)" : "Wallet address (TRC-20)"}</p>
                          <p className="text-[11px] text-gray-300 font-mono break-all leading-relaxed">
                            {usdtAddress}
                          </p>
                          <button
                            onClick={() => copyText(usdtAddress, "addr")}
                            className="mt-1.5 flex items-center gap-1 text-[10px] font-bold text-[#26A17B] bg-[#26A17B]/10 hover:bg-[#26A17B]/20 border border-[#26A17B]/30 px-2.5 py-1 rounded-lg transition-colors"
                          >
                            {copied === "addr" ? (zh ? "已复制 ✓" : "Copied ✓") : (zh ? "复制地址" : "Copy address")}
                          </button>
                        </div>
                      </div>

                      <p className="text-[10px] text-amber-500/80 mt-2.5 leading-relaxed">
                        ⚠ {zh
                          ? "请转账精确金额，多转或少转可能无法自动识别。TRX 钱包需保留少量 TRX 作为手续费。转账后通常 1-5 分钟自动到账。"
                          : "Send the exact amount shown. Your wallet needs a small TRX balance for gas fees. Usually confirmed within 1-5 minutes."}
                      </p>
                    </div>

                    {/* Manual check button */}
                    <button
                      onClick={checkUsdtManually}
                      className="w-full py-3 rounded-2xl font-bold text-sm transition-all border border-[#26A17B]/40 text-[#26A17B] bg-[#26A17B]/5 hover:bg-[#26A17B]/10"
                    >
                      🔍 {zh ? "手动查询到账状态" : "Check Payment Status"}
                    </button>
                  </>
                )}

              </div>
            )}

            {/* Payment info */}
            <div className="mt-4 flex items-center justify-center gap-2 flex-wrap">
              <span className="text-[10px] text-gray-600">{zh ? "支持：" : "Accepted:"}</span>
              <span className="text-[10px] text-gray-500 bg-[#0F2040] border border-[#1E3A5F] px-2.5 py-1 rounded-md font-medium">💳 {zh ? "银行卡" : "Card"}</span>
              <span className="text-[10px] text-gray-500 bg-[#0F2040] border border-[#1E3A5F] px-2.5 py-1 rounded-md font-medium">🅿 PayPal</span>
              <span className="text-[10px] text-gray-500 bg-[#0F2040] border border-[#1E3A5F] px-2.5 py-1 rounded-md font-medium">⬡ USDT TRC-20</span>
            </div>

            <p className="text-[10px] text-gray-600 text-center mt-3 leading-relaxed">
              {zh
                ? "GoalCoin 为虚拟游戏积分，仅用于 Football2026 平台内娱乐互动，购买后不可退款，不可兑换现金。"
                : "GoalCoin is virtual entertainment points for use within the Football2026 fantasy sports platform only. All purchases are non-refundable and have no cash value."}
            </p>
          </>
        )}

        {/* ── Free tab ── */}
        {tab === "free" && (
          <div className="space-y-3">
            <p className="text-sm text-gray-400 mb-4">
              {zh ? "通过以下方式免费赚取 GoalCoin，完全不需要花钱！" : "Earn GoalCoin for free — no purchase required!"}
            </p>
            {FREE_WAYS.map((w) => (
              <div key={w.title} className="bg-[#0F2040] border border-[#1E3A5F] rounded-2xl px-4 py-3.5 flex items-center gap-4">
                <span className="text-2xl shrink-0">{w.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-white">{w.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{w.desc}</p>
                </div>
                <Link
                  href={`/${locale}${w.link}`}
                  className="shrink-0 text-xs font-bold text-[#FFD700] bg-[#FFD700]/10 border border-[#FFD700]/30 hover:bg-[#FFD700]/20 px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap"
                >
                  {w.linkLabel} →
                </Link>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}

// Suspense wrapper required for useSearchParams in Next.js App Router
export default function TopupPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0A1628] flex items-center justify-center">
          <div className="w-10 h-10 border-4 border-[#1E3A5F] border-t-[#FFD700] rounded-full animate-spin" />
        </div>
      }
    >
      <TopupContent />
    </Suspense>
  );
}
