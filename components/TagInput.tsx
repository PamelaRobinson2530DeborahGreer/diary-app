'use client';

import { Tag, TagID } from '@/models/entry';
import { tagService } from '@/services/tagService';
import { useEffect, useState } from 'react';

interface TagInputProps {
  selectedTags: TagID[];
  onChange: (tags: TagID[]) => void;
  className?: string;
}

export default function TagInput({ selectedTags, onChange, className = '' }: TagInputProps) {
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    loadTags();
  }, []);

  const loadTags = async () => {
    const tags = await tagService.loadTags();
    setAllTags(tags);
  };

  const handleToggleTag = (tagId: TagID) => {
    if (selectedTags.includes(tagId)) {
      onChange(selectedTags.filter(id => id !== tagId));
    } else {
      onChange([...selectedTags, tagId]);
    }
  };

  const handleCreateTag = async () => {
    if (!newTagName.trim()) return;

    const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];

    const newTag = await tagService.createTag(newTagName.trim(), randomColor);
    setAllTags([...allTags, newTag]);
    onChange([...selectedTags, newTag.id]);
    setNewTagName('');
    setIsCreating(false);
  };

  const selectedTagObjects = allTags.filter(tag => selectedTags.includes(tag.id));

  return (
    <div className={`relative ${className}`}>
      {/* Selected tags display */}
      <div className="flex flex-wrap gap-2 mb-2">
        {selectedTagObjects.map(tag => (
          <span
            key={tag.id}
            className="inline-flex items-center px-3 py-1 rounded-full text-sm text-white cursor-pointer hover:opacity-80"
            style={{ backgroundColor: tag.color }}
            onClick={() => handleToggleTag(tag.id)}
          >
            {tag.icon && <span className="mr-1">{tag.icon}</span>}
            {tag.name}
            <button
              className="ml-2 hover:text-gray-200"
              onClick={(e) => {
                e.stopPropagation();
                handleToggleTag(tag.id);
              }}
            >
              ×
            </button>
          </span>
        ))}
      </div>

      {/* Add tag button */}
      <button
        type="button"
        onClick={() => setShowDropdown(!showDropdown)}
        className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
      >
        + 添加标签
      </button>

      {/* Dropdown */}
      {showDropdown && (
        <div className="absolute z-10 mt-2 w-64 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
          <div className="p-2 max-h-64 overflow-y-auto">
            {allTags.map(tag => (
              <div
                key={tag.id}
                className={`flex items-center gap-2 px-3 py-2 rounded cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 ${
                  selectedTags.includes(tag.id) ? 'bg-gray-100 dark:bg-gray-700' : ''
                }`}
                onClick={() => handleToggleTag(tag.id)}
              >
                <input
                  type="checkbox"
                  checked={selectedTags.includes(tag.id)}
                  onChange={() => {}}
                  className="form-checkbox h-4 w-4"
                />
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: tag.color }}
                />
                {tag.icon && <span>{tag.icon}</span>}
                <span className="text-sm">{tag.name}</span>
              </div>
            ))}

            {/* Create new tag */}
            {!isCreating ? (
              <button
                type="button"
                onClick={() => setIsCreating(true)}
                className="w-full mt-2 px-3 py-2 text-sm text-blue-600 dark:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
              >
                + 创建新标签
              </button>
            ) : (
              <div className="mt-2 p-2 border-t border-gray-200 dark:border-gray-700">
                <input
                  type="text"
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleCreateTag()}
                  placeholder="标签名称"
                  className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded"
                  autoFocus
                />
                <div className="flex gap-2 mt-2">
                  <button
                    type="button"
                    onClick={handleCreateTag}
                    className="flex-1 px-2 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    创建
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsCreating(false);
                      setNewTagName('');
                    }}
                    className="flex-1 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    取消
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
