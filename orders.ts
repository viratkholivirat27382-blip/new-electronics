import { supabase } from '@/lib/supabase';

export type CartSelection = {
  slug: string;
  size: string;
  color: string;
  quantity: number;
};

export type ShippingMethod = 'advance' | 'cod';
export type PaymentMethod = 'card' | 'cash_on_delivery' | 'bank_transfer';
export type PaymentBrand = 'visa' | 'mastercard' | 'amex';

export type BankTransferProof = {
  sender_name: string;
  amount: string;
  proof_image: string;
};

export type CheckoutForm = {
  email: string;
  phone: string;
  orderUpdates: boolean;
  firstName: string;
  lastName: string;
  street: string;
  apartment: string;
  city: string;
  state: string;
  zip: string;
};

export type OrderLine = {
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

export type OrderQuote = {
  lines: OrderLine[];
  subtotal: number;
  discount: number;
  coupon_code: string | null;
  shipping_method: ShippingMethod;
  shipping_fee: number;
  total_due_now: number;
  cod_balance: number;
  payment_brand: PaymentBrand;
};

export type DemoOrder = {
  order_number: string;
  status: string;
  contact: { email: string; phone: string; order_updates: boolean };
  shipping_address: {
    first_name: string;
    last_name: string;
    street: string;
    apartment: string;
    city: string;
    state: string;
    zip: string;
    country: string;
  };
  shipping_method: ShippingMethod;
  payment_method: PaymentMethod;
  payment_brand: PaymentBrand | null;
  payment_status: 'simulated_paid' | 'simulated_cod_fee_paid' | 'bank_transfer_pending' | 'bank_transfer_paid';
  items: OrderLine[];
  subtotal: number;
  discount: number;
  coupon_code: string | null;
  shipping_fee: number;
  total_due_now: number;
  cod_balance: number;
  created_at: string;
};

export type InputRule = 'text' | 'digits' | 'mm_yy' | 'cvv_3' | 'cvv_4' | 'card_number';

export type PaymentField = {
  id: string;
  field_key: string;
  label: string;
  placeholder: string;
  required: boolean;
  sort_order: number;
  input_rule: InputRule;
};

export type CardBrandRule = {
  id: string;
  brand: PaymentBrand;
  starting_digits: string;
};

export type PaymentDetails = Record<string, string>;

export async function fetchPaymentFields(): Promise<PaymentField[]> {
  const { data, error } = await supabase
    .from('payment_info_fields')
    .select('id, field_key, label, placeholder, required, sort_order, input_rule')
    .order('sort_order', { ascending: true });
  if (error || !Array.isArray(data)) {
    throw new Error('We could not load the payment fields. Please refresh the page.');
  }
  return data as PaymentField[];
}

export async function fetchBrandRules(): Promise<CardBrandRule[]> {
  const { data, error } = await supabase
    .from('card_brand_rules')
    .select('id, brand, starting_digits')
    .order('brand', { ascending: true });
  if (error || !Array.isArray(data)) {
    throw new Error('We could not load the card brand rules.');
  }
  return data as CardBrandRule[];
}

type OrderRequest = {
  items: CartSelection[];
  coupon_code: string;
  shipping_method: ShippingMethod;
  payment_brand: PaymentBrand | '';
  payment_method?: PaymentMethod;
  payment_details?: PaymentDetails;
  bank_transfer?: BankTransferProof;
  contact?: { email: string; phone: string; order_updates: boolean };
  shipping_address?: {
    first_name: string;
    last_name: string;
    street: string;
    apartment: string;
    city: string;
    state: string;
    zip: string;
  };
};

const CARD_BRAND_LABELS: Record<PaymentBrand, string> = {
  visa: 'Visa',
  mastercard: 'Mastercard',
  amex: 'American Express',
};

export function cardBrandLabel(brand: PaymentBrand) {
  return CARD_BRAND_LABELS[brand];
}

function parseQuote(data: unknown): OrderQuote {
  if (!data || typeof data !== 'object' || !Array.isArray((data as OrderQuote).lines)) {
    throw new Error('We could not calculate your order. Please try again.');
  }
  const quote = data as OrderQuote;
  return {
    ...quote,
    subtotal: Number(quote.subtotal),
    discount: Number(quote.discount),
    shipping_fee: Number(quote.shipping_fee),
    total_due_now: Number(quote.total_due_now),
    cod_balance: Number(quote.cod_balance),
    lines: quote.lines.map((line) => ({
      ...line,
      unit_price: Number(line.unit_price),
      line_total: Number(line.line_total),
    })),
  };
}

function toRpcError(message: string | undefined) {
  return new Error(message?.replace(/^.*?:\s*/, '') || 'Something went wrong. Please try again.');
}

export async function quoteOrder(request: OrderRequest): Promise<OrderQuote> {
  const { data, error } = await supabase.rpc('quote_demo_order', { p: request });
  if (error) throw toRpcError(error.message);
  return parseQuote(data);
}

export async function placeDemoOrder(request: OrderRequest & {
  contact: NonNullable<OrderRequest['contact']>;
  shipping_address: NonNullable<OrderRequest['shipping_address']>;
  payment_details: PaymentDetails;
}): Promise<string> {
  const { data, error } = await supabase.rpc('place_demo_order', { p: request });
  if (error) throw toRpcError(error.message);
  return parseOrderNumber(data);
}

export async function placeBankTransferOrder(request: OrderRequest & {
  contact: NonNullable<OrderRequest['contact']>;
  shipping_address: NonNullable<OrderRequest['shipping_address']>;
  bank_transfer: BankTransferProof;
}): Promise<string> {
  const { data, error } = await supabase.rpc('place_bank_transfer_order', { p: request });
  if (error) throw toRpcError(error.message);
  return parseOrderNumber(data);
}

function parseOrderNumber(data: unknown): string {
  const orderNumber = (data as { order_number?: unknown } | null)?.order_number;
  if (typeof orderNumber !== 'string') {
    throw new Error('We could not confirm your order. Please try again.');
  }
  return orderNumber;
}

export async function fetchDemoOrder(orderNumber: string): Promise<DemoOrder | null> {
  const { data, error } = await supabase.rpc('get_demo_order', { p_order_number: orderNumber });
  if (error) throw new Error('We could not load this order. Please try again.');
  if (!data || typeof data !== 'object') return null;
  const order = data as DemoOrder;
  return {
    ...order,
    subtotal: Number(order.subtotal),
    discount: Number(order.discount),
    shipping_fee: Number(order.shipping_fee),
    total_due_now: Number(order.total_due_now),
    cod_balance: Number(order.cod_balance),
  };
}
