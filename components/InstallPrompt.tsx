// components/InstallPrompt.tsx
'use client';

import { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    // 确保在浏览器环境中运行
    if (typeof window === 'undefined') return;

    // 检查是否已安装
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    const installFlag = localStorage.getItem('journal-install-prompt-installed');
    if (isStandalone || installFlag === '1') {
      return;
    }

    // 检查是否已经拒绝过安装提示
    const dismissedUntil = localStorage.getItem('journal-install-prompt-dismissed');
    if (dismissedUntil) {
      const expiry = new Date(dismissedUntil);
      if (!Number.isNaN(expiry.getTime()) && expiry.getTime() > Date.now()) {
        return;
      }
      localStorage.removeItem('journal-install-prompt-dismissed');
    }

    // 监听 beforeinstallprompt 事件
    const handler = (e: Event) => {
      e.preventDefault();
      const promptEvent = e as BeforeInstallPromptEvent;
      setDeferredPrompt(promptEvent);

      // 延迟显示提示（避免打扰用户）
      setTimeout(() => {
        setShowPrompt(true);
      }, 3000); // 3秒后显示
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    // 显示安装提示
    await deferredPrompt.prompt();

    // 等待用户选择
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`[InstallPrompt] User choice: ${outcome}`);

    // 清理状态
    setDeferredPrompt(null);
    setShowPrompt(false);

    if (outcome === 'accepted') {
      console.log('[InstallPrompt] PWA installed successfully');
      localStorage.setItem('journal-install-prompt-installed', '1');
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    // 记住用户选择（30天内不再显示）
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 30);
    localStorage.setItem('journal-install-prompt-dismissed', expiryDate.toISOString());
  };

  if (!showPrompt || !deferredPrompt) {
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
