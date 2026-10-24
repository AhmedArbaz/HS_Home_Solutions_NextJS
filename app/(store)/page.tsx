import { getStoreData } from '@/lib/data';
import Storefront from '@/components/store/Storefront';

// Re-built at most once a minute; admin changes also trigger an instant refresh (revalidatePath).
export const revalidate = 60;

export default async function HomePage() {
  const { products, categories, settings } = await getStoreData();
  return <Storefront products={products} categories={categories} settings={settings} />;
}
