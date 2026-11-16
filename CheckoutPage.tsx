import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckoutFields } from '@/components/checkout/CheckoutFields';
import { MobilePayBar, OrderSummary } from '@/components/checkout/OrderSummary';
import { EmptyBag } from '@/components/cart/EmptyBag';
import { eyebrow } from '@/components/ui/styles';
import { useStore } from '@/context/useStore';
import {
  fetchPaymentFields,
  fetchBrandRules,
  placeBankTransferOrder,
  placeDemoOrder,
  quoteOrder,
  type BankTransferProof,
  type CardBrandRule,
  type CheckoutForm,
  type OrderQuote,
  type PaymentBrand,
  type PaymentDetails,
  type PaymentMethod,
  type PaymentField,
  type ShippingMethod,
} from '@/lib/orders';
import { US_STATE_CODES } from '@/lib/usStates';

const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const ZIP_PATTERN = /^\d{5}(-\d{4})?$/;

const EMPTY_FORM: CheckoutForm = {
  email: '',
  phone: '',
  orderUpdates: true,
  firstName: '',
  lastName: '',
  street: '',
  apartment: '',
  city: '',
  state: '',
  zip: '',
};

function validateCheckout(
  form: CheckoutForm,
  paymentMethod: PaymentMethod,
  paymentBrand: PaymentBrand | '',
  fields: PaymentField[],
  details: PaymentDetails,
  bankTransfer: BankTransferProof,
): string | null {
  if (!EMAIL_PATTERN.test(form.email.trim())) return 'Please enter a valid email address.';
  if (!form.firstName.trim() || !form.lastName.trim()) return 'Please enter your first and last name.';
  if (!form.street.trim() || !form.city.trim()) return 'Please complete your street address and city.';
  if (!US_STATE_CODES.includes(form.state)) return 'Please choose a valid state.';
  if (!ZIP_PATTERN.test(form.zip.trim())) return 'Please enter a valid ZIP code.';
  if (paymentMethod === 'bank_transfer') {
    if (!bankTransfer.sender_name.trim()) return 'Please enter the sender name.';
    if (!bankTransfer.amount.trim() || Number(bankTransfer.amount) <= 0) return 'Please enter the amount you sent.';
    if (!bankTransfer.proof_image) return 'Please upload your payment screenshot.';
    return null;
  }
  if (!paymentBrand) return 'Please select a card brand.';
  for (const field of fields) {
    if (field.required && !(details[field.field_key] ?? '').trim()) {
      return `Please enter ${field.label.toLowerCase()}.`;
    }
  }
  return null;
}

