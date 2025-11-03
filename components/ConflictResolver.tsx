// components/ConflictResolver.tsx
// UI for resolving sync conflicts between local and remote versions

'use client';

import { useState } from 'react';
import { Conflict, JournalEntry } from '@/models/entry';
import { logger } from '@/utils/logger';

interface ConflictResolverProps {
  conflicts: Conflict[];
  onResolve: (resolutions: Map<string, 'local' | 'remote' | 'merge'>) => Promise<void>;
  onCancel: () => void;
}

export default function ConflictResolver({
  conflicts,
  onResolve,
  onCancel
}: ConflictResolverProps) {
  const [resolutions, setResolutions] = useState<Map<string, 'local' | 'remote' | 'merge'>>(
    new Map()
  );
  const [currentIndex, setCurrentIndex] = useState(0);
  const [resolving, setResolving] = useState(false);

  const currentConflict = conflicts[currentIndex];

  // Handle resolution selection
  const handleSelectResolution = (entryId: string, resolution: 'local' | 'remote' | 'merge') => {
    const newResolutions = new Map(resolutions);
    newResolutions.set(entryId, resolution);
    setResolutions(newResolutions);
  };

  // Navigate to next conflict
  const handleNext = () => {
    if (currentIndex < conflicts.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  // Navigate to previous conflict
  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  // Apply all resolutions
  const handleApplyResolutions = async () => {
    try {
      setResolving(true);

      // Ensure all conflicts have resolutions
      const unresolvedConflicts = conflicts.filter(
        (c) => !resolutions.has(c.entryId)
      );

      if (unresolvedConflicts.length > 0) {
        alert(`Please resolve all conflicts (${unresolvedConflicts.length} remaining)`);
        return;
      }

      await onResolve(resolutions);

    } catch (err) {
      logger.error('[ConflictResolver] Apply resolutions error:', err);
      alert(err instanceof Error ? err.message : 'Failed to apply resolutions');
    } finally {
      setResolving(false);
    }
  };

  // Use local for all
  const handleUseLocalForAll = () => {
    const newResolutions = new Map<string, 'local' | 'remote' | 'merge'>();
    conflicts.forEach((conflict) => {
      newResolutions.set(conflict.entryId, 'local');
    });
    setResolutions(newResolutions);
  };

  // Use remote for all
  const handleUseRemoteForAll = () => {
    const newResolutions = new Map<string, 'local' | 'remote' | 'merge'>();
    conflicts.forEach((conflict) => {
      newResolutions.set(conflict.entryId, 'remote');
    });
    setResolutions(newResolutions);
  };

  // Format date
  const formatDate = (isoString: string): string => {
    const date = new Date(isoString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Strip HTML tags for preview
  const stripHtml = (html: string): string => {
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
  };

  // Get preview text
  const getPreview = (html: string, maxLength = 150): string => {
    const text = stripHtml(html);
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  };

  if (!currentConflict) {
    return null;
  }

  const { localVersion, remoteVersion, type } = currentConflict;
  const currentResolution = resolutions.get(currentConflict.entryId);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full my-8">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xl font-semibold">Resolve Sync Conflicts</h2>
            <button
              onClick={onCancel}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
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
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          <p className="text-sm text-gray-600 dark:text-gray-400">
            {conflicts.length} {conflicts.length === 1 ? 'conflict' : 'conflicts'} found. Choose
            which version to keep for each entry.
          </p>

          {/* Progress */}
          <div className="mt-4">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-gray-600 dark:text-gray-400">
                Conflict {currentIndex + 1} of {conflicts.length}
              </span>
              <span className="text-gray-600 dark:text-gray-400">
                {resolutions.size} resolved
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all"
                style={{ width: `${(resolutions.size / conflicts.length) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Conflict Type Badge */}
        <div className="px-6 pt-4">
          <span
            className={`inline-block px-3 py-1 text-xs font-medium rounded-full ${
              type === 'content'
                ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300'
                : type === 'delete'
                ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                : 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
            }`}
          >
            {type === 'content' && 'Content Conflict'}
            {type === 'delete' && 'Delete Conflict'}
            {type === 'both' && 'Multiple Conflicts'}
          </span>
        </div>

        {/* Versions Comparison */}
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Local Version */}
          <div
            className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
              currentResolution === 'local'
                ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                : 'border-gray-200 dark:border-gray-700 hover:border-blue-400'
            }`}
            onClick={() => handleSelectResolution(currentConflict.entryId, 'local')}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-lg">Local Version</h3>
              <input
                type="radio"
                checked={currentResolution === 'local'}
                onChange={() => handleSelectResolution(currentConflict.entryId, 'local')}
                className="w-5 h-5 text-blue-600"
              />
            </div>

            <div className="space-y-2 text-sm">
              <div>
                <span className="text-gray-600 dark:text-gray-400">Title:</span>{' '}
                <span className="font-medium">{localVersion.title || 'Untitled'}</span>
              </div>

              <div>
                <span className="text-gray-600 dark:text-gray-400">Modified:</span>{' '}
                <span>{formatDate(localVersion.updatedAt)}</span>
              </div>

              {localVersion.mood && (
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Mood:</span>{' '}
                  <span>{localVersion.mood}</span>
                </div>
              )}

              <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-700 rounded text-gray-700 dark:text-gray-300">
                {getPreview(localVersion.html)}
              </div>
            </div>
          </div>

          {/* Remote Version */}
          <div
            className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
              currentResolution === 'remote'
                ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                : 'border-gray-200 dark:border-gray-700 hover:border-blue-400'
            }`}
            onClick={() => handleSelectResolution(currentConflict.entryId, 'remote')}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-lg">Cloud Version</h3>
              <input
                type="radio"
                checked={currentResolution === 'remote'}
                onChange={() => handleSelectResolution(currentConflict.entryId, 'remote')}
                className="w-5 h-5 text-blue-600"
              />
            </div>

            <div className="space-y-2 text-sm">
              <div>
                <span className="text-gray-600 dark:text-gray-400">Title:</span>{' '}
                <span className="font-medium">
                  {remoteVersion.encryptedTitle || 'Untitled'}
                </span>
              </div>

              <div>
                <span className="text-gray-600 dark:text-gray-400">Modified:</span>{' '}
                <span>{formatDate(remoteVersion.updatedAt)}</span>
              </div>

              {remoteVersion.mood && (
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Mood:</span>{' '}
                  <span>{remoteVersion.mood}</span>
                </div>
              )}

              <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-700 rounded text-gray-700 dark:text-gray-300">
                {getPreview(remoteVersion.encryptedData)}
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="px-6 pb-4">
          <div className="flex gap-2">
            <button
              onClick={handleUseLocalForAll}
              className="px-3 py-1.5 text-sm bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-lg transition-colors"
            >
              Use Local for All
            </button>
            <button
              onClick={handleUseRemoteForAll}
              className="px-3 py-1.5 text-sm bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-lg transition-colors"
            >
              Use Cloud for All
            </button>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div className="flex gap-2">
            <button
              onClick={handlePrevious}
              disabled={currentIndex === 0}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-medium transition-colors"
            >
              Previous
            </button>
            <button
              onClick={handleNext}
              disabled={currentIndex === conflicts.length - 1}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-medium transition-colors"
            >
              Next
            </button>
          </div>

          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-lg font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleApplyResolutions}
              disabled={resolving || resolutions.size !== conflicts.length}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
            >
              {resolving ? 'Applying...' : 'Apply Resolutions'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
