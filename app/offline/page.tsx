// app/offline/page.tsx
'use client';

import { WifiOff, RefreshCw } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function OfflinePage() {
  const [isOnline, setIsOnline] = useState(false);

  useEffect(() => {
    // 检查在线状态
    setIsOnline(navigator.onLine);

    const handleOnline = () => {
      setIsOnline(true);
      // 自动重新加载
      window.location.href = '/';
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="text-center max-w-md space-y-6">
        {/* 图标 */}
        <div className="flex justify-center">
          <div className="p-6 bg-secondary/20 rounded-full">
            <WifiOff className="w-16 h-16 text-muted-foreground" />
          </div>
        </div>

        {/* 标题 */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">网络已断开</h1>
          <p className="text-muted-foreground text-lg">
            {isOnline
              ? '正在重新连接...'
              : '请检查您的网络连接'}
          </p>
        </div>

        {/* 说明 */}
        <div className="space-y-4 text-muted-foreground">
          <p>
            Journal App 是一款渐进式 Web 应用（PWA），部分功能可离线使用。
          </p>
          <div className="text-sm bg-secondary/30 p-4 rounded-lg text-left">
            <p className="font-medium mb-2">离线可用功能：</p>
            <ul className="list-disc list-inside space-y-1">
              <li>查看已缓存的日记</li>
              <li>编辑本地日记</li>
              <li>使用主题切换</li>
            </ul>
          </div>
        </div>

        {/* 重试按钮 */}
        <button
          onClick={() => window.location.reload()}
          className="
            flex items-center gap-2 px-6 py-3 mx-auto
            bg-primary text-primary-foreground rounded-lg
            hover:bg-primary/90 transition-colors
            font-medium
          "
        >
          <RefreshCw className="w-5 h-5" />
          重新加载
        </button>

        {/* 在线状态指示器 */}
        <div className="flex items-center justify-center gap-2 text-sm">
          <div className={`
            w-2 h-2 rounded-full
            ${isOnline ? 'bg-green-500' : 'bg-red-500'}
          `} />
          <span className="text-muted-foreground">
            {isOnline ? '已连接' : '离线'}
          </span>
        </div>
      </div>
    </div>
  );
}
