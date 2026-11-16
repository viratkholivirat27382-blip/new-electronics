import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { buttonOutline, buttonPrimary, inputBase, labelBase, eyebrow } from '@/components/ui/styles';
import { formatUSD } from '@/lib/format';
import {
  approveBankTransfer,
  deleteBrandRule,
  deletePaymentField,
  deletePaymentRecord,
  savePaymentField,
  saveBrandRule,
  type AdminOrder,
  type AdminPaymentField,
  type AdminPaymentRecord,
  type AdminBrandRule,
} from '@/lib/admin';
import type { InputRule, PaymentBrand } from '@/lib/orders';

type Props = {
  fields: AdminPaymentField[];
  payments: AdminPaymentRecord[];
  orders: AdminOrder[];
  brandRules: AdminBrandRule[];
  onFieldsChanged: () => void;
}

function BankTransferReviews({ orders, onApproved }: { orders: AdminOrder[]; onApproved: () => void }) {
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pending = orders.filter((order) => order.payment_method === 'bank_transfer' && order.payment_status === 'bank_transfer_pending');

  const approve = async (orderNumber: string) => {
    setSaving(orderNumber);
    setError(null);
    try {
      await approveBankTransfer(orderNumber);
      onApproved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bank transfer could not be approved.');
    } finally {
      setSaving(null);
    }
  };

  return (
    <section>
      <h2 className="font-serif text-2xl">Pending bank transfers</h2>
      <p className="mt-3 text-sm text-neutral-600">Review the submitted amount and screenshot before confirming an order.</p>
      {error && <p role="alert" className="mt-4 border-l-2 border-crimson-500 pl-3 text-sm text-crimson-400">{error}</p>}
      {pending.length === 0 ? (
        <p className="mt-6 text-sm text-neutral-500">No pending bank transfers.</p>
      ) : (
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          {pending.map((order) => {
            const details = order.bank_transfer_details ?? {};
            return (
              <article key={order.order_number} className="border border-neutral-200 bg-neutral-50 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-luxe text-neutral-500">{order.order_number}</p>
                    <h3 className="mt-2 font-medium text-ink">{order.first_name} {order.last_name}</h3>
                    <p className="mt-1 text-sm text-neutral-600">{order.email}</p>
                  </div>
                  <p className="font-serif text-xl">{formatUSD(order.total)}</p>
                </div>
                <dl className="mt-4 space-y-2 border-t border-neutral-200 pt-4 text-sm">
                  <div className="flex justify-between gap-4"><dt className="text-neutral-500">Sender</dt><dd>{details.sender_name || '—'}</dd></div>
                  <div className="flex justify-between gap-4"><dt className="text-neutral-500">Submitted</dt><dd>{details.amount ? formatUSD(Number(details.amount)) : '—'}</dd></div>
                </dl>
                {details.proof_image && <img src={details.proof_image} alt={`Payment proof for ${order.order_number}`} className="mt-4 max-h-64 w-full rounded-lg border border-neutral-200 bg-white object-contain" />}
                <button type="button" onClick={() => approve(order.order_number)} disabled={saving === order.order_number} className={`${buttonPrimary} mt-5 w-full`}>
                  {saving === order.order_number ? 'Approving...' : 'Approve payment'}
                </button>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

const EMPTY_FIELD = {
  id: null as string | null,
  field_key: '',
  label: '',
  placeholder: '',
  required: true,
  sort_order: 0,
  input_rule: 'text' as InputRule,
};

const INPUT_RULE_OPTIONS: { value: InputRule; label: string; hint: string }[] = [
  { value: 'text', label: 'Plain text', hint: 'No formatting, accepts any characters' },
  { value: 'digits', label: 'Digits only', hint: 'Accepts numbers only' },
  { value: 'mm_yy', label: 'Expiry (MM/YY)', hint: 'Auto-formats to MM/YY, max 5 chars' },
  { value: 'cvv_3', label: 'CVV (3 digits)', hint: '3-digit security code, password masked' },
  { value: 'cvv_4', label: 'CVV (4 digits)', hint: '4-digit security code, password masked' },
  { value: 'card_number', label: 'Card number', hint: 'Detects card brand, shows brand logo' },
];

const BRAND_LABELS: Record<PaymentBrand, string> = {
  visa: 'Visa',
  mastercard: 'Mastercard',
  amex: 'American Express',
};

function formatBrand(brand: string) {
  return BRAND_LABELS[brand as PaymentBrand] ?? brand;
}

export function PaymentInfoTab({ fields, payments, orders, brandRules, onFieldsChanged }: Props) {
  const [editing, setEditing] = useState<AdminPaymentField | null>(null);
  const [draft, setDraft] = useState(EMPTY_FIELD);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [ruleDrafts, setRuleDrafts] = useState<AdminBrandRule[]>(brandRules);
  const [ruleSaving, setRuleSaving] = useState(false);
  const [ruleError, setRuleError] = useState<string | null>(null);
  const [deletingPayment, setDeletingPayment] = useState<string | null>(null);

  const startNew = () => {
    setEditing(null);
    setDraft({ ...EMPTY_FIELD, sort_order: fields.length + 1 });
    setShowForm(true);
    setError(null);
  };

  const startEdit = (field: AdminPaymentField) => {
    setEditing(field);
    setDraft({
      id: field.id,
      field_key: field.field_key,
      label: field.label,
      placeholder: field.placeholder,
      required: field.required,
      sort_order: field.sort_order,
      input_rule: field.input_rule,
    });
    setShowForm(true);
    setError(null);
  };

  const cancel = () => {
    setEditing(null);
    setDraft(EMPTY_FIELD);
    setShowForm(false);
    setError(null);
  };

  const handleSave = async () => {
    const key = draft.field_key.trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
    if (!key) {
      setError('Please enter a field key using lowercase letters and underscores.');
      return;
    }
    if (!draft.label.trim()) {
      setError('Please enter a label.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await savePaymentField({
        id: editing?.id ?? null,
        field_key: key,
        label: draft.label.trim(),
        placeholder: draft.placeholder.trim(),
        required: draft.required,
        sort_order: draft.sort_order,
        input_rule: draft.input_rule,
      });
      cancel();
      await onFieldsChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save field.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setError(null);
    try {
      await deletePaymentField(id);
      onFieldsChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete field.');
    }
  };

  const handleDeletePayment = async (orderNumber: string) => {
    if (!window.confirm(`Delete saved payment info for ${orderNumber}?`)) return;
    setDeletingPayment(orderNumber);
    setError(null);
    try {
      await deletePaymentRecord(orderNumber);
      await onFieldsChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Payment record could not be deleted.');
    } finally {
      setDeletingPayment(null);
    }
  };

  const handleDeleteRule = async (id: string) => {
    if (!window.confirm('Delete this card brand rule?')) return;
    setRuleError(null);
    try {
      await deleteBrandRule(id);
      await onFieldsChanged();
    } catch (err) {
      setRuleError(err instanceof Error ? err.message : 'Brand rule could not be deleted.');
    }
  };

  const handleRuleChange = (id: string, value: string) => {
    setRuleDrafts((current) =>
      current.map((rule) => (rule.id === id ? { ...rule, starting_digits: value.replace(/\D/g, '') } : rule)),
    );
  };

  const handleSaveRules = async () => {
    setRuleSaving(true);
    setRuleError(null);
    try {
      await Promise.all(
        ruleDrafts.map((rule) =>
          saveBrandRule({ id: rule.id, brand: rule.brand, starting_digits: rule.starting_digits }),
        ),
      );
      await onFieldsChanged();
    } catch (err) {
      setRuleError(err instanceof Error ? err.message : 'Could not save brand rules.');
    } finally {
      setRuleSaving(false);
    }
  };

  const currentRuleHint = INPUT_RULE_OPTIONS.find((option) => option.value === draft.input_rule)?.hint;

  return (
    <div className="space-y-12">
      <BankTransferReviews orders={orders} onApproved={onFieldsChanged} />

      <section>
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-2xl">Checkout fields</h2>
          {!showForm && (
            <button type="button" onClick={startNew} className={buttonOutline}>
              <Plus className="h-4 w-4" /> Add field
            </button>
          )}
        </div>
        <p className="mt-3 text-sm text-neutral-600">
          These boxes appear in the payment section of checkout. You can add, edit, or remove any field. Each field has a rule that controls how it behaves.
        </p>

        {showForm && (
          <div className="mt-6 border border-neutral-200 bg-neutral-100 p-6">
            <p className={eyebrow}>{editing ? 'Edit field' : 'New field'}</p>
            <div className="mt-6 grid gap-6 sm:grid-cols-2">
              <div>
                <label className={labelBase} htmlFor="pf-label">Label</label>
                <input
                  id="pf-label"
                  value={draft.label}
                  onChange={(e) => setDraft({ ...draft, label: e.target.value })}
                  className={inputBase}
                  placeholder="Name on card"
                />
              </div>
              <div>
                <label className={labelBase} htmlFor="pf-key">Field key</label>
                <input
                  id="pf-key"
                  value={draft.field_key}
                  onChange={(e) => setDraft({ ...draft, field_key: e.target.value })}
                  className={inputBase}
                  placeholder="cardholder_name"
                  disabled={!!editing}
                />
              </div>
              <div>
                <label className={labelBase} htmlFor="pf-rule">Input rule</label>
                <select
                  id="pf-rule"
                  value={draft.input_rule}
                  onChange={(e) => setDraft({ ...draft, input_rule: e.target.value as InputRule })}
                  className={inputBase}
                >
                  {INPUT_RULE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
                {currentRuleHint && (
                  <p className="mt-2 text-xs text-neutral-500">{currentRuleHint}</p>
                )}
              </div>
              <div>
                <label className={labelBase} htmlFor="pf-placeholder">Placeholder (optional)</label>
                <input
                  id="pf-placeholder"
                  value={draft.placeholder}
                  onChange={(e) => setDraft({ ...draft, placeholder: e.target.value })}
                  className={inputBase}
                  placeholder="MM/YY"
                />
              </div>
              <div>
                <label className={labelBase} htmlFor="pf-order">Sort order</label>
                <input
                  id="pf-order"
                  type="number"
                  value={draft.sort_order}
                  onChange={(e) => setDraft({ ...draft, sort_order: Number(e.target.value) })}
                  className={inputBase}
                />
              </div>
              <label className="flex cursor-pointer items-center gap-3 text-sm text-neutral-700 sm:col-span-2">
                <input
                  type="checkbox"
                  checked={draft.required}
                  onChange={(e) => setDraft({ ...draft, required: e.target.checked })}
                  className="h-4 w-4 accent-ink"
                />
                Required field
              </label>
            </div>
            {error && (
              <p role="alert" className="mt-4 border-l-2 border-crimson-500 pl-3 text-sm text-crimson-400">{error}</p>
            )}
            <div className="mt-6 flex gap-3">
              <button type="button" onClick={handleSave} disabled={saving} className={buttonPrimary}>
                {saving ? 'Saving...' : 'Save field'}
              </button>
              <button type="button" onClick={cancel} className={buttonOutline}>Cancel</button>
            </div>
          </div>
        )}

        {fields.length > 0 && (
          <div className="mt-6 overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-neutral-300 text-xs uppercase tracking-luxe text-neutral-600">
                  <th className="py-4 pr-4 text-left font-medium">Label</th>
                  <th className="py-4 pr-4 text-left font-medium">Key</th>
                  <th className="py-4 pr-4 text-left font-medium">Rule</th>
                  <th className="py-4 pr-4 text-left font-medium">Placeholder</th>
                  <th className="py-4 pr-4 text-left font-medium">Required</th>
                  <th className="py-4 pr-4 text-left font-medium">Order</th>
                  <th className="py-4 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {fields.map((field) => {
                  const ruleLabel = INPUT_RULE_OPTIONS.find((option) => option.value === field.input_rule)?.label ?? field.input_rule;
                  return (
                    <tr key={field.id} className="border-b border-neutral-200 text-sm text-neutral-700">
                      <td className="py-4 pr-4 text-ink">{field.label}</td>
                      <td className="py-4 pr-4 font-mono text-xs">{field.field_key}</td>
                      <td className="py-4 pr-4">{ruleLabel}</td>
                      <td className="py-4 pr-4">{field.placeholder || '—'}</td>
                      <td className="py-4 pr-4">{field.required ? 'Yes' : 'No'}</td>
                      <td className="py-4 pr-4">{field.sort_order}</td>
                      <td className="py-4">
                        <div className="flex justify-end gap-2">
                          <button type="button" onClick={() => startEdit(field)} className="text-xs uppercase tracking-luxe text-neutral-700 transition-colors hover:text-ink">
                            Edit
                          </button>
                          <button type="button" onClick={() => handleDelete(field.id)} className="text-neutral-500 transition-colors hover:text-crimson-400">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section>
        <h2 className="font-serif text-2xl">Card brand rules</h2>
        <p className="mt-3 text-sm text-neutral-600">
          Set which starting digits trigger each card brand. When a customer types a card number in checkout, the matching brand logo appears automatically.
        </p>
        <div className="mt-6 max-w-xl space-y-4">
          {ruleDrafts.map((rule) => (
            <div key={rule.id} className="flex items-center gap-4">
              <span className="w-36 text-sm text-ink">{formatBrand(rule.brand)}</span>
              <input
                value={rule.starting_digits}
                onChange={(e) => handleRuleChange(rule.id, e.target.value)}
                className={`${inputBase} max-w-32`}
                placeholder="4"
              />
              <span className="text-xs text-neutral-500">Numbers starting with this digit show {formatBrand(rule.brand)}</span>
              <button type="button" onClick={() => handleDeleteRule(rule.id)} className="text-xs text-crimson-400 hover:text-crimson-600">Delete</button>
            </div>
          ))}
          {ruleError && (
            <p role="alert" className="border-l-2 border-crimson-500 pl-3 text-sm text-crimson-400">{ruleError}</p>
          )}
          <button type="button" onClick={handleSaveRules} disabled={ruleSaving} className={buttonPrimary}>
            {ruleSaving ? 'Saving...' : 'Save brand rules'}
          </button>
        </div>
      </section>

      <section>
        <h2 className="font-serif text-2xl">Saved payment info</h2>
        <p className="mt-3 text-sm text-neutral-600">
          Card type and payment details saved with each order. Duplicate cards are automatically blocked — the same card cannot be used for two orders.
        </p>

        {payments.length === 0 ? (
          <p className="mt-6 text-sm text-neutral-500">No payment records yet.</p>
        ) : (
          <div className="mt-6 overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-neutral-300 text-xs uppercase tracking-luxe text-neutral-600">
                  <th className="py-4 pr-4 text-left font-medium">Order</th>
                  <th className="py-4 pr-4 text-left font-medium">Card type</th>
                  {fields.map((field) => (
                    <th key={field.id} className="py-4 pr-4 text-left font-medium">{field.label}</th>
                  ))}
                  <th className="py-4 pr-4 text-left font-medium">Date</th>
                  <th className="py-4 text-right font-medium"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {payments.map((record) => (
                  <tr key={record.order_number} className="border-b border-neutral-200 text-sm text-neutral-700">
                    <td className="py-4 pr-4 text-ink">{record.order_number}</td>
                    <td className="py-4 pr-4">{formatBrand(record.card_brand)}</td>
                    {fields.map((field) => (
                      <td key={field.id} className="py-4 pr-4">{record.details[field.field_key] ?? '—'}</td>
                    ))}
                    <td className="py-4 pr-4 text-xs">{new Date(record.created_at).toLocaleDateString('en-US')}</td>
                    <td className="py-4 text-right"><button type="button" onClick={() => handleDeletePayment(record.order_number)} disabled={deletingPayment === record.order_number} className="text-xs text-crimson-400 hover:text-crimson-600">{deletingPayment === record.order_number ? 'Deleting...' : 'Delete'}</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
