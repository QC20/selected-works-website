-- Shared file gallery for the Windows 95 desktop.
-- ------------------------------------------------
-- Run this ONCE in the Supabase dashboard: SQL Editor -> New query -> paste ->
-- Run. Until it exists the desktop still works; saved files just stay in the
-- visitor's own browser instead of being shared (see communityFiles.ts).
--
-- Paintings are stored as a base64 data: URL, notes as plain text. Both go in
-- the same table because they behave identically from the app's point of view;
-- `kind` is what separates My Documents\Paintings from My Documents\Notes.

create table if not exists community_files (
    id          bigint generated always as identity primary key,
    kind        text not null check (kind in ('painting', 'note')),
    name        text not null,
    author      text not null default 'Anonymous',
    -- painting: "data:image/png;base64,…"   note: the text of the file
    content     text not null,
    created_at  timestamptz not null default now()
);

alter table community_files enable row level security;

-- Anyone may read the gallery: that is the entire point of it.
drop policy if exists "public read" on community_files;
create policy "public read"
    on community_files for select
    using (true);

-- Anyone may add to it, within limits. The size ceiling is the important one:
-- 700000 characters of base64 is roughly a 500KB image, which is a generous
-- Paint canvas and still leaves the free tier's 500MB good for ~1000 files.
drop policy if exists "public write" on community_files;
create policy "public write"
    on community_files for insert
    with check (
        kind in ('painting', 'note')
        and char_length(name) between 1 and 80
        and char_length(author) between 1 and 40
        and char_length(content) between 1 and 700000
    );

-- No update and no delete policy on purpose: with RLS on and no policy, those
-- are denied for the anon key. Visitors can add to the gallery and read it;
-- only the dashboard (or the service-role key) can remove anything.

create index if not exists community_files_kind_created_idx
    on community_files (kind, created_at desc);
