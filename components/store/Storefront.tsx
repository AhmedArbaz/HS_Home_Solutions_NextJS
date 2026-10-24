'use client';

import { useEffect, useMemo, useState } from 'react';
import type { Category, Product, Settings } from '@/lib/types';
import { money, waNumber } from '@/lib/utils';
import AuthBar from './AuthBar';

type Props = { products: Product[]; categories: Category[]; settings: Settings };
type CartEntry = { id: string; qty: number };
type Success = { orderNumber: string | null; waUrl: string; saved: boolean };

const CART_KEY = 'hs_cart_v1';

export default function Storefront({ products, categories, settings }: Props) {
  const [query, setQuery] = useState('');
  const [activeCat, setActiveCat] = useState('');
  const [cart, setCart] = useState<CartEntry[]>([]);
  const [ready, setReady] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [payment, setPayment] = useState('Cash on Delivery');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState<Success | null>(null);

  const wa = waNumber(settings.whatsapp_number);
  const catById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);

  // ---- cart persistence (browser only) ----
  useEffect(() => {
    try {
      const raw = localStorage.getItem(CART_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as CartEntry[];
        setCart(parsed.filter((e) => products.some((p) => p.id === e.id) && e.qty > 0));
      }
    } catch {
      /* ignore broken storage */
    }
    setReady(true);
  }, [products]);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(CART_KEY, JSON.stringify(cart));
    } catch {
      /* ignore */
    }
  }, [cart, ready]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setCartOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // ---- derived data ----
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter((p) => {
      if (activeCat && p.category_id !== activeCat) return false;
      if (!q) return true;
      const cat = p.category_id ? catById.get(p.category_id)?.name ?? '' : '';
      return `${p.name} ${cat} ${p.description}`.toLowerCase().includes(q);
    });
  }, [products, query, activeCat, catById]);

  const lines = useMemo(
    () =>
      cart
        .map((e) => ({ product: products.find((p) => p.id === e.id), qty: e.qty }))
        .filter((l): l is { product: Product; qty: number } => Boolean(l.product)),
    [cart, products],
  );
  const count = lines.reduce((s, l) => s + l.qty, 0);
  const subtotal = lines.reduce((s, l) => s + l.product.price * l.qty, 0);
  const deliveryFee = Number(settings.delivery_fee) || 0;
  const total = subtotal + (lines.length ? deliveryFee : 0);

  // ---- cart actions ----
  const maxFor = (p: Product) => (p.stock === null ? 100 : Math.min(100, p.stock));

  function addToCart(p: Product) {
    setCart((c) => {
      const item = c.find((x) => x.id === p.id);
      if (item) return c.map((x) => (x.id === p.id ? { ...x, qty: Math.min(x.qty + 1, maxFor(p)) } : x));
      return [...c, { id: p.id, qty: 1 }];
    });
  }

  function changeQty(p: Product, d: number) {
    setCart((c) =>
      c
        .map((x) => (x.id === p.id ? { ...x, qty: Math.min(x.qty + d, maxFor(p)) } : x))
        .filter((x) => x.qty > 0),
    );
  }

  function openWhatsApp(text: string) {
    window.open(`https://wa.me/${wa}?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
  }

  function scrollToShop() {
    document.getElementById('shop')?.scrollIntoView({ behavior: 'smooth' });
  }

  function buildMessage(orderNumber: string | null, orderTotal: number, fee: number) {
    const itemLines = lines
      .map((l) => `- ${l.product.name} x ${l.qty} = ${money(l.product.price * l.qty)}`)
      .join('\n');
    return (
      `Assalam-o-Alaikum ${settings.store_name}, I want to place an order:\n` +
      (orderNumber ? `Order No: ${orderNumber}\n` : '') +
      `\n${itemLines}\n\n` +
      (fee > 0 ? `Delivery: ${money(fee)}\n` : '') +
      `Estimated total: ${money(orderTotal)}\n` +
      `Payment: ${payment}\n\n` +
      `Customer: ${name.trim()}\nPhone: ${phone.trim()}\n` +
      `Address: ${address.trim()}${city.trim() ? ', ' + city.trim() : ''}\n` +
      (notes.trim() ? `Notes: ${notes.trim()}\n` : '') +
      `\nPlease confirm stock, final price and delivery charges before accepting this order.`
    );
  }

  async function checkout() {
    setError('');
    if (!lines.length) return setError('Please add a product to your cart first.');
    if (!name.trim() || !phone.trim() || !address.trim())
      return setError('Please enter your name, phone number and delivery address.');

    setSubmitting(true);
    let orderNumber: string | null = null;
    let orderTotal = total;
    let fee = lines.length ? deliveryFee : 0;
    let saved = false;

    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          phone,
          address,
          city,
          payment,
          notes,
          items: lines.map((l) => ({ product_id: l.product.id, quantity: l.qty })),
        }),
      });
      const data = await res.json().catch(() => ({}));

      if (res.ok && data.ok) {
        if (data.saved && data.order) {
          saved = true;
          orderNumber = data.order.order_number;
          orderTotal = Number(data.order.total);
          fee = Number(data.order.delivery_fee);
        }
      } else if (res.status >= 400 && res.status < 500) {
        // Validation / stock problem — the customer must fix something.
        setError(data.error || 'Could not place the order. Please check your details.');
        setSubmitting(false);
        return;
      }
      // 5xx or network trouble falls through: still let the customer order on WhatsApp.
    } catch {
      /* offline / server error → WhatsApp-only order */
    }

    const waUrl = `https://wa.me/${wa}?text=${encodeURIComponent(buildMessage(orderNumber, orderTotal, fee))}`;
    setSuccess({ orderNumber, waUrl, saved });
    setCart([]);
    setSubmitting(false);
    window.open(waUrl, '_blank', 'noopener'); // may be blocked by the browser — the button below is the fallback
  }

  function closeCart() {
    setCartOpen(false);
    setSuccess(null);
    setError('');
  }

  const logo = <span className="logo">⌂</span>;

  return (
    <>
      <div className="top">
        {settings.topbar_left && <span>{settings.topbar_left}</span>}
        {settings.topbar_center && <span>{settings.topbar_center}</span>}
        {settings.topbar_right && <span>{settings.topbar_right}</span>}
      </div>

      <header className="nav">
        <a className="brand" href="#home">
          {logo}
          <span>
            <strong>{settings.store_name}</strong>
            <small>{settings.slogan}</small>
          </span>
        </a>
        <form
          className="search"
          onSubmit={(e) => {
            e.preventDefault();
            scrollToShop();
          }}
        >
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search products..."
            aria-label="Search products"
          />
          <button type="submit" aria-label="Search">
            ⌕
          </button>
        </form>
        <AuthBar />
        <nav className="navlinks">
          <a href="#home">Home</a>
          <a href="#shop">Shop</a>
          <a href="#categories">Categories</a>
          <a href="#contact">Contact</a>
        </nav>
      </header>

      <main id="home">
        <section className="hero">
          <div>
            <div className="eyebrow">{settings.hero_eyebrow}</div>
            <h1>{settings.hero_title}</h1>
            <p>{settings.hero_text}</p>
            <a className="btn" href="#shop">
              {settings.hero_button}
            </a>
            <div className="trust">
              <span>🚚 Pakistan delivery</span>
              <span>🛡️ Cash on Delivery (confirm first)</span>
              <span>💬 WhatsApp support</span>
            </div>
          </div>
          <div className="heroart" aria-label="Kitchen essentials illustration">
            🍳 🫙 🌿
          </div>
        </section>

        {categories.length > 0 && (
          <section className="section" id="categories">
            <div className="sectionhead">
              <div>
                <h2>Shop by category</h2>
                <p>Find the little things that make home work better.</p>
              </div>
            </div>
            <div className="categories">
              {categories.map((c) => (
                <button
                  key={c.id}
                  className={`category${activeCat === c.id ? ' active' : ''}`}
                  onClick={() => {
                    setActiveCat(c.id);
                    scrollToShop();
                  }}
                >
                  <span className="emoji">{c.emoji}</span>
                  {c.name}
                </button>
              ))}
            </div>
          </section>
        )}

        <section className="section" id="shop">
          <div className="sectionhead">
            <div>
              <h2>Featured products</h2>
              <p>Shortlisted home essentials — please confirm availability and delivery charges on WhatsApp.</p>
            </div>
            <button
              className="btn secondary"
              style={{ borderRadius: 8 }}
              onClick={() => {
                setActiveCat('');
                setQuery('');
              }}
            >
              View all
            </button>
          </div>
          {settings.products_notice && <p className="notice">{settings.products_notice}</p>}

          <div className="products">
            {visible.length === 0 && <p>No products found. Try another search.</p>}
            {visible.map((p) => {
              const out = p.stock !== null && p.stock <= 0;
              const low = p.stock !== null && p.stock > 0 && p.stock <= 5;
              return (
                <article className="product" key={p.id}>
                  <div className="productvisual" aria-label={p.image_url ? p.name : 'Illustrative product icon'}>
                    {p.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.image_url} alt={p.name} loading="lazy" />
                    ) : (
                      p.emoji
                    )}
                    {out && <span className="tag out">Out of stock</span>}
                    {low && <span className="tag low">Only {p.stock} left</span>}
                  </div>
                  <div className="productbody">
                    <h3>{p.name}</h3>
                    <small>{p.description}</small>
                    <div className="price">
                      {money(p.price)}
                      {p.compare_at_price && p.compare_at_price > p.price && <s>{money(p.compare_at_price)}</s>}
                    </div>
                    <button className="btn" disabled={out} onClick={() => addToCart(p)}>
                      {out ? 'Out of stock' : 'Add to cart'}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <section className="banner" id="contact">
          <div>
            <h2>{settings.banner_title}</h2>
            <p>{settings.banner_text}</p>
          </div>
          <button
            className="btn"
            style={{ borderRadius: 8 }}
            onClick={() => openWhatsApp(`Assalam-o-Alaikum ${settings.store_name}! I have a question about your products.`)}
          >
            Chat on WhatsApp ↗
          </button>
        </section>
      </main>

      <footer>
        <div>
          <div className="brand">
            <span className="logo" style={{ background: '#fff' }}>
              ⌂
            </span>
            <span>
              <strong style={{ color: 'white' }}>{settings.store_name}</strong>
              <small style={{ color: '#d4e5dc' }}>{settings.slogan}</small>
            </span>
          </div>
          <p>{settings.footer_text}</p>
        </div>
        <div>
          <div className="foothead">Quick links</div>
          <a href="#home">Home</a>
          <br />
          <a href="#shop">Shop products</a>
          <br />
          <a href="#categories">Categories</a>
        </div>
        <div>
          <div className="foothead">Customer care</div>
          <p>
            Cash on Delivery
            <br />
            Payment method confirmed on WhatsApp
            <br />
            Delivery fees confirmed at checkout
            {settings.contact_phone && (
              <>
                <br />
                📞 {settings.contact_phone}
              </>
            )}
            {settings.contact_email && (
              <>
                <br />
                ✉️ {settings.contact_email}
              </>
            )}
            {settings.contact_address && (
              <>
                <br />
                📍 {settings.contact_address}
              </>
            )}
          </p>
          <p>
            © {new Date().getFullYear()} {settings.store_name}
          </p>
        </div>
      </footer>

      <button className="cartbar" onClick={() => setCartOpen(true)}>
        🛒 Cart ({ready ? count : 0})
      </button>

      {cartOpen && (
        <div
          className="overlay"
          style={{ display: 'flex' }}
          role="dialog"
          aria-modal="true"
          aria-label="Shopping cart"
          onClick={(e) => e.target === e.currentTarget && closeCart()}
        >
          <div className="modal">
            <div className="modalhead">
              <h2>{success ? 'Order' : 'Your cart'}</h2>
              <button className="close" onClick={closeCart} aria-label="Close">
                ✕
              </button>
            </div>

            {success ? (
              <div className="success">
                <div className="tick">✅</div>
                <h3>{success.saved ? 'Order received!' : 'Almost done!'}</h3>
                {success.orderNumber && <div className="ordno">{success.orderNumber}</div>}
                <p className="notice">
                  {success.saved
                    ? 'Your order has been saved. Please send the WhatsApp message so we can confirm stock, final price and delivery.'
                    : 'Please send the WhatsApp message to place your order — we will confirm stock, final price and delivery there.'}
                </p>
                <a className="btn block" href={success.waUrl} target="_blank" rel="noopener noreferrer">
                  Send order on WhatsApp
                </a>
                <button className="btn secondary block" onClick={closeCart}>
                  Continue shopping
                </button>
              </div>
            ) : (
              <>
                <div>
                  {lines.length === 0 ? (
                    <p className="empty">Your cart is empty. Add a product to get started.</p>
                  ) : (
                    <>
                      {lines.map(({ product: p, qty }) => (
                        <div className="cartline" key={p.id}>
                          <div>
                            <strong>{p.name}</strong>
                            <br />
                            <small>{money(p.price)} each</small>
                          </div>
                          <div className="qty">
                            <button onClick={() => changeQty(p, -1)} aria-label="Decrease">
                              −
                            </button>
                            {qty}
                            <button onClick={() => changeQty(p, 1)} aria-label="Increase">
                              +
                            </button>
                          </div>
                          <strong>{money(p.price * qty)}</strong>
                        </div>
                      ))}
                      {deliveryFee > 0 && (
                        <div className="deliveryline">
                          <span>Delivery</span>
                          <span>{money(deliveryFee)}</span>
                        </div>
                      )}
                      <p>
                        <strong>Total: {money(total)}</strong>
                      </p>
                    </>
                  )}
                </div>

                <div className="field">
                  <label htmlFor="customerName">Your name</label>
                  <input id="customerName" value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" />
                </div>
                <div className="formrow">
                  <div className="field">
                    <label htmlFor="customerPhone">Phone number</label>
                    <input
                      id="customerPhone"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="03xx xxxxxxx"
                      inputMode="tel"
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="customerCity">City</label>
                    <input id="customerCity" value={city} onChange={(e) => setCity(e.target.value)} placeholder="Karachi" />
                  </div>
                </div>
                <div className="field">
                  <label htmlFor="customerAddress">Delivery address</label>
                  <textarea
                    id="customerAddress"
                    rows={2}
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="House, street, area"
                  />
                </div>
                <div className="field">
                  <label htmlFor="customerNotes">Order notes (optional)</label>
                  <input id="customerNotes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Anything we should know?" />
                </div>
                <div className="field">
                  <label htmlFor="paymentMethod">Payment method</label>
                  <select id="paymentMethod" value={payment} onChange={(e) => setPayment(e.target.value)}>
                    <option>Cash on Delivery</option>
                    <option>Online payment (confirm details on WhatsApp)</option>
                  </select>
                </div>
                <p className="notice">
                  Online payment is not processed automatically. Confirm payment instructions directly with the store
                  before paying.
                </p>
                {error && <div className="errbox">{error}</div>}
                <button className="btn block" disabled={submitting} onClick={checkout}>
                  {submitting ? 'Placing order…' : 'Send order on WhatsApp'}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
