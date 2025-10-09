# Journal App M5-M10 新功能路线图
**基于安全基线修复完成后的功能扩展计划**
**规划日期**: 2025-10-08

---

## 总体策略

### 优先级原则
1. **用户体验优先**: 先做高频使用功能
2. **渐进式增强**: 每个里程碑独立可用
3. **性能优先**: PWA 离线优先，响应速度 < 100ms
4. **数据安全**: 所有新功能继承加密体系

### 技术栈约束
- **已有**: Next.js 14, TypeScript, IndexedDB, Tiptap, AES-GCM 加密
- **新增**: 按需引入轻量级库，避免膨胀

---

## M5: 高级数据管理（预计 2-3 周）

### 核心功能
1. **标签系统**
   - 自定义标签创建（颜色、图标）
   - 多标签支持
   - 标签统计与管理

2. **智能搜索**
   - 全文搜索（标题 + 内容）
   - 标签筛选
   - 日期范围筛选
   - 心情筛选
   - 搜索历史

3. **归档与删除**
   - 软删除（回收站）
   - 归档日记（不显示在主列表）
   - 批量操作

### 技术方案

#### 5.1 标签数据模型
```typescript
// models/entry.ts
export interface Tag {
  id: string;
  name: string;
  color: string;  // hex color
  icon?: string;  // emoji or icon name
  createdAt: Date;
}

export interface Entry {
  // ... 现有字段 ...
  tags?: string[];  // Tag IDs
  archived?: boolean;
  deleted?: boolean;
  deletedAt?: Date;
}
```

#### 5.2 搜索索引
```typescript
// services/searchIndex.ts
class SearchIndex {
  // 使用 IndexedDB Compound Index
  async createIndexes() {
    // 索引: [tags, createdAt]
    // 索引: [archived, deleted, createdAt]
    // 索引: [mood, createdAt]
  }

  async search(query: SearchQuery): Promise<Entry[]> {
    // 1. 先用索引筛选（标签、日期、心情）
    // 2. 再用全文匹配（标题 + HTML 转纯文本）
    // 3. 按相关性排序
  }
}

interface SearchQuery {
  text?: string;
  tags?: string[];
  dateRange?: { start: Date; end: Date };
  moods?: string[];
  includeArchived?: boolean;
}
```

#### 5.3 UI 组件
```typescript
// components/SearchBar.tsx
- 搜索输入框（debounce 300ms）
- 高级筛选面板（标签、日期、心情）
- 搜索结果高亮

// components/TagManager.tsx
- 标签列表
- 创建/编辑标签
- 颜色选择器

// components/EntryList.tsx
- 支持归档视图切换
- 批量选择模式
- 批量操作按钮
```

### 验收标准
- [ ] 创建标签 < 100ms
- [ ] 搜索响应 < 200ms（1000 条日记）
- [ ] 支持离线搜索
- [ ] 标签数据加密存储
- [ ] 回收站保留 30 天

---

## M6: 富媒体支持（预计 3-4 周）

### 核心功能
1. **音频录制与播放**
   - 语音日记（Web Audio API）
   - 音频附件加密存储
   - 波形可视化

2. **视频附件**
   - 本地视频上传
   - 视频加密存储
   - 缩略图生成

3. **文件附件**
   - 支持 PDF、TXT、Markdown
   - 文件预览
   - 文件类型限制（10MB）

4. **绘图功能**
   - 手绘涂鸦（Canvas）
   - 简单图形工具
   - 保存为图片附件

### 技术方案

#### 6.1 媒体数据模型
```typescript
// models/entry.ts
export interface MediaAttachment {
  id: string;
  type: 'audio' | 'video' | 'file' | 'drawing';
  blobKey: string;
  mimeType: string;
  size: number;
  duration?: number;  // for audio/video
  thumbnail?: string; // base64 for video
  fileName?: string;
  createdAt: Date;
}

export interface Entry {
  // ... 现有字段 ...
  media?: MediaAttachment[];
}
```

#### 6.2 音频录制
```typescript
// services/audioRecorder.ts
class AudioRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];

  async startRecording(): Promise<void> {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    this.mediaRecorder = new MediaRecorder(stream, {
      mimeType: 'audio/webm;codecs=opus'
    });

    this.mediaRecorder.ondataavailable = (e) => {
      this.chunks.push(e.data);
    };
  }

  async stopRecording(): Promise<Blob> {
    return new Promise((resolve) => {
      this.mediaRecorder.onstop = () => {
        const blob = new Blob(this.chunks, { type: 'audio/webm' });
        this.chunks = [];
        resolve(blob);
      };
      this.mediaRecorder.stop();
    });
  }
}
```

