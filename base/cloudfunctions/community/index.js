// 希舞宝宝社区云函数 - 帖子、评论、话题、点赞管理
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  const { action } = event

  try {
    switch (action) {
      case 'createPost':
        return await createPost(event)
      case 'getPost':
        return await getPost(event)
      case 'listPosts':
        return await listPosts(event)
      case 'deletePost':
        return await deletePost(event)
      case 'togglePinPost':
        return await togglePinPost(event)
      case 'hidePost':
        return await hidePost(event)
      case 'createComment':
        return await createComment(event)
      case 'listComments':
        return await listComments(event)
      case 'deleteComment':
        return await deleteComment(event)
      case 'toggleLike':
        return await toggleLike(event)
      case 'createTopic':
        return await createTopic(event)
      case 'listTopics':
        return await listTopics(event)
      case 'updateTopic':
        return await updateTopic(event)
      case 'adminListPosts':
        return await adminListPosts(event)
      case 'getShareData':
        return await getShareData(event)
      default:
        return { success: false, message: '不支持的操作类型' }
    }
  } catch (error) {
    console.error('社区操作失败:', error)
    return { success: false, message: '操作失败: ' + error.message }
  }
}

// ==================== 公共方法 ====================

// 查询用户资料，拼接「宝宝名字+关系」作为社区昵称
async function resolveUserDisplayInfo(userId, fallbackNickName, fallbackAvatarUrl) {
  let displayName = fallbackNickName || '希舞宝宝'
  let avatarUrl = fallbackAvatarUrl || ''
  try {
    const userResult = await db.collection('users').where({ _id: userId }).limit(1).get()
    if (userResult.data && userResult.data.length > 0) {
      const user = userResult.data[0]
      const patientInfo = user.patientInfo || {}
      // 优先级：宝宝名字+关系 → 微信昵称 → 前端传入的昵称 → "希舞宝宝"
      if (patientInfo.babyName) {
        const relationMap = { '父亲': '爸爸', '母亲': '妈妈', '爷爷': '爷爷', '奶奶': '奶奶', '外公': '外公', '外婆': '外婆', '其他': '家人' }
        const roleName = relationMap[patientInfo.relationship] || '家人'
        displayName = patientInfo.babyName + roleName
      } else if (user.nickName) {
        displayName = user.nickName
      }
      if (!avatarUrl && user.avatarUrl) {
        avatarUrl = user.avatarUrl
      }
    }
  } catch (e) {
    console.log('查询用户资料失败，使用前端传入的昵称:', e.message)
  }
  return { displayName, avatarUrl }
}

// ==================== 帖子相关 ====================

// 发布帖子
async function createPost(event) {
  const { data, userId } = event

  if (!data || !data.content || !data.content.trim()) {
    return { success: false, message: '帖子内容不能为空' }
  }

  if (data.content.length > 2000) {
    return { success: false, message: '帖子内容不能超过 2000 字' }
  }

  // 查询用户资料拼接社区昵称
  const { displayName, avatarUrl } = await resolveUserDisplayInfo(userId, data.nickName, data.avatarUrl)

  const post = {
    user_id: userId,
    nick_name: data.isAnonymous ? '匿名用户' : displayName,
    avatar_url: data.isAnonymous ? '' : avatarUrl,
    is_anonymous: data.isAnonymous || false,
    topic_id: data.topicId || '',
    content: data.content.trim(),
    images: data.images || [],
    like_count: 0,
    comment_count: 0,
    view_count: 0,
    is_pinned: false,
    status: 'active',
    created_at: new Date(),
    updated_at: new Date()
  }

  const result = await db.collection('community_posts').add({ data: post })

  // 如果关联了话题，更新话题帖子数
  if (data.topicId) {
    await db.collection('community_topics').doc(data.topicId).update({
      data: { post_count: _.inc(1), updated_at: new Date() }
    }).catch(() => {})
  }

  return {
    success: true,
    message: '发布成功',
    data: { postId: result._id }
  }
}

