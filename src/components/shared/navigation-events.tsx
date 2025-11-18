'use client';

import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { useLoader } from '@/context/loader-context';

export function NavigationEvents() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { hideLoader } = useLoader();

  useEffect(() => {
    // This component can be used to trigger actions on route changes.
    hideLoader();
  }, [pathname, searchParams, hideLoader]);

  return null;
}
