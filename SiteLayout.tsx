import { Suspense, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { MobileBottomNav } from '@/components/layout/MobileBottomNav';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { supabase } from '@/lib/supabase';

const VISITOR_KEY = 'veyra-visitor-id';
const COUNTRY_KEY = 'veyra-visitor-country';

async function getVisitorCountry(): Promise<string | null> {
  try {
    const saved = sessionStorage.getItem(COUNTRY_KEY);
    if (saved) return saved;
    const response = await fetch('https://ipapi.co/json/');
    if (!response.ok) return null;
    const data: unknown = await response.json();
    if (!data || typeof data !== 'object' || !('country_name' in data) || typeof data.country_name !== 'string') return null;
    sessionStorage.setItem(COUNTRY_KEY, data.country_name);
    return data.country_name;
  } catch {
    return null;
  }
}

function getVisitorId(): string {
  try {
    let id = localStorage.getItem(VISITOR_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(VISITOR_KEY, id);
    }
    return id;
  } catch {
    return crypto.randomUUID();
  }
}

export function SiteLayout() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    let active = true;
    getVisitorCountry().then((country) => {
      if (!active) return;
      supabase.rpc('record_visit', { p_visitor_id: getVisitorId(), p_country: country }).then(() => undefined);
    });
    return () => {
      active = false;
    };
  }, [pathname]);

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <SiteHeader />
      <main className="flex-1 pb-16 lg:pb-0">
        <Suspense fallback={<div className="min-h-[60vh]" aria-busy="true" />}>
          <Outlet />
        </Suspense>
      </main>
      <SiteFooter />
      <MobileBottomNav />
    </div>
  );
}
