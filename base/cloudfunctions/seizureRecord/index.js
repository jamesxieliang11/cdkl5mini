// 发作记录云函数 - 支持增删改查
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
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
        return {
          success: false,
          message: '不支持的操作类型'
        }
    }
  } catch (error) {
    console.error('发作记录操作失败:', error)
    return {
      success: false,
      message: '操作失败: ' + error.message,
      error: error
    }
  }
}

// 创建发作记录
async function createRecord(data, userId) {
  // 数据验证
  if (!data.datetime || !data.seizureType || !data.duration) {
    return {
      success: false,
      message: '缺少必要的记录信息'
    }
  }

  const record = {
    user_id: userId,
    record_time: new Date(data.datetime),
    seizure_type: data.seizureType,
    duration: parseFloat(data.duration),
    severity: data.severity || '',
    time_of_day: data.timeOfDay || '',
    triggers: data.triggers || '',
    symptoms: data.symptoms || '',
    recovery_time: data.recoveryTime || '',
    notes: data.notes || '',
    images: data.images || [], // 添加图片字段支持
    created_at: new Date(),
    updated_at: new Date()
  }

  const result = await db.collection('seizure_records').add({
    data: record
  })

  return {
    success: true,
    message: '发作记录创建成功',
    data: {
      recordId: result._id,
      ...record
    }
  }
}

// 更新发作记录
async function updateRecord(recordId, data, userId) {
  if (!recordId) {
    return {
      success: false,
      message: '记录ID不能为空'
    }
  }

  // 检查记录是否存在且属于当前用户
  const existingRecord = await db.collection('seizure_records')
    .where({
      _id: recordId,
      user_id: userId
    })
    .get()

  if (existingRecord.data.length === 0) {
    return {
      success: false,
      message: '记录不存在或无权限修改'
    }
  }

  const updateData = {
    updated_at: new Date()
  }

  // 更新字段
  if (data.datetime) {
    updateData.record_time = new Date(data.datetime)
  }
  if (data.seizureType) {
    updateData.seizure_type = data.seizureType
  }
  if (data.duration !== undefined) {
    updateData.duration = parseFloat(data.duration)
  }
  if (data.severity !== undefined) {
    updateData.severity = data.severity
  }
  if (data.timeOfDay !== undefined) {
    updateData.time_of_day = data.timeOfDay
  }
  if (data.triggers !== undefined) {
    updateData.triggers = data.triggers
  }
  if (data.symptoms !== undefined) {
    updateData.symptoms = data.symptoms
  }
  if (data.recoveryTime !== undefined) {
    updateData.recovery_time = data.recoveryTime
  }
  if (data.notes !== undefined) {
    updateData.notes = data.notes
  }
  if (data.images !== undefined) {
    updateData.images = data.images
  }

  await db.collection('seizure_records')
    .where({
      _id: recordId,
      user_id: userId
    })
    .update({
      data: updateData
    })

  return {
    success: true,
    message: '发作记录更新成功',
    data: updateData
  }
}

// 删除发作记录
async function deleteRecord(recordId, userId) {
  if (!recordId) {
    return {
      success: false,
      message: '记录ID不能为空'
    }
  }

  // 检查记录是否存在且属于当前用户
  const existingRecord = await db.collection('seizure_records')
    .where({
      _id: recordId,
      user_id: userId
    })
    .get()

  if (existingRecord.data.length === 0) {
    return {
      success: false,
      message: '记录不存在或无权限删除'
    }
  }

  await db.collection('seizure_records')
    .where({
      _id: recordId,
      user_id: userId
    })
    .remove()

  return {
    success: true,
    message: '发作记录删除成功'
  }
}

// 获取单个发作记录
async function getRecord(recordId, userId) {
  if (!recordId) {
    return {
      success: false,
      message: '记录ID不能为空'
    }
  }

  const result = await db.collection('seizure_records')
    .where({
      _id: recordId,
      user_id: userId
    })
    .get()

  if (result.data.length === 0) {
    return {
      success: false,
      message: '记录不存在'
    }
  }

  return {
    success: true,
    message: '获取记录成功',
    data: result.data[0]
  }
}

// 获取发作记录列表
async function listRecords(userId, pageSize, pageIndex) {
  const skip = pageIndex * pageSize

  const result = await db.collection('seizure_records')
    .where({
      user_id: userId
    })
    .orderBy('record_time', 'desc')
    .skip(skip)
    .limit(pageSize)
    .get()

  // 获取总数
  const countResult = await db.collection('seizure_records')
    .where({
      user_id: userId
    })
    .count()

  return {
    success: true,
    message: '获取记录列表成功',
    data: {
      records: result.data,
      total: countResult.total,
      pageSize: pageSize,
      pageIndex: pageIndex,
      hasMore: (pageIndex + 1) * pageSize < countResult.total
    }
  }
}

// 搜索发作记录
async function searchRecords(searchData, userId, pageSize, pageIndex) {
  const skip = pageIndex * pageSize
  let whereCondition = {
    user_id: userId
  }

  // 构建搜索条件
  if (searchData.startDate && searchData.endDate) {
    whereCondition.record_time = _.and(
      _.gte(new Date(searchData.startDate)),
      _.lte(new Date(searchData.endDate))
    )
  } else if (searchData.startDate) {
    whereCondition.record_time = _.gte(new Date(searchData.startDate))
  } else if (searchData.endDate) {
    whereCondition.record_time = _.lte(new Date(searchData.endDate))
  }

  if (searchData.seizureType) {
    whereCondition.seizure_type = db.RegExp({
      regexp: searchData.seizureType,
      options: 'i'
    })
  }

  if (searchData.severity) {
    whereCondition.severity = searchData.severity
  }

  const result = await db.collection('seizure_records')
    .where(whereCondition)
    .orderBy('record_time', 'desc')
    .skip(skip)
    .limit(pageSize)
    .get()

  // 获取搜索结果总数
  const countResult = await db.collection('seizure_records')
    .where(whereCondition)
    .count()

  return {
    success: true,
    message: '搜索记录成功',
    data: {
      records: result.data,
      total: countResult.total,
      pageSize: pageSize,
      pageIndex: pageIndex,
      hasMore: (pageIndex + 1) * pageSize < countResult.total
    }
  }
}