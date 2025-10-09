# Journal App - Personal Journal with Rich Text

移动优先的个人日记应用，支持富文本编辑、照片附件、情绪标签、本地加密存储。

## 🚀 快速开始

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 访问 http://localhost:3000
```

## 📦 技术栈

- **框架**: Next.js 14 (App Router)
- **UI**: React 18 + TypeScript + Tailwind CSS
- **编辑器**: Tiptap (富文本编辑)
- **存储**: IndexedDB (通过 localforage)
- **图标**: Lucide React
- **测试**: Playwright + Vitest

## 🏗️ 项目结构

```
journal-app/
├── app/                    # Next.js App Router 路由
│   ├── page.tsx           # 首页 - 时间轴视图
│   ├── new/               # 新建日记
│   ├── entry/[id]/        # 查看/编辑日记
│   ├── settings/          # 设置页面
│   └── layout.tsx         # 根布局 (主题脚本)
├── components/            # 可复用 UI 组件
│   ├── EntryCard.tsx     # 日记卡片
│   ├── MoodTag.tsx       # 情绪标签
│   ├── Toolbar.tsx       # 编辑器工具栏
│   └── SecurityGate.tsx  # 安全锁屏门禁
├── contexts/             # React Context 状态管理
│   ├── ThemeContext.tsx  # 主题系统上下文
│   └── SecurityContext.tsx # 安全加密上下文
├── features/             # 功能模块
│   ├── journal/          # 日记功能
│   │   ├── EntryEditor.tsx    # 日记编辑器
│   │   ├── TimelineView.tsx   # 时间轴视图
│   │   └── useEntries.ts      # 日记数据 Hook
│   └── security/         # 安全功能
│       ├── LockScreen.tsx     # PIN 码锁屏
│       └── BiometricSetup.tsx # 生物识别设置
├── services/             # 业务服务
│   ├── storage.ts        # IndexedDB 存储服务
│   ├── crypto.ts         # 加密服务 (AES-GCM)
│   ├── webauthn.ts       # WebAuthn 生物识别
│   └── imageCompression.ts # 图片压缩
├── models/               # 数据模型
│   └── entry.ts          # 日记条目类型定义
├── styles/               # 样式文件
│   └── globals.css       # 全局样式 + 主题变量
└── tests/                # 测试文件
    ├── e2e/              # Playwright 端到端测试
    │   ├── theme.spec.ts      # 主题系统测试
    │   ├── lock.spec.ts       # 锁屏功能测试
    │   └── ...
    └── unit/             # Vitest 单元测试
```

## ✅ 已完成功能 (M0-M3.5)

### M0-M1: 基础功能 + 富文本编辑
- [x] 日记 CRUD 操作
- [x] 富文本编辑 (加粗、斜体、下划线、列表)
- [x] 自动保存 (500ms 防抖)
- [x] 时间轴展示 (倒序)
- [x] 关键词搜索
- [x] 情绪标签筛选
- [x] 响应式移动优先设计
- [x] IndexedDB 本地持久化

### M2: 媒体支持
- [x] 照片附件 (JPEG/PNG/WebP)
- [x] 客户端图片压缩 (最大 1920x1920)
- [x] 上传进度显示
- [x] 文件大小限制 (10MB)

### M3: 安全功能
- [x] 6 位 PIN 码锁定
- [x] 生物识别解锁 (Touch ID/Face ID/Windows Hello)
- [x] AES-GCM 端到端加密
- [x] PBKDF2 密钥派生 (100k iterations)
- [x] 自动锁定 (30s 无操作)

### M3.5: 主题系统
- [x] 浅色/深色/系统主题切换
- [x] 主题偏好持久化
- [x] 无闪烁加载 (FOUC 预防)
- [x] 编辑器深色模式适配

### M4: PWA 增强 ✅
- [x] 高清 PWA 图标（192x192, 512x512, maskable）
- [x] iOS 启动画面（11 种设备尺寸）
- [x] 推送通知系统（智能权限请求）
- [x] 离线访问支持（Service Worker）
- [x] 一键安装提示
- [x] E2E 测试覆盖（16 个测试用例）

## 🔜 后续功能 (M5+)

### M5: 标签与搜索 ✅
- [x] 自定义标签系统
- [x] 全文搜索
- [x] 高级筛选

### M6: 数据统计与分析 ✅
- [x] 写作统计图表
- [x] 连续写作天数
- [x] 心情分析

### M7: 数据导入导出 (计划中)
- [ ] JSON 导出
- [ ] Markdown 导出
- [ ] PDF 导出
- [ ] 数据导入与合并

## 🧪 测试

```bash
# 运行单元测试
npm test