#### 6.3 视频缩略图
```typescript
// utils/videoThumbnail.ts
async function generateThumbnail(videoBlob: Blob): Promise<string> {
  const video = document.createElement('video');
  video.src = URL.createObjectURL(videoBlob);

  return new Promise((resolve) => {
    video.onloadeddata = () => {
      video.currentTime = 1; // 1秒处截图
    };

    video.onseeked = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 320;
      canvas.height = 180;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, 320, 180);
      resolve(canvas.toDataURL('image/jpeg', 0.7));
      URL.revokeObjectURL(video.src);
    };
  });
}
```

#### 6.4 加密存储扩展
```typescript
// services/secureStorage.ts
async saveMedia(entryId: string, media: MediaAttachment): Promise<void> {
  const blob = await this.getBlob(media.blobKey);
  if (!this.encryptionKey) {
    await blobStore.setItem(`media_${entryId}_${media.id}`, { ...media, blob });
    return;
  }

  const encryptedBlob = await cryptoService.encryptBlob(blob, this.encryptionKey);

  await blobStore.setItem(`media_${entryId}_${media.id}`, {
    ...media,
    encryptedBlob,
    blob: undefined  // 不存储明文
  });

  await this.removeBlob(media.blobKey);
}
```

### 验收标准
- [ ] 音频录制最长 10 分钟
- [ ] 视频文件 < 50MB
- [ ] 所有媒体加密存储
- [ ] 离线播放流畅
- [ ] 存储配额管理（警告 + 清理）

---

## M7: AI 智能分析（预计 2-3 周）

### 核心功能
1. **情绪分析**
   - 基于文本的情绪识别
   - 情绪趋势图表
   - 情绪词云

2. **关键词提取**
   - 自动生成标签建议
   - 高频词统计
   - 主题聚类

3. **写作建议**
   - 字数统计与目标
   - 写作时长统计
   - 连续写作天数

4. **回顾生成**
   - 每周/每月摘要
   - 重要时刻提取
   - 年度报告

### 技术方案

#### 7.1 情绪分析（本地模型）
```typescript
// services/sentimentAnalysis.ts
// 使用轻量级词典方法，避免依赖外部 API

class SentimentAnalyzer {
  private positiveWords = new Set(['开心', '快乐', '幸福', ...]);
  private negativeWords = new Set(['难过', '痛苦', '焦虑', ...]);

  analyze(text: string): SentimentScore {
    const words = this.tokenize(text);
    let positive = 0, negative = 0;

    words.forEach(word => {
      if (this.positiveWords.has(word)) positive++;
      if (this.negativeWords.has(word)) negative++;
    });

    const total = positive + negative;
    const score = total > 0 ? (positive - negative) / total : 0;

    return {
      score,  // -1 to 1
      label: this.getLabel(score),
      positive,
      negative
    };
  }

  private getLabel(score: number): string {
    if (score > 0.3) return 'positive';
    if (score < -0.3) return 'negative';
    return 'neutral';
  }
}
```

#### 7.2 关键词提取（TF-IDF）
```typescript
// services/keywordExtractor.ts
class KeywordExtractor {
  async extract(entries: Entry[]): Promise<Keyword[]> {
    const tfidf = this.calculateTFIDF(entries);
    return tfidf
      .sort((a, b) => b.score - a.score)
      .slice(0, 20);
  }

  private calculateTFIDF(entries: Entry[]): Keyword[] {
    // 1. 分词
    // 2. 计算词频（TF）
    // 3. 计算逆文档频率（IDF）
    // 4. TF-IDF = TF × IDF
  }
}
```

#### 7.3 数据可视化
```typescript
// components/analytics/EmotionChart.tsx
import { Line } from 'react-chartjs-2';

// 情绪趋势折线图
// X 轴：日期
// Y 轴：情绪分数（-1 到 1）

// components/analytics/WordCloud.tsx
import WordCloud from 'react-wordcloud';

// 词云展示高频词
```

