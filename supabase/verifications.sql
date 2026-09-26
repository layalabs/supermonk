-- Host verification results, keyed by anonymous device id (docs/VERIFICATION.md).
-- Deliberately flat and narrow: pass/fail, a masked phone and timestamps. No images,
-- names or document numbers ever go in here; the vendor keeps those under its own retention.
-- Apply after schema.sql. RLS off for the hackathon, service role key only on the server.
create table if not exists public.verifications (
  device_id           text primary key,
  tier1_phone_masked  text,
  tier1_verified_at   timestamptz,
  tier2_provider      text check (tier2_provider is null or tier2_provider in ('mock','didit')),
  tier2_session_id    text,
  tier2_status        text check (tier2_status is null or tier2_status in ('pending','verified','failed')),
  tier2_verified_at   timestamptz,
  consent_at          timestamptz,
  updated_at          timestamptz not null default now()
);

create unique index if not exists verifications_tier2_session_idx
  on public.verifications (tier2_session_id) where tier2_session_id is not null;
alter table public.verifications disable row level security;
