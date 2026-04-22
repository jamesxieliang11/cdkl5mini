# 希舞之家小程序

> 面向 CDKL5 缺陷症患者家庭的微信小程序，提供健康记录管理、月度汇报、统计报告等功能。

## 快速开始

```bash
# 1. 使用微信开发者工具打开 base/ 目录
# 2. 云环境 ID: cloud1-4g0dlvsdc0db6c89
# 3. 部署云函数：右键 cloudfunctions/ 下各子目录 → "上传并部署：云端安装依赖"
# 4. 构建 npm：微信开发者工具 → 工具 → 构建 npm
```

## 架构概览

微信小程序原生开发 + 微信云开发（CloudBase）+ Vant Weapp UI。
前端通过 `utils/database.js` 统一封装的 Promise 接口调用云函数，云函数操作 MongoDB 云数据库。
数据持久化采用三级策略：云数据库（主） → 本地存储（缓存/备份） → 降级兜底。

→ 详见 `docs/architecture.md`

## 目录结构

```
base/                              # 小程序项目根目录
├── app.js                         # 应用入口（云开发初始化、登录、全局状态）
├── app.json                       # 路由配置、TabBar、全局组件注册
├── app.wxss                       # 全局样式（主色 #34BFA3）
├── pages/                         # 页面目录 → 见 DESIGN_NOTES.md
├── components/                    # 组件目录 → 见 DESIGN_NOTES.md
├── cloudfunctions/                # 云函数目录 → 见 DESIGN_NOTES.md
├── utils/                         # 工具类
│   ├── database.js                # 云函数调用封装（所有 CRUD 的统一入口）
│   ├── user.js                    # 用户认证（登录/登出/角色管理）
│   └── ai-service.js              # AI 助手服务
├── database/                      # 数据库设计文档（schema 参考）
└── miniprogram_npm/               # npm 构建产物（Vant Weapp）
```

## 关键约定

1. **所有数据库操作必须通过 `utils/database.js`**，禁止页面直接调用 `wx.cloud.callFunction`（历史记录加载除外）
2. **云函数采用 action 分发模式**：每个云函数通过 `action` 参数路由到对应的处理函数
3. **数据字段命名**：云数据库/云函数使用 `snake_case`，前端 JS 使用 `camelCase`，需在边界层做转换
4. **用户数据隔离**：所有记录类操作必须携带 `userId`，云函数中校验 `user_id` 所有权
5. **错误处理三层**：表单验证 → 云函数业务校验 → try-catch 兜底 + wx.showToast 反馈
6. **本地存储备份**：记录保存成功后同步备份到本地存储，加载时优先云函数、失败降级本地
7. **注释语言使用中文**，代码变量命名使用英文
8. **主题色 `#34BFA3`**（绿色），所有新增 UI 需保持一致
9. **页面通过 `options.mode` 区分新建/编辑模式**，通过 `options.id` 传递记录 ID
10. **Vant Weapp 组件在 `app.json` 中全局注册**，页面级 `.json` 按需补充

## 文档地图

| 主题 | 文档 |
|------|------|
| 系统架构 & 数据流 | `docs/architecture.md` |
| 编码规范 & 命名约定 | `docs/conventions.md` |
| 数据库模型 & 集合 | `docs/data-model.md` |
| 云函数开发模式 | `docs/cloud-functions.md` |
| 构建 & 部署 | `docs/deployment.md` |
| 页面开发模式 | `base/pages/DESIGN_NOTES.md` |
| 云函数开发模式 | `base/cloudfunctions/DESIGN_NOTES.md` |
| 组件开发模式 | `base/components/DESIGN_NOTES.md` |

## 常见任务

| 任务 | 操作 |
|------|------|
| 新增一种记录类型 | 1. `cloudfunctions/` 新建云函数 → 2. `utils/database.js` 添加封装 → 3. `pages/` 新建表单页 → 4. `database/collections.json` 添加集合定义 |
| 新增页面 | 1. `pages/` 新建目录 → 2. `app.json` 注册路由 → 3. 如需 TabBar 则更新 `custom-tabbar` |
| 修改云函数 | 编辑代码 → 右键"上传并部署：云端安装依赖" → 测试 |
| 新增 Vant 组件 | `app.json` usingComponents 中注册 → 页面 wxml 中使用 |
| 修改数据库 schema | 更新 `database/` 下的 schema 文件 → 同步更新云函数字段 → 更新 `docs/data-model.md` |
| 调试云函数 | 微信开发者工具 → 云开发控制台 → 云函数日志 |
| 运行架构检查 | `bash scripts/lint-architecture.sh` |

## 用户角色

| 角色 | 标识 | 功能权限 |
|------|------|----------|
| 病友家庭 | `patient` | 健康记录、月度汇报、义诊预约、统计报告（默认角色） |
| 科研人员 | `researcher` | 会议资料、专家通讯录、学术议程 |
| 工作人员 | `staff` | 签到管理、任务分配、数据统计 |

## Agent 工作规则

### 允许
- 创建/修改 `base/` 中的页面、组件、云函数、工具类
- 更新 `docs/` 和 `DESIGN_NOTES.md` 文档
- 修改 `app.json` 配置

### 禁止
- 修改 `miniprogram_npm/` 目录（由 npm 构建生成）
- 直接修改云环境 ID（`cloud1-4g0dlvsdc0db6c89`）
- 删除 `database/` 下的 schema 文件
- 绕过 `utils/database.js` 在页面中直接调用云函数

### Git 约定
- Commit 格式：`type(scope): description`
- type: feat / fix / docs / refactor / style / chore
- scope: page / cloud / utils / component / db / harness
