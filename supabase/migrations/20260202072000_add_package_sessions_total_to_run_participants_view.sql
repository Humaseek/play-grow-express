-- Add package_sessions_total to run_participants_view so UI can show (purchased vs remaining)
create or replace view public.run_participants_view as
select
  e.run_id,
  e.id as enrollment_id,
  e.child_id,
  cv.name as child_name,
  cv.age,
  cv.class,
  e.status as enrollment_status,
  cp.id as package_id,
  coalesce(cp.price_total, e.agreed_price, 0::numeric) as agreed_price,
  coalesce(pb.paid_amount, 0::numeric) as paid_amount,
  greatest(
    (coalesce(cp.price_total, e.agreed_price, 0::numeric) - coalesce(pb.paid_amount, 0::numeric)),
    0::numeric
  ) as balance,
  case
    when coalesce(cp.price_total, e.agreed_price, 0::numeric) = 0::numeric then 'free'::text
    when coalesce(pb.paid_amount, 0::numeric) >= coalesce(cp.price_total, e.agreed_price, 0::numeric) then 'paid'::text
    when coalesce(pb.paid_amount, 0::numeric) > 0::numeric then 'partial'::text
    else 'unpaid'::text
  end as payment_status,
  e.sessions_allocated,
  coalesce(att.present_in_run, 0) as sessions_attended_in_run,
  coalesce(pb.sessions_remaining, 0) as package_sessions_remaining,
  coalesce(pb.sessions_total, 0) as package_sessions_total
from public.enrollments e
join public.children_view cv on cv.id = e.child_id
left join public.course_packages cp on cp.id = e.package_id
left join public.package_balance_view pb on pb.package_id = cp.id
left join (
  select
    a.enrollment_id,
    (count(*) filter (where a.status = 'present'::public.attendance_status_enum))::integer as present_in_run
  from public.attendance a
  group by a.enrollment_id
) att on att.enrollment_id = e.id;
