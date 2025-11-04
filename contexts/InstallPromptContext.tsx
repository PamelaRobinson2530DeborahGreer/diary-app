// contexts/InstallPromptContext.tsx
'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface InstallPromptContextValue {
  isInstallable: boolean;
  installed: boolean;
  showPrompt: boolean;
  deferredPrompt: BeforeInstallPromptEvent | null;
  promptInstall: () => Promise<'accepted' | 'dismissed' | 'unavailable' | 'error'>;
  dismissPrompt: (days?: number) => void;
  acknowledgeInstall: () => void;
}

const InstallPromptContext = createContext<InstallPromptContextValue | undefined>(undefined);

const INSTALL_FLAG = 'journal-install-prompt-installed';
const INSTALL_DISMISS = 'journal-install-prompt-dismissed';

function getDismissedUntil(): Date | null {
  const stored = typeof window !== 'undefined' ? localStorage.getItem(INSTALL_DISMISS) : null;
  if (!stored) return null;
  const parsed = new Date(stored);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function InstallPromptProvider({ children }: { children: ReactNode }) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [isInstallable, setIsInstallable] = useState(false);
  const promptTimeout = useRef<number | undefined>(undefined);
  const suppressPrompt = useRef(false);

  const clearScheduledPrompt = useCallback(() => {
    if (promptTimeout.current) {
      window.clearTimeout(promptTimeout.current);
      promptTimeout.current = undefined;
    }
  }, []);

  const handleAppInstalled = useCallback(() => {
    setInstalled(true);
    setDeferredPrompt(null);
    setShowPrompt(false);
    localStorage.setItem(INSTALL_FLAG, '1');
    localStorage.removeItem(INSTALL_DISMISS);
  }, []);

  const dismissPrompt = useCallback((days = 30) => {
    clearScheduledPrompt();
    setShowPrompt(false);
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + days);
    localStorage.setItem(INSTALL_DISMISS, expiry.toISOString());
    suppressPrompt.current = true;
  }, [clearScheduledPrompt]);

  const promptInstall = useCallback(async (): Promise<
    'accepted' | 'dismissed' | 'unavailable' | 'error'
  > => {
    if (!deferredPrompt) {
      return 'unavailable';
    }
    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      setDeferredPrompt(null);
      setShowPrompt(false);
      if (outcome === 'accepted') {
        handleAppInstalled();
      }
      return outcome;
    } catch (error) {
      console.error('[InstallPrompt] Failed to prompt install:', error);
      setDeferredPrompt(null);
      setShowPrompt(false);
      return 'error';
    }
  }, [deferredPrompt, handleAppInstalled]);

  const acknowledgeInstall = useCallback(() => {
    localStorage.setItem(INSTALL_FLAG, '1');
    setInstalled(true);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true ||
      localStorage.getItem(INSTALL_FLAG) === '1';

    if (standalone) {
      setInstalled(true);
      return;
    }

    const dismissedUntil = getDismissedUntil();
    if (dismissedUntil && dismissedUntil.getTime() > Date.now()) {
      suppressPrompt.current = true;
    } else {
      suppressPrompt.current = false;
      localStorage.removeItem(INSTALL_DISMISS);
    }

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      const promptEvent = event as BeforeInstallPromptEvent;
      setDeferredPrompt(promptEvent);
      setIsInstallable(true);

      if (suppressPrompt.current) {
        return;
      }

      clearScheduledPrompt();
      promptTimeout.current = window.setTimeout(() => {
        setShowPrompt(true);
      }, 3000);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      clearScheduledPrompt();
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [clearScheduledPrompt, handleAppInstalled]);

  const value = useMemo<InstallPromptContextValue>(
    () => ({
      isInstallable,
      installed,
      showPrompt,
      deferredPrompt,
      promptInstall,
      dismissPrompt,
      acknowledgeInstall,
    }),
    [
      isInstallable,
      installed,
      showPrompt,
      deferredPrompt,
      promptInstall,
      dismissPrompt,
      acknowledgeInstall,
    ]
  );

  return (
    <InstallPromptContext.Provider value={value}>
      {children}
    </InstallPromptContext.Provider>
  );
}

export function useInstallPrompt(): InstallPromptContextValue {
  const context = useContext(InstallPromptContext);
  if (!context) {
    throw new Error('useInstallPrompt must be used within InstallPromptProvider');
  }
  return context;
}