#### 7.4 统计数据模型
```typescript
// models/analytics.ts
export interface WritingStats {
  totalEntries: number;
  totalWords: number;
  avgWordsPerEntry: number;
  writingStreak: number;  // 连续天数
  longestStreak: number;
  totalWritingTime: number;  // 分钟
}

export interface EmotionTrend {
  date: Date;
  score: number;
  label: string;
}
```

### 验收标准
- [ ] 情绪分析准确率 > 70%（人工抽检）
- [ ] 关键词提取 < 500ms（100 条日记）
- [ ] 图表渲染 < 200ms
- [ ] 所有分析本地运行（离线可用）
- [ ] 隐私保护（数据不上传）

---

## M8: 社交与分享（预计 3-4 周）

### 核心功能
1. **导出功能**
   - 导出为 PDF（带格式）
   - 导出为 Markdown
   - 导出为 JSON（备份）
   - 选择性导出（日期范围、标签）

2. **分享功能**
   - 生成分享链接（加密）
   - 二维码分享
   - 阅后即焚（一次性链接）
   - 密码保护

3. **协作功能**（可选）
   - 共享日记本（多人写）
   - 评论功能
   - @提及

### 技术方案

#### 8.1 PDF 导出
```typescript
// services/pdfExport.ts
import jsPDF from 'jspdf';

class PDFExporter {
  async export(entries: Entry[]): Promise<Blob> {
    const doc = new jsPDF();

    entries.forEach((entry, index) => {
      if (index > 0) doc.addPage();

      // 标题
      doc.setFontSize(18);
      doc.text(entry.title, 20, 20);

      // 日期
      doc.setFontSize(12);
      doc.text(new Date(entry.createdAt).toLocaleDateString(), 20, 30);

      // 内容（HTML 转纯文本）
      const text = this.htmlToText(entry.html);
      doc.setFontSize(10);
      doc.text(text, 20, 40, { maxWidth: 170 });

      // 图片
      if (entry.photo) {
        const imgData = await this.loadImage(entry.photo.blobKey);
        doc.addImage(imgData, 'JPEG', 20, 100, 170, 120);
      }
    });

    return doc.output('blob');
  }
}
```

#### 8.2 加密分享
```typescript
// services/shareService.ts
class ShareService {
  async createShareLink(entries: Entry[], options: ShareOptions): Promise<string> {
    // 1. 生成随机分享 ID
    const shareId = crypto.randomUUID();

    // 2. 生成分享密钥
    const shareKey = cryptoService.generateMasterKey();

    // 3. 加密日记内容
    const encryptedData = await this.encryptEntries(entries, shareKey);

    // 4. 存储到服务器（或 IPFS）
    await this.uploadToStorage(shareId, encryptedData);

    // 5. 生成链接（密钥在 URL hash 中）
    const keyBase64 = btoa(String.fromCharCode(...shareKey));
    return `https://yourapp.com/share/${shareId}#${keyBase64}`;
  }

  async getSharedEntries(shareId: string, key: string): Promise<Entry[]> {
    const encryptedData = await this.downloadFromStorage(shareId);
    const keyBytes = new Uint8Array(atob(key).split('').map(c => c.charCodeAt(0)));
    return await this.decryptEntries(encryptedData, keyBytes);
  }
}

interface ShareOptions {
  password?: string;
  expiresIn?: number;  // 小时
  oneTime?: boolean;   // 阅后即焚
}
```

### 验收标准
- [ ] PDF 导出支持图片
- [ ] 导出文件可在其他设备打开
- [ ] 分享链接端到端加密
- [ ] 一次性链接访问后失效
- [ ] 二维码扫描成功率 > 95%

---

## M9: 云同步与备份（预计 4-5 周）

### 核心功能
1. **多设备同步**
   - 端到端加密同步
   - 冲突解决
   - 增量同步

2. **自动备份**
   - 定时本地备份
   - 云端备份（可选）
   - 备份恢复

3. **版本历史**
   - 日记编辑历史
   - 回滚到历史版本
   - 版本对比

### 技术方案

#### 9.1 同步协议
```typescript
// services/syncService.ts
class SyncService {
  async sync(): Promise<SyncResult> {
    // 1. 获取本地变更（since last sync）
    const localChanges = await this.getLocalChanges();

    // 2. 上传到服务器
    const serverResponse = await this.uploadChanges(localChanges);

    // 3. 下载服务器变更
    const serverChanges = serverResponse.changes;

    // 4. 冲突检测与解决
    const conflicts = this.detectConflicts(localChanges, serverChanges);
    const resolved = await this.resolveConflicts(conflicts);

    // 5. 应用变更到本地
    await this.applyChanges(resolved);

    return { synced: true, conflicts: conflicts.length };
  }

