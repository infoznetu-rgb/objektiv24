-- Objektív24: verejne zobrazovať iba vydané články z Redakcie
-- Spustite raz v Supabase > SQL Editor.

alter table public.drafts enable row level security;

drop policy if exists "Public can read published drafts" on public.drafts;

create policy "Public can read published drafts"
on public.drafts
for select
to anon
using (state = 'published');
