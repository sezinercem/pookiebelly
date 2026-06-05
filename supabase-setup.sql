create table if not exists public.pookie_love_taps (
  id uuid primary key default gen_random_uuid(),
  person text not null check (person in ('person_one', 'person_two')),
  label text,
  created_at timestamptz not null default now()
);

alter table public.pookie_love_taps enable row level security;

drop policy if exists "Pookie taps can be read" on public.pookie_love_taps;
create policy "Pookie taps can be read"
on public.pookie_love_taps
for select
to anon
using (true);

drop policy if exists "Pookie taps can be added" on public.pookie_love_taps;
create policy "Pookie taps can be added"
on public.pookie_love_taps
for insert
to anon
with check (person in ('person_one', 'person_two'));

drop policy if exists "Pookie taps can be reset" on public.pookie_love_taps;
create policy "Pookie taps can be reset"
on public.pookie_love_taps
for delete
to anon
using (person in ('person_one', 'person_two'));

create index if not exists pookie_love_taps_person_idx
on public.pookie_love_taps (person);

create index if not exists pookie_love_taps_created_at_idx
on public.pookie_love_taps (created_at desc);

create table if not exists public.pookie_messages (
  id uuid primary key default gen_random_uuid(),
  from_name text not null check (from_name in ('Cem', 'Daisy')),
  to_name text not null check (to_name in ('Cem', 'Daisy')),
  body text not null check (char_length(body) <= 300),
  created_at timestamptz not null default now()
);

alter table public.pookie_messages enable row level security;

drop policy if exists "Pookie messages can be read" on public.pookie_messages;
create policy "Pookie messages can be read"
on public.pookie_messages
for select
to anon
using (true);

drop policy if exists "Pookie messages can be added" on public.pookie_messages;
create policy "Pookie messages can be added"
on public.pookie_messages
for insert
to anon
with check (
  from_name in ('Cem', 'Daisy')
  and to_name in ('Cem', 'Daisy')
  and char_length(body) <= 300
);

create index if not exists pookie_messages_created_at_idx
on public.pookie_messages (created_at desc);
