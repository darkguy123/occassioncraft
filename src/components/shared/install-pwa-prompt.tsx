
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Download, X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useFirebase } from '@/firebase';
import Image from 'next/image';
import { usePwaInstall } from '@/context/pwa-install-context';

export function InstallPwaPrompt() {
  const { siteSettings } = useFirebase();
  const { canInstall, triggerInstall } = usePwaInstall();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (canInstall) {
      const isDismissed = sessionStorage.getItem('pwaInstallPromptDismissed');
      if (!isDismissed) {
        setIsVisible(true);
      }
    } else {
        setIsVisible(false);
    }
  }, [canInstall]);

  const handleInstallClick = () => {
    triggerInstall();
    setIsVisible(false);
  };

  const handleDismiss = () => {
    setIsVisible(false);
    sessionStorage.setItem('pwaInstallPromptDismissed', 'true');
  };

  if (!isVisible) {
    return null;
  }

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ y: 100 }}
          animate={{ y: 0 }}
          exit={{ y: 100 }}
          className="fixed bottom-0 left-0 right-0 z-[100] bg-background border-t shadow-lg md:hidden"
        >
          <div className="container mx-auto p-2 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Image src={siteSettings?.faviconUrl || '/download.png'} alt="App Icon" width={40} height={40} className="rounded-md" />
              <div>
                <p className="font-semibold text-foreground">Get the OccasionCraft App</p>
                <p className="text-sm text-muted-foreground">Add to your Home Screen for a better experience.</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={handleInstallClick}>
                <Download className="mr-2 h-4 w-4" /> Install
              </Button>
              <Button variant="ghost" size="icon" onClick={handleDismiss} className="h-8 w-8">
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
