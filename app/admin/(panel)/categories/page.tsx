import Flash from '@/components/admin/Flash';
import ConfirmButton from '@/components/admin/ConfirmButton';
import { requireAdmin } from '@/lib/auth';
import type { Category } from '@/lib/types';
import { deleteCategory, saveCategory } from '../../actions';

export default async function CategoriesPage({ searchParams }: { searchParams: { [k: string]: string | string[] | undefined } }) {
  const { supabase } = await requireAdmin();
  const [{ data }, { data: prods }] = await Promise.all([
    supabase.from('categories').select('*').order('sort_order'),
    supabase.from('products').select('category_id'),
  ]);
  const categories = (data ?? []) as Category[];
  const counts = new Map<string, number>();
  (prods ?? []).forEach((p) => p.category_id && counts.set(p.category_id, (counts.get(p.category_id) ?? 0) + 1));

  return (
    <>
      <div className="pagehead">
        <h1>Categories</h1>
      </div>
      <Flash searchParams={searchParams} />

      <section className="card">
        <h2>Add category</h2>
        <form action={saveCategory} className="inline">
          <input name="emoji" defaultValue="🏠" className="w-emoji" maxLength={8} aria-label="Emoji" />
          <input name="name" required placeholder="Category name" aria-label="Name" />
          <input name="sort_order" type="number" defaultValue={categories.length + 1} className="w-num" aria-label="Order" />
          <label className="check">
            <input type="checkbox" name="is_active" defaultChecked />
            <span>Visible</span>
          </label>
          <button className="btn btn-primary">Add</button>
        </form>
      </section>

      <section className="card">
        <h2>All categories</h2>
        {categories.length === 0 && <p className="muted">No categories yet.</p>}
        {categories.map((c) => (
          <form key={c.id} action={saveCategory} className="inline row">
            <input type="hidden" name="id" value={c.id} />
            <input name="emoji" defaultValue={c.emoji} className="w-emoji" maxLength={8} aria-label="Emoji" />
            <input name="name" defaultValue={c.name} required aria-label="Name" />
            <input name="sort_order" type="number" defaultValue={c.sort_order} className="w-num" aria-label="Order" />
            <label className="check">
              <input type="checkbox" name="is_active" defaultChecked={c.is_active} />
              <span>Visible</span>
            </label>
            <small className="muted nowrap">{counts.get(c.id) ?? 0} products</small>
            <button className="btn btn-ghost btn-sm">Save</button>
            <ConfirmButton
              className="btn btn-danger btn-sm"
              formAction={deleteCategory}
              message={`Delete "${c.name}"? Its products will stay but become uncategorised.`}
            >
              Delete
            </ConfirmButton>
          </form>
        ))}
      </section>
    </>
  );
}
