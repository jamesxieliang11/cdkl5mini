/**
 * AI 服务工具模块
 * 基于腾讯云开发 AI 能力（wx.cloud.extend.AI）封装
 * 提供基因报告解读、病历生成、调药建议、知识问答等场景的 AI 对话能力
 */

const { listMedicationRecords, listSeizureRecords, listOtherRecords, listMonthlyReports, getMyBoundQuestionnaires } = require('./database.js')
const { MILESTONE_LABELS } = require('./milestone-config.js')

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

  medical_record: `你是一名资深儿童神经科医生的助手。请根据以下患者数据生成一份精简的门诊病历摘要，直接呈现数据事实，不做评估和建议。

## 输出要求
- 总字数控制在400-600字
- 严格按照以下格式分段输出，不要增加额外章节
- 医生最关注的信息前置：发作频率、发作类型、当前用药
- 使用专业医学术语，数据用具体数字
- 不要输出"评估与建议"、"注意事项"等主观判断内容
- 只呈现客观数据和事实

## 输出格式

### 患者信息
姓名/性别/年龄/体重（一行）

### 主诉
1-2句概括（如：CDKL5基因突变相关癫痫，近X月发作Y次/月，现服Z种抗癫痫药物）

### 现病史
- 首次发作年龄：XX
- 癫痫发作：近N月月均发作X次，主要类型为XX，典型持续X分钟，趋势为（增加/减少/稳定）
- 当前用药（表格）：
| 药物 | 剂量 | 频次 |
- 近期调药：XX

### 既往史
基因检测结果 / 基因突变类型 / 伴随症状（简要）`,

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

