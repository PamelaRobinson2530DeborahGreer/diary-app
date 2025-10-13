// features/journal/EntryEditor.tsx
'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import { JournalEntry } from '@/models/entry';
import { Toolbar } from '@/components/Toolbar';
import { MoodSelector } from '@/components/MoodTag';
import TagInput from '@/components/TagInput';
import { ImageIcon, Save, Loader2, Upload, X, AlertCircle } from 'lucide-react';
import { imageCompression } from '@/services/imageCompression';

interface EntryEditorProps {
  entry?: JournalEntry;
  onSave: (entry: JournalEntry) => Promise<JournalEntry>;
  autoSave?: boolean;
  saveBlob: (blob: Blob) => Promise<string>;
  getBlob: (blobKey: string) => Promise<Blob | null>;
}

export function EntryEditor({
  entry,
  onSave,
  autoSave = true,
  saveBlob,
  getBlob
}: EntryEditorProps) {
  const [title, setTitle] = useState<string>(entry?.title || '');
  const [mood, setMood] = useState<string | undefined>(entry?.mood);
  const [tags, setTags] = useState<string[]>(entry?.tags || []);
  const [photo, setPhoto] = useState<{ blob: Blob; url: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const entryRef = useRef(entry);
  const titleRef = useRef(title);
  const moodRef = useRef(mood);
  const tagsRef = useRef(tags);

  useEffect(() => {
    entryRef.current = entry;
  }, [entry]);

  useEffect(() => {
    titleRef.current = title;
  }, [title]);

  useEffect(() => {
    moodRef.current = mood;
  }, [mood]);

  useEffect(() => {
    tagsRef.current = tags;
  }, [tags]);

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: false,
        codeBlock: false,
        code: false,
        blockquote: false,
        horizontalRule: false
      }),
      Underline
    ],
    content: entry?.html || '',
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none min-h-[200px]'
      }
    },
    onUpdate: ({ editor }) => {
      if (autoSave && entry) {
        handleAutoSave(editor.getHTML());
      }
    }
  });

  // Autosave with 500ms debounce
  const handleAutoSave = (html: string) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    if (!entryRef.current) {
      return;
    }

    setSaving(true);
    saveTimeoutRef.current = setTimeout(async () => {
      const currentEntry = entryRef.current;
      if (!currentEntry) {
        setSaving(false);
        saveTimeoutRef.current = undefined;
        return;
      }

      try {
        const savedEntry = await onSave({
          ...currentEntry,
          title: titleRef.current,
          html,
          mood: moodRef.current,
          tags: tagsRef.current
        });
        entryRef.current = savedEntry;
        setLastSaved(new Date());
      } catch (error) {
        console.error('Autosave failed:', error);
      } finally {
        setSaving(false);
        saveTimeoutRef.current = undefined;
      }
    }, 500);
  };

  // Handle photo upload with compression
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset error state
    setUploadError(null);

    // Validate file type
    if (!imageCompression.isValidImageType(file)) {
      setUploadError('仅支持 JPEG、PNG 和 WebP 格式');
      return;
    }

    // Check initial file size (max 10MB before compression)
    if (file.size > 10 * 1024 * 1024) {
      setUploadError('照片大小不能超过 10MB');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Simulate progress for compression
      setUploadProgress(20);

      // Get image dimensions for display
      const dimensions = await imageCompression.getImageDimensions(file);
      console.log(`原始图片: ${dimensions.width}x${dimensions.height}, ${imageCompression.formatFileSize(file.size)}`);

      setUploadProgress(40);

      // Compress the image
      const compressedBlob = await imageCompression.compressImage(file, {
        maxWidth: 1920,
        maxHeight: 1920,
        quality: 0.8
      });

      setUploadProgress(80);

      console.log(`压缩后: ${imageCompression.formatFileSize(compressedBlob.size)}`);
      console.log(`压缩比: ${((1 - compressedBlob.size / file.size) * 100).toFixed(1)}%`);

      // Create preview URL
      const url = imageCompression.createPreviewUrl(compressedBlob);

      // Clean up old preview URL if exists
      if (photo?.url) {
        imageCompression.revokePreviewUrl(photo.url);
      }

      setPhoto({ blob: compressedBlob, url });
      setUploadProgress(100);

      // Clear progress after a short delay
      setTimeout(() => {
        setUploadProgress(0);
        setIsUploading(false);
      }, 500);
    } catch (error) {
      console.error('Photo upload failed:', error);
      setUploadError(error instanceof Error ? error.message : '照片上传失败');
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  // Manual save
  const handleSave = async () => {
    if (!editor || !entry) return;

    setSaving(true);
    try {
      let photoData = entry.photo;

      if (photo) {
        const blobKey = await saveBlob(photo.blob);
        photoData = {
          id: crypto.randomUUID(),
          blobKey,
          caption: ''
        };
      }

      const savedEntry = await onSave({
        ...entry,
        html: editor.getHTML(),
        mood,
        tags,
        photo: photoData
      });

      entryRef.current = savedEntry;

      setLastSaved(new Date());
    } catch (error) {
      console.error('Save failed:', error);
    } finally {
      setSaving(false);
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = undefined;
      }
    }
  };

  // Load photo if entry has one
  useEffect(() => {
    const loadPhoto = async () => {
      if (!entry?.photo) {
        setPhoto(null);
        return;
      }

      const blob = await getBlob(entry.photo.blobKey);
      if (!blob) {
        setPhoto(null);
        return;
      }

      const url = URL.createObjectURL(blob);
      setPhoto({ blob, url });
    };
    loadPhoto();
  }, [entry, getBlob]);

  // Cleanup blob URLs
  useEffect(() => {
    return () => {
      if (photo?.url) {
        URL.revokeObjectURL(photo.url);
      }
    };
  }, [photo]);

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (saving || saveTimeoutRef.current) {
        event.preventDefault();
        event.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [saving]);

  return (
    <div className="flex flex-col h-full">
      <div className="border-b bg-background">
        <Toolbar editor={editor} />
      </div>

      <div className="flex-1 overflow-auto p-4">
        {/* Title input */}
        <input
          type="text"
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            if (autoSave && entry) {
              handleAutoSave(editor?.getHTML() || '');
            }
          }}
          placeholder="无标题"
          className="w-full text-2xl font-bold bg-transparent border-none focus:outline-none focus:ring-0 mb-4 placeholder:text-muted-foreground/50"
        />

        <EditorContent editor={editor} />

        {/* Photo preview or upload placeholder */}
        {isUploading && !photo && (
          <div className="mt-4 p-8 border-2 border-dashed rounded-lg bg-secondary/20">
            <div className="flex flex-col items-center">
              <Upload className="w-12 h-12 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground mb-4">正在处理图片...</p>
              <div className="w-full max-w-xs">
                <div className="h-2 bg-secondary rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground text-center mt-2">
                  {uploadProgress}%
                </p>
              </div>
            </div>
          </div>
        )}

        {photo && (
          <div className="mt-4 relative inline-block">
            <img
              src={photo.url}
              alt="Attached"
              className="max-w-full h-auto rounded-lg border"
              style={{ maxHeight: '300px' }}
            />
            <button
              onClick={() => {
                if (photo.url) {
                  imageCompression.revokePreviewUrl(photo.url);
                }
                setPhoto(null);
              }}
              className="absolute top-2 right-2 p-2 bg-background/80 hover:bg-background text-foreground rounded-full shadow-md"
              aria-label="Remove photo"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      <div className="border-t p-4 space-y-4">
        <div>
          <label className="text-sm font-medium mb-2 block">心情</label>
          <MoodSelector value={mood} onChange={setMood} />
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block">标签</label>
          <TagInput
            selectedTags={tags}
            onChange={setTags}
          />
        </div>

        {/* Error message */}
        {uploadError && (
          <div className="flex items-center gap-2 px-3 py-2 bg-destructive/10 text-destructive rounded-lg">
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm">{uploadError}</span>
          </div>
        )}

        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handlePhotoUpload}
            className="hidden"
            disabled={isUploading}
          />

          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="flex items-center gap-2 px-3 py-2 bg-secondary hover:bg-secondary/80 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ImageIcon className="w-4 h-4" />
            <span>添加照片</span>
          </button>

          {!autoSave && (
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-3 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              <span>保存</span>
            </button>
          )}

          {saving && (
            <span className="text-sm text-muted-foreground flex items-center gap-1">
              <Loader2 className="w-3 h-3 animate-spin" />
              保存中...
            </span>
          )}

          {!saving && lastSaved && (
            <span className="text-sm text-muted-foreground">
              已保存 {lastSaved.toLocaleTimeString()}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
