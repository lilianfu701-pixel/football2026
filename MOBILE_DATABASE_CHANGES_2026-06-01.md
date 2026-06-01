# Mobile Authentication Database Changes - 2026-06-01

## Reported issue

Google OAuth signup from the mobile site returned:

`Database error saving new user`

The failed callback then landed on the desktop domain.

## Backups

Before changing the server configuration, snapshots were saved under:

`.codex-backups/supabase-auth-trigger-2026-06-01T06-10-53-069Z/`

The snapshot contains:

- `handle_new_user-before.json`
- `auth-config-before.json`

## Database migration

File:

`supabase/migrations/042_fix_oauth_profile_trigger.sql`

Scope:

- Replaces `public.handle_new_user()`.
- Recreates the `on_auth_user_created` trigger on `auth.users`.
- Writes the current `public.users.nickname` field instead of the removed `username` field.
- Writes numeric values for `wealth_level` and `honor_level`.
- Generates the required unique six-character referral code for each new profile.
- Preserves the 100,000 GC welcome balance and initializes `gc_total`.
- Does not update or delete any existing user rows.

## Authentication configuration

Added this permitted OAuth callback URL:

`https://m.football2026.net/auth/callback`

This keeps mobile Google login callbacks on the mobile domain.

## Verification

After applying the migration:

- Confirmed that `on_auth_user_created` exists on `auth.users`.
- Confirmed that the trigger writes `nickname` and does not write the removed `username` field.
- Ran a transaction-wrapped new-user smoke test with a generated account.
- Confirmed that the generated profile had a nickname, 100,000 GC balance, 100,000 GC total, numeric levels, and a referral code.
- Rolled the smoke-test transaction back so no test account or profile remained.
- Confirmed that the mobile callback URL is present in the Auth allowlist.
