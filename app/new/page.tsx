// app/new/page.tsx
'use client';

import { useRouter } from 'next/navigation';
import { EntryEditor } from '@/features/journal/EntryEditor';
import { useEntries } from '@/features/journal/useEntries';
import { JournalEntry } from '@/models/entry';
import { ArrowLeft } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

export default function NewEntryPage() {
  const router = useRouter();
  const { createEntry, updateEntry, saveBlob, getBlob } = useEntries();
  const [entry, setEntry] = useState<JournalEntry | null>(null);

  useEffect(() => {
    // Create a new empty entry on mount
    const initEntry = async () => {
      const newEntry = await createEntry({ html: '' });
      setEntry(newEntry);
    };
    initEntry();
  }, []);

  const handleSave = useCallback(async (updatedEntry: JournalEntry) => {
    const saved = await updateEntry(updatedEntry);
    setEntry(saved);
    return saved;
  }, [updateEntry]);

  const handleBack = () => {
    router.push('/');
  };

  if (!entry) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-muted-foreground">创建中...</div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      <header className="border-b p-4 flex items-center gap-4 bg-background">
        <button
          onClick={handleBack}
          className="p-2 hover:bg-accent rounded-lg"
          aria-label="Back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-semibold">新日记</h1>
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
