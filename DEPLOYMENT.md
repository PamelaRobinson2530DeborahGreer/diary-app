# 部署指南

本项目使用 GitHub Actions 自动部署到 Vercel。

## 前置要求

1. 一个 [Vercel](https://vercel.com) 账户
2. 在 Vercel 上创建的项目
3. GitHub 仓库的 Actions 权限

## 配置步骤

### 1. 获取 Vercel Token

1. 访问 [Vercel Tokens 页面](https://vercel.com/account/tokens)
2. 点击 "Create Token"
3. 输入 Token 名称 (如: `github-actions`)
4. 选择 Scope (建议选择特定项目)
5. 复制生成的 Token (只会显示一次!)

### 2. 获取 Vercel Project ID 和 Org ID

#### 方法 1: 通过 Vercel CLI

```bash
# 安装 Vercel CLI
npm i -g vercel

# 登录
vercel login

# 在项目目录中运行
vercel link

# 查看项目信息
cat .vercel/project.json
```

你会看到类似这样的输出:
```json
{
  "orgId": "team_xxxxxxxxxxxxx",
  "projectId": "prj_xxxxxxxxxxxxx"
}
```

#### 方法 2: 通过 Vercel Dashboard

1. 访问你的 [Vercel Dashboard](https://vercel.com/dashboard)
2. 选择你的项目
3. 进入项目设置 (Settings)
4. **Project ID**: 在 General 标签页中可以找到
5. **Org/Team ID**: 在项目 URL 中可以看到

### 3. 在 GitHub 仓库中配置 Secrets

1. 访问你的 GitHub 仓库
2. 进入 `Settings` > `Secrets and variables` > `Actions`
3. 点击 `New repository secret` 添加以下 secrets:

   - **VERCEL_TOKEN**: 你的 Vercel Token
   - **VERCEL_ORG_ID**: 你的 Vercel Organization ID
   - **VERCEL_PROJECT_ID**: 你的 Vercel Project ID

### 4. 配置完成!

配置完成后,每次你推送代码到 `main` 分支,GitHub Actions 会自动:

1. ✅ 运行类型检查
2. ✅ 运行代码 Lint
3. ✅ 运行单元测试
4. ✅ 构建项目
5. ✅ 部署到 Vercel Production

当你创建 Pull Request 时,会自动部署到 Preview 环境并在 PR 中评论预览链接。

## Workflow 说明

- **触发条件**:
  - `push` 到 `main` 分支 → 部署到 Production
  - 创建 `pull_request` → 部署到 Preview

- **质量检查**:
  - TypeScript 类型检查
  - ESLint 代码检查
  - Vitest 单元测试

- **部署流程**:
  1. 拉取 Vercel 环境配置
  2. 使用 Vercel CLI 构建项目
  3. 部署预构建的产物

## 本地测试部署

如果想在本地测试 Vercel 部署:

```bash
# 安装 Vercel CLI
npm i -g vercel

# 登录
vercel login

# 部署到预览环境
vercel

# 部署到生产环境
vercel --prod
```

## 故障排查

### 部署失败

1. **检查 Secrets 配置**: 确保所有 Secrets 都已正确配置
2. **检查 Vercel Token**: 确保 Token 有效且有正确的权限
3. **查看 Actions 日志**: 在 GitHub Actions 页面查看详细错误信息
4. **本地测试**: 先在本地运行 `npm run build` 确保项目可以正常构建

### 测试失败导致部署中断

如果你想跳过测试直接部署,可以修改 `.github/workflows/deploy.yml`:

```yaml
# 将这一步标记为允许失败
- name: Run tests
  run: npm run test
  continue-on-error: true  # 添加这一行
```

## 环境变量

如果你的项目需要环境变量:

1. 在 Vercel Dashboard 的项目设置中配置环境变量
2. 或在 `vercel.json` 中配置
3. 或通过 Vercel CLI 设置: `vercel env add`

## 相关链接

- [Vercel 文档](https://vercel.com/docs)
- [GitHub Actions 文档](https://docs.github.com/en/actions)
- [Vercel CLI 文档](https://vercel.com/docs/cli)
