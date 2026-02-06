begin;

drop function if exists public.purchase_sessions_and_enroll(bigint,bigint,integer,numeric);

create function public.purchase_sessions_and_enroll(
  p_run_id bigint,
  p_child_id bigint,
  p_sessions integer,
  p_price_total numeric
)
returns void
language plpgsql
security definer
set search_path = public
as $$
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
$$;

commit;
