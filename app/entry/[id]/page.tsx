// app/entry/[id]/page.tsx
'use client';

import { useRouter, useParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { useEntries } from '@/features/journal/useEntries';
import { JournalEntry } from '@/models/entry';
import { ArrowLeft, Trash2, Loader2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

// 动态导入编辑器,减少初始 bundle 大小
const EntryEditor = dynamic(
  () => import('@/features/journal/EntryEditor').then(mod => ({ default: mod.EntryEditor })),
  {
    loading: () => (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span className="ml-2 text-muted-foreground">加载编辑器...</span>
      </div>
    ),
    ssr: false // 编辑器不需要服务端渲染
  }
);

export default function EntryPage() {
  const router = useRouter();
  const params = useParams();
  const { updateEntry, deleteEntry, loadEntry, saveBlob, getBlob } = useEntries();
  const [entry, setEntry] = useState<JournalEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  const loadCurrentEntry = useCallback(async () => {
    if (typeof params.id !== 'string') {
      return;
    }

    try {
      setLoading(true);
      const loaded = await loadEntry(params.id);
      setEntry(loaded);
    } finally {
      setLoading(false);
    }
  }, [loadEntry, params.id]);

  useEffect(() => {
    loadCurrentEntry();
  }, [loadCurrentEntry]);

  const handleSave = useCallback(async (updatedEntry: JournalEntry) => {
    const saved = await updateEntry(updatedEntry);
    setEntry(saved);
    return saved;
  }, [updateEntry]);

  const handleDelete = async () => {
    if (!entry || !confirm('确定要删除这篇日记吗？')) return;

    setDeleting(true);
    try {
      await deleteEntry(entry.id);
      router.push('/');
    } catch (error) {
      console.error('Delete failed:', error);
      setDeleting(false);
    }
  };

  const handleBack = () => {
    router.push('/');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!entry) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <p className="text-muted-foreground mb-4">日记未找到</p>
        <button
          onClick={handleBack}
          className="px-4 py-2 bg-secondary hover:bg-secondary/80 rounded-lg"
        >
          返回首页
        </button>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      <header className="border-b p-4 flex items-center justify-between bg-background">
        <div className="flex items-center gap-4">
          <button
            onClick={handleBack}
            className="p-2 hover:bg-accent rounded-lg"
            aria-label="Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-semibold">编辑日记</h1>
        </div>

        <button
          onClick={handleDelete}
          disabled={deleting}
          className="p-2 hover:bg-destructive hover:text-destructive-foreground rounded-lg disabled:opacity-50"
          aria-label="Delete"
        >
          {deleting ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Trash2 className="w-5 h-5" />
          )}
        </button>
      </header>

      <div className="flex-1 overflow-hidden">
        <EntryEditor
          entry={entry}
          onSave={handleSave}
          autoSave={true}
          saveBlob={saveBlob}
          getBlob={getBlob}
        />
      </div>
    </div>
  );
}
