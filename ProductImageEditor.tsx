import type { ChangeEvent } from 'react';
import { useState } from 'react';
import { ChevronDown, ChevronUp, Upload, X } from 'lucide-react';
import { inputBase } from '@/components/ui/styles';
import { uploadProductImage } from '@/lib/admin';

const PRODUCT_IMAGE_ACCEPT = 'image/jpeg,image/png,image/webp,image/gif';
const POSITION_LABELS = ['Cover', '2nd', '3rd', '4th', '5th'];
const MAX_IMAGES = 5;

type ProductImageEditorProps = {
  images: string[];
  onImagesChange: (images: string[]) => void;
  onError: (message: string | null) => void;
};

export function ProductImageEditor({ images, onImagesChange, onError }: ProductImageEditorProps) {
  const [uploading, setUploading] = useState(false);

  const updateImage = (index: number, value: string) => {
    onImagesChange(images.map((image, i) => (i === index ? value : image)));
  };

  const removeImage = (index: number) => {
    onImagesChange(images.filter((_, i) => i !== index));
  };

  const moveImage = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= images.length) return;
    const next = [...images];
    [next[index], next[target]] = [next[target], next[index]];
    onImagesChange(next);
  };

  const makeCover = (index: number) => {
    onImagesChange([images[index], ...images.filter((_, i) => i !== index)]);
  };

  const handleUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setUploading(true);
    onError(null);
    try {
      const url = await uploadProductImage(file);
      onImagesChange([...images, url]);
    } catch (err) {
      onError(err instanceof Error ? err.message : 'The image could not be uploaded.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-3">
      <div>
        <p className="text-sm font-medium text-ink">Photos</p>
        <p className="mt-0.5 text-xs text-neutral-500">The first photo is the main image. You can add up to five photos.</p>
      </div>
      <ul className="space-y-2">
        {images.map((image, index) => (
          <li key={index} className="flex items-center gap-3 rounded-md border border-neutral-200 bg-white p-2">
            <span className="w-12 shrink-0 text-center text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
              {POSITION_LABELS[index] ?? `#${index + 1}`}
            </span>
            {image ? (
              <img src={image} alt="" className="h-12 w-12 shrink-0 rounded border border-neutral-200 bg-neutral-100 object-contain" />
            ) : (
              <div className="h-12 w-12 shrink-0 rounded border border-dashed border-neutral-300" />
            )}
            <input
              value={image}
              onChange={(e) => updateImage(index, e.target.value)}
              className={`${inputBase} min-w-0 flex-1`}
              placeholder="https://..."
              aria-label={`Photo ${index + 1} web address`}
            />
            <div className="flex shrink-0 items-center gap-1">
              <button type="button" onClick={() => moveImage(index, -1)} disabled={index === 0} className="rounded p-1.5 text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-ink disabled:opacity-30" aria-label="Move photo up">
                <ChevronUp className="h-4 w-4" />
              </button>
              <button type="button" onClick={() => moveImage(index, 1)} disabled={index === images.length - 1} className="rounded p-1.5 text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-ink disabled:opacity-30" aria-label="Move photo down">
                <ChevronDown className="h-4 w-4" />
              </button>
              {index > 0 && (
                <button type="button" onClick={() => makeCover(index)} className="hidden rounded px-2 py-1 text-xs text-neutral-600 underline underline-offset-2 hover:text-ink sm:block">
                  Make main
                </button>
              )}
              <button type="button" onClick={() => removeImage(index)} className="rounded p-1.5 text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-crimson-500" aria-label="Remove photo">
                <X className="h-4 w-4" />
              </button>
            </div>
          </li>
        ))}
      </ul>
      {images.length < MAX_IMAGES && (
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" onClick={() => onImagesChange([...images, ''])} className="rounded-md border border-neutral-300 px-3 py-2 text-xs font-medium text-neutral-700 transition-colors hover:border-ink hover:text-ink">
            Add web address
          </button>
          <label className={`inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-neutral-300 px-3 py-2 text-xs font-medium text-neutral-700 transition-colors hover:border-ink hover:text-ink ${uploading ? 'pointer-events-none opacity-60' : ''}`}>
            <Upload className="h-3.5 w-3.5" aria-hidden="true" />
            {uploading ? 'Uploading...' : 'Upload from device'}
            <input type="file" accept={PRODUCT_IMAGE_ACCEPT} onChange={handleUpload} disabled={uploading} className="sr-only" />
          </label>
        </div>
      )}
    </div>
  );
}
