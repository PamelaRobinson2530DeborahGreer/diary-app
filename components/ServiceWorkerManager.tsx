// components/ServiceWorkerManager.tsx
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { RefreshCw, X, AlertTriangle } from 'lucide-react';

interface UpdateState {
  waiting: ServiceWorker | null;
  showBanner: boolean;
}

/**
 * 管理 Service Worker 注册与更新提示的组件。
 * 替代原有的脚本注入方式，支持在有新版本时提示用户手动刷新。
 */
export function ServiceWorkerManager() {
  const [updateState, setUpdateState] = useState<UpdateState>({
    waiting: null,
    showBanner: false,
  });
  const [registrationError, setRegistrationError] = useState<string | null>(null);
  const refreshTriggered = useRef(false);

  const hideBanner = useCallback(() => {
    setUpdateState((prev) => ({ ...prev, showBanner: false }));
  }, []);

  const handleWaitingServiceWorker = useCallback((waiting: ServiceWorker | null) => {
    if (!waiting) return;
    setUpdateState({
      waiting,
      showBanner: true,
    });
  }, []);

  const handleServiceWorkerUpdate = useCallback(
    (registration: ServiceWorkerRegistration) => {
      if (!registration) return;

      if (registration.waiting) {
        handleWaitingServiceWorker(registration.waiting);
        return;
      }

      const listenInstalledStateChange = () => {
        const installingWorker = registration.installing;
        if (!installingWorker) {
          return;
        }

        installingWorker.addEventListener('statechange', () => {
          if (
            installingWorker.state === 'installed' &&
            navigator.serviceWorker.controller
          ) {
            handleWaitingServiceWorker(installingWorker);
          }
        });
      };

      registration.addEventListener('updatefound', listenInstalledStateChange);
    },
    [handleWaitingServiceWorker]
  );

  const refreshPage = useCallback(() => {
    const waitingWorker = updateState.waiting;
    if (!waitingWorker) return;

    waitingWorker.postMessage({ type: 'SKIP_WAITING' });
    refreshTriggered.current = true;
  }, [updateState.waiting]);

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return;
    }

    let didCancel = false;

    const registerServiceWorker = () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          if (didCancel) return;
          console.info('[ServiceWorkerManager] SW registered:', registration.scope);
          handleServiceWorkerUpdate(registration);
        })
        .catch((error: unknown) => {
          if (didCancel) return;
          console.error('[ServiceWorkerManager] SW registration failed:', error);
          setRegistrationError(
            error instanceof Error ? error.message : 'Service Worker 注册失败'
          );
        });
    };

    if (document.readyState === 'complete') {
      registerServiceWorker();
    } else {
      const onLoad = () => registerServiceWorker();
      window.addEventListener('load', onLoad, { once: true });
      return () => {
        didCancel = true;
        window.removeEventListener('load', onLoad);
      };
    }

    const onControllerChange = () => {
      if (!refreshTriggered.current) return;
      window.location.reload();
    };

    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);

    return () => {
      didCancel = true;
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
    };
  }, [handleServiceWorkerUpdate]);

  if (!updateState.showBanner && !registrationError) {
    return null;
  }

  const waiting = updateState.waiting;

  return (
    <div
      className="
        fixed bottom-6 right-4 left-4 sm:left-auto sm:w-96
        z-50 rounded-lg border bg-card shadow-lg
        p-4 flex gap-3 items-start animate-slide-up
      "
      role="status"
      aria-live="polite"
    >
      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        {registrationError ? <AlertTriangle className="h-5 w-5" /> : <RefreshCw className="h-5 w-5" />}
      </div>
      <div className="flex-1 text-sm">
        <p className="font-medium">
          {registrationError ? '离线功能暂不可用' : '发现新的更新'}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {registrationError
            ? '注册 Service Worker 时出现问题，请刷新页面或稍后重试。'
            : '新版应用已准备就绪，点击“立即更新”应用最新功能。'}
        </p>
        {!registrationError && (
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={refreshPage}
              className="flex-1 rounded bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
              disabled={!waiting}
            >
              立即更新
            </button>
            <button
              type="button"
              onClick={hideBanner}
              className="rounded px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              稍后
            </button>
          </div>
        )}
      </div>
      <button
        type="button"
        onClick={hideBanner}
        className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full hover:bg-secondary transition-colors"
        aria-label="关闭提示"
      >
        <X className="h-4 w-4 text-muted-foreground" />
      </button>
    </div>
  );
}

