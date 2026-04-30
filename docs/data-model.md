# 数据库模型

> 最后验证：2025-06  
> 数据库类型：MongoDB（微信云数据库）  
> Schema 参考文件：`base/database/collections.json`, `base/database/records-schema.sql`

## 集合总览

| 集合名 | 类型 | 说明 |
|--------|------|------|
| `users` | 用户数据 | 用户信息、角色、患儿档案 |
| `medication_records` | 记录数据 | 调药记录（含药物数组） |
| `seizure_records` | 记录数据 | 发作记录（含图片数组） |
| `other_records` | 记录数据 | 其他记录（含图片数组） |
| `monthly_reports` | 记录数据 | 月度汇报（用药+发作+里程碑） |
| `tracked_medications` | 配置数据 | 用户追踪药物配置 |
| `record_statistics` | 统计数据 | 记录统计聚合 |
| `departments` | 基础数据 | 义诊科室 |
| `experts` | 基础数据 | 专家信息 |
| `schedules` | 基础数据 | 会议议程 |
| `appointments` | 业务数据 | 义诊预约 |
| `queues` | 业务数据 | 排队状态 |
| `messages` | 业务数据 | 消息通知 |
| `favorites` | 业务数据 | 用户收藏 |
| `questionnaires` | 业务数据 | 家庭基础信息问卷 |
| `system_configs` | 配置数据 | 系统配置 |
| `resources` | 基础数据 | 文件资源 |
| `feedbacks` | 业务数据 | 用户反馈 |

## 核心集合 Schema

### users
```javascript
{
  _id: String,                    // 自动生成
  openid: String,                 // 微信 OpenID（唯一索引）
  userRole: 'patient' | 'staff' | 'researcher',
  adminRole: String,              // 管理员角色标识
  nickName: String,               // 微信昵称
  avatarUrl: String,              // 微信头像
  hasCompleteProfile: Boolean,    // 是否完善个人信息
  patientInfo: {                  // 患儿信息（仅 patient 角色）
    name: String,                 // 患儿姓名
    birthday: String,             // 出生日期
    weight: Number,               // 体重 (kg)
    parentName: String,           // 家长姓名
    phone: String,                // 联系电话
    relation: String,             // 与患儿关系
    medicalHistory: String,       // 病史
    notes: String                 // 备注
  },
  medicalFiles: [{                // 病历文件
    fileID: String,               // 云存储文件 ID
    name: String,                 // 文件名
    type: String,                 // 文件类型
    uploadTime: String            // 上传时间
  }],
  created_at: Date,
  updated_at: Date
}
```

### medication_records
```javascript
{
  _id: String,
  user_id: String,                // 用户 ID（索引）
  record_time: Date,              // 记录时间
  weight: Number,                 // 体重 (kg)
  medications: [{                 // 药物列表（嵌套数组，非关联表）
    medication_name: String,      // 药物名称
    dosage: Number,               // 药量
    unit: String,                 // 单位 (mg/g/ml/片/粒/包/滴)
    take_time: String             // 服用时间 (HH:mm)
  }],
  side_effects: String,           // 副作用描述
  created_at: Date,
  updated_at: Date
}
// 索引: user_id, record_time(desc), created_at(desc)
```

### seizure_records
```javascript
{
  _id: String,
  user_id: String,                // 用户 ID（索引）
  record_time: Date,              // 发作时间
  seizure_type: String,           // 发作类型：强直阵挛/失神/肌阵挛/局灶性/复杂性/其他
  duration: Number,               // 持续时间（分钟）
  triggers: String,               // 诱发因素
  symptoms: String,               // 症状表现
  images: [{                      // 图片列表（最多 5 张）
    fileID: String,               // 云存储文件 ID
    cloudPath: String,            // 云存储路径
    uploadTime: String            // 上传时间
  }],
  created_at: Date,
  updated_at: Date
}
// 索引: user_id, seizure_type, record_time(desc)
// 云存储路径: seizure-images/
```

### other_records
```javascript
{
  _id: String,
  user_id: String,
  record_time: Date,
  category: String,               // 类别：手术/门诊/住院/检查/化验/日常观察/饮食/睡眠/...
  content: String,                // 记录内容
  remark: String,                 // 备注
  images: [{                      // 图片列表（最多 9 张）
    fileID: String,
    cloudPath: String,
    uploadTime: String
  }],
  created_at: Date,
  updated_at: Date
}
// 云存储路径: other-record-images/
```

