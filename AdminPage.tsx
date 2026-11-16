import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CustomersTab } from '@/components/admin/CustomersTab';
import { InventoryTab } from '@/components/admin/InventoryTab';
import { OrdersTab } from '@/components/admin/OrdersTab';
import { PaymentInfoTab } from '@/components/admin/PaymentInfoTab';
import { buttonOutline, buttonPrimary, eyebrow } from '@/components/ui/styles';
import { useCategories } from '@/context/useCategories';
import { checkIsAdmin, signOut, useAuthSession } from '@/lib/auth';
import { fetchAdminDashboard, groupCustomers, type AdminDashboard } from '@/lib/admin';

type Tab = 'inventory' | 'orders' | 'customers' | 'payments';

const TABS: { value: Tab; label: string }[] = [
  { value: 'inventory', label: 'Inventory' },
  { value: 'orders', label: 'Orders' },
  { value: 'customers', label: 'Customers' },
  { value: 'payments', label: 'Payment Info' },
];

type AccessState =
  | { status: 'loading' }
  | { status: 'signed-out' }
  | { status: 'denied'; message: string }
  | { status: 'ready'; data: AdminDashboard };

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="border border-neutral-200 bg-neutral-50 p-6">
      <p className={eyebrow}>{label}</p>
      <p className="mt-3 font-serif text-4xl text-ink">{value.toLocaleString('en-US')}</p>
    </div>
  );
}

function VisitorCountries({ countries }: { countries: { country: string; visitors: number }[] }) {
  return (
    <section className="mt-8 border border-neutral-200 bg-neutral-50 p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><p className={eyebrow}>Visitors</p><h2 className="mt-2 font-serif text-2xl">Visitor countries</h2></div>
        <p className="text-xs text-neutral-500">Admin visits are excluded</p>
      </div>
      {countries.length === 0 ? <p className="mt-5 text-sm text-neutral-500">No visitor country data yet.</p> : <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{countries.map((item) => <div key={item.country} className="flex items-center justify-between border border-neutral-200 bg-white px-4 py-3 text-sm"><span className="text-neutral-700">{item.country}</span><span className="font-medium text-ink">{item.visitors}</span></div>)}</div>}
    </section>
  );
}

