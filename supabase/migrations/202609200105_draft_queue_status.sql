-- Allow the automation to reserve a source as an editable Redakcia draft.
-- Applied to production on 2026-09-20.
alter table public.automation_source_items
  drop constraint if exists automation_source_items_status_check;

alter table public.automation_source_items
  add constraint automation_source_items_status_check
  check (status = any (array[
    'published'::text,
    'skipped'::text,
    'failed'::text,
    'rejected'::text,
    'drafted'::text,
    'processing'::text
  ]));