// 获取帖子详情
async function getPost(event) {
  const { postId, userId } = event

  if (!postId) {
    return { success: false, message: '帖子 ID 不能为空' }
  }

  const result = await db.collection('community_posts').doc(postId).get()
  const post = result.data

  if (!post || post.status === 'deleted') {
    return { success: false, message: '帖子不存在' }
  }

  // 增加浏览量
  await db.collection('community_posts').doc(postId).update({
    data: { view_count: _.inc(1) }
  }).catch(() => {})

  // 查询当前用户是否已点赞
  let isLiked = false
  if (userId) {
    try {
      const likeResult = await db.collection('favorites').where({
        user_id: userId,
        item_id: postId,
        item_type: 'post_like'
      }).count()
      isLiked = likeResult.total > 0
    } catch (e) {
      console.log('查询点赞状态失败（favorites 集合可能不存在）:', e.message)
    }
  }

  // 查询话题信息
  let topic = null
  if (post.topic_id) {
    const topicResult = await db.collection('community_topics').doc(post.topic_id).get().catch(() => null)
    if (topicResult && topicResult.data) {
      topic = topicResult.data
    }
  }

  return {
    success: true,
    message: '获取成功',
    data: { ...post, isLiked, topic }
  }
}

// 帖子列表
async function listPosts(event) {
  const { topicId, pageSize = 10, pageIndex = 0, userId } = event
  const skip = pageIndex * pageSize

  let query = { status: 'active' }
  if (topicId) {
    query.topic_id = topicId
  }

  // 查询总数
  const countResult = await db.collection('community_posts').where(query).count()

  // 查询列表，置顶优先 + 时间倒序
  const result = await db.collection('community_posts')
    .where(query)
    .orderBy('is_pinned', 'desc')
    .orderBy('created_at', 'desc')
    .skip(skip)
    .limit(pageSize)
    .get()

  // 查询当前用户的点赞状态
  let likedPostIds = []
  if (userId && result.data.length > 0) {
    try {
      const postIds = result.data.map(post => post._id)
      const likesResult = await db.collection('favorites').where({
        user_id: userId,
        item_id: _.in(postIds),
        item_type: 'post_like'
      }).get()
      likedPostIds = likesResult.data.map(like => like.item_id)
    } catch (e) {
      console.log('查询帖子点赞状态失败:', e.message)
    }
  }

  const posts = result.data.map(post => ({
    ...post,
    isLiked: likedPostIds.includes(post._id)
  }))

  return {
    success: true,
    message: '获取成功',
    data: {
      records: posts,
      total: countResult.total,
      pageSize,
      pageIndex,
      hasMore: (pageIndex + 1) * pageSize < countResult.total
    }
  }
}

// 删除帖子（作者本人或管理员）
async function deletePost(event) {
  const { postId, userId, isAdmin } = event

  if (!postId) {
    return { success: false, message: '帖子 ID 不能为空' }
  }

  const postResult = await db.collection('community_posts').doc(postId).get()
  const post = postResult.data

  if (!post) {
    return { success: false, message: '帖子不存在' }
  }

  if (post.user_id !== userId && !isAdmin) {
    return { success: false, message: '无权删除此帖子' }
  }

  await db.collection('community_posts').doc(postId).update({
    data: { status: 'deleted', updated_at: new Date() }
  })

  // 如果有关联话题，减少帖子数
  if (post.topic_id) {
    await db.collection('community_topics').doc(post.topic_id).update({
      data: { post_count: _.inc(-1) }
    }).catch(() => {})
  }

  return { success: true, message: '删除成功' }
}

// 置顶/取消置顶帖子（管理员）
async function togglePinPost(event) {
  const { postId } = event

  if (!postId) {
    return { success: false, message: '帖子 ID 不能为空' }
  }

  const postResult = await db.collection('community_posts').doc(postId).get()
  const post = postResult.data

  if (!post) {
    return { success: false, message: '帖子不存在' }
  }

  const newPinned = !post.is_pinned
  await db.collection('community_posts').doc(postId).update({
    data: { is_pinned: newPinned, updated_at: new Date() }
  })

  return {
    success: true,
    message: newPinned ? '已置顶' : '已取消置顶',
    data: { isPinned: newPinned }
  }
}

// 隐藏帖子（管理员）
async function hidePost(event) {
  const { postId } = event

  if (!postId) {
    return { success: false, message: '帖子 ID 不能为空' }
  }

  await db.collection('community_posts').doc(postId).update({
    data: { status: 'hidden', updated_at: new Date() }
  })

  return { success: true, message: '帖子已隐藏' }
}

// ==================== 评论相关 ====================

