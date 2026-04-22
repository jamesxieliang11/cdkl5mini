# 系统架构

> 最后验证：2025-06

## 技术栈

| 层级 | 技术 | 说明 |
|------|------|------|
| 前端框架 | 微信小程序原生 | WXML + WXSS + JS，非 TypeScript |
| UI 组件库 | Vant Weapp v1.x | 通过 npm 安装，`app.json` 全局注册 |
| 图表渲染 | ECharts (ec-canvas) | 报告页面使用 |
| 后端服务 | 微信云开发 (CloudBase) | 免服务器，自动鉴权 |
| 数据库 | MongoDB (云数据库) | 文档型，通过云函数操作 |
| 文件存储 | 云存储 | 图片/病历文件上传 |

## 整体架构

```
┌─────────────────────────────────────────────┐
│                  微信客户端                    │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │  Pages    │  │Components│  │  Utils   │   │
│  │(表单/列表)│  │(TabBar等)│  │(database │   │
│  │          │  │          │  │ /user)   │   │
│  └────┬─────┘  └──────────┘  └────┬─────┘   │
│       │                           │          │
│       └───────── 调用 ────────────┘          │
│                    │                          │
└────────────────────┼──────────────────────────┘
                     │ wx.cloud.callFunction
                     ▼
┌─────────────────────────────────────────────┐
│              微信云开发 (CloudBase)            │
│  ┌──────────────────────────────────────┐    │
│  │         Cloud Functions              │    │
│  │  action 分发 → CRUD 处理函数          │    │
│  └──────────────┬───────────────────────┘    │
│                 │                             │
│    ┌────────────┼────────────┐               │
│    ▼            ▼            ▼               │
│ ┌──────┐  ┌──────────┐  ┌────────┐          │
│ │云数据库│  │  云存储   │  │ 云函数  │          │
│ │MongoDB│  │图片/文件  │  │  日志  │          │
│ └──────┘  └──────────┘  └────────┘          │
└─────────────────────────────────────────────┘
```

## 数据流模式

### 标准 CRUD 数据流

```
页面 (Page)
  → utils/database.js 的封装函数（如 createMedicationRecord）
    → callXxxFunction(action, params)  // 内部通用调用器
      → wx.cloud.callFunction({ name, data: { action, ...params } })
        → 云函数 exports.main → switch(action) → 具体处理函数
          → db.collection().add/update/remove/get
        ← { success: true/false, message, data }
      ← Promise resolve/reject
    ← 页面处理结果（Toast + 导航）
```

### 数据持久化三级策略

```
优先级 1: 云数据库 (Cloud Database)
  └── 所有 CRUD 通过云函数操作，数据实时同步
  
优先级 2: 本地存储 (wx.setStorageSync)
  └── 记录保存成功后同步备份，限制条数（如调药记录最近 10 条）
  
优先级 3: 降级兜底
  └── 云函数调用失败时，从本地存储读取缓存数据展示
```

### 用户认证流程

```
App.onLaunch()
  → 检查本地缓存 (openid/userRole/userId)
    ├── 有缓存 → 恢复到 globalData → 后台静默刷新 (silent=true)
    └── 无缓存 → wx.login() → userLogin 云函数
      → 创建/更新用户记录 → 返回用户信息
        → 保存到 globalData + 本地存储 (openid, userRole, userId, adminRole)
```

## 页面组织

### TabBar 页面（需要 wx.switchTab 导航）
- `pages/home/index` — 首页仪表盘
- `pages/add-record/index` — 添加记录入口
- `pages/my-records/index` — 我的记录列表
- `pages/user-profile/index` — 个人中心
- `pages/admin/admin` — 管理面板

### 普通页面（通过 wx.navigateTo 导航）
- `pages/medication-record/index` — 调药记录表单
- `pages/seizure-record/index` — 发作记录表单
- `pages/other-record/index` — 其他记录表单
- `pages/monthly-report/index` — 月度汇报（分步表单）
- `pages/reports/index` — 统计报告（ECharts 图表）
- `pages/admin-monthly-stats/index` — 管理员月度统计
- `pages/feedback/index` — 反馈意见
- `pages/ai-assistant/index` — AI 助手

### 遗留页面（可清理）
- `pages/cart/` — Vant 示例
- `pages/goods/` — Vant 示例
- `pages/profile/` — 旧版个人中心
- `pages/user/` — 旧版用户页
- `pages/appointment/` — 义诊预约（暂未使用）
- `pages/appointment-form/` — 义诊预约表单
- `pages/expert-detail/` — 专家详情
- `pages/queue-status/` — 排队状态
- `pages/messages/` — 消息通知
- `pages/role-select/` — 角色选择
- `pages/tools/` — 工具页

## 全局状态管理

通过 `app.globalData` 管理，无 Vuex/Redux 类状态管理库：

```javascript
globalData: {
  userRole: '',          // 'patient' | 'staff' | 'researcher'
  userInfo: null,        // 完整用户信息对象
  openid: '',            // 用户 OpenID
  queueNumber: '',       // 排队号
  favoriteSchedules: [], // 收藏的议程 ID 列表
  hasNewMessage: false   // 是否有新消息
}
```

页面通过 `getApp().globalData.xxx` 读取全局状态。
