import fs from "node:fs";
import { randomUUID } from "node:crypto";

const env = {};
for (const line of fs.readFileSync(".env.local", "utf8").split(/\r?\n/)) {
  const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (match) env[match[1]] = match[2].trim();
}

const projectRef = "cxpzlpewoqtlduoizlix";
const accessToken = env.SUPABASE_ACCESS_TOKEN;
const dbUrl = `https://api.supabase.com/v1/projects/${projectRef}/database/query`;
const authUrl = `https://api.supabase.com/v1/projects/${projectRef}/config/auth`;
const mobileCallback = "https://m.football2026.net/auth/callback";

if (!accessToken) {
  throw new Error("Missing SUPABASE_ACCESS_TOKEN in .env.local");
}

async function request(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
  const text = await response.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!response.ok) {
    throw new Error(`${response.status} ${JSON.stringify(data)}`);
  }
  return data;
}

const sql = fs.readFileSync("supabase/migrations/042_fix_oauth_profile_trigger.sql", "utf8");
await request(dbUrl, {
  method: "POST",
  body: JSON.stringify({ query: sql }),
});

const authConfig = await request(authUrl);
const allowedCallbacks = String(authConfig.uri_allow_list || "")
  .split(",")
  .map((url) => url.trim())
  .filter(Boolean);

if (!allowedCallbacks.includes(mobileCallback)) {
  allowedCallbacks.push(mobileCallback);
  await request(authUrl, {
    method: "PATCH",
    body: JSON.stringify({ uri_allow_list: allowedCallbacks.join(",") }),
  });
}

const verifiedConfig = await request(authUrl);
const [triggerCheck] = await request(dbUrl, {
  method: "POST",
  body: JSON.stringify({
    query: `
      SELECT
        pg_get_functiondef('public.handle_new_user()'::regprocedure) AS definition,
        EXISTS (
          SELECT 1
          FROM pg_trigger
          WHERE tgrelid = 'auth.users'::regclass
            AND tgname = 'on_auth_user_created'
            AND NOT tgisinternal
        ) AS trigger_exists;
    `,
  }),
});
const definition = triggerCheck?.definition || "";
const writesRemovedUsername = /INSERT\s+INTO\s+public\.users\s*\([^)]*\busername\b/i.test(definition)
  || /WHERE\s+username\s*=/i.test(definition);
const smokeUserId = randomUUID();

await request(dbUrl, {
  method: "POST",
  body: JSON.stringify({
    query: `
      BEGIN;
      DO $test$
      DECLARE
        test_id UUID := '${smokeUserId}';
      BEGIN
        INSERT INTO auth.users (
          instance_id,
          id,
          aud,
          role,
          email,
          encrypted_password,
          email_confirmed_at,
          raw_app_meta_data,
          raw_user_meta_data,
          created_at,
          updated_at,
          confirmation_token,
          email_change,
          email_change_token_new,
          recovery_token
        ) VALUES (
          '00000000-0000-0000-0000-000000000000',
          test_id,
          'authenticated',
          'authenticated',
          'codex-trigger-check-${smokeUserId}@example.com',
          '',
          NOW(),
          '{"provider":"email","providers":["email"]}'::jsonb,
          '{"name":"Codex Trigger Check"}'::jsonb,
          NOW(),
          NOW(),
          '',
          '',
          '',
          ''
        );

        IF NOT EXISTS (
          SELECT 1
          FROM public.users
          WHERE id = test_id
            AND nickname = 'Codex Trigger Check'
            AND gc_balance = 100000
            AND gc_total = 100000
            AND wealth_level = 1
            AND honor_level = 1
        ) THEN
          RAISE EXCEPTION 'OAuth profile trigger smoke test failed';
        END IF;
      END;
      $test$;
      ROLLBACK;
    `,
  }),
});

console.log(JSON.stringify({
  migrationApplied: true,
  triggerExists: Boolean(triggerCheck?.trigger_exists),
  usesNickname: definition.includes("nickname"),
  writesRemovedUsername,
  rollbackSmokeTest: true,
  uriAllowList: verifiedConfig.uri_allow_list,
}, null, 2));
