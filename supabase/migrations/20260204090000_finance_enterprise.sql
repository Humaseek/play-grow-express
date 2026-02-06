-- Finance Enterprise Upgrade
-- 1) Link payments to a specific session (optional)
-- 2) Add payments_details_view for rich UI (child + course + run + session)
-- 3) Add enrollments_finance_view (picker)
-- 4) Add expenses table (simple) with RLS admin-only

-- =========================================================
-- 1) payments.session_id (optional)
-- =========================================================

alter table public.payments
  add column if not exists session_id bigint;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'payments_session_id_fkey'
  ) then
    alter table public.payments
      add constraint payments_session_id_fkey
      foreign key (session_id)
      references public.course_sessions(id)
      on delete set null;
  end if;
end$$;

create index if not exists idx_payments_session_id
  on public.payments(session_id);

-- =========================================================
-- 2) payments_details_view
-- =========================================================

create or replace view public.payments_details_view as
select
  p.id,
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
  ch.name as child_name,
  rs.template_id as course_id,
  rs.title as course_title,
  rs.kind as course_kind,
  rs.label as run_label,
  s.start_at as session_start_at,
  s.end_at as session_end_at,
  s.status as session_status
from public.payments p
join public.enrollments e on e.id = p.enrollment_id
join public.children ch on ch.id = e.child_id
left join public.course_runs_summary_view rs on rs.run_id = e.run_id
left join public.course_sessions s on s.id = p.session_id;

-- =========================================================
-- 3) enrollments_finance_view (for pickers / global finance UI)
-- =========================================================

create or replace view public.enrollments_finance_view as
select
  e.id as enrollment_id,
  e.child_id,
  ch.name as child_name,
  e.run_id,
  rs.template_id as course_id,
  rs.title as course_title,
  rs.label as run_label,
  e.status as enrollment_status,
  coalesce(e.agreed_price, (0)::numeric)::numeric(12,2) as agreed_price,
  coalesce(sum(p.amount), (0)::numeric)::numeric(12,2) as paid_amount,
  (coalesce(e.agreed_price, (0)::numeric) - coalesce(sum(p.amount), (0)::numeric))::numeric(12,2) as balance
from public.enrollments e
join public.children ch on ch.id = e.child_id
left join public.course_runs_summary_view rs on rs.run_id = e.run_id
left join public.payments p on p.enrollment_id = e.id
group by
  e.id,
  e.child_id,
  ch.name,
  e.run_id,
  rs.template_id,
  rs.title,
  rs.label,
  e.status,
  e.agreed_price;

-- =========================================================
-- 4) expenses table
-- =========================================================

create sequence if not exists public.expenses_id_seq;

create table if not exists public.expenses (
  id bigint not null default nextval('public.expenses_id_seq'::regclass),
  spent_on date not null default current_date,
  amount numeric(12,2) not null,
  category text,
  description text,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint expenses_pkey primary key (id),
  constraint expenses_amount_check check (amount > (0)::numeric)
);

alter sequence public.expenses_id_seq owned by public.expenses.id;

alter table public.expenses enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'expenses'
      and policyname = 'admin_all_expenses'
  ) then
    create policy admin_all_expenses
      on public.expenses
      as permissive
      for all
      to public
      using (public.is_admin())
      with check (public.is_admin());
  end if;
end$$;

create index if not exists idx_expenses_spent_on
  on public.expenses(spent_on);

do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'trg_expenses_updated_at') then
    create trigger trg_expenses_updated_at
      before update on public.expenses
      for each row execute function public.set_updated_at();
  end if;
end$$;

grant delete on table public.expenses to anon;
grant insert on table public.expenses to anon;
grant references on table public.expenses to anon;
grant select on table public.expenses to anon;
grant trigger on table public.expenses to anon;
grant truncate on table public.expenses to anon;
grant update on table public.expenses to anon;

grant delete on table public.expenses to authenticated;
grant insert on table public.expenses to authenticated;
grant references on table public.expenses to authenticated;
grant select on table public.expenses to authenticated;
grant trigger on table public.expenses to authenticated;
grant truncate on table public.expenses to authenticated;
grant update on table public.expenses to authenticated;

grant delete on table public.expenses to service_role;
grant insert on table public.expenses to service_role;
grant references on table public.expenses to service_role;
grant select on table public.expenses to service_role;
grant trigger on table public.expenses to service_role;
grant truncate on table public.expenses to service_role;
grant update on table public.expenses to service_role;

grant usage, select on sequence public.expenses_id_seq to anon;
grant usage, select on sequence public.expenses_id_seq to authenticated;
grant usage, select on sequence public.expenses_id_seq to service_role;
