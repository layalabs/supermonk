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
