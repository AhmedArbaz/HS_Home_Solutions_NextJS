import Flash from '@/components/admin/Flash';
import ProductForm from '@/components/admin/ProductForm';
import { requireSeller } from '@/lib/auth';
import type { Category } from '@/lib/types';
import { saveSellerProduct } from '../../../actions';

export default async function NewSellerProduct({ searchParams }: { searchParams: { [k: string]: string | string[] | undefined } }) {
  const { supabase } = await requireSeller({ approved: true });
  const { data } = await supabase.from('categories').select('*').eq('is_active', true).order('sort_order');
  return (
    <>
      <div className="pagehead">
        <h1>New product</h1>
      </div>
      <Flash searchParams={searchParams} />
      <ProductForm categories={(data ?? []) as Category[]} action={saveSellerProduct} cancelHref="/seller/products" sellerMode />
    </>
  );
}
