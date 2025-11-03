// components/SyncIndicator.tsx
// Sync status indicator for header/toolbar

'use client';

import { useState, useEffect } from 'react';
import { syncService } from '@/services/syncService';

interface SyncIndicatorProps {
  compact?: boolean; // Show compact version (icon only)
}

export default function SyncIndicator({ compact = false }: SyncIndicatorProps) {
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [syncEnabled, setSyncEnabled] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    // Check if sync is enabled
    const settings = syncService.getSettings();
    setSyncEnabled(settings.enabled && settings.isSetup);
    setLastSyncTime(settings.lastSyncTime);

    // Listen for sync events
    const handleSyncStart = () => {
      setSyncStatus('syncing');
      setErrorMessage(null);
    };

    const handleSyncComplete = () => {
      setSyncStatus('success');
      setLastSyncTime(new Date().toISOString());

      // Reset to idle after 3 seconds
      setTimeout(() => {
        setSyncStatus('idle');
      }, 3000);
    };

    const handleSyncError = (event: CustomEvent) => {
      setSyncStatus('error');
      setErrorMessage(event.detail.message || 'Sync failed');

      // Reset to idle after 5 seconds
      setTimeout(() => {
        setSyncStatus('idle');
      }, 5000);
    };

    // Add event listeners
    window.addEventListener('sync:start', handleSyncStart as EventListener);
    window.addEventListener('sync:complete', handleSyncComplete as EventListener);
    window.addEventListener('sync:error', handleSyncError as EventListener);

    // Cleanup
    return () => {
      window.removeEventListener('sync:start', handleSyncStart as EventListener);
      window.removeEventListener('sync:complete', handleSyncComplete as EventListener);
      window.removeEventListener('sync:error', handleSyncError as EventListener);
    };
  }, []);

  // Don't show indicator if sync is not enabled
  if (!syncEnabled) {
    return null;
  }

  // Format relative time
  const getRelativeTime = (isoString: string | null): string => {
    if (!isoString) return 'Never synced';

    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;

    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  // Render sync icon based on status
  const renderIcon = () => {
    switch (syncStatus) {
      case 'syncing':
        return (
          <svg
            className="w-5 h-5 text-blue-600 dark:text-blue-400 animate-spin"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        );

      case 'success':
        return (
          <svg
            className="w-5 h-5 text-green-600 dark:text-green-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        );

      case 'error':
        return (
          <svg
            className="w-5 h-5 text-red-600 dark:text-red-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        );

      default:
        return (
          <svg
            className="w-5 h-5 text-gray-600 dark:text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
        );
    }
  };

  // Compact version (icon only)
  if (compact) {
    return (
      <div
        className="relative group cursor-pointer"
        title={
          syncStatus === 'syncing'
            ? 'Syncing...'
            : syncStatus === 'error'
            ? errorMessage || 'Sync failed'
            : `Last synced ${getRelativeTime(lastSyncTime)}`
        }
      >
        {renderIcon()}

        {/* Tooltip on hover */}
        <div className="absolute top-full right-0 mt-2 px-3 py-2 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-xs rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
          {syncStatus === 'syncing' && 'Syncing...'}
          {syncStatus === 'success' && 'Sync successful'}
          {syncStatus === 'error' && (errorMessage || 'Sync failed')}
          {syncStatus === 'idle' && `Last synced ${getRelativeTime(lastSyncTime)}`}
        </div>
      </div>
    );
  }

  // Full version with text
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800">
      {renderIcon()}

      <div className="text-sm">
        {syncStatus === 'syncing' && (
          <span className="text-blue-600 dark:text-blue-400">Syncing...</span>
        )}

        {syncStatus === 'success' && (
          <span className="text-green-600 dark:text-green-400">Synced</span>
        )}

        {syncStatus === 'error' && (
          <span className="text-red-600 dark:text-red-400" title={errorMessage || undefined}>
            Sync failed
          </span>
        )}

        {syncStatus === 'idle' && (
          <span className="text-gray-600 dark:text-gray-400">
            {getRelativeTime(lastSyncTime)}
          </span>
        )}
      </div>
    </div>
  );
}
