// 家庭基础信息问卷云函数 - 支持提交、获取、检查、列表、批量导入
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  const { action, data, pageSize = 20, pageIndex = 0, records } = event

  try {
    switch (action) {
      case 'submit':
        return await submitQuestionnaire(event, context)
      case 'get':
        return await getQuestionnaire(context)
      case 'check':
        return await checkSubmitted(context)
      case 'list':
        return await listQuestionnaires(pageSize, pageIndex, context)
      case 'import':
        return await importQuestionnaires(records, context)
      case 'adminStats':
        return await getAdminStats()
      default:
        return { success: false, message: '不支持的操作类型' }
    }
  } catch (error) {
    console.error('问卷操作失败:', error)
    return {
      success: false,
      message: '操作失败: ' + error.message,
      error: error
    }
  }
}

// ==================== 提交/更新问卷 ====================
async function submitQuestionnaire(event, context) {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  if (!openid) {
    return { success: false, message: '获取用户身份失败' }
  }

  const { data, status = 'submitted' } = event
  if (!data) {
    return { success: false, message: '问卷数据不能为空' }
  }

  const currentTime = new Date()
  const userId = event.userId || ''

  // 构建问卷记录
  const questionnaireData = {
    openid,
    user_id: userId,
    status,
    submit_time: status === 'submitted' ? currentTime : null,

    // Step 1: 基本信息
    child_name: data.child_name || '',
    wechat_group_nickname: data.wechat_group_nickname || '',
    child_gender: data.child_gender || '',
    birth_date: data.birth_date || '',
    region: data.region || '',
    parent_name: data.parent_name || '',
    parent_contact: data.parent_contact || '',
    birth_order: data.birth_order || '',

    // Step 2: 孕产信息
    pregnancy_method: data.pregnancy_method || '',
    pregnancy_protection: data.pregnancy_protection || '',
    delivery_method: data.delivery_method || '',
    misdiagnosed_as_cp: data.misdiagnosed_as_cp || '',

    // Step 3: 家庭背景
    mother_education: data.mother_education || '',
    mother_occupation: data.mother_occupation || '',
    father_education: data.father_education || '',
    father_occupation: data.father_occupation || '',
    family_member_resigned: data.family_member_resigned || '',
    monthly_income: data.monthly_income || '',
    treatment_cost: data.treatment_cost || '',
    rehab_cost: data.rehab_cost || '',

    // Step 4: 诊断与症状
    diagnosis_age: data.diagnosis_age || '',
    first_seizure_age: data.first_seizure_age || '',
    other_symptoms: data.other_symptoms || '',
    mobility_method: data.mobility_method || '',
    swallowing_difficulty: data.swallowing_difficulty || '',
    sleep_disorder: data.sleep_disorder || '',
    sleep_restlessness: data.sleep_restlessness || '',
    development_status: data.development_status || '',

    // Step 5: 基因检测
    gene_test_done: data.gene_test_done || '',
    gene_report_images: data.gene_report_images || [],
    mutation_source: data.mutation_source || '',
    mutation_type: data.mutation_type || '',

    // Step 6: 癫痫与治疗
    seizure_control: data.seizure_control || '',
    recent_seizure_type: data.recent_seizure_type || '',
    recent_seizure_duration: data.recent_seizure_duration || '',
    recent_seizure_intensity: data.recent_seizure_intensity || '',
    treatment_methods: data.treatment_methods || '',
    current_medications: data.current_medications || '',
    worsening_medications: data.worsening_medications || '',
    ineffective_medications: data.ineffective_medications || '',

    // Step 7: 药浴与其他
    hot_bath: data.hot_bath || '',
    bath_frequency: data.bath_frequency || '',
    bath_duration: data.bath_duration || '',
    bath_benefits: data.bath_benefits || '',
    treatment_effect_description: data.treatment_effect_description || '',
    volunteer_willingness: data.volunteer_willingness || '',
    resources_skills: data.resources_skills || '',
    referral_source: data.referral_source || '',

    updated_at: currentTime
  }

  // 检查是否已有问卷（upsert 逻辑）
  let existing
  try {
    existing = await db.collection('questionnaires').where({ openid }).get()
  } catch (error) {
    if (error.errCode === -502005 || error.message.includes('collection not exists')) {
      existing = { data: [] }
    } else {
      throw error
    }
  }

  let result
  if (existing.data.length > 0) {
    // 更新已有问卷
    await db.collection('questionnaires').where({ openid }).update({
      data: questionnaireData
    })
    result = { _id: existing.data[0]._id, updated: true }
  } else {
    // 新建问卷
    questionnaireData.created_at = currentTime
    const addResult = await db.collection('questionnaires').add({
      data: questionnaireData
    })
    result = { _id: addResult._id, updated: false }
  }

  // 更新 users 集合的问卷提交标记
  if (status === 'submitted') {
    try {
      await db.collection('users').where({ openid }).update({
        data: { hasQuestionnaireSubmitted: true, updatedAt: currentTime }
      })
    } catch (e) {
      console.warn('更新用户问卷标记失败:', e)
    }
  }

  return {
    success: true,
    message: result.updated ? '问卷更新成功' : '问卷提交成功',
    data: result
  }
}

