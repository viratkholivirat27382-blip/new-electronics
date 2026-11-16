import { useState, type ChangeEvent } from 'react';
import { ArrowLeft, Trash2, Upload, X } from 'lucide-react';
import { buttonOutline, buttonPrimary, inputBase, labelBase } from '@/components/ui/styles';
import {
  createCategory,
  createSubcategory,
  deleteSubcategory,
  renameSubcategory,
  updateCategory,
  uploadProductImage,
  type AdminProduct,
} from '@/lib/admin';
import type { CategoryDef, Subcategory } from '@/lib/categories';

const PRODUCT_IMAGE_ACCEPT = 'image/jpeg,image/png,image/webp,image/gif';

type CategoryEditorProps = {
  category: CategoryDef | null;
  products: AdminProduct[];
  onBack: () => void;
  onCatalogChanged: () => void;
};

type SubcategoryRowProps = {
  subcategory: Subcategory;
  productCount: number;
  busy: boolean;
  onRename: (id: string, name: string) => void;
  onDelete: (subcategory: Subcategory) => void;
};

function SubcategoryRow({ subcategory, productCount, busy, onRename, onDelete }: SubcategoryRowProps) {
  const [name, setName] = useState(subcategory.name);
  const changed = name.trim() !== subcategory.name && name.trim() !== '';

  return (
    <li className="flex flex-wrap items-center gap-2 border-b border-neutral-200 py-3">
      <input
        value={name}
        onChange={(event) => setName(event.target.value)}
        aria-label={`Subcategory name for ${subcategory.name}`}
        className={`${inputBase} min-w-0 flex-1`}
      />
      <span className="shrink-0 text-xs text-neutral-500">{productCount} {productCount === 1 ? 'product' : 'products'}</span>
      {changed && (
        <button type="button" onClick={() => onRename(subcategory.id, name.trim())} disabled={busy} className={`${buttonOutline} px-3 py-2`}>
          Rename
        </button>
      )}
      <button
        type="button"
        onClick={() => onDelete(subcategory)}
        disabled={busy || productCount > 0}
        title={productCount > 0 ? 'Move its products to another subcategory first' : 'Delete subcategory'}
        aria-label={`Delete ${subcategory.name}`}
        className="p-2 text-neutral-400 transition-colors hover:text-crimson-500 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </li>
  );
}

