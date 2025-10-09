// components/Toolbar.tsx
'use client';

import React from 'react';
import { Editor } from '@tiptap/react';
import {
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered
} from 'lucide-react';

interface ToolbarProps {
  editor: Editor | null;
}

export function Toolbar({ editor }: ToolbarProps) {
  if (!editor) return null;

  return (
    <div className="flex gap-1 p-2 border-b bg-background">
      <button
        onClick={() => editor.chain().focus().toggleBold().run()}
        className={`p-2 rounded hover:bg-accent dark:hover:bg-accent/50 transition-colors ${
          editor.isActive('bold') ? 'bg-accent dark:bg-accent/50' : ''
        }`}
        aria-label="Bold"
      >
        <Bold className="w-4 h-4" />
      </button>

      <button
        onClick={() => editor.chain().focus().toggleItalic().run()}
        className={`p-2 rounded hover:bg-accent dark:hover:bg-accent/50 transition-colors ${
          editor.isActive('italic') ? 'bg-accent dark:bg-accent/50' : ''
        }`}
        aria-label="Italic"
      >
        <Italic className="w-4 h-4" />
      </button>

      <button
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        className={`p-2 rounded hover:bg-accent dark:hover:bg-accent/50 transition-colors ${
          editor.isActive('underline') ? 'bg-accent dark:bg-accent/50' : ''
        }`}
        aria-label="Underline"
      >
        <Underline className="w-4 h-4" />
      </button>

      <div className="w-px bg-border mx-1" />

      <button
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className={`p-2 rounded hover:bg-accent dark:hover:bg-accent/50 transition-colors ${
          editor.isActive('bulletList') ? 'bg-accent dark:bg-accent/50' : ''
        }`}
        aria-label="Bullet List"
      >
        <List className="w-4 h-4" />
      </button>

      <button
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        className={`p-2 rounded hover:bg-accent dark:hover:bg-accent/50 transition-colors ${
          editor.isActive('orderedList') ? 'bg-accent dark:bg-accent/50' : ''
        }`}
        aria-label="Ordered List"
      >
        <ListOrdered className="w-4 h-4" />
      </button>
    </div>
  );
}