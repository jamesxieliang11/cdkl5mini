/**
 * AI 服务工具模块
 * 基于腾讯云开发 AI 能力（wx.cloud.extend.AI）封装
 * 提供基因报告解读、病历生成、调药建议、知识问答等场景的 AI 对话能力
 */

const { listMedicationRecords, listSeizureRecords, listOtherRecords, listMonthlyReports } = require('./database.js')

// ==================== 场景配置 ====================

const SCENE_CONFIG = {
  gene_report: {
    title: 'AI 基因报告解读',
    icon: '🧬',
    description: '上传或输入基因检测报告信息，AI 将帮您解读 CDKL5 基因突变位点、变异类型及致病性分析',
    quickQuestions: [
      '什么是 CDKL5 基因突变？',
      'CDKL5 常见的突变类型有哪些？',
      '如何看懂基因检测报告？',
      '致病性变异和意义未明变异有什么区别？'
    ]
  },
  medical_record: {
    title: 'AI 生成病历',
    icon: '📋',
    description: '基于您的发作记录、用药记录等数据，AI 将自动生成标准化病历摘要，方便就医使用',
    quickQuestions: [
      '生成最近1个月的病历摘要',
      '生成最近3个月的病历摘要',
      '生成最近半年的病历摘要',
      '生成最近1年的完整病历'
    ]
  },
  drug_adjustment: {
    title: 'AI 调药参考',
    icon: '💊',
    description: '基于当前用药方案和发作情况，AI 提供调药思路参考（仅供参考，请遵医嘱）',
    quickQuestions: [
      '当前用药方案是否合理？',
      '发作频率增加，是否需要调药？',
      'CDKL5 常用的抗癫痫药物有哪些？',
      '药物副作用太大怎么办？'
    ]
  },
  knowledge_qa: {
    title: 'CDKL5 知识问答',
    icon: '💡',
    description: '关于 CDKL5 综合征的科普知识、康复训练、日常护理等问题，AI 为您解答',
    quickQuestions: [
      'CDKL5 综合征的主要症状有哪些？',
      '有哪些康复训练方法推荐？',
      '日常护理需要注意什么？',
      'CDKL5 最新的研究进展有哪些？'
    ]
  }
}

// ==================== 系统提示词 ====================

