-- =====================================================================
--  H&S HOME SOLUTIONS — Supabase database setup
--  Supabase Dashboard -> SQL Editor -> New query -> paste ALL -> Run
--  Safe to re-run (idempotent): existing data is not deleted.
--  Contains: tables, security (RLS), order function, stock logic,
--            image storage bucket, default settings and 12 seed products.
-- =====================================================================

-- ---------- 1. Helpers & admin table ---------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

create table if not exists public.admins (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

-- true only for logged-in users listed in public.admins
create or replace function public.is_admin()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

-- ---------- 2. Catalogue tables --------------------------------------
create table if not exists public.categories (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text not null unique,
  emoji       text not null default '🏠',
  sort_order  int  not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.products (
  id               uuid primary key default gen_random_uuid(),
  name             text not null,
  slug             text not null unique,
  description      text not null default '',
  price            numeric(12,2) not null check (price >= 0),
  compare_at_price numeric(12,2) check (compare_at_price is null or compare_at_price >= 0),
  category_id      uuid references public.categories (id) on delete set null,
  emoji            text not null default '🛍️',
  image_url        text,
  stock            int check (stock is null or stock >= 0),   -- NULL = stock not tracked
  is_active        boolean not null default true,
  is_featured      boolean not null default false,
  sort_order       int not null default 0,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index if not exists products_category_idx on public.products (category_id);
create index if not exists products_active_idx   on public.products (is_active, sort_order);

-- ---------- 3. Store settings (single row, id = 1) -------------------
create table if not exists public.site_settings (
  id              int primary key default 1 check (id = 1),
  store_name      text not null default 'H & S Home Solutions',
  slogan          text not null default 'Better Home • Happier Life',
  whatsapp_number text not null default '923162669126',   -- country code, no + or spaces
  contact_phone   text not null default '',
  contact_email   text not null default '',
  contact_address text not null default '',
  topbar_left     text not null default '🚚 Delivery across Pakistan (charges may apply)',
  topbar_center   text not null default '📲 WhatsApp ordering available',
  topbar_right    text not null default 'Better Home • Happier Life',
  hero_eyebrow    text not null default 'Welcome to H & S Home Solutions',
  hero_title      text not null default 'Smart finds for a happier home.',
  hero_text       text not null default 'Discover useful kitchen essentials, clever organizers and everyday home accessories — selected to make life easier.',
  hero_button     text not null default 'Shop products →',
  banner_title    text not null default 'Need help choosing?',
  banner_text     text not null default 'Ask us about a product or send your shopping list on WhatsApp.',
  products_notice text not null default 'Stock, exact model, final price and delivery charges are confirmed on WhatsApp before an order is accepted.',
  footer_text     text not null default 'Useful home and kitchen essentials for everyday living in Pakistan.',
  delivery_fee    numeric(12,2) not null default 0 check (delivery_fee >= 0),
  updated_at      timestamptz not null default now()
);
insert into public.site_settings (id) values (1) on conflict (id) do nothing;

-- ---------- 4. Orders -------------------------------------------------
create sequence if not exists public.order_number_seq start 1001;

create table if not exists public.orders (
  id             uuid primary key default gen_random_uuid(),
  order_number   text not null unique
                 default ('HS-' || lpad(nextval('public.order_number_seq')::text, 5, '0')),
  customer_name  text not null,
  phone          text not null,
  address        text not null,
  city           text not null default '',
  payment_method text not null default 'Cash on Delivery',
  customer_notes text not null default '',
  subtotal       numeric(12,2) not null default 0,
  delivery_fee   numeric(12,2) not null default 0,
  total          numeric(12,2) not null default 0,
  status         text not null default 'new'
                 check (status in ('new','confirmed','processing','shipped','delivered','cancelled')),
  payment_status text not null default 'unpaid' check (payment_status in ('unpaid','paid')),
  admin_notes    text not null default '',
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index if not exists orders_created_idx on public.orders (created_at desc);
create index if not exists orders_status_idx  on public.orders (status);
create index if not exists orders_phone_idx   on public.orders (phone);

create table if not exists public.order_items (
  id           uuid primary key default gen_random_uuid(),
  order_id     uuid not null references public.orders (id) on delete cascade,
  product_id   uuid references public.products (id) on delete set null,
  product_name text not null,
  unit_price   numeric(12,2) not null,
  quantity     int not null check (quantity > 0),
  line_total   numeric(12,2) not null
);
create index if not exists order_items_order_idx on public.order_items (order_id);

-- ---------- 5. updated_at triggers -----------------------------------
drop trigger if exists trg_categories_updated on public.categories;
create trigger trg_categories_updated before update on public.categories
  for each row execute function public.set_updated_at();
drop trigger if exists trg_products_updated on public.products;
create trigger trg_products_updated before update on public.products
  for each row execute function public.set_updated_at();
drop trigger if exists trg_orders_updated on public.orders;
create trigger trg_orders_updated before update on public.orders
  for each row execute function public.set_updated_at();
drop trigger if exists trg_settings_updated on public.site_settings;
create trigger trg_settings_updated before update on public.site_settings
  for each row execute function public.set_updated_at();

-- ---------- 6. Stock restore when an order is cancelled --------------
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
              from public.order_items where order_id = new.id group by product_id) oi
     where p.id = oi.product_id and p.stock is not null;
  elsif old.status = 'cancelled' and new.status <> 'cancelled' then
    update public.products p
       set stock = greatest(p.stock - oi.qty, 0)
      from (select product_id, sum(quantity)::int as qty
              from public.order_items where order_id = new.id group by product_id) oi
     where p.id = oi.product_id and p.stock is not null;
  end if;
  return new;
end $$;

drop trigger if exists trg_orders_stock on public.orders;
create trigger trg_orders_stock after update of status on public.orders
  for each row when (old.status is distinct from new.status)
  execute function public.orders_stock_sync();

-- ---------- 7. create_order(): the ONLY way customers place orders ----
-- Prices are read from the products table, never trusted from the browser.
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
begin
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

  insert into public.orders (customer_name, phone, address, city, payment_method, customer_notes)
  values (p_name, p_phone, p_address, p_city, p_payment, p_notes)
  returning id, order_number into v_order_id, v_number;

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_qty := (v_item ->> 'quantity')::int;
    if v_qty is null or v_qty < 1 or v_qty > 100 then raise exception 'invalid_quantity'; end if;

    select * into v_prod from public.products
     where id = (v_item ->> 'product_id')::uuid and is_active;
    if not found then raise exception 'product_unavailable'; end if;

    if v_prod.stock is not null then
      update public.products set stock = stock - v_qty
       where id = v_prod.id and stock >= v_qty;
      get diagnostics v_rows = row_count;
      if v_rows = 0 then raise exception 'out_of_stock:%', v_prod.name; end if;
    end if;

    v_line := v_prod.price * v_qty;
    v_subtotal := v_subtotal + v_line;

    insert into public.order_items (order_id, product_id, product_name, unit_price, quantity, line_total)
    values (v_order_id, v_prod.id, v_prod.name, v_prod.price, v_qty, v_line);

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

-- ---------- 8. Row Level Security -------------------------------------
alter table public.admins        enable row level security;
alter table public.categories    enable row level security;
alter table public.products      enable row level security;
alter table public.site_settings enable row level security;
alter table public.orders        enable row level security;
alter table public.order_items   enable row level security;

-- Visitors (anon) may only READ the public catalogue. Everything else is admin-only.
revoke all on all tables in schema public from anon;
grant select on public.categories, public.products, public.site_settings to anon;
grant all on all tables in schema public to authenticated;

drop policy if exists "admins read own row" on public.admins;
create policy "admins read own row" on public.admins
  for select to authenticated using (user_id = auth.uid());

drop policy if exists "categories public read" on public.categories;
create policy "categories public read" on public.categories
  for select using (is_active or public.is_admin());
drop policy if exists "categories admin write" on public.categories;
create policy "categories admin write" on public.categories
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "products public read" on public.products;
create policy "products public read" on public.products
  for select using (is_active or public.is_admin());
drop policy if exists "products admin write" on public.products;
create policy "products admin write" on public.products
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "settings public read" on public.site_settings;
create policy "settings public read" on public.site_settings
  for select using (true);
drop policy if exists "settings admin write" on public.site_settings;
create policy "settings admin write" on public.site_settings
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "orders admin all" on public.orders;
create policy "orders admin all" on public.orders
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "order_items admin all" on public.order_items;
create policy "order_items admin all" on public.order_items
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------- 9. Storage bucket for product images ----------------------
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do update set public = true;

drop policy if exists "product images public read" on storage.objects;
create policy "product images public read" on storage.objects
  for select using (bucket_id = 'product-images');
drop policy if exists "product images admin insert" on storage.objects;
create policy "product images admin insert" on storage.objects
  for insert to authenticated with check (bucket_id = 'product-images' and public.is_admin());
drop policy if exists "product images admin update" on storage.objects;
create policy "product images admin update" on storage.objects
  for update to authenticated using (bucket_id = 'product-images' and public.is_admin());
drop policy if exists "product images admin delete" on storage.objects;
create policy "product images admin delete" on storage.objects
  for delete to authenticated using (bucket_id = 'product-images' and public.is_admin());

-- ---------- 10. Seed data (current storefront catalogue) --------------
insert into public.categories (name, slug, emoji, sort_order) values
  ('Kitchen Tools',          'kitchen-tools',    '🥄', 1),
  ('Storage & Organizers',   'storage',          '🫙', 2),
  ('Dining',                 'dining',           '🍽️', 3),
  ('Cleaning',               'cleaning',         '🧽', 4),
  ('Home Accessories',       'home-accessories', '🏠', 5)
on conflict (slug) do nothing;

insert into public.products (name, slug, description, price, category_id, emoji, sort_order, is_featured)
select v.name, v.slug, v.descr, v.price, c.id, v.emoji, v.ord, true
from (values
  ('Vegetable Cutter & Slicer',     'vegetable-cutter-slicer',    'Chop and slice vegetables for everyday meal prep.',            549, 'kitchen-tools',    '🥕',  1),
  ('Portable Oil Spray Bottle',     'portable-oil-spray-bottle',  'Spray or pour cooking oil with a handy kitchen bottle.',       279, 'kitchen-tools',    '🫒',  2),
  ('Mini Manual Chopper',           'mini-manual-chopper',        'A compact manual helper for chopping small ingredients.',      449, 'kitchen-tools',    '🥬',  3),
  ('Stainless Steel Sponge Holder', 'steel-sponge-holder',        'Keep a dish sponge neatly stored near the sink.',              449, 'storage',          '🧽',  4),
  ('4-in-1 Multi Grater',           'multi-grater-4-in-1',        'A multi-use grater for common kitchen prep tasks.',            899, 'kitchen-tools',    '🧀',  5),
  ('Zipper Roti Cover',             'zipper-roti-cover',          'Help keep rotis covered between serving and mealtime.',        179, 'storage',          '🫓',  6),
  ('Egg Beater',                    'egg-beater',                 'A simple tool for beating eggs and mixing ingredients.',       229, 'kitchen-tools',    '🥚',  7),
  ('Sauce Dipping Plate',           'sauce-dipping-plate',        'A small serving plate for sauces and dips.',                   179, 'dining',           '🍽️',  8),
  ('Silicone Sealing Tape',         'silicone-sealing-tape',      'A sealing tape option for suitable household gaps and edges.', 449, 'home-accessories', '🧰',  9),
  ('2-in-1 Foaming Soap Dish',      'foaming-soap-dish-2-in-1',   'A compact soap and sink-area accessory.',                      349, 'storage',          '🧼', 10),
  ('Flexible Microfibre Duster',    'flexible-microfibre-duster', 'Reach dust on shelves and other household surfaces.',          499, 'cleaning',         '🪶', 11),
  ('360° Refrigerator Organizer',   'refrigerator-organizer-360', 'Help organize refrigerator items for easier access.',         2199, 'storage',          '🧊', 12)
) as v(name, slug, descr, price, cat, emoji, ord)
join public.categories c on c.slug = v.cat
on conflict (slug) do nothing;

-- DONE. Next: create your admin user (Authentication -> Users -> Add user),
-- then run supabase/make_admin.sql
