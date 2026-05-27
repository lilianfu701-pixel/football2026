/** 虎皮椒支付 (xunhupay.com) — server-side only */

import { createHash } from "crypto";

const API_URL = "https://api.xunhupay.com/payment/do.html";

/** MD5 hash helper */
function md5(str: string): string {
  return createHash("md5").update(str).digest("hex");
}

/**
 * Build the sign hash required by 虎皮椒.
 * Sort all param keys alphabetically, join as key=value&..., append appsecret, then MD5.
 */
export function buildHash(
  params: Record<string, string>,
  appSecret: string,
): string {
  const sorted = Object.keys(params)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join("&");
  return md5(sorted + appSecret);
}

/** Verify incoming webhook signature */
export function verifyWebhook(
  params: Record<string, string>,
  appSecret: string,
): boolean {
  const { hash: received, ...rest } = params;
  if (!received) return false;
  const expected = buildHash(rest, appSecret);
  return expected === received;
}

export type XunhuPayment = "wechat" | "alipay";

/** Create a 虎皮椒 payment order and return the redirect URL */
export async function createXunhuOrder(opts: {
  payment:    XunhuPayment;
  tradeId:    string;       // unique order ID we generate
  totalFee:   string;       // yuan, e.g. "6.00"
  title:      string;
  notifyUrl:  string;
  returnUrl:  string;
}): Promise<string> {
  const appId     = process.env.XUNHUPAY_APPID;
  const appSecret = process.env.XUNHUPAY_APPSECRET;
  if (!appId || !appSecret) throw new Error("XUNHUPAY_APPID / XUNHUPAY_APPSECRET not configured");

  const nonce = Math.random().toString(36).slice(2, 10);
  const time  = String(Math.floor(Date.now() / 1000));

  const params: Record<string, string> = {
    appid:          appId,
    payment:        opts.payment,
    trade_order_id: opts.tradeId,
    total_fee:      opts.totalFee,
    title:          opts.title,
    time,
    notify_url:     opts.notifyUrl,
    return_url:     opts.returnUrl,
    nonce_str:      nonce,
  };

  params.hash = buildHash(params, appSecret);

  const res  = await fetch(API_URL, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify(params),
  });

  const data = await res.json() as {
    errcode: number;
    errmsg:  string;
    url?:    string;
    data?: { url?: string };
  };

  if (data.errcode !== 0) {
    throw new Error(`虎皮椒: ${data.errmsg} (code ${data.errcode})`);
  }

  // API returns url at top level or inside data
  const url = data.url ?? data.data?.url;
  if (!url) throw new Error("虎皮椒: no payment URL returned");
  return url;
}
