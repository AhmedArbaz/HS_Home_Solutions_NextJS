-- =====================================================================
--  Admin ka password set/reset karna  (Supabase -> SQL Editor -> Run)
--  Password code ya .env mein store nahi hota — Supabase Auth mein hota hai.
--
--  Pehle se user bana hua hai  -> yeh script uska password is se badal degi.
--  User abhi bana hi nahi      -> pehle Authentication -> Users -> Add user
--                                 (email + yehi password, Auto Confirm tick),
--                                 phir yeh script chalayein.
--
--  Login ke baad /admin/account se apna pasandida password lagayein,
--  aur login ho jane ke baad yeh file project se DELETE kar dein.
-- =====================================================================
do $$
declare
  v_email    text := 'hshomesolutions9@gmail.com';
  v_password text := 'mL6_MeXAmhJ5cMdSOp';
  v_id       uuid;
begin
  select id into v_id from auth.users where lower(email) = lower(v_email);
  if v_id is null then
    raise exception 'User % nahi mila. Pehle Authentication -> Users -> Add user se banayein.', v_email;
  end if;

  update auth.users
     set encrypted_password = extensions.crypt(v_password, extensions.gen_salt('bf')),
         email_confirmed_at = coalesce(email_confirmed_at, now()),
         updated_at         = now()
   where id = v_id;

  insert into public.admins (user_id) values (v_id) on conflict (user_id) do nothing;
end $$;

-- Check: 1 row aani chahiye
select u.email, a.created_at as admin_since
from public.admins a join auth.users u on u.id = a.user_id;
