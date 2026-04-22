// 月度汇报云函数 - 支持增删改查及追踪药物管理
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  const { action, data, reportId, month, userId, pageSize = 10, pageIndex = 0 } = event

  try {
    switch (action) {
      case 'create':
        return await createReport(data, userId)
      case 'update':
        return await updateReport(reportId, data, userId)
      case 'get':
        return await getReport(month, userId)
      case 'list':
        return await listReports(userId, pageSize, pageIndex)
      case 'getLastReport':
        return await getLastReport(userId)
      case 'getTrackedMedications':
        return await getTrackedMedications(userId)
      case 'updateTrackedMedications':
        return await updateTrackedMedications(data, userId)
      case 'checkMonthSubmitted':
        return await checkMonthSubmitted(month, userId)
      case 'adminStats':
        return await getAdminStats(month)
      case 'adminDetail':
        return await getAdminDetail(month, pageSize, pageIndex)
      case 'listUsers':
        return await listUsers(pageSize, pageIndex)
      case 'setAdminRole':
        return await setAdminRole(data, userId)
      case 'adminOverview':
        return await getAdminOverview()
      default:
        return { success: false, message: '不支持的操作类型' }
    }
  } catch (error) {
    console.error('月度汇报操作失败:', error)
    return {
      success: false,
      message: '操作失败: ' + error.message,
      error: error
    }
  }
}

// 创建月度汇报
async function createReport(data, userId) {
  if (!data || !data.report_month) {
    return { success: false, message: '缺少汇报月份' }
  }

  // 检查是否已存在该月汇报
  const existing = await db.collection('monthly_reports')
    .where({ user_id: userId, report_month: data.report_month })
    .get()

  if (existing.data.length > 0) {
    // 已存在则转为更新
    return await updateReport(existing.data[0]._id, data, userId)
  }

  const record = {
    user_id: userId,
    report_month: data.report_month,
    medications: data.medications || [],
    seizure_summary: data.seizure_summary || {
      total_count: 0,
      seizure_types: [],
      worst_episode: '',
      triggers_summary: '',
      compared_to_last_month: 'same'
    },
    milestones: data.milestones || {
      checked_items: [],
      new_achievements: '',
      concerns: ''
    },
    status: data.status || 'draft',
    notes: data.notes || '',
    created_at: new Date(),
    updated_at: new Date()
  }

  const result = await db.collection('monthly_reports').add({ data: record })

  // 同步更新追踪药物配置
  if (data.medications && data.medications.length > 0) {
    await syncTrackedMedications(data.medications, userId)
  }

  return {
    success: true,
    message: data.status === 'submitted' ? '月度汇报提交成功' : '草稿保存成功',
    data: { reportId: result._id, ...record }
  }
}

// 更新月度汇报
async function updateReport(reportId, data, userId) {
  if (!reportId) {
    return { success: false, message: '记录ID不能为空' }
  }

  const existing = await db.collection('monthly_reports')
    .where({ _id: reportId, user_id: userId })
    .get()

  if (existing.data.length === 0) {
    return { success: false, message: '记录不存在或无权限修改' }
  }

  const updateData = { updated_at: new Date() }

  if (data.medications !== undefined) updateData.medications = data.medications
  if (data.seizure_summary !== undefined) updateData.seizure_summary = data.seizure_summary
  if (data.milestones !== undefined) updateData.milestones = data.milestones
  if (data.status !== undefined) updateData.status = data.status
  if (data.notes !== undefined) updateData.notes = data.notes

  await db.collection('monthly_reports')
    .where({ _id: reportId, user_id: userId })
    .update({ data: updateData })

  // 同步更新追踪药物配置
  if (data.medications && data.medications.length > 0) {
    await syncTrackedMedications(data.medications, userId)
  }

  return {
    success: true,
    message: data.status === 'submitted' ? '月度汇报提交成功' : '草稿保存成功',
    data: updateData
  }
}

