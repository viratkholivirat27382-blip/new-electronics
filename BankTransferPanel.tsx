import { useState } from 'react';
import { Check, Copy, ExternalLink, Upload } from 'lucide-react';
import { buttonAccent, inputBase, labelBase } from '@/components/ui/styles';
import { formatUSD } from '@/lib/format';
import type { BankTransferProof } from '@/lib/orders';

export const BANK_TRANSFER_LINK = 'https://remit.ly/pay/shahidah3424';

type BankTransferPanelProps = {
  amount: number | null;
  proof: BankTransferProof;
  onProofChange: (proof: BankTransferProof) => void;
};

export function BankTransferPanel({ amount, proof, onProofChange }: BankTransferPanelProps) {
  const [copied, setCopied] = useState(false);

  const copyLink = async () => {
    await navigator.clipboard.writeText(BANK_TRANSFER_LINK);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  const handleProofUpload = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) return;
    if (file.size > 2 * 1024 * 1024) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') onProofChange({ ...proof, proof_image: reader.result });
    };
    reader.readAsDataURL(file);
  };

  return (
    <section className="rounded-2xl border border-lime-300 bg-lime-50/40 p-4 sm:p-6" aria-label="Bank transfer payment">
      <div className="grid gap-5 md:grid-cols-[180px_1fr] md:items-center">
        <div className="mx-auto flex h-44 w-44 items-center justify-center rounded-xl bg-white p-3 shadow-sm">
          <img src="/remitly-payment-qr.png" alt="QR code for bank transfer payment" className="h-full w-full" />
        </div>
        <div>
          <p className="text-lg font-semibold text-ink">Pay by bank transfer</p>
          <p className="mt-2 text-sm leading-relaxed text-neutral-600">Scan the QR code or open the payment link to complete your payment.</p>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <a href={BANK_TRANSFER_LINK} target="_blank" rel="noreferrer" className={`${buttonAccent} justify-center px-4 py-2.5 text-xs`}>
              <ExternalLink className="h-4 w-4" /> Open payment link
            </a>
            <button type="button" onClick={copyLink} className="inline-flex items-center justify-center gap-2 border border-ink px-4 py-2.5 text-xs font-medium text-ink transition-colors hover:bg-white">
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? 'Copied' : 'Copy link'}
            </button>
          </div>
          {amount !== null && <p className="mt-4 text-sm font-medium text-ink">Amount to send: {formatUSD(amount)}</p>}
        </div>
      </div>

      <div className="mt-6 grid gap-4 border-t border-lime-200 pt-5 sm:grid-cols-2">
        <div>
          <label htmlFor="bank-sender-name" className={labelBase}>Sender name</label>
          <input
            id="bank-sender-name"
            value={proof.sender_name}
            onChange={(event) => onProofChange({ ...proof, sender_name: event.target.value })}
            className={inputBase}
            placeholder="Name used for payment"
            autoComplete="name"
          />
        </div>
        <div>
          <label htmlFor="bank-amount" className={labelBase}>Amount sent</label>
          <input
            id="bank-amount"
            type="number"
            min="0"
            step="0.01"
            value={proof.amount}
            onChange={(event) => onProofChange({ ...proof, amount: event.target.value })}
            className={inputBase}
            placeholder="0.00"
            inputMode="decimal"
          />
        </div>
        <label htmlFor="bank-proof" className="flex cursor-pointer items-center gap-3 border border-dashed border-neutral-300 bg-white px-4 py-3 text-sm text-neutral-700 sm:col-span-2">
          <Upload className="h-4 w-4 shrink-0" />
          <span className="min-w-0 flex-1 truncate">{proof.proof_image ? 'Payment screenshot attached' : 'Upload payment screenshot'}</span>
          <input id="bank-proof" type="file" accept="image/*" onChange={(event) => handleProofUpload(event.target.files?.[0])} className="sr-only" />
        </label>
      </div>
      <p className="mt-3 text-xs leading-relaxed text-neutral-500">Your order will stay pending until the payment is checked and approved.</p>
    </section>
  );
}
