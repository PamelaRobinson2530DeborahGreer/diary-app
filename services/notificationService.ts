// services/notificationService.ts

export interface NotificationOptions {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: any;
  requireInteraction?: boolean;
}

class NotificationService {
  /**
   * 检查浏览器是否支持通知
   */
  isSupported(): boolean {
    return 'Notification' in window && 'serviceWorker' in navigator;
  }

  /**
   * 获取当前通知权限状态
   */
  getPermission(): NotificationPermission {
    if (!this.isSupported()) {
      return 'denied';
    }
    return Notification.permission;
  }

  /**
   * 请求通知权限
   */
  async requestPermission(): Promise<NotificationPermission> {
    if (!this.isSupported()) {
      console.warn('[Notifications] Not supported in this browser');
      return 'denied';
    }

    if (Notification.permission === 'granted') {
      return 'granted';
    }

    if (Notification.permission === 'denied') {
      console.warn('[Notifications] Permission previously denied');
      return 'denied';
    }

    try {
      const permission = await Notification.requestPermission();
      console.log('[Notifications] Permission result:', permission);
      return permission;
    } catch (error) {
      console.error('[Notifications] Permission request failed:', error);
      return 'denied';
    }
  }

  /**
   * 显示本地通知
   */
  async showNotification(options: NotificationOptions): Promise<void> {
    const permission = this.getPermission();

    if (permission !== 'granted') {
      console.warn('[Notifications] Permission not granted');
      return;
    }

    try {
      const registration = await navigator.serviceWorker.ready;

      await registration.showNotification(options.title, {
        body: options.body,
        icon: options.icon || '/icon-192.png',
        badge: options.badge || '/icon-192.png',
        tag: options.tag,
        data: options.data,
        requireInteraction: options.requireInteraction || false,
      });

      console.log('[Notifications] Notification shown:', options.title);
    } catch (error) {
      console.error('[Notifications] Failed to show notification:', error);
    }
  }

  /**
   * 写作提醒通知
   */
  async showWritingReminder(): Promise<void> {
    await this.showNotification({
      title: '✍️ 今天还没有写日记',
      body: '记录一下今天的心情和想法吧',
      tag: 'writing-reminder',
      data: { type: 'reminder', action: 'open-new' },
    });
  }

  /**
   * 连续写作鼓励通知
   */
  async showStreakNotification(days: number): Promise<void> {
    await this.showNotification({
      title: `🔥 连续写作 ${days} 天！`,
      body: '继续保持，你做得很棒！',
      tag: 'streak-celebration',
      data: { type: 'celebration', days },
    });
  }

  /**
   * 目标完成通知
   */
  async showGoalCompletedNotification(goalName: string): Promise<void> {
    await this.showNotification({
      title: '🎉 目标达成！',
      body: `恭喜你完成了「${goalName}」`,
      tag: 'goal-completed',
      data: { type: 'goal', name: goalName },
      requireInteraction: true,
    });
  }

  /**
   * 取消指定标签的通知
   */
  async cancelNotification(tag: string): Promise<void> {
    try {
      const registration = await navigator.serviceWorker.ready;
      const notifications = await registration.getNotifications({ tag });

      notifications.forEach(notification => {
        notification.close();
      });

      console.log(`[Notifications] Cancelled notifications with tag: ${tag}`);
    } catch (error) {
      console.error('[Notifications] Failed to cancel notification:', error);
    }
  }

  /**
   * 取消所有通知
   */
  async cancelAllNotifications(): Promise<void> {
    try {
      const registration = await navigator.serviceWorker.ready;
      const notifications = await registration.getNotifications();

      notifications.forEach(notification => {
        notification.close();
      });

      console.log('[Notifications] Cancelled all notifications');
    } catch (error) {
      console.error('[Notifications] Failed to cancel all notifications:', error);
    }
  }

  /**
   * 设置定时提醒
   * @param hour 小时 (0-23)
   * @param minute 分钟 (0-59)
   */
  scheduleDaily(hour: number, minute: number): void {
    const now = new Date();
    const scheduledTime = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      hour,
      minute,
      0
    );

    // 如果今天的时间已过，设置到明天
    if (scheduledTime.getTime() <= now.getTime()) {
      scheduledTime.setDate(scheduledTime.getDate() + 1);
    }

    const delay = scheduledTime.getTime() - now.getTime();

    setTimeout(() => {
      this.showWritingReminder();

      // 设置明天的提醒
      this.scheduleDaily(hour, minute);
    }, delay);

    console.log(`[Notifications] Reminder scheduled for ${scheduledTime.toLocaleString()}`);
  }
}

export const notificationService = new NotificationService();
