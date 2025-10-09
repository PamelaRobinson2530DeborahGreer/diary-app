'use client';

import { useState } from 'react';
import { secureStorage } from '@/services/secureStorage';
import { tagService } from '@/services/tagService';
import { JournalEntry, Tag } from '@/models/entry';

const SAMPLE_CONTENT = [
  '今天天气很好，去公园散步，看到很多人在锻炼。',
  '完成了重要的项目任务，感觉很有成就感。',
  '和朋友们聚餐，聊了很多有趣的话题。',
  '读完了一本好书，收获颇丰。',
  '学习了新技能，感觉自己又进步了。',
  '今天有点累，但还是坚持完成了计划。',
  '遇到了一些困难，但最终解决了。',
  '反思了最近的生活，决定做出一些改变。',
  '和家人度过了愉快的周末。',
  '工作上取得了新的突破。'
];

const MOODS = ['😊', '😢', '😡', '😌', '😴', '🤔', '😎', '🥳'];

const TAG_NAMES = [
  { name: '工作', color: '#3B82F6', icon: '💼' },
  { name: '学习', color: '#10B981', icon: '📚' },
  { name: '运动', color: '#F59E0B', icon: '🏃' },
  { name: '旅行', color: '#EF4444', icon: '✈️' },
  { name: '美食', color: '#8B5CF6', icon: '🍕' },
  { name: '电影', color: '#EC4899', icon: '🎬' },
  { name: '音乐', color: '#14B8A6', icon: '🎵' },
  { name: '读书', color: '#F97316', icon: '📖' },
  { name: '家人', color: '#06B6D4', icon: '👨‍👩‍👧‍👦' },
  { name: '朋友', color: '#84CC16', icon: '🤝' }
];

export default function TestDataPage() {
  const [status, setStatus] = useState<string>('');
  const [progress, setProgress] = useState<number>(0);
  const [generating, setGenerating] = useState(false);

  const generateTestData = async () => {
    setGenerating(true);
    setStatus('🚀 开始生成测试数据...');
    setProgress(0);

    try {
      // 1. 创建标签
      setStatus('📌 创建 10 个标签...');
      const tags: Tag[] = [];
      for (let i = 0; i < TAG_NAMES.length; i++) {
        const tagData = TAG_NAMES[i];
        const tag = await tagService.createTag(tagData.name, tagData.color, tagData.icon);
        tags.push(tag);
        setProgress(((i + 1) / TAG_NAMES.length) * 20); // 0-20%
      }

      // 2. 生成 100 条日记
      const now = new Date();

      for (let i = 0; i < 100; i++) {
        setStatus(`📝 生成日记 ${i + 1}/100...`);

        // 随机日期（过去 180 天内）
        const daysAgo = Math.floor(Math.random() * 180);
        const createdAt = new Date(now);
        createdAt.setDate(createdAt.getDate() - daysAgo);

        // 随机内容
        const contentIndex = Math.floor(Math.random() * SAMPLE_CONTENT.length);
        const baseContent = SAMPLE_CONTENT[contentIndex];
        const content = `<p>${baseContent}</p><p>这是第 ${i + 1} 条测试日记。</p>`;

        // 随机心情
        const mood = Math.random() > 0.3
          ? MOODS[Math.floor(Math.random() * MOODS.length)]
          : undefined;

        // 随机标签（1-3 个）
        const tagCount = Math.floor(Math.random() * 3) + 1;
        const selectedTags: string[] = [];
        for (let j = 0; j < tagCount; j++) {
          const randomTag = tags[Math.floor(Math.random() * tags.length)];
          if (!selectedTags.includes(randomTag.id)) {
            selectedTags.push(randomTag.id);
          }
        }

        // 随机状态
        const rand = Math.random();
        const archived = rand < 0.1; // 10% 归档
        const deleted = !archived && rand < 0.15; // 5% 删除

        const entry: Partial<JournalEntry> = {
          html: content,
          mood,
          tags: selectedTags,
          archived,
          deleted,
          deletedAt: deleted ? createdAt.toISOString() : undefined,
          createdAt: createdAt.toISOString(),
          updatedAt: createdAt.toISOString()
        };

        await secureStorage.createEntry(entry);
        setProgress(20 + ((i + 1) / 100) * 80); // 20-100%
      }

      setStatus('🎉 测试数据生成完成！');
      setProgress(100);
    } catch (error) {
      setStatus(`❌ 生成失败: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setGenerating(false);
    }
  };

  const clearTestData = async () => {
    setGenerating(true);
    setStatus('🗑️  清空所有数据...');

    try {
      await secureStorage.clearAll();
      tagService.clearCache();
      setStatus('✅ 数据已清空');
      setProgress(0);
    } catch (error) {
      setStatus(`❌ 清空失败: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">测试数据生成工具</h1>

        <div className="bg-card border rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">生成测试数据</h2>
          <p className="text-muted-foreground mb-4">
            将生成：
          </p>
          <ul className="list-disc list-inside text-muted-foreground mb-6 space-y-1">
            <li>10 个标签（工作、学习、运动等）</li>
            <li>100 条日记</li>
            <li>约 85 条活动日记</li>
            <li>约 10 条归档日记</li>
            <li>约 5 条回收站日记</li>
          </ul>

          <div className="flex gap-4">
            <button
              onClick={generateTestData}
              disabled={generating}
              className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {generating ? '生成中...' : '生成测试数据'}
            </button>

            <button
              onClick={clearTestData}
              disabled={generating}
              className="px-6 py-3 bg-destructive text-destructive-foreground rounded-lg hover:bg-destructive/90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              清空所有数据
            </button>
          </div>
        </div>

        {/* Progress */}
        {progress > 0 && (
          <div className="bg-card border rounded-lg p-6 mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">进度</span>
              <span className="text-sm text-muted-foreground">{Math.round(progress)}%</span>
            </div>
            <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Status */}
        {status && (
          <div className="bg-card border rounded-lg p-6">
            <h3 className="font-semibold mb-2">状态</h3>
            <pre className="text-sm whitespace-pre-wrap font-mono">{status}</pre>
          </div>
        )}
      </div>
    </div>
  );
}
