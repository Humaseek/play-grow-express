-- Add age_at_enrollment to enrollments
alter table "public"."enrollments"
  add column if not exists "age_at_enrollment" integer;

-- Backfill existing enrollments using birth_year and created_at
UPDATE public.enrollments e
SET age_at_enrollment = (
  date_part('year', e.created_at) - ch.birth_year
)::integer
FROM public.children ch
WHERE ch.id = e.child_id
  AND ch.birth_year IS NOT NULL
  AND e.age_at_enrollment IS NULL;
