// components/InstallPrompt.tsx
'use client';

import { useCallback } from 'react';
import { Download, X } from 'lucide-react';
import { useInstallPrompt } from '@/contexts/InstallPromptContext';

export function InstallPrompt() {
  const {
    showPrompt,
    deferredPrompt,
    promptInstall,
    dismissPrompt,
    installed,
  } = useInstallPrompt();

  const handleInstall = useCallback(async () => {
    await promptInstall();
  }, [promptInstall]);

  const handleDismiss = useCallback(() => {
    dismissPrompt();
  }, [dismissPrompt]);

  if (!showPrompt || !deferredPrompt || installed) {
    return null;
  }

  return (
    <div
      className="
        fixed bottom-20 left-4 right-4 sm:left-auto sm:right-4 sm:w-96
        bg-card border rounded-lg shadow-lg
        p-4 flex items-start gap-3
        animate-slide-up
        z-50
      "
      role="alert"
      aria-live="polite"
    >
      {/* 图标 */}
      <div className="flex-shrink-0 w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
        <Download className="w-5 h-5 text-primary" />
      </div>

      {/* 内容 */}
      <div className="flex-1">
        <h3 className="font-semibold text-sm mb-1">安装 Journal App</h3>
        <p className="text-xs text-muted-foreground mb-3">
          安装到主屏幕，获得更好的离线体验
        </p>

        {/* 操作按钮 */}
        <div className="flex gap-2">
          <button
            onClick={handleInstall}
            className="
              flex-1 px-3 py-1.5 text-xs font-medium
              bg-primary text-primary-foreground rounded
              hover:bg-primary/90 transition-colors
            "
          >
            安装
          </button>
          <button
            onClick={handleDismiss}
            className="
              px-3 py-1.5 text-xs font-medium
              text-muted-foreground hover:text-foreground
              transition-colors
            "
          >
            稍后
          </button>
        </div>
      </div>

      {/* 关闭按钮 */}
      <button
        onClick={handleDismiss}
        className="
          flex-shrink-0 w-6 h-6 rounded-full
          hover:bg-secondary transition-colors
          flex items-center justify-center
        "
        aria-label="关闭"
      >
        <X className="w-4 h-4 text-muted-foreground" />
      </button>
    </div>
  );
}
