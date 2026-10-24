-- =====================================================================
--  H&S HOME SOLUTIONS — Marketplace upgrade (guests + sellers + approvals)
--  Supabase Dashboard -> SQL Editor -> New query -> paste ALL -> Run
--  PEHLE schema.sql chalayein, PHIR yeh file. Dobara run karna safe hai.
--
--  Kya banta hai:
--   * profiles          : har registered user ka record + status (is_guest = true -> "guest user"/customer, false -> seller/admin)
--   * seller_profiles   : seller ki store details + approval status
--   * products.seller_id: kis seller ka product hai (NULL = store ka apna)
--   * seller security   : seller sirf apne products / apne order items dekh sakta hai
--   * create_order()    : ab order ko user se aur har item ko seller se jorta hai
-- =====================================================================

-- ---------- 1. Tables --------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text,
  full_name   text not null default '',
  is_guest    boolean not null default false,
  status      text not null default 'approved' check (status in ('pending','approved','rejected')),
  admin_note  text not null default '',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists profiles_status_idx on public.profiles (status);

create table if not exists public.seller_profiles (
  user_id      uuid primary key references auth.users (id) on delete cascade,
  store_name   text not null,
  owner_name   text not null default '',
  phone        text not null default '',
  city         text not null default '',
  address      text not null default '',
  description  text not null default '',
  status       text not null default 'pending' check (status in ('pending','approved','rejected')),
  admin_note   text not null default '',
  reviewed_at  timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists seller_profiles_status_idx on public.seller_profiles (status);

-- ---------- 2. Columns on existing tables ------------------------------
alter table public.site_settings add column if not exists require_user_approval boolean not null default false;

alter table public.products    add column if not exists seller_id uuid references public.seller_profiles (user_id) on delete cascade;
create index if not exists products_seller_idx on public.products (seller_id);

alter table public.orders      add column if not exists user_id uuid references auth.users (id) on delete set null;

alter table public.order_items add column if not exists seller_id uuid;
alter table public.order_items add column if not exists fulfil_status text not null default 'new';
alter table public.order_items drop constraint if exists order_items_fulfil_status_check;
alter table public.order_items add constraint order_items_fulfil_status_check
  check (fulfil_status in ('new','confirmed','processing','shipped','delivered','cancelled'));
create index if not exists order_items_seller_idx on public.order_items (seller_id);

-- ---------- 3. Helper functions ----------------------------------------
create or replace function public.is_approved_seller(uid uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1
      from public.seller_profiles sp
      join public.profiles p on p.id = sp.user_id
     where sp.user_id = uid and sp.status = 'approved' and p.status = 'approved'
  );
$$;

-- New auth user -> profile row (+ pending seller application when signed up as seller)
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer
set search_path = public
as $$
declare
  v_meta  jsonb   := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_anon  boolean := coalesce((to_jsonb(new) ->> 'is_anonymous')::boolean, false);
  v_apply boolean := coalesce(v_meta ->> 'apply_seller', '') = 'true' and not v_anon;
  v_need  boolean;
begin
  select coalesce(require_user_approval, false) into v_need from public.site_settings where id = 1;

  insert into public.profiles (id, email, full_name, is_guest, status)
  values (
    new.id, new.email, left(coalesce(v_meta ->> 'full_name', ''), 100), not v_apply,
    case when v_apply or v_anon or not coalesce(v_need, false) then 'approved' else 'pending' end
  )
  on conflict (id) do nothing;

  if v_apply then
    insert into public.seller_profiles (user_id, store_name, owner_name, phone, city, address, description)
    values (
      new.id,
      left(coalesce(nullif(btrim(v_meta ->> 'store_name'), ''), 'My Store'), 100),
      left(coalesce(v_meta ->> 'full_name', ''), 100),
      left(coalesce(v_meta ->> 'phone', ''), 30),
      left(coalesce(v_meta ->> 'city', ''), 100),
      left(coalesce(v_meta ->> 'address', ''), 300),
      left(coalesce(v_meta ->> 'description', ''), 1000)
    )
    on conflict (user_id) do nothing;
  end if;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Existing users (e.g. the admin) get a profile too
insert into public.profiles (id, email, is_guest, status)
select u.id, u.email, true, 'approved'
  from auth.users u
on conflict (id) do nothing;

-- is_guest = customer account (not admin, not seller)
update public.profiles p
   set is_guest = not (exists (select 1 from public.admins a where a.user_id = p.id)
                    or exists (select 1 from public.seller_profiles s where s.user_id = p.id));

-- ---------- 4. Guards: only an admin may change status / notes ---------
create or replace function public.guard_profile_update()
returns trigger
language plpgsql
as $$
begin
  if auth.uid() is not null
     and coalesce(current_setting('app.bypass_guard', true), '') <> '1'
     and not public.is_admin() then
    new.id         := old.id;
    new.is_guest   := old.is_guest;
    new.status     := old.status;
    new.admin_note := old.admin_note;
  end if;
  return new;
end $$;

create or replace function public.guard_seller_update()
returns trigger
language plpgsql
as $$
begin
  if auth.uid() is not null
     and coalesce(current_setting('app.bypass_guard', true), '') <> '1'
     and not public.is_admin() then
    new.user_id     := old.user_id;
    new.status      := old.status;
    new.admin_note  := old.admin_note;
    new.reviewed_at := old.reviewed_at;
  end if;
  return new;
end $$;

drop trigger if exists trg_profiles_guard on public.profiles;
create trigger trg_profiles_guard before update on public.profiles
  for each row execute function public.guard_profile_update();
drop trigger if exists trg_sellers_guard on public.seller_profiles;
create trigger trg_sellers_guard before update on public.seller_profiles
  for each row execute function public.guard_seller_update();

drop trigger if exists trg_profiles_updated on public.profiles;
create trigger trg_profiles_updated before update on public.profiles
  for each row execute function public.set_updated_at();
drop trigger if exists trg_sellers_updated on public.seller_profiles;
create trigger trg_sellers_updated before update on public.seller_profiles
  for each row execute function public.set_updated_at();

-- A rejected seller may apply again
create or replace function public.seller_reapply()
returns void
language plpgsql security definer
set search_path = public
as $$
begin
  perform set_config('app.bypass_guard', '1', true);
  update public.seller_profiles
     set status = 'pending', admin_note = '', reviewed_at = null
   where user_id = auth.uid() and status = 'rejected';
end $$;
revoke all on function public.seller_reapply() from public, anon;
grant execute on function public.seller_reapply() to authenticated;

-- A logged-in customer applies to become a seller (same account, no new email needed)
create or replace function public.seller_apply(
  p_store text, p_owner text, p_phone text, p_city text, p_address text, p_desc text
)
returns void
language plpgsql security definer
set search_path = public
as $$
begin
  if auth.uid() is null or coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) then
    raise exception 'not_logged_in';
  end if;
  if char_length(btrim(coalesce(p_store, ''))) < 2 then raise exception 'invalid_store'; end if;

  insert into public.seller_profiles (user_id, store_name, owner_name, phone, city, address, description)
  values (
    auth.uid(), left(btrim(p_store), 100), left(coalesce(p_owner, ''), 100), left(coalesce(p_phone, ''), 30),
    left(coalesce(p_city, ''), 100), left(coalesce(p_address, ''), 300), left(coalesce(p_desc, ''), 1000)
  )
  on conflict (user_id) do nothing;

  perform set_config('app.bypass_guard', '1', true);
  update public.profiles set is_guest = false where id = auth.uid();
