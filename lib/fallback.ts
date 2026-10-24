import type { Category, Product, Settings } from './types';

/** Used only while Supabase keys are not configured, so the site still previews correctly. */
export const FALLBACK_SETTINGS: Settings = {
  store_name: 'H & S Home Solutions',
  slogan: 'Better Home • Happier Life',
  whatsapp_number: '923162669126',
  contact_phone: '',
  contact_email: '',
  contact_address: '',
  topbar_left: '🚚 Delivery across Pakistan (charges may apply)',
  topbar_center: '📲 WhatsApp ordering available',
  topbar_right: 'Better Home • Happier Life',
  hero_eyebrow: 'Welcome to H & S Home Solutions',
  hero_title: 'Smart finds for a happier home.',
  hero_text:
    'Discover useful kitchen essentials, clever organizers and everyday home accessories — selected to make life easier.',
  hero_button: 'Shop products →',
  banner_title: 'Need help choosing?',
  banner_text: 'Ask us about a product or send your shopping list on WhatsApp.',
  products_notice:
    'Stock, exact model, final price and delivery charges are confirmed on WhatsApp before an order is accepted.',
  footer_text: 'Useful home and kitchen essentials for everyday living in Pakistan.',
  delivery_fee: 0,
  require_user_approval: false,
};

export const FALLBACK_CATEGORIES: Category[] = [
  { id: 'c1', name: 'Kitchen Tools', slug: 'kitchen-tools', emoji: '🥄', sort_order: 1, is_active: true },
  { id: 'c2', name: 'Storage & Organizers', slug: 'storage', emoji: '🫙', sort_order: 2, is_active: true },
  { id: 'c3', name: 'Dining', slug: 'dining', emoji: '🍽️', sort_order: 3, is_active: true },
  { id: 'c4', name: 'Cleaning', slug: 'cleaning', emoji: '🧽', sort_order: 4, is_active: true },
  { id: 'c5', name: 'Home Accessories', slug: 'home-accessories', emoji: '🏠', sort_order: 5, is_active: true },
];

const p = (
  n: number,
  name: string,
  price: number,
  category_id: string,
  emoji: string,
  description: string,
): Product => ({
  id: `fb-${n}`,
  name,
  slug: `fb-${n}`,
  description,
  price,
  compare_at_price: null,
  category_id,
  emoji,
  image_url: null,
  stock: null,
  is_active: true,
  is_featured: true,
  sort_order: n,
});

export const FALLBACK_PRODUCTS: Product[] = [
  p(1, 'Vegetable Cutter & Slicer', 549, 'c1', '🥕', 'Chop and slice vegetables for everyday meal prep.'),
  p(2, 'Portable Oil Spray Bottle', 279, 'c1', '🫒', 'Spray or pour cooking oil with a handy kitchen bottle.'),
  p(3, 'Mini Manual Chopper', 449, 'c1', '🥬', 'A compact manual helper for chopping small ingredients.'),
  p(4, 'Stainless Steel Sponge Holder', 449, 'c2', '🧽', 'Keep a dish sponge neatly stored near the sink.'),
  p(5, '4-in-1 Multi Grater', 899, 'c1', '🧀', 'A multi-use grater for common kitchen prep tasks.'),
  p(6, 'Zipper Roti Cover', 179, 'c2', '🫓', 'Help keep rotis covered between serving and mealtime.'),
  p(7, 'Egg Beater', 229, 'c1', '🥚', 'A simple tool for beating eggs and mixing ingredients.'),
  p(8, 'Sauce Dipping Plate', 179, 'c3', '🍽️', 'A small serving plate for sauces and dips.'),
  p(9, 'Silicone Sealing Tape', 449, 'c5', '🧰', 'A sealing tape option for suitable household gaps and edges.'),
  p(10, '2-in-1 Foaming Soap Dish', 349, 'c2', '🧼', 'A compact soap and sink-area accessory.'),
  p(11, 'Flexible Microfibre Duster', 499, 'c4', '🪶', 'Reach dust on shelves and other household surfaces.'),
  p(12, '360° Refrigerator Organizer', 2199, 'c2', '🧊', 'Help organize refrigerator items for easier access.'),
];
