// scripts/generateTestData.ts
// 生成测试数据：100 条日记 + 10 个标签
// 用法：在浏览器 Console 中运行

import { secureStorage } from '../services/secureStorage';
import { tagService } from '../services/tagService';
import { JournalEntry, Tag } from '../models/entry';

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

async function generateTestData() {
  console.log('🚀 开始生成测试数据...');

  try {
    // 1. 创建标签
    console.log('\n📌 创建 10 个标签...');
    const tags: Tag[] = [];
    for (const tagData of TAG_NAMES) {
      const tag = await tagService.createTag(tagData.name, tagData.color, tagData.icon);
      tags.push(tag);
      console.log(`✅ 创建标签: ${tagData.icon} ${tagData.name}`);
    }

    // 2. 生成 100 条日记
    console.log('\n📝 生成 100 条日记...');
    const now = new Date();

    for (let i = 0; i < 100; i++) {
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

      if ((i + 1) % 10 === 0) {
        console.log(`✅ 已生成 ${i + 1}/100 条日记`);
      }
    }

    console.log('\n🎉 测试数据生成完成！');
    console.log('\n📊 统计信息:');
    console.log(`- 标签: ${tags.length} 个`);
    console.log(`- 日记: 100 条`);
    console.log(`  - 活动: ~85 条`);
    console.log(`  - 归档: ~10 条`);
    console.log(`  - 回收站: ~5 条`);

  } catch (error) {
    console.error('❌ 生成测试数据失败:', error);
  }
}

// 清空测试数据
async function clearTestData() {
  console.log('🗑️  清空所有测试数据...');

  try {
    await secureStorage.clearAll();
    console.log('✅ 数据已清空');
  } catch (error) {
    console.error('❌ 清空失败:', error);
  }
}

// 导出到全局作用域（浏览器 Console 使用）
if (typeof window !== 'undefined') {
  (window as any).generateTestData = generateTestData;
  (window as any).clearTestData = clearTestData;

  console.log(`
═════════════════════════════════════
  测试数据生成工具已加载
═════════════════════════════════════

使用方法:

1. 生成测试数据
   await generateTestData()

2. 清空所有数据
   await clearTestData()

═════════════════════════════════════
  `);
}

export { generateTestData, clearTestData };
