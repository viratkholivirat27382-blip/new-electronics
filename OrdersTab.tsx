import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { eyebrow } from '@/components/ui/styles';
import { formatUSD } from '@/lib/format';
import type { AdminOrder, AdminOrderItem } from '@/lib/admin';

function statusBadge(status: string) {
  const normalized = status.toLowerCase();
  const isPending = normalized === 'pending' || normalized === 'confirmed' || normalized === 'processing' || normalized === 'bank_transfer_pending';
  const isCompleted = normalized === 'delivered' || normalized === 'shipped' || normalized === 'bank_transfer_paid' || normalized === 'simulated_paid';
  const base = 'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize';
  if (isCompleted) return `${base} bg-emerald-50 text-emerald-700 border border-emerald-200`;
  if (normalized === 'cancelled') return `${base} bg-crimson-50 text-crimson-700 border border-crimson-200`;
  if (isPending) return `${base} bg-amber-50 text-amber-700 border border-amber-200`;
  return `${base} bg-neutral-100 text-neutral-600 border border-neutral-200`;
}

function normalizeStatus(status: string): 'pending' | 'completed' {
  const normalized = status.toLowerCase();
  if (normalized === 'delivered' || normalized === 'shipped' || normalized === 'bank_transfer_paid' || normalized === 'simulated_paid' || normalized === 'simulated_cod_fee_paid') return 'completed';
  return 'pending';
}

function OrderItems({ items }: { items: AdminOrderItem[] }) {
  if (items.length === 0) return <p className="text-xs text-neutral-400">No item details available.</p>;
  return (
    <div className="space-y-2">
      {items.map((item, index) => (
        <div key={index} className="flex items-center gap-3">
          {item.image && <img src={item.image} alt="" className="h-10 w-10 shrink-0 rounded border border-neutral-200 object-cover" />}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm text-ink">{item.name}</p>
            <p className="text-xs text-neutral-500">
              {item.quantity} × {formatUSD(item.unit_price)}
              {item.size && <span className="ml-1">· Size {item.size}</span>}
              {item.color && <span className="ml-1">· {item.color}</span>}
            </p>
          </div>
          <span className="text-sm font-medium text-neutral-700">{formatUSD(item.line_total)}</span>
        </div>
      ))}
    </div>
  );
}

type OrderRowProps = {
  order: AdminOrder;
};

function OrderRow({ order }: OrderRowProps) {
  const [expanded, setExpanded] = useState(false);
  const displayStatus = normalizeStatus(order.status);
  const customerName = `${order.first_name} ${order.last_name}`.trim() || order.email;
  const date = new Date(order.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <>
      <tr className="border-b border-neutral-200 align-top">
        <td className="py-4 pr-4 text-sm text-ink">{order.order_number}</td>
        <td className="py-4 pr-4 text-sm text-neutral-700">{customerName}</td>
        <td className="py-4 pr-4">
          <span className={statusBadge(displayStatus)}>{displayStatus}</span>
        </td>
        <td className="py-4 pr-4 text-sm text-neutral-700">{formatUSD(order.total)}</td>
        <td className="py-4 pr-4 text-sm text-neutral-500">{date}</td>
        <td className="py-4">
          <button type="button" onClick={() => setExpanded((value) => !value)} className="text-neutral-500 hover:text-ink" aria-label={expanded ? 'Collapse' : 'Expand'}>
            <ChevronDown className={`h-4 w-4 transition-transform ${expanded ? 'rotate-180' : ''}`} />
          </button>
        </td>
      </tr>
      {expanded && (
        <tr className="border-b border-neutral-200 bg-neutral-50">
          <td colSpan={6} className="px-6 py-5">
            <p className={eyebrow}>Products in this order</p>
            <div className="mt-3"><OrderItems items={order.items} /></div>
          </td>
        </tr>
      )}
    </>
  );
}

type OrdersTabProps = {
  orders: AdminOrder[];
};

export function OrdersTab({ orders }: OrdersTabProps) {
  if (orders.length === 0) return <p className="text-sm text-neutral-600">No orders yet.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[900px] text-left">
        <thead>
          <tr className="border-b border-neutral-300 text-xs uppercase tracking-luxe text-neutral-600">
            <th className="py-3 pr-4 font-medium">Order #</th>
            <th className="py-3 pr-4 font-medium">Customer</th>
            <th className="py-3 pr-4 font-medium">Status</th>
            <th className="py-3 pr-4 font-medium">Total</th>
            <th className="py-3 pr-4 font-medium">Date</th>
            <th className="py-3 font-medium"><span className="sr-only">Details</span></th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => <OrderRow key={order.order_number} order={order} />)}
        </tbody>
      </table>
    </div>
  );
}
