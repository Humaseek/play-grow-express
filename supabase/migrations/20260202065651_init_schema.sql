create type "public"."attendance_status_enum" as enum ('present', 'absent', 'excused');

create type "public"."course_kind_enum" as enum ('course', 'workshop');

create type "public"."enrollment_status_enum" as enum ('active', 'withdrawn', 'completed');

create type "public"."gender_enum" as enum ('male', 'female');

create type "public"."payment_method_enum" as enum ('cash', 'card', 'transfer', 'other');

create type "public"."session_status_enum" as enum ('scheduled', 'done', 'canceled');

create sequence "public"."attendance_id_seq";

create sequence "public"."children_id_seq";

create sequence "public"."countries_id_seq";

create sequence "public"."course_packages_id_seq";

create sequence "public"."course_runs_id_seq";

create sequence "public"."course_sessions_id_seq";

create sequence "public"."courses_id_seq";

create sequence "public"."enrollments_id_seq";

create sequence "public"."payments_id_seq";


  create table "public"."admins" (
    "user_id" uuid not null,
    "created_at" timestamp with time zone not null default now()
      );



  create table "public"."attendance" (
    "id" bigint not null default nextval('public.attendance_id_seq'::regclass),
    "session_id" bigint not null,
    "enrollment_id" bigint not null,
    "status" public.attendance_status_enum not null,
    "note" text,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."attendance" enable row level security;


  create table "public"."children" (
    "id" bigint not null default nextval('public.children_id_seq'::regclass),
    "name" text not null,
    "birth_date" date not null,
    "class" text,
    "gender" public.gender_enum not null,
    "country_id" bigint,
    "mother_name" text,
    "mother_phone" text,
    "father_name" text,
    "father_phone" text,
    "notes" text,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."children" enable row level security;


  create table "public"."countries" (
    "id" bigint not null default nextval('public.countries_id_seq'::regclass),
    "name" text not null,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."countries" enable row level security;


  create table "public"."course_packages" (
    "id" bigint not null default nextval('public.course_packages_id_seq'::regclass),
    "course_id" bigint not null,
    "child_id" bigint not null,
    "sessions_total" integer not null,
    "price_total" numeric(12,2) not null default 0,
    "status" text not null default 'active'::text,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "unit_price" numeric not null default 0
      );



  create table "public"."course_runs" (
    "id" bigint not null default nextval('public.course_runs_id_seq'::regclass),
    "template_id" bigint not null,
    "label" text not null default 'دفعة'::text,
    "status" text not null default 'active'::text,
    "created_at" timestamp with time zone not null default now(),
    "notes" text
      );


alter table "public"."course_runs" enable row level security;


  create table "public"."course_sessions" (
    "id" bigint not null default nextval('public.course_sessions_id_seq'::regclass),
    "course_id" bigint not null,
    "start_at" timestamp with time zone not null,
    "end_at" timestamp with time zone not null,
    "status" public.session_status_enum not null default 'scheduled'::public.session_status_enum,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "run_id" bigint
      );


alter table "public"."course_sessions" enable row level security;


  create table "public"."courses" (
    "id" bigint not null default nextval('public.courses_id_seq'::regclass),
    "title" text not null,
    "kind" public.course_kind_enum not null default 'course'::public.course_kind_enum,
    "capacity" integer not null default 10,
    "default_price" numeric(12,2) not null default 0,
    "is_active" boolean not null default true,
    "notes" text,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."courses" enable row level security;


  create table "public"."enrollments" (
    "id" bigint not null default nextval('public.enrollments_id_seq'::regclass),
    "course_id" bigint not null,
    "child_id" bigint not null,
    "status" public.enrollment_status_enum not null default 'active'::public.enrollment_status_enum,
    "agreed_price" numeric(12,2) not null default 0,
    "notes" text,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "run_id" bigint,
    "package_id" bigint,
    "sessions_allocated" integer not null default 0
      );


alter table "public"."enrollments" enable row level security;


  create table "public"."payments" (
    "id" bigint not null default nextval('public.payments_id_seq'::regclass),
    "enrollment_id" bigint not null,
    "amount" numeric(12,2) not null,
    "method" public.payment_method_enum not null default 'cash'::public.payment_method_enum,
    "paid_at" timestamp with time zone not null default now(),
    "note" text,
    "created_at" timestamp with time zone not null default now(),
    "package_id" bigint
      );


alter table "public"."payments" enable row level security;

alter sequence "public"."attendance_id_seq" owned by "public"."attendance"."id";

alter sequence "public"."children_id_seq" owned by "public"."children"."id";

alter sequence "public"."countries_id_seq" owned by "public"."countries"."id";

alter sequence "public"."course_packages_id_seq" owned by "public"."course_packages"."id";

alter sequence "public"."course_runs_id_seq" owned by "public"."course_runs"."id";

alter sequence "public"."course_sessions_id_seq" owned by "public"."course_sessions"."id";

alter sequence "public"."courses_id_seq" owned by "public"."courses"."id";

alter sequence "public"."enrollments_id_seq" owned by "public"."enrollments"."id";

alter sequence "public"."payments_id_seq" owned by "public"."payments"."id";

CREATE UNIQUE INDEX admins_pkey ON public.admins USING btree (user_id);

CREATE UNIQUE INDEX attendance_pkey ON public.attendance USING btree (id);

CREATE UNIQUE INDEX children_pkey ON public.children USING btree (id);

CREATE UNIQUE INDEX countries_name_key ON public.countries USING btree (name);

CREATE UNIQUE INDEX countries_pkey ON public.countries USING btree (id);

CREATE UNIQUE INDEX course_packages_pkey ON public.course_packages USING btree (id);

CREATE UNIQUE INDEX course_runs_pkey ON public.course_runs USING btree (id);

CREATE INDEX course_runs_template_id_idx ON public.course_runs USING btree (template_id);

CREATE UNIQUE INDEX course_sessions_pkey ON public.course_sessions USING btree (id);

CREATE UNIQUE INDEX courses_pkey ON public.courses USING btree (id);

CREATE UNIQUE INDEX enrollments_pkey ON public.enrollments USING btree (id);

CREATE INDEX idx_attendance_enrollment ON public.attendance USING btree (enrollment_id);

CREATE INDEX idx_attendance_session ON public.attendance USING btree (session_id);

CREATE INDEX idx_enrollments_child ON public.enrollments USING btree (child_id);

CREATE INDEX idx_enrollments_course ON public.enrollments USING btree (course_id);

CREATE INDEX idx_payments_enrollment_paidat ON public.payments USING btree (enrollment_id, paid_at);

CREATE INDEX idx_sessions_course_start ON public.course_sessions USING btree (course_id, start_at);

CREATE UNIQUE INDEX payments_pkey ON public.payments USING btree (id);

CREATE UNIQUE INDEX uq_course_start ON public.course_sessions USING btree (course_id, start_at);

CREATE UNIQUE INDEX uq_run_child ON public.enrollments USING btree (run_id, child_id);

CREATE UNIQUE INDEX uq_session_enrollment ON public.attendance USING btree (session_id, enrollment_id);

CREATE UNIQUE INDEX ux_course_packages_active ON public.course_packages USING btree (course_id, child_id) WHERE (status = 'active'::text);

alter table "public"."admins" add constraint "admins_pkey" PRIMARY KEY using index "admins_pkey";

alter table "public"."attendance" add constraint "attendance_pkey" PRIMARY KEY using index "attendance_pkey";

alter table "public"."children" add constraint "children_pkey" PRIMARY KEY using index "children_pkey";

alter table "public"."countries" add constraint "countries_pkey" PRIMARY KEY using index "countries_pkey";

alter table "public"."course_packages" add constraint "course_packages_pkey" PRIMARY KEY using index "course_packages_pkey";

alter table "public"."course_runs" add constraint "course_runs_pkey" PRIMARY KEY using index "course_runs_pkey";

alter table "public"."course_sessions" add constraint "course_sessions_pkey" PRIMARY KEY using index "course_sessions_pkey";

alter table "public"."courses" add constraint "courses_pkey" PRIMARY KEY using index "courses_pkey";

alter table "public"."enrollments" add constraint "enrollments_pkey" PRIMARY KEY using index "enrollments_pkey";

alter table "public"."payments" add constraint "payments_pkey" PRIMARY KEY using index "payments_pkey";

alter table "public"."admins" add constraint "admins_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."admins" validate constraint "admins_user_id_fkey";

alter table "public"."attendance" add constraint "attendance_enrollment_id_fkey" FOREIGN KEY (enrollment_id) REFERENCES public.enrollments(id) ON DELETE CASCADE not valid;

alter table "public"."attendance" validate constraint "attendance_enrollment_id_fkey";

alter table "public"."attendance" add constraint "attendance_session_id_fkey" FOREIGN KEY (session_id) REFERENCES public.course_sessions(id) ON DELETE CASCADE not valid;

alter table "public"."attendance" validate constraint "attendance_session_id_fkey";

alter table "public"."attendance" add constraint "uq_session_enrollment" UNIQUE using index "uq_session_enrollment";

alter table "public"."children" add constraint "children_country_id_fkey" FOREIGN KEY (country_id) REFERENCES public.countries(id) ON DELETE SET NULL not valid;

alter table "public"."children" validate constraint "children_country_id_fkey";

alter table "public"."countries" add constraint "countries_name_key" UNIQUE using index "countries_name_key";

alter table "public"."course_packages" add constraint "course_packages_child_id_fkey" FOREIGN KEY (child_id) REFERENCES public.children(id) ON DELETE CASCADE not valid;

alter table "public"."course_packages" validate constraint "course_packages_child_id_fkey";

alter table "public"."course_packages" add constraint "course_packages_course_id_fkey" FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE CASCADE not valid;

alter table "public"."course_packages" validate constraint "course_packages_course_id_fkey";

alter table "public"."course_packages" add constraint "course_packages_sessions_total_check" CHECK ((sessions_total >= 0)) not valid;

alter table "public"."course_packages" validate constraint "course_packages_sessions_total_check";

alter table "public"."course_packages" add constraint "course_packages_status_check" CHECK ((status = ANY (ARRAY['active'::text, 'closed'::text]))) not valid;

alter table "public"."course_packages" validate constraint "course_packages_status_check";

alter table "public"."course_runs" add constraint "course_runs_status_check" CHECK ((status = ANY (ARRAY['active'::text, 'done'::text, 'canceled'::text]))) not valid;

alter table "public"."course_runs" validate constraint "course_runs_status_check";

alter table "public"."course_runs" add constraint "course_runs_template_id_fkey" FOREIGN KEY (template_id) REFERENCES public.courses(id) ON DELETE CASCADE not valid;

alter table "public"."course_runs" validate constraint "course_runs_template_id_fkey";

alter table "public"."course_sessions" add constraint "chk_session_time" CHECK ((end_at > start_at)) not valid;

alter table "public"."course_sessions" validate constraint "chk_session_time";

alter table "public"."course_sessions" add constraint "course_sessions_course_id_fkey" FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE CASCADE not valid;

alter table "public"."course_sessions" validate constraint "course_sessions_course_id_fkey";

alter table "public"."course_sessions" add constraint "course_sessions_run_id_fkey" FOREIGN KEY (run_id) REFERENCES public.course_runs(id) ON DELETE CASCADE not valid;

alter table "public"."course_sessions" validate constraint "course_sessions_run_id_fkey";

alter table "public"."course_sessions" add constraint "uq_course_start" UNIQUE using index "uq_course_start";

alter table "public"."courses" add constraint "courses_capacity_check" CHECK ((capacity > 0)) not valid;

alter table "public"."courses" validate constraint "courses_capacity_check";

alter table "public"."courses" add constraint "courses_default_price_check" CHECK ((default_price >= (0)::numeric)) not valid;

alter table "public"."courses" validate constraint "courses_default_price_check";

alter table "public"."enrollments" add constraint "enrollments_agreed_price_check" CHECK ((agreed_price >= (0)::numeric)) not valid;

alter table "public"."enrollments" validate constraint "enrollments_agreed_price_check";

alter table "public"."enrollments" add constraint "enrollments_child_id_fkey" FOREIGN KEY (child_id) REFERENCES public.children(id) ON DELETE CASCADE not valid;

alter table "public"."enrollments" validate constraint "enrollments_child_id_fkey";

alter table "public"."enrollments" add constraint "enrollments_course_id_fkey" FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE CASCADE not valid;

alter table "public"."enrollments" validate constraint "enrollments_course_id_fkey";

alter table "public"."enrollments" add constraint "enrollments_package_id_fkey" FOREIGN KEY (package_id) REFERENCES public.course_packages(id) not valid;

alter table "public"."enrollments" validate constraint "enrollments_package_id_fkey";

alter table "public"."enrollments" add constraint "enrollments_run_id_fkey" FOREIGN KEY (run_id) REFERENCES public.course_runs(id) ON DELETE CASCADE not valid;

alter table "public"."enrollments" validate constraint "enrollments_run_id_fkey";

alter table "public"."enrollments" add constraint "enrollments_sessions_allocated_check" CHECK ((sessions_allocated >= 0)) not valid;

alter table "public"."enrollments" validate constraint "enrollments_sessions_allocated_check";

alter table "public"."enrollments" add constraint "uq_run_child" UNIQUE using index "uq_run_child";

alter table "public"."payments" add constraint "payments_amount_check" CHECK ((amount > (0)::numeric)) not valid;

alter table "public"."payments" validate constraint "payments_amount_check";

alter table "public"."payments" add constraint "payments_enrollment_id_fkey" FOREIGN KEY (enrollment_id) REFERENCES public.enrollments(id) ON DELETE CASCADE not valid;

alter table "public"."payments" validate constraint "payments_enrollment_id_fkey";

alter table "public"."payments" add constraint "payments_package_id_fkey" FOREIGN KEY (package_id) REFERENCES public.course_packages(id) not valid;

alter table "public"."payments" validate constraint "payments_package_id_fkey";

set check_function_bodies = off;

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

  -- attended in this run
  select count(*)::int
  into v_attended
  from public.attendance a
  join public.course_sessions s on s.id = a.session_id
  where a.enrollment_id = p_enrollment_id
    and a.present = true
    and s.run_id = v_run_id;

  v_attended := coalesce(v_attended, 0);

  if p_new_allocated < v_attended then
    raise exception 'cannot set allocated below attended (%).', v_attended;
  end if;

  -- package remaining
  select pb.sessions_remaining
  into v_pkg_remaining
  from public.package_balance_view pb
  where pb.package_id = v_pkg_id
  limit 1;

  v_pkg_remaining := coalesce(v_pkg_remaining, 0);

  -- future sessions in run
  v_run_future := public.get_run_future_sessions_count(v_run_id);

  -- max allocated can't exceed what makes sense:
  -- at most future sessions in run, and at most attended + remaining package (so we don't over-allocate beyond package)
  v_max_allowed := least(coalesce(v_run_future,0), v_attended + v_pkg_remaining);

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
  package_remaining := v_pkg_remaining;
  run_future_sessions := coalesce(v_run_future,0);
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

  -- سعر الحصة: إذا موجود في package نستخدمه، وإلا نحسبه من (السعر/الحصص)
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

  -- لو عندك جدول حضور اسمه attendance بنحمي من إنقاص أقل من الحضور
  if to_regclass('public.attendance') is not null then
    execute
      'select count(*) from public.attendance where enrollment_id = $1 and status = ''present'''
      into v_attended
      using p_enrollment_id;
  end if;

  v_new_sessions := v_old_sessions + coalesce(p_delta_sessions, 0);

  if v_new_sessions < 0 then
    raise exception 'sessions cannot be negative';
  end if;

  if v_new_sessions < coalesce(v_attended, 0) then
    raise exception 'cannot set sessions below attended (%)', v_attended;
  end if;

  -- حدّث enrollment
  update public.enrollments
  set sessions_allocated = v_new_sessions,
      agreed_price = round((v_new_sessions * v_unit)::numeric, 2),
      updated_at = now()
  where id = p_enrollment_id;

  -- (اختياري لكن مفيد) خلي package متزامن (إذا عندك 1:1 غالبًا)
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

CREATE OR REPLACE FUNCTION public.adjust_package_sessions(p_package_id bigint, p_delta_sessions integer)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_old_sessions integer;
  v_new_sessions integer;
  v_unit numeric;
  v_min_allowed integer;
begin
  -- اقرأ الوضع الحالي
  select sessions_total, unit_price
    into v_old_sessions, v_unit
  from public.course_packages
  where id = p_package_id;

  if v_old_sessions is null then
    raise exception 'package not found: %', p_package_id;
  end if;

  v_new_sessions := v_old_sessions + coalesce(p_delta_sessions, 0);

  if v_new_sessions < 0 then
    raise exception 'sessions cannot be negative';
  end if;

  -- حماية من إنك تنقص أقل من الحصص اللي أنت "مخصصها" فعليًا عبر enrollments (لو مستخدمينها)
  select coalesce(sum(e.sessions_allocated), 0)
    into v_min_allowed
  from public.enrollments e
  where e.package_id = p_package_id
    and e.status = 'active'::enrollment_status_enum;

  if v_new_sessions < v_min_allowed then
    raise exception 'cannot reduce below allocated sessions (%)', v_min_allowed;
  end if;

  -- حدّث الحصص والسعر الإجمالي بناءً على سعر الحصة
  update public.course_packages
  set sessions_total = v_new_sessions,
      price_total = round((v_new_sessions * v_unit)::numeric, 2),
      updated_at = now()
  where id = p_package_id;

end;
$function$
;

CREATE OR REPLACE FUNCTION public.adjust_package_sessions_total(p_package_id bigint, p_delta integer)
 RETURNS TABLE(package_id bigint, old_total integer, new_total integer, used_sessions integer, remaining_sessions integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_total int;
  v_remaining int;
  v_used int;
  v_new int;
begin
  if p_delta is null or p_delta = 0 then
    raise exception 'p_delta must be non-zero';
  end if;

  -- read totals from balance view (so we know used/remaining)
  select coalesce(pb.sessions_total, 0),
         coalesce(pb.sessions_remaining, 0)
    into v_total, v_remaining
  from public.package_balance_view pb
  where pb.package_id = p_package_id
  limit 1;

  -- إذا ما في صف رجع من الـ view رح يظل v_total NULL
  if v_total is null then
    raise exception 'package not found in balance view';
  end if;

  v_used := greatest(v_total - v_remaining, 0);
  v_new := v_total + p_delta;

  if v_new < v_used then
    raise exception 'cannot reduce total below used sessions (used=%)', v_used;
  end if;

  update public.course_packages
  set sessions_total = v_new
  where id = p_package_id;

  package_id := p_package_id;
  old_total := v_total;
  new_total := v_new;
  used_sessions := v_used;
  remaining_sessions := greatest(v_new - v_used, 0);

  return next;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.auto_enroll_packages_for_run(p_run_id bigint)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_course_id bigint;
  v_run_future int;
  r record;
  v_alloc int;
  v_exists bigint;
  v_count int := 0;

  v_runs_course_col text;
  v_enroll_course_col text;

  v_status_is_enum boolean := false;
  v_status_expr text := '''active''';
begin
  -- detect course_runs FK column name
  if exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='course_runs' and column_name='template_id'
  ) then
    v_runs_course_col := 'template_id';
  elsif exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='course_runs' and column_name='course_id'
  ) then
    v_runs_course_col := 'course_id';
  else
    raise exception 'course_runs must have template_id or course_id';
  end if;

  execute format('select %I from public.course_runs where id = $1', v_runs_course_col)
  into v_course_id
  using p_run_id;

  if v_course_id is null then
    raise exception 'run not found';
  end if;

  v_run_future := public.get_run_future_sessions_count(p_run_id);

  -- detect enrollments FK col
  if exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='enrollments' and column_name='course_id'
  ) then
    v_enroll_course_col := 'course_id';
  elsif exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='enrollments' and column_name='template_id'
  ) then
    v_enroll_course_col := 'template_id';
  else
    v_enroll_course_col := null;
  end if;

  -- detect enrollments status type
  select (data_type = 'USER-DEFINED' and udt_name = 'enrollment_status_enum')
  into v_status_is_enum
  from information_schema.columns
  where table_schema='public' and table_name='enrollments' and column_name='status'
  limit 1;

  if coalesce(v_status_is_enum,false) then
    v_status_expr := '''active''::public.enrollment_status_enum';
  else
    v_status_expr := '''active''';
  end if;

  for r in
    select pb.package_id, pb.child_id, pb.sessions_remaining
    from public.package_balance_view pb
    where pb.course_id = v_course_id
      and pb.sessions_remaining > 0
  loop
    v_alloc := least(r.sessions_remaining, coalesce(v_run_future,0));

    select e.id into v_exists
    from public.enrollments e
    where e.run_id = p_run_id
      and e.child_id = r.child_id
    limit 1;

    if v_exists is null then
      if v_enroll_course_col is null then
        execute format(
          'insert into public.enrollments(run_id, child_id, agreed_price, status, package_id, sessions_allocated)
           values ($1,$2,$3,%s,$4,$5)',
          v_status_expr
        )
        using p_run_id, r.child_id, 0, r.package_id, v_alloc;
      else
        execute format(
          'insert into public.enrollments(run_id, %I, child_id, agreed_price, status, package_id, sessions_allocated)
           values ($1,$2,$3,$4,%s,$5,$6)',
          v_enroll_course_col,
          v_status_expr
        )
        using p_run_id, v_course_id, r.child_id, 0, r.package_id, v_alloc;
      end if;

      v_count := v_count + 1;
    else
      update public.enrollments
      set package_id = coalesce(package_id, r.package_id),
          sessions_allocated = greatest(sessions_allocated, v_alloc)
      where id = v_exists;
    end if;
  end loop;

  return v_count;
end;
$function$
;

create or replace view "public"."children_view" as  SELECT ch.id,
    ch.name,
    ch.birth_date,
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
    co.name AS country,
    (date_part('year'::text, age((ch.birth_date)::timestamp with time zone)))::integer AS age
   FROM (public.children ch
     LEFT JOIN public.countries co ON ((co.id = ch.country_id)));


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
          WHERE ((s.run_id = r.id) AND (s.status = 'scheduled'::public.session_status_enum) AND (s.start_at >= now()))) AS next_session_at
   FROM (public.course_runs r
     JOIN public.courses t ON ((t.id = r.template_id)));


CREATE OR REPLACE FUNCTION public.enroll_from_existing_package(p_run_id bigint, p_child_id bigint)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_course_id bigint;
  v_package_id bigint;
  v_remaining integer;
  v_future_sessions integer;
  v_alloc integer;
begin
  -- القالب (course_id) من الدفعة
  select cr.template_id
    into v_course_id
  from public.course_runs cr
  where cr.id = p_run_id;

  if v_course_id is null then
    raise exception 'run not found: %', p_run_id;
  end if;

  -- خذ باقة من package_balance_view
  select pbv.package_id, pbv.sessions_remaining
    into v_package_id, v_remaining
  from public.package_balance_view pbv
  where pbv.child_id = p_child_id
    and pbv.course_id = v_course_id
    and pbv.sessions_remaining > 0
  order by pbv.package_id desc
  limit 1;

  if v_package_id is null then
    raise exception 'no existing package with remaining sessions for child % in course %', p_child_id, v_course_id;
  end if;

  -- حصص قادمة
  select count(*)
    into v_future_sessions
  from public.course_sessions cs
  where cs.run_id = p_run_id
    and cs.status = 'scheduled'
    and cs.start_at >= now();

  v_alloc := least(coalesce(v_remaining, 0), coalesce(v_future_sessions, 0));

  -- ✅ Enrollment لازم يعبّي course_id
  insert into public.enrollments (course_id, run_id, child_id, package_id, sessions_allocated, status)
  values (v_course_id, p_run_id, p_child_id, v_package_id, v_alloc, 'active'::enrollment_status_enum);
end;
$function$
;

create or replace view "public"."enrollment_financials_view" as  SELECT e.id AS enrollment_id,
    e.course_id,
    e.child_id,
    e.status,
    e.agreed_price,
    (COALESCE(sum(p.amount), (0)::numeric))::numeric(12,2) AS paid_amount,
    ((e.agreed_price - COALESCE(sum(p.amount), (0)::numeric)))::numeric(12,2) AS balance
   FROM (public.enrollments e
     LEFT JOIN public.payments p ON ((p.enrollment_id = e.id)))
  GROUP BY e.id;


CREATE OR REPLACE FUNCTION public.generate_weekly_sessions(p_course_id bigint, p_first_start timestamp with time zone, p_duration_minutes integer, p_count integer)
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
declare
  i int := 0;
  v_start timestamptz;
  v_end timestamptz;
  inserted int := 0;
begin
  if p_count <= 0 then
    return 0;
  end if;

  for i in 0..(p_count-1) loop
    v_start := p_first_start + (i * interval '7 days');
    v_end := v_start + (p_duration_minutes * interval '1 minute');

    insert into public.course_sessions(course_id, start_at, end_at)
    values (p_course_id, v_start, v_end)
    on conflict (course_id, start_at) do nothing;

    inserted := inserted + 1;
  end loop;

  return inserted;
end $function$
;

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

CREATE OR REPLACE FUNCTION public.get_run_future_sessions_count(p_run_id bigint)
 RETURNS integer
 LANGUAGE sql
 STABLE
AS $function$
  select count(*)
  from public.course_sessions
  where run_id = p_run_id
    and status = 'scheduled'
    and start_at >= now();
$function$
;

CREATE OR REPLACE FUNCTION public.is_admin()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
AS $function$
  select exists (select 1 from public.admins a where a.user_id = auth.uid());
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
          WHERE ((e.package_id IS NOT NULL) AND (a.status = 'present'::public.attendance_status_enum))
          GROUP BY e.package_id) used ON ((used.package_id = cp.id)));


CREATE OR REPLACE FUNCTION public.payments_fill_package_id()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if new.package_id is null then
    select e.package_id
      into new.package_id
    from public.enrollments e
    where e.id = new.enrollment_id;
  end if;

  return new;
end;
$function$
;

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


CREATE OR REPLACE FUNCTION public.purchase_sessions_and_enroll(p_run_id bigint, p_child_id bigint, p_sessions integer, p_price_total numeric)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_course_id bigint;
  v_package_id bigint;
  v_old_sessions int;
  v_old_price numeric;
  v_unit numeric;
  v_new_sessions int;
  v_new_price numeric;

  v_has_active boolean;
  v_has_status boolean;
  v_has_unit boolean;

  v_filter text := '';
  v_set_active_sql text := '';
  v_set_active_insert_cols text := '';
  v_set_active_insert_vals text := '';

  v_future_sessions integer;
  v_alloc integer;
begin
  if p_sessions is null or p_sessions <= 0 then
    raise exception 'p_sessions must be > 0';
  end if;

  -- course_id من الدفعة
  select cr.template_id
    into v_course_id
  from public.course_runs cr
  where cr.id = p_run_id;

  if v_course_id is null then
    raise exception 'run not found: %', p_run_id;
  end if;

  -- هل في أعمدة active / status / unit_price ؟
  select exists(
    select 1 from information_schema.columns
    where table_schema='public' and table_name='course_packages' and column_name='active'
  ) into v_has_active;

  select exists(
    select 1 from information_schema.columns
    where table_schema='public' and table_name='course_packages' and column_name='status'
  ) into v_has_status;

  select exists(
    select 1 from information_schema.columns
    where table_schema='public' and table_name='course_packages' and column_name='unit_price'
  ) into v_has_unit;

  if v_has_active then
    v_filter := 'and active = true';
    v_set_active_sql := ', active = true';
    v_set_active_insert_cols := ', active';
    v_set_active_insert_vals := ', true';
  elsif v_has_status then
    v_filter := 'and status = ''active''';
    v_set_active_sql := ', status = ''active''';
    v_set_active_insert_cols := ', status';
    v_set_active_insert_vals := ', ''active''';
  end if;

  -- هات الباقة الفعّالة (إن وجدت)
  execute format(
    'select id, sessions_total, price_total, %s
     from public.course_packages
     where course_id = $1 and child_id = $2 %s
     order by id desc
     limit 1',
    case when v_has_unit then 'unit_price' else 'null' end,
    v_filter
  )
  into v_package_id, v_old_sessions, v_old_price, v_unit
  using v_course_id, p_child_id;

  -- جهّز سعر الحصة (unit)
  if coalesce(v_unit, 0) = 0 then
    if p_price_total is not null and p_sessions > 0 then
      v_unit := round((p_price_total / p_sessions)::numeric, 2);
    elsif coalesce(v_old_sessions, 0) > 0 then
      v_unit := round((v_old_price / v_old_sessions)::numeric, 2);
    else
      v_unit := 0;
    end if;
  end if;

  if v_package_id is null then
    -- إنشاء باقة جديدة (فعّالة)
    v_new_sessions := p_sessions;
    if v_unit > 0 then
      v_new_price := round((v_new_sessions * v_unit)::numeric, 2);
    else
      v_new_price := round(coalesce(p_price_total, 0)::numeric, 2);
    end if;

    execute format(
      'insert into public.course_packages (course_id, child_id, sessions_total, price_total%s%s%s)
       values ($1, $2, $3, $4%s%s)
       returning id',
      case when v_has_unit then ', unit_price' else '' end,
      v_set_active_insert_cols,
      '', -- reserved
      case when v_has_unit then ', $5' else '' end,
      v_set_active_insert_vals
    )
    into v_package_id
    using v_course_id, p_child_id, v_new_sessions, v_new_price, v_unit;

  else
    -- تحديث الباقة الموجودة (زِد حصص + عدّل سعر)
    v_new_sessions := coalesce(v_old_sessions, 0) + p_sessions;

    if v_unit > 0 then
      v_new_price := round((v_new_sessions * v_unit)::numeric, 2);
    else
      v_new_price := round((coalesce(v_old_price, 0) + coalesce(p_price_total, 0))::numeric, 2);
    end if;

    execute format(
      'update public.course_packages
       set sessions_total = $2,
           price_total   = $3%s%s,
           updated_at    = now()
       where id = $1',
      case when v_has_unit then ', unit_price = $4' else '' end,
      v_set_active_sql
    )
    using v_package_id, v_new_sessions, v_new_price, v_unit;
  end if;

  -- تخصيص حصص داخل الدفعة (حسب الحصص القادمة)
  select count(*)
    into v_future_sessions
  from public.course_sessions cs
  where cs.run_id = p_run_id
    and cs.status = 'scheduled'
    and cs.start_at >= now();

  v_alloc := least(p_sessions, coalesce(v_future_sessions, 0));

  -- Enrollment
  insert into public.enrollments (course_id, run_id, child_id, package_id, sessions_allocated, status)
  values (v_course_id, p_run_id, p_child_id, v_package_id, v_alloc, 'active'::enrollment_status_enum);

end;
$function$
;

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
    COALESCE(pb.sessions_remaining, 0) AS package_sessions_remaining
   FROM ((((public.enrollments e
     JOIN public.children_view cv ON ((cv.id = e.child_id)))
     LEFT JOIN public.course_packages cp ON ((cp.id = e.package_id)))
     LEFT JOIN public.package_balance_view pb ON ((pb.package_id = cp.id)))
     LEFT JOIN ( SELECT a.enrollment_id,
            (count(*) FILTER (WHERE (a.status = 'present'::public.attendance_status_enum)))::integer AS present_in_run
           FROM public.attendance a
          GROUP BY a.enrollment_id) att ON ((att.enrollment_id = e.id)));


CREATE OR REPLACE FUNCTION public.set_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  new.updated_at = now();
  return new;
end;
$function$
;

create or replace view "public"."today_sessions_view" as  WITH today AS (
         SELECT ((now() AT TIME ZONE 'Asia/Jerusalem'::text))::date AS d
        ), sess AS (
         SELECT s_1.id,
            s_1.course_id,
            s_1.start_at,
            s_1.end_at,
            s_1.status,
            s_1.created_at,
            s_1.updated_at,
            s_1.run_id
           FROM public.course_sessions s_1,
            today
          WHERE (((s_1.start_at AT TIME ZONE 'Asia/Jerusalem'::text))::date = today.d)
        )
 SELECT s.id AS session_id,
    s.run_id,
    r.template_id AS course_id,
    t.title,
    t.kind,
    s.start_at,
    s.end_at,
    s.status,
    ( SELECT count(*) AS count
           FROM public.enrollments e
          WHERE ((e.run_id = s.run_id) AND (e.status = 'active'::public.enrollment_status_enum))) AS expected_count,
    ( SELECT count(*) AS count
           FROM (public.attendance a
             JOIN public.enrollments e ON ((e.id = a.enrollment_id)))
          WHERE ((a.session_id = s.id) AND (e.status = 'active'::public.enrollment_status_enum))) AS attendance_recorded,
    ( SELECT count(*) AS count
           FROM (public.attendance a
             JOIN public.enrollments e ON ((e.id = a.enrollment_id)))
          WHERE ((a.session_id = s.id) AND (e.status = 'active'::public.enrollment_status_enum) AND (a.status = 'present'::public.attendance_status_enum))) AS present_count,
        CASE
            WHEN (( SELECT COALESCE(sum(e.agreed_price), (0)::numeric) AS "coalesce"
               FROM public.enrollments e
              WHERE ((e.run_id = s.run_id) AND (e.status = 'active'::public.enrollment_status_enum))) = (0)::numeric) THEN (0)::numeric
            ELSE (( SELECT COALESCE(sum(p.amount), (0)::numeric) AS "coalesce"
               FROM (public.payments p
                 JOIN public.enrollments e ON ((e.id = p.enrollment_id)))
              WHERE ((e.run_id = s.run_id) AND (e.status = 'active'::public.enrollment_status_enum))) / ( SELECT COALESCE(sum(e.agreed_price), (0)::numeric) AS "coalesce"
               FROM public.enrollments e
              WHERE ((e.run_id = s.run_id) AND (e.status = 'active'::public.enrollment_status_enum))))
        END AS paid_ratio
   FROM ((sess s
     JOIN public.course_runs r ON ((r.id = s.run_id)))
     JOIN public.courses t ON ((t.id = r.template_id)));


create or replace view "public"."child_enrollments_view" as  SELECT e.id AS enrollment_id,
    e.child_id,
    e.run_id,
    e.status AS enrollment_status,
    COALESCE(e.agreed_price, (0)::numeric) AS agreed_price,
    rs.title,
    rs.kind,
    rs.label,
    rs.status AS run_status,
    COALESCE(sum(p.amount), (0)::numeric) AS paid_amount,
    (COALESCE(e.agreed_price, (0)::numeric) - COALESCE(sum(p.amount), (0)::numeric)) AS balance
   FROM ((public.enrollments e
     JOIN public.course_runs_summary_view rs ON ((rs.run_id = e.run_id)))
     LEFT JOIN public.payments p ON ((p.enrollment_id = e.id)))
  GROUP BY e.id, e.child_id, e.run_id, e.status, e.agreed_price, rs.title, rs.kind, rs.label, rs.status;


create or replace view "public"."course_participants_view" as  SELECT e.course_id,
    e.id AS enrollment_id,
    ch.id AS child_id,
    ch.name AS child_name,
    ch.birth_date,
    (date_part('year'::text, age((CURRENT_DATE)::timestamp with time zone, (ch.birth_date)::timestamp with time zone)))::integer AS age,
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


grant delete on table "public"."admins" to "anon";

grant insert on table "public"."admins" to "anon";

grant references on table "public"."admins" to "anon";

grant select on table "public"."admins" to "anon";

grant trigger on table "public"."admins" to "anon";

grant truncate on table "public"."admins" to "anon";

grant update on table "public"."admins" to "anon";

grant delete on table "public"."admins" to "authenticated";

grant insert on table "public"."admins" to "authenticated";

grant references on table "public"."admins" to "authenticated";

grant select on table "public"."admins" to "authenticated";

grant trigger on table "public"."admins" to "authenticated";

grant truncate on table "public"."admins" to "authenticated";

grant update on table "public"."admins" to "authenticated";

grant delete on table "public"."admins" to "postgres";

grant insert on table "public"."admins" to "postgres";

grant references on table "public"."admins" to "postgres";

grant select on table "public"."admins" to "postgres";

grant trigger on table "public"."admins" to "postgres";

grant truncate on table "public"."admins" to "postgres";

grant update on table "public"."admins" to "postgres";

grant delete on table "public"."admins" to "service_role";

grant insert on table "public"."admins" to "service_role";

grant references on table "public"."admins" to "service_role";

grant select on table "public"."admins" to "service_role";

grant trigger on table "public"."admins" to "service_role";

grant truncate on table "public"."admins" to "service_role";

grant update on table "public"."admins" to "service_role";

grant delete on table "public"."attendance" to "anon";

grant insert on table "public"."attendance" to "anon";

grant references on table "public"."attendance" to "anon";

grant select on table "public"."attendance" to "anon";

grant trigger on table "public"."attendance" to "anon";

grant truncate on table "public"."attendance" to "anon";

grant update on table "public"."attendance" to "anon";

grant delete on table "public"."attendance" to "authenticated";

grant insert on table "public"."attendance" to "authenticated";

grant references on table "public"."attendance" to "authenticated";

grant select on table "public"."attendance" to "authenticated";

grant trigger on table "public"."attendance" to "authenticated";

grant truncate on table "public"."attendance" to "authenticated";

grant update on table "public"."attendance" to "authenticated";

grant delete on table "public"."attendance" to "postgres";

grant insert on table "public"."attendance" to "postgres";

grant references on table "public"."attendance" to "postgres";

grant select on table "public"."attendance" to "postgres";

grant trigger on table "public"."attendance" to "postgres";

grant truncate on table "public"."attendance" to "postgres";

grant update on table "public"."attendance" to "postgres";

grant delete on table "public"."attendance" to "service_role";

grant insert on table "public"."attendance" to "service_role";

grant references on table "public"."attendance" to "service_role";

grant select on table "public"."attendance" to "service_role";

grant trigger on table "public"."attendance" to "service_role";

grant truncate on table "public"."attendance" to "service_role";

grant update on table "public"."attendance" to "service_role";

grant delete on table "public"."children" to "anon";

grant insert on table "public"."children" to "anon";

grant references on table "public"."children" to "anon";

grant select on table "public"."children" to "anon";

grant trigger on table "public"."children" to "anon";

grant truncate on table "public"."children" to "anon";

grant update on table "public"."children" to "anon";

grant delete on table "public"."children" to "authenticated";

grant insert on table "public"."children" to "authenticated";

grant references on table "public"."children" to "authenticated";

grant select on table "public"."children" to "authenticated";

grant trigger on table "public"."children" to "authenticated";

grant truncate on table "public"."children" to "authenticated";

grant update on table "public"."children" to "authenticated";

grant delete on table "public"."children" to "postgres";

grant insert on table "public"."children" to "postgres";

grant references on table "public"."children" to "postgres";

grant select on table "public"."children" to "postgres";

grant trigger on table "public"."children" to "postgres";

grant truncate on table "public"."children" to "postgres";

grant update on table "public"."children" to "postgres";

grant delete on table "public"."children" to "service_role";

grant insert on table "public"."children" to "service_role";

grant references on table "public"."children" to "service_role";

grant select on table "public"."children" to "service_role";

grant trigger on table "public"."children" to "service_role";

grant truncate on table "public"."children" to "service_role";

grant update on table "public"."children" to "service_role";

grant delete on table "public"."countries" to "anon";

grant insert on table "public"."countries" to "anon";

grant references on table "public"."countries" to "anon";

grant select on table "public"."countries" to "anon";

grant trigger on table "public"."countries" to "anon";

grant truncate on table "public"."countries" to "anon";

grant update on table "public"."countries" to "anon";

grant delete on table "public"."countries" to "authenticated";

grant insert on table "public"."countries" to "authenticated";

grant references on table "public"."countries" to "authenticated";

grant select on table "public"."countries" to "authenticated";

grant trigger on table "public"."countries" to "authenticated";

grant truncate on table "public"."countries" to "authenticated";

grant update on table "public"."countries" to "authenticated";

grant delete on table "public"."countries" to "postgres";

grant insert on table "public"."countries" to "postgres";

grant references on table "public"."countries" to "postgres";

grant select on table "public"."countries" to "postgres";

grant trigger on table "public"."countries" to "postgres";

grant truncate on table "public"."countries" to "postgres";

grant update on table "public"."countries" to "postgres";

grant delete on table "public"."countries" to "service_role";

grant insert on table "public"."countries" to "service_role";

grant references on table "public"."countries" to "service_role";

grant select on table "public"."countries" to "service_role";

grant trigger on table "public"."countries" to "service_role";

grant truncate on table "public"."countries" to "service_role";

grant update on table "public"."countries" to "service_role";

grant delete on table "public"."course_packages" to "anon";

grant insert on table "public"."course_packages" to "anon";

grant references on table "public"."course_packages" to "anon";

grant select on table "public"."course_packages" to "anon";

grant trigger on table "public"."course_packages" to "anon";

grant truncate on table "public"."course_packages" to "anon";

grant update on table "public"."course_packages" to "anon";

grant delete on table "public"."course_packages" to "authenticated";

grant insert on table "public"."course_packages" to "authenticated";

grant references on table "public"."course_packages" to "authenticated";

grant select on table "public"."course_packages" to "authenticated";

grant trigger on table "public"."course_packages" to "authenticated";

grant truncate on table "public"."course_packages" to "authenticated";

grant update on table "public"."course_packages" to "authenticated";

grant delete on table "public"."course_packages" to "postgres";

grant insert on table "public"."course_packages" to "postgres";

grant references on table "public"."course_packages" to "postgres";

grant select on table "public"."course_packages" to "postgres";

grant trigger on table "public"."course_packages" to "postgres";

grant truncate on table "public"."course_packages" to "postgres";

grant update on table "public"."course_packages" to "postgres";

grant delete on table "public"."course_packages" to "service_role";

grant insert on table "public"."course_packages" to "service_role";

grant references on table "public"."course_packages" to "service_role";

grant select on table "public"."course_packages" to "service_role";

grant trigger on table "public"."course_packages" to "service_role";

grant truncate on table "public"."course_packages" to "service_role";

grant update on table "public"."course_packages" to "service_role";

grant delete on table "public"."course_runs" to "anon";

grant insert on table "public"."course_runs" to "anon";

grant references on table "public"."course_runs" to "anon";

grant select on table "public"."course_runs" to "anon";

grant trigger on table "public"."course_runs" to "anon";

grant truncate on table "public"."course_runs" to "anon";

grant update on table "public"."course_runs" to "anon";

grant delete on table "public"."course_runs" to "authenticated";

grant insert on table "public"."course_runs" to "authenticated";

grant references on table "public"."course_runs" to "authenticated";

grant select on table "public"."course_runs" to "authenticated";

grant trigger on table "public"."course_runs" to "authenticated";

grant truncate on table "public"."course_runs" to "authenticated";

grant update on table "public"."course_runs" to "authenticated";

grant delete on table "public"."course_runs" to "postgres";

grant insert on table "public"."course_runs" to "postgres";

grant references on table "public"."course_runs" to "postgres";

grant select on table "public"."course_runs" to "postgres";

grant trigger on table "public"."course_runs" to "postgres";

grant truncate on table "public"."course_runs" to "postgres";

grant update on table "public"."course_runs" to "postgres";

grant delete on table "public"."course_runs" to "service_role";

grant insert on table "public"."course_runs" to "service_role";

grant references on table "public"."course_runs" to "service_role";

grant select on table "public"."course_runs" to "service_role";

grant trigger on table "public"."course_runs" to "service_role";

grant truncate on table "public"."course_runs" to "service_role";

grant update on table "public"."course_runs" to "service_role";

grant delete on table "public"."course_sessions" to "anon";

grant insert on table "public"."course_sessions" to "anon";

grant references on table "public"."course_sessions" to "anon";

grant select on table "public"."course_sessions" to "anon";

grant trigger on table "public"."course_sessions" to "anon";

grant truncate on table "public"."course_sessions" to "anon";

grant update on table "public"."course_sessions" to "anon";

grant delete on table "public"."course_sessions" to "authenticated";

grant insert on table "public"."course_sessions" to "authenticated";

grant references on table "public"."course_sessions" to "authenticated";

grant select on table "public"."course_sessions" to "authenticated";

grant trigger on table "public"."course_sessions" to "authenticated";

grant truncate on table "public"."course_sessions" to "authenticated";

grant update on table "public"."course_sessions" to "authenticated";

grant delete on table "public"."course_sessions" to "postgres";

grant insert on table "public"."course_sessions" to "postgres";

grant references on table "public"."course_sessions" to "postgres";

grant select on table "public"."course_sessions" to "postgres";

grant trigger on table "public"."course_sessions" to "postgres";

grant truncate on table "public"."course_sessions" to "postgres";

grant update on table "public"."course_sessions" to "postgres";

grant delete on table "public"."course_sessions" to "service_role";

grant insert on table "public"."course_sessions" to "service_role";

grant references on table "public"."course_sessions" to "service_role";

grant select on table "public"."course_sessions" to "service_role";

grant trigger on table "public"."course_sessions" to "service_role";

grant truncate on table "public"."course_sessions" to "service_role";

grant update on table "public"."course_sessions" to "service_role";

grant delete on table "public"."courses" to "anon";

grant insert on table "public"."courses" to "anon";

grant references on table "public"."courses" to "anon";

grant select on table "public"."courses" to "anon";

grant trigger on table "public"."courses" to "anon";

grant truncate on table "public"."courses" to "anon";

grant update on table "public"."courses" to "anon";

grant delete on table "public"."courses" to "authenticated";

grant insert on table "public"."courses" to "authenticated";

grant references on table "public"."courses" to "authenticated";

grant select on table "public"."courses" to "authenticated";

grant trigger on table "public"."courses" to "authenticated";

grant truncate on table "public"."courses" to "authenticated";

grant update on table "public"."courses" to "authenticated";

grant delete on table "public"."courses" to "postgres";

grant insert on table "public"."courses" to "postgres";

grant references on table "public"."courses" to "postgres";

grant select on table "public"."courses" to "postgres";

grant trigger on table "public"."courses" to "postgres";

grant truncate on table "public"."courses" to "postgres";

grant update on table "public"."courses" to "postgres";

grant delete on table "public"."courses" to "service_role";

grant insert on table "public"."courses" to "service_role";

grant references on table "public"."courses" to "service_role";

grant select on table "public"."courses" to "service_role";

grant trigger on table "public"."courses" to "service_role";

grant truncate on table "public"."courses" to "service_role";

grant update on table "public"."courses" to "service_role";

grant delete on table "public"."enrollments" to "anon";

grant insert on table "public"."enrollments" to "anon";

grant references on table "public"."enrollments" to "anon";

grant select on table "public"."enrollments" to "anon";

grant trigger on table "public"."enrollments" to "anon";

grant truncate on table "public"."enrollments" to "anon";

grant update on table "public"."enrollments" to "anon";

grant delete on table "public"."enrollments" to "authenticated";

grant insert on table "public"."enrollments" to "authenticated";

grant references on table "public"."enrollments" to "authenticated";

grant select on table "public"."enrollments" to "authenticated";

grant trigger on table "public"."enrollments" to "authenticated";

grant truncate on table "public"."enrollments" to "authenticated";

grant update on table "public"."enrollments" to "authenticated";

grant delete on table "public"."enrollments" to "postgres";

grant insert on table "public"."enrollments" to "postgres";

grant references on table "public"."enrollments" to "postgres";

grant select on table "public"."enrollments" to "postgres";

grant trigger on table "public"."enrollments" to "postgres";

grant truncate on table "public"."enrollments" to "postgres";

grant update on table "public"."enrollments" to "postgres";

grant delete on table "public"."enrollments" to "service_role";

grant insert on table "public"."enrollments" to "service_role";

grant references on table "public"."enrollments" to "service_role";

grant select on table "public"."enrollments" to "service_role";

grant trigger on table "public"."enrollments" to "service_role";

grant truncate on table "public"."enrollments" to "service_role";

grant update on table "public"."enrollments" to "service_role";

grant delete on table "public"."payments" to "anon";

grant insert on table "public"."payments" to "anon";

grant references on table "public"."payments" to "anon";

grant select on table "public"."payments" to "anon";

grant trigger on table "public"."payments" to "anon";

grant truncate on table "public"."payments" to "anon";

grant update on table "public"."payments" to "anon";

grant delete on table "public"."payments" to "authenticated";

grant insert on table "public"."payments" to "authenticated";

grant references on table "public"."payments" to "authenticated";

grant select on table "public"."payments" to "authenticated";

grant trigger on table "public"."payments" to "authenticated";

grant truncate on table "public"."payments" to "authenticated";

grant update on table "public"."payments" to "authenticated";

grant delete on table "public"."payments" to "postgres";

grant insert on table "public"."payments" to "postgres";

grant references on table "public"."payments" to "postgres";

grant select on table "public"."payments" to "postgres";

grant trigger on table "public"."payments" to "postgres";

grant truncate on table "public"."payments" to "postgres";

grant update on table "public"."payments" to "postgres";

grant delete on table "public"."payments" to "service_role";

grant insert on table "public"."payments" to "service_role";

grant references on table "public"."payments" to "service_role";

grant select on table "public"."payments" to "service_role";

grant trigger on table "public"."payments" to "service_role";

grant truncate on table "public"."payments" to "service_role";

grant update on table "public"."payments" to "service_role";


  create policy "admin_all_attendance"
  on "public"."attendance"
  as permissive
  for all
  to public
using (public.is_admin())
with check (public.is_admin());



  create policy "admin_all_children"
  on "public"."children"
  as permissive
  for all
  to public
using (public.is_admin())
with check (public.is_admin());



  create policy "admin_all_countries"
  on "public"."countries"
  as permissive
  for all
  to public
using (public.is_admin())
with check (public.is_admin());



  create policy "course_runs_admin_all"
  on "public"."course_runs"
  as permissive
  for all
  to public
using (public.is_admin())
with check (public.is_admin());



  create policy "admin_all_sessions"
  on "public"."course_sessions"
  as permissive
  for all
  to public
using (public.is_admin())
with check (public.is_admin());



  create policy "admin_all_courses"
  on "public"."courses"
  as permissive
  for all
  to public
using (public.is_admin())
with check (public.is_admin());



  create policy "admin_all_enrollments"
  on "public"."enrollments"
  as permissive
  for all
  to public
using (public.is_admin())
with check (public.is_admin());



  create policy "admin_all_payments"
  on "public"."payments"
  as permissive
  for all
  to public
using (public.is_admin())
with check (public.is_admin());


CREATE TRIGGER trg_children_updated_at BEFORE UPDATE ON public.children FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_course_packages_updated BEFORE UPDATE ON public.course_packages FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_sessions_updated_at BEFORE UPDATE ON public.course_sessions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_courses_updated_at BEFORE UPDATE ON public.courses FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_enrollments_updated_at BEFORE UPDATE ON public.enrollments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_payments_fill_package_id BEFORE INSERT ON public.payments FOR EACH ROW EXECUTE FUNCTION public.payments_fill_package_id();

DO $$
BEGIN
  -- في بعض نسخ Supabase الدالة غير موجودة
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'storage' AND p.proname = 'protect_delete'
  ) THEN
    EXECUTE 'CREATE TRIGGER protect_buckets_delete
             BEFORE DELETE ON storage.buckets
             FOR EACH STATEMENT
             EXECUTE FUNCTION storage.protect_delete()';
  END IF;
END $$;


CREATE TRIGGER protect_objects_delete BEFORE DELETE ON storage.objects FOR EACH STATEMENT EXECUTE FUNCTION storage.protect_delete();