const AI_MODEL = 'hunyuan-exp'

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
    const model = wx.cloud.extend.AI.createModel(AI_MODEL)

    const allMessages = [
      { role: 'system', content: systemPrompt },
      ...messages
    ]

    const response = await model.streamText({
      data: {
        model: AI_MODEL,
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

// ==================== 数据预处理辅助函数 ====================

/**
 * 汇总发作统计
 * @param {Array} records 发作记录列表
 * @param {number} days 统计天数
 * @returns {Object} 统计摘要
 */
function summarizeSeizureStats(records, days) {
  if (!records || records.length === 0) {
    return { summary: `近${days}天内暂无发作记录`, total: 0 }
  }

  const total = records.length
  const months = Math.max(days / 30, 1)
  const monthlyAvg = (total / months).toFixed(1)

  // 类型分布（百分比）
  const typeCount = {}
  let totalDuration = 0
  let durationCount = 0
  records.forEach(record => {
    const seizureType = record.seizure_type || '未知类型'
    typeCount[seizureType] = (typeCount[seizureType] || 0) + 1
    const dur = parseFloat(record.duration)
    if (!isNaN(dur) && dur > 0) {
      totalDuration += dur
      durationCount++
    }
  })

  const typeDistribution = Object.entries(typeCount)
    .sort((a, b) => b[1] - a[1])
    .map(([type, count]) => `${type} ${Math.round(count / total * 100)}%`)
    .join('，')

  const avgDuration = durationCount > 0 ? (totalDuration / durationCount).toFixed(1) : '未知'

  // 趋势分析：对比前半期和后半期的频率
  const midIndex = Math.floor(records.length / 2)
  // 记录按时间排序（假设已排序，最新在前）
  const sortedRecords = [...records].sort((a, b) =>
    new Date(b.record_time).getTime() - new Date(a.record_time).getTime()
  )
  const recentHalf = sortedRecords.slice(0, midIndex).length
  const earlierHalf = sortedRecords.slice(midIndex).length
  let trend = '稳定'
  if (total >= 4) {
    const ratio = recentHalf / Math.max(earlierHalf, 1)
    if (ratio > 1.3) trend = '增加'
    else if (ratio < 0.7) trend = '减少'
  }

  const summary = `发作统计（近${days}天）：
- 总计${total}次，月均${monthlyAvg}次
- 类型分布：${typeDistribution}
- 平均持续时间：${avgDuration}分钟
- 趋势：${trend}`

  return { summary, total, monthlyAvg, typeDistribution, avgDuration, trend }
}

/**
 * 汇总当前用药方案
 * @param {Array} medRecords 用药记录
 * @param {Array} monthlyReports 月度汇报（可为空）
 * @returns {Object} 用药摘要
 */
function summarizeCurrentMedications(medRecords, monthlyReports) {
  // 优先从最新月度汇报中提取用药方案（数据更结构化）
  let medications = []
  let recentChanges = '无近期调药记录'

  if (monthlyReports && monthlyReports.length > 0) {
    // 按月份降序，取最新的
    const sorted = [...monthlyReports].sort((a, b) =>
      (b.report_month || '').localeCompare(a.report_month || '')
    )
    const latest = sorted[0]
    if (latest.medications && latest.medications.length > 0) {
      medications = latest.medications.map(med => ({
        name: med.medication_name || med.name || '未知药物',
        dosage: med.dosage || '',
        unit: med.unit || '',
        frequency: med.frequency || '',
        compliance: med.compliance || '',
        sideEffects: med.side_effects || '',
        dosageChanged: med.dosage_changed || false
      }))
    }

    // 提取近期调药信息
    const changes = []
    sorted.slice(0, 3).forEach(report => {
      if (report.medications) {
        report.medications.forEach(med => {
          if (med.dosage_changed) {
            changes.push(`${report.report_month} ${med.medication_name || med.name}剂量调整`)
          }
        })
      }
    })
    if (changes.length > 0) recentChanges = changes.join('；')
  }

  // 如果月度汇报无数据，从用药记录中提取
  if (medications.length === 0 && medRecords && medRecords.length > 0) {
    const latestRecord = medRecords[0] // 假设按时间降序
    if (latestRecord.medications) {
      medications = latestRecord.medications.map(med => ({
        name: med.medication_name || '未知药物',
        dosage: med.dosage || '',
        unit: med.unit || '',
        frequency: '',
        compliance: '',
        sideEffects: '',
        dosageChanged: false
      }))
    }
    // 提取副作用
    const sideEffectsSet = new Set()
    medRecords.slice(0, 5).forEach(record => {
      if (record.side_effects) {
        record.side_effects.split(/[,、，]/).forEach(effect => {
          const trimmed = effect.trim()
          if (trimmed && trimmed !== '无副作用') sideEffectsSet.add(trimmed)
        })
      }
    })
    if (sideEffectsSet.size > 0) {
      medications.forEach(med => {
        if (!med.sideEffects) med.sideEffects = Array.from(sideEffectsSet).join('、')
      })
    }
  }

  if (medications.length === 0) {
    return { summary: '暂无用药记录', recentChanges, medications: [] }
  }

  // 生成表格格式摘要
  const complianceMap = { good: '好', fair: '一般', poor: '差' }
  let table = '当前用药方案：\n| 药物 | 剂量 | 频次 | 依从性 | 副作用 |\n'
  medications.forEach(med => {
    const compliance = complianceMap[med.compliance] || med.compliance || '-'
    table += `| ${med.name} | ${med.dosage}${med.unit} | ${med.frequency || '-'} | ${compliance} | ${med.sideEffects || '无'} |\n`
  })
  table += `\n近期调药：${recentChanges}`

  return { summary: table, recentChanges, medications }
}

/**
 * 汇总发育里程碑
 * @param {Array} monthlyReports 月度汇报列表
 * @returns {string} 里程碑摘要
 */
function summarizeMilestones(monthlyReports) {
  if (!monthlyReports || monthlyReports.length === 0) {
    return '暂无里程碑数据'
  }

  // 按月份降序排列
  const sorted = [...monthlyReports].sort((a, b) =>
    (b.report_month || '').localeCompare(a.report_month || '')
  )

  const latest = sorted[0]
  const milestones = latest.milestones || {}
  const checkedItems = milestones.checked_items || []
  const newAchievements = milestones.new_achievements || ''

  // 将 ID 转换为中文标签
  const checkedLabels = checkedItems
    .map(id => MILESTONE_LABELS[id] || id)
    .join('、')

  // 对比前后两期，找出新增里程碑
  let newMilestones = ''
  if (sorted.length >= 2) {
    const previous = sorted[1]
    const prevChecked = (previous.milestones?.checked_items) || []
    const newItems = checkedItems.filter(id => !prevChecked.includes(id))
    if (newItems.length > 0) {
      newMilestones = newItems.map(id => MILESTONE_LABELS[id] || id).join('、')
    }
  }

  let summary = `发育里程碑：${checkedLabels || '暂无已达里程碑'}`
  if (newMilestones) {
    summary += `\n近期新进展：${newMilestones}`
  } else if (newAchievements) {
    summary += `\n近期新进展：${newAchievements}`
  } else {
    summary += `\n近期新进展：暂无新进展`
  }

  if (milestones.concerns) {
    summary += `\n关注事项：${milestones.concerns}`
  }

  return summary
}

// ==================== 上下文数据构建 ====================

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
 * 获取宝宝基本信息（合并用户 profile + 绑定问卷数据）
 */
async function fetchBabyInfo() {
  try {
    // 并行获取用户 profile 和绑定问卷
    const [profileResult, questionnaireResult] = await Promise.all([
      wx.cloud.callFunction({ name: 'getUserProfile', data: {} }).catch(() => null),
      getMyBoundQuestionnaires().catch(() => ({ success: false }))
    ])

    const patientInfo = profileResult?.result?.data?.patientInfo || {}
    // 取第一个绑定问卷作为数据补充来源
    const boundList = (questionnaireResult?.success && questionnaireResult?.data) || []
    const questionnaire = boundList.length > 0 ? boundList[0] : {}

    const parts = []

    // 基本信息：优先用 profile，问卷兜底
    const babyName = patientInfo.babyName || questionnaire.child_name
    if (babyName) parts.push(`姓名：${babyName}`)

    const gender = patientInfo.gender || questionnaire.child_gender
    if (gender) parts.push(`性别：${gender}`)

    const birthday = patientInfo.babyBirthday || questionnaire.birth_date
    if (birthday) {
      const birthDate = new Date(birthday)
      const now = new Date()
      console.log('[AI] 生日原始值:', birthday, '解析结果:', birthDate.toISOString(), '当前时间:', now.toISOString())
      const ageInMonths = (now.getFullYear() - birthDate.getFullYear()) * 12 + (now.getMonth() - birthDate.getMonth())
      const ageText = ageInMonths < 12
        ? `${ageInMonths}个月`
        : `${Math.floor(ageInMonths / 12)}岁${ageInMonths % 12 > 0 ? ageInMonths % 12 + '个月' : ''}`
      parts.push(`出生日期：${birthDate.getFullYear()}年${birthDate.getMonth() + 1}月${birthDate.getDate()}日`)
      parts.push(`年龄：${ageText}（截至${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日计算，此为准确年龄，请直接使用）`)
      console.log('[AI] 计算年龄:', ageText)
    }

    if (patientInfo.weight) parts.push(`体重：${patientInfo.weight}kg`)

    // 从问卷获取医学关键信息
    if (questionnaire.first_seizure_age) parts.push(`首次发作年龄：${questionnaire.first_seizure_age}`)
    if (questionnaire.diagnosis_age) parts.push(`确诊年龄：${questionnaire.diagnosis_age}`)
    if (questionnaire.mutation_type) parts.push(`基因突变类型：${questionnaire.mutation_type}`)
    if (questionnaire.mutation_source) parts.push(`突变来源：${questionnaire.mutation_source}`)
    if (questionnaire.seizure_control) parts.push(`癫痫控制状态：${questionnaire.seizure_control}`)
    if (questionnaire.recent_seizure_type) parts.push(`近期发作类型：${questionnaire.recent_seizure_type}`)
    if (questionnaire.recent_seizure_intensity) parts.push(`发作强度：${questionnaire.recent_seizure_intensity}`)
    if (questionnaire.current_medications) parts.push(`当前用药：${questionnaire.current_medications}`)
    if (questionnaire.treatment_methods) parts.push(`治疗方式：${questionnaire.treatment_methods}`)
    if (questionnaire.other_symptoms) parts.push(`伴随症状：${questionnaire.other_symptoms}`)
    if (questionnaire.development_status) parts.push(`发育状态：${questionnaire.development_status}`)
    if (questionnaire.mobility_method) parts.push(`移动方式：${questionnaire.mobility_method}`)

    if (patientInfo.medicalHistory) parts.push(`补充病史：${patientInfo.medicalHistory}`)

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
  // 并行获取所有数据源（新增月度汇报）
  const [babyInfoResult, seizureResult, medicationResult, otherSummary, monthlyReportResult] = await Promise.all([
    fetchBabyInfo(),
    listSeizureRecords(200, 0).catch(() => ({ success: false })),
    listMedicationRecords(200, 0).catch(() => ({ success: false })),
    fetchOtherRecordsSummary(days),
    listMonthlyReports(10, 0).catch(() => ({ success: false }))
  ])

  // 过滤时间范围内的发作记录
  const cutoffTime = Date.now() - days * 24 * 60 * 60 * 1000
  const allSeizureRecords = (seizureResult.success && seizureResult.data?.records) || []
  const recentSeizureRecords = allSeizureRecords.filter(
    record => new Date(record.record_time).getTime() >= cutoffTime
  )

  // 过滤时间范围内的用药记录
  const allMedRecords = (medicationResult.success && medicationResult.data?.records) || []
  const recentMedRecords = allMedRecords.filter(
    record => new Date(record.record_time).getTime() >= cutoffTime
  )

  // 获取最近3个月的月度汇报
  const monthlyReports = (monthlyReportResult.success && monthlyReportResult.data?.records) || []
  const recentMonthlyReports = monthlyReports.slice(0, 3)

  // 使用辅助函数预处理数据
  const seizureStats = summarizeSeizureStats(recentSeizureRecords, days)
  const medSummary = summarizeCurrentMedications(recentMedRecords, recentMonthlyReports)
  const milestonesSummary = summarizeMilestones(recentMonthlyReports)

  // 构建统计摘要+关键数据表格格式的上下文
  return `请根据以下患者数据生成一份简洁的门诊病历摘要：

=== 患者数据 ===
基本信息：${babyInfoResult}

${seizureStats.summary}

${medSummary.summary}

${milestonesSummary}

【其他记录】
${otherSummary}`
}

/**
 * 构建调药建议的完整上下文
 */
async function buildDrugAdjustmentContext() {
  const days = 90

  const [babyInfoResult, seizureResult, medicationResult, monthlyReportResult] = await Promise.all([
    fetchBabyInfo(),
    listSeizureRecords(200, 0).catch(() => ({ success: false })),
    listMedicationRecords(200, 0).catch(() => ({ success: false })),
    listMonthlyReports(10, 0).catch(() => ({ success: false }))
  ])

  const cutoffTime = Date.now() - days * 24 * 60 * 60 * 1000

  const allSeizureRecords = (seizureResult.success && seizureResult.data?.records) || []
  const recentSeizureRecords = allSeizureRecords.filter(
    record => new Date(record.record_time).getTime() >= cutoffTime
  )

  const allMedRecords = (medicationResult.success && medicationResult.data?.records) || []
  const recentMedRecords = allMedRecords.filter(
    record => new Date(record.record_time).getTime() >= cutoffTime
  )

  const monthlyReports = (monthlyReportResult.success && monthlyReportResult.data?.records) || []
  const recentMonthlyReports = monthlyReports.slice(0, 3)

  const seizureStats = summarizeSeizureStats(recentSeizureRecords, days)
  const medSummary = summarizeCurrentMedications(recentMedRecords, recentMonthlyReports)

  return `以下是患儿的当前情况，请基于这些信息提供调药思路参考：

【患儿基本信息】
${babyInfoResult}

【近3个月发作情况】
${seizureStats.summary}

【近3个月用药情况】
${medSummary.summary}

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
  streamChat,
  getSceneConfig,
  getSystemPrompt,
  getDisclaimer,
  buildMedicalRecordContext,
  buildDrugAdjustmentContext,
  parseTimeRangeToDays
}