// ==================== 获取当前用户的问卷 ====================
async function getQuestionnaire(context) {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  if (!openid) {
    return { success: false, message: '获取用户身份失败' }
  }

  try {
    const result = await db.collection('questionnaires').where({ openid }).get()
    if (result.data.length > 0) {
      return { success: true, data: result.data[0] }
    }
    return { success: true, data: null, message: '未找到问卷' }
  } catch (error) {
    if (error.errCode === -502005 || error.message.includes('collection not exists')) {
      return { success: true, data: null, message: '未找到问卷' }
    }
    throw error
  }
}

// ==================== 检查是否已提交问卷 ====================
async function checkSubmitted(context) {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  if (!openid) {
    return { success: false, message: '获取用户身份失败' }
  }

  try {
    const result = await db.collection('questionnaires').where({
      openid,
      status: 'submitted'
    }).count()
    return {
      success: true,
      data: { submitted: result.total > 0 }
    }
  } catch (error) {
    if (error.errCode === -502005 || error.message.includes('collection not exists')) {
      return { success: true, data: { submitted: false } }
    }
    throw error
  }
}

// ==================== 列出所有问卷（管理员） ====================
async function listQuestionnaires(pageSize, pageIndex, context) {
  const skip = pageIndex * pageSize

  const result = await db.collection('questionnaires')
    .orderBy('created_at', 'desc')
    .skip(skip)
    .limit(pageSize)
    .get()

  const countResult = await db.collection('questionnaires').count()

  return {
    success: true,
    data: {
      records: result.data,
      total: countResult.total,
      pageSize,
      pageIndex,
      hasMore: (pageIndex + 1) * pageSize < countResult.total
    }
  }
}

// ==================== 管理员统计分析 ====================
async function getAdminStats() {
  // 1. 分批获取所有已提交的问卷（云数据库单次 get 最多100条）
  let allQuestionnaires = []
  const batchSize = 100
  let batchIndex = 0
  while (true) {
    const batch = await db.collection('questionnaires')
      .where({ status: 'submitted' })
      .skip(batchIndex * batchSize)
      .limit(batchSize)
      .get()
    allQuestionnaires = allQuestionnaires.concat(batch.data)
    if (batch.data.length < batchSize) break
    batchIndex++
  }

  // 2. 获取总用户数
  const totalUsersResult = await db.collection('users').count()
  const totalUsers = totalUsersResult.total

  // 3. 聚合统计
  const questionnaires = allQuestionnaires
  const submittedCount = questionnaires.length

  // 性别分布
  const genderDistribution = {}
  // 地区分布（TOP10）
  const regionDistribution = {}
  // 癫痫控制状态分布
  const seizureControlDistribution = {}
  // 诊断年龄分布
  const diagnosisAgeDistribution = {}

  questionnaires.forEach(q => {
    // 性别
    const gender = q.child_gender || '未知'
    genderDistribution[gender] = (genderDistribution[gender] || 0) + 1

    // 地区（取省份部分）
    if (q.region) {
      const province = q.region.split(' ')[0] || q.region
      regionDistribution[province] = (regionDistribution[province] || 0) + 1
    }

    // 癫痫控制状态
    if (q.seizure_control) {
      seizureControlDistribution[q.seizure_control] = (seizureControlDistribution[q.seizure_control] || 0) + 1
    }

    // 诊断年龄
    if (q.diagnosis_age) {
      diagnosisAgeDistribution[q.diagnosis_age] = (diagnosisAgeDistribution[q.diagnosis_age] || 0) + 1
    }
  })

  // 地区排序取TOP10
  const regionTop10 = Object.entries(regionDistribution)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([region, count]) => ({ region, count }))

  return {
    success: true,
    data: {
      totalUsers,
      submittedCount,
      completionRate: totalUsers > 0 ? Math.round(submittedCount / totalUsers * 100) : 0,
      genderDistribution,
      regionTop10,
      seizureControlDistribution,
      diagnosisAgeDistribution
    }
  }
}

// ==================== 批量导入问卷数据 ====================
async function importQuestionnaires(records, context) {
  if (!records || !Array.isArray(records) || records.length === 0) {
    return { success: false, message: '导入数据不能为空' }
  }

  const currentTime = new Date()
  let successCount = 0
  let skipCount = 0
  let failCount = 0
  const errors = []

  for (let i = 0; i < records.length; i++) {
    const record = records[i]
    try {
      // 用 child_name + parent_contact 作为去重标识（导入数据无 openid）
      const dedupeKey = `${record.child_name || ''}_${record.parent_contact || ''}`
      if (!dedupeKey || dedupeKey === '_') {
        skipCount++
        continue
      }

      // 检查是否已存在相同记录
      const existing = await db.collection('questionnaires').where({
        child_name: record.child_name,
        parent_contact: record.parent_contact
      }).count()

      if (existing.total > 0) {
        skipCount++
        continue
      }

      // 写入记录
      const importData = {
        ...record,
        openid: record.openid || '',
        user_id: record.user_id || '',
        status: 'submitted',
        submit_time: record.submit_time ? new Date(record.submit_time) : currentTime,
        gene_report_images: record.gene_report_images || [],
        created_at: currentTime,
        updated_at: currentTime
      }

      await db.collection('questionnaires').add({ data: importData })
      successCount++
    } catch (error) {
      failCount++
      errors.push({ index: i, name: record.child_name || '未知', error: error.message })
    }
  }

  return {
    success: true,
    message: `导入完成：成功 ${successCount} 条，跳过 ${skipCount} 条，失败 ${failCount} 条`,
    data: { successCount, skipCount, failCount, errors: errors.slice(0, 10) }
  }
}
