-- Backfill birth_year for existing children that have age but no birth_year
UPDATE public.children
SET birth_year = date_part('year', now())::integer - age
WHERE birth_year IS NULL AND age IS NOT NULL AND age > 0;
