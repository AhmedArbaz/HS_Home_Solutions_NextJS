# H&S Home Solutions — Next.js + Supabase

Purani HTML/CSS/JS storefront ab **Next.js 14 (App Router, TypeScript)** mein convert ho chuki hai, saath mein **complete Admin Panel** aur **Supabase database** hai.

## Kya kya milta hai

**Storefront (`/`)** — wahi design jo purani site ka tha, ab database se chalta hai
- Products / categories / texts sab Supabase se aate hain (admin se change karo, site update ho jati hai)
- Search, category filter, cart (browser mein save rehta hai), quantity controls
- Checkout: order **database mein save** hota hai, phir WhatsApp message khulta hai (order number ke saath)
- Price **server par database se** nikalti hai — browser se koi price badal nahi sakta
- Product photo (ya emoji fallback), "Out of stock" / "Only N left" badges, purani price cut-off
- Supabase keys na hon to site built-in sample data se chalti hai (sirf preview ke liye)

**Admin Panel (`/admin`)**
| Page | Kaam |
|---|---|
| Dashboard | Aaj / 7 din / 30 din ki sales, naye orders, 7 din ka chart, low-stock list, recent orders |
| Orders | Search, status tabs, pagination; detail page par status + payment status + internal notes, "WhatsApp customer" button, delete |
| Products | Add / edit / delete, **photo upload**, price, old price, stock, category, visible/featured toggle, search + filters |
| Categories | Add / rename / emoji / order / hide / delete |
| Customers | Orders se automatic list (phone ke hisaab se), total spent |
| Settings | Store name, WhatsApp number, delivery fee, top bar, hero text, banner, footer, contact info |

Order cancel karne par tracked stock wapas add ho jata hai (automatic).

## Setup (step by step)

### 1) Supabase project
1. https://supabase.com par project banayein.
2. **SQL Editor → New query** → `supabase/schema.sql` ka poora content paste karke **Run**.
   (Tables, security rules, order function, image bucket, 12 products + 5 categories sab ban jate hain. Dobara run karna safe hai.)
3. **Authentication → Users → Add user** — apna admin email + password dalein, **Auto Confirm User** tick karein.
4. `supabase/make_admin.sql` kholein, `YOUR_ADMIN_EMAIL@example.com` ki jagah wahi email likhein, SQL Editor mein **Run**.

### 2) Keys (.env)
`.env.example` ko copy karke `.env.local` banayein aur apni keys dalein
(Supabase → Project Settings → API):
```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...   (anon / public key)
NEXT_PUBLIC_SITE_URL=https://your-domain.com
```
**Service-role key ki zaroorat nahi** — is project mein kabhi use nahi hoti. Usay kahin mat daalna.

### 3) Chalayein
```
npm install
npm run dev        # http://localhost:3000   (admin: /admin)
```
Production: `npm run build && npm start`

### 4) Deploy
- **Vercel** (sab se aasan): repo import karein, Environment Variables mein upar wali 3 keys daalein.
- **Netlify** bhi chalega (Next.js runtime ke saath) — wahi 3 environment variables set karein.
- Deploy ke baad Supabase → Authentication → URL Configuration mein apni site ka URL add kar dein.

## Register / Login / Sellers / Approvals (marketplace)
**Setup (ek dafa):**
1. Supabase SQL Editor mein `supabase/schema.sql` (agar pehle nahi chalayi), phir **`supabase/marketplace.sql`** Run karein (dobara run karna safe hai).
2. Supabase -> Authentication -> Sign In / Providers -> Email -> **Confirm email** OFF karein, to register karte hi login ho jaye (ON rakhein to pehle email confirm karni hogi).

**Kaise chalta hai:**
- Store header: **Register**, **Login**, **Become a seller** buttons.
- **Register** (`/account/register`): naam + email + password. Register karne wala DB mein **guest user** (customer) banta hai. Phir **Login** (`/account/login`) se login hota hai; admin ko /admin, seller ko /seller, customer ko store par bheja jata hai. `/account` par apne orders dikhte hain.
- **Become a seller** (`/seller/register`): form + email/password. Register karne wala **seller** banta hai (status *pending*). Pehle se register customer yahi button dabaye to usi account se seller application chali jati hai.
- Admin -> **Sellers**: Accept / Reject (reject par reason). Accept hote hi seller ke products store par aate hain; reject par chhup jate hain.
- Admin -> **Users**: guest users aur sellers ko Accept / Reject. Rejected user order nahi kar sakta. Admin -> Settings -> "new guest users must be accepted" ON karein to har naya customer pehle pending rahega.
- Seller panel (`/seller`): dashboard, apne products (add/edit/delete/photo), apne products ke orders (customer details + status), store profile + password change.
- Ek order mein kai sellers ke products ho sakte hain; har seller sirf apni items dekhta hai, admin sab dekhta hai.

## Admin password (important)
Password code ya `.env` mein **nahi** hota — Supabase Authentication mein hota hai.
- Password bhool gaye / pata nahi: Supabase → SQL Editor → `supabase/set_admin_password.sql` Run karein (naya strong password us file mein likha hai).
- Login ke baad Admin Panel → **Password** (`/admin/account`) se apna password badal lein, phir `set_admin_password.sql` delete kar dein.
- Dusra admin: Authentication → Users → Add user, phir `make_admin.sql` mein email badal kar Run.

## Folder structure
```
app/(store)/        storefront (page, layout, css)
app/admin/          admin panel (login, dashboard, products, orders, ...)
app/api/orders/     order place karne ki API
components/         store/Storefront.tsx, admin/* components
lib/                supabase clients, data loading, helpers
middleware.ts       /admin ko login ke peeche lock karta hai
supabase/           schema.sql, make_admin.sql
legacy/             purana HTML/CSS/JS version (backup)
```

## Security ka khulasa
- `/admin` ke har page aur har action par login + admin check hota hai, aur database ki **Row Level Security** alag se protect karti hai.
- Visitors sirf products/categories/settings **padh** sakte hain. Orders sirf `create_order()` function se ban sakte hain, jo price database se leta hai.
- Naya admin banane ke liye user banayein + `make_admin.sql` chalayein.

## Dhyan dein
- Online payment / courier integration is project mein nahi hai (pehle jaisa) — payment WhatsApp par confirm hoti hai.
- Product prices abhi bhi estimates hain (PROJECT_STATUS.txt dekhein) — live karne se pehle confirm karein.
- Supabase free plan par project inactivity par pause ho sakta hai.
