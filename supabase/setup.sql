-- Giggles Pet: team leaderboard on Supabase
-- Run this once in your Supabase project: Dashboard -> SQL Editor -> New query -> paste -> Run.
--
-- Security model:
--   * The pets use the public "anon" key, so the tables are NOT exposed directly (RLS on, no policies).
--   * Pets can only call the two functions below, and only with a valid TEAM CODE.
--   * The team code is stored as a SHA-256 hash, never in plain text.

-- ---------- tables ----------
create table if not exists public.pet_teams (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  code_hash   text not null unique,          -- sha256(team code), hex
  created_at  timestamptz not null default now()
);

create table if not exists public.pet_members (
  team_id     uuid not null references public.pet_teams(id) on delete cascade,
  member_id   uuid not null,
  owner_name  text not null,
  pet_name    text,
  species     text,
  equipped    jsonb not null default '{}'::jsonb,
  badges      jsonb not null default '[]'::jsonb,
  day         date,
  today       integer not null default 0,
  total       integer not null default 0,
  updated_at  timestamptz not null default now(),
  primary key (team_id, member_id)
);

alter table public.pet_teams   enable row level security;
alter table public.pet_members enable row level security;
-- No policies on purpose: the anon/authenticated roles cannot read or write these tables directly.
revoke all on public.pet_teams, public.pet_members from anon, authenticated;

-- ---------- helpers ----------
create or replace function public.pet_team_id(p_code text)
returns uuid
language sql stable security definer
set search_path = public
as $$
  select id from public.pet_teams
  where code_hash = encode(sha256(convert_to(coalesce(p_code, ''), 'UTF8')), 'hex')
$$;

-- ---------- API used by the pets ----------
-- Insert or update this pet's row in the team.
create or replace function public.pet_publish(p_code text, p_member jsonb)
returns void
language plpgsql security definer
set search_path = public
as $$
declare
  t uuid := public.pet_team_id(p_code);
begin
  if t is null then
    raise exception 'invalid team code' using errcode = '28000';
  end if;
  insert into public.pet_members as m
    (team_id, member_id, owner_name, pet_name, species, equipped, badges, day, today, total, updated_at)
  values (
    t,
    (p_member->>'id')::uuid,
    left(coalesce(nullif(p_member->>'ownerName', ''), 'Anonymous'), 40),
    left(p_member->>'petName', 40),
    left(p_member->>'species', 20),
    coalesce(p_member->'equipped', '{}'::jsonb),
    coalesce(p_member->'badges', '[]'::jsonb),
    nullif(p_member->>'date', '')::date,
    greatest(0, least(100000,   coalesce((p_member->>'today')::int, 0))),
    greatest(0, least(10000000, coalesce((p_member->>'total')::int, 0))),
    now()
  )
  on conflict (team_id, member_id) do update set
    owner_name = excluded.owner_name,
    pet_name   = excluded.pet_name,
    species    = excluded.species,
    equipped   = excluded.equipped,
    badges     = excluded.badges,
    day        = excluded.day,
    today      = excluded.today,
    total      = excluded.total,
    updated_at = now();
end;
$$;

-- Everyone in the team who was active in the last 30 days.
create or replace function public.pet_board(p_code text)
returns table (
  member_id uuid, owner_name text, pet_name text, species text,
  equipped jsonb, badges jsonb, day date, today integer, total integer, updated_at timestamptz
)
language plpgsql stable security definer
set search_path = public
as $$
declare
  t uuid := public.pet_team_id(p_code);
begin
  if t is null then
    raise exception 'invalid team code' using errcode = '28000';
  end if;
  return query
    select m.member_id, m.owner_name, m.pet_name, m.species, m.equipped, m.badges, m.day, m.today, m.total, m.updated_at
    from public.pet_members m
    where m.team_id = t and m.updated_at > now() - interval '30 days'
    order by m.total desc
    limit 500;
end;
$$;

-- ---------- visits: fling your pet onto a teammate's screen ----------
create table if not exists public.pet_visits (
  id          bigint generated always as identity primary key,
  team_id     uuid not null references public.pet_teams(id) on delete cascade,
  from_member uuid not null,
  to_member   uuid not null,
  kind        text not null,                  -- 'visit' | 'return' | 'poke' | 'msg'
  payload     jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);
create index if not exists pet_visits_inbox on public.pet_visits (team_id, to_member);
alter table public.pet_visits enable row level security;
revoke all on public.pet_visits from anon, authenticated;

-- Send a message to a teammate's pet.
create or replace function public.pet_send(p_code text, p_from uuid, p_to uuid, p_kind text, p_payload jsonb)
returns void
language plpgsql security definer
set search_path = public
as $$
declare
  t uuid := public.pet_team_id(p_code);
begin
  if t is null then
    raise exception 'invalid team code' using errcode = '28000';
  end if;
  if p_kind not in ('visit', 'return', 'poke', 'msg') then
    raise exception 'unknown message kind';
  end if;
  if octet_length(coalesce(p_payload, '{}'::jsonb)::text) > 4000 then
    raise exception 'message too big';
  end if;
  if not exists (select 1 from public.pet_members where team_id = t and member_id = p_to) then
    raise exception 'unknown teammate';
  end if;
  if (select count(*) from public.pet_visits
      where team_id = t and from_member = p_from and created_at > now() - interval '1 minute') >= 20 then
    raise exception 'slow down';
  end if;
  insert into public.pet_visits (team_id, from_member, to_member, kind, payload)
  values (t, p_from, p_to, p_kind, coalesce(p_payload, '{}'::jsonb));
end;
$$;

-- Fetch (and remove) everything waiting for this pet.
create or replace function public.pet_inbox(p_code text, p_member uuid)
returns table (id bigint, from_member uuid, kind text, payload jsonb, created_at timestamptz)
language plpgsql security definer
set search_path = public
as $$
declare
  t uuid := public.pet_team_id(p_code);
begin
  if t is null then
    raise exception 'invalid team code' using errcode = '28000';
  end if;
  -- visits expire quickly; chat messages wait up to a day for an offline teammate
  delete from public.pet_visits v
  where v.team_id = t
    and ((v.kind <> 'msg' and v.created_at < now() - interval '10 minutes')
      or (v.kind = 'msg' and v.created_at < now() - interval '24 hours'));
  return query
    delete from public.pet_visits v
    where v.team_id = t and v.to_member = p_member
    returning v.id, v.from_member, v.kind, v.payload, v.created_at;
end;
$$;

-- Only the API functions are callable by the app.
revoke execute on function public.pet_team_id(text) from public, anon, authenticated;
revoke execute on function public.pet_publish(text, jsonb) from public;
revoke execute on function public.pet_board(text) from public;
revoke execute on function public.pet_send(text, uuid, uuid, text, jsonb) from public;
revoke execute on function public.pet_inbox(text, uuid) from public;
grant execute on function public.pet_publish(text, jsonb) to anon, authenticated;
grant execute on function public.pet_board(text) to anon, authenticated;
grant execute on function public.pet_send(text, uuid, uuid, text, jsonb) to anon, authenticated;
grant execute on function public.pet_inbox(text, uuid) to anon, authenticated;

-- ---------- create your team ----------
-- Pick a team code (long and hard to guess, e.g. cyborg-erp-7Hq2-pets-9xLm) and run:
--
--   insert into public.pet_teams (name, code_hash)
--   values ('Cyborg ERP', encode(sha256(convert_to('PUT-YOUR-TEAM-CODE-HERE', 'UTF8')), 'hex'));
--
-- Share that code with your developers. They enter it in the pet: Settings -> Team.
