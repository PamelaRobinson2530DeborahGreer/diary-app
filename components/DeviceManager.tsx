// components/DeviceManager.tsx
// Manage devices connected to cloud sync

'use client';

import { useState, useEffect } from 'react';
import { SyncDevice } from '@/models/entry';
import { syncService } from '@/services/syncService';
import { logger } from '@/utils/logger';

export default function DeviceManager() {
  const [devices, setDevices] = useState<SyncDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentDeviceId, setCurrentDeviceId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  // Load devices on mount
  useEffect(() => {
    loadDevices();
  }, []);

  const loadDevices = async () => {
    try {
      setLoading(true);
      setError('');

      const settings = syncService.getSettings();
      setCurrentDeviceId(settings.deviceId);

      // Fetch devices from API
      const response = await fetch(`/api/devices?userId=${settings.userId}`);

      if (!response.ok) {
        throw new Error('Failed to load devices');
      }

      const data = await response.json();
      setDevices(data.devices || []);

    } catch (err) {
      logger.error('[DeviceManager] Load devices error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load devices');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDevice = async (deviceId: string) => {
    try {
      setError('');

      const settings = syncService.getSettings();

      // Call delete API
      const response = await fetch(`/api/devices`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: settings.userId,
          deviceId
        })
      });

      if (!response.ok) {
        throw new Error('Failed to delete device');
      }

      // Reload devices
      await loadDevices();
      setShowDeleteConfirm(null);

    } catch (err) {
      logger.error('[DeviceManager] Delete device error:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete device');
    }
  };

  const formatDate = (date: Date | string | null): string => {
    if (!date) return 'Never';

    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getDeviceIcon = (deviceInfo?: { browser?: string; os?: string }) => {
    if (!deviceInfo) return '💻';

    const os = deviceInfo.os?.toLowerCase() || '';
    const browser = deviceInfo.browser?.toLowerCase() || '';

    // Mobile devices
    if (os.includes('ios') || browser.includes('safari') && os.includes('iphone')) return '📱';
    if (os.includes('android')) return '📱';

    // Desktop
    if (os.includes('mac')) return '🖥️';
    if (os.includes('windows')) return '💻';
    if (os.includes('linux')) return '🐧';

    return '💻';
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Connected Devices</h3>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Connected Devices</h3>
        <button
          onClick={loadDevices}
          className="px-3 py-1.5 text-sm bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-lg transition-colors"
        >
          Refresh
        </button>
      </div>

      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      {devices.length === 0 ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          No devices connected
        </div>
      ) : (
        <div className="space-y-3">
          {devices.map((device) => {
            const isCurrentDevice = device.id === currentDeviceId;

            return (
              <div
                key={device.id}
                className={`p-4 rounded-lg border ${
                  isCurrentDevice
                    ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                    : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1">
                    {/* Device Icon */}
                    <div className="text-2xl mt-0.5">
                      {getDeviceIcon(device.deviceInfo as any)}
                    </div>

                    {/* Device Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium truncate">{device.deviceName}</h4>
                        {isCurrentDevice && (
                          <span className="px-2 py-0.5 text-xs bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-200 rounded-full">
                            This device
                          </span>
                        )}
                      </div>

                      {/* Device details */}
                      <div className="mt-1 space-y-0.5 text-sm text-gray-600 dark:text-gray-400">
                        {device.deviceInfo && (
                          <>
                            {(device.deviceInfo as any).browser && (
                              <div className="truncate">
                                {(device.deviceInfo as any).browser}
                              </div>
                            )}
                            {(device.deviceInfo as any).os && (
                              <div className="truncate">
                                {(device.deviceInfo as any).os}
                              </div>
                            )}
                          </>
                        )}
                        <div>
                          Last synced: {formatDate(device.lastSyncAt)}
                        </div>
                        <div className="text-xs">
                          Added: {formatDate(device.createdAt)}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Delete Button */}
                  {!isCurrentDevice && (
                    <button
                      onClick={() => setShowDeleteConfirm(device.id)}
                      className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                      title="Remove device"
                    >
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-semibold">Remove Device?</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              This will remove the device from your sync network. The device will no longer receive
              updates, but its local data will remain intact.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteDevice(showDeleteConfirm)}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Help Text */}
      <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg text-sm text-blue-700 dark:text-blue-300">
        <strong>Note:</strong> You can remove old devices you no longer use. Your entries will
        remain synced across all other connected devices.
      </div>
    </div>
  );
}
