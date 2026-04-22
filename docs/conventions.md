# 编码规范 & 约定

> 最后验证：2025-06

## 命名约定

### 文件命名
| 类型 | 命名规则 | 示例 |
|------|----------|------|
| 页面目录 | `kebab-case` | `medication-record/`, `my-records/` |
| 页面文件 | `index.{js,json,wxml,wxss}` | `index.js` |
| 云函数目录 | `camelCase` | `medicationRecord/`, `monthlyReport/` |
| 组件目录 | `kebab-case` | `custom-tabbar/`, `ec-canvas/` |
| 工具文件 | `camelCase` | `database.js`, `user.js` |

### 变量命名
| 上下文 | 风格 | 示例 |
|--------|------|------|
| 前端 JS 变量/函数 | `camelCase` | `formData`, `submitRecord()` |
| 云数据库字段 | `snake_case` | `user_id`, `record_time`, `side_effects` |
| 云函数参数 | `camelCase` (入) → `snake_case` (存) | `data.datetime` → `record_time` |
| 本地存储 Key | `camelCase` | `userInfo`, `medicationRecords` |
| CSS 类名 | `kebab-case` | `.record-card`, `.form-item` |
| 数据库集合名 | `snake_case` | `medication_records`, `seizure_records` |

**关键**：前端与数据库之间存在命名风格转换边界，转换发生在**云函数内部**（创建/更新时 camelCase→snake_case，查询返回时 snake_case→前端直接使用）。

## 注释约定

- **代码注释使用中文**
- 所有函数需要 JSDoc 注释（`@param`, `@returns`）
- 页面/组件顶部无需文件级注释（文件名已说明用途）
- 复杂业务逻辑添加行内注释说明"为什么"

```javascript
// 好的注释 — 解释"为什么"
// 每月25号之后才提醒，避免月初频繁打扰用户
if (dayOfMonth < 25) return

// 不好的注释 — 描述"是什么"（代码已经说明了）
// 设置 submitting 为 true
this.setData({ submitting: true })
```

## 页面开发约定

### 页面结构
每个页面目录包含 4 个文件：
```
pages/xxx/
├── index.js     # 页面逻辑
├── index.json   # 页面配置（局部组件注册）
├── index.wxml   # 页面模板
└── index.wxss   # 页面样式
```

### Page 对象结构约定
```javascript
const app = getApp()
const { ... } = require('../../utils/database.js')

Page({
  data: {
    // 1. 表单数据
    formData: { ... },
    // 2. UI 状态（选择器开关等）
    showDatePicker: false,
    // 3. 选项数据（下拉列表等）
    commonOptions: [],
    // 4. 列表数据
    records: [],
    // 5. 加载/提交状态
    submitting: false,
    loading: false,
    // 6. 编辑模式状态
    isEditMode: false,
    editRecordId: null
  },
  
  onLoad(options) { },     // 初始化 + 模式判断
  onShow() { },            // 页面显示时刷新数据
  // ... 事件处理函数
  // ... 数据加载函数
  submitRecord() { }       // 提交函数放在最后
})
```

### 新建/编辑模式
- 通过 URL 参数区分：`?mode=edit&id=xxx`
- `onLoad` 中判断：`options.mode === 'edit'`
- 编辑模式加载已有数据，新建模式初始化默认值

## 云函数约定

→ 详见 `docs/cloud-functions.md`

### 返回值格式（强制）
```javascript
// 成功
{ success: true, message: '操作成功', data: { ... } }

// 失败
{ success: false, message: '错误描述' }
```

## 错误处理约定

### 三层错误处理
1. **前端表单验证**：提交前检查必填字段，`wx.showToast({ icon: 'none' })`
2. **云函数业务校验**：数据完整性、权限、存在性检查，返回 `{ success: false }`
3. **异常兜底**：`try-catch` 包裹，catch 中 `wx.showToast({ icon: 'error' })`

### Toast 使用约定
| 场景 | icon | duration |
|------|------|----------|
| 操作成功 | `'success'` | 2000ms |
| 验证失败 | `'none'` | — |
| 网络/系统错误 | `'error'` | 3000ms |
| 加载中 | `wx.showLoading` | — |

## 样式约定

### 主题色
| 用途 | 颜色值 |
|------|--------|
| 主色 | `#34BFA3` |
| 导航栏背景 | `#34BFA3` |
| TabBar 选中色 | `#34BFA3` |
| TabBar 未选中 | `#666666` |
| 背景色 | `#f5f5f5` |

### 自定义导航栏
项目使用 `"navigationStyle": "custom"`，所有页面需自行实现导航栏区域，注意安全区域适配。

## 数据操作约定

- 所有数据操作通过 `utils/database.js` 的封装函数
- 封装函数自动注入 `userId`（从本地存储读取）
- 分页参数：`pageSize`（每页数量）、`pageIndex`（页码，从 0 开始）
- 图片上传使用 `wx.cloud.uploadFile`，路径格式：`{类型}-images/{时间戳}-{随机数}.{扩展名}`