end $$;
revoke all on function public.seller_apply(text,text,text,text,text,text) from public, anon;
grant execute on function public.seller_apply(text,text,text,text,text,text) to authenticated;

-- ---------- 5. Seller changes the fulfilment status of HIS order items -
create or replace function public.seller_update_item(p_item uuid, p_status text)
returns void
language plpgsql security definer
set search_path = public
as $$
declare
  v_item public.order_items%rowtype;
begin
  if p_status not in ('new','confirmed','processing','shipped','delivered','cancelled') then
    raise exception 'invalid_status';
  end if;
  if auth.uid() is null or not public.is_approved_seller(auth.uid()) then
    raise exception 'not_allowed';
  end if;

  select * into v_item from public.order_items where id = p_item and seller_id = auth.uid() for update;
  if not found then raise exception 'not_found'; end if;

  if v_item.product_id is not null then
    if v_item.fulfil_status <> 'cancelled' and p_status = 'cancelled' then
      update public.products set stock = stock + v_item.quantity where id = v_item.product_id and stock is not null;
    elsif v_item.fulfil_status = 'cancelled' and p_status <> 'cancelled' then
      update public.products set stock = greatest(stock - v_item.quantity, 0) where id = v_item.product_id and stock is not null;
    end if;
  end if;

  update public.order_items set fulfil_status = p_status where id = p_item;
