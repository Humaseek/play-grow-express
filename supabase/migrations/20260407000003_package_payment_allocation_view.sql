CREATE OR REPLACE VIEW public.package_payment_allocation_view AS
WITH pkg_ordered AS (
  SELECT
    cp.id            AS package_id,
    cp.child_id,
    cp.course_id,
    cp.sessions_total,
    cp.price_total,
    cp.status,
    cp.created_at,
    -- cumulative price of all packages BEFORE this one (for same child+course)
    COALESCE(SUM(cp.price_total) OVER (
      PARTITION BY cp.child_id, cp.course_id
      ORDER BY cp.created_at, cp.id
      ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING
    ), 0) AS cumulative_before
  FROM public.course_packages cp
  WHERE cp.status = 'active'
),
child_course_totals AS (
  -- total paid per child+course (pooled across all runs)
  SELECT
    e.child_id,
    cr.template_id AS course_id,
    SUM(p.amount)  AS total_paid
  FROM public.payments p
  JOIN public.enrollments e  ON e.id  = p.enrollment_id
  JOIN public.course_runs cr ON cr.id = e.run_id
  GROUP BY e.child_id, cr.template_id
)
SELECT
  pk.package_id,
  pk.child_id,
  pk.course_id,
  pk.sessions_total,
  pk.price_total,
  pk.status,
  pk.created_at,
  pk.cumulative_before,
  -- how much of total_paid falls inside this package's slice
  GREATEST(0,
    LEAST(
      pk.price_total,
      COALESCE(cct.total_paid, 0) - pk.cumulative_before
    )
  )::numeric AS paid_amount,
  -- remaining balance for this package
  (pk.price_total - GREATEST(0,
    LEAST(
      pk.price_total,
      COALESCE(cct.total_paid, 0) - pk.cumulative_before
    )
  ))::numeric AS remaining_amount
FROM pkg_ordered pk
LEFT JOIN child_course_totals cct
       ON cct.child_id = pk.child_id
      AND cct.course_id = pk.course_id;
