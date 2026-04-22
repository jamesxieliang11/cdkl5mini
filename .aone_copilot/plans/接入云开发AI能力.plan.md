### 接入云开发AI能力 ###
基于腾讯云开发 AI 能力（wx.cloud.extend.AI），为希舞之家小程序新增 AI 智能助手模块，包含基因报告解读、AI 生成病历、AI 调药建议、CDKL5 知识问答等功能，通过统一的 AI 对话页面承载所有 AI 能力。


## 整体方案

采用**统一 AI 对话页面 + 多场景入口**的架构设计。创建一个通用的 AI 对话页面 `pages/ai-assistant/index`，通过不同的场景参数（scene）加载不同的系统提示词和上下文数据，实现多种 AI 功能复用同一套对话 UI。

使用云开发 AI 的 `wx.cloud.extend.AI.createModel()` 直接调用大模型（hunyuan），无需额外部署 Agent，降低接入成本。

---

## 功能清单

### 1. AI 基因报告解读
- 用户上传基因检测报告图片（或手动输入关键信息）
- AI 分析报告内容，解读 CDKL5 基因突变位点、变异类型、致病性判断
- 输出结构化的解读结果：突变位点、变异类型、致病性评级、相关文献参考
- **重要提示**：结果仅供参考，不作为医学诊断依据

### 2. AI 生成病历
- 自动汇总用户已有的发作记录、用药记录、其他记录、月度汇报等数据
- AI 根据汇总数据生成标准化病历文档
- 支持选择时间范围（最近1个月/3个月/6个月/1年）
- 生成的病历可复制、分享，方便就医时使用

### 3. AI 调药建议（仅供参考）
- 基于当前用药方案、发作频率、副作用等信息
- AI 提供调药思路和建议（明确标注仅供参考，需遵医嘱）
- 支持追问和多轮对话

### 4. CDKL5 知识问答
- 关于 CDKL5 综合征的通用知识问答
- 康复训练建议、日常护理指导
- 最新研究进展咨询

---

## 技术方案

### 核心调用方式

```javascript
// 创建模型实例
const model = wx.cloud.extend.AI.createModel("hunyuan-exp")

// 流式调用
const res = await model.streamText({
  data: {
    model: "hunyuan-turbos-latest",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userInput }
    ]
  }
})

// 流式接收
for await (let str of res.textStream) {
  // 逐步更新页面显示
}
```

### 文件结构

```
base/
├── pages/
│   └── ai-assistant/
│       ├── index.js        # AI 对话页面逻辑
│       ├── index.wxml      # AI 对话页面模板
│       ├── index.wxss      # AI 对话页面样式
│       └── index.json      # 页面配置
├── utils/
│   └── ai-service.js       # AI 服务封装（模型调用、提示词管理、上下文构建）
```

---

## 详细实施步骤

### 步骤 1：创建 AI 服务工具模块 `base/utils/ai-service.js`

封装以下能力：
- `createAIModel()` - 创建模型实例
- `streamChat(systemPrompt, messages, onChunk)` - 流式对话封装
- `getSystemPrompt(scene)` - 根据场景获取系统提示词
- `buildGeneReportPrompt(reportText)` - 构建基因报告解读提示词
- `buildMedicalRecordPrompt(records)` - 构建病历生成提示词（自动从数据库拉取记录）
- `buildDrugAdjustmentPrompt(medications, seizures)` - 构建调药建议提示词
- `buildKnowledgeQAPrompt()` - 构建知识问答提示词

**系统提示词设计要点**：
- 基因报告解读：角色设定为遗传学顾问，专注 CDKL5 基因，输出结构化解读
- 病历生成：角色设定为病历整理助手，按标准病历格式输出
- 调药建议：角色设定为药学参考助手，每次回复必须附带"仅供参考，请遵医嘱"声明
- 知识问答：角色设定为 CDKL5 综合征科普顾问

