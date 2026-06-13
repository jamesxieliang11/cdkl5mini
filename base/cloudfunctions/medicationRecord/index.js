// 调药记录云函数 - 支持增删改查
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

async function resolveCurrentUser() {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  if (!openid) throw new Error('AUTH_FAIL')
  const res = await db.collection('users').where({ openid }).field({ _id: true, adminRole: true }).limit(1).get()
  if (!res.data || !res.data.length) throw new Error('USER_NOT_FOUND')
  return { userId: res.data[0]._id, openid, adminRole: res.data[0].adminRole || '' }
}

exports.main = async (event, context) => {
  const { action, data, recordId, pageSize = 10, pageIndex = 0 } = event

  try {
    const currentUser = await resolveCurrentUser()
    const userId = currentUser.userId

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
    console.error('调药记录操作失败:', error)
    return {
      success: false,
      message: '操作失败: ' + error.message,
      error: error
    }
  }
}

// 创建调药记录
async function createRecord(data, userId) {
  // 数据验证
  if (!data.datetime || !data.weight || !data.medications || data.medications.length === 0) {
    return {
      success: false,
      message: '缺少必要的记录信息'
    }
  }

  // 验证药物信息
  for (let i = 0; i < data.medications.length; i++) {
    const med = data.medications[i]
    if (!med.name || !med.dosage || !med.takeTime || !med.unit) {
      return {
        success: false,
        message: `药物${i + 1}信息不完整`
      }
    }
  }

  const record = {
    user_id: userId,
    record_time: new Date(data.datetime),
    weight: parseFloat(data.weight),
    side_effects: data.sideEffects || '',
    medications: data.medications.map(med => ({
      medication_name: med.name,
      dosage: parseFloat(med.dosage),
      unit: med.unit,
      take_time: med.takeTime
    })),
    created_at: new Date(),
    updated_at: new Date()
  }

  const result = await db.collection('medication_records').add({
    data: record
  })

  return {
    success: true,
    message: '调药记录创建成功',
    data: {
      recordId: result._id,
      ...record
    }
  }
}

// 更新调药记录
async function updateRecord(recordId, data, userId) {
  if (!recordId) {
    return {
      success: false,
      message: '记录ID不能为空'
    }
  }

  // 检查记录是否存在且属于当前用户
  const existingRecord = await db.collection('medication_records')
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
  if (data.weight !== undefined) {
    updateData.weight = parseFloat(data.weight)
  }
  if (data.sideEffects !== undefined) {
    updateData.side_effects = data.sideEffects
  }
  if (data.medications && data.medications.length > 0) {
    updateData.medications = data.medications.map(med => ({
      medication_name: med.name,
      dosage: parseFloat(med.dosage),
      unit: med.unit,
      take_time: med.takeTime
    }))
  }

  await db.collection('medication_records')
    .where({
      _id: recordId,
      user_id: userId
    })
    .update({
      data: updateData
    })

  return {
    success: true,
    message: '调药记录更新成功',
    data: updateData
  }
}

// 删除调药记录
async function deleteRecord(recordId, userId) {
  if (!recordId) {
    return {
      success: false,
      message: '记录ID不能为空'
    }
  }

  // 检查记录是否存在且属于当前用户
  const existingRecord = await db.collection('medication_records')
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

  await db.collection('medication_records')
    .where({
      _id: recordId,
      user_id: userId
    })
    .remove()

  return {
    success: true,
    message: '调药记录删除成功'
  }
}

// 获取单个调药记录
async function getRecord(recordId, userId) {
  if (!recordId) {
    return {
      success: false,
      message: '记录ID不能为空'
    }
  }

  const result = await db.collection('medication_records')
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

// 获取调药记录列表
async function listRecords(userId, pageSize, pageIndex) {
  const skip = pageIndex * pageSize

  const result = await db.collection('medication_records')
    .where({
      user_id: userId
    })
    .orderBy('record_time', 'desc')
    .skip(skip)
    .limit(pageSize)
    .get()

  // 获取总数
  const countResult = await db.collection('medication_records')
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

// 搜索调药记录
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

  if (searchData.medicationName) {
    whereCondition['medications.medication_name'] = db.RegExp({
      regexp: searchData.medicationName,
      options: 'i'
    })
  }

  if (searchData.minWeight && searchData.maxWeight) {
    whereCondition.weight = _.and(
      _.gte(parseFloat(searchData.minWeight)),
      _.lte(parseFloat(searchData.maxWeight))
    )
  } else if (searchData.minWeight) {
    whereCondition.weight = _.gte(parseFloat(searchData.minWeight))
  } else if (searchData.maxWeight) {
    whereCondition.weight = _.lte(parseFloat(searchData.maxWeight))
  }

  const result = await db.collection('medication_records')
    .where(whereCondition)
    .orderBy('record_time', 'desc')
    .skip(skip)
    .limit(pageSize)
    .get()

  // 获取搜索结果总数
  const countResult = await db.collection('medication_records')
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