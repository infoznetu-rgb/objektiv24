alter table public.drafts
  add column if not exists correction_note text not null default '',
  add column if not exists corrected_at timestamptz;