const SYSTEM_PROMPTS = {
  gene_report: `你是一位专业的遗传学顾问，专注于 CDKL5 基因（Cyclin-Dependent Kinase-Like 5）相关的遗传分析。你的职责是帮助 CDKL5 综合征患儿家庭解读基因检测报告。

你的工作原则：
1. 用通俗易懂的语言解释专业术语，让非医学背景的家长也能理解
2. 重点关注 CDKL5 基因（位于 X 染色体 Xp22.13）的变异信息
3. 对于基因报告的解读，请按以下结构输出：
   - **突变位点**：具体的基因位置和核苷酸变化
   - **变异类型**：错义突变、无义突变、移码突变、剪接位点突变等
   - **致病性评级**：致病性（Pathogenic）、可能致病（Likely Pathogenic）、意义未明（VUS）等
   - **蛋白质影响**：对 CDKL5 蛋白功能的影响分析
   - **遗传模式**：X 连锁显性遗传的特点说明
   - **临床意义**：与 CDKL5 综合征的关联性
4. 如果用户提供的是图片，请尽可能从图片中提取关键信息进行分析
5. 对于不确定的信息，明确告知不确定性，不要编造

⚠️ 重要声明：你的解读仅供参考，不构成医学诊断。建议家长将报告带给专业的遗传学医生进行确认和解读。`,

  medical_record: `你是一位专业的病历整理助手，专门帮助 CDKL5 综合征患儿家庭整理和生成标准化病历摘要。

你的工作原则：
1. 根据提供的发作记录、用药记录、其他记录等数据，生成结构化的病历摘要
2. 病历格式应包含以下部分：
   - **基本信息**：患儿姓名、年龄、体重等
   - **主诉**：主要症状和就诊原因概述
   - **现病史**：按时间线整理发作情况、用药变化等
   - **用药方案**：当前使用的所有抗癫痫药物及剂量
   - **发作情况统计**：发作类型、频率、持续时间等统计
   - **副作用记录**：用药期间出现的副作用
   - **其他重要记录**：康复训练、检查结果等
   - **病情趋势**：整体病情变化趋势分析
3. 语言要专业、简洁，符合医学病历书写规范
4. 对数据进行合理的统计和归纳，突出重要信息
5. 如果数据不完整，标注"信息待补充"而非编造

生成的病历摘要将帮助家长在就医时更高效地与医生沟通。`,

  drug_adjustment: `你是一位药学参考助手，专注于 CDKL5 综合征（CDKL5 缺乏症）的抗癫痫药物治疗参考。

你的工作原则：
1. 基于用户提供的当前用药方案、发作频率、副作用等信息，提供调药思路参考
2. 熟悉 CDKL5 综合征常用的抗癫痫药物，包括但不限于：
   - 丙戊酸钠（VPA）
   - 氯巴占（CLB）
   - 左乙拉西坦（LEV）
   - 拉莫三嗪（LTG）
   - 托吡酯（TPM）
   - 唑尼沙胺（ZNS）
   - 氯硝西泮（CZP）
   - 大麻二酚（CBD）- Epidiolex
   - 芬氟拉明（FFA）- Fintepla
   - 加奈索酮（GNX）- Ztalmy（FDA 批准用于 CDKL5）
3. 了解药物之间的相互作用和配伍禁忌
4. 考虑患儿年龄、体重对药物剂量的影响
5. 关注药物副作用和耐受性

⚠️ 极其重要的声明（每次回复必须包含）：
以上内容仅供参考，不构成任何医疗建议或处方。任何药物的调整都必须在专业医生的指导下进行。请勿自行调药，务必遵医嘱。`,

  knowledge_qa: `你是一位 CDKL5 综合征（CDKL5 Deficiency Disorder, CDD）的科普顾问，致力于帮助 CDKL5 患儿家庭了解疾病知识、康复方法和日常护理。

你的知识范围：
1. **疾病基础**：CDKL5 综合征的病因、发病机制、遗传模式（X 连锁）、流行病学
2. **临床表现**：早发性癫痫发作（通常在出生后数周至数月内）、发育迟缓、运动障碍、视觉障碍、手部刻板动作等
3. **诊断方法**：基因检测、脑电图（EEG）、MRI 等
4. **治疗方案**：抗癫痫药物治疗、生酮饮食、迷走神经刺激（VNS）等
5. **康复训练**：物理治疗（PT）、作业治疗（OT）、言语治疗（ST）、视觉训练等
6. **日常护理**：喂养指导、睡眠管理、安全防护、情绪安抚等
7. **研究进展**：基因治疗研究、新药临床试验（如加奈索酮 Ztalmy）、国际 CDKL5 研究联盟动态
8. **家庭支持**：心理疏导、社会资源、病友社群等

你的沟通风格：
- 温暖、有同理心，理解家长的焦虑和不安
- 用通俗易懂的语言解释专业知识
- 提供实用的、可操作的建议
- 对于不确定的信息，诚实告知并建议咨询专业医生
- 传递积极正面的信息，给予家长信心和希望`
}

// ==================== 免责声明 ====================

const DISCLAIMER = '⚠️ 以上内容由 AI 生成，仅供参考，不构成医学诊断或治疗建议。如有疑问请咨询专业医生。'

const DRUG_DISCLAIMER = '⚠️ 以上调药参考信息仅供学习交流，不构成任何医疗建议或处方。任何药物调整都必须在专业医生指导下进行，请勿自行调药，务必遵医嘱！'

// ==================== 核心 AI 服务函数 ====================

/**
 * 创建 AI 模型实例
 */
function createAIModel() {
  return wx.cloud.extend.AI.createModel('hunyuan-exp')
}

/**
 * 流式对话调用
 * @param {string} systemPrompt - 系统提示词
 * @param {Array} messages - 对话消息列表 [{role, content}]
 * @param {Function} onChunk - 每次收到文本片段的回调 (chunkText, fullText) => void
 * @param {Function} onComplete - 完成回调 (fullText) => void
 * @param {Function} onError - 错误回调 (error) => void
 */
async function streamChat(systemPrompt, messages, onChunk, onComplete, onError) {
  try {
    const model = createAIModel()

    const allMessages = [
      { role: 'system', content: systemPrompt },
      ...messages
    ]

    const response = await model.streamText({
      data: {
        model: 'hunyuan-turbos-latest',
        messages: allMessages
      }
    })

    let fullText = ''
    for await (let chunk of response.textStream) {
      fullText += chunk
      if (onChunk) {
        onChunk(chunk, fullText)
      }
    }

    if (onComplete) {
      onComplete(fullText)
    }

    return fullText
  } catch (error) {
    console.error('AI 对话调用失败:', error)
    if (onError) {
      onError(error)
    }
    throw error
  }
}

// ==================== 上下文数据构建 ====================

/**
 * 获取用户的发作记录摘要
 * @param {number} days - 获取最近多少天的记录
 */
