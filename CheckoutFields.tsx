import type { InputHTMLAttributes, ReactNode } from 'react';
import { BankTransferPanel } from '@/components/checkout/BankTransferPanel';
import { inputBase, labelBase } from '@/components/ui/styles';
import { detectCardBrand, formatCardExpiry, formatCardNumber, type BrandRule } from '@/lib/cardValidation';
import { US_STATES } from '@/lib/usStates';
import {
  type CheckoutForm,
  type BankTransferProof,
  type PaymentBrand,
  type PaymentDetails,
  type PaymentMethod,
  type PaymentField,
} from '@/lib/orders';

const PAYMENT_OPTIONS: { value: PaymentMethod; title: string; description: string }[] = [
  { value: 'card', title: 'Credit / Debit Card', description: 'Pay securely by card and confirm your order instantly.' },
  { value: 'cash_on_delivery', title: 'Cash on Delivery', description: 'Pay a small prepaid shipping fee now and the rest on delivery.' },
  { value: 'bank_transfer', title: 'Bank Transfer', description: 'Pay using the QR code or payment link, then submit your proof.' },
];

const CARD_BRANDS: PaymentBrand[] = ['visa', 'mastercard', 'amex'];

const CARD_BRAND_IMAGES: Record<PaymentBrand, { src: string; alt: string }> = {
  visa: { src: '/images_(63).jpg', alt: 'Visa' },
  mastercard: { src: '/images_(14).png', alt: 'Mastercard' },
  amex: { src: '/images_(64).jpg', alt: 'American Express' },
};

function cardBrandMark(brand: PaymentBrand) {
  const image = CARD_BRAND_IMAGES[brand];
  const imageClass = brand === 'mastercard'
    ? 'h-full w-full scale-[1.08] object-cover'
    : brand === 'amex'
      ? 'h-full w-full scale-[1.18] object-cover'
      : 'h-full w-full object-cover';

  return (
    <span className="block h-7 w-14 overflow-hidden rounded sm:h-8 sm:w-16">
      <img src={image.src} alt={image.alt} className={imageClass} />
    </span>
  );
}

type TextFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> & {
  label: string;
  value: string;
  onChange: (value: string) => void;
  wrapperClassName?: string;
};

function TextField({ id, label, value, onChange, wrapperClassName = '', ...inputProps }: TextFieldProps) {
  return (
    <div className={wrapperClassName}>
      <label htmlFor={id} className={labelBase}>{label}</label>
      <input
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={inputBase}
        {...inputProps}
      />
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-6">
      <h2 className="border-b border-neutral-200 pb-4 font-serif text-2xl">{title}</h2>
      {children}
    </section>
  );
}

function formatByRule(rule: PaymentField['input_rule'], value: string): string {
  if (rule === 'card_number') return formatCardNumber(value);
  if (rule === 'mm_yy') return formatCardExpiry(value);
  if (rule === 'digits') return value.replace(/\D/g, '');
  if (rule === 'cvv_3' || rule === 'cvv_4') return value.replace(/\D/g, '').slice(0, rule === 'cvv_4' ? 4 : 3);
  return value;
}

function maxLengthForRule(rule: PaymentField['input_rule']): number | undefined {
  if (rule === 'card_number') return 23;
  if (rule === 'mm_yy') return 5;
  if (rule === 'cvv_3') return 3;
  if (rule === 'cvv_4') return 4;
  return undefined;
}

type CheckoutFieldsProps = {
  form: CheckoutForm;
  onFieldChange: <K extends keyof CheckoutForm>(field: K, value: CheckoutForm[K]) => void;
  paymentMethod: PaymentMethod;
  onPaymentMethodChange: (method: PaymentMethod) => void;
  paymentBrand: PaymentBrand | '';
  onPaymentBrandChange: (brand: PaymentBrand) => void;
  paymentFields: PaymentField[];
  paymentDetails: PaymentDetails;
  onPaymentDetailChange: (key: string, value: string) => void;
  brandRules: BrandRule[];
  bankTransferAmount: number | null;
  bankTransferProof: BankTransferProof;
  onBankTransferProofChange: (proof: BankTransferProof) => void;
  fieldsError: string | null;
  fieldsLoading: boolean;
};

