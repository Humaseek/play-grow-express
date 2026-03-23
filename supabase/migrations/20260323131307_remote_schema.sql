alter table "public"."course_packages" drop constraint "course_packages_sessions_total_check";

alter table "public"."enrollments" drop constraint "enrollments_sessions_allocated_check";

alter table "public"."enrollments" drop constraint "enrollments_package_id_fkey";

drop function if exists "public"."adjust_package_sessions_total"(p_package_id bigint, p_delta integer);

alter table "public"."enrollments" add constraint "enrollments_package_id_fkey" FOREIGN KEY (package_id) REFERENCES public.course_packages(id) ON DELETE SET NULL not valid;

alter table "public"."enrollments" validate constraint "enrollments_package_id_fkey";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.delete_course_package(p_package_id bigint, p_enrollment_id bigint)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_sessions_total INT;
BEGIN
  -- منع الحذف إذا كان هناك دفعات مسجلة على هذه الباقة
  IF EXISTS (SELECT 1 FROM public.payments WHERE package_id = p_package_id) THEN
    RAISE EXCEPTION 'لا يمكن حذف الباقة لوجود دفعات مالية مرتبطة بها. قم بحذف الدفعات أولاً.';
  END IF;

  SELECT sessions_total INTO v_sessions_total FROM public.course_packages WHERE id = p_package_id;

  DELETE FROM public.course_packages WHERE id = p_package_id;

  -- خصم عدد الجلسات من حساب الطالب
  IF v_sessions_total IS NOT NULL AND v_sessions_total > 0 THEN
    UPDATE public.enrollments
    SET sessions_allocated = GREATEST(0, sessions_allocated - v_sessions_total)
    WHERE id = p_enrollment_id;
  END IF;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.edit_course_package(p_package_id bigint, p_enrollment_id bigint, p_new_price numeric, p_new_sessions integer)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_old_sessions INT;
  v_diff INT;
BEGIN
  SELECT sessions_total INTO v_old_sessions FROM public.course_packages WHERE id = p_package_id;
  
  v_diff := p_new_sessions - coalesce(v_old_sessions, 0);

  UPDATE public.course_packages
  SET price_total = p_new_price, sessions_total = p_new_sessions
  WHERE id = p_package_id;

  -- تحديث الجلسات المخصصة للطالب إذا تم تغيير العدد
  IF v_diff <> 0 THEN
    UPDATE public.enrollments
    SET sessions_allocated = GREATEST(0, sessions_allocated + v_diff)
    WHERE id = p_enrollment_id;
  END IF;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_session_status_on_attendance()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
   -- تغيير حالة الجلسة إلى مكتملة (done) بمجرد تسجيل أي حضور فيها
   UPDATE public.course_sessions
   SET status = 'done'
   WHERE id = NEW.session_id;
   
   RETURN NEW;
END;
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

  -- حساب الجلسات المستهلكة (حاضر + غائب فقط) 
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

  v_run_future := public.get_run_future_sessions_count(v_run_id);
  v_run_future := coalesce(v_run_future, 0);

  if v_pkg_id is not null then
    select pb.sessions_remaining
    into v_pkg_remaining
    from public.package_balance_view pb
    where pb.package_id = v_pkg_id
    limit 1;

    v_pkg_remaining := coalesce(v_pkg_remaining, 0);
    v_max_allowed := v_attended + v_pkg_remaining;
  else
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

CREATE OR REPLACE FUNCTION public.adjust_package_sessions_total(p_package_id bigint, p_delta integer)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  UPDATE public.course_packages
  SET sessions_total = sessions_total + p_delta
  WHERE id = p_package_id;
END;
$function$
;

CREATE TRIGGER trg_auto_complete_session AFTER INSERT OR UPDATE ON public.attendance FOR EACH ROW EXECUTE FUNCTION public.update_session_status_on_attendance();


