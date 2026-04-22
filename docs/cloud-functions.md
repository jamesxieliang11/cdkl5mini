# 云函数开发模式

> 最后验证：2025-06  
> 云函数目录：`base/cloudfunctions/`

## 云函数清单

| 云函数 | 集合 | Actions | 说明 |
|--------|------|---------|------|
| `medicationRecord` | `medication_records` | create/update/delete/get/list/search | 调药记录 CRUD |
| `seizureRecord` | `seizure_records` | create/update/delete/get/list/search | 发作记录 CRUD |
| `otherRecord` | `other_records` | create/update/delete/get/list/search | 其他记录 CRUD |
| `monthlyReport` | `monthly_reports` + `tracked_medications` | create/update/get/list/getLastReport/getTrackedMedications/updateTrackedMedications/checkMonthSubmitted/adminStats/adminDetail | 月度汇报 |
| `userLogin` | `users` | — | 登录/注册 |
| `getOpenId` | — | — | 获取 OpenID |
| `getUserProfile` | `users` | — | 获取用户详情 |
| `updateUserProfile` | `users` | — | 更新患者信息 |
| `updateSimpleProfile` | `users` | — | 更新简单信息 |
| `initDatabase` | 多个基础集合 | — | 初始化基础数据 |
| `initRecordsDatabase` | 记录集合 | — | 初始化记录集合 |
| `feedback` | `feedbacks` | — | 用户反馈 |

## 标准云函数模板

### 目录结构
```
cloudfunctions/xxxRecord/
├── index.js        # 云函数入口
└── package.json    # 依赖（仅 wx-server-sdk）
```

### 入口模板（Action 分发模式）
```javascript
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV  // 使用动态环境，不硬编码
})

const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  const { action, data, recordId, userId, pageSize = 10, pageIndex = 0 } = event
  
  try {
    switch (action) {
      case 'create':
        return await createRecord(data, userId)
      case 'update':
        return await updateRecord(recordId, data, userId)
      case 'delete':
        return await deleteRecord(recordId, userId)
      case 'get':
        return await getRecord(recordId, userId)
      case 'list':
        return await listRecords(userId, pageSize, pageIndex)
      case 'search':
        return await searchRecords(data, userId, pageSize, pageIndex)
      default:
        return { success: false, message: '不支持的操作类型' }
    }
  } catch (error) {
    console.error('操作失败:', error)
    return {
      success: false,
      message: '操作失败: ' + error.message,
      error: error
    }
  }
}
```

### Create 模板
```javascript
async function createRecord(data, userId) {
  // 1. 数据验证
  if (!data.requiredField) {
    return { success: false, message: '缺少必要信息' }
  }
  
  // 2. 字段转换（camelCase → snake_case）
  const record = {
    user_id: userId,
    field_name: data.fieldName,       // 命名转换
    created_at: new Date(),
    updated_at: new Date()
  }
  
  // 3. 写入数据库
  const result = await db.collection('xxx_records').add({ data: record })
  
  // 4. 返回标准格式
  return {
    success: true,
    message: '创建成功',
    data: { recordId: result._id, ...record }
  }
}
```

### Update 模板
```javascript
async function updateRecord(recordId, data, userId) {
  // 1. 参数验证
  if (!recordId) {
    return { success: false, message: '记录ID不能为空' }
  }
  
  // 2. 所有权校验（关键！）
  const existing = await db.collection('xxx_records')
    .where({ _id: recordId, user_id: userId })
    .get()
  
  if (existing.data.length === 0) {
    return { success: false, message: '记录不存在或无权限修改' }
  }
  
  // 3. 选择性更新（仅更新传入的字段）
  const updateData = { updated_at: new Date() }
  if (data.fieldName !== undefined) {
    updateData.field_name = data.fieldName
  }
  
  // 4. 执行更新
  await db.collection('xxx_records')
    .where({ _id: recordId, user_id: userId })
    .update({ data: updateData })
  
  return { success: true, message: '更新成功', data: updateData }
}
```

### List 模板（分页）
```javascript
async function listRecords(userId, pageSize, pageIndex) {
  const skip = pageIndex * pageSize
  
  // 并行查询数据和总数
  const [result, countResult] = await Promise.all([
    db.collection('xxx_records')
      .where({ user_id: userId })
      .orderBy('record_time', 'desc')
      .skip(skip)
      .limit(pageSize)
      .get(),
    db.collection('xxx_records')
      .where({ user_id: userId })
      .count()
  ])
  
  return {
    success: true,
    message: '获取成功',
    data: {
      records: result.data,
      total: countResult.total,
      pageSize,
      pageIndex,
      hasMore: (pageIndex + 1) * pageSize < countResult.total
    }
  }
}
```

## 前端封装层（utils/database.js）

### 封装模式
```javascript
// 通用调用器（私有函数）
function callXxxFunction(action, params = {}) {
  return new Promise((resolve, reject) => {
    wx.cloud.callFunction({
      name: 'xxxRecord',
      data: { action, ...params },
      success: (res) => {
        if (res.result && res.result.success) {
          resolve(res.result)
        } else {
          reject(new Error(res.result?.message || '操作失败'))
        }
      },
      fail: (error) => reject(error)
    })
  })
}

// 高层封装（公开函数，自动注入 userId）
function createXxxRecord(data) {
  return callXxxFunction('create', {
    data,
    userId: wx.getStorageSync('userId') || 'default_user'
  })
}
```

### 新增记录类型时的检查清单
1. `cloudfunctions/` 下创建云函数目录 + `index.js` + `package.json`
2. `utils/database.js` 中添加 `callXxxFunction` 和高层封装函数
3. `utils/database.js` 底部 `module.exports` 中导出新函数
4. `database/collections.json` 中添加集合定义和索引
5. 更新 `docs/data-model.md` 添加 schema 说明
6. 部署云函数到云端

## 注意事项

- **环境配置**：云函数中使用 `cloud.DYNAMIC_CURRENT_ENV`，不要硬编码环境 ID
- **数据库限制**：单次查询最多 100 条，需要分页处理
- **超时设置**：默认 3 秒，复杂查询可在 `config.json` 中调整
- **日志**：使用 `console.log/error`，可在云开发控制台查看
- **所有权校验**：修改/删除操作必须在 where 条件中同时包含 `_id` 和 `user_id`
