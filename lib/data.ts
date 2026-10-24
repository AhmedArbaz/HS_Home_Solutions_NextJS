import { createPublicClient } from './supabase/public';
import { hasSupabaseEnv } from './supabase/env';
import { FALLBACK_CATEGORIES, FALLBACK_PRODUCTS, FALLBACK_SETTINGS } from './fallback';
import type { Category, Product, Settings } from './types';

export type StoreData = {
  products: Product[];
  categories: Category[];
  settings: Settings;
  source: 'supabase' | 'fallback';
};

const fallback = (): StoreData => ({
  products: FALLBACK_PRODUCTS,
  categories: FALLBACK_CATEGORIES,
  settings: FALLBACK_SETTINGS,
  source: 'fallback',
});

export async function getStoreData(): Promise<StoreData> {
  if (!hasSupabaseEnv) return fallback();
  try {
    const supabase = createPublicClient();
    const [prod, cat, set] = await Promise.all([
      supabase.from('products').select('*').eq('is_active', true).order('sort_order').order('created_at'),
      supabase.from('categories').select('*').eq('is_active', true).order('sort_order'),
      supabase.from('site_settings').select('*').eq('id', 1).maybeSingle(),
    ]);
    if (prod.error || cat.error) throw prod.error ?? cat.error;
    return {
      products: (prod.data ?? []) as Product[],
      categories: (cat.data ?? []) as Category[],
      settings: { ...FALLBACK_SETTINGS, ...((set.data as Partial<Settings> | null) ?? {}) },
      source: 'supabase',
    };
  } catch (e) {
    console.error('[store] Supabase read failed, using fallback data:', e);
    return fallback();
  }
}
