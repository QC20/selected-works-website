-- Write-only analytics events — see src/components/os/analyticsApi.ts.
-- --------------------------------------------------------------------------
-- Run this ONCE in the Supabase dashboard: SQL Editor -> New query -> paste ->
-- Run. Until it exists every pageview and app_open 404s silently: nothing
-- visibly breaks, because `trackEvent` is fire-and-forget by design, but
-- nothing is counted either.
--
-- The schema lived only in a comment in analyticsApi.ts for a while, which is
-- how it came to be the one table that was never actually created. It has its
-- own file now, next to site_visits.sql and community_files.sql.
--
-- The important part is what is *absent*: there is no select policy. The anon
-- key shipped in the bundle can insert an event and can never read one back,
-- so the site can count visits without the counts being queryable by anyone
-- who views source. Read the numbers in the Supabase table editor while
-- signed in to the project instead.

create table if not exists analytics_events (
    id         bigint generated always as identity primary key,
    session_id text not null,
    event      text not null,
    target     text not null,
    created_at timestamptz not null default now()
);

alter table analytics_events enable row level security;

-- Insert only, and only the two event kinds the site actually sends. The
-- check constraint is the whole defence against the public key being used to
-- write arbitrary rows into the table.
drop policy if exists "public insert only" on analytics_events;
create policy "public insert only" on analytics_events for insert with check (
    event in ('pageview', 'app_open')
    and char_length(target) between 1 and 60
);

-- Every question worth asking of this table is "what happened recently".
create index if not exists analytics_events_created_at_idx
    on analytics_events (created_at desc);
