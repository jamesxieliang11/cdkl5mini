# 希舞之家小程序云函数使用说明

## 概述

本项目为希舞之家小程序提供了完整的云函数支持，主要用于数据库初始化和数据管理。

## 云函数结构

```
cloudfunctions/
└── initDatabase/
    ├── index.js        # 云函数主文件
    ├── package.json    # 依赖配置
    └── config.json     # 云函数配置
```

## 功能特性

### 1. 数据库初始化云函数 (initDatabase)

**功能说明：**
- 一键初始化小程序所需的所有数据库集合和基础数据
- 包含义诊科室、专家信息、会议议程、系统配置、资源文件等数据
- 支持重复调用检测，避免数据重复初始化

**数据集合：**
- `departments` - 义诊科室信息
- `experts` - 专家信息
- `schedules` - 会议议程
- `system_configs` - 系统配置
- `resources` - 资源文件

## 部署步骤

### 1. 配置云开发环境

1. 在微信开发者工具中打开项目
2. 点击"云开发"按钮，创建云环境
3. 记录云环境ID，更新 `app.js` 中的环境配置：

```javascript
wx.cloud.init({
  env: 'your-env-id', // 替换为实际的云环境ID
  traceUser: true,
})
```

### 2. 部署云函数

1. 右键点击 `cloudfunctions/initDatabase` 目录
2. 选择"上传并部署：云端安装依赖"
3. 等待部署完成

### 3. 配置数据库权限

在云开发控制台中设置数据库权限：
- 所有集合设置为"仅创建者可读写"或根据需要调整

## 使用方法

### 1. 通过管理员页面使用

1. 在小程序中导航到"管理"页面
2. 点击"初始化数据库"按钮
3. 等待初始化完成

### 2. 通过代码调用

```javascript
// 导入工具函数
import { initDatabase } from '../../utils/database.js'

// 调用初始化
try {
  const result = await initDatabase()
  console.log('初始化成功:', result)
} catch (error) {
  console.error('初始化失败:', error)
}
```

### 3. 直接调用云函数

```javascript
wx.cloud.callFunction({
  name: 'initDatabase',
  data: {},
  success: (res) => {
    console.log('初始化结果:', res.result)
  },
  fail: (error) => {
    console.error('调用失败:', error)
  }
})
```

## 返回数据格式

### 成功响应
```json
{
  "success": true,
  "message": "数据库初始化成功",
  "data": {
    "departments": 4,
    "configs": 5,
    "experts": 3,
    "schedules": 4,
    "resources": 4,
    "timestamp": "2025-09-04T01:49:00.000Z"
  }
}
```

### 失败响应
```json
{
  "success": false,
  "message": "数据库初始化失败",
  "error": "错误信息",
  "stack": "错误堆栈"
}
```

### 重复初始化响应
```json
{
  "success": false,
  "message": "数据库已经初始化过，无需重复初始化",
  "data": {
    "existingRecords": 4
  }
}
```

## 数据库工具函数

项目提供了完整的数据库操作工具函数 (`utils/database.js`)：

- `initDatabase()` - 初始化数据库
- `checkDatabaseStatus()` - 检查数据库状态
- `getDepartments()` - 获取义诊科室列表
- `getExperts()` - 获取专家列表
- `getSchedules()` - 获取会议议程
- `getSystemConfig(configKey)` - 获取系统配置
- `getResources(category)` - 获取资源文件列表

## 注意事项

1. **环境配置**：确保在 `app.js` 中正确配置了云环境ID
2. **权限设置**：根据实际需要配置数据库集合的读写权限
3. **数据安全**：生产环境中建议对管理功能添加权限验证
4. **错误处理**：建议在调用云函数时添加适当的错误处理逻辑
5. **性能优化**：大量数据操作时注意云函数的超时限制（默认60秒）

## 故障排除

### 常见问题

1. **云函数调用失败**
   - 检查云环境ID是否正确
   - 确认云函数已正确部署
   - 查看云开发控制台的错误日志

2. **数据库权限错误**
   - 检查数据库集合的权限设置
   - 确认用户登录状态

3. **初始化超时**
   - 检查网络连接
   - 查看云函数日志确认具体错误

### 调试方法

1. 查看微信开发者工具的控制台输出
2. 在云开发控制台查看云函数调用日志
3. 检查数据库中的数据是否正确创建

## 更新日志

- v1.0.0 - 初始版本，支持基础数据初始化功能