export type Category = {
  id: string;
  name: string;
  slug: string;
  emoji: string;
  sort_order: number;
  is_active: boolean;
};

export type Product = {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  compare_at_price: number | null;
  category_id: string | null;
  emoji: string;
  image_url: string | null;
  stock: number | null;
  is_active: boolean;
  is_featured: boolean;
  sort_order: number;
  seller_id?: string | null;
  created_at?: string;
};

export type Settings = {
  store_name: string;
  slogan: string;
  whatsapp_number: string;
  contact_phone: string;
  contact_email: string;
  contact_address: string;
  topbar_left: string;
  topbar_center: string;
  topbar_right: string;
  hero_eyebrow: string;
  hero_title: string;
  hero_text: string;
  hero_button: string;
  banner_title: string;
  banner_text: string;
  products_notice: string;
  footer_text: string;
  delivery_fee: number;
  require_user_approval?: boolean;
};

export type OrderStatus = 'new' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled';

export type Order = {
  id: string;
  order_number: string;
  customer_name: string;
  phone: string;
  address: string;
  city: string;
  payment_method: string;
  customer_notes: string;
  subtotal: number;
  delivery_fee: number;
  total: number;
  status: OrderStatus;
  payment_status: 'unpaid' | 'paid';
  admin_notes: string;
  created_at: string;
};

export type OrderItem = {
  id: string;
  order_id: string;
  product_id: string | null;
  product_name: string;
  unit_price: number;
  quantity: number;
  line_total: number;
  seller_id?: string | null;
  fulfil_status?: OrderStatus;
};

export type ApprovalStatus = 'pending' | 'approved' | 'rejected';

export type Profile = {
  id: string;
  email: string | null;
  full_name: string;
  is_guest: boolean;
  status: ApprovalStatus;
  admin_note: string;
  created_at: string;
};

export type SellerProfile = {
  user_id: string;
  store_name: string;
  owner_name: string;
  phone: string;
  city: string;
  address: string;
  description: string;
  status: ApprovalStatus;
  admin_note: string;
  reviewed_at: string | null;
  created_at: string;
};