export function CategoryEditor({ category, products, onBack, onCatalogChanged }: CategoryEditorProps) {
  const [name, setName] = useState(category?.label ?? '');
  const [description, setDescription] = useState(category?.description ?? '');
  const [imageUrl, setImageUrl] = useState(category?.image_url ?? '');
  const [newSubcategory, setNewSubcategory] = useState('');
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const runAction = async (action: () => Promise<void>, fallback: string, successMessage: string | null): Promise<boolean> => {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await action();
      onCatalogChanged();
      if (successMessage) setNotice(successMessage);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : fallback);
      return false;
    } finally {
      setBusy(false);
    }
  };

  const categoryPhotos = category
    ? Array.from(new Set(products.filter((p) => p.category === category.slug).flatMap((p) => p.images))).slice(0, 12)
    : [];

  const countFor = (subcategoryName: string) =>
    category ? products.filter((p) => p.category === category.slug && p.subcategory === subcategoryName).length : 0;

  const saveCategory = async () => {
    const cleanName = name.trim();
    const cleanImage = imageUrl.trim();
    if (!cleanName) {
      setError('Category name is required.');
      return;
    }
    if (cleanImage && !cleanImage.startsWith('https://') && !cleanImage.startsWith('/')) {
      setError('The image link must start with https:// or /images/');
      return;
    }
    const input = { name: cleanName, description: description.trim(), image_url: cleanImage || null };
    if (category) {
      await runAction(() => updateCategory(category.slug, input), 'Category could not be saved.', 'Category saved.');
      return;
    }
    const created = await runAction(() => createCategory(input).then(() => undefined), 'Category could not be created.', null);
    if (created) onBack();
  };

  const handleImageUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      setImageUrl(await uploadProductImage(file));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The image could not be uploaded.');
    } finally {
      setUploading(false);
    }
  };

  const addSubcategory = async () => {
    const cleanName = newSubcategory.trim();
    if (!category || !cleanName) return;
    const added = await runAction(() => createSubcategory(category.slug, cleanName), 'Subcategory could not be added.', 'Subcategory added.');
    if (added) setNewSubcategory('');
  };

  const renameSub = (id: string, nextName: string) => {
    void runAction(() => renameSubcategory(id, nextName), 'Subcategory could not be renamed.', 'Subcategory renamed.');
  };

  const removeSub = (subcategory: Subcategory) => {
    if (!window.confirm(`Delete the subcategory "${subcategory.name}"?`)) return;
    void runAction(() => deleteSubcategory(subcategory.id), 'Subcategory could not be deleted.', 'Subcategory deleted.');
  };

  return (
    <div className="space-y-8">
      <button type="button" onClick={onBack} className="inline-flex items-center gap-2 text-sm font-medium text-neutral-600 transition-colors hover:text-ink">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back to categories
      </button>

      <section className="space-y-5">
        <h3 className="font-serif text-xl text-ink">{category ? 'Category details' : 'New category'}</h3>
        <div className="grid gap-5 md:grid-cols-[1fr_220px]">
          <div className="space-y-4">
            <div>
              <label htmlFor="category-name" className={labelBase}>Name</label>
              <input id="category-name" value={name} onChange={(e) => setName(e.target.value)} className={inputBase} />
            </div>
            <div>
              <label htmlFor="category-description" className={labelBase}>Description</label>
              <input id="category-description" value={description} onChange={(e) => setDescription(e.target.value)} className={inputBase} />
            </div>
            <div>
              <label htmlFor="category-image" className={labelBase}>Image link (https)</label>
              <div className="flex gap-2">
                <input id="category-image" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} className={inputBase} placeholder="https://..." />
                {imageUrl && (
                  <button type="button" onClick={() => setImageUrl('')} className="shrink-0 text-neutral-400 hover:text-crimson-400" aria-label="Remove category image">
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              <label className={`mt-3 inline-flex cursor-pointer items-center gap-1.5 text-xs text-neutral-600 underline hover:text-ink ${uploading ? 'pointer-events-none opacity-60' : ''}`}>
                <Upload className="h-3.5 w-3.5" aria-hidden="true" />
                {uploading ? 'Uploading...' : 'Upload image from device'}
                <input type="file" accept={PRODUCT_IMAGE_ACCEPT} onChange={handleImageUpload} disabled={uploading} className="sr-only" />
              </label>
              {categoryPhotos.length > 0 && (
                <div className="mt-4">
                  <p className={labelBase}>Or choose a product photo</p>
                  <div className="mt-2 grid grid-cols-4 gap-2">
                    {categoryPhotos.map((src) => (
                      <button
                        key={src}
                        type="button"
                        onClick={() => setImageUrl(src)}
                        aria-label="Use this photo as the category image"
                        aria-pressed={imageUrl === src}
                        className={`overflow-hidden rounded border-2 bg-neutral-100 transition-colors ${imageUrl === src ? 'border-lime-400' : 'border-transparent hover:border-neutral-300'}`}
                      >
                        <img src={src} alt="" className="h-auto w-full object-contain" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
          <div>
            <p className={labelBase}>Preview</p>
            <div className="aspect-[4/3] overflow-hidden rounded-lg border border-neutral-200 bg-neutral-100">
              {imageUrl.trim() ? (
                <img src={imageUrl.trim()} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center text-xs text-neutral-400">No image</div>
              )}
            </div>
          </div>
        </div>
        <div className="flex justify-end">
          <button type="button" onClick={saveCategory} disabled={busy || uploading} className={`${buttonPrimary} px-4 py-2`}>
            {category ? 'Save category' : 'Create category'}
          </button>
        </div>
      </section>

      {category && (
        <section className="space-y-4">
          <div>
            <h3 className="font-serif text-xl text-ink">Subcategories</h3>
            <p className="mt-1 text-sm text-neutral-600">Renaming a subcategory updates every product in it.</p>
          </div>
          {category.subcategories.length === 0 ? (
            <p className="text-sm text-neutral-500">No subcategories yet.</p>
          ) : (
            <ul>
              {category.subcategories.map((sub) => (
                <SubcategoryRow
                  key={sub.id}
                  subcategory={sub}
                  productCount={countFor(sub.name)}
                  busy={busy}
                  onRename={renameSub}
                  onDelete={removeSub}
                />
              ))}
            </ul>
          )}
          <div className="flex gap-2">
            <input
              value={newSubcategory}
              onChange={(e) => setNewSubcategory(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void addSubcategory(); } }}
              className={inputBase}
              placeholder="New subcategory name"
              aria-label="New subcategory name"
            />
            <button type="button" onClick={addSubcategory} disabled={busy || !newSubcategory.trim()} className={`${buttonOutline} shrink-0 px-4 py-2`}>
              Add
            </button>
          </div>
        </section>
      )}

      {error && <p role="alert" className="border-l-2 border-crimson-500 pl-3 text-sm text-crimson-400">{error}</p>}
      {notice && <p role="status" className="border-l-2 border-lime-500 pl-3 text-sm text-ink">{notice}</p>}
    </div>
  );
}
