-- SK WEDDING FILMS: database and storage rules
-- Paste this whole file into Supabase > SQL Editor and press Run (once).
-- Only the owner email below can add, change or delete anything.
-- Everyone else can only view the website content.

-- 1. The list of photos, films and reels added from the admin page
create table if not exists public.media_items (
  id          uuid primary key default gen_random_uuid(),
  kind        text not null check (kind in ('photo', 'film', 'reel', 'school')),
  type        text not null check (type in ('image', 'file', 'youtube', 'instagram')),
  url         text,
  ext_id      text,
  poster_url  text,
  path        text,
  poster_path text,
  title       text,
  caption     text,
  category    text,
  width       integer,
  height      integer,
  sort_order  bigint not null default 0,
  created_at  timestamptz not null default now()
);

alter table public.media_items enable row level security;

drop policy if exists "anyone can view" on public.media_items;
create policy "anyone can view" on public.media_items
  for select using (true);

drop policy if exists "owner can add" on public.media_items;
create policy "owner can add" on public.media_items
  for insert to authenticated
  with check ((auth.jwt() ->> 'email') = 'satish.ok65@gmail.com');

drop policy if exists "owner can edit" on public.media_items;
create policy "owner can edit" on public.media_items
  for update to authenticated
  using ((auth.jwt() ->> 'email') = 'satish.ok65@gmail.com')
  with check ((auth.jwt() ->> 'email') = 'satish.ok65@gmail.com');

drop policy if exists "owner can delete" on public.media_items;
create policy "owner can delete" on public.media_items
  for delete to authenticated
  using ((auth.jwt() ->> 'email') = 'satish.ok65@gmail.com');

-- 2. The storage folder for uploaded photos and videos
insert into storage.buckets (id, name, public)
values ('portfolio', 'portfolio', true)
on conflict (id) do update set public = true;

drop policy if exists "anyone can view files" on storage.objects;
create policy "anyone can view files" on storage.objects
  for select using (bucket_id = 'portfolio');

drop policy if exists "owner can upload files" on storage.objects;
create policy "owner can upload files" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'portfolio' and (auth.jwt() ->> 'email') = 'satish.ok65@gmail.com');

drop policy if exists "owner can replace files" on storage.objects;
create policy "owner can replace files" on storage.objects
  for update to authenticated
  using (bucket_id = 'portfolio' and (auth.jwt() ->> 'email') = 'satish.ok65@gmail.com');

drop policy if exists "owner can remove files" on storage.objects;
create policy "owner can remove files" on storage.objects
  for delete to authenticated
  using (bucket_id = 'portfolio' and (auth.jwt() ->> 'email') = 'satish.ok65@gmail.com');