async function fetchSeizureSummary(days = 30) {
  try {
    const result = await listSeizureRecords(200, 0)
    if (!result.success || !result.data.records) return '暂无发作记录'

    const cutoffTime = Date.now() - days * 24 * 60 * 60 * 1000
    const recentRecords = result.data.records.filter(
      record => new Date(record.record_time).getTime() >= cutoffTime
    )

    if (recentRecords.length === 0) return `最近${days}天内暂无发作记录`

    const typeCount = {}
    let totalDuration = 0
    recentRecords.forEach(record => {
      const seizureType = record.seizure_type || '未知类型'
      typeCount[seizureType] = (typeCount[seizureType] || 0) + 1
      totalDuration += parseFloat(record.duration) || 0
    })

    const typeDistribution = Object.entries(typeCount)
      .map(([type, count]) => `${type}: ${count}次`)
      .join('、')

    return `最近${days}天发作记录：共${recentRecords.length}次发作。` +
      `类型分布：${typeDistribution}。` +
      `平均每次持续${(totalDuration / recentRecords.length).toFixed(1)}分钟。` +
      `详细记录：\n${recentRecords.map(record =>
        `- ${new Date(record.record_time).toLocaleDateString('zh-CN')} ${record.seizure_type || '未知类型'}发作，持续${record.duration || '未知'}分钟` +
        (record.triggers ? `，诱因：${record.triggers}` : '') +
        (record.symptoms ? `，症状：${record.symptoms}` : '')
      ).join('\n')}`
  } catch (error) {
    console.error('获取发作记录摘要失败:', error)
    return '获取发作记录失败'
  }
}

/**
 * 获取用户的用药记录摘要
 * @param {number} days - 获取最近多少天的记录
 */
async function fetchMedicationSummary(days = 30) {
  try {
    const result = await listMedicationRecords(200, 0)
    if (!result.success || !result.data.records) return '暂无用药记录'

    const cutoffTime = Date.now() - days * 24 * 60 * 60 * 1000
    const recentRecords = result.data.records.filter(
      record => new Date(record.record_time).getTime() >= cutoffTime
    )

    if (recentRecords.length === 0) return `最近${days}天内暂无用药记录`

    const medicationMap = {}
    const sideEffectsSet = new Set()

    recentRecords.forEach(record => {
      if (record.medications) {
        record.medications.forEach(med => {
          const medName = med.medication_name || '未知药物'
          if (!medicationMap[medName]) {
            medicationMap[medName] = { dosages: [], unit: med.unit || '' }
          }
          medicationMap[medName].dosages.push(parseFloat(med.dosage) || 0)
        })
      }
      if (record.side_effects) {
        record.side_effects.split(/[,、，]/).forEach(effect => {
          const trimmed = effect.trim()
          if (trimmed && trimmed !== '无副作用') sideEffectsSet.add(trimmed)
        })
      }
    })

    const medicationSummary = Object.entries(medicationMap).map(([name, info]) => {
      const latestDosage = info.dosages[info.dosages.length - 1]
      return `${name} ${latestDosage}${info.unit}`
    }).join('、')

    const sideEffects = sideEffectsSet.size > 0
      ? `副作用：${Array.from(sideEffectsSet).join('、')}`
      : '暂无明显副作用'

    return `最近${days}天用药记录：共${recentRecords.length}条记录。` +
      `当前用药方案：${medicationSummary}。${sideEffects}。` +
      `详细记录：\n${recentRecords.slice(0, 10).map(record =>
        `- ${new Date(record.record_time).toLocaleDateString('zh-CN')} ` +
        (record.medications || []).map(m => `${m.medication_name} ${m.dosage}${m.unit}`).join(' + ') +
        (record.side_effects ? ` | 副作用：${record.side_effects}` : '')
      ).join('\n')}`
  } catch (error) {
    console.error('获取用药记录摘要失败:', error)
    return '获取用药记录失败'
  }
}

/**
 * 获取用户的其他记录摘要
 * @param {number} days - 获取最近多少天的记录
 */
async function fetchOtherRecordsSummary(days = 30) {
  try {
    const result = await listOtherRecords(100, 0)
    if (!result.success || !result.data.records) return '暂无其他记录'

    const cutoffTime = Date.now() - days * 24 * 60 * 60 * 1000
    const recentRecords = result.data.records.filter(
      record => new Date(record.record_time).getTime() >= cutoffTime
    )

    if (recentRecords.length === 0) return `最近${days}天内暂无其他记录`

    return `最近${days}天其他记录：共${recentRecords.length}条。\n` +
      recentRecords.map(record =>
        `- ${new Date(record.record_time).toLocaleDateString('zh-CN')} [${record.category || '其他'}] ${record.content || '无内容'}`
      ).join('\n')
  } catch (error) {
    console.error('获取其他记录摘要失败:', error)
    return '获取其他记录失败'
  }
}

