-- Add 'paused' to enrollment_status_enum to allow temporarily deactivating
-- enrollments that have payments (without losing payment history)
ALTER TYPE public.enrollment_status_enum ADD VALUE IF NOT EXISTS 'paused';
