drop extension if exists "pg_net";

create sequence "public"."child_classes_id_seq";

create sequence "public"."expense_categories_id_seq";

create sequence "public"."expense_parties_id_seq";

alter table "public"."payments" drop constraint "payments_enrollment_id_fkey";

drop view if exists "public"."course_participants_view";

drop view if exists "public"."enrollments_finance_view";

drop view if exists "public"."payments_details_view";

drop view if exists "public"."payments_view";

drop view if exists "public"."run_participants_view";

drop view if exists "public"."children_view";


  create table "public"."child_classes" (
    "id" bigint not null default nextval('public.child_classes_id_seq'::regclass),
    "name" text not null,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."child_classes" enable row level security;


  create table "public"."expense_categories" (
    "id" bigint not null default nextval('public.expense_categories_id_seq'::regclass),
    "name" text not null,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."expense_categories" enable row level security;


  create table "public"."expense_parties" (
    "id" bigint not null default nextval('public.expense_parties_id_seq'::regclass),
    "name" text not null,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."expense_parties" enable row level security;

alter table "public"."children" drop column "birth_date";

alter table "public"."children" add column "age" integer not null default 0;

alter table "public"."course_runs" add column "default_sessions_total" integer not null default 0;

alter table "public"."expenses" add column "party" text;

alter table "public"."expenses" add column "run_id" bigint;

alter sequence "public"."child_classes_id_seq" owned by "public"."child_classes"."id";

alter sequence "public"."expense_categories_id_seq" owned by "public"."expense_categories"."id";

alter sequence "public"."expense_parties_id_seq" owned by "public"."expense_parties"."id";

CREATE UNIQUE INDEX child_classes_name_key ON public.child_classes USING btree (name);

CREATE UNIQUE INDEX child_classes_pkey ON public.child_classes USING btree (id);

CREATE UNIQUE INDEX expense_categories_name_key ON public.expense_categories USING btree (name);

CREATE UNIQUE INDEX expense_categories_pkey ON public.expense_categories USING btree (id);

CREATE UNIQUE INDEX expense_parties_name_key ON public.expense_parties USING btree (name);

CREATE UNIQUE INDEX expense_parties_pkey ON public.expense_parties USING btree (id);

CREATE INDEX expenses_run_id_idx ON public.expenses USING btree (run_id);

CREATE INDEX expenses_run_id_spent_on_idx ON public.expenses USING btree (run_id, spent_on DESC);

CREATE INDEX idx_expense_categories_name ON public.expense_categories USING btree (name);

CREATE INDEX idx_expense_parties_name ON public.expense_parties USING btree (name);

CREATE INDEX idx_expenses_party ON public.expenses USING btree (party);

alter table "public"."child_classes" add constraint "child_classes_pkey" PRIMARY KEY using index "child_classes_pkey";

alter table "public"."expense_categories" add constraint "expense_categories_pkey" PRIMARY KEY using index "expense_categories_pkey";

alter table "public"."expense_parties" add constraint "expense_parties_pkey" PRIMARY KEY using index "expense_parties_pkey";

alter table "public"."child_classes" add constraint "child_classes_name_key" UNIQUE using index "child_classes_name_key";

alter table "public"."children" add constraint "children_age_check" CHECK (((age >= 0) AND (age <= 120))) not valid;

alter table "public"."children" validate constraint "children_age_check";

alter table "public"."expense_categories" add constraint "expense_categories_name_key" UNIQUE using index "expense_categories_name_key";

alter table "public"."expense_parties" add constraint "expense_parties_name_key" UNIQUE using index "expense_parties_name_key";

alter table "public"."expenses" add constraint "expenses_run_id_fkey" FOREIGN KEY (run_id) REFERENCES public.course_runs(id) ON DELETE SET NULL not valid;

alter table "public"."expenses" validate constraint "expenses_run_id_fkey";

alter table "public"."payments" add constraint "payments_enrollment_id_fkey" FOREIGN KEY (enrollment_id) REFERENCES public.enrollments(id) ON DELETE RESTRICT not valid;

alter table "public"."payments" validate constraint "payments_enrollment_id_fkey";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.prevent_withdraw_enrollment_if_payments()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  if tg_op = 'UPDATE'
     and new.status = 'withdrawn'
     and old.status is distinct from 'withdrawn'
  then
    if exists (
      select 1
      from public.payments p
      where p.enrollment_id = new.id
      limit 1
    ) then
      raise exception 'cannot withdraw enrollment with payments';
    end if;
  end if;

  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.adjust_enrollment_allocated_sessions(p_enrollment_id bigint, p_new_allocated integer)
 RETURNS TABLE(enrollment_id bigint, old_allocated integer, new_allocated integer, attended_in_run integer, package_remaining integer, run_future_sessions integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_old int;
  v_attended int;
  v_pkg_id bigint;
  v_pkg_remaining int;
  v_run_id bigint;
  v_run_future int;
  v_run_total int;
  v_max_allowed int;
begin
  if p_new_allocated is null or p_new_allocated < 0 then
    raise exception 'p_new_allocated must be >= 0';
  end if;

  select e.sessions_allocated, e.package_id, e.run_id
  into v_old, v_pkg_id, v_run_id
  from public.enrollments e
  where e.id = p_enrollment_id;

  if v_run_id is null then
    raise exception 'enrollment not found';
  end if;

  -- consumed in this run = present + absent (excused excluded)
  select count(*)::int
  into v_attended
  from public.attendance a
  join public.course_sessions s on s.id = a.session_id
  where a.enrollment_id = p_enrollment_id
    and a.status in ('present'::public.attendance_status_enum, 'absent'::public.attendance_status_enum)
    and s.run_id = v_run_id;

  v_attended := coalesce(v_attended, 0);

  if p_new_allocated < v_attended then
    raise exception 'cannot set allocated below consumed (%).', v_attended;
  end if;

  -- keep for return
  v_run_future := public.get_run_future_sessions_count(v_run_id);
  v_run_future := coalesce(v_run_future, 0);

  if v_pkg_id is not null then
    -- package remaining (based on package_balance_view)
    select pb.sessions_remaining
    into v_pkg_remaining
    from public.package_balance_view pb
    where pb.package_id = v_pkg_id
    limit 1;

    v_pkg_remaining := coalesce(v_pkg_remaining, 0);

    -- ✅ NEW: do NOT limit by run sessions count
    v_max_allowed := v_attended + v_pkg_remaining;
  else
    -- no package: cap by how many sessions exist in the run
    select count(*)::int
    into v_run_total
    from public.course_sessions s
    where s.run_id = v_run_id
      and s.status in ('scheduled'::public.session_status_enum, 'done'::public.session_status_enum);

    v_run_total := coalesce(v_run_total, 0);
    v_pkg_remaining := 0;
    v_max_allowed := v_run_total;
  end if;

  if p_new_allocated > v_max_allowed then
    raise exception 'new allocated (%) exceeds max allowed (%)', p_new_allocated, v_max_allowed;
  end if;

  update public.enrollments
  set sessions_allocated = p_new_allocated
  where id = p_enrollment_id;

  enrollment_id := p_enrollment_id;
  old_allocated := v_old;
  new_allocated := p_new_allocated;
  attended_in_run := v_attended;
  package_remaining := coalesce(v_pkg_remaining, 0);
  run_future_sessions := v_run_future;
  return next;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.adjust_enrollment_sessions_and_price(p_enrollment_id bigint, p_delta_sessions integer)
 RETURNS TABLE(new_sessions integer, new_agreed_price numeric, unit_price numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_old_sessions integer;
  v_old_price numeric;
  v_package_id bigint;
  v_unit numeric;
  v_attended integer := 0;
  v_new_sessions integer;
begin
  -- اقرأ enrollment الحالي
  select e.package_id,
         coalesce(e.sessions_allocated, 0),
         coalesce(e.agreed_price, 0)
    into v_package_id, v_old_sessions, v_old_price
  from public.enrollments e
  where e.id = p_enrollment_id;

  if not found then
    raise exception 'enrollment not found: %', p_enrollment_id;
  end if;

  -- سعر الحصة
  v_unit := null;

  if v_package_id is not null and to_regclass('public.course_packages') is not null then
    select nullif(cp.unit_price, 0)
      into v_unit
    from public.course_packages cp
    where cp.id = v_package_id;
  end if;

  if v_unit is null then
    if v_old_sessions > 0 then
      v_unit := round((v_old_price / v_old_sessions)::numeric, 2);
    else
      v_unit := 0;
    end if;
  end if;

  -- حماية: لا تنقص أقل من المستهلك (present + absent)
  if to_regclass('public.attendance') is not null then
    execute
      'select count(*) from public.attendance
       where enrollment_id = $1
         and status in (''present'',''absent'')'
      into v_attended
      using p_enrollment_id;
  end if;

  v_new_sessions := v_old_sessions + coalesce(p_delta_sessions, 0);

  if v_new_sessions < 0 then
    raise exception 'sessions cannot be negative';
  end if;

  if v_new_sessions < coalesce(v_attended, 0) then
    raise exception 'cannot set sessions below consumed (%)', v_attended;
  end if;

  update public.enrollments
  set sessions_allocated = v_new_sessions,
      agreed_price = round((v_new_sessions * v_unit)::numeric, 2),
      updated_at = now()
  where id = p_enrollment_id;

  if v_package_id is not null then
    update public.course_packages
    set sessions_total = v_new_sessions,
        unit_price = v_unit,
        price_total = round((v_new_sessions * v_unit)::numeric, 2),
        updated_at = now()
    where id = v_package_id;
  end if;

  return query
  select v_new_sessions,
         round((v_new_sessions * v_unit)::numeric, 2),
         v_unit;
end;
$function$
;

create or replace view "public"."children_view" as  SELECT ch.id,
    ch.name,
    ch.age,
    ch.class,
    ch.gender,
    ch.country_id,
    ch.mother_name,
    ch.mother_phone,
    ch.father_name,
    ch.father_phone,
    ch.notes,
    ch.created_at,
    ch.updated_at,
    co.name AS country
   FROM (public.children ch
     LEFT JOIN public.countries co ON ((co.id = ch.country_id)));


create or replace view "public"."course_participants_view" as  SELECT e.course_id,
    e.id AS enrollment_id,
    ch.id AS child_id,
    ch.name AS child_name,
    ch.age,
    ch.class,
    ch.gender,
    COALESCE(ct.name, ''::text) AS country,
    ch.mother_name,
    ch.mother_phone,
    ch.father_name,
    ch.father_phone,
    f.agreed_price,
    f.paid_amount,
    f.balance,
        CASE
            WHEN (f.agreed_price = (0)::numeric) THEN 'free'::text
            WHEN (f.balance <= (0)::numeric) THEN 'paid'::text
            WHEN (f.paid_amount > (0)::numeric) THEN 'partial'::text
            ELSE 'unpaid'::text
        END AS payment_status,
    e.status AS enrollment_status,
    e.created_at AS enrolled_at
   FROM (((public.enrollments e
     JOIN public.children ch ON ((ch.id = e.child_id)))
     LEFT JOIN public.countries ct ON ((ct.id = ch.country_id)))
     JOIN public.enrollment_financials_view f ON ((f.enrollment_id = e.id)));


create or replace view "public"."course_runs_summary_view" as  SELECT r.id AS run_id,
    r.template_id,
    r.label,
    r.status,
    r.created_at,
    t.title,
    t.kind,
    t.capacity,
    t.default_price,
    ( SELECT count(*) AS count
           FROM public.course_sessions s
          WHERE (s.run_id = r.id)) AS sessions_count,
    ( SELECT count(*) AS count
           FROM public.enrollments e
          WHERE ((e.run_id = r.id) AND (e.status = 'active'::public.enrollment_status_enum))) AS participants_count,
    ( SELECT min(s.start_at) AS min
           FROM public.course_sessions s
          WHERE ((s.run_id = r.id) AND (s.status = 'scheduled'::public.session_status_enum) AND (s.start_at >= now()))) AS next_session_at,
    r.default_sessions_total
   FROM (public.course_runs r
     JOIN public.courses t ON ((t.id = r.template_id)));


create or replace view "public"."enrollments_finance_view" as  SELECT e.id AS enrollment_id,
    e.child_id,
    ch.name AS child_name,
    e.run_id,
    rs.template_id AS course_id,
    rs.title AS course_title,
    rs.label AS run_label,
    e.status AS enrollment_status,
    (COALESCE(e.agreed_price, (0)::numeric))::numeric(12,2) AS agreed_price,
    (COALESCE(sum(p.amount), (0)::numeric))::numeric(12,2) AS paid_amount,
    ((COALESCE(e.agreed_price, (0)::numeric) - COALESCE(sum(p.amount), (0)::numeric)))::numeric(12,2) AS balance
   FROM (((public.enrollments e
     JOIN public.children ch ON ((ch.id = e.child_id)))
     LEFT JOIN public.course_runs_summary_view rs ON ((rs.run_id = e.run_id)))
     LEFT JOIN public.payments p ON ((p.enrollment_id = e.id)))
  GROUP BY e.id, e.child_id, ch.name, e.run_id, rs.template_id, rs.title, rs.label, e.status, e.agreed_price;


CREATE OR REPLACE FUNCTION public.generate_weekly_sessions_for_run(p_run_id bigint, p_first_start timestamp with time zone, p_duration_minutes integer, p_count integer, p_interval_days integer DEFAULT 7)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
declare
  i int;
  start_ts timestamptz;
  end_ts timestamptz;
begin
  if p_count <= 0 then
    raise exception 'p_count must be > 0';
  end if;

  -- ✅ خزّن عدد الحصص الافتراضي للـ Run (إذا لسه 0)
  update public.course_runs
  set default_sessions_total = p_count
  where id = p_run_id
    and coalesce(default_sessions_total, 0) = 0;

  start_ts := p_first_start;

  for i in 1..p_count loop
    end_ts := start_ts + make_interval(mins => p_duration_minutes);

    insert into public.course_sessions (run_id, start_at, end_at, status, course_id)
    values (
      p_run_id,
      start_ts,
      end_ts,
      'scheduled',
      (select template_id from public.course_runs where id = p_run_id)
    )
    on conflict do nothing;

    start_ts := start_ts + make_interval(days => p_interval_days);
  end loop;
end;
$function$
;

create or replace view "public"."package_balance_view" as  SELECT cp.id AS package_id,
    cp.course_id,
    cp.child_id,
    cp.sessions_total,
    cp.price_total,
    COALESCE(pay.paid_amount, (0)::numeric) AS paid_amount,
    GREATEST((cp.price_total - COALESCE(pay.paid_amount, (0)::numeric)), (0)::numeric) AS balance_amount,
    COALESCE(used.sessions_used, 0) AS sessions_used,
    GREATEST((cp.sessions_total - COALESCE(used.sessions_used, 0)), 0) AS sessions_remaining
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


create or replace view "public"."payments_details_view" as  SELECT p.id,
    p.enrollment_id,
    p.package_id,
    p.session_id,
    p.amount,
    p.method,
    p.paid_at,
    p.note,
    p.created_at,
    e.run_id,
    e.child_id,
    ch.name AS child_name,
    rs.template_id AS course_id,
    rs.title AS course_title,
    rs.kind AS course_kind,
    rs.label AS run_label,
    s.start_at AS session_start_at,
    s.end_at AS session_end_at,
    s.status AS session_status
   FROM ((((public.payments p
     JOIN public.enrollments e ON ((e.id = p.enrollment_id)))
     JOIN public.children ch ON ((ch.id = e.child_id)))
     LEFT JOIN public.course_runs_summary_view rs ON ((rs.run_id = e.run_id)))
     LEFT JOIN public.course_sessions s ON ((s.id = p.session_id)));


create or replace view "public"."payments_view" as  SELECT p.id,
    p.enrollment_id,
    p.amount,
    p.method,
    p.paid_at,
    p.note,
    p.created_at,
    e.run_id,
    e.child_id,
    ch.name AS child_name
   FROM ((public.payments p
     JOIN public.enrollments e ON ((e.id = p.enrollment_id)))
     JOIN public.children ch ON ((ch.id = e.child_id)));


create or replace view "public"."run_participants_view" as  SELECT e.run_id,
    e.id AS enrollment_id,
    e.child_id,
    cv.name AS child_name,
    cv.age,
    cv.class,
    e.status AS enrollment_status,
    cp.id AS package_id,
    COALESCE(cp.price_total, e.agreed_price, (0)::numeric) AS agreed_price,
    COALESCE(pb.paid_amount, (0)::numeric) AS paid_amount,
    GREATEST((COALESCE(cp.price_total, e.agreed_price, (0)::numeric) - COALESCE(pb.paid_amount, (0)::numeric)), (0)::numeric) AS balance,
        CASE
            WHEN (COALESCE(cp.price_total, e.agreed_price, (0)::numeric) = (0)::numeric) THEN 'free'::text
            WHEN (COALESCE(pb.paid_amount, (0)::numeric) >= COALESCE(cp.price_total, e.agreed_price, (0)::numeric)) THEN 'paid'::text
            WHEN (COALESCE(pb.paid_amount, (0)::numeric) > (0)::numeric) THEN 'partial'::text
            ELSE 'unpaid'::text
        END AS payment_status,
    e.sessions_allocated,
    COALESCE(att.present_in_run, 0) AS sessions_attended_in_run,
    COALESCE(pb.sessions_remaining, 0) AS package_sessions_remaining,
    COALESCE(pb.sessions_total, 0) AS package_sessions_total
   FROM ((((public.enrollments e
     JOIN public.children_view cv ON ((cv.id = e.child_id)))
     LEFT JOIN public.course_packages cp ON ((cp.id = e.package_id)))
     LEFT JOIN public.package_balance_view pb ON ((pb.package_id = cp.id)))
     LEFT JOIN ( SELECT a.enrollment_id,
            (count(*) FILTER (WHERE (a.status = 'present'::public.attendance_status_enum)))::integer AS present_in_run
           FROM public.attendance a
          GROUP BY a.enrollment_id) att ON ((att.enrollment_id = e.id)));


create or replace view "public"."expenses_details_view" as  SELECT e.id,
    e.spent_on,
    e.amount,
    e.category,
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


create or replace view "public"."child_enrollments_view" as  SELECT e.id AS enrollment_id,
    e.child_id,
    e.run_id,
    e.status AS enrollment_status,
    COALESCE(cp.price_total, e.agreed_price, (0)::numeric) AS agreed_price,
    rs.title,
    rs.kind,
    rs.label,
    rs.status AS run_status,
    COALESCE(sum(p.amount), (0)::numeric) AS paid_amount,
    GREATEST((COALESCE(cp.price_total, e.agreed_price, (0)::numeric) - COALESCE(sum(p.amount), (0)::numeric)), (0)::numeric) AS balance
   FROM (((public.enrollments e
     JOIN public.course_runs_summary_view rs ON ((rs.run_id = e.run_id)))
     LEFT JOIN public.course_packages cp ON ((cp.id = e.package_id)))
     LEFT JOIN public.payments p ON ((p.enrollment_id = e.id)))
  GROUP BY e.id, e.child_id, e.run_id, e.status, cp.price_total, e.agreed_price, rs.title, rs.kind, rs.label, rs.status;


grant delete on table "public"."child_classes" to "anon";

grant insert on table "public"."child_classes" to "anon";

grant references on table "public"."child_classes" to "anon";

grant select on table "public"."child_classes" to "anon";

grant trigger on table "public"."child_classes" to "anon";

grant truncate on table "public"."child_classes" to "anon";

grant update on table "public"."child_classes" to "anon";

grant delete on table "public"."child_classes" to "authenticated";

grant insert on table "public"."child_classes" to "authenticated";

grant references on table "public"."child_classes" to "authenticated";

grant select on table "public"."child_classes" to "authenticated";

grant trigger on table "public"."child_classes" to "authenticated";

grant truncate on table "public"."child_classes" to "authenticated";

grant update on table "public"."child_classes" to "authenticated";

grant delete on table "public"."child_classes" to "service_role";

grant insert on table "public"."child_classes" to "service_role";

grant references on table "public"."child_classes" to "service_role";

grant select on table "public"."child_classes" to "service_role";

grant trigger on table "public"."child_classes" to "service_role";

grant truncate on table "public"."child_classes" to "service_role";

grant update on table "public"."child_classes" to "service_role";

grant delete on table "public"."expense_categories" to "anon";

grant insert on table "public"."expense_categories" to "anon";

grant references on table "public"."expense_categories" to "anon";

grant select on table "public"."expense_categories" to "anon";

grant trigger on table "public"."expense_categories" to "anon";

grant truncate on table "public"."expense_categories" to "anon";

grant update on table "public"."expense_categories" to "anon";

grant delete on table "public"."expense_categories" to "authenticated";

grant insert on table "public"."expense_categories" to "authenticated";

grant references on table "public"."expense_categories" to "authenticated";

grant select on table "public"."expense_categories" to "authenticated";

grant trigger on table "public"."expense_categories" to "authenticated";

grant truncate on table "public"."expense_categories" to "authenticated";

grant update on table "public"."expense_categories" to "authenticated";

grant delete on table "public"."expense_categories" to "service_role";

grant insert on table "public"."expense_categories" to "service_role";

grant references on table "public"."expense_categories" to "service_role";

grant select on table "public"."expense_categories" to "service_role";

grant trigger on table "public"."expense_categories" to "service_role";

grant truncate on table "public"."expense_categories" to "service_role";

grant update on table "public"."expense_categories" to "service_role";

grant delete on table "public"."expense_parties" to "anon";

grant insert on table "public"."expense_parties" to "anon";

grant references on table "public"."expense_parties" to "anon";

grant select on table "public"."expense_parties" to "anon";

grant trigger on table "public"."expense_parties" to "anon";

grant truncate on table "public"."expense_parties" to "anon";

grant update on table "public"."expense_parties" to "anon";

grant delete on table "public"."expense_parties" to "authenticated";

grant insert on table "public"."expense_parties" to "authenticated";

grant references on table "public"."expense_parties" to "authenticated";

grant select on table "public"."expense_parties" to "authenticated";

grant trigger on table "public"."expense_parties" to "authenticated";

grant truncate on table "public"."expense_parties" to "authenticated";

grant update on table "public"."expense_parties" to "authenticated";

grant delete on table "public"."expense_parties" to "service_role";

grant insert on table "public"."expense_parties" to "service_role";

grant references on table "public"."expense_parties" to "service_role";

grant select on table "public"."expense_parties" to "service_role";

grant trigger on table "public"."expense_parties" to "service_role";

grant truncate on table "public"."expense_parties" to "service_role";

grant update on table "public"."expense_parties" to "service_role";


  create policy "admin_all_child_classes"
  on "public"."child_classes"
  as permissive
  for all
  to public
using (public.is_admin())
with check (public.is_admin());



  create policy "admin_all_expense_categories"
  on "public"."expense_categories"
  as permissive
  for all
  to public
using (public.is_admin())
with check (public.is_admin());



  create policy "admin_all_expense_parties"
  on "public"."expense_parties"
  as permissive
  for all
  to public
using (public.is_admin())
with check (public.is_admin());


CREATE TRIGGER trg_prevent_withdraw_enrollment_if_payments BEFORE UPDATE ON public.enrollments FOR EACH ROW EXECUTE FUNCTION public.prevent_withdraw_enrollment_if_payments();

CREATE TRIGGER trg_expense_categories_updated_at BEFORE UPDATE ON public.expense_categories FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_expense_parties_updated_at BEFORE UPDATE ON public.expense_parties FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


