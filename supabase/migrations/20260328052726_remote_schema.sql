drop view if exists "public"."run_participants_view";

drop index if exists "public"."ux_course_packages_active";

create or replace view "public"."run_participants_view" as  SELECT e.run_id,
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
    GREATEST((COALESCE(( SELECT sum(course_packages.price_total) AS sum
           FROM public.course_packages
          WHERE ((course_packages.child_id = e.child_id) AND (course_packages.course_id = cr.template_id) AND (course_packages.status = 'active'::text))), e.agreed_price, (0)::numeric) - COALESCE(( SELECT sum(payments.amount) AS sum
           FROM public.payments
          WHERE (payments.enrollment_id = e.id)), (0)::numeric)), (0)::numeric) AS balance,
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
    GREATEST((COALESCE((( SELECT sum(course_packages.sessions_total) AS sum
           FROM public.course_packages
          WHERE ((course_packages.child_id = e.child_id) AND (course_packages.course_id = cr.template_id) AND (course_packages.status = 'active'::text))))::numeric, (0)::numeric) - (COALESCE(att_total.total_attended, (0)::bigint))::numeric), (0)::numeric) AS package_sessions_remaining,
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



