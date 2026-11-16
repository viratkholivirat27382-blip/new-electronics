import { supabase } from '@/lib/supabase';
import type { InputRule, PaymentBrand } from '@/lib/orders';

export type AdminProduct = {
  slug: string;
  name: string;
  sku: string;
  category: string;
  subcategory: string;
  audience: string;
  short_description: string;
  description: string;
  price: number;
  compare_at_price: number | null;
  sizes: string[];
  colors: string[];
  images: string[];
  stock: number;
  status: string;
  is_new: boolean;
  is_featured: boolean;
  is_best_seller: boolean;
};

export type ProductDraft = {
  slug: string;
  name: string;
  category: string;
  price: number;
  compare_at_price: number | null;
  subcategory: string;
  audience: string;
  short_description: string;
  description: string;
  sku: string;
  sizes: string[];
  colors: string[];
  images: string[];
  is_new: boolean;
  is_featured: boolean;
  is_best_seller: boolean;
  status: string;
};

export type AdminOrderItem = {
  slug: string;
  name: string;
  sku: string;
  image: string;
  size: string;
  color: string;
  quantity: number;
  unit_price: number;
  line_total: number;
};

export type AdminOrder = {
  order_number: string;
  status: string;
  payment_method: string;
  payment_status: string;
  bank_transfer_details: {
    sender_name?: string;
    amount?: number;
    proof_image?: string;
  } | null;
  email: string;
  first_name: string;
  last_name: string;
  total: number;
  created_at: string;
  items: AdminOrderItem[];
};

export type AdminCustomer = {
  email: string;
  name: string;
  orderCount: number;
  totalSpent: number;
  lastOrderAt: string;
};

export type AdminPaymentField = {
  id: string;
  field_key: string;
  label: string;
  placeholder: string;
  required: boolean;
  sort_order: number;
  input_rule: InputRule;
};

export type AdminBrandRule = {
  id: string;
  brand: PaymentBrand;
  starting_digits: string;
};

export type AdminPaymentRecord = {
  order_number: string;
  card_brand: string;
  details: Record<string, string>;
  created_at: string;
};

export type AdminVisitorCountry = {
  country: string;
  visitors: number;
};

export type AdminDashboard = {
  visits_total: number;
  visits_today: number;
  visits_7d: number;
  visitor_countries: AdminVisitorCountry[];
  products: AdminProduct[];
  orders: AdminOrder[];
  payment_fields: AdminPaymentField[];
  payments: AdminPaymentRecord[];
  brand_rules: AdminBrandRule[];
};

export async function fetchAdminDashboard(): Promise<AdminDashboard> {
  const { data, error } = await supabase.rpc('admin_dashboard');
  if (error || !data || typeof data !== 'object') {
    throw new Error('We could not load the admin data. Please try again.');
  }
  const raw = data as AdminDashboard;
  return {
    visits_total: Number(raw.visits_total),
    visits_today: Number(raw.visits_today),
    visits_7d: Number(raw.visits_7d),
    visitor_countries: (raw.visitor_countries ?? []).map((country) => ({ ...country, visitors: Number(country.visitors) })),
    products: raw.products.map((product) => ({
      ...product,
      subcategory: product.subcategory ?? '',
      audience: product.audience ?? 'all',
      short_description: product.short_description ?? '',
      description: product.description ?? '',
      sizes: product.sizes ?? [],
      colors: product.colors ?? [],
      images: product.images ?? [],
      is_new: product.is_new ?? false,
      is_featured: product.is_featured ?? false,
      is_best_seller: product.is_best_seller ?? false,
      price: Number(product.price),
      compare_at_price: product.compare_at_price === null ? null : Number(product.compare_at_price),
      stock: Number(product.stock),
    })),
    orders: raw.orders.map((order) => ({
      ...order,
      items: Array.isArray(order.items) ? order.items : [],
      total: Number(order.total),
    })),
    payment_fields: raw.payment_fields ?? [],
    payments: raw.payments ?? [],
    brand_rules: raw.brand_rules ?? [],
  };
}

export async function approveBankTransfer(orderNumber: string) {
  const { error } = await supabase.rpc('admin_approve_bank_transfer', { p_order_number: orderNumber });
  if (error) throw new Error(error.message.replace(/^.*?:\s*/, '') || 'Bank transfer could not be approved.');
}

