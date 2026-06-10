import { NextResponse } from "next/server";

/**
 * GET /api/topup/paddle-config
 *
 * Returns the Paddle **client-side** token (a publishable value, safe to expose)
 * and the sandbox flag, read at REQUEST time from the environment Vercel injects.
 *
 * ⚠️ Why the keys are read via a COMPUTED string and not `process.env.NEXT_PUBLIC_…`:
 * Next.js statically replaces every `process.env.NEXT_PUBLIC_X` *dot access* with
 * the value captured at BUILD time. If the var wasn't in the build environment,
 * that literal is "" forever — even in a "runtime" route handler. Building the key
 * at runtime (`["NEXT","PUBLIC",…].join("_")`) defeats that inlining, so we read
 * the live value Vercel puts in `process.env` for this deployment's environment.
 * That means a token added/changed in the Vercel dashboard shows up here.
 */
export const dynamic = "force-dynamic";

export function GET() {
  const env = process.env;

  const tokenKey   = ["NEXT", "PUBLIC", "PADDLE", "CLIENT", "TOKEN"].join("_");
  const sandboxKey = ["NEXT", "PUBLIC", "PADDLE", "SANDBOX"].join("_");

  // Non-public fallbacks (PADDLE_CLIENT_TOKEN / PADDLE_SANDBOX) are plain server
  // vars that Next.js never inlines, so they are always read at runtime.
  const token   = env[tokenKey] || env.PADDLE_CLIENT_TOKEN || "";
  const sandbox = env[sandboxKey] === "true" || env.PADDLE_SANDBOX === "true";

  return NextResponse.json(
    {
      token,
      sandbox,
      // Diagnostic only — no secret is leaked. `vercelEnv` confirms we are hitting
      // the Production deployment; `paddleKeys` lists which PADDLE-named variables
      // actually exist in this deployment's runtime env (names only). This tells
      // "value is empty" apart from "the variable isn't in this environment".
      debug: {
        vercelEnv: env.VERCEL_ENV ?? null,
        paddleKeys: Object.keys(env).filter((k) => /PADDLE/i.test(k)).sort(),
      },
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
