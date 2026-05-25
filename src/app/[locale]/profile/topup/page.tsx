"use client";

import { Suspense, useState, useEffect } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";

interface Package {
  id:        string;
  gc:        number;
  label:     string;
  price:     string;
  priceUsdt: number;
  bonus:     number;
  popular?:  boolean;
  best?:     boolean;
}

const PACKAGES: Package[] = [
  { id: "s1",  gc: 100_000_000,    label: "1亿",   price: "¥6",   priceUsdt: 1.00,  bonus: 0  },
  { id: "s2",  gc: 300_000_000,    label: "3亿",   price: "¥15",  priceUsdt: 2.00,  bonus: 10 },
  { id: "s3",  gc: 600_000_000,    label: "6亿",   price: "¥25",  priceUsdt: 3.50,  bonus: 20, popular: true },
  { id: "s4",  gc: 1_000_000_000,  label: "10亿",  price: "¥38",  priceUsdt: 5.50,  bonus: 30 },
  { id: "s5",  gc: 3_000_000_000,  label: "30亿",  price: "¥88",  priceUsdt: 12.00, bonus: 50, best: true },
  { id: "s6",  gc: 10_000_000_000, label: "100亿", price: "¥238", priceUsdt: 33.00, bonus: 80 },
];

const FREE_WAYS = [
  { icon: "📅", title: "每日签到",     desc: "每天登录领取签到奖励，连续签到额外加成",      link: "/profile",          linkLabel: "去签到"   },
  { icon: "⚽", title: "竞猜比赛",     desc: "预测比赛结果，赢取高额 GoalCoin 奖励",        link: "/matches",          linkLabel: "去竞猜"   },
  { icon: "🎯", title: "竞猜比分",     desc: "精准预测比分，赔率更高，赢更多",              link: "/matches",          linkLabel: "去押注"   },
  { icon: "👤", title: "完善个人资料", desc: "填写头像、国家、Bio 等信息，各得奖励",         link: "/profile/settings", linkLabel: "去完善"   },
  { icon: "🎁", title: "邀请好友",     desc: "邀请朋友注册，双方各得 2000 万 GC",          link: "/invite",           linkLabel: "去邀请"   },
  { icon: "🏆", title: "排行榜奖励",   desc: "登上排行榜赛季前列，赢取丰厚奖励",           link: "/leaderboard",      linkLabel: "查看榜单" },
];

