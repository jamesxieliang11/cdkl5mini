// 反馈意见云函数 - 支持提交、查询、管理反馈
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

function requireAdmin(currentUser) {
  if (!['admin', 'superadmin'].includes(currentUser.adminRole)) {
    throw new Error('权限不足')
  }
}

exports.main = async (event, context) => {
  const { action, data, feedbackId, pageSize = 10, pageIndex = 0 } = event

  try {
    // getAppConfig 不需要登录
    if (action === 'getAppConfig') {
      return await getAppConfig()
    }

    const currentUser = await resolveCurrentUser()
    const userId = currentUser.userId

    switch (action) {
      case 'create':
        return await createFeedback(data, userId)
      case 'list':
        return await listFeedbacks(userId, pageSize, pageIndex)
      case 'get':
        return await getFeedback(feedbackId, userId)
      case 'adminList':
        requireAdmin(currentUser)
        return await adminListFeedbacks(pageSize, pageIndex)
      case 'reply':
        requireAdmin(currentUser)
        return await replyFeedback(feedbackId, data)
      case 'updateAppConfig':
        requireAdmin(currentUser)
        return await updateAppConfig(data)
      default:
        return {
          success: false,
          message: '不支持的操作类型'
        }
    }
  } catch (error) {
    console.error('反馈意见操作失败:', error)
    return {
      success: false,
      message: '操作失败: ' + error.message,
      error: error
    }
  }
}

// 提交反馈
async function createFeedback(data, userId) {
  if (!data.type || !data.content) {
    return {
      success: false,
      message: '请选择反馈类型并填写反馈内容'
    }
  }

  const feedback = {
    user_id: userId,
    type: data.type,
    content: data.content,
    contact: data.contact || '',
    images: data.images || [],
    status: 'pending',
    reply: '',
    reply_time: null,
    created_at: new Date(),
    updated_at: new Date()
  }

  const result = await db.collection('feedbacks').add({
    data: feedback
  })

  return {
    success: true,
    message: '反馈提交成功，感谢您的宝贵意见！',
    data: {
      feedbackId: result._id,
      ...feedback
    }
  }
}

// 获取用户自己的反馈列表
async function listFeedbacks(userId, pageSize, pageIndex) {
  const skip = pageIndex * pageSize

  const result = await db.collection('feedbacks')
    .where({ user_id: userId })
    .orderBy('created_at', 'desc')
    .skip(skip)
    .limit(pageSize)
    .get()

  const countResult = await db.collection('feedbacks')
    .where({ user_id: userId })
    .count()

  return {
    success: true,
    message: '获取反馈列表成功',
    data: {
      records: result.data,
      total: countResult.total,
      pageSize: pageSize,
      pageIndex: pageIndex,
      hasMore: (pageIndex + 1) * pageSize < countResult.total
    }
  }
}

// 获取单条反馈详情
async function getFeedback(feedbackId, userId) {
  if (!feedbackId) {
    return {
      success: false,
      message: '反馈ID不能为空'
    }
  }

  const result = await db.collection('feedbacks')
    .where({
      _id: feedbackId,
      user_id: userId
    })
    .get()

  if (result.data.length === 0) {
    return {
      success: false,
      message: '反馈不存在'
    }
  }

  return {
    success: true,
    message: '获取反馈详情成功',
    data: result.data[0]
  }
}

// 管理员获取所有反馈列表
async function adminListFeedbacks(pageSize, pageIndex) {
  const skip = pageIndex * pageSize

  const result = await db.collection('feedbacks')
    .orderBy('created_at', 'desc')
    .skip(skip)
    .limit(pageSize)
    .get()

  const countResult = await db.collection('feedbacks').count()

  return {
    success: true,
    message: '获取反馈列表成功',
    data: {
      records: result.data,
      total: countResult.total,
      pageSize: pageSize,
      pageIndex: pageIndex,
      hasMore: (pageIndex + 1) * pageSize < countResult.total
    }
  }
}

// 获取应用全局配置
async function getAppConfig() {
  try {
    const result = await db.collection('app_config').doc('global').get()
    return {
      success: true,
      data: result.data
    }
  } catch (error) {
    // 集合或文档不存在时返回默认配置
    return {
      success: true,
      data: {
        _id: 'global',
        community_enabled: false,
        questionnaire_enabled: false
      }
    }
  }
}

async function updateAppConfig(data) {
  const validKeys = ['features_enabled']
  const updateData = {}

  for (const key of validKeys) {
    if (key in data) {
      updateData[key] = data[key]
    }
  }

  if (Object.keys(updateData).length === 0) {
    return { success: false, message: '没有有效的配置字段' }
  }

  updateData.updated_at = new Date()

  // 先尝试 set（文档存在时更新），若集合不存在则用 add 创建
  try {
    await db.collection('app_config').doc('global').set({ data: updateData })
  } catch (setError) {
    // 集合不存在时降级：直接 add 插入（会自动创建集合）
    await db.collection('app_config').add({ data: { _id: 'global', ...updateData } })
  }

  return { success: true, message: '配置更新成功', data: updateData }
}

// 管理员回复反馈
async function replyFeedback(feedbackId, data) {
  if (!feedbackId || !data.reply) {
    return {
      success: false,
      message: '反馈ID和回复内容不能为空'
    }
  }

  await db.collection('feedbacks')
    .doc(feedbackId)
    .update({
      data: {
        reply: data.reply,
        reply_time: new Date(),
        status: 'replied',
        updated_at: new Date()
      }
    })

  return {
    success: true,
    message: '回复成功'
  }
}