# 运行端到端测试
npm run e2e

# 打开 Playwright UI
npm run e2e:ui

# 测试覆盖率
npm run test:coverage

# Lighthouse PWA 审计
npm run lighthouse
```

### 完整测试流程

详见 [TESTING-GUIDE.md](./TESTING-GUIDE.md) - 包括真实设备测试和 Lighthouse 审计指南

## 🎨 主题系统使用指南

### 切换主题

应用提供三种主题模式，可在 **设置页面** (`/settings`) 切换：

1. **浅色模式** - 白色背景，适合日间使用
2. **深色模式** - 深色背景，适合夜间使用
3. **系统模式** (默认) - 跟随操作系统设置自动切换

### 主题持久化

- 用户选择的主题偏好会自动保存到本地存储
- 重新打开应用时会恢复上次的主题设置
- 首次访问默认使用系统主题

### 技术实现

- **无闪烁加载**: 通过在 `<head>` 中插入内联脚本，确保主题在页面渲染前应用
- **全组件适配**: 所有 UI 组件（编辑器、锁屏、表单）均支持深色模式
- **CSS 变量**: 使用 Tailwind CSS 自定义变量实现主题切换
- **媒体查询**: 系统模式通过 `prefers-color-scheme` 自动检测

### 代码示例

```typescript
// 在组件中使用主题
import { useTheme } from '@/contexts/ThemeContext';

function MyComponent() {
  const { theme, setTheme } = useTheme();

  return (
    <button onClick={() => setTheme('dark')}>
      当前主题: {theme}
    </button>
  );
}
```

### 存储位置

- **localStorage**: `journal-theme-preference` (快速读取)
- **localforage**: 主题设置持久化备份

## 📝 开发脚本

```bash
npm run dev          # 开发服务器
npm run build        # 生产构建
npm run start        # 生产服务器
npm run lint         # ESLint 检查
npm run type-check   # TypeScript 类型检查
npm run format       # Prettier 格式化
npm run clean        # 清理缓存
```

## 🔒 安全设计

- **PIN 加密**: PBKDF2 派生密钥 (150k iterations)
- **数据加密**: AES-GCM 加密日记内容
- **独立 IV**: 每条日记独立初始化向量
- **密钥管理**: 锁定时清空内存中的密钥
- **渲染保护**: 未解锁前不渲染明文内容

## 📱 浏览器兼容性

- Chrome/Edge 90+
- Safari 14+
- Firefox 88+
- iOS Safari 14+
- Chrome Android 90+

## 🎯 性能目标

- FCP < 2s (中端移动设备)
- 核心包 < 250KB gzipped
- 10,000 字符编辑不卡顿 (60fps)
- 200 条日记搜索 < 100ms

## PR 审查清单

### 安全
- [ ] PIN 从不记录日志
- [ ] 解锁后立即销毁密钥
- [ ] 存储中仅有密文
- [ ] WebAuthn 错误处理不泄漏信息

### 性能
- [ ] 检查 bundle 大小差异
- [ ] 图片解码延迟加载
- [ ] 搜索/索引操作不阻塞主线程
- [ ] 避免不必要的重渲染

### 无障碍
- [ ] 所有控件可聚焦
- [ ] 工具栏按钮有 aria-label
- [ ] 色彩对比度 ≥ 4.5:1
- [ ] 对话框有焦点陷阱