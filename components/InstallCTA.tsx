// components/InstallCTA.tsx
'use client';

import { useMemo } from 'react';
import { Download, Info } from 'lucide-react';
import { useInstallPrompt } from '@/contexts/InstallPromptContext';

function isIosStandaloneUnsupported(): boolean {
  if (typeof window === 'undefined') return false;
  const ua = window.navigator.userAgent || '';
  const isIOS = /iphone|ipad|ipod/i.test(ua);
  const isMacSafari = /Macintosh/.test(ua) && 'ontouchend' in document;
  return isIOS || isMacSafari;
}

export function InstallCTA() {
  const {
    deferredPrompt,
    promptInstall,
    isInstallable,
    installed,
    dismissPrompt,
  } = useInstallPrompt();

  const iosHelpUrl = 'https://support.apple.com/zh-cn/HT200290';

  const status = useMemo(() => {
    if (installed) return 'installed';
    if (deferredPrompt) return 'available';
    if (isInstallable) return 'waiting';
    if (isIosStandaloneUnsupported()) return 'ios';
    return 'unsupported';
  }, [deferredPrompt, installed, isInstallable]);

  const handleInstall = async () => {
    if (status !== 'available' && status !== 'waiting') {
      return;
    }
    const result = await promptInstall();
    if (result === 'dismissed') {
      dismissPrompt(7);
    }
  };

  const renderDescription = () => {
    if (status === 'installed') {
      return '已添加到主屏幕，可在系统中直接打开。';
    }
    if (status === 'available') {
      return '安装后可离线使用、全屏体验，并获得通知提醒。';
    }
    if (status === 'waiting') {
      return '安装提示已被关闭，稍后将再次提醒。若需立即安装，可刷新页面后再试。';
    }
    if (status === 'ios') {
      return (
        <>
          请点击 Safari 分享按钮，选择 <strong>“添加到主屏幕”</strong> 即可完成安装。
        </>
      );
    }
    return '当前浏览器不支持直接安装，可换用 Chrome、Edge 等浏览器。';
  };

  const buttonLabel = (() => {
    switch (status) {
      case 'installed':
        return '已安装';
      case 'waiting':
        return '稍后提醒';
      case 'ios':
        return '查看教程';
      case 'unsupported':
        return '了解更多';
      default:
        return '安装到主屏幕';
    }
  })();

  const handleButtonClick = () => {
    if (status === 'ios') {
      window.open(iosHelpUrl, '_blank', 'noopener');
      return;
    }
    if (status === 'unsupported') {
      window.open('https://web.dev/what-are-pwas/', '_blank', 'noopener');
      return;
    }
    void handleInstall();
  };

  const disabled = status === 'installed' || status === 'waiting';

  return (
    <section className="bg-card rounded-lg border border-border/60 p-6 space-y-4">
      <div className="flex items-center gap-2">
        <Download className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold">安装到主屏幕</h2>
      </div>

      <p className="text-sm text-muted-foreground">{renderDescription()}</p>

      {(status === 'ios' || status === 'unsupported') && (
        <div className="flex items-start gap-2 rounded-md border border-dashed border-border/70 bg-muted/30 p-3 text-xs text-muted-foreground">
          <Info className="h-4 w-4 flex-shrink-0 text-primary" />
          <span>
            {status === 'ios'
              ? '打开 Safari，点击底部分享按钮（一个方框上箭头），选择“添加到主屏幕”。'
              : 'PWA 安装仅在支持的浏览器中可用，可换用 Chrome 或 Edge 再试。'}
          </span>
        </div>
      )}

      <button
        type="button"
        onClick={handleButtonClick}
        disabled={disabled}
        className="
          inline-flex w-full items-center justify-center gap-2 rounded-lg
          bg-primary px-4 py-2 text-sm font-medium text-primary-foreground
          transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60
        "
      >
        <Download className="h-4 w-4" />
        {buttonLabel}
      </button>
    </section>
  );
}