export function CheckoutFields({
  form,
  onFieldChange,
  paymentMethod,
  onPaymentMethodChange,
  paymentBrand,
  onPaymentBrandChange,
  paymentFields,
  paymentDetails,
  onPaymentDetailChange,
  brandRules,
  bankTransferAmount,
  bankTransferProof,
  onBankTransferProofChange,
  fieldsError,
  fieldsLoading,
}: CheckoutFieldsProps) {
  return (
    <>
      <Section title="Contact">
        <div className="grid gap-6 sm:grid-cols-2">
          <TextField
            id="checkout-email"
            label="Email"
            type="email"
            autoComplete="email"
            value={form.email}
            onChange={(value) => onFieldChange('email', value)}
            wrapperClassName="sm:col-span-2"
            required
          />
          <TextField
            id="checkout-phone"
            label="Phone (optional)"
            type="tel"
            autoComplete="tel"
            value={form.phone}
            onChange={(value) => onFieldChange('phone', value)}
            wrapperClassName="sm:col-span-2"
          />
        </div>
        <label className="flex cursor-pointer items-center gap-3 text-sm text-neutral-700">
          <input
            type="checkbox"
            checked={form.orderUpdates}
            onChange={(event) => onFieldChange('orderUpdates', event.target.checked)}
            className="h-4 w-4 accent-ink"
          />
          Send me order updates by email
        </label>
      </Section>

      <Section title="Shipping address">
        <div className="grid gap-6 sm:grid-cols-2">
          <TextField
            id="checkout-first-name"
            label="First name"
            autoComplete="given-name"
            value={form.firstName}
            onChange={(value) => onFieldChange('firstName', value)}
            required
          />
          <TextField
            id="checkout-last-name"
            label="Last name"
            autoComplete="family-name"
            value={form.lastName}
            onChange={(value) => onFieldChange('lastName', value)}
            required
          />
          <TextField
            id="checkout-street"
            label="Street address"
            autoComplete="address-line1"
            value={form.street}
            onChange={(value) => onFieldChange('street', value)}
            wrapperClassName="sm:col-span-2"
            required
          />
          <TextField
            id="checkout-apartment"
            label="Apartment, suite (optional)"
            autoComplete="address-line2"
            value={form.apartment}
            onChange={(value) => onFieldChange('apartment', value)}
            wrapperClassName="sm:col-span-2"
          />
          <TextField
            id="checkout-city"
            label="City"
            autoComplete="address-level2"
            value={form.city}
            onChange={(value) => onFieldChange('city', value)}
            required
          />
          <div className="grid grid-cols-[1fr_1fr] gap-6">
            <div>
              <label htmlFor="checkout-state" className={labelBase}>State</label>
              <select
                id="checkout-state"
                value={form.state}
                onChange={(event) => onFieldChange('state', event.target.value)}
                autoComplete="address-level1"
                className={inputBase}
                required
              >
                <option value="">Select</option>
                {US_STATES.map((state) => (
                  <option key={state.code} value={state.code}>{state.name}</option>
                ))}
              </select>
            </div>
            <TextField
              id="checkout-zip"
              label="ZIP code"
              inputMode="numeric"
              autoComplete="postal-code"
              value={form.zip}
              onChange={(value) => onFieldChange('zip', value)}
              required
            />
          </div>
        </div>
      </Section>

      <Section title="Payment method">
        <fieldset className="grid gap-3 md:grid-cols-3">
          <legend className="sr-only">Payment method</legend>
          {PAYMENT_OPTIONS.map((option) => {
            const selected = paymentMethod === option.value;
            return (
              <label
                key={option.value}
                className={`flex cursor-pointer items-start gap-4 border p-5 transition-colors ${
                  selected ? 'border-ink bg-neutral-100' : 'border-neutral-300 hover:border-neutral-500'
                }`}
              >
                <input
                  type="radio"
                  name="shipping-method"
                  value={option.value}
                  checked={selected}
                  onChange={() => onPaymentMethodChange(option.value)}
                  className="mt-1 h-4 w-4 accent-ink"
                />
                <span>
                  <span className="block text-sm text-ink">{option.title}</span>
                  <span className="mt-1 block text-xs leading-relaxed text-neutral-600">{option.description}</span>
                </span>
              </label>
            );
          })}
        </fieldset>
      </Section>

      {paymentMethod === 'bank_transfer' && (
        <BankTransferPanel
          amount={bankTransferAmount}
          proof={bankTransferProof}
          onProofChange={onBankTransferProofChange}
        />
      )}

      {paymentMethod !== 'bank_transfer' && <Section title="Payment details">
        <div className="mb-6 grid grid-cols-[auto_repeat(3,minmax(0,1fr))] items-center gap-2 text-xs text-neutral-600 sm:flex">
          <span className="pr-1">Accepted cards</span>
          {CARD_BRANDS.map((brand) => (
            <span key={brand} className="flex h-11 min-w-0 items-center justify-center border border-neutral-300 bg-white px-1.5 py-1 text-ink sm:h-12 sm:min-w-20 sm:px-2">
              {cardBrandMark(brand)}
            </span>
          ))}
        </div>
        {fieldsError ? (
          <p role="alert" className="border-l-2 border-crimson-500 pl-3 text-sm text-crimson-400">{fieldsError}</p>
        ) : fieldsLoading ? (
          <div className="grid animate-pulse gap-6 sm:grid-cols-2" aria-busy="true">
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="h-14 rounded bg-neutral-100" />
            ))}
          </div>
        ) : (
        <div className="grid gap-6 sm:grid-cols-2">
          {[...paymentFields]
            .filter((field) => {
              const hasCardNumberField = paymentFields.some((item) => item.input_rule === 'card_number');
              return field.field_key !== 'card_last4' || !hasCardNumberField;
            })
            .sort((a, b) => a.sort_order - b.sort_order)
            .map((field) => {
            const value = paymentDetails[field.field_key] ?? '';
            const rule = field.input_rule;
            const isCardNumber = rule === 'card_number';
            const isExpiry = rule === 'mm_yy';
            const isCvv = rule === 'cvv_3' || rule === 'cvv_4';
            const detectedBrand = isCardNumber ? detectCardBrand(value, brandRules) : null;
            return (
              <div key={field.id} className={isCardNumber ? 'sm:col-span-2' : ''}>
                <div className="relative">
                  <TextField
                    id={`checkout-payment-${field.field_key}`}
                    label={field.label}
                    type={isCvv ? 'password' : 'text'}
                    inputMode={isCardNumber || isCvv || isExpiry ? 'numeric' : undefined}
                    autoComplete={isCardNumber ? 'cc-number' : isCvv ? 'cc-csc' : isExpiry ? 'cc-exp' : field.field_key === 'cardholder_name' ? 'cc-name' : 'postal-code'}
                    maxLength={maxLengthForRule(rule)}
                    placeholder={field.placeholder || undefined}
                    value={value}
                    onChange={(nextValue) => {
                      const formatted = formatByRule(rule, nextValue);
                      onPaymentDetailChange(field.field_key, formatted);
                      if (isCardNumber) {
                        const nextBrand = detectCardBrand(formatted, brandRules);
                        if (nextBrand) onPaymentBrandChange(nextBrand);
                      }
                    }}
                    required={field.required}
                  />
                  {isCardNumber && detectedBrand && (
                    <span className="absolute right-3 top-9 text-xs text-ink">{cardBrandMark(detectedBrand)}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        )}
        <p className="mt-5 text-xs leading-relaxed text-neutral-500">
          Your payment details are used to securely complete this order.
        </p>
      </Section>}
    </>
  );
}
