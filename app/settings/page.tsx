// app/settings/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSecurityContext } from '@/contexts/SecurityContext';
import { useTheme } from '@/contexts/ThemeContext';
import { ArrowLeft, Lock, Shield, AlertCircle, Loader2, Moon, Sun, Monitor, Clock } from 'lucide-react';
import Link from 'next/link';
import { DataManagement } from '@/components/DataManagement';
import { InstallCTA } from '@/components/InstallCTA';
import { secureStorage } from '@/services/secureStorage';
import { Settings } from '@/models/entry';

export default function SettingsPage() {
  const router = useRouter();
  const { isEncryptionEnabled, setupPIN, disableEncryption } = useSecurityContext();
  const { theme, setTheme } = useTheme();

  const [showEnableDialog, setShowEnableDialog] = useState(false);
  const [showDisableDialog, setShowDisableDialog] = useState(false);
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [disablePin, setDisablePin] = useState('');
  const [error, setError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Auto-lock settings
  const [autoLockEnabled, setAutoLockEnabled] = useState(false);
  const [autoLockTimeout, setAutoLockTimeout] = useState(5); // Default 5 minutes
  const [settings, setSettings] = useState<Settings | null>(null);

  // Load settings
  useEffect(() => {
    const loadSettings = async () => {
      const saved = await secureStorage.getSettings();
      setSettings(saved);
      setAutoLockEnabled(saved.autoLockEnabled || false);
      setAutoLockTimeout(saved.autoLockTimeout || 5);
    };
    loadSettings();
  }, []);

  // Reset error when dialogs close
  useEffect(() => {
    if (!showEnableDialog && !showDisableDialog) {
      setError('');
      setPin('');
      setConfirmPin('');
      setDisablePin('');
    }
  }, [showEnableDialog, showDisableDialog]);

  // Handle enable encryption
  const handleEnableEncryption = async () => {
    if (pin.length !== 6) {
      setError('PIN 必须是 6 位数字');
      return;
    }

    if (pin !== confirmPin) {
      setError('两次输入的 PIN 不一致');
      return;
    }

    // Validate PIN strength
    if (/^(.)\1+$/.test(pin)) {
      setError('PIN 不能是重复的数字');
      return;
    }

    const isSequential = (str: string) => {
      for (let i = 1; i < str.length; i++) {
        if (parseInt(str[i]) !== parseInt(str[i - 1]) + 1) {
          return false;
        }
      }
      return true;
    };

    if (isSequential(pin) || isSequential(pin.split('').reverse().join(''))) {
      setError('PIN 不能是连续的数字');
      return;
    }

    setIsProcessing(true);
    try {
      await setupPIN(pin);
      setShowEnableDialog(false);
      router.push('/');
    } catch (err) {
      console.error('[Settings] Enable encryption failed:', err);
      setError('启用加密失败，请重试');
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle disable encryption
  const handleDisableEncryption = async () => {
    if (disablePin.length !== 6) {
      setError('请输入完整的 PIN');
      return;
    }

    setIsProcessing(true);
    try {
      const success = await disableEncryption(disablePin);
      if (success) {
        setShowDisableDialog(false);
        // Reload settings
        window.location.reload();
      } else {
        setError('PIN 错误，请重试');
      }
    } catch (err) {
      console.error('[Settings] Disable encryption failed:', err);
      setError('禁用加密失败');
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle auto-lock toggle
  const handleAutoLockToggle = async () => {
    const newValue = !autoLockEnabled;
    setAutoLockEnabled(newValue);

    const newSettings: Settings = {
      ...settings!,
      autoLockEnabled: newValue,
      autoLockTimeout: autoLockTimeout
    };

    await secureStorage.saveSettings(newSettings);
    setSettings(newSettings);
  };

  // Handle auto-lock timeout change
  const handleAutoLockTimeoutChange = async (timeout: number) => {
    setAutoLockTimeout(timeout);

    const newSettings: Settings = {
      ...settings!,
      autoLockTimeout: timeout
    };

    await secureStorage.saveSettings(newSettings);
    setSettings(newSettings);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background border-b px-4 py-3">
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          <Link href="/" className="p-2 hover:bg-secondary rounded-lg">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-lg font-semibold">设置</h1>
          <div className="w-9" />
        </div>
      </header>

      {/* Settings Content */}
      <main className="max-w-2xl mx-auto p-4 space-y-6">
        {/* Install CTA */}
        <InstallCTA />

        {/* Theme Section */}
        <section className="bg-card rounded-lg p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Moon className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold">外观设置</h2>
          </div>

          {/* Theme Selector */}
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">选择应用主题</p>
            <div className="grid grid-cols-3 gap-3">
              <button
                onClick={() => setTheme('light')}
                className={`p-3 rounded-lg border-2 transition-colors ${
                  theme === 'light'
                    ? 'border-primary bg-primary/10'
                    : 'border-border hover:bg-secondary'
                }`}
              >
                <Sun className="w-5 h-5 mx-auto mb-1" />
                <span className="text-sm">浅色</span>
              </button>

              <button
                onClick={() => setTheme('dark')}
                className={`p-3 rounded-lg border-2 transition-colors ${
                  theme === 'dark'
                    ? 'border-primary bg-primary/10'
                    : 'border-border hover:bg-secondary'
                }`}
              >
                <Moon className="w-5 h-5 mx-auto mb-1" />
                <span className="text-sm">深色</span>
              </button>

              <button
                onClick={() => setTheme('system')}
                className={`p-3 rounded-lg border-2 transition-colors ${
                  theme === 'system'
                    ? 'border-primary bg-primary/10'
                    : 'border-border hover:bg-secondary'
                }`}
              >
                <Monitor className="w-5 h-5 mx-auto mb-1" />
                <span className="text-sm">系统</span>
              </button>
            </div>
          </div>
        </section>

        {/* Security Section */}
        <section className="bg-card rounded-lg p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold">安全设置</h2>
          </div>

          {/* Encryption Toggle */}
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-muted-foreground" />
                <p className="font-medium">加密保护</p>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                使用 PIN 码保护你的日记内容
              </p>
            </div>
            <button
              onClick={() => isEncryptionEnabled ? setShowDisableDialog(true) : setShowEnableDialog(true)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                isEncryptionEnabled ? 'bg-primary' : 'bg-secondary'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  isEncryptionEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {isEncryptionEnabled && (
            <div className="p-3 bg-primary/10 rounded-lg">
              <p className="text-sm text-primary">
                <strong>加密已启用</strong> - 你的日记内容已被加密保护
              </p>
            </div>
          )}

          {/* Auto-lock Settings - Only show when encryption is enabled */}
          {isEncryptionEnabled && (
            <>
              <div className="h-px bg-border my-2" />

              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <p className="font-medium">自动锁定</p>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    无操作一段时间后自动锁定应用
                  </p>
                </div>
                <button
                  onClick={handleAutoLockToggle}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    autoLockEnabled ? 'bg-primary' : 'bg-secondary'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      autoLockEnabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Auto-lock timeout selector */}
              {autoLockEnabled && (
                <div className="p-3 bg-secondary/50 rounded-lg space-y-3">
                  <p className="text-sm font-medium">自动锁定时间</p>
                  <div className="grid grid-cols-4 gap-2">
                    {[5, 10, 15, 30].map((minutes) => (
                      <button
                        key={minutes}
                        onClick={() => handleAutoLockTimeoutChange(minutes)}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                          autoLockTimeout === minutes
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-background hover:bg-secondary'
                        }`}
                      >
                        {minutes}分钟
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    当前设置: {autoLockTimeout} 分钟无操作后自动锁定
                  </p>
                </div>
              )}
            </>
          )}
        </section>

        {/* Data Management Section */}
        <DataManagement />

        {/* Warning Section */}
        <section className="bg-warning/10 border border-warning/20 rounded-lg p-4">
          <div className="flex gap-3">
            <AlertCircle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
            <div className="space-y-2">
              <p className="text-sm font-medium">重要提示</p>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• PIN 码无法恢复，忘记将导致数据丢失</li>
                <li>• 启用加密后，所有新日记将被加密存储</li>
                <li>• 禁用加密需要输入正确的 PIN 码</li>
                <li>• 导出的数据包含完整内容，请妥善保管</li>
              </ul>
            </div>
          </div>
        </section>
      </main>

      {/* Enable Encryption Dialog */}
      {showEnableDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-card rounded-lg p-6 max-w-sm w-full space-y-4">
            <h3 className="text-lg font-semibold">设置 PIN 码</h3>

            <div className="space-y-3">
              <div>
                <label className="text-sm text-muted-foreground">输入 6 位 PIN</label>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={6}
                  value={pin}
                  onChange={(e) => {
                    setPin(e.target.value.replace(/\D/g, ''));
                    setError('');
                  }}
                  className="w-full mt-1 px-3 py-2 border rounded-lg"
                  placeholder="••••••"
                />
              </div>

              <div>
                <label className="text-sm text-muted-foreground">确认 PIN</label>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={6}
                  value={confirmPin}
                  onChange={(e) => {
                    setConfirmPin(e.target.value.replace(/\D/g, ''));
                    setError('');
                  }}
                  className="w-full mt-1 px-3 py-2 border rounded-lg"
                  placeholder="••••••"
                />
              </div>
            </div>

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setShowEnableDialog(false)}
                disabled={isProcessing}
                className="flex-1 px-4 py-2 border rounded-lg hover:bg-secondary"
              >
                取消
              </button>
              <button
                onClick={handleEnableEncryption}
                disabled={isProcessing || pin.length !== 6 || confirmPin.length !== 6}
                className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isProcessing ? (
                  <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                ) : (
                  '启用加密'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Disable Encryption Dialog */}
      {showDisableDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-card rounded-lg p-6 max-w-sm w-full space-y-4">
            <h3 className="text-lg font-semibold">禁用加密</h3>

            <div className="p-3 bg-warning/10 rounded-lg">
              <p className="text-sm">
                禁用加密后，新的日记将不再加密。现有的加密日记仍将保持加密状态。
              </p>
            </div>

            <div>
              <label className="text-sm text-muted-foreground">输入 PIN 码以确认</label>
              <input
                type="password"
                inputMode="numeric"
                maxLength={6}
                value={disablePin}
                onChange={(e) => {
                  setDisablePin(e.target.value.replace(/\D/g, ''));
                  setError('');
                }}
                className="w-full mt-1 px-3 py-2 border rounded-lg"
                placeholder="••••••"
              />
            </div>

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setShowDisableDialog(false)}
                disabled={isProcessing}
                className="flex-1 px-4 py-2 border rounded-lg hover:bg-secondary"
              >
                取消
              </button>
              <button
                onClick={handleDisableEncryption}
                disabled={isProcessing || disablePin.length !== 6}
                className="flex-1 px-4 py-2 bg-destructive text-destructive-foreground rounded-lg hover:bg-destructive/90 disabled:opacity-50"
              >
                {isProcessing ? (
                  <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                ) : (
                  '禁用加密'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
