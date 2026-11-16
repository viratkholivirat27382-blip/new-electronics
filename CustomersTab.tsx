import { useState } from 'react';
import { buttonOutline } from '@/components/ui/styles';
import { deleteCustomer, type AdminCustomer } from '@/lib/admin';
import { formatUSD } from '@/lib/format';

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function CustomersTab({ customers, onCustomerDeleted }: { customers: AdminCustomer[]; onCustomerDeleted: (email: string) => void }) {
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async (email: string) => {
    if (!window.confirm(`Delete all stored order data for ${email}?`)) return;
    setDeleting(email);
    setError(null);
    try {
      await deleteCustomer(email);
      onCustomerDeleted(email);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Customer data could not be deleted.');
    } finally {
      setDeleting(null);
    }
  };

  if (customers.length === 0) return <p className="text-sm text-neutral-600">No customers yet. Customer emails appear here after the first order.</p>;
  return (
    <div>
      {error && <p role="alert" className="mb-5 border-l-2 border-crimson-500 pl-3 text-sm text-crimson-400">{error}</p>}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-left">
          <thead><tr className="border-b border-neutral-300 text-xs uppercase tracking-luxe text-neutral-600"><th className="py-3 pr-4 font-medium">Email</th><th className="py-3 pr-4 font-medium">Name</th><th className="py-3 pr-4 font-medium">Orders</th><th className="py-3 pr-4 font-medium">Total spent</th><th className="py-3 pr-4 font-medium">Last order</th><th className="py-3 font-medium"><span className="sr-only">Actions</span></th></tr></thead>
          <tbody>{customers.map((customer) => <tr key={customer.email} className="border-b border-neutral-200 text-sm"><td className="py-4 pr-4 text-ink">{customer.email}</td><td className="py-4 pr-4 text-neutral-700">{customer.name}</td><td className="py-4 pr-4 text-neutral-700">{customer.orderCount}</td><td className="py-4 pr-4 text-neutral-700">{formatUSD(customer.totalSpent)}</td><td className="py-4 pr-4 text-neutral-700">{formatDate(customer.lastOrderAt)}</td><td className="py-4 text-right"><button type="button" onClick={() => handleDelete(customer.email)} disabled={deleting === customer.email} className={`${buttonOutline} px-3 py-2 text-xs text-crimson-500`}>{deleting === customer.email ? 'Deleting...' : 'Delete data'}</button></td></tr>)}</tbody>
        </table>
      </div>
    </div>
  );
}
