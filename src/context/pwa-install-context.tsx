
'use client';

import { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';

// Define the event interface, as it's not part of the standard DOM typings
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

interface PwaInstallContextType {
  canInstall: boolean;
  triggerInstall: () => void;
}

const PwaInstallContext = createContext<PwaInstallContextType | undefined>(undefined);

export function PwaInstallProvider({ children }: { children: ReactNode }) {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    const handleAppInstalled = () => {
      // Clear the prompt once the app is installed
      setInstallPrompt(null);
    };
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const triggerInstall = useCallback(() => {
    if (!installPrompt) return;

    installPrompt.prompt();
    // Logic to handle user choice can be added here if needed
    installPrompt.userChoice.then((choiceResult) => {
      if (choiceResult.outcome === 'accepted') {
        console.log('User accepted the install prompt');
      } else {
        console.log('User dismissed the install prompt');
      }
      // We don't nullify the prompt here to allow retrying from the icon
    });
  }, [installPrompt]);

  const value = {
    canInstall: !!installPrompt,
    triggerInstall,
  };

  return (
    <PwaInstallContext.Provider value={value}>
      {children}
    </PwaInstallContext.Provider>
  );
}

export function usePwaInstall(): PwaInstallContextType {
  const context = useContext(PwaInstallContext);
  if (context === undefined) {
    throw new Error('usePwaInstall must be used within a PwaInstallProvider');
  }
  return context;
}