  private detectConflicts(local: Change[], server: Change[]): Conflict[] {
    // 检测同一条日记在两端都被修改
    // 比较 updatedAt 时间戳
  }

  private async resolveConflicts(conflicts: Conflict[]): Promise<Change[]> {
    // 策略1: 服务器优先
    // 策略2: 最新优先（比较 updatedAt）
    // 策略3: 手动选择（UI 弹窗）
  }
}
```

#### 9.2 增量同步
```typescript
// models/sync.ts
export interface Change {
  id: string;
  type: 'create' | 'update' | 'delete';
  entryId: string;
  data?: Partial<Entry>;
  timestamp: number;
}

export interface SyncState {
  lastSyncTime: number;
  deviceId: string;
  pendingChanges: Change[];
}
```

#### 9.3 备份格式
```typescript
// services/backupService.ts
interface Backup {
  version: string;
  createdAt: Date;
  deviceId: string;
  entries: Entry[];
  settings: Settings;
  tags: Tag[];
  media: { id: string; blob: Blob }[];
}

class BackupService {
  async createBackup(): Promise<Blob> {
    const backup: Backup = {
      version: '1.0.0',
      createdAt: new Date(),
      deviceId: await this.getDeviceId(),
      entries: await secureStorage.getAllEntries(),
      settings: await secureStorage.getSettings(),
      tags: await secureStorage.getAllTags(),
      media: await this.getAllMedia()
    };

    // 加密备份
    const encrypted = await cryptoService.encrypt(
      JSON.stringify(backup),
      await this.getBackupKey()
    );

    return new Blob([JSON.stringify(encrypted)], { type: 'application/json' });
  }

  async restoreBackup(backupBlob: Blob, password: string): Promise<void> {
    // 1. 解密备份
    // 2. 验证版本兼容性
    // 3. 恢复数据到 IndexedDB
    // 4. 恢复媒体文件
  }
}
```

### 验收标准
- [ ] 同步延迟 < 5s（正常网络）
- [ ] 冲突解决成功率 > 99%
- [ ] 备份文件完整性校验
- [ ] 恢复后数据无损失
- [ ] 支持离线写入，上线自动同步

---

## M10: 性能优化与监控（预计 2-3 周）

### 核心功能
1. **性能优化**
   - 虚拟列表（长列表优化）
   - 图片懒加载
   - Service Worker 缓存优化
   - IndexedDB 查询优化

2. **监控与日志**
   - 性能监控（加载时间、FCP、LCP）
   - 错误捕获与上报
   - 用户行为分析（匿名）

3. **存储优化**
   - 媒体压缩
   - 过期数据清理
   - 配额管理

### 技术方案

#### 10.1 虚拟列表
```typescript
// components/VirtualEntryList.tsx
import { useVirtualizer } from '@tanstack/react-virtual';

function VirtualEntryList({ entries }: { entries: Entry[] }) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: entries.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 150,  // 每项高度
    overscan: 5  // 预加载 5 项
  });

  return (
    <div ref={parentRef} style={{ height: '100vh', overflow: 'auto' }}>
      <div style={{ height: virtualizer.getTotalSize() }}>
        {virtualizer.getVirtualItems().map(virtualRow => (
          <div
            key={virtualRow.index}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              transform: `translateY(${virtualRow.start}px)`
            }}
          >
            <EntryCard entry={entries[virtualRow.index]} />
          </div>
        ))}
      </div>
    </div>
  );
}
```

#### 10.2 性能监控
```typescript
// services/performanceMonitor.ts
class PerformanceMonitor {
  trackPageLoad() {
    const perfData = performance.getEntriesByType('navigation')[0];
    this.log('page_load', {
      dns: perfData.domainLookupEnd - perfData.domainLookupStart,
      tcp: perfData.connectEnd - perfData.connectStart,
      request: perfData.responseStart - perfData.requestStart,
      response: perfData.responseEnd - perfData.responseStart,
      dom: perfData.domContentLoadedEventEnd - perfData.responseEnd,
      total: perfData.loadEventEnd - perfData.fetchStart
    });
  }

