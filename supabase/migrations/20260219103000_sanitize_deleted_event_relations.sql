-- Sanitize residual rows linked to deleted/nonexistent events.
-- This is safe to run multiple times.

do $$
begin
  if to_regclass('public.event_vendors') is not null then
    delete from public.event_vendors t
    where t.event_id is not null
      and not exists (select 1 from public.events e where e.id = t.event_id and coalesce(e.status, 'active') <> 'deleted');
  end if;

  if to_regclass('public.event_guests') is not null then
    delete from public.event_guests t
    where t.event_id is not null
      and not exists (select 1 from public.events e where e.id = t.event_id and coalesce(e.status, 'active') <> 'deleted');
  end if;

  if to_regclass('public.event_tasks') is not null then
    delete from public.event_tasks t
    where t.event_id is not null
      and not exists (select 1 from public.events e where e.id = t.event_id and coalesce(e.status, 'active') <> 'deleted');
  end if;

  if to_regclass('public.event_timeline') is not null then
    delete from public.event_timeline t
    where t.event_id is not null
      and not exists (select 1 from public.events e where e.id = t.event_id and coalesce(e.status, 'active') <> 'deleted');
  end if;

  if to_regclass('public.event_documents') is not null then
    delete from public.event_documents t
    where t.event_id is not null
      and not exists (select 1 from public.events e where e.id = t.event_id and coalesce(e.status, 'active') <> 'deleted');
  end if;

  if to_regclass('public.event_notes') is not null then
    delete from public.event_notes t
    where t.event_id is not null
      and not exists (select 1 from public.events e where e.id = t.event_id and coalesce(e.status, 'active') <> 'deleted');
  end if;

  if to_regclass('public.event_team_members') is not null then
    delete from public.event_team_members t
    where t.event_id is not null
      and not exists (select 1 from public.events e where e.id = t.event_id and coalesce(e.status, 'active') <> 'deleted');
  end if;

  if to_regclass('public.event_tables') is not null then
    delete from public.event_tables t
    where t.event_id is not null
      and not exists (select 1 from public.events e where e.id = t.event_id and coalesce(e.status, 'active') <> 'deleted');
  end if;

  if to_regclass('public.event_expenses') is not null then
    delete from public.event_expenses t
    where t.event_id is not null
      and not exists (select 1 from public.events e where e.id = t.event_id and coalesce(e.status, 'active') <> 'deleted');
  end if;

  if to_regclass('public.expense_payments') is not null then
    delete from public.expense_payments t
    where t.event_id is not null
      and not exists (select 1 from public.events e where e.id = t.event_id and coalesce(e.status, 'active') <> 'deleted');
  end if;

  if to_regclass('public.event_vendor_status') is not null then
    delete from public.event_vendor_status t
    where t.event_id is not null
      and not exists (select 1 from public.events e where e.id = t.event_id and coalesce(e.status, 'active') <> 'deleted');
  end if;

  if to_regclass('public.event_command_alerts') is not null then
    delete from public.event_command_alerts t
    where t.event_id is not null
      and not exists (select 1 from public.events e where e.id = t.event_id and coalesce(e.status, 'active') <> 'deleted');
  end if;

  if to_regclass('public.event_command_incidents') is not null then
    delete from public.event_command_incidents t
    where t.event_id is not null
      and not exists (select 1 from public.events e where e.id = t.event_id and coalesce(e.status, 'active') <> 'deleted');
  end if;

  if to_regclass('public.event_couple_updates') is not null then
    delete from public.event_couple_updates t
    where t.event_id is not null
      and not exists (select 1 from public.events e where e.id = t.event_id and coalesce(e.status, 'active') <> 'deleted');
  end if;

  if to_regclass('public.user_plan_assistant_hint_state') is not null then
    delete from public.user_plan_assistant_hint_state s
    where s.hint_id ~* '([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$'
      and not exists (
        select 1
        from public.events e
        where e.id = substring(s.hint_id from '([0-9a-fA-F-]{36})$')::uuid
          and coalesce(e.status, 'active') <> 'deleted'
      );
  end if;
end
$$;
