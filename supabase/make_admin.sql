-- =====================================================================
--  Make a user an admin of the H&S admin panel
--  1) Supabase Dashboard -> Authentication -> Users -> "Add user"
--     (email + password, tick "Auto Confirm User")
--  2) Replace the email below with that email and Run this script.
-- =====================================================================
insert into public.admins (user_id)
select id from auth.users where email = 'hshomesolutions9@gmail.com'
on conflict (user_id) do nothing;

-- Check: should return 1 row
select u.email, a.created_at
from public.admins a join auth.users u on u.id = a.user_id;
