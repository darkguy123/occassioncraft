'use client'

import { useEffect } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { useLoader } from '@/context/loader-context'

export function NavigationEvents() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { showLoader, hideLoader } = useLoader();

  useEffect(() => {
    // Hide loader whenever path changes
    hideLoader();
    
    // The following is a workaround to show loader on navigation
    // It's not perfect but a common pattern.
    const originalPushState = history.pushState;
    history.pushState = function (...args) {
      const url = args[2];
      if (url && (new URL(url.toString(), window.location.origin)).pathname !== pathname) {
        // Wrap in setTimeout to avoid updating state during render
        setTimeout(() => showLoader(), 0);
      }
      return originalPushState.apply(history, args);
    }
    
    const handlePopState = () => {
        // Wrap in setTimeout to avoid updating state during render
        setTimeout(() => showLoader(), 0);
    };

    window.addEventListener('popstate', handlePopState);
    
    return () => {
      history.pushState = originalPushState;
      window.removeEventListener('popstate', handlePopState);
      hideLoader();
    }

  }, [pathname, searchParams, showLoader, hideLoader])

  return null
}