export function emptyProductDraft(category: string): ProductDraft {
  return {
    slug: '',
    name: '',
    category,
    price: 0,
    compare_at_price: null,
    subcategory: '',
    audience: 'all',
    short_description: '',
    description: '',
    sku: '',
    sizes: [],
    colors: [],
    images: [],
    is_new: false,
    is_featured: false,
    is_best_seller: false,
    status: 'active',
  };
}

export function validateProductDraft(draft: ProductDraft): string | null {
  if (!draft.name.trim() || !draft.category.trim() || !Number.isFinite(draft.price) || draft.price < 0) {
    return 'Title, category and a valid price are required.';
  }
  if (draft.compare_at_price !== null && (!Number.isFinite(draft.compare_at_price) || draft.compare_at_price < 0)) {
    return 'Compare price must be a valid positive number.';
  }
  if (draft.images.map((url) => url.trim()).filter(Boolean).length > 5) {
    return 'A product can have at most 5 images.';
  }
  return null;
}

export async function createProduct(product: ProductDraft, stock: number): Promise<string> {
  const { data, error } = await supabase.rpc('admin_create_product', {
    p_name: product.name,
    p_category: product.category,
    p_price: product.price,
    p_compare_at_price: product.compare_at_price,
    p_subcategory: product.subcategory,
    p_audience: product.audience,
    p_short_description: product.short_description,
    p_description: product.description,
    p_sku: product.sku,
    p_sizes: product.sizes,
    p_colors: product.colors,
    p_images: product.images.map((url) => url.trim()).filter(Boolean),
    p_is_new: product.is_new,
    p_is_featured: product.is_featured,
    p_is_best_seller: product.is_best_seller,
    p_status: product.status,
    p_stock: stock,
  });
  if (error || typeof data !== 'string') {
    throw new Error(error?.message.replace(/^.*?:\s*/, '') || 'Product could not be created.');
  }
  return data;
}

export async function updateProduct(product: ProductDraft) {
  const { error } = await supabase.rpc('admin_update_product', {
    p_slug: product.slug,
    p_name: product.name,
    p_category: product.category,
    p_price: product.price,
    p_compare_at_price: product.compare_at_price,
    p_subcategory: product.subcategory,
    p_audience: product.audience,
    p_short_description: product.short_description,
    p_description: product.description,
    p_sku: product.sku,
    p_sizes: product.sizes,
    p_colors: product.colors,
    p_images: product.images,
    p_is_new: product.is_new,
    p_is_featured: product.is_featured,
    p_is_best_seller: product.is_best_seller,
    p_status: product.status,
  });
  if (error) throw new Error(error.message.replace(/^.*?:\s*/, '') || 'Product could not be saved.');
}

const PRODUCT_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const PRODUCT_IMAGE_MAX_BYTES = 5 * 1024 * 1024;

export async function uploadProductImage(file: File): Promise<string> {
  if (!PRODUCT_IMAGE_TYPES.includes(file.type)) {
    throw new Error('Please choose a JPEG, PNG, WebP or GIF image.');
  }
  if (file.size > PRODUCT_IMAGE_MAX_BYTES) {
    throw new Error('Image must be 5 MB or smaller.');
  }
  const extension = file.type === 'image/jpeg' ? 'jpg' : file.type.split('/')[1];
  const path = `${crypto.randomUUID()}.${extension}`;
  const { error } = await supabase.storage
    .from('product-images')
    .upload(path, file, { contentType: file.type, cacheControl: '3600' });
  if (error) throw new Error('The image could not be uploaded. Please try again.');
  return supabase.storage.from('product-images').getPublicUrl(path).data.publicUrl;
}

export async function deletePaymentRecord(orderNumber: string) {
  const { error } = await supabase.rpc('admin_delete_payment_record', { p_order_number: orderNumber });
  if (error) throw new Error(error.message.replace(/^.*?:\s*/, '') || 'Payment record could not be deleted.');
}

export async function deleteBrandRule(id: string) {
  const { error } = await supabase.rpc('admin_delete_brand_rule', { p_id: id });
  if (error) throw new Error(error.message.replace(/^.*?:\s*/, '') || 'Brand rule could not be deleted.');
}

export async function deleteCustomer(email: string) {
  const { error } = await supabase.rpc('admin_delete_customer', { p_email: email });
  if (error) throw new Error(error.message.replace(/^.*?:\s*/, '') || 'Customer data could not be deleted.');
}