### 步骤 2：创建 AI 对话页面 `base/pages/ai-assistant/`

**页面参数**：
- `scene`：场景类型（gene_report / medical_record / drug_adjustment / knowledge_qa）
- `timeRange`：时间范围（用于病历生成，可选）

**UI 设计**：
- 顶部导航栏：显示当前 AI 功能名称 + 返回按钮
- 场景引导区：根据不同场景显示不同的引导卡片
  - 基因报告：显示"上传报告图片"或"输入报告信息"按钮
  - 病历生成：显示时间范围选择器 + "开始生成"按钮
  - 调药建议：显示当前用药概要 + 输入框
  - 知识问答：显示常见问题快捷入口
- 对话消息区：聊天气泡样式，支持 Markdown 渲染（加粗、列表等）
- 底部输入区：文本输入框 + 发送按钮
- 免责声明：页面底部固定显示"AI 回复仅供参考，不构成医学建议"

**核心交互逻辑**：
- 流式输出：AI 回复逐字显示，提升体验
- 多轮对话：维护 messages 数组，支持上下文连续对话
- 加载状态：AI 思考时显示动画
- 错误处理：网络异常、模型调用失败的友好提示
- 图片上传：基因报告场景支持拍照/相册选择图片

### 步骤 3：注册页面路由

修改 `base/app.json`，在 pages 数组中添加：
```json
"pages/ai-assistant/index"
```

### 步骤 4：在首页添加 AI 功能入口

修改 `base/pages/home/index.wxml` 和 `base/pages/home/index.js`：

在"常用功能"网格区域添加"AI 助手"入口，点击后弹出功能选择面板（ActionSheet），包含：
- AI 解读基因报告
- AI 生成病历
- AI 调药建议（仅供参考）
- CDKL5 知识问答

同时在"病友服务"区域也添加 AI 相关入口。

### 步骤 5：在报告页面添加 AI 入口

修改 `base/pages/reports/index.wxml` 和 `base/pages/reports/index.js`：
- 在报告页面顶部添加"AI 生成病历"快捷按钮
- 点击后携带当前时间范围跳转到 AI 对话页面

### 步骤 6：在用药记录页面添加 AI 入口

修改 `base/pages/medication-record/index.wxml`：
- 在页面底部添加"AI 调药建议"浮动按钮
- 点击后携带当前用药信息跳转到 AI 对话页面

---

## 安全与合规

1. **免责声明**：所有 AI 功能页面必须显示"AI 生成内容仅供参考，不构成医学诊断或治疗建议，请遵医嘱"
2. **数据隐私**：基因报告图片仅用于当次分析，不做持久化存储（除非用户主动保存）
3. **调药建议**：每次回复强制附带风险提示，避免用户自行调药
4. **内容审核**：利用云开发 AI 内置的内容安全能力，过滤不当内容

---

## 任务清单

- [ ] 1. 创建 `base/utils/ai-service.js` AI 服务工具模块
- [ ] 2. 创建 `base/pages/ai-assistant/index.json` 页面配置
- [ ] 3. 创建 `base/pages/ai-assistant/index.wxml` 对话页面模板
- [ ] 4. 创建 `base/pages/ai-assistant/index.wxss` 对话页面样式
- [ ] 5. 创建 `base/pages/ai-assistant/index.js` 对话页面逻辑
- [ ] 6. 修改 `base/app.json` 注册 AI 助手页面路由
- [ ] 7. 修改 `base/pages/home/index.wxml` 和 `base/pages/home/index.js` 添加 AI 功能入口
- [ ] 8. 修改 `base/pages/reports/index.wxml` 添加 AI 生成病历入口
- [ ] 9. 修改 `base/pages/home/index.wxss` 添加 AI 入口相关样式


updateAtTime: 2026/3/30 16:20:10

planId: 1cb35757-69df-4db7-84eb-cfcc94f47ee9