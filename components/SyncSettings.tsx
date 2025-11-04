// components/SyncSettings.tsx
// Cloud sync configuration UI component

'use client';

import { useState, useEffect } from 'react';
import { syncService } from '@/services/syncService';
import { SyncResult } from '@/models/entry';
import { logger } from '@/utils/logger';

interface SyncSettingsProps {
  onSyncComplete?: (result: SyncResult) => void;
}

export default function SyncSettings({ onSyncComplete }: SyncSettingsProps) {
  const [syncEnabled, setSyncEnabled] = useState(false);
  const [isSetup, setIsSetup] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(false);
  const [syncInterval, setSyncInterval] = useState(15);

  // Dialog states
  const [showSetupDialog, setShowSetupDialog] = useState(false);
  const [showLoginDialog, setShowLoginDialog] = useState(false);

  // Form states
  const [syncPassword, setSyncPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [deviceName, setDeviceName] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Load sync settings on mount
  useEffect(() => {
    const settings = syncService.getSettings();
    setSyncEnabled(settings.enabled);
    setIsSetup(settings.isSetup);
    setLastSyncTime(settings.lastSyncTime);
    setAutoSyncEnabled(settings.autoSyncEnabled);
    setSyncInterval(settings.syncInterval);
    setDeviceName(settings.deviceName);
  }, []);

  // Handle sync enable/disable
  const handleToggleSync = async (enabled: boolean) => {
    try {
      if (enabled && !isSetup) {
        // Show setup dialog for first-time setup
        setShowSetupDialog(true);
        return;
      }

      setSyncEnabled(enabled);

      if (enabled) {
        // Enable sync and trigger initial sync
        await syncService.enableSync();
        const result = await syncService.syncNow();
        setLastSyncTime(new Date().toISOString());
        onSyncComplete?.(result);
        setSuccess(`Sync enabled. Uploaded ${result.uploaded}, downloaded ${result.downloaded} entries.`);
      } else {
        // Disable sync
        await syncService.disableSync();
        setSuccess('Sync disabled.');
      }

      setError('');
    } catch (err) {
      logger.error('[SyncSettings] Toggle sync error:', err);
      setError(err instanceof Error ? err.message : 'Failed to toggle sync');
      setSyncEnabled(!enabled);
    }
  };

  // Handle first-time sync setup
  const handleSetupSync = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validation
    if (!syncPassword || !confirmPassword) {
      setError('Please enter a sync password');
      return;
    }

    if (syncPassword.length < 8) {
      setError('Sync password must be at least 8 characters');
      return;
    }

    if (syncPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (!deviceName.trim()) {
      setError('Please enter a device name');
      return;
    }

    try {
      setSyncing(true);

      // Setup sync with password
      await syncService.setupSync(syncPassword, deviceName.trim());

      setIsSetup(true);
      setSyncEnabled(true);
      setLastSyncTime(new Date().toISOString());
      setShowSetupDialog(false);
      setSuccess('Sync setup successful! Your entries are now syncing to the cloud.');

      // Clear form
      setSyncPassword('');
      setConfirmPassword('');

    } catch (err) {
      logger.error('[SyncSettings] Setup sync error:', err);
      setError(err instanceof Error ? err.message : 'Failed to setup sync');
    } finally {
      setSyncing(false);
    }
  };

  // Handle login from new device
  const handleLoginSync = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validation
    if (!syncPassword) {
      setError('Please enter your sync password');
      return;
    }

    if (!deviceName.trim()) {
      setError('Please enter a device name');
      return;
    }

    try {
      setSyncing(true);

      // Login with sync password
      await syncService.loginSync(syncPassword, deviceName.trim());

      setIsSetup(true);
      setSyncEnabled(true);
      setLastSyncTime(new Date().toISOString());
      setShowLoginDialog(false);
      setSuccess('Login successful! Your entries are now syncing from the cloud.');

      // Clear form
      setSyncPassword('');

    } catch (err) {
      logger.error('[SyncSettings] Login sync error:', err);
      setError(err instanceof Error ? err.message : 'Invalid sync password');
    } finally {
      setSyncing(false);
    }
  };

  // Handle manual sync
  const handleManualSync = async () => {
    try {
      setSyncing(true);
      setError('');
      setSuccess('');

      const result = await syncService.syncNow();

      setLastSyncTime(new Date().toISOString());
      setSuccess(`Sync complete. Uploaded ${result.uploaded}, downloaded ${result.downloaded} entries.`);
      onSyncComplete?.(result);

    } catch (err) {
      logger.error('[SyncSettings] Manual sync error:', err);
      setError(err instanceof Error ? err.message : 'Sync failed');
    } finally {
      setSyncing(false);
    }
  };

  // Handle auto-sync toggle
  const handleAutoSyncToggle = (enabled: boolean) => {
    setAutoSyncEnabled(enabled);
    syncService.setAutoSync(enabled, syncInterval);
  };

  // Handle sync interval change
  const handleIntervalChange = (interval: number) => {
    setSyncInterval(interval);
    if (autoSyncEnabled) {
      syncService.setAutoSync(true, interval);
    }
  };

  // Format last sync time
  const formatLastSync = (isoString: string | null) => {
    if (!isoString) return 'Never';

    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minutes ago`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hours ago`;

    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} days ago`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold mb-2">Cloud Sync</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Sync your encrypted diary across devices using end-to-end encryption
        </p>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      {success && (
        <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-sm text-green-700 dark:text-green-400">
          {success}
        </div>
      )}

      {/* Main Toggle */}
      <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <div>
          <div className="font-medium">Enable Cloud Sync</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {isSetup ? 'Sync is configured' : 'Setup required'}
          </div>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={syncEnabled}
            onChange={(e) => handleToggleSync(e.target.checked)}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
        </label>
      </div>

      {/* Setup Buttons (if not setup) */}
      {!isSetup && (
        <div className="space-y-3">
          <button
            onClick={() => setShowSetupDialog(true)}
            className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            Setup New Sync
          </button>
          <button
            onClick={() => setShowLoginDialog(true)}
            className="w-full px-4 py-3 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-lg font-medium transition-colors"
          >
            Login to Existing Sync
          </button>
        </div>
      )}

      {/* Sync Status (if setup) */}
      {isSetup && syncEnabled && (
        <div className="space-y-4">
          {/* Last Sync */}
          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <span className="text-sm text-gray-600 dark:text-gray-400">Last synced</span>
            <span className="text-sm font-medium">{formatLastSync(lastSyncTime)}</span>
          </div>

          {/* Manual Sync Button */}
          <button
            onClick={handleManualSync}
            disabled={syncing}
            className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
          >
            {syncing ? 'Syncing...' : 'Sync Now'}
          </button>

          {/* Auto Sync Settings */}
          <div className="space-y-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="font-medium">Auto Sync</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoSyncEnabled}
                  onChange={(e) => handleAutoSyncToggle(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
              </label>
            </div>

            {autoSyncEnabled && (
              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-400 mb-2">
                  Sync interval
                </label>
                <select
                  value={syncInterval}
                  onChange={(e) => handleIntervalChange(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg"
                >
                  <option value={5}>Every 5 minutes</option>
                  <option value={10}>Every 10 minutes</option>
                  <option value={15}>Every 15 minutes</option>
                  <option value={30}>Every 30 minutes</option>
                </select>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Setup Dialog */}
      {showSetupDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-semibold">Setup Cloud Sync</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Create a sync password to encrypt your master key. You&apos;ll need this password to sync from other devices.
            </p>

            <form onSubmit={handleSetupSync} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Device Name</label>
                <input
                  type="text"
                  value={deviceName}
                  onChange={(e) => setDeviceName(e.target.value)}
                  placeholder="e.g., My iPhone, Work Laptop"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Sync Password</label>
                <input
                  type="password"
                  value={syncPassword}
                  onChange={(e) => setSyncPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Confirm Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowSetupDialog(false)}
                  className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={syncing}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
                >
                  {syncing ? 'Setting up...' : 'Setup'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Login Dialog */}
      {showLoginDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-semibold">Login to Cloud Sync</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Enter your sync password to download your encrypted entries from the cloud.
            </p>

            <form onSubmit={handleLoginSync} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Device Name</label>
                <input
                  type="text"
                  value={deviceName}
                  onChange={(e) => setDeviceName(e.target.value)}
                  placeholder="e.g., My iPhone, Work Laptop"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Sync Password</label>
                <input
                  type="password"
                  value={syncPassword}
                  onChange={(e) => setSyncPassword(e.target.value)}
                  placeholder="Enter your sync password"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowLoginDialog(false)}
                  className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={syncing}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
                >
                  {syncing ? 'Logging in...' : 'Login'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