function formatGcBig(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(0)}B GC`;
  if (n >= 1_000_000)     return `${(n / 1_000_000).toFixed(0)}M GC`;
  return `${n} GC`;
}

type PayMethod = "stripe" | "paypal" | "usdt";

// ── Main content (needs Suspense for useSearchParams) ────────────────────────
function TopupContent() {
  const params       = useParams();
  const router       = useRouter();
  const searchParams = useSearchParams();
  const locale       = (params.locale as string) || "zh";
  const zh           = locale === "zh";

  const [selected,   setSelected]   = useState<string | null>(null);
  const [payMethod,  setPayMethod]  = useState<PayMethod>("stripe");
  const [paying,     setPaying]     = useState(false);
  const [payErr,     setPayErr]     = useState<string | null>(null);
  const [tab,        setTab]        = useState<"buy" | "free">("buy");

  // USDT-specific state
  const [txHash,     setTxHash]     = useState("");
  const [copied,     setCopied]     = useState<"addr" | "amount" | null>(null);

  // Toast if user cancelled out of Stripe
  const cancelled = searchParams.get("cancelled") === "1";
  useEffect(() => {
    if (cancelled) setPayErr(zh ? "支付已取消" : "Payment cancelled");
  }, [cancelled, zh]);

  // Reset error + USDT input when package or method changes
  useEffect(() => { setPayErr(null); setTxHash(""); }, [selected, payMethod]);

  // ── USDT handler ────────────────────────────────────────────────────────
  async function handleUsdt() {
    if (!selected || !txHash.trim() || paying) return;
    setPaying(true);
    setPayErr(null);
    try {
      const res  = await fetch("/api/topup/usdt", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ txHash: txHash.trim(), packageId: selected }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPayErr(data.error ?? (zh ? "验证失败，请检查 TxID" : "Verification failed"));
        setPaying(false);
        return;
      }
      router.replace(`/${locale}/profile/topup/success?type=usdt&gc=${data.gcAmount}`);
    } catch {
      setPayErr(zh ? "网络错误，请重试" : "Network error, please retry");
      setPaying(false);
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

  // ── Stripe handler ──────────────────────────────────────────────────────
  async function handleStripe() {
    if (!selected || paying) return;
    setPaying(true);
    setPayErr(null);
    try {
      const res  = await fetch("/api/topup/checkout", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ packageId: selected, locale }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) {
        setPayErr(data.error ?? (zh ? "创建订单失败，请重试" : "Failed to create order"));
        setPaying(false);
        return;
      }
      window.location.href = data.url; // navigate away → no setPaying(false)
    } catch {
      setPayErr(zh ? "网络错误，请重试" : "Network error, please retry");
      setPaying(false);
    }
  }

  // ── PayPal handlers ─────────────────────────────────────────────────────
  async function createPayPalOrder() {
    setPayErr(null);
    const res  = await fetch("/api/topup/paypal/create", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ packageId: selected }),
    });
    const data = await res.json();
    if (!res.ok || !data.orderID) throw new Error(data.error ?? "Create order failed");
    return data.orderID as string;
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
              {zh ? "GoalCoin 为虚拟积分，不具备实际货币价值" : "GoalCoin is virtual currency with no monetary value"}
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
                      {p.price}
                    </span>
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
                  {/* Stripe */}
                  <button
                    onClick={() => setPayMethod("stripe")}
                    className={`flex flex-col items-center justify-center gap-1 py-3 px-2 rounded-xl border-2 transition-all text-xs font-bold ${
                      payMethod === "stripe"
                        ? "bg-[#635BFF]/10 border-[#635BFF] text-white"
                        : "bg-[#0F2040] border-[#1E3A5F] text-gray-400 hover:border-gray-500"
                    }`}
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.591-7.305z"/>
                    </svg>
                    <span>Stripe</span>
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
                    {/* Tether hexagon logo */}
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

            {/* ── Stripe pay button ── */}
            {payMethod === "stripe" && (
              <button
                onClick={handleStripe}
                disabled={!selected || paying}
                className="w-full py-3.5 rounded-2xl font-black text-base transition-all disabled:opacity-40 disabled:cursor-not-allowed bg-[#FFD700] text-[#0A1628] hover:bg-[#FFC200] shadow-lg shadow-[#FFD700]/20"
              >
                {paying ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="inline-block w-4 h-4 border-2 border-[#0A1628]/30 border-t-[#0A1628] rounded-full animate-spin" />
                    {zh ? "跳转支付页面…" : "Redirecting…"}
                  </span>
                ) : selected ? (
                  `${zh ? "信用卡支付" : "Pay with Card"} ${pkg?.price} → ${formatGcBig(totalGc)}`
                ) : (
                  zh ? "请选择充值套餐" : "Select a package"
                )}
              </button>
            )}

            {/* ── PayPal buttons ── */}
            {payMethod === "paypal" && selected && (
              <PayPalScriptProvider
                options={{
                  clientId: process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID ?? "",
                  currency: "CNY",
                  intent:   "capture",
                }}
              >
                <div className="rounded-2xl overflow-hidden">
                  <PayPalButtons
                    style={{ layout: "vertical", color: "gold", shape: "rect", label: "pay", height: 48 }}
                    disabled={paying}
                    createOrder={createPayPalOrder}
                    onApprove={onPayPalApprove}
                    onError={(err) => {
                      console.error("[PayPal error]", err);
                      setPayErr(zh ? "PayPal 支付出错，请重试" : "PayPal error, please try again");
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
                {/* Step 1 — transfer info */}
                <div className="bg-[#0B1E10] border border-[#26A17B]/40 rounded-2xl p-4">
                  <p className="text-[11px] font-black text-[#26A17B] uppercase tracking-wider mb-3">
                    {zh ? "① 转账信息" : "① Transfer Details"}
                  </p>

                  {/* Network badge */}
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-[10px] bg-[#26A17B]/20 border border-[#26A17B]/40 text-[#26A17B] font-black px-2.5 py-1 rounded-full">
                      TRC-20 · TRON
                    </span>
                    <span className="text-[10px] text-gray-500">
                      {zh ? "请勿使用其他网络" : "Do NOT use other networks"}
                    </span>
                  </div>

                  {/* Amount row */}
                  <div className="flex items-center justify-between bg-[#0A1628] rounded-xl px-3.5 py-2.5 mb-2 border border-[#1E3A5F]">
                    <div>
                      <p className="text-[10px] text-gray-500 mb-0.5">{zh ? "转账金额" : "Amount to send"}</p>
                      <p className="text-lg font-black text-white">
                        {pkg.priceUsdt.toFixed(2)}
                        <span className="text-[#26A17B] ml-1">USDT</span>
                      </p>
                    </div>
                    <button
                      onClick={() => copyText(pkg.priceUsdt.toFixed(2), "amount")}
                      className="flex items-center gap-1 text-[10px] font-bold text-[#26A17B] bg-[#26A17B]/10 hover:bg-[#26A17B]/20 border border-[#26A17B]/30 px-2.5 py-1.5 rounded-lg transition-colors"
                    >
                      {copied === "amount" ? (zh ? "已复制 ✓" : "Copied ✓") : (zh ? "复制金额" : "Copy")}
                    </button>
                  </div>

                  {/* Wallet address row */}
                  <div className="flex items-start gap-3 bg-[#0A1628] rounded-xl px-3.5 py-2.5 border border-[#1E3A5F]">
                    {/* QR code */}
                    {process.env.NEXT_PUBLIC_USDT_WALLET ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=${encodeURIComponent(process.env.NEXT_PUBLIC_USDT_WALLET)}&bgcolor=0A1628&color=26A17B&margin=1&format=png`}
                        alt="USDT wallet QR"
                        width={72}
                        height={72}
                        className="rounded-lg shrink-0 border border-[#26A17B]/30"
                      />
                    ) : (
                      <div className="w-[72px] h-[72px] rounded-lg bg-[#26A17B]/10 border border-[#26A17B]/30 flex items-center justify-center text-[#26A17B] text-2xl shrink-0">
                        ⬡
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] text-gray-500 mb-1">{zh ? "收款地址 (TRC-20)" : "Wallet address (TRC-20)"}</p>
                      <p className="text-[11px] text-gray-300 font-mono break-all leading-relaxed">
                        {process.env.NEXT_PUBLIC_USDT_WALLET || (zh ? "尚未配置，请联系管理员" : "Not configured, contact admin")}
                      </p>
                      {process.env.NEXT_PUBLIC_USDT_WALLET && (
                        <button
                          onClick={() => copyText(process.env.NEXT_PUBLIC_USDT_WALLET!, "addr")}
                          className="mt-1.5 flex items-center gap-1 text-[10px] font-bold text-[#26A17B] bg-[#26A17B]/10 hover:bg-[#26A17B]/20 border border-[#26A17B]/30 px-2.5 py-1 rounded-lg transition-colors"
                        >
                          {copied === "addr" ? (zh ? "已复制 ✓" : "Copied ✓") : (zh ? "复制地址" : "Copy address")}
                        </button>
                      )}
                    </div>
                  </div>

                  <p className="text-[10px] text-amber-500/80 mt-2.5 leading-relaxed">
                    ⚠ {zh
                      ? "请务必转账准确金额，多转或少转无法自动识别。TRX 钱包需保留少量 TRX 作为手续费。"
                      : "Send the exact amount shown. Your wallet needs a small TRX balance for gas fees."}
                  </p>
                </div>

                {/* Step 2 — submit TX hash */}
                <div className="bg-[#0F2040] border border-[#1E3A5F] rounded-2xl p-4">
                  <p className="text-[11px] font-black text-gray-400 uppercase tracking-wider mb-3">
                    {zh ? "② 提交交易哈希 (TxID)" : "② Submit Transaction Hash (TxID)"}
                  </p>
                  <input
                    type="text"
                    value={txHash}
                    onChange={(e) => setTxHash(e.target.value)}
                    placeholder={zh ? "粘贴 64 位交易哈希…" : "Paste 64-char transaction hash…"}
                    className="w-full bg-[#080F1F] border border-[#2A4A7F] rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 outline-none focus:border-[#26A17B]/60 transition-colors font-mono text-[12px]"
                    maxLength={66}
                  />
                  <p className="text-[10px] text-gray-600 mt-1.5">
                    {zh ? "在钱包 App 或 TronScan 中找到本次转账记录，复制 TxID 粘贴至此" : "Find the TxID in your wallet app or on tronscan.org, then paste it here"}
                  </p>
                </div>

                {/* Verify button */}
                <button
                  onClick={handleUsdt}
                  disabled={!txHash.trim() || paying}
                  className="w-full py-3.5 rounded-2xl font-black text-base transition-all disabled:opacity-40 disabled:cursor-not-allowed bg-[#26A17B] text-white hover:bg-[#1e8a68] shadow-lg shadow-[#26A17B]/20"
                >
                  {paying ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      {zh ? "链上验证中…" : "Verifying on-chain…"}
                    </span>
                  ) : (
                    zh ? "✓ 验证转账并到账 GC" : "✓ Verify & Credit GC"
                  )}
                </button>
              </div>
            )}

            {/* Payment info */}
            <div className="mt-4 flex items-center justify-center gap-2 flex-wrap">
              <span className="text-[10px] text-gray-600">{zh ? "支持：" : "Accepted:"}</span>
              <span className="text-[10px] text-gray-500 bg-[#0F2040] border border-[#1E3A5F] px-2.5 py-1 rounded-md font-medium">
                💳 Stripe
              </span>
              <span className="text-[10px] text-gray-500 bg-[#0F2040] border border-[#1E3A5F] px-2.5 py-1 rounded-md font-medium">
                🅿 PayPal
              </span>
              <span className="text-[10px] text-gray-500 bg-[#0F2040] border border-[#1E3A5F] px-2.5 py-1 rounded-md font-medium">
                ⬡ USDT TRC-20
              </span>
            </div>

            <p className="text-[10px] text-gray-600 text-center mt-3 leading-relaxed">
              {zh
                ? "GoalCoin 为虚拟游戏积分，仅用于 Football2026 平台内竞猜，购买后不可退款，不可兑换现金。"
                : "GoalCoin is virtual game currency for Football2026 prediction only. All purchases are non-refundable and have no cash value."}
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