end $$;
revoke all on function public.seller_update_item(uuid, text) from public, anon;
grant execute on function public.seller_update_item(uuid, text) to authenticated;

-- Admin cancelling a whole order must not restore stock twice for items a seller already cancelled
create or replace function public.orders_stock_sync()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  if old.status <> 'cancelled' and new.status = 'cancelled' then
    update public.products p
       set stock = p.stock + oi.qty
      from (select product_id, sum(quantity)::int as qty
              from public.order_items
             where order_id = new.id and fulfil_status <> 'cancelled' group by product_id) oi
     where p.id = oi.product_id and p.stock is not null;
  elsif old.status = 'cancelled' and new.status <> 'cancelled' then
    update public.products p
       set stock = greatest(p.stock - oi.qty, 0)
      from (select product_id, sum(quantity)::int as qty
              from public.order_items
             where order_id = new.id and fulfil_status <> 'cancelled' group by product_id) oi
     where p.id = oi.product_id and p.stock is not null;
  end if;
  return new;
end $$;

-- ---------- 6. create_order(): now knows the user and each item's seller
create or replace function public.create_order(
  p_name    text,
  p_phone   text,
  p_address text,
  p_city    text,
  p_payment text,
  p_notes   text,
  p_items   jsonb
)
returns jsonb
language plpgsql security definer
set search_path = public
as $$
declare
  v_fee       numeric;
  v_order_id  uuid;
  v_number    text;
  v_subtotal  numeric := 0;
  v_lines     jsonb := '[]'::jsonb;
  v_item      jsonb;
  v_prod      public.products%rowtype;
  v_qty       int;
  v_line      numeric;
  v_rows      int;
  v_uid       uuid := auth.uid();
  v_pstatus   text;
begin
  -- Rejected (or still pending, when approval is required) accounts cannot order
  if v_uid is not null then
    select status into v_pstatus from public.profiles where id = v_uid;
    if v_pstatus is not null and v_pstatus <> 'approved' then
      raise exception 'account_blocked:%', v_pstatus;
    end if;
  end if;

  p_name    := btrim(coalesce(p_name, ''));
  p_phone   := btrim(coalesce(p_phone, ''));
  p_address := btrim(coalesce(p_address, ''));
  p_city    := btrim(coalesce(p_city, ''));
  p_payment := btrim(coalesce(p_payment, 'Cash on Delivery'));
  p_notes   := btrim(coalesce(p_notes, ''));

  if char_length(p_name) < 2 or char_length(p_name) > 100 then raise exception 'invalid_name'; end if;
  if char_length(p_phone) < 7 or char_length(p_phone) > 25 then raise exception 'invalid_phone'; end if;
  if char_length(p_address) < 5 or char_length(p_address) > 500 then raise exception 'invalid_address'; end if;
  if char_length(p_city) > 100 or char_length(p_notes) > 1000 or char_length(p_payment) > 100 then
    raise exception 'invalid_input';
  end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array'
     or jsonb_array_length(p_items) < 1 or jsonb_array_length(p_items) > 50 then
    raise exception 'invalid_items';
  end if;

  select delivery_fee into v_fee from public.site_settings where id = 1;
  v_fee := coalesce(v_fee, 0);

  insert into public.orders (customer_name, phone, address, city, payment_method, customer_notes, user_id)
  values (p_name, p_phone, p_address, p_city, p_payment, p_notes, v_uid)
  returning id, order_number into v_order_id, v_number;

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_qty := (v_item ->> 'quantity')::int;
    if v_qty is null or v_qty < 1 or v_qty > 100 then raise exception 'invalid_quantity'; end if;

    select * into v_prod from public.products
     where id = (v_item ->> 'product_id')::uuid
       and is_active
       and (seller_id is null or public.is_approved_seller(seller_id));
    if not found then raise exception 'product_unavailable'; end if;

    if v_prod.stock is not null then
      update public.products set stock = stock - v_qty
       where id = v_prod.id and stock >= v_qty;
      get diagnostics v_rows = row_count;
      if v_rows = 0 then raise exception 'out_of_stock:%', v_prod.name; end if;
    end if;

    v_line := v_prod.price * v_qty;
    v_subtotal := v_subtotal + v_line;

    insert into public.order_items (order_id, product_id, product_name, unit_price, quantity, line_total, seller_id)
    values (v_order_id, v_prod.id, v_prod.name, v_prod.price, v_qty, v_line, v_prod.seller_id);

    v_lines := v_lines || jsonb_build_object(
      'name', v_prod.name, 'unit_price', v_prod.price, 'quantity', v_qty, 'line_total', v_line);
  end loop;

  update public.orders
     set subtotal = v_subtotal, delivery_fee = v_fee, total = v_subtotal + v_fee
   where id = v_order_id;

  return jsonb_build_object(
    'order_number', v_number,
    'subtotal', v_subtotal,
    'delivery_fee', v_fee,
    'total', v_subtotal + v_fee,
    'items', v_lines
  );