### monthly_reports
```javascript
{
  _id: String,
  user_id: String,
  month: String,                  // 月份 (YYYY-MM)
  status: 'draft' | 'submitted',
  medications: [{                 // 用药追踪
    name: String,
    dosage: String,
    frequency: String,
    compliance: 'good' | 'fair' | 'poor',
    sideEffects: String,
    adjusted: Boolean
  }],
  seizures: {                     // 发作统计
    totalCount: Number,
    typeCounts: Object,           // { type: count }
    comparedToLastMonth: 'decreased' | 'same' | 'increased',
    worstDescription: String,
    commonTriggers: String
  },
  milestones: {                   // 发育里程碑（4 大类 22 项）
    grossMotor: [String],         // 大运动
    fineMotor: [String],          // 精细运动
    languageCognition: [String],  // 语言认知
    socialEmotional: [String]     // 社交情感
  },
  created_at: Date,
  updated_at: Date
}
```

### questionnaires
```javascript
{
  _id: String,
  openid: String,                 // 微信 OpenID（唯一索引，问卷填写时自动写入）
  user_id: String,                // 用户 ID（索引）
  status: 'draft' | 'submitted', // 问卷状态

  // —— 基本信息（Step 1）——
  child_name: String,             // 孩子姓名
  wechat_group_nickname: String,  // 微信群昵称
  child_gender: String,           // 性别（男/女）
  birth_date: String,             // 出生日期 (YYYY-MM-DD)
  region: String,                 // 所在地区（省市）
  parent_name: String,            // 家长姓名
  parent_contact: String,         // 微信号/手机号
  birth_order: String,            // 第几胎

  // —— 孕产信息（Step 2）——
  pregnancy_method: String,       // 怀孕方式
  pregnancy_protection: String,   // 是否保胎
  delivery_method: String,        // 分娩方式
  misdiagnosed_as_cp: String,     // 是否被当作脑瘤治疗

  // —— 家庭背景（Step 3）——
  mother_education: String,       // 母亲学历
  mother_occupation: String,      // 母亲职业
  father_education: String,       // 父亲学历
  father_occupation: String,      // 父亲职业
  family_member_resigned: String, // 家庭成员辞职情况
  monthly_income: String,         // 家庭月收入
  treatment_cost: String,         // 每月治疗费用
  rehab_cost: String,             // 每月康复费用

  // —— 诊断与症状（Step 4）——
  diagnosis_age: String,          // 诊断年龄
  first_seizure_age: String,      // 癫痫首次发作年龄
  other_symptoms: String,         // 其他症状（多选，、分隔）
  mobility_method: String,        // 主要移动方式
  swallowing_difficulty: String,  // 吞咽困难程度
  sleep_disorder: String,         // 睡眠障碍程度
  sleep_restlessness: String,     // 睡眠中不安静
  development_status: String,     // 发育状态

  // —— 基因检测（Step 5）——
  gene_test_done: String,         // 是否已基因检测
  gene_report_images: [String],   // 基因报告图片（云存储 fileID）
  mutation_source: String,        // 基因变异来源
  mutation_type: String,          // 突变类型

  // —— 癫痫与治疗（Step 6）——
  seizure_control: String,        // 癫痫控制情况
  recent_seizure_type: String,    // 最近发作形式
  recent_seizure_duration: String,// 发作持续时间
  recent_seizure_intensity: String,// 发作强度
  treatment_methods: String,      // 治疗措施（多选，、分隔）
  current_medications: String,    // 目前服药情况
  worsening_medications: String,  // 加重药物
  ineffective_medications: String,// 无效药物

  // —— 药浴与其他（Step 7）——
  hot_bath: String,               // 是否坚持热浴
  bath_frequency: String,         // 药浴频率
  bath_duration: String,          // 热浴时长
  bath_benefits: String,          // 药浴帮助（选填）
  treatment_effect_description: String, // 治疗效果描述（选填）
  volunteer_willingness: String,  // 是否愿意做志愿者（选填）
  resources_skills: String,       // 资源/特长（选填）
  referral_source: String,        // 渠道来源

  submit_time: Date,              // 提交时间
  created_at: Date,
  updated_at: Date
}
// 索引: openid(唯一), user_id, status, created_at(desc)
// 云存储路径: questionnaire-images/
```

