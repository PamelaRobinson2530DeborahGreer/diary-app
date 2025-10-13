// components/SecurityGate.tsx
'use client';

import React, { useEffect } from 'react';
import { useSecurityContext } from '@/contexts/SecurityContext';
import { LockScreen } from '@/features/security/LockScreen';
import { Loader2 } from 'lucide-react';

export function SecurityGate({ children }: { children: React.ReactNode }) {
  const context = useSecurityContext();
  const { isLocked, isLoading, requiresSetup, hasBiometric, canUseBiometric } = context;
  const [isUnlocking, setIsUnlocking] = React.useState(false);

  // Expose context to LockScreen via window (temporary bridge)
  useEffect(() => {
    // Wrap unlock methods to track unlocking state
    const originalContext = context;
    const wrappedContext = {
      ...context,
      unlock: async (pin: string) => {
        setIsUnlocking(true);
        try {
          const result = await originalContext.unlock(pin);
          // Give a moment for state to settle
          await new Promise(resolve => setTimeout(resolve, 50));
          return result;
        } finally {
          setIsUnlocking(false);
        }
      },
      setupPIN: async (pin: string) => {
        setIsUnlocking(true);
        try {
          const result = await originalContext.setupPIN(pin);
          // Give a moment for state to settle
          await new Promise(resolve => setTimeout(resolve, 50));
          return result;
        } finally {
          setIsUnlocking(false);
        }
      },
      unlockWithBiometric: async () => {
        setIsUnlocking(true);
        try {
          const result = await originalContext.unlockWithBiometric();
          // Give a moment for state to settle
          await new Promise(resolve => setTimeout(resolve, 50));
          return result;
        } finally {
          setIsUnlocking(false);
        }
      }
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).__securityContext = wrappedContext;
    return () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (window as any).__securityContext;
    };
  }, [context]);

  // Show loading state while checking security status or unlocking
  if (isLoading || isUnlocking) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground">{isUnlocking ? '解锁中...' : '加载中...'}</p>
        </div>
      </div>
    );
  }

  // Show lock screen if locked or requires setup
  if (isLocked || requiresSetup) {
    return (
      <LockScreen
        onUnlock={async () => {
          // The key is already set in the context by unlock/setupPIN
          // This is just for UI flow completion
          console.log('Unlock successful');
        }}
        isSetup={requiresSetup}
        storedHash={undefined}  // These are handled internally
        storedSalt={undefined}  // by the SecurityContext
        hasBiometric={hasBiometric}
        canUseBiometric={canUseBiometric}
      />
    );
  }

  // Render children when unlocked
  return <>{children}</>;
}