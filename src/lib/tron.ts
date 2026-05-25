/**
 * TRON / TronGrid helpers — server-side only
 * Docs: https://developers.tron.network/reference/full-node-api-overview
 *
 * USDT TRC-20 contract addresses:
 *   Mainnet : TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t
 *   Nile testnet: TXYZopYRdj2D9XRtbG411XZZ3kM5VkAeBf  (set TRON_NETWORK=testnet)
 */

const IS_MAINNET = (process.env.TRON_NETWORK ?? "mainnet") === "mainnet";

const TRONGRID_BASE = IS_MAINNET
  ? "https://api.trongrid.io"
  : "https://nile.trongrid.io";

export const USDT_CONTRACT = process.env.USDT_TRC20_CONTRACT
  ?? (IS_MAINNET
    ? "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t"
    : "TXYZopYRdj2D9XRtbG411XZZ3kM5VkAeBf");

export const USDT_WALLET = process.env.USDT_TRC20_WALLET ?? "";

/** USDT TRC-20 has 6 decimal places */
const USDT_DECIMALS = 1_000_000;

function tronHeaders(): Record<string, string> {
  const h: Record<string, string> = {};
  if (process.env.TRONGRID_API_KEY) h["TRON-PRO-API-KEY"] = process.env.TRONGRID_API_KEY;
  return h;
}

/** Normalise address to lowercase for comparison (handles both base58 T... and 0x41... hex) */
function normaliseAddr(addr: string): string {
  return (addr ?? "").toLowerCase().trim();
}

export interface UsdtVerifyResult {
  valid:      boolean;
  actualUsdt: number;
  error?:     string;
}

/**
 * Verify a USDT TRC-20 payment by TxID.
 * Checks: tx confirmed + SUCCESS, USDT Transfer event to our wallet, amount >= required.
 */
export async function verifyUsdtPayment(
  txHash:       string,
  toAddress:    string,
  requiredUsdt: number
): Promise<UsdtVerifyResult> {
  if (!txHash || !/^[0-9a-fA-F]{64}$/.test(txHash)) {
    return { valid: false, actualUsdt: 0, error: "Invalid transaction hash format" };
  }

  const headers = tronHeaders();

  // ── 1. Fetch transaction — confirm it exists and succeeded ────────────────
  let txData: Record<string, unknown>;
  try {
    const r = await fetch(`${TRONGRID_BASE}/v1/transactions/${txHash}`, {
      headers,
      next: { revalidate: 0 },
    });
    if (!r.ok) return { valid: false, actualUsdt: 0, error: "Transaction not found" };
    txData = await r.json();
  } catch {
    return { valid: false, actualUsdt: 0, error: "TronGrid unreachable" };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const txArr = (txData as any).data as any[] | undefined;
  if (!txArr?.length) return { valid: false, actualUsdt: 0, error: "Transaction not found on chain" };
  const tx = txArr[0];

  const contractRet = tx?.ret?.[0]?.contractRet;
  if (contractRet !== "SUCCESS") {
    return {
      valid:      false,
      actualUsdt: 0,
      error:      contractRet === "REVERT" ? "Transaction was reverted" : "Transaction not confirmed yet",
    };
  }

  // ── 2. Fetch contract events — find USDT Transfer to our wallet ───────────
  let evData: Record<string, unknown>;
  try {
    const r = await fetch(`${TRONGRID_BASE}/v1/transactions/${txHash}/events`, {
      headers,
      next: { revalidate: 0 },
    });
    if (!r.ok) return { valid: false, actualUsdt: 0, error: "Failed to fetch transfer events" };
    evData = await r.json();
  } catch {
    return { valid: false, actualUsdt: 0, error: "TronGrid unreachable (events)" };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const events = (evData as any).data as any[] | undefined;
  if (!events?.length) {
    return { valid: false, actualUsdt: 0, error: "No TRC-20 transfer events found in this transaction" };
  }

  const targetAddr = normaliseAddr(toAddress);
  const usdtContract = normaliseAddr(USDT_CONTRACT);

  // Find a Transfer event from USDT contract destined to our wallet
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const transfer = events.find((e: any) => {
    const contract = normaliseAddr(e.contract_address ?? e.caller_contract_address ?? "");
    const evName   = (e.event_name ?? "").toLowerCase();
    const to       = normaliseAddr(e.result?.to ?? e.result?.["1"] ?? "");
    return contract === usdtContract && evName === "transfer" && to === targetAddr;
  });

  if (!transfer) {
    return {
      valid:      false,
      actualUsdt: 0,
      error:      `No USDT transfer to wallet ${toAddress} found in this transaction`,
    };
  }

  const rawValue  = BigInt(transfer.result?.value ?? transfer.result?.["2"] ?? "0");
  const actualUsdt = Number(rawValue) / USDT_DECIMALS;

  if (actualUsdt < requiredUsdt - 0.001) {  // 0.001 USDT tolerance for rounding
    return {
      valid:      false,
      actualUsdt,
      error:      `Insufficient: received ${actualUsdt.toFixed(2)} USDT, required ${requiredUsdt.toFixed(2)} USDT`,
    };
  }

  return { valid: true, actualUsdt };
}
