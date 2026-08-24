-- A running visit count for the tray's hit counter — see visitorCountApi.ts.
-- --------------------------------------------------------------------------
-- Run this ONCE in the Supabase dashboard: SQL Editor -> New query -> paste ->
-- Run. Until it exists the tray counter falls back to a local, per-browser
-- guess instead of a real shared total (see visitorCountApi.ts).
--
-- This deliberately does not reuse `analytics_events`, which by design has no
-- select policy at all — the anon key can write events but nobody can read
-- them back through the API, on purpose (see analyticsApi.ts). A hit counter
-- needs a number back, so it gets its own single-row table plus a function
-- that increments and returns the new total in one step. The anon key is
-- granted execute on the *function*, never select on the *table* — visitors
-- can bump the count and see the total that comes back, but still can't query
-- the row directly, so this doesn't reopen the thing analytics_events was
-- built to avoid.

create table if not exists site_visits (
    id    smallint primary key default 1,
    count bigint not null default 0,
    constraint site_visits_single_row check (id = 1)
);

insert into site_visits (id, count) values (1, 0)
    on conflict (id) do nothing;

-- Row Level Security is on with no policies at all: nothing can select,
-- insert, update or delete this table directly, from any key. The only door
-- in is the function below, called as an RPC.
alter table site_visits enable row level security;

create or replace function increment_site_visits()
returns bigint
language sql
security definer
set search_path = public
as $$
    update site_visits set count = count + 1 where id = 1
    returning count;
$$;

revoke all on function increment_site_visits() from public;
grant execute on function increment_site_visits() to anon;
