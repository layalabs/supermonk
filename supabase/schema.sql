-- SuperMonk invites. Temples, monks and services stay as JSON in the app.
-- Hackathon setup: RLS is off and only the server (service role key) talks to this table.
create table if not exists public.invites (
  code        text primary key,
  device_id   text not null,
  user_id     text,
  monk_id     text not null,
  service_id  text not null check (service_id in
                ('house_blessing','shop_blessing','memorial','vehicle_blessing','monk_chat','meditation')),
  date        date not null,
  slot        text not null check (slot in ('morning','afternoon','evening')),
  mode        text not null check (mode in ('monk_comes','you_go')),
  address     text,
  area        text,
  guests      integer check (guests is null or guests > 0),
  language    text not null check (language in ('en','th')),
  donation    integer not null check (donation >= 0),
  status      text not null default 'pending' check (status in ('pending','accepted','declined')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  note        text
);

create index if not exists invites_device_id_idx on public.invites (device_id, created_at desc);
alter table public.invites disable row level security;

-- P1: temple-side records created through LINE onboarding (whole record kept as jsonb).
create table if not exists public.line_profiles (
  line_user_id text primary key,
  record       jsonb not null,
  updated_at   timestamptz not null default now()
);
create table if not exists public.line_monks (
  id         text primary key,
  record     jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.line_profiles disable row level security;
alter table public.line_monks disable row level security;

-- P1: how an invite reached the temple side and who answered it.
alter table public.invites add column if not exists delivered_via text;
alter table public.invites add column if not exists responded_by text;
alter table public.invites add column if not exists responded_at timestamptz;

-- Invite modes (outreach + direct with host contact). "withdrawn" = another temple accepted the same request.
alter table public.invites add column if not exists host_contact jsonb;
alter table public.invites add column if not exists request_id text;
create index if not exists invites_request_id_idx on public.invites (request_id) where request_id is not null;
-- First acceptance wins across server instances: a second "accepted" in one request fails (23505).
create unique index if not exists invites_one_accept_per_request on public.invites (request_id) where status = 'accepted';
alter table public.invites drop constraint if exists invites_status_check;
alter table public.invites add constraint invites_status_check check (status in ('pending','accepted','declined','withdrawn'));
