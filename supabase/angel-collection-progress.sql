-- Account-synced Angel theme collectible progress.
-- Run once in the Supabase SQL editor.

create table if not exists public.angel_collection_progress (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  guardians bigint not null default 0 check (guardians >= 0),
  golden_feathers bigint not null default 0 check (golden_feathers >= 0),
  opal_feathers bigint not null default 0 check (opal_feathers >= 0),
  radiant_butterflies bigint not null default 0 check (radiant_butterflies >= 0),
  starlight_crystals bigint not null default 0 check (starlight_crystals >= 0),
  celestial_keys bigint not null default 0 check (celestial_keys >= 0),
  local_imported boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table public.angel_collection_progress enable row level security;

drop policy if exists "Users can read their Angel collection" on public.angel_collection_progress;
create policy "Users can read their Angel collection"
  on public.angel_collection_progress for select
  to authenticated
  using (auth.uid() = user_id);

grant select on public.angel_collection_progress to authenticated;
revoke insert, update, delete on public.angel_collection_progress from anon, authenticated;

create or replace function public.increment_angel_collectible(
  p_kind text,
  p_amount integer default 1
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  amount_to_add integer := least(greatest(coalesce(p_amount, 1), 1), 100);
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;
  if p_kind not in ('guardians', 'feathers', 'opals', 'butterflies', 'crystals', 'keys') then
    raise exception 'Invalid Angel collectible';
  end if;

  insert into public.angel_collection_progress (
    user_id, guardians, golden_feathers, opal_feathers,
    radiant_butterflies, starlight_crystals, celestial_keys
  ) values (
    current_user_id,
    case when p_kind = 'guardians' then amount_to_add else 0 end,
    case when p_kind = 'feathers' then amount_to_add else 0 end,
    case when p_kind = 'opals' then amount_to_add else 0 end,
    case when p_kind = 'butterflies' then amount_to_add else 0 end,
    case when p_kind = 'crystals' then amount_to_add else 0 end,
    case when p_kind = 'keys' then amount_to_add else 0 end
  )
  on conflict (user_id) do update set
    guardians = angel_collection_progress.guardians + case when p_kind = 'guardians' then amount_to_add else 0 end,
    golden_feathers = angel_collection_progress.golden_feathers + case when p_kind = 'feathers' then amount_to_add else 0 end,
    opal_feathers = angel_collection_progress.opal_feathers + case when p_kind = 'opals' then amount_to_add else 0 end,
    radiant_butterflies = angel_collection_progress.radiant_butterflies + case when p_kind = 'butterflies' then amount_to_add else 0 end,
    starlight_crystals = angel_collection_progress.starlight_crystals + case when p_kind = 'crystals' then amount_to_add else 0 end,
    celestial_keys = angel_collection_progress.celestial_keys + case when p_kind = 'keys' then amount_to_add else 0 end,
    updated_at = now();
end;
$$;

create or replace function public.import_angel_collection_progress(
  p_guardians integer,
  p_golden_feathers integer,
  p_opal_feathers integer,
  p_radiant_butterflies integer,
  p_starlight_crystals integer,
  p_celestial_keys integer
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;

  insert into public.angel_collection_progress (
    user_id, guardians, golden_feathers, opal_feathers,
    radiant_butterflies, starlight_crystals, celestial_keys, local_imported
  ) values (
    current_user_id,
    least(greatest(coalesce(p_guardians, 0), 0), 100000),
    least(greatest(coalesce(p_golden_feathers, 0), 0), 100000),
    least(greatest(coalesce(p_opal_feathers, 0), 0), 100000),
    least(greatest(coalesce(p_radiant_butterflies, 0), 0), 100000),
    least(greatest(coalesce(p_starlight_crystals, 0), 0), 100000),
    least(greatest(coalesce(p_celestial_keys, 0), 0), 100000),
    true
  )
  on conflict (user_id) do update set
    guardians = greatest(angel_collection_progress.guardians, excluded.guardians),
    golden_feathers = greatest(angel_collection_progress.golden_feathers, excluded.golden_feathers),
    opal_feathers = greatest(angel_collection_progress.opal_feathers, excluded.opal_feathers),
    radiant_butterflies = greatest(angel_collection_progress.radiant_butterflies, excluded.radiant_butterflies),
    starlight_crystals = greatest(angel_collection_progress.starlight_crystals, excluded.starlight_crystals),
    celestial_keys = greatest(angel_collection_progress.celestial_keys, excluded.celestial_keys),
    local_imported = true,
    updated_at = now()
  where not angel_collection_progress.local_imported;
end;
$$;

revoke all on function public.increment_angel_collectible(text, integer) from public, anon;
revoke all on function public.import_angel_collection_progress(integer, integer, integer, integer, integer, integer) from public, anon;
grant execute on function public.increment_angel_collectible(text, integer) to authenticated;
grant execute on function public.import_angel_collection_progress(integer, integer, integer, integer, integer, integer) to authenticated;
