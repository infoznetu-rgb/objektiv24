alter table public.push_subscriptions
  add column if not exists editor_alerts boolean not null default false;

create index if not exists push_subscriptions_editor_alerts_idx
  on public.push_subscriptions(editor_alerts)
  where editor_alerts = true;
