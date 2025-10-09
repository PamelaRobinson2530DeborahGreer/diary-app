# M3 安全架构设计文档

## 🔒 安全目标

### 核心原则
1. **零明文暴露**: 未解锁前，DOM 和 DevTools 中无明文数据
2. **前端加密**: 所有敏感数据在客户端加密
3. **密钥隔离**: 密钥仅在内存中，锁定时立即清除
4. **防御深度**: 多层安全机制互补

## 🏗️ 安全架构

### 1. 加密层级
```
用户输入 PIN/生物识别
    ↓
PBKDF2 密钥派生 (150k iterations)
    ↓
AES-GCM-256 主密钥
    ↓
加密日记内容 + 照片
    ↓
IndexedDB 存储（密文）
```

### 2. 数据流安全
```
[用户界面]
    ↓ (明文)
[加密服务层] ← 密钥仅存在内存
    ↓ (密文)
[IndexedDB] ← 仅存储密文
```

## 📝 实现计划

### Phase 1: 加密基础设施 (Day 8 上午)

#### 1.1 Web Crypto Service (`services/crypto.ts`)
```typescript
interface CryptoService {
  // 密钥派生
  deriveKey(pin: string, salt: Uint8Array): Promise<CryptoKey>

  // 加密/解密
  encrypt(data: string, key: CryptoKey): Promise<EncryptedData>
  decrypt(encrypted: EncryptedData, key: CryptoKey): Promise<string>

  // 密钥管理
  generateSalt(): Uint8Array
  hashPIN(pin: string, salt: Uint8Array): Promise<string>
  clearKey(): void
}

interface EncryptedData {
  ciphertext: ArrayBuffer
  iv: Uint8Array
  salt: Uint8Array
}
```

#### 1.2 关键实现点
- PBKDF2: 150,000 iterations, SHA-256
- AES-GCM: 256-bit key, 96-bit IV
- 每条目独立 IV (crypto.getRandomValues)
- Salt 存储在 Settings，密钥不持久化

### Phase 2: PIN 锁定系统 (Day 8 下午)

#### 2.1 锁屏组件 (`features/security/LockScreen.tsx`)
```typescript
interface LockScreenProps {
  onUnlock: (key: CryptoKey) => void
  isSetup?: boolean // 首次设置 vs 解锁
}

// 功能需求
- PIN 输入界面 (6位数字)
- 错误重试限制 (5次)
- 忘记 PIN 警告
- 生物识别选项按钮
```

#### 2.2 锁定状态管理
```typescript
// contexts/SecurityContext.tsx
interface SecurityState {
  isLocked: boolean
  isEncrypted: boolean
  cryptoKey: CryptoKey | null
  unlock(pin: string): Promise<boolean>
  lock(): void
  setupPIN(pin: string): Promise<void>
}
```

### Phase 3: 数据加密集成 (Day 9 上午)

#### 3.1 存储服务改造
```typescript
// services/storage.ts 改造
class SecureStorageService {
  private cryptoKey: CryptoKey | null = null

  async saveEntry(entry: JournalEntry): Promise<void> {
    if (this.cryptoKey) {
      // 加密 HTML 和照片数据
      const encrypted = await crypto.encrypt(entry.html, this.cryptoKey)
      // 存储加密版本
    }
  }

  async getEntry(id: string): Promise<JournalEntry | null> {
    // 获取加密数据
    // 如果有密钥则解密
    if (this.cryptoKey) {
      // 解密并返回
    }
    return null // 无密钥返回空
  }
}
```

#### 3.2 渲染前门禁
```typescript
// app/layout.tsx
export default function RootLayout({ children }) {
  const { isLocked, isEncrypted } = useSecurityContext()

  if (isEncrypted && isLocked) {
    return <LockScreen /> // 阻止渲染子组件
  }

  return children
}
```

### Phase 4: WebAuthn 集成 (Day 9 下午)

