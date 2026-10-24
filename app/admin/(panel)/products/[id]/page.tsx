import { notFound } from 'next/navigation';
import Flash from '@/components/admin/Flash';
import ProductForm from '@/components/admin/ProductForm';
import { requireAdmin } from '@/lib/auth';
import type { Category, Product } from '@/lib/types';
import { saveProduct } from '../../../actions';

export default async function EditProduct({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { [k: string]: string | string[] | undefined };
}) {
  const { supabase } = await requireAdmin();
  const [{ data: product }, { data: cats }] = await Promise.all([
    supabase.from('products').select('*').eq('id', params.id).maybeSingle(),
    supabase.from('categories').select('*').order('sort_order'),
  ]);
  if (!product) notFound();
  return (
    <>
      <div className="pagehead">
        <h1>Edit product</h1>
      </div>
      <Flash searchParams={searchParams} />
      <ProductForm key={product.id} product={product as Product} categories={(cats ?? []) as Category[]} action={saveProduct} />
    </>
  );
}
