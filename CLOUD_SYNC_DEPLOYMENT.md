# 云同步部署指南

## 📋 前置要求

- Vercel 账号
- GitHub 仓库已连接到 Vercel
- Node.js 18+ 和 npm

## 🚀 部署步骤

### 步骤 1: 添加 Vercel Postgres 数据库

1. 登录 [Vercel Dashboard](https://vercel.com/dashboard)
2. 进入你的项目
3. 点击 "Storage" 标签
4. 点击 "Create Database"
5. 选择 "Postgres"
6. 选择区域（建议选择离用户最近的）
7. 点击 "Create"

### 步骤 2: 连接数据库到项目

Vercel 会自动添加以下环境变量：
- `POSTGRES_PRISMA_URL`
- `POSTGRES_URL_NON_POOLING`

这些变量会自动注入到你的项目中。

### 步骤 3: 本地开发设置（可选）

如果需要本地开发，创建 `.env` 文件：

```bash
# 从 Vercel 项目设置中复制这些值
POSTGRES_PRISMA_URL="your-connection-string"
POSTGRES_URL_NON_POOLING="your-non-pooling-connection-string"
```

### 步骤 4: 安装依赖

```bash
npm install
```

### 步骤 5: 生成 Prisma Client

```bash
npm run db:generate
```

### 步骤 6: 推送数据库 Schema

```bash
npm run db:push
```

这将创建所有必要的表：
- `users` - 用户表
- `devices` - 设备表
- `sync_entries` - 同步条目表
- `sync_history` - 同步历史表

### 步骤 7: 部署到 Vercel

```bash
git add .
git commit -m "feat: add cloud sync functionality"
git push
```

Vercel 会自动检测到更改并部署。

## ✅ 验证部署

### 1. 检查数据库表

使用 Prisma Studio 查看数据库：

```bash
npm run db:studio
```

应该看到 4 个表已创建。

### 2. 测试 API 端点

#### 设置同步
```bash
curl -X POST https://your-domain.vercel.app/api/sync/setup \
  -H "Content-Type: application/json" \
  -d '{
    "encryptedMasterKey": "test-encrypted-key",
    "syncSalt": "test-salt",
    "syncPasswordHash": "test-hash",
    "deviceName": "测试设备"
  }'
```

应该返回：
```json
{
  "userId": "uuid",
  "deviceId": "uuid",
  "message": "Sync setup successful"
}
```

## 🔧 故障排查

### 问题 1: Prisma Client 未找到

**解决方案**:
```bash
npm run db:generate
```

### 问题 2: 数据库连接失败

**检查**:
1. Vercel Postgres 数据库是否已创建
2. 环境变量是否正确设置
3. 网络连接是否正常

### 问题 3: 部署时 Prisma 错误

**解决方案**:
在 `package.json` 中添加 postinstall 脚本：

```json
{
  "scripts": {
    "postinstall": "prisma generate"
  }
}
```

## 📊 数据库维护

### 查看数据库
```bash
npm run db:studio
```

### 重置数据库（谨慎！）
```bash
# 删除所有数据
npx prisma db push --force-reset
```

## 🔐 安全注意事项

1. **环境变量**: 永远不要提交 `.env` 文件到 Git
2. **API 验证**: 所有 API 都应验证用户身份
3. **加密**: 服务器只存储加密数据
4. **备份**: 定期备份 Postgres 数据库

## 📈 监控

### Vercel Analytics
启用 Vercel Analytics 监控 API 性能

### Prisma Logging
开发环境已启用查询日志，生产环境仅记录错误

## 🎉 完成

数据库和 API 已部署成功！接下来可以：
1. 开发客户端同步服务
2. 创建同步 UI
3. 实现冲突解决
