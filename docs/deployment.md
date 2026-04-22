# 构建 & 部署

> 最后验证：2025-06

## 开发环境要求

| 工具 | 版本/说明 |
|------|-----------|
| 微信开发者工具 | 最新稳定版 |
| Node.js | ≥ 14（用于 npm 依赖管理） |
| 云环境 ID | `cloud1-4g0dlvsdc0db6c89` |

## 项目初始化

```bash
# 1. 克隆项目
git clone <repo-url>
cd CDKL5大会小程序

# 2. 安装前端依赖
cd base
npm install

# 3. 用微信开发者工具打开 base/ 目录
# 4. 工具 → 构建 npm（生成 miniprogram_npm/）
# 5. 确认云环境 ID 正确（app.js 中的 env 字段）
```

## 云函数部署

### 首次部署（全部）
对 `base/cloudfunctions/` 下的每个子目录：
1. 右键点击目录
2. 选择「上传并部署：云端安装依赖」

### 单个云函数更新
修改代码后：
1. 右键该云函数目录
2. 选择「上传并部署：云端安装依赖」
3. 在云开发控制台 → 云函数日志中验证

### 云函数部署顺序（首次）
```
1. getOpenId       → 基础依赖
2. userLogin       → 用户系统
3. initDatabase    → 基础数据
4. initRecordsDatabase → 记录集合
5. 其余云函数      → 按需部署
```

## 数据库初始化

首次部署后，需通过管理员面板初始化数据库：

1. 部署所有云函数
2. 打开小程序 → 进入管理面板（`pages/admin/admin`）
3. 点击「初始化基础数据库」→ 创建科室/专家/议程/配置/资源集合
4. 点击「初始化记录数据库」→ 创建记录相关集合

## NPM 构建

项目使用 Vant Weapp 组件库，通过 npm 管理：

```bash
# 安装依赖
cd base
npm install @vant/weapp

# 在微信开发者工具中构建
工具 → 构建 npm
```

**注意**：每次修改 `package.json` 后都需要重新「构建 npm」。
构建产物位于 `base/miniprogram_npm/`，已纳入版本控制。

## 开发调试

### 本地调试
- 微信开发者工具的模拟器直接预览
- 云函数支持本地调试：右键 → 「本地调试」
- console.log 输出在调试器的 Console 面板中查看

### 云函数日志
- 云开发控制台 → 云函数 → 选择云函数 → 日志
- 可按时间范围筛选、关键字搜索

### 真机调试
- 微信开发者工具 → 「预览」或「真机调试」
- 通过微信扫码在真机上测试

## 环境配置

### app.js 中的云环境配置
```javascript
wx.cloud.init({
  env: 'cloud1-4g0dlvsdc0db6c89',  // 云环境 ID
  traceUser: true
})
```

### 云函数中的环境配置
```javascript
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV  // 动态环境（推荐）
})
```

## 发布流程

1. 确认所有云函数已部署到最新版本
2. 确认 npm 已构建
3. 微信开发者工具 → 「上传」
4. 微信公众平台 → 版本管理 → 提交审核
5. 审核通过后发布

## 注意事项

- `miniprogram_npm/` 目录的内容由构建 npm 自动生成，不要手动修改
- 云函数的 `package.json` 中仅依赖 `wx-server-sdk`，不要添加不必要的依赖
- 修改 `app.json` 后需要重启开发者工具才能生效
- 图片资源放在 `base/icons/` 目录下
