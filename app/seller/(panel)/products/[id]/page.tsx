import { notFound } from 'next/navigation';
import Flash from '@/components/admin/Flash';
import ProductForm from '@/components/admin/ProductForm';
import { requireSeller } from '@/lib/auth';
import type { Category, Product } from '@/lib/types';
import { saveSellerProduct } from '../../../actions';

export default async function EditSellerProduct({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { [k: string]: string | string[] | undefined };
}) {
  const { supabase, user } = await requireSeller({ approved: true });
  const [{ data: product }, { data: cats }] = await Promise.all([
    supabase.from('products').select('*').eq('id', params.id).eq('seller_id', user.id).maybeSingle(),
    supabase.from('categories').select('*').eq('is_active', true).order('sort_order'),
  ]);
  if (!product) notFound();
  return (
    <>
      <div className="pagehead">
        <h1>Edit product</h1>
      </div>
      <Flash searchParams={searchParams} />
      <ProductForm
        key={product.id}
        product={product as Product}
        categories={(cats ?? []) as Category[]}
        action={saveSellerProduct}
        cancelHref="/seller/products"
        sellerMode
      />
    </>
  );
}
