import Flash from '@/components/admin/Flash';
import ProductForm from '@/components/admin/ProductForm';
import { requireAdmin } from '@/lib/auth';
import type { Category } from '@/lib/types';
import { saveProduct } from '../../../actions';

export default async function NewProduct({ searchParams }: { searchParams: { [k: string]: string | string[] | undefined } }) {
  const { supabase } = await requireAdmin();
  const { data } = await supabase.from('categories').select('*').order('sort_order');
  return (
    <>
      <div className="pagehead">
        <h1>New product</h1>
      </div>
      <Flash searchParams={searchParams} />
      <ProductForm categories={(data ?? []) as Category[]} action={saveProduct} />
    </>
  );
}