  trackWebVitals() {
    // First Contentful Paint
    new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        this.log('fcp', { value: entry.startTime });
      });
    }).observe({ entryTypes: ['paint'] });

    // Largest Contentful Paint
    new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1];
      this.log('lcp', { value: lastEntry.startTime });
    }).observe({ entryTypes: ['largest-contentful-paint'] });
  }

  private log(event: string, data: any) {
    // 本地存储或上报到服务器（匿名）
  }
}
```

#### 10.3 图片压缩
```typescript
// utils/imageCompressor.ts
async function compressImage(blob: Blob, maxSize: number): Promise<Blob> {
  const img = await createImageBitmap(blob);

  let width = img.width;
  let height = img.height;

  // 保持宽高比缩放
  if (width > maxSize || height > maxSize) {
    const ratio = Math.min(maxSize / width, maxSize / height);
    width = width * ratio;
    height = height * ratio;
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0, width, height);

  return new Promise((resolve) => {
    canvas.toBlob(
      (blob) => resolve(blob),
      'image/jpeg',
      0.85  // 质量 85%
    );
  });
}
```

#### 10.4 配额管理
```typescript
// services/storageQuota.ts
class StorageQuotaManager {
  async checkQuota(): Promise<QuotaInfo> {
    const estimate = await navigator.storage.estimate();
    const used = estimate.usage || 0;
    const total = estimate.quota || 0;
    const percentage = (used / total) * 100;

    return {
      used,
      total,
      percentage,
      available: total - used,
      needsCleanup: percentage > 80
    };
  }

  async cleanup(): Promise<void> {
    // 1. 删除回收站中的旧数据（> 30 天）
    // 2. 压缩大图片
    // 3. 删除缓存的临时文件
  }
}
```

### 验收标准
- [ ] FCP < 1.5s
- [ ] LCP < 2.5s
- [ ] 滚动帧率 > 60fps
- [ ] IndexedDB 查询 < 100ms（1000 条）
- [ ] 图片压缩后 < 500KB
- [ ] 存储配额警告及时

---

## 实施时间表

### Phase 1: 基础增强（4-6 周）
- **Week 1-2**: M5 高级数据管理
- **Week 3-4**: M7 AI 智能分析（优先于 M6，用户价值更高）
- **Week 5-6**: M10 性能优化（保障后续功能流畅）

### Phase 2: 富媒体（3-4 周）
- **Week 7-10**: M6 富媒体支持

### Phase 3: 社交与同步（7-9 周）
- **Week 11-14**: M8 社交与分享
- **Week 15-19**: M9 云同步与备份

---

## 技术债务管理

### 需要在实施前处理
1. **数据迁移脚本**: 旧加密数据升级到主密钥架构
2. **单元测试**: 覆盖核心加密逻辑（目前缺失）
3. **性能基线**: 建立性能监控体系

### 可延后处理
1. 内存安全优化（主密钥缓存清理）
2. 多语言支持（i18n）
3. 无障碍优化（ARIA）

---

## 风险评估

### 高风险
- **M9 同步冲突**: 复杂度高，需充分测试
- **M6 媒体存储**: 配额管理不当可能导致 App 不可用

### 中风险
- **M7 AI 准确率**: 本地模型效果可能不如云端 API
- **M8 分享安全**: 需确保端到端加密不泄漏

### 低风险
- M5 数据管理（技术成熟）
- M10 性能优化（渐进式改进）

---

## 成功指标

### 用户指标
- **日活跃率** (DAU): > 60%
- **留存率**: 7 日 > 40%, 30 日 > 20%
- **平均使用时长**: > 5 分钟/天

### 技术指标
- **加载时间**: FCP < 1.5s, LCP < 2.5s
- **错误率**: < 0.1%
- **同步成功率**: > 99%

### 业务指标
- **功能使用率**: 每个新功能 > 30%
- **付费转化率**（如有）: > 5%

---

## 下一步行动

1. **选择首个里程碑**: 建议从 **M5 高级数据管理** 开始
2. **技术债务处理**: 实施数据迁移脚本 + 添加单元测试
3. **性能基线建立**: 当前性能数据采集
4. **需求确认**: 用户访谈或问卷调查（如有真实用户）

**准备好开始实施了吗？请告诉我从哪个里程碑开始！**
