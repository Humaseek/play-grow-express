-- Add item column to expenses_details_view
drop view if exists "public"."expenses_details_view";
create view "public"."expenses_details_view" as  SELECT e.id,
    e.spent_on,
    e.amount,
    e.category,
    e.item,
    e.description,
    e.created_at,
    e.updated_at,
    e.party,
    e.run_id,
    cr.template_id AS course_id,
    cr.title AS course_title,
    cr.kind AS course_kind,
    cr.label AS run_label,
    cr.status AS run_status
   FROM (public.expenses e
     LEFT JOIN public.course_runs_summary_view cr ON ((cr.run_id = e.run_id)));
