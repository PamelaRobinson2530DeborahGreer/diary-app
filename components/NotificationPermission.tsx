// components/NotificationPermission.tsx
'use client';

import { useState, useEffect } from 'react';
import { Bell, X } from 'lucide-react';
import { notificationService } from '@/services/notificationService';

export function NotificationPermission() {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // 检查当前权限状态
    const currentPermission = notificationService.getPermission();
    setPermission(currentPermission);

    // 如果未请求过权限，且用户已使用应用一段时间，显示提示
    if (currentPermission === 'default') {
      const hasSeenPrompt = localStorage.getItem('journal-notification-prompt-seen');
      const appUsageCount = parseInt(localStorage.getItem('journal-app-usage-count') || '0');

      // 用户使用应用 3 次后显示通知权限请求
      if (!hasSeenPrompt && appUsageCount >= 3) {
        setTimeout(() => {
          setShowPrompt(true);
        }, 5000); // 延迟 5 秒显示
      }
    }
  }, []);

  const handleRequestPermission = async () => {
    const result = await notificationService.requestPermission();
    setPermission(result);
    setShowPrompt(false);

    // 记住已显示过提示
    localStorage.setItem('journal-notification-prompt-seen', 'true');

    if (result === 'granted') {
      // 显示测试通知
      await notificationService.showNotification({
        title: '🎉 通知已开启',
        body: '我们会在适当的时候提醒你写日记',
        tag: 'welcome',
      });

      // 设置每日提醒（例如每天 20:00）
      const reminderTime = localStorage.getItem('journal-reminder-time');
      if (reminderTime) {
        const [hour, minute] = reminderTime.split(':').map(Number);
        notificationService.scheduleDaily(hour, minute);
      } else {
        // 默认每晚 8 点提醒
        notificationService.scheduleDaily(20, 0);
      }
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('journal-notification-prompt-seen', 'true');

    // 30 天后再次提示
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 30);
    localStorage.setItem('journal-notification-prompt-expiry', expiryDate.toISOString());
  };

  // 如果权限已授予或拒绝，或不显示提示，则不渲染
  if (permission !== 'default' || !showPrompt) {
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
      <div className="flex-shrink-0 w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center">
        <Bell className="w-5 h-5 text-blue-500" />
      </div>

      {/* 内容 */}
      <div className="flex-1">
        <h3 className="font-semibold text-sm mb-1">开启写作提醒</h3>
        <p className="text-xs text-muted-foreground mb-3">
          每天定时提醒你写日记，养成持续记录的好习惯
        </p>

        {/* 操作按钮 */}
        <div className="flex gap-2">
          <button
            onClick={handleRequestPermission}
            className="
              flex-1 px-3 py-1.5 text-xs font-medium
              bg-blue-500 text-white rounded
              hover:bg-blue-600 transition-colors
            "
          >
            开启通知
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
