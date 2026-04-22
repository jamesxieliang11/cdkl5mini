# Cloud Functions - 设计笔记

## 架构模式：Action 分发

所有记录类云函数采用**单函数多 Action** 模式，而非每个操作一个云函数。

**原因**：
- 减少云函数数量，降低管理成本
- 共享数据库连接初始化和公共工具函数
- 便于统一错误处理

**模式**：
```
exports.main → switch(action) → 具体处理函数
```

## 命名转换边界

前端传入 `camelCase` → 云函数内转换为 `snake_case` 存储。

```javascript
// 示例：medication_record 创建时的字段映射
前端: data.datetime     → 数据库: record_time
前端: data.sideEffects  → 数据库: side_effects
前端: med.takeTime      → 数据库: take_time
前端: med.name          → 数据库: medication_name
```

查询返回时，数据库字段（snake_case）直接传回前端，前端页面直接使用。

## 安全模式

### 所有权校验（必须遵守）
修改/删除操作必须同时匹配 `_id` 和 `user_id`：
```javascript
// 正确
db.collection('xxx').where({ _id: recordId, user_id: userId }).update(...)

// 错误 — 缺少 user_id 校验，可能操作他人数据
db.collection('xxx').doc(recordId).update(...)
```

### 管理员操作
`monthlyReport` 的 `adminStats` 和 `adminDetail` action 不过滤 `user_id`，返回全量数据。
当前没有管理员权限校验（依赖前端入口控制）。

## 云函数目录约定

```
cloudfunctions/xxxRecord/
├── index.js        # 唯一的代码文件
└── package.json    # { "dependencies": { "wx-server-sdk": "latest" } }
```

- 不要在云函数中引入额外的 npm 包（除非确实需要）
- `config.json` 仅在需要调整超时等配置时添加

## 返回值契约

所有云函数必须返回以下格式：
```javascript
// 成功
{ success: true, message: '描述', data: { ... } }

// 失败
{ success: false, message: '错误描述' }
```

前端 `utils/database.js` 中的通用调用器依赖此格式做 resolve/reject 分发。

## 当前云函数列表

| 云函数 | 复杂度 | 说明 |
|--------|--------|------|
| `medicationRecord` | 中 | 标准 CRUD + search，含药物数组转换 |
| `seizureRecord` | 中 | 标准 CRUD + search + 图片字段 |
| `otherRecord` | 中 | 标准 CRUD + search + 图片字段 |
| `monthlyReport` | 高 | 8+ actions，含管理员统计、追踪药物管理 |
| `userLogin` | 中 | 登录/注册，自动创建用户记录 |
| `updateUserProfile` | 低 | 更新患儿信息和病历文件 |
| `updateSimpleProfile` | 低 | 更新简单信息 |
| `initDatabase` | 低 | 批量初始化基础数据 |
| `initRecordsDatabase` | 低 | 创建记录集合 |
| `getOpenId` | 低 | 获取微信 OpenID |
| `getUserProfile` | 低 | 获取用户详情 |
| `feedback` | 低 | 用户反馈提交 |
