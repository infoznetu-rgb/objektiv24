drop policy if exists "Public can read published drafts" on public.drafts;
drop policy if exists "public can record site analytics" on public.site_events;
drop trigger if exists trg_objektiv24_push_on_publish on public.drafts;
