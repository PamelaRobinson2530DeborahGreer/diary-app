'use client';

import { useState } from 'react';
import { searchService } from '@/services/searchService';
import { tagService } from '@/services/tagService';
import { secureStorage } from '@/services/secureStorage';
import { JournalEntry } from '@/models/entry';

interface TestResult {
  name: string;
  duration: number;
  status: 'success' | 'fail';
  details?: string;
}

export default function PerformanceTestPage() {
  const [results, setResults] = useState<TestResult[]>([]);
  const [testing, setTesting] = useState(false);
  const [entries, setEntries] = useState<JournalEntry[]>([]);

  const addResult = (result: TestResult) => {
    setResults(prev => [...prev, result]);
  };

  const runAllTests = async () => {
    setTesting(true);
    setResults([]);

    try {
      // 1. 加载所有日记
      console.log('📊 加载日记数据...');
      const allEntries = await secureStorage.listEntries();
      setEntries(allEntries);

      addResult({
        name: '加载日记列表',
        duration: 0,
        status: 'success',
        details: `共 ${allEntries.length} 条日记`
      });

      // 2. 标签加载性能测试
      await testTagPerformance();

      // 3. 搜索性能测试
      await testSearchPerformance(allEntries);

    } catch (error) {
      addResult({
        name: '测试失败',
        duration: 0,
        status: 'fail',
        details: error instanceof Error ? error.message : String(error)
      });
    } finally {
      setTesting(false);
    }
  };

  const testTagPerformance = async () => {
    // 测试 1: 首次加载标签
    const start1 = performance.now();
    tagService.clearCache();
    const tags1 = await tagService.loadTags();
    const duration1 = performance.now() - start1;

    addResult({
      name: '标签首次加载',
      duration: duration1,
      status: duration1 < 50 ? 'success' : 'fail',
      details: `${tags1.length} 个标签，目标 < 50ms`
    });

    // 测试 2: 缓存加载
    const start2 = performance.now();
    const tags2 = await tagService.loadTags();
    const duration2 = performance.now() - start2;

    addResult({
      name: '标签缓存加载',
      duration: duration2,
      status: duration2 < 1 ? 'success' : 'fail',
      details: `${tags2.length} 个标签，目标 < 1ms`
    });

    // 测试 3: 创建标签
    const start3 = performance.now();
    await tagService.createTag('测试标签', '#FF0000', '🧪');
    const duration3 = performance.now() - start3;

    addResult({
      name: '创建标签',
      duration: duration3,
      status: duration3 < 100 ? 'success' : 'fail',
      details: `目标 < 100ms`
    });

    // 测试 4: 搜索标签
    const start4 = performance.now();
    await tagService.searchTags('测试');
    const duration4 = performance.now() - start4;

    addResult({
      name: '搜索标签',
      duration: duration4,
      status: duration4 < 10 ? 'success' : 'fail',
      details: `目标 < 10ms`
    });
  };

  const testSearchPerformance = async (allEntries: JournalEntry[]) => {
    // 测试 1: 全文搜索
    const start1 = performance.now();
    const result1 = searchService.search(allEntries, { text: '工作' });
    const duration1 = result1.duration;

    addResult({
      name: '全文搜索',
      duration: duration1,
      status: duration1 < 50 ? 'success' : 'fail',
      details: `找到 ${result1.total} 条，目标 < 50ms`
    });

    // 测试 2: 标签筛选
    const tags = await tagService.loadTags();
    const tagIds = tags.slice(0, 2).map(t => t.id);

    const start2 = performance.now();
    const result2 = searchService.search(allEntries, { tags: tagIds });
    const duration2 = result2.duration;

    addResult({
      name: '标签筛选（2个标签）',
      duration: duration2,
      status: duration2 < 30 ? 'success' : 'fail',
      details: `找到 ${result2.total} 条，目标 < 30ms`
    });

    // 测试 3: 心情筛选
    const start3 = performance.now();
    const result3 = searchService.search(allEntries, { moods: ['😊', '😎', '🥳'] });
    const duration3 = result3.duration;

    addResult({
      name: '心情筛选（3个心情）',
      duration: duration3,
      status: duration3 < 20 ? 'success' : 'fail',
      details: `找到 ${result3.total} 条，目标 < 20ms`
    });

    // 测试 4: 日期范围筛选
    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const start4 = performance.now();
    const result4 = searchService.search(allEntries, {
      dateRange: { start: thirtyDaysAgo, end: now }
    });
    const duration4 = result4.duration;

    addResult({
      name: '日期范围筛选（30天）',
      duration: duration4,
      status: duration4 < 20 ? 'success' : 'fail',
      details: `找到 ${result4.total} 条，目标 < 20ms`
    });

    // 测试 5: 组合筛选
    const start5 = performance.now();
    const result5 = searchService.search(allEntries, {
      text: '完成',
      tags: tagIds,
      moods: ['😊'],
      dateRange: { start: thirtyDaysAgo, end: now }
    });
    const duration5 = result5.duration;

    addResult({
      name: '组合筛选（全文+标签+心情+日期）',
      duration: duration5,
      status: duration5 < 100 ? 'success' : 'fail',
      details: `找到 ${result5.total} 条，目标 < 100ms`
    });
  };

  const passed = results.filter(r => r.status === 'success').length;
  const failed = results.filter(r => r.status === 'fail').length;
  const avgDuration = results.length > 0
    ? results.reduce((sum, r) => sum + r.duration, 0) / results.length
    : 0;

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">M5 性能测试</h1>

        {/* Test Info */}
        <div className="bg-card border rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">测试信息</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">日记总数</p>
              <p className="text-2xl font-bold">{entries.length}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">测试用例</p>
              <p className="text-2xl font-bold">9 个</p>
            </div>
          </div>

          <button
            onClick={runAllTests}
            disabled={testing}
            className="mt-6 px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {testing ? '测试中...' : '运行所有测试'}
          </button>
        </div>

        {/* Results Summary */}
        {results.length > 0 && (
          <div className="bg-card border rounded-lg p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">测试结果</h2>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="text-center">
                <p className="text-sm text-muted-foreground">通过</p>
                <p className="text-2xl font-bold text-green-600">{passed}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">失败</p>
                <p className="text-2xl font-bold text-red-600">{failed}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">平均耗时</p>
                <p className="text-2xl font-bold">{avgDuration.toFixed(2)}ms</p>
              </div>
            </div>

            {/* Pass rate */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">通过率</span>
                <span className="text-sm text-muted-foreground">
                  {((passed / results.length) * 100).toFixed(1)}%
                </span>
              </div>
              <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-600"
                  style={{ width: `${(passed / results.length) * 100}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Detailed Results */}
        {results.length > 0 && (
          <div className="bg-card border rounded-lg overflow-hidden">
            <div className="p-4 border-b">
              <h2 className="text-xl font-semibold">详细结果</h2>
            </div>
            <div className="divide-y">
              {results.map((result, index) => (
                <div
                  key={index}
                  className={`p-4 ${
                    result.status === 'success' ? 'bg-green-50 dark:bg-green-950/20' : 'bg-red-50 dark:bg-red-950/20'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <span className={`text-2xl ${
                        result.status === 'success' ? '✅' : '❌'
                      }`}>
                        {result.status === 'success' ? '✅' : '❌'}
                      </span>
                      <span className="font-medium">{result.name}</span>
                    </div>
                    <span className={`font-mono font-bold ${
                      result.status === 'success' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {result.duration.toFixed(2)}ms
                    </span>
                  </div>
                  {result.details && (
                    <p className="text-sm text-muted-foreground ml-11">{result.details}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recommendations */}
        {results.length > 0 && failed > 0 && (
          <div className="mt-6 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-6">
            <h3 className="font-semibold text-yellow-800 dark:text-yellow-200 mb-2">
              ⚠️ 性能优化建议
            </h3>
            <ul className="text-sm text-yellow-700 dark:text-yellow-300 space-y-1">
              <li>• 如果搜索性能不达标，考虑引入搜索索引库（Lunr.js/Fuse.js）</li>
              <li>• 如果标签加载慢，检查 IndexedDB 是否正常</li>
              <li>• 考虑使用虚拟滚动优化长列表渲染</li>
              <li>• 添加搜索结果缓存，避免重复计算</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
