insert into public.super_admin_users (user_id)
values ('32a4119e-2a8b-4cf1-b528-c7a53e89d4b4')
on conflict (user_id) do nothing;