/**
 * 获取宝宝基本信息
 */
async function fetchBabyInfo() {
  try {
    const result = await wx.cloud.callFunction({
      name: 'getUserProfile',
      data: {}
    })

    const patientInfo = result.result?.data?.patientInfo || {}
    const parts = []

    if (patientInfo.babyName) parts.push(`姓名：${patientInfo.babyName}`)
    if (patientInfo.babyBirthday) {
      const birthDate = new Date(patientInfo.babyBirthday)
      const now = new Date()
      const ageInMonths = (now.getFullYear() - birthDate.getFullYear()) * 12 + (now.getMonth() - birthDate.getMonth())
      const ageText = ageInMonths < 12
        ? `${ageInMonths}个月`
        : `${Math.floor(ageInMonths / 12)}岁${ageInMonths % 12 > 0 ? ageInMonths % 12 + '个月' : ''}`
      parts.push(`年龄：${ageText}`)
      parts.push(`出生日期：${birthDate.toLocaleDateString('zh-CN')}`)
    }
    if (patientInfo.weight) parts.push(`体重：${patientInfo.weight}kg`)
    if (patientInfo.medicalHistory) parts.push(`病史：${patientInfo.medicalHistory}`)

    return parts.length > 0 ? parts.join('，') : '暂无宝宝基本信息'
  } catch (error) {
    console.error('获取宝宝信息失败:', error)
    return '获取宝宝信息失败'
  }
}

/**
 * 构建病历生成的完整上下文
 * @param {number} days - 时间范围（天数）
 */
async function buildMedicalRecordContext(days = 30) {
  const [babyInfo, seizureSummary, medicationSummary, otherSummary] = await Promise.all([
    fetchBabyInfo(),
    fetchSeizureSummary(days),
    fetchMedicationSummary(days),
    fetchOtherRecordsSummary(days)
  ])

  return `请根据以下患儿信息和记录数据，生成一份标准化的病历摘要：

【患儿基本信息】
${babyInfo}

【发作记录】
${seizureSummary}

【用药记录】
${medicationSummary}

【其他记录】
${otherSummary}

请按照标准病历格式生成摘要，包含：基本信息、主诉、现病史、用药方案、发作情况统计、副作用记录、其他重要记录、病情趋势分析。`
}

/**
 * 构建调药建议的完整上下文
 */
async function buildDrugAdjustmentContext() {
  const [babyInfo, seizureSummary, medicationSummary] = await Promise.all([
    fetchBabyInfo(),
    fetchSeizureSummary(90),
    fetchMedicationSummary(90)
  ])

  return `以下是患儿的当前情况，请基于这些信息提供调药思路参考：

【患儿基本信息】
${babyInfo}

【近3个月发作情况】
${seizureSummary}

【近3个月用药情况】
${medicationSummary}

请分析当前用药方案的合理性，并提供调药思路参考。`
}

// ==================== 场景辅助函数 ====================

/**
 * 获取场景配置
 * @param {string} scene - 场景类型
 */
function getSceneConfig(scene) {
  return SCENE_CONFIG[scene] || SCENE_CONFIG.knowledge_qa
}

/**
 * 获取系统提示词
 * @param {string} scene - 场景类型
 */
function getSystemPrompt(scene) {
  return SYSTEM_PROMPTS[scene] || SYSTEM_PROMPTS.knowledge_qa
}

/**
 * 获取免责声明
 * @param {string} scene - 场景类型
 */
function getDisclaimer(scene) {
  return scene === 'drug_adjustment' ? DRUG_DISCLAIMER : DISCLAIMER
}

/**
 * 将时间范围文本转换为天数
 * @param {string} rangeText - 时间范围文本
 */
function parseTimeRangeToDays(rangeText) {
  const rangeMap = {
    '最近1个月': 30,
    '最近3个月': 90,
    '最近半年': 180,
    '最近1年': 365,
    '1': 30,
    '3': 90,
    '6': 180,
    '12': 365
  }
  return rangeMap[rangeText] || 30
}

// ==================== 导出 ====================

module.exports = {
  SCENE_CONFIG,
  DISCLAIMER,
  DRUG_DISCLAIMER,
  createAIModel,
  streamChat,
  getSceneConfig,
  getSystemPrompt,
  getDisclaimer,
  fetchSeizureSummary,
  fetchMedicationSummary,
  fetchOtherRecordsSummary,
  fetchBabyInfo,
  buildMedicalRecordContext,
  buildDrugAdjustmentContext,
  parseTimeRangeToDays
}
