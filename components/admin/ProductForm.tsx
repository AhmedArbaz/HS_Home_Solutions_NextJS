'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import type { Category, Product } from '@/lib/types';

export default function ProductForm({
  product,
  categories,
  action,
  cancelHref = '/admin/products',
  sellerMode = false,
}: {
  product?: Product;
  categories: Category[];
  action: (fd: FormData) => void | Promise<void>;
  cancelHref?: string;
  sellerMode?: boolean;
}) {
  const [imageUrl, setImageUrl] = useState(product?.image_url ?? '');
  const [uploading, setUploading] = useState(false);
  const [uploadErr, setUploadErr] = useState('');

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadErr('');
    if (!file.type.startsWith('image/')) return setUploadErr('Please choose an image file.');
    if (file.size > 5 * 1024 * 1024) return setUploadErr('Image must be under 5 MB.');

    setUploading(true);
    const supabase = createClient();
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '');
    const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error } = await supabase.storage.from('product-images').upload(path, file, {
      cacheControl: '31536000',
      contentType: file.type,
    });
    if (error) {
      setUploadErr(error.message);
    } else {
      setImageUrl(supabase.storage.from('product-images').getPublicUrl(path).data.publicUrl);
    }
    setUploading(false);
    e.target.value = '';
  }

  return (
    <form action={action} className="card form">
      {product && <input type="hidden" name="id" value={product.id} />}

      <div className="grid2">
        <label className="field">
          <span>Product name *</span>
          <input name="name" required defaultValue={product?.name} placeholder="e.g. Mini Manual Chopper" />
        </label>
        <label className="field">
          <span>Category</span>
          <select name="category_id" defaultValue={product?.category_id ?? ''}>
            <option value="">— No category —</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.emoji} {c.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="field">
        <span>Description</span>
        <textarea name="description" rows={3} defaultValue={product?.description} />
      </label>

      <div className="grid4">
        <label className="field">
          <span>Price (Rs.) *</span>
          <input name="price" type="number" min="0" step="1" required defaultValue={product?.price} />
        </label>
        <label className="field">
          <span>Old price (optional)</span>
          <input name="compare_at_price" type="number" min="0" step="1" defaultValue={product?.compare_at_price ?? ''} />
        </label>
        <label className="field">
          <span>Stock</span>
          <input
            name="stock"
            type="number"
            min="0"
            step="1"
            defaultValue={product?.stock ?? ''}
            placeholder="Leave empty = not tracked"
          />
        </label>
        {!sellerMode && (
          <label className="field">
            <span>Sort order</span>
            <input name="sort_order" type="number" step="1" defaultValue={product?.sort_order ?? 0} />
          </label>
        )}
      </div>

      <div className="imgbox">
        <div className="imgprev">
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imageUrl} alt="Product" />
          ) : (
            <span>{product?.emoji || '🛍️'}</span>
          )}
        </div>
        <div className="imgctl">
          <span className="lbl">Product photo</span>
          <input type="file" accept="image/*" onChange={onFile} disabled={uploading} />
          {uploading && <small>Uploading…</small>}
          {uploadErr && <small className="err">{uploadErr}</small>}
          <input
            name="image_url"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="…or paste an image URL"
          />
          {imageUrl && (
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setImageUrl('')}>
              Remove photo
            </button>
          )}
          <small>No photo? The emoji below is shown instead.</small>
        </div>
      </div>

      <div className="grid4">
        <label className="field">
          <span>Emoji (fallback icon)</span>
          <input name="emoji" defaultValue={product?.emoji ?? '🛍️'} maxLength={8} />
        </label>
        <label className="field">
          <span>URL slug (optional)</span>
          <input name="slug" defaultValue={product?.slug} placeholder="auto from name" />
        </label>
        <label className="check">
          <input type="checkbox" name="is_active" defaultChecked={product?.is_active ?? true} />
          <span>Visible in store</span>
        </label>
        {!sellerMode && (
          <label className="check">
            <input type="checkbox" name="is_featured" defaultChecked={product?.is_featured ?? true} />
            <span>Featured</span>
          </label>
        )}
      </div>

      <div className="actions">
        <button className="btn btn-primary" type="submit" disabled={uploading}>
          {product ? 'Save changes' : 'Create product'}
        </button>
        <Link className="btn btn-ghost" href={cancelHref}>
          Cancel
        </Link>
      </div>
    </form>
  );
}