// 发布评论
async function createComment(event) {
  const { data, userId, postId } = event

  if (!postId) {
    return { success: false, message: '帖子 ID 不能为空' }
  }

  if (!data || !data.content || !data.content.trim()) {
    return { success: false, message: '评论内容不能为空' }
  }

  if (data.content.length > 500) {
    return { success: false, message: '评论内容不能超过 500 字' }
  }

  // 查询用户资料拼接社区昵称
  const { displayName, avatarUrl } = await resolveUserDisplayInfo(userId, data.nickName, data.avatarUrl)

  const comment = {
    post_id: postId,
    user_id: userId,
    nick_name: displayName,
    avatar_url: avatarUrl,
    content: data.content.trim(),
    reply_to_id: data.replyToId || '',
    reply_to_name: data.replyToName || '',
    like_count: 0,
    status: 'active',
    created_at: new Date()
  }

  const result = await db.collection('community_comments').add({ data: comment })

  // 更新帖子评论数
  await db.collection('community_posts').doc(postId).update({
    data: { comment_count: _.inc(1), updated_at: new Date() }
  }).catch(() => {})

  return {
    success: true,
    message: '评论成功',
    data: { commentId: result._id, ...comment }
  }
}

// 评论列表
async function listComments(event) {
  const { postId, pageSize = 20, pageIndex = 0, userId } = event

  if (!postId) {
    return { success: false, message: '帖子 ID 不能为空' }
  }

  const skip = pageIndex * pageSize

  const countResult = await db.collection('community_comments').where({
    post_id: postId,
    status: 'active'
  }).count()

  const result = await db.collection('community_comments')
    .where({ post_id: postId, status: 'active' })
    .orderBy('created_at', 'asc')
    .skip(skip)
    .limit(pageSize)
    .get()

  // 查询当前用户的评论点赞状态
  let likedCommentIds = []
  if (userId && result.data.length > 0) {
    try {
      const commentIds = result.data.map(comment => comment._id)
      const likesResult = await db.collection('favorites').where({
        user_id: userId,
        item_id: _.in(commentIds),
        item_type: 'comment_like'
      }).get()
      likedCommentIds = likesResult.data.map(like => like.item_id)
    } catch (e) {
      console.log('查询评论点赞状态失败:', e.message)
    }
  }

  const comments = result.data.map(comment => ({
    ...comment,
    isLiked: likedCommentIds.includes(comment._id)
  }))

  return {
    success: true,
    message: '获取成功',
    data: {
      records: comments,
      total: countResult.total,
      pageSize,
      pageIndex,
      hasMore: (pageIndex + 1) * pageSize < countResult.total
    }
  }
}

// 删除评论（作者本人或管理员）
async function deleteComment(event) {
  const { commentId, userId, isAdmin, postId } = event

  if (!commentId) {
    return { success: false, message: '评论 ID 不能为空' }
  }

  const commentResult = await db.collection('community_comments').doc(commentId).get()
  const comment = commentResult.data

  if (!comment) {
    return { success: false, message: '评论不存在' }
  }

  if (comment.user_id !== userId && !isAdmin) {
    return { success: false, message: '无权删除此评论' }
  }

  await db.collection('community_comments').doc(commentId).update({
    data: { status: 'deleted' }
  })

  // 更新帖子评论数
  const targetPostId = postId || comment.post_id
  if (targetPostId) {
    await db.collection('community_posts').doc(targetPostId).update({
      data: { comment_count: _.inc(-1) }
    }).catch(() => {})
  }

  return { success: true, message: '删除成功' }
}

// ==================== 点赞相关 ====================

// 点赞/取消点赞
async function toggleLike(event) {
  const { itemId, itemType, userId } = event

  if (!itemId || !itemType || !userId) {
    return { success: false, message: '参数不完整' }
  }

  if (!['post_like', 'comment_like'].includes(itemType)) {
    return { success: false, message: '不支持的点赞类型' }
  }

  // 检查是否已点赞
  const existingLike = await db.collection('favorites').where({
    user_id: userId,
    item_id: itemId,
    item_type: itemType
  }).get()

  const collection = itemType === 'post_like' ? 'community_posts' : 'community_comments'
  let isLiked = false

  if (existingLike.data.length > 0) {
    // 取消点赞
    await db.collection('favorites').doc(existingLike.data[0]._id).remove()
    await db.collection(collection).doc(itemId).update({
      data: { like_count: _.inc(-1) }
    }).catch(() => {})
    isLiked = false
  } else {
    // 添加点赞
    await db.collection('favorites').add({
      data: {
        user_id: userId,
        item_id: itemId,
        item_type: itemType,
        created_at: new Date()
      }
    })
    await db.collection(collection).doc(itemId).update({
      data: { like_count: _.inc(1) }
    }).catch(() => {})
    isLiked = true
  }

  return {
    success: true,
    message: isLiked ? '已点赞' : '已取消点赞',
    data: { isLiked }
  }
}

