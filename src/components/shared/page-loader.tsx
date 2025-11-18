
'use client';

import { useLoader } from '@/context/loader-context';
import { AnimatePresence, motion } from 'framer-motion';

export function PageLoader() {
  const { isLoading } = useLoader();

  return (
    <AnimatePresence>
      {isLoading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[200] flex items-center justify-center bg-background/80 backdrop-blur-sm"
          role="status"
          aria-live="polite"
        >
          <div className="loader"></div>
          <span className="sr-only">Loading...</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