#### 4.1 生物识别服务 (`services/webauthn.ts`)
```typescript
interface WebAuthnService {
  // 注册
  register(): Promise<CredentialData>

  // 验证
  authenticate(credentialId: string): Promise<boolean>

  // 检查支持
  isSupported(): boolean
  isPlatformAuthenticatorAvailable(): boolean
}
```

#### 4.2 集成流程
1. PIN 设置后提示启用生物识别
2. 调用 navigator.credentials.create()
3. 存储 credential ID
4. 解锁时优先显示生物识别

## 🧪 测试策略

### 测试文件: `tests/e2e/lock.spec.ts`
```typescript
test.describe('Security Features', () => {
  test('should not render data before unlock', async ({ page }) => {
    // 1. 创建加密日记
    // 2. 刷新页面
    // 3. 验证 DOM 中无明文
    // 4. 输入 PIN
    // 5. 验证数据显示
  })

  test('should clear key on lock', async ({ page }) => {
    // 验证锁定后密钥清除
  })

  test('should handle wrong PIN', async ({ page }) => {
    // 错误 PIN 处理
  })

  test('should limit retry attempts', async ({ page }) => {
    // 5次失败后的行为
  })
})
```

## 🎨 深色模式 (补充任务)

### 实现方案
```typescript
// hooks/useTheme.ts
export function useTheme() {
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('system')

  useEffect(() => {
    const root = document.documentElement
    if (theme === 'dark' ||
        (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
  }, [theme])

  return { theme, setTheme }
}
```

## ⚖️ Web Worker 评估

### 当前性能数据
- 搜索响应: <100ms (200条记录)
- 索引构建: <50ms
- 内存占用: <10MB

### 决策: 暂缓实现
**理由**:
1. 当前性能满足需求
2. 实现复杂度高
3. 调试困难
4. 可作为 M4 优化项

**触发条件**:
- 日记数量 >1000 条
- 搜索响应 >200ms
- 用户反馈卡顿

## 🔐 安全检查清单

### 开发阶段
- [ ] PIN 永不以明文记录日志
- [ ] 密钥仅存在内存变量
- [ ] 加密前的数据立即清理
- [ ] IV 和 Salt 使用强随机数
- [ ] 锁定时清除所有敏感状态

### 测试阶段
- [ ] DevTools 中无明文数据
- [ ] Network 请求无敏感信息
- [ ] localStorage 仅存储密文
- [ ] 内存快照无密钥泄露
- [ ] 错误消息不暴露细节

### 代码审查
- [ ] 无 console.log(pin/key)
- [ ] 无硬编码密钥/盐值
- [ ] 异步操作正确处理
- [ ] 错误处理不泄露信息
- [ ] TypeScript 严格类型

## 📊 性能影响预估

### 加密开销
- 单条目加密: ~5ms
- 单条目解密: ~3ms
- 批量解密(20条): ~60ms
- PIN 验证: ~200ms (PBKDF2)

### 优化策略
1. 懒加载解密（仅可见条目）
2. 解密结果缓存
3. 后台预解密下一页
4. Web Worker (未来)

## 🚀 实施顺序

### Day 8 (PIN + 基础加密)
1. ✅ 创建本文档
2. 实现 crypto service
3. 开发 PIN 锁屏 UI
4. 集成锁定流程
5. 创建 lock.spec.ts

### Day 9 (数据加密 + WebAuthn)
1. 改造 storage service
2. 实现渲染门禁
3. 添加 WebAuthn
4. 深色模式
5. 安全测试

## 📝 注意事项

### 安全原则
1. **最小权限**: 仅在需要时请求密钥
2. **快速失败**: 错误立即返回，不尝试恢复
3. **明确提示**: PIN 丢失无法恢复
4. **审计跟踪**: 记录解锁尝试（不记录 PIN）

### 用户体验
1. 首次使用引导设置 PIN
2. 生物识别作为可选便利功能
3. 自动锁定超时（5分钟无操作）
4. 锁定时保存草稿

---

**状态**: 📝 设计完成，待实施
**优先级**: 🔴 高（核心安全功能）
**预计完成**: Day 8-9