// ==================== 话题相关 ====================

// 创建话题（管理员）
async function createTopic(event) {
  const { data } = event

  if (!data || !data.title || !data.title.trim()) {
    return { success: false, message: '话题标题不能为空' }
  }

  const topic = {
    title: data.title.trim(),
    description: data.description || '',
    icon: data.icon || '💬',
    post_count: 0,
    is_hot: false,
    sort_order: data.sortOrder || 0,
    status: 'active',
    created_by: event.userId || '',
    created_at: new Date(),
    updated_at: new Date()
  }

  const result = await db.collection('community_topics').add({ data: topic })

  return {
    success: true,
    message: '话题创建成功',
    data: { topicId: result._id, ...topic }
  }
}

// 话题列表
async function listTopics(event) {
  const result = await db.collection('community_topics')
    .where({ status: 'active' })
    .orderBy('sort_order', 'desc')
    .orderBy('created_at', 'desc')
    .limit(50)
    .get()

  return {
    success: true,
    message: '获取成功',
    data: { records: result.data }
  }
}

// 编辑话题（管理员）
async function updateTopic(event) {
  const { topicId, data } = event

  if (!topicId) {
    return { success: false, message: '话题 ID 不能为空' }
  }

  const updateData = { updated_at: new Date() }
  if (data.title !== undefined) updateData.title = data.title.trim()
  if (data.description !== undefined) updateData.description = data.description
  if (data.icon !== undefined) updateData.icon = data.icon
  if (data.sortOrder !== undefined) updateData.sort_order = data.sortOrder
  if (data.isHot !== undefined) updateData.is_hot = data.isHot
  if (data.status !== undefined) updateData.status = data.status

  await db.collection('community_topics').doc(topicId).update({ data: updateData })

  return { success: true, message: '更新成功' }
}

// ==================== 管理员相关 ====================

// 管理员帖子列表（含隐藏帖子）
async function adminListPosts(event) {
  const { pageSize = 20, pageIndex = 0, status } = event
  const skip = pageIndex * pageSize

  let query = {}
  if (status) {
    query.status = status
  } else {
    query.status = _.in(['active', 'hidden'])
  }

  const countResult = await db.collection('community_posts').where(query).count()

  const result = await db.collection('community_posts')
    .where(query)
    .orderBy('created_at', 'desc')
    .skip(skip)
    .limit(pageSize)
    .get()

  return {
    success: true,
    message: '获取成功',
    data: {
      records: result.data,
      total: countResult.total,
      pageSize,
      pageIndex,
      hasMore: (pageIndex + 1) * pageSize < countResult.total
    }
  }
}

// ==================== 分享相关 ====================

// 获取分享数据（供前端生成海报用）
async function getShareData(event) {
  const { postId } = event

  if (!postId) {
    return { success: false, message: '帖子 ID 不能为空' }
  }

  const result = await db.collection('community_posts').doc(postId).get()
  const post = result.data

  if (!post || post.status !== 'active') {
    return { success: false, message: '帖子不存在' }
  }

  // 获取话题信息
  let topicTitle = ''
  if (post.topic_id) {
    const topicResult = await db.collection('community_topics').doc(post.topic_id).get().catch(() => null)
    if (topicResult && topicResult.data) {
      topicTitle = topicResult.data.title
    }
  }

  return {
    success: true,
    message: '获取成功',
    data: {
      postId: post._id,
      content: post.content.substring(0, 200),
      nickName: post.is_anonymous ? '匿名希舞宝宝' : post.nick_name,
      avatarUrl: post.is_anonymous ? '' : post.avatar_url,
      images: post.images.slice(0, 1),
      topicTitle,
      likeCount: post.like_count,
      commentCount: post.comment_count,
      createdAt: post.created_at
    }
  }
}