export function CheckoutPage() {
  const navigate = useNavigate();
  const { cart, clearCart } = useStore();
  const [form, setForm] = useState<CheckoutForm>(EMPTY_FORM);
  const [shippingMethod, setShippingMethod] = useState<ShippingMethod>('advance');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('card');
  const [paymentBrand, setPaymentBrand] = useState<PaymentBrand | ''>('');
  const [paymentDetails, setPaymentDetails] = useState<PaymentDetails>({});
  const [bankTransferProof, setBankTransferProof] = useState<BankTransferProof>({ sender_name: '', amount: '', proof_image: '' });
  const [paymentFields, setPaymentFields] = useState<PaymentField[]>([]);
  const [brandRules, setBrandRules] = useState<CardBrandRule[]>([]);
  const [fieldsError, setFieldsError] = useState<string | null>(null);
  const [fieldsAttempt, setFieldsAttempt] = useState(0);
  const [appliedCoupon, setAppliedCoupon] = useState('');
  const [quote, setQuote] = useState<OrderQuote | null>(null);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    fetchPaymentFields()
      .then((fields) => {
        if (!active) return;
        setPaymentFields(fields);
        setFieldsError(null);
      })
      .catch((err: Error) => {
        if (active) setFieldsError(err.message);
      });
    fetchBrandRules()
      .then((rules) => {
        if (active) setBrandRules(rules);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [fieldsAttempt]);

  useEffect(() => {
    if (cart.length === 0) return;
    let active = true;
    quoteOrder({
      items: cart,
      coupon_code: appliedCoupon,
      shipping_method: shippingMethod,
      payment_brand: paymentMethod === 'card' || paymentMethod === 'cash_on_delivery' ? paymentBrand : '',
    })
      .then((data) => {
        if (!active) return;
        setQuote(data);
        setQuoteError(null);
      })
      .catch((err: Error) => {
        if (!active) return;
        setQuote(null);
        setQuoteError(err.message);
      });
    return () => {
      active = false;
    };
  }, [cart, appliedCoupon, shippingMethod, paymentBrand, paymentMethod]);

  if (cart.length === 0) return <EmptyBag />;

  const handleFieldChange = <K extends keyof CheckoutForm>(field: K, value: CheckoutForm[K]) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handlePaymentMethodChange = (method: PaymentMethod) => {
    setPaymentMethod(method);
    setShippingMethod(method === 'cash_on_delivery' ? 'cod' : 'advance');
    setSubmitError(null);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const problem = validateCheckout(form, paymentMethod, paymentBrand, paymentFields, paymentDetails, bankTransferProof);
    if (problem) {
      setSubmitError(problem);
      return;
    }
    setSubmitError(null);
    setSubmitting(true);
    try {
      const orderRequest = {
        items: cart,
        coupon_code: appliedCoupon,
        shipping_method: shippingMethod,
        payment_method: paymentMethod,
        payment_brand: paymentBrand,
        payment_details: paymentDetails,
        contact: {
          email: form.email.trim(),
          phone: form.phone.trim(),
          order_updates: form.orderUpdates,
        },
        shipping_address: {
          first_name: form.firstName.trim(),
          last_name: form.lastName.trim(),
          street: form.street.trim(),
          apartment: form.apartment.trim(),
          city: form.city.trim(),
          state: form.state,
          zip: form.zip.trim(),
        },
      };
      const orderNumber = paymentMethod === 'bank_transfer'
        ? await placeBankTransferOrder({ ...orderRequest, bank_transfer: bankTransferProof })
        : await placeDemoOrder(orderRequest);
      clearCart();
      navigate(`/order/${orderNumber}`, { state: { paymentSuccess: true } });
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 pb-28 pt-8 lg:px-8 lg:pb-24 lg:pt-12">
      <p className={eyebrow}>Checkout</p>
      <h1 className="mt-3 font-heading text-4xl font-bold sm:text-5xl">Complete your order</h1>

      <div className="mt-10 grid gap-12 lg:grid-cols-[1fr_400px] lg:gap-16">
        <form id="checkout-form" onSubmit={handleSubmit} noValidate className="space-y-12">
          <CheckoutFields
            form={form}
            onFieldChange={handleFieldChange}
            paymentMethod={paymentMethod}
            onPaymentMethodChange={handlePaymentMethodChange}
            paymentBrand={paymentBrand}
            onPaymentBrandChange={setPaymentBrand}
            paymentFields={paymentFields}
            paymentDetails={paymentDetails}
            onPaymentDetailChange={(key, value) => setPaymentDetails((current) => ({ ...current, [key]: value }))}
            brandRules={brandRules}
            bankTransferAmount={quote?.total_due_now ?? null}
            bankTransferProof={bankTransferProof}
            onBankTransferProofChange={setBankTransferProof}
            fieldsError={fieldsError}
            fieldsLoading={paymentFields.length === 0 && fieldsError === null}
          />
        </form>

        <OrderSummary
          quote={quote}
          quoteError={quoteError}
          shippingMethod={shippingMethod}
          paymentMethod={paymentMethod}
          appliedCoupon={appliedCoupon}
          onApplyCoupon={setAppliedCoupon}
          onRemoveCoupon={() => setAppliedCoupon('')}
          submitError={submitError ?? fieldsError}
          submitting={submitting}
        />
      </div>

      <MobilePayBar quote={quote} quoteError={quoteError} paymentMethod={paymentMethod} submitting={submitting} />
    </div>
  );
}
