# Pages - 设计笔记

## 页面分类

### 表单页面（记录创建/编辑）
`medication-record/`, `seizure-record/`, `other-record/`, `monthly-report/`

**共同模式**：
- 支持新建/编辑双模式（`options.mode === 'edit'`）
- data 中包含 `formData` 对象、UI 状态、选项数据、`isEditMode`/`editRecordId`
- 提交前做三层验证（必填字段 → 数据完整性 → 业务规则）
- 保存成功后同步备份到本地存储
- `submitRecord()` 作为页面最后一个方法

**调药记录特有**：内置 20+ 种常用药物快捷选择、历史记录模板复制、副作用标签多选

**月度汇报特有**：分步表单（Step 1 用药 → Step 2 发作 → Step 3 里程碑），支持草稿保存

### 列表页面
`my-records/`, `admin-monthly-stats/`

**共同模式**：
- 分类筛选 + 日期范围筛选
- 分页加载（`pageSize` + `pageIndex`，上拉加载更多）
- 记录详情弹窗

### 仪表盘页面
`home/`

**模式**：
- 角色区分展示（patient/staff/researcher）
- 多数据源并行加载（今日用药、发作记录、其他记录）
- 月度汇报提醒卡片（每月 25 号后）

### 数据展示页面
`reports/`

**模式**：
- ECharts 图表渲染（ec-canvas 组件）
- 时间范围切换（7天/30天/3月/6月/1年）
- 从用户档案获取宝宝信息

## 页面导航规则

| 场景 | API | 示例 |
|------|-----|------|
| TabBar 页面互跳 | `wx.switchTab` | 首页 → 我的记录 |
| 进入表单页 | `wx.navigateTo` | 首页 → 调药记录 |
| 表单提交后返回 | `wx.navigateBack` | 调药记录 → 首页 |
| 从 TabBar 返回首页 | `wx.switchTab` | 自定义导航栏返回按钮 |

## 数据加载策略

```
onLoad()
  → 判断模式（新建/编辑）
  → 新建：initDefaultValues() + loadHistoryRecords()
  → 编辑：loadRecordForEdit(id)

loadHistoryRecords()
  → 云函数获取
    ├── 成功：转换数据格式（snake_case → camelCase）
    └── 失败：降级到 loadLocalHistoryRecords()
```

## 已知决策

- **选择 Vant Weapp 而非原生组件**：因为原生 picker 在 iOS/Android 体验不一致
- **500ms 轮询 TabBar 状态**：因为微信没有原生的 TabBar 页面切换事件
- **本地存储限制 10 条**：避免存储空间爆炸，仅用于快捷模板选择
