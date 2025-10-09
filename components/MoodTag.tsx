// components/MoodTag.tsx
'use client';

import React from 'react';

interface MoodTagProps {
  mood: string;
  selected?: boolean;
  onClick?: () => void;
}

const MOOD_EMOJIS = ['😊', '😔', '😡', '😴', '🤔', '😎', '❤️', '✨'];

export function MoodTag({ mood, selected = false, onClick }: MoodTagProps) {
  return (
    <button
      onClick={onClick}
      className={`
        px-3 py-1 rounded-full text-sm transition-colors
        ${selected
          ? 'bg-primary text-primary-foreground dark:bg-primary dark:text-primary-foreground'
          : 'bg-secondary hover:bg-secondary/80 dark:bg-secondary/50 dark:hover:bg-secondary/70'
        }
      `}
    >
      <span className="mr-1">{mood}</span>
    </button>
  );
}

export function MoodSelector({
  value,
  onChange
}: {
  value?: string;
  onChange: (mood?: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {MOOD_EMOJIS.map((mood) => (
        <MoodTag
          key={mood}
          mood={mood}
          selected={value === mood}
          onClick={() => onChange(value === mood ? undefined : mood)}
        />
      ))}
    </div>
  );
}