import { NextResponse } from "next/server";

/**
 * GET /api/topup/paddle-config
 *
 * Returns the Paddle **client-side** token (a publishable value, safe to expose)
 * and the sandbox flag, read from process.env at REQUEST time.
 *
 * Why this exists: `NEXT_PUBLIC_*` env vars are inlined into the client bundle at
 * BUILD time. When the Paddle token is added to (or changed in) Vercel after the
 * last build, the live bundle still carries the old/empty value, so the card
 * checkout shows "card payment unavailable" even though the var is set. Reading
 * it from a server route at runtime fixes this without requiring a rebuild.
 */
export const dynamic = "force-dynamic";

export function GET() {
  const token =
    process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN ??
    process.env.PADDLE_CLIENT_TOKEN ??
    "";
  const sandbox =
    process.env.NEXT_PUBLIC_PADDLE_SANDBOX === "true" ||
    process.env.PADDLE_SANDBOX === "true";

  return NextResponse.json({ token, sandbox });
}
