-- Allow negative sessions remaining (over-attendance beyond purchased sessions)
-- Previously GREATEST(..., 0) clamped sessions_remaining to zero minimum

-- 1. Recreate run_participants_view without GREATEST on package_sessions_remaining
create or replace view "public"."run_participants_view" as
  SELECT e.run_id,
    e.id AS enrollment_id,
    e.child_id,
    cv.name AS child_name,
    cv.age,
    cv.class,
    e.status AS enrollment_status,
    e.package_id,
    COALESCE(( SELECT sum(course_packages.price_total) AS sum
           FROM public.course_packages
          WHERE ((course_packages.child_id = e.child_id) AND (course_packages.course_id = cr.template_id) AND (course_packages.status = 'active'::text))), e.agreed_price, (0)::numeric) AS agreed_price,
    COALESCE(( SELECT sum(payments.amount) AS sum
           FROM public.payments
          WHERE (payments.enrollment_id = e.id)), (0)::numeric) AS paid_amount,
    (COALESCE(( SELECT sum(course_packages.price_total) AS sum
           FROM public.course_packages
          WHERE ((course_packages.child_id = e.child_id) AND (course_packages.course_id = cr.template_id) AND (course_packages.status = 'active'::text))), e.agreed_price, (0)::numeric) - COALESCE(( SELECT sum(payments.amount) AS sum
           FROM public.payments
          WHERE (payments.enrollment_id = e.id)), (0)::numeric)) AS balance,
    CASE
        WHEN (COALESCE(( SELECT sum(course_packages.price_total) AS sum
           FROM public.course_packages
          WHERE ((course_packages.child_id = e.child_id) AND (course_packages.course_id = cr.template_id) AND (course_packages.status = 'active'::text))), e.agreed_price, (0)::numeric) = (0)::numeric) THEN 'free'::text
        WHEN (COALESCE(( SELECT sum(payments.amount) AS sum
           FROM public.payments
          WHERE (payments.enrollment_id = e.id)), (0)::numeric) >= COALESCE(( SELECT sum(course_packages.price_total) AS sum
           FROM public.course_packages
          WHERE ((course_packages.child_id = e.child_id) AND (course_packages.course_id = cr.template_id) AND (course_packages.status = 'active'::text))), e.agreed_price, (0)::numeric)) THEN 'paid'::text
        WHEN (COALESCE(( SELECT sum(payments.amount) AS sum
           FROM public.payments
          WHERE (payments.enrollment_id = e.id)), (0)::numeric) > (0)::numeric) THEN 'partial'::text
        ELSE 'unpaid'::text
    END AS payment_status,
    e.sessions_allocated,
    COALESCE(att.present_in_run, (0)::bigint) AS sessions_attended_in_run,
    (COALESCE((( SELECT sum(course_packages.sessions_total) AS sum
           FROM public.course_packages
          WHERE ((course_packages.child_id = e.child_id) AND (course_packages.course_id = cr.template_id) AND (course_packages.status = 'active'::text))))::numeric, (0)::numeric) - (COALESCE(att_total.total_attended, (0)::bigint))::numeric) AS package_sessions_remaining,
    COALESCE((( SELECT sum(course_packages.sessions_total) AS sum
           FROM public.course_packages
          WHERE ((course_packages.child_id = e.child_id) AND (course_packages.course_id = cr.template_id) AND (course_packages.status = 'active'::text))))::numeric, (0)::numeric) AS package_sessions_total
   FROM ((((public.enrollments e
     JOIN public.course_runs cr ON ((cr.id = e.run_id)))
     LEFT JOIN public.children_view cv ON ((cv.id = e.child_id)))
     LEFT JOIN ( SELECT attendance.enrollment_id,
            count(*) AS present_in_run
           FROM public.attendance
          WHERE (attendance.status = 'present'::public.attendance_status_enum)
          GROUP BY attendance.enrollment_id) att ON ((att.enrollment_id = e.id)))
     LEFT JOIN ( SELECT attendance.enrollment_id,
            count(*) AS total_attended
           FROM public.attendance
          WHERE (attendance.status = ANY (ARRAY['present'::public.attendance_status_enum, 'absent'::public.attendance_status_enum]))
          GROUP BY attendance.enrollment_id) att_total ON ((att_total.enrollment_id = e.id)));

-- 2. Recreate package_balance_view without GREATEST on sessions_remaining
create or replace view "public"."package_balance_view" as
  SELECT cp.id AS package_id,
    cp.course_id,
    cp.child_id,
    cp.sessions_total,
    cp.price_total,
    COALESCE(pay.paid_amount, (0)::numeric) AS paid_amount,
    (cp.price_total - COALESCE(pay.paid_amount, (0)::numeric)) AS balance_amount,
    COALESCE(used.sessions_used, 0) AS sessions_used,
    (cp.sessions_total - COALESCE(used.sessions_used, 0)) AS sessions_remaining
   FROM ((public.course_packages cp
     LEFT JOIN ( SELECT payments.package_id,
            (sum(payments.amount))::numeric(12,2) AS paid_amount
           FROM public.payments
          WHERE (payments.package_id IS NOT NULL)
          GROUP BY payments.package_id) pay ON ((pay.package_id = cp.id)))
     LEFT JOIN ( SELECT e.package_id,
            (count(*))::integer AS sessions_used
           FROM (public.attendance a
             JOIN public.enrollments e ON ((e.id = a.enrollment_id)))
          WHERE ((e.package_id IS NOT NULL) AND (a.status = ANY (ARRAY['present'::public.attendance_status_enum, 'absent'::public.attendance_status_enum])))
          GROUP BY e.package_id) used ON ((used.package_id = cp.id)));