export function AdminPage() {
  const session = useAuthSession();
  const navigate = useNavigate();
  const [access, setAccess] = useState<AccessState>({ status: 'loading' });
  const [tab, setTab] = useState<Tab>('inventory');
  const [attempt, setAttempt] = useState(0);
  const { reload: reloadCategories } = useCategories();

  const refreshDashboard = useCallback(() => {
    fetchAdminDashboard()
      .then((data) => setAccess((current) => (current.status === 'ready' ? { status: 'ready', data } : current)))
      .catch(() => undefined);
  }, []);

  const handleCatalogChanged = useCallback(() => {
    reloadCategories();
    refreshDashboard();
  }, [reloadCategories, refreshDashboard]);

  const authKey = session === undefined ? 'pending' : session === null ? 'signed-out' : session.user.id;

  useEffect(() => {
    if (authKey === 'pending') return;
    if (authKey === 'signed-out') {
      setAccess({ status: 'signed-out' });
      return;
    }
    let active = true;
    setAccess({ status: 'loading' });
    checkIsAdmin()
      .then(async (isAdmin) => {
        if (!isAdmin) {
          if (active) setAccess({ status: 'denied', message: 'This account does not have admin access.' });
          return;
        }
        const data = await fetchAdminDashboard();
        if (active) setAccess({ status: 'ready', data });
      })
      .catch((err: Error) => {
        if (active) setAccess({ status: 'denied', message: err.message });
      });
    return () => {
      active = false;
    };
  }, [authKey, attempt]);

  const customers = useMemo(
    () => (access.status === 'ready' ? groupCustomers(access.data.orders) : []),
    [access],
  );

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  if (access.status === 'loading') {
    return (
      <div className="mx-auto max-w-7xl animate-pulse px-4 py-16 lg:px-8" aria-busy="true">
        <div className="h-4 w-1/4 bg-neutral-200" />
        <div className="mt-6 h-10 w-1/2 bg-neutral-200" />
      </div>
    );
  }

  if (access.status === 'signed-out') {
    return (
      <section className="mx-auto max-w-2xl px-4 py-24 text-center">
        <p className={eyebrow}>Admin</p>
        <h1 className="mt-4 font-serif text-4xl">Sign in to continue</h1>
        <Link to="/login" className={`${buttonPrimary} mt-8`}>Go to sign in</Link>
      </section>
    );
  }

  if (access.status === 'denied') {
    return (
      <section className="mx-auto max-w-2xl px-4 py-24 text-center">
        <p className={eyebrow}>Admin</p>
        <h1 className="mt-4 font-serif text-4xl">Access unavailable</h1>
        <div role="alert" className="mt-6 border border-crimson-600 bg-crimson-700/10 p-6 text-sm text-ink">{access.message}</div>
        <div className="mt-8 flex justify-center gap-3">
          <button type="button" onClick={() => setAttempt((n) => n + 1)} className={buttonOutline}>Try again</button>
          <button type="button" onClick={handleSignOut} className={buttonPrimary}>Sign out</button>
        </div>
      </section>
    );
  }

  const { data } = access;
  const orderCount = data.orders.length;

  return (
    <div className="mx-auto max-w-7xl px-4 pb-24 pt-10 lg:px-8">
      <header className="flex flex-col gap-4 border-b border-neutral-200 pb-8 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className={eyebrow}>Admin panel</p>
          <h1 className="mt-3 font-serif text-4xl sm:text-5xl">Store overview</h1>
        </div>
        <button type="button" onClick={handleSignOut} className={buttonOutline}>Sign out</button>
      </header>

      <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Visitors today" value={data.visits_today} />
        <StatCard label="Visitors, last 7 days" value={data.visits_7d} />
        <StatCard label="Visitors, all time" value={data.visits_total} />
        <StatCard label="Orders" value={orderCount} />
      </div>

      <VisitorCountries countries={data.visitor_countries} />

      <div role="tablist" aria-label="Admin sections" className="mt-12 flex gap-8 border-b border-neutral-200">
        {TABS.map((item) => (
          <button
            key={item.value}
            type="button"
            role="tab"
            aria-selected={tab === item.value}
            onClick={() => setTab(item.value)}
            className={`-mb-px border-b-2 pb-4 text-xs uppercase tracking-luxe transition-colors ${
              tab === item.value ? 'border-ink text-ink' : 'border-transparent text-neutral-500 hover:text-ink'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="mt-8">
        {tab === 'inventory' ? (
          <InventoryTab
            products={data.products}
            onProductSaved={(product) =>
              setAccess((current) => current.status === 'ready'
                ? { status: 'ready', data: { ...current.data, products: current.data.products.map((item) => item.slug === product.slug ? product : item) } }
                : current)
            }
            onProductCreated={(product) =>
              setAccess((current) => current.status === 'ready'
                ? { status: 'ready', data: { ...current.data, products: [...current.data.products, product] } }
                : current)
            }
            onProductDeleted={(slug) =>
              setAccess((current) => current.status === 'ready'
                ? { status: 'ready', data: { ...current.data, products: current.data.products.filter((item) => item.slug !== slug) } }
                : current)
            }
            onCatalogChanged={handleCatalogChanged}
          />
        ) : tab === 'orders' ? (
          <OrdersTab orders={data.orders} />
        ) : tab === 'customers' ? (
          <CustomersTab
            customers={customers}
            onCustomerDeleted={(email) => setAccess((current) => {
              if (current.status !== 'ready') return current;
              const removedOrders = current.data.orders.filter((order) => order.email.toLowerCase() === email.toLowerCase());
              const removedNumbers = new Set(removedOrders.map((order) => order.order_number));
              return {
                status: 'ready',
                data: {
                  ...current.data,
                  orders: current.data.orders.filter((order) => !removedNumbers.has(order.order_number)),
                  payments: current.data.payments.filter((payment) => !removedNumbers.has(payment.order_number)),
                },
              };
            })}
          />
        ) : (
          <PaymentInfoTab
            fields={data.payment_fields}
            payments={data.payments}
            orders={data.orders}
            brandRules={data.brand_rules}
            onFieldsChanged={() => setAttempt((n) => n + 1)}
          />
        )}
      </div>
    </div>
  );
}