## 社区相关集合 Schema

### community_posts
```javascript
{
  _id: String,
  user_id: String,                // 发帖用户 ID（索引）
  nick_name: String,              // 昵称（冗余存储）
  avatar_url: String,             // 头像（冗余）
  is_anonymous: Boolean,          // 是否匿名（匿名显示为「匿名希舞宝宝」）
  topic_id: String,               // 关联话题 ID（可选，索引）
  content: String,                // 帖子内容（最多 2000 字）
  images: [{                      // 图片（最多 9 张）
    fileID: String,               // 云存储文件 ID
    cloudPath: String             // 云存储路径
  }],
  like_count: Number,             // 点赞数
  comment_count: Number,          // 评论数
  view_count: Number,             // 浏览数
  is_pinned: Boolean,             // 是否置顶（管理员操作）
  status: String,                 // 'active' | 'hidden' | 'deleted'
  created_at: Date,
  updated_at: Date
}
// 索引: user_id, topic_id, status, created_at(desc), is_pinned+created_at(desc)
// 云存储路径: community-images/
```

### community_comments
```javascript
{
  _id: String,
  post_id: String,                // 所属帖子 ID（索引）
  user_id: String,                // 评论用户 ID（索引）
  nick_name: String,              // 昵称（冗余）
  avatar_url: String,             // 头像（冗余）
  content: String,                // 评论内容（最多 500 字）
  reply_to_id: String,            // 回复的评论 ID（可选，楼中楼）
  reply_to_name: String,          // 回复的用户昵称
  like_count: Number,             // 点赞数
  status: String,                 // 'active' | 'hidden' | 'deleted'
  created_at: Date
}
// 索引: post_id, user_id, created_at(desc)
```

### community_topics
```javascript
{
  _id: String,
  title: String,                  // 话题标题
  description: String,            // 话题描述
  icon: String,                   // 话题图标（emoji 或图片 URL）
  post_count: Number,             // 帖子数
  is_hot: Boolean,                // 是否热门
  sort_order: Number,             // 排序权重（越大越靠前）
  status: String,                 // 'active' | 'archived'
  created_by: String,             // 创建者 user_id（管理员）
  created_at: Date,
  updated_at: Date
}
// 索引: status, sort_order(desc), created_at(desc)
```

> **点赞记录**：复用已有的 `favorites` 集合，`item_type` 设为 `'post_like'` 或 `'comment_like'`，利用 `user_id + item_id + item_type` 唯一索引防重复。

## 数据权限模型

- **数据隔离**：所有记录通过 `user_id` 字段实现用户级数据隔离
- **所有权校验**：云函数中查询/修改前校验 `user_id` 匹配
- **基础数据**：departments/experts/schedules 等为公共只读数据
- **管理员权限**：月度统计（adminStats/adminDetail）无 userId 过滤，返回全量数据

## 云存储路径约定

| 用途 | 路径前缀 | 限制 |
|------|----------|------|
| 发作记录图片 | `seizure-images/` | 最多 5 张 |
| 其他记录图片 | `other-record-images/` | 最多 9 张 |
| 问卷基因报告图片 | `questionnaire-images/` | 最多 5 张 |
| 病历文件 | `medical-files/` | 最多 10 个，单文件 ≤ 20MB |

## 本地存储 Key

| Key | 类型 | 说明 |
|-----|------|------|
| `userInfo` | Object | 完整用户信息 |
| `openid` | String | 用户 OpenID |
| `userRole` | String | 用户角色 |
| `userId` | String | 用户数据库 ID |
| `adminRole` | String | 管理员角色 |
| `medicationRecords` | Array | 调药记录备份（最近 10 条） |
| `epilepsyDiary_seizureRecords` | Array | 发作记录备份 |
| `epilepsyDiary_otherRecords` | Array | 其他记录备份 |
| `favoriteSchedules` | Array | 收藏的议程 ID |
| `questionnaire_draft` | Object | 问卷草稿数据 |
| `lastMonthlyReminder` | String | 上次月度提醒月份 (YYYY-MM) |
| `lastCheckTime` | Number | 最后检查消息时间戳 |
