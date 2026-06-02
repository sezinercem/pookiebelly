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

create index if not exists pookie_love_taps_person_idx
on public.pookie_love_taps (person);

create index if not exists pookie_love_taps_created_at_idx
on public.pookie_love_taps (created_at desc);