end $$;

revoke all on function public.create_order(text,text,text,text,text,text,jsonb) from public;
grant execute on function public.create_order(text,text,text,text,text,text,jsonb) to anon, authenticated;

-- ---------- 7. Row Level Security --------------------------------------
alter table public.profiles        enable row level security;
alter table public.seller_profiles enable row level security;

revoke all on public.profiles, public.seller_profiles from anon;
grant select, update on public.profiles        to authenticated;
grant select, update on public.seller_profiles to authenticated;

drop policy if exists "profiles read own or admin" on public.profiles;
create policy "profiles read own or admin" on public.profiles
  for select to authenticated using (id = auth.uid() or public.is_admin());
drop policy if exists "profiles admin update" on public.profiles;
create policy "profiles admin update" on public.profiles
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "sellers read own or admin" on public.seller_profiles;
create policy "sellers read own or admin" on public.seller_profiles
  for select to authenticated using (user_id = auth.uid() or public.is_admin());
drop policy if exists "sellers update own or admin" on public.seller_profiles;
create policy "sellers update own or admin" on public.seller_profiles
  for update to authenticated
  using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());

-- Products: public sees active products of the store and of APPROVED sellers
drop policy if exists "products public read" on public.products;
create policy "products public read" on public.products
  for select using (
    (is_active and (seller_id is null or public.is_approved_seller(seller_id)))
    or public.is_admin()
    or seller_id = auth.uid()
  );

drop policy if exists "sellers insert own products" on public.products;
create policy "sellers insert own products" on public.products
  for insert to authenticated
  with check (seller_id = auth.uid() and public.is_approved_seller(auth.uid()));
drop policy if exists "sellers update own products" on public.products;
create policy "sellers update own products" on public.products
  for update to authenticated
  using (seller_id = auth.uid() and public.is_approved_seller(auth.uid()))
  with check (seller_id = auth.uid() and public.is_approved_seller(auth.uid()));
drop policy if exists "sellers delete own products" on public.products;
create policy "sellers delete own products" on public.products
  for delete to authenticated
  using (seller_id = auth.uid() and public.is_approved_seller(auth.uid()));

-- Sellers can read the order lines of their own products and the parent order (customer contact)
drop policy if exists "sellers read own order items" on public.order_items;
create policy "sellers read own order items" on public.order_items
  for select to authenticated using (seller_id = auth.uid());
drop policy if exists "sellers read orders of own items" on public.orders;
create policy "sellers read orders of own items" on public.orders
  for select to authenticated
  using (exists (select 1 from public.order_items oi where oi.order_id = orders.id and oi.seller_id = auth.uid()));

-- Customers can read their own orders (account page). The helper avoids RLS recursion.
create or replace function public.order_is_mine(p_order uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (select 1 from public.orders where id = p_order and user_id = auth.uid());
$$;
drop policy if exists "users read own orders" on public.orders;
create policy "users read own orders" on public.orders
  for select to authenticated using (user_id = auth.uid());
drop policy if exists "users read own order items" on public.order_items;
create policy "users read own order items" on public.order_items
  for select to authenticated using (public.order_is_mine(order_id));

-- Approved sellers may upload product photos
drop policy if exists "product images seller insert" on storage.objects;
create policy "product images seller insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'product-images' and public.is_approved_seller(auth.uid()));

-- Check: profile of every existing user
select count(*) as profiles_created from public.profiles;
