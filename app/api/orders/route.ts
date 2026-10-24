import { NextResponse } from 'next/server';
import { createPublicClient } from '@/lib/supabase/public';
import { createClient } from '@/lib/supabase/server';
import { hasSupabaseEnv } from '@/lib/supabase/env';

export const dynamic = 'force-dynamic';

// Tiny in-memory throttle (per server instance): 6 orders / minute / IP.
const hits = new Map<string, number[]>();
function throttled(ip: string) {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < 60_000);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > 6;
}

type Body = {
  name?: string;
  phone?: string;
  address?: string;
  city?: string;
  payment?: string;
  notes?: string;
  items?: { product_id: string; quantity: number }[];
};

export async function POST(req: Request) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  if (throttled(ip)) {
    return NextResponse.json({ ok: false, error: 'Too many orders. Please wait a minute and try again.' }, { status: 429 });
  }

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid request.' }, { status: 400 });
  }

  const items = Array.isArray(body.items) ? body.items : [];
  if (!body.name || !body.phone || !body.address || items.length === 0) {
    return NextResponse.json({ ok: false, error: 'Please fill in your name, phone, address and add a product.' }, { status: 400 });
  }

  // Supabase not configured yet: order is only sent through WhatsApp.
  if (!hasSupabaseEnv) return NextResponse.json({ ok: true, saved: false });

  // If the visitor is logged in (guest or seller account) the order is linked to their account.
  let supabase = createPublicClient();
  try {
    const session = createClient();
    const {
      data: { user },
    } = await session.auth.getUser();
    if (user) supabase = session;
  } catch {
    /* no valid session -> place the order as an anonymous visitor */
  }
  const { data, error } = await supabase.rpc('create_order', {
    p_name: body.name,
    p_phone: body.phone,
    p_address: body.address,
    p_city: body.city ?? '',
    p_payment: body.payment ?? 'Cash on Delivery',
    p_notes: body.notes ?? '',
    p_items: items.map((i) => ({ product_id: i.product_id, quantity: i.quantity })),
  });

  if (error) {
    const msg = error.message || '';
    if (msg.startsWith('out_of_stock:')) {
      return NextResponse.json({ ok: false, error: `Sorry, "${msg.slice(13)}" does not have enough stock.` }, { status: 409 });
    }
    if (msg.includes('account_blocked')) {
      const pending = msg.includes('pending');
      return NextResponse.json(
        {
          ok: false,
          error: pending
            ? 'Your account is waiting for approval from the store. Please try again later or order on WhatsApp.'
            : 'Your account has been blocked by the store. Please contact us on WhatsApp.',
        },
        { status: 403 },
      );
    }
    if (msg.includes('product_unavailable')) {
      return NextResponse.json({ ok: false, error: 'A product in your cart is no longer available. Please refresh the page.' }, { status: 409 });
    }
    if (msg.includes('invalid_') || error.code === '22P02') {
      return NextResponse.json({ ok: false, error: 'Please check your details (name, phone, address) and try again.' }, { status: 400 });
    }
    console.error('[orders] create_order failed:', error);
    return NextResponse.json({ ok: false, error: 'Could not save the order right now.' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, saved: true, order: data });
}
