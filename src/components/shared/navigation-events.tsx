'use client';

import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { useLoader } from '@/context/loader-context';

export function NavigationEvents() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { hideLoader } = useLoader();

  useEffect(() => {
    // On any route change, ensure the loader is hidden.
    // The loading state will be managed by data fetching hooks and suspense boundaries,
    // and the root layout provides a transition animation.
    hideLoader();
  }, [pathname, searchParams, hideLoader]);

  return null;
}