// 获取指定月份的汇报
async function getReport(month, userId) {
  if (!month) {
    return { success: false, message: '月份参数不能为空' }
  }

  const result = await db.collection('monthly_reports')
    .where({ user_id: userId, report_month: month })
    .get()

  if (result.data.length === 0) {
    return { success: true, message: '该月暂无汇报', data: null }
  }

  return { success: true, message: '获取成功', data: result.data[0] }
}

// 获取汇报列表
async function listReports(userId, pageSize, pageIndex) {
  const skip = pageIndex * pageSize

  const result = await db.collection('monthly_reports')
    .where({ user_id: userId })
    .orderBy('report_month', 'desc')
    .skip(skip)
    .limit(pageSize)
    .get()

  const countResult = await db.collection('monthly_reports')
    .where({ user_id: userId })
    .count()

  return {
    success: true,
    message: '获取列表成功',
    data: {
      records: result.data,
      total: countResult.total,
      pageSize,
      pageIndex,
      hasMore: (pageIndex + 1) * pageSize < countResult.total
    }
  }
}

// 获取上月汇报（用于预填充）
async function getLastReport(userId) {
  const now = new Date()
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const lastMonthStr = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, '0')}`

  const result = await db.collection('monthly_reports')
    .where({ user_id: userId, report_month: lastMonthStr })
    .get()

  if (result.data.length === 0) {
    return { success: true, message: '上月暂无汇报', data: null }
  }

  return { success: true, message: '获取上月汇报成功', data: result.data[0] }
}

// 检查指定月份是否已提交
async function checkMonthSubmitted(month, userId) {
  if (!month) {
    const now = new Date()
    month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  }

  const result = await db.collection('monthly_reports')
    .where({ user_id: userId, report_month: month, status: 'submitted' })
    .count()

  return {
    success: true,
    data: { submitted: result.total > 0, month }
  }
}

// 获取用户追踪药物配置
async function getTrackedMedications(userId) {
  const result = await db.collection('tracked_medications')
    .where({ user_id: userId })
    .get()

  if (result.data.length === 0) {
    // 返回默认配置（别嘌醇）
    return {
      success: true,
      message: '使用默认配置',
      data: {
        medications: [
          { name: '别嘌醇', dosage: '', unit: 'mg', frequency: '每日1次', is_default: true }
        ]
      }
    }
  }

  return { success: true, message: '获取成功', data: result.data[0] }
}

// 更新用户追踪药物配置
async function updateTrackedMedications(data, userId) {
  if (!data || !data.medications) {
    return { success: false, message: '药物配置数据不能为空' }
  }

  const existing = await db.collection('tracked_medications')
    .where({ user_id: userId })
    .get()

  if (existing.data.length > 0) {
    await db.collection('tracked_medications')
      .where({ user_id: userId })
      .update({
        data: {
          medications: data.medications,
          updated_at: new Date()
        }
      })
  } else {
    await db.collection('tracked_medications').add({
      data: {
        user_id: userId,
        medications: data.medications,
        updated_at: new Date()
      }
    })
  }

  return { success: true, message: '追踪药物配置更新成功' }
}

// 同步追踪药物配置（从月度汇报中提取）
async function syncTrackedMedications(medications, userId) {
  try {
    const trackedMeds = medications.map(med => ({
      name: med.medication_name,
      dosage: med.dosage,
      unit: med.unit,
      frequency: med.frequency,
      is_default: med.medication_name === '别嘌醇'
    }))

    await updateTrackedMedications({ medications: trackedMeds }, userId)
  } catch (error) {
    console.warn('同步追踪药物配置失败:', error)
  }
}

// ========== 管理员统计功能 ==========

// 获取管理员统计概览
async function getAdminStats(month) {
  if (!month) {
    const now = new Date()
    month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  }

  // 获取该月所有已提交的汇报
  const allReports = await db.collection('monthly_reports')
    .where({ report_month: month, status: 'submitted' })
    .limit(1000)
    .get()

  const reports = allReports.data
  const totalSubmitted = reports.length

  // 获取总注册用户数
  const userCount = await db.collection('users').count()
  const totalUsers = userCount.total

  // 获取草稿数
  const draftCount = await db.collection('monthly_reports')
    .where({ report_month: month, status: 'draft' })
    .count()

  // 用药统计
  const medicationStats = {}
  const complianceStats = { good: 0, fair: 0, poor: 0 }
  let totalDosageChanged = 0
  let totalMedicationEntries = 0

  // 发作统计
  let totalSeizureCount = 0
  const seizureTypeStats = {}
  const comparedStats = { better: 0, same: 0, worse: 0 }

  // 里程碑统计
  const milestoneStats = {}

  reports.forEach(report => {
    // 统计用药
    if (report.medications && report.medications.length > 0) {
      report.medications.forEach(med => {
        const medName = med.medication_name
        if (medName) {
          medicationStats[medName] = (medicationStats[medName] || 0) + 1
          totalMedicationEntries++

          if (med.compliance) {
            complianceStats[med.compliance] = (complianceStats[med.compliance] || 0) + 1
          }
          if (med.dosage_changed) {
            totalDosageChanged++
          }
        }
      })
    }

    // 统计发作
    if (report.seizure_summary) {
      const seizureCount = parseInt(report.seizure_summary.total_count) || 0
      totalSeizureCount += seizureCount

      if (report.seizure_summary.compared_to_last_month) {
        const compared = report.seizure_summary.compared_to_last_month
        comparedStats[compared] = (comparedStats[compared] || 0) + 1
      }

      if (report.seizure_summary.seizure_types) {
        report.seizure_summary.seizure_types.forEach(st => {
          const count = parseInt(st.count) || 0
          if (count > 0) {
            seizureTypeStats[st.type] = (seizureTypeStats[st.type] || 0) + count
          }
        })
      }
    }

    // 统计里程碑
    if (report.milestones && report.milestones.checked_items) {
      report.milestones.checked_items.forEach(itemId => {
        milestoneStats[itemId] = (milestoneStats[itemId] || 0) + 1
      })
    }
  })

  // 转换用药统计为排序数组
  const medicationRanking = Object.entries(medicationStats)
    .map(([name, count]) => ({ name, count, percentage: totalSubmitted > 0 ? Math.round(count / totalSubmitted * 100) : 0 }))
    .sort((a, b) => b.count - a.count)

  // 转换发作类型统计为排序数组
  const seizureTypeRanking = Object.entries(seizureTypeStats)
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count)

  // 转换里程碑统计为排序数组
  const milestoneRanking = Object.entries(milestoneStats)
    .map(([id, count]) => ({ id, count, percentage: totalSubmitted > 0 ? Math.round(count / totalSubmitted * 100) : 0 }))
    .sort((a, b) => b.count - a.count)

  // 计算平均发作次数
  const avgSeizureCount = totalSubmitted > 0 ? Math.round(totalSeizureCount / totalSubmitted * 10) / 10 : 0

  return {
    success: true,
    message: '获取管理员统计成功',
    data: {
      month,
      overview: {
        totalUsers,
        totalSubmitted,
        totalDrafts: draftCount.total,
        submissionRate: totalUsers > 0 ? Math.round(totalSubmitted / totalUsers * 100) : 0
      },
      medication: {
        ranking: medicationRanking,
        compliance: complianceStats,
        totalDosageChanged,
        totalEntries: totalMedicationEntries
      },
      seizure: {
        totalCount: totalSeizureCount,
        avgCount: avgSeizureCount,
        typeRanking: seizureTypeRanking,
        compared: comparedStats
      },
      milestone: {
        ranking: milestoneRanking,
        totalChecked: Object.values(milestoneStats).reduce((sum, count) => sum + count, 0)
      }
    }
  }
}

// 获取管理员详细列表（每个用户的汇报摘要）
async function getAdminDetail(month, pageSize, pageIndex) {
  if (!month) {
    const now = new Date()
    month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  }

  const skip = pageIndex * pageSize

  // 获取该月所有汇报（含草稿）
  const result = await db.collection('monthly_reports')
    .where({ report_month: month })
    .orderBy('updated_at', 'desc')
    .skip(skip)
    .limit(pageSize)
    .get()

  const countResult = await db.collection('monthly_reports')
    .where({ report_month: month })
    .count()

  // 获取用户信息用于关联展示
  const userIds = [...new Set(result.data.map(r => r.user_id))]
  let usersMap = {}

  if (userIds.length > 0) {
    // 分批查询用户信息（云数据库 where in 限制 500）
    const batchSize = 100
    for (let i = 0; i < userIds.length; i += batchSize) {
      const batch = userIds.slice(i, i + batchSize)
      const usersResult = await db.collection('users')
        .where({ _id: _.in(batch) })
        .field({ _id: true, nickName: true, avatarUrl: true, patientName: true, patientInfo: true, openid: true })
        .get()

      usersResult.data.forEach(user => {
        usersMap[user._id] = user
      })
    }
  }

  // 组装详细列表
  const detailList = result.data.map(report => {
    const user = usersMap[report.user_id] || {}
    const seizureCount = parseInt(report.seizure_summary?.total_count) || 0
    const medicationCount = report.medications?.length || 0
    const milestoneCount = report.milestones?.checked_items?.length || 0

    const babyName = user.patientInfo?.babyName || ''
    const displayName = babyName || user.patientName || user.nickName || '用户' + (report.user_id || '').slice(-4)

    return {
      reportId: report._id,
      userId: report.user_id,
      userName: user.patientName || user.nickName || '用户' + (report.user_id || '').slice(-4),
      babyName: babyName,
      status: report.status,
      seizureCount,
      medicationCount,
      milestoneCount,
      medications: (report.medications || []).map(m => m.medication_name).filter(Boolean),
      compared: report.seizure_summary?.compared_to_last_month || '',
      updatedAt: report.updated_at
    }
  })

  return {
    success: true,
    message: '获取详细列表成功',
    data: {
      month,
      records: detailList,
      total: countResult.total,
      pageSize,
      pageIndex,
      hasMore: (pageIndex + 1) * pageSize < countResult.total
    }
  }
}

// ========== 管理员权限管理 ==========

// 获取用户列表（管理员用）
async function listUsers(pageSize, pageIndex) {
  const skip = pageIndex * pageSize

  const result = await db.collection('users')
    .orderBy('lastLoginTime', 'desc')
    .skip(skip)
    .limit(pageSize)
    .field({
      _id: true,
      openid: true,
      nickName: true,
      avatarUrl: true,
      userRole: true,
      adminRole: true,
      patientInfo: true,
      lastLoginTime: true,
      createdAt: true
    })
    .get()

  const countResult = await db.collection('users').count()

  const userList = result.data.map(user => ({
    userId: user._id,
    openid: user.openid,
    nickName: user.nickName || '未知用户',
    avatarUrl: user.avatarUrl || '',
    userRole: user.userRole || 'patient',
    adminRole: user.adminRole || '',
    babyName: user.patientInfo?.babyName || '',
    lastLoginTime: user.lastLoginTime,
    createdAt: user.createdAt
  }))

  return {
    success: true,
    message: '获取用户列表成功',
    data: {
      users: userList,
      total: countResult.total,
      pageSize,
      pageIndex,
      hasMore: (pageIndex + 1) * pageSize < countResult.total
    }
  }
}

// 设置用户管理员角色（仅超管可操作）
async function setAdminRole(data, operatorUserId) {
  if (!data || !data.targetUserId || data.adminRole === undefined) {
    return { success: false, message: '参数不完整' }
  }

  // 校验操作者是否为超管
  const operator = await db.collection('users')
    .where({ _id: operatorUserId })
    .field({ adminRole: true })
    .get()

  if (operator.data.length === 0 || operator.data[0].adminRole !== 'superadmin') {
    return { success: false, message: '权限不足，仅超级管理员可执行此操作' }
  }

  // 不允许修改自己的角色
  if (data.targetUserId === operatorUserId) {
    return { success: false, message: '不能修改自己的管理员角色' }
  }

  // 不允许设置其他超管
  if (data.adminRole === 'superadmin') {
    return { success: false, message: '不能设置其他用户为超级管理员' }
  }

  // 更新目标用户的管理员角色
  const validRoles = ['admin', '']
  if (!validRoles.includes(data.adminRole)) {
    return { success: false, message: '无效的管理员角色' }
  }

  await db.collection('users')
    .where({ _id: data.targetUserId })
    .update({
      data: {
        adminRole: data.adminRole,
        updatedAt: new Date()
      }
    })

  const roleText = data.adminRole === 'admin' ? '管理员' : '普通用户'
  return {
    success: true,
    message: `已将用户设置为${roleText}`
  }
}

// ========== 管理员总览统计 ==========

// 获取管理员总览数据（记录数量、活跃用户、月度趋势）
async function getAdminOverview() {
  // 1. 获取各类型记录总量
  const [seizureCount, medicationCount, otherCount, totalUsers] = await Promise.all([
    db.collection('seizure_records').count(),
    db.collection('medication_records').count(),
    db.collection('other_records').count(),
    db.collection('users').count()
  ])

  // 2. 获取最近6个月的月度汇报统计
  const now = new Date()
  const monthlyTrends = []

  for (let i = 5; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const monthStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`

    const monthReports = await db.collection('monthly_reports')
      .where({ report_month: monthStr, status: 'submitted' })
      .count()

    // 分批获取该月所有已提交汇报的发作数据（云数据库单次 get 最多100条）
    let monthReportsData = []
    const batchSize = 100
    let batchIndex = 0
    while (true) {
      const batch = await db.collection('monthly_reports')
        .where({ report_month: monthStr, status: 'submitted' })
        .field({ seizure_summary: true })
        .skip(batchIndex * batchSize)
        .limit(batchSize)
        .get()
      monthReportsData = monthReportsData.concat(batch.data)
      if (batch.data.length < batchSize) break
      batchIndex++
    }

    // 计算该月发作总次数
    let totalSeizures = 0
    monthReportsData.forEach(report => {
      if (report.seizure_summary && report.seizure_summary.total_count) {
        totalSeizures += parseInt(report.seizure_summary.total_count) || 0
      }
    })

    monthlyTrends.push({
      month: monthStr,
      submittedCount: monthReports.total,
      submissionRate: totalUsers.total > 0 ? Math.round(monthReports.total / totalUsers.total * 100) : 0,
      totalSeizures
    })
  }

  // 3. 获取活跃用户数（最近30天有提交记录的用户）
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  // 用 monthly_reports 最近更新的来近似活跃用户
  let recentReportsData = []
  let recentBatchIndex = 0
  while (true) {
    const batch = await db.collection('monthly_reports')
      .where({
        updated_at: _.gte(thirtyDaysAgo)
      })
      .field({ user_id: true })
      .skip(recentBatchIndex * 100)
      .limit(100)
      .get()
    recentReportsData = recentReportsData.concat(batch.data)
    if (batch.data.length < 100) break
    recentBatchIndex++
  }

  const activeUserIds = new Set(recentReportsData.map(r => r.user_id).filter(Boolean))

  return {
    success: true,
    data: {
      recordCounts: {
        seizure: seizureCount.total,
        medication: medicationCount.total,
        other: otherCount.total,
        total: seizureCount.total + medicationCount.total + otherCount.total
      },
      totalUsers: totalUsers.total,
      activeUsers: activeUserIds.size,
      monthlyTrends
    }
  }
}
