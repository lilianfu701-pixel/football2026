-- ============================================================
-- Award Bets Table — World Cup 2026 individual award predictions
-- Users can bet on multiple players per award (max 5 each)
-- Two phases: 'early' (before Jun 10) · 'live' (Jun 11–Jul 2)
-- ============================================================

create table if not exists public.award_bets (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  award_type       text not null check (award_type in (
                     'golden_boot', 'golden_ball', 'golden_glove', 'best_young'
                   )),
  player_id        integer not null,
  player_name      text not null,
  player_name_zh   text not null default '',
  country_code     text not null default '',
  gc_amount        bigint not null check (gc_amount > 0),
  odds_multiplier  numeric(6,2) not null default 3.00,
  bet_phase        text not null default 'early' check (bet_phase in ('early', 'live')),
  result           text not null default 'pending' check (result in ('pending', 'won', 'lost')),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  -- One record per user × award × player (additional bets increase gc_amount)
  unique (user_id, award_type, player_id)
);

-- Updated-at trigger
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger award_bets_updated_at
  before update on public.award_bets
  for each row execute function public.set_updated_at();

-- Row Level Security
alter table public.award_bets enable row level security;

create policy "Users can view own award bets"
  on public.award_bets for select
  using (auth.uid() = user_id);

create policy "Users can insert own award bets"
  on public.award_bets for insert
  with check (auth.uid() = user_id);

create policy "Users can update own award bets"
  on public.award_bets for update
  using (auth.uid() = user_id);

-- Index for fast per-user lookups
create index if not exists award_bets_user_idx on public.award_bets (user_id);
create index if not exists award_bets_award_idx on public.award_bets (award_type);