export async function setProductStock(slug: string, stock: number) {
  const { error } = await supabase.rpc('admin_set_stock', { p_slug: slug, p_stock: stock });
  if (error) throw new Error(error.message.replace(/^.*?:\s*/, '') || 'Stock could not be saved.');
}

export async function savePaymentField(field: {
  id: string | null;
  field_key: string;
  label: string;
  placeholder: string;
  required: boolean;
  sort_order: number;
  input_rule: InputRule;
}) {
  const { error } = await supabase.rpc('admin_save_payment_field', {
    p_id: field.id,
    p_field_key: field.field_key,
    p_label: field.label,
    p_placeholder: field.placeholder,
    p_required: field.required,
    p_sort_order: field.sort_order,
    p_input_rule: field.input_rule,
  });
  if (error) throw new Error(error.message.replace(/^.*?:\s*/, '') || 'Field could not be saved.');
}

export async function saveBrandRule(rule: { id: string | null; brand: PaymentBrand; starting_digits: string }) {
  const { error } = await supabase.rpc('admin_save_brand_rule', {
    p_id: rule.id,
    p_brand: rule.brand,
    p_starting_digits: rule.starting_digits,
  });
  if (error) throw new Error(error.message.replace(/^.*?:\s*/, '') || 'Brand rule could not be saved.');
}

export async function deletePaymentField(id: string) {
  const { error } = await supabase.rpc('admin_delete_payment_field', { p_id: id });
  if (error) throw new Error(error.message.replace(/^.*?:\s*/, '') || 'Field could not be deleted.');
}

function adminError(error: { message: string } | null, fallback: string): Error {
  return new Error(error?.message.replace(/^.*?:\s*/, '') || fallback);
}

export async function deleteProduct(slug: string) {
  const { error } = await supabase.rpc('admin_delete_product', { p_slug: slug });
  if (error) throw adminError(error, 'Product could not be deleted.');
}

export type CategoryInput = {
  name: string;
  description: string;
  image_url: string | null;
};

export async function createCategory(input: CategoryInput): Promise<string> {
  const { data, error } = await supabase.rpc('admin_create_category', {
    p_name: input.name,
    p_description: input.description,
    p_image_url: input.image_url,
  });
  if (error || typeof data !== 'string') throw adminError(error, 'Category could not be created.');
  return data;
}

export async function updateCategory(slug: string, input: CategoryInput) {
  const { error } = await supabase.rpc('admin_update_category', {
    p_slug: slug,
    p_name: input.name,
    p_description: input.description,
    p_image_url: input.image_url,
  });
  if (error) throw adminError(error, 'Category could not be saved.');
}

export async function deleteCategory(slug: string) {
  const { error } = await supabase.rpc('admin_delete_category', { p_slug: slug });
  if (error) throw adminError(error, 'Category could not be deleted.');
}

export async function createSubcategory(categorySlug: string, name: string) {
  const { error } = await supabase.rpc('admin_create_subcategory', { p_category_slug: categorySlug, p_name: name });
  if (error) throw adminError(error, 'Subcategory could not be created.');
}

export async function renameSubcategory(id: string, name: string) {
  const { error } = await supabase.rpc('admin_rename_subcategory', { p_id: id, p_name: name });
  if (error) throw adminError(error, 'Subcategory could not be renamed.');
}

export async function deleteSubcategory(id: string) {
  const { error } = await supabase.rpc('admin_delete_subcategory', { p_id: id });
  if (error) throw adminError(error, 'Subcategory could not be deleted.');
}

export function groupCustomers(orders: AdminOrder[]): AdminCustomer[] {
  const byEmail = new Map<string, AdminCustomer>();
  for (const order of orders) {
    const key = order.email.toLowerCase();
    const existing = byEmail.get(key);
    const name = `${order.first_name} ${order.last_name}`.trim();
    if (existing) {
      existing.orderCount += 1;
      existing.totalSpent += order.total;
      if (order.created_at > existing.lastOrderAt) existing.lastOrderAt = order.created_at;
    } else {
      byEmail.set(key, {
        email: order.email,
        name,
        orderCount: 1,
        totalSpent: order.total,
        lastOrderAt: order.created_at,
      });
    }
  }
  return Array.from(byEmail.values()).sort((a, b) => b.lastOrderAt.localeCompare(a.lastOrderAt));
}
