insert into public.super_admin_users (user_id)
select id
from auth.users
where lower(email) = 'admin@planejar.pro'
on conflict (user_id) do nothing;
