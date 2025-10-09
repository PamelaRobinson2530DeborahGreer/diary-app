// components/SecurityGate.tsx
'use client';

import React, { useEffect } from 'react';
import { useSecurityContext } from '@/contexts/SecurityContext';
import { LockScreen } from '@/features/security/LockScreen';
import { Loader2 } from 'lucide-react';

export function SecurityGate({ children }: { children: React.ReactNode }) {
  const context = useSecurityContext();
  const { isLocked, isLoading, requiresSetup, hasBiometric, canUseBiometric } = context;

  // Expose context to LockScreen via window (temporary bridge)
  useEffect(() => {
    (window as any).__securityContext = context;
    return () => {
      delete (window as any).__securityContext;
    };
  }, [context]);

  // Show loading state while checking security status
  if (isLoading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground">加载中...</p>
        </div>
      </div>
    );
  }

  // Show lock screen if locked or requires setup
  if (isLocked || requiresSetup) {
    return (
      <LockScreen
        onUnlock={async (key) => {
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