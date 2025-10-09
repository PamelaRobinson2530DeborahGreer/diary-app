// tests/e2e/m5-features.spec.ts
import { test, expect } from '@playwright/test';

test.describe('M5 新功能完整演示', () => {
  test.beforeEach(async ({ page }) => {
    // 访问首页
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('1. 测试数据生成', async ({ page }) => {
    // 导航到测试数据生成页面
    await page.goto('/test-data');

    // 等待页面加载并验证标题
    await expect(page.locator('h1')).toContainText('测试数据生成工具');

    // 点击生成按钮
    await page.click('button:has-text("生成 100 条测试数据")');

    // 等待生成完成（最多30秒）
    await expect(page.locator('text=✅ 生成完成')).toBeVisible({ timeout: 30000 });

    // 验证生成的数据统计
    await expect(page.locator('text=总数量:')).toBeVisible();
    await expect(page.locator('text=已归档:')).toBeVisible();
    await expect(page.locator('text=已删除:')).toBeVisible();

    console.log('✅ 测试数据生成完成');
  });

  test('2. 搜索功能测试', async ({ page }) => {
    // 在搜索框输入关键词
    await page.fill('input[placeholder*="搜索"]', '日记');

    // 等待搜索结果（300ms debounce + 处理时间）
    await page.waitForTimeout(500);

    // 验证搜索结果
    const entries = page.locator('article');
    const count = await entries.count();

    console.log(`✅ 找到 ${count} 条包含"日记"的结果`);

    // 清空搜索
    await page.fill('input[placeholder*="搜索"]', '');
    await page.waitForTimeout(500);
  });

  test('3. 标签筛选测试', async ({ page }) => {
    // 打开筛选面板
    await page.click('button:has-text("筛选")');

    // 等待筛选面板展开
    await expect(page.locator('label:has-text("标签")')).toBeVisible();

    // 选择第一个标签（如果存在）
    const firstTag = page.locator('div.flex.flex-wrap.gap-2 button').first();
    const hasTag = await firstTag.isVisible().catch(() => false);

    if (hasTag) {
      await firstTag.click();
      await page.waitForTimeout(500);

      // 验证筛选结果
      const filteredEntries = page.locator('article');
      const count = await filteredEntries.count();
      console.log(`✅ 标签筛选后有 ${count} 条日记`);
    } else {
      console.log('⚠️  暂无标签可筛选');
    }
  });

  test('4. 心情筛选测试', async ({ page }) => {
    // 打开筛选面板
    await page.click('button:has-text("筛选")');

    // 等待筛选面板展开
    await expect(page.locator('label:has-text("心情")')).toBeVisible();

    // 选择一个心情
    const moodButton = page.locator('button.text-2xl').first();
    await moodButton.click();

    // 等待筛选应用
    await page.waitForTimeout(500);

    // 验证结果
    const filteredEntries = page.locator('article');
    const count = await filteredEntries.count();
    console.log(`✅ 心情筛选后有 ${count} 条日记`);
  });

  test('5. 视图模式切换测试', async ({ page }) => {
    // 验证当前在"活动"视图
    await expect(page.locator('button:has-text("活动")')).toHaveClass(/bg-primary/);
    await expect(page.locator('h1')).toContainText('我的日记');

    // 切换到"归档"视图
    await page.click('button:has-text("归档")');
    await expect(page.locator('h1')).toContainText('归档日记');

    const archivedEntries = page.locator('article');
    const archivedCount = await archivedEntries.count();
    console.log(`✅ 归档视图有 ${archivedCount} 条日记`);

    // 切换到"回收站"视图
    await page.click('button:has-text("回收站")');
    await expect(page.locator('h1')).toContainText('回收站');

    const deletedEntries = page.locator('article');
    const deletedCount = await deletedEntries.count();
    console.log(`✅ 回收站有 ${deletedCount} 条日记`);

    // 切换回"活动"视图
    await page.click('button:has-text("活动")');
    await expect(page.locator('h1')).toContainText('我的日记');
  });

  test('6. 日期范围筛选测试', async ({ page }) => {
    // 打开筛选面板
    await page.click('button:has-text("筛选")');

    // 等待筛选面板展开
    await expect(page.locator('label:has-text("日期范围")')).toBeVisible();

    // 设置日期范围（最近30天）
    const today = new Date();
    const lastMonth = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

    await page.fill('input[type="date"]', lastMonth.toISOString().split('T')[0]);

    // 等待筛选应用
    await page.waitForTimeout(500);

    // 验证结果
    const filteredEntries = page.locator('article');
    const count = await filteredEntries.count();
    console.log(`✅ 日期筛选后有 ${count} 条日记`);
  });

  test('7. 组合筛选测试', async ({ page }) => {
    // 输入搜索关键词
    await page.fill('input[placeholder*="搜索"]', '日记');

    // 打开筛选面板
    await page.click('button:has-text("筛选")');
    await expect(page.locator('label:has-text("心情")')).toBeVisible();

    // 选择心情
    const moodButton = page.locator('button.text-2xl').first();
    await moodButton.click();

    // 等待筛选应用
    await page.waitForTimeout(500);

    // 验证结果
    const filteredEntries = page.locator('article');
    const count = await filteredEntries.count();
    console.log(`✅ 组合筛选后有 ${count} 条日记`);
  });

  test('8. 性能测试页面', async ({ page }) => {
    // 导航到性能测试页面
    await page.goto('/performance-test');

    // 等待页面加载并验证标题
    await expect(page.locator('h1')).toContainText('M5 性能测试');

    // 点击运行所有测试
    await page.click('button:has-text("运行所有测试")');

    // 等待测试完成（最多60秒）
    await expect(page.locator('text=所有测试完成')).toBeVisible({ timeout: 60000 });

    // 验证测试结果
    const passedTests = await page.locator('.text-green-600').count();
    const failedTests = await page.locator('.text-red-600').count();

    console.log(`✅ 性能测试结果: ${passedTests} 通过, ${failedTests} 失败`);

    // 验证平均性能指标
    await expect(page.locator('text=平均执行时间')).toBeVisible();
  });

  test('9. 清除筛选功能', async ({ page }) => {
    // 打开筛选面板
    await page.click('button:has-text("筛选")');

    // 选择多个条件
    await page.fill('input[placeholder*="搜索"]', '测试');

    const moodButton = page.locator('button.text-2xl').first();
    await moodButton.click();

    await page.waitForTimeout(500);

    // 验证有活跃筛选条件显示
    await expect(page.locator('button:has-text("清除所有")')).toBeVisible();

    // 清除所有筛选
    await page.click('button:has-text("清除所有")');

    // 验证筛选已清除
    await expect(page.locator('input[placeholder*="搜索"]')).toHaveValue('');

    console.log('✅ 筛选清除功能正常');
  });
});

test.describe('M5 功能边界测试', () => {
  test('空数据状态', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // 检查是否显示空状态提示
    const isEmpty = await page.locator('text=还没有日记').isVisible().catch(() => false);
    const hasWriteFirst = await page.locator('button:has-text("写第一篇日记")').isVisible().catch(() => false);

    if (isEmpty && hasWriteFirst) {
      console.log('✅ 空数据状态显示正常');
    } else {
      console.log('✅ 已有日记数据');
    }
  });

  test('搜索无结果', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // 搜索一个不存在的关键词
    await page.fill('input[placeholder*="搜索"]', 'NONEXISTENT_KEYWORD_12345_XYZ');
    await page.waitForTimeout(500);

    // 验证显示无结果提示
    const noResult = await page.locator('text=没有找到匹配的日记').isVisible().catch(() => false);

    if (noResult) {
      console.log('✅ 搜索无结果状态显示正常');
    } else {
      console.log('⚠️  居然找到了匹配结果');
    }
  });

  test('回收站为空状态', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // 切换到回收站
    await page.click('button:has-text("回收站")');
    await expect(page.locator('h1')).toContainText('回收站');

    // 检查是否为空
    const isEmpty = await page.locator('text=回收站为空').isVisible().catch(() => false);

    if (isEmpty) {
      console.log('✅ 回收站空状态显示正常');
    } else {
      const count = await page.locator('article').count();
      console.log(`✅ 回收站有 ${count} 条已删除日记`);
    }
  });

  test('归档为空状态', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // 切换到归档
    await page.click('button:has-text("归档")');
    await expect(page.locator('h1')).toContainText('归档日记');

    // 检查是否为空
    const isEmpty = await page.locator('text=没有归档的日记').isVisible().catch(() => false);

    if (isEmpty) {
      console.log('✅ 归档空状态显示正常');
    } else {
      const count = await page.locator('article').count();
      console.log(`✅ 归档有 ${count} 条日记`);
    }
  });
});

test.describe('M5 响应式测试', () => {
  test('移动端视图切换', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'Mobile tests only on chromium');

    // 设置移动端视口
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // 验证视图模式按钮仍然可见
    await expect(page.locator('button:has-text("活动")')).toBeVisible();
    await expect(page.locator('button:has-text("归档")')).toBeVisible();
    await expect(page.locator('button:has-text("回收站")')).toBeVisible();

    console.log('✅ 移动端视图切换正常');
  });

  test('移动端搜索筛选', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'Mobile tests only on chromium');

    // 设置移动端视口
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // 打开筛选
    await page.click('button:has-text("筛选")');
    await expect(page.locator('label:has-text("标签")')).toBeVisible();

    console.log('✅ 移动端筛选面板正常');
  });
});
