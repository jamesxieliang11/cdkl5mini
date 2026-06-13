// 数据库操作工具类
// 封装云函数调用和数据库操作

/**
 * 调用调药记录云函数
 * @param {string} action 操作类型：create, update, delete, get, list, search
 * @param {Object} params 参数对象
 * @returns {Promise} 返回操作结果
 */
function callMedicationRecordFunction(action, params = {}) {
  return new Promise((resolve, reject) => {
    wx.cloud.callFunction({
      name: 'medicationRecord',
      data: {
        action: action,
        ...params
      },
      success: (res) => {
        console.log('调药记录云函数调用结果:', res)
        if (res.result && res.result.success) {
          resolve(res.result)
        } else {
          const errorMsg = res.result ? res.result.message : '操作失败'
          reject(new Error(errorMsg))
        }
      },
      fail: (error) => {
        console.error('调用调药记录云函数失败:', error)
        reject(error)
      }
    })
  })
}

/**
 * 创建调药记录
 * @param {Object} recordData 记录数据
 * @returns {Promise} 返回创建结果
 */
function createMedicationRecord(recordData) {
  return callMedicationRecordFunction('create', {
    data: recordData
  })
}

/**
 * 更新调药记录
 * @param {string} recordId 记录ID
 * @param {Object} recordData 更新数据
 * @returns {Promise} 返回更新结果
 */
function updateMedicationRecord(recordId, recordData) {
  return callMedicationRecordFunction('update', {
    recordId: recordId,
    data: recordData
  })
}

/**
 * 删除调药记录
 * @param {string} recordId 记录ID
 * @returns {Promise} 返回删除结果
 */
function deleteMedicationRecord(recordId) {
  return callMedicationRecordFunction('delete', {
    recordId: recordId
  })
}

/**
 * 获取调药记录详情
 * @param {string} recordId 记录ID
 * @returns {Promise} 返回记录详情
 */
function getMedicationRecord(recordId) {
  return callMedicationRecordFunction('get', {
    recordId: recordId
  })
}

/**
 * 获取调药记录列表
 * @param {number} pageSize 每页数量
 * @param {number} pageIndex 页码
 * @returns {Promise} 返回记录列表
 */
function listMedicationRecords(pageSize = 10, pageIndex = 0) {
  return callMedicationRecordFunction('list', {
    pageSize: pageSize,
    pageIndex: pageIndex
  })
}

/**
 * 搜索调药记录
 * @param {Object} searchParams 搜索参数
 * @param {number} pageSize 每页数量
 * @param {number} pageIndex 页码
 * @returns {Promise} 返回搜索结果
 */
function searchMedicationRecords(searchParams, pageSize = 10, pageIndex = 0) {
  return callMedicationRecordFunction('search', {
    data: searchParams,
    pageSize: pageSize,
    pageIndex: pageIndex
  })
}

/**
 * 调用发作记录云函数
 * @param {string} action 操作类型：create, update, delete, get, list, search
 * @param {Object} params 参数对象
 * @returns {Promise} 返回操作结果
 */
function callSeizureRecordFunction(action, params = {}) {
  return new Promise((resolve, reject) => {
    wx.cloud.callFunction({
      name: 'seizureRecord',
      data: {
        action: action,
        ...params
      },
      success: (res) => {
        console.log('发作记录云函数调用结果:', res)
        if (res.result && res.result.success) {
          resolve(res.result)
        } else {
          const errorMsg = res.result ? res.result.message : '操作失败'
          reject(new Error(errorMsg))
        }
      },
      fail: (error) => {
        console.error('调用发作记录云函数失败:', error)
        reject(error)
      }
    })
  })
}

/**
 * 创建发作记录
 * @param {Object} recordData 记录数据
 * @returns {Promise} 返回创建结果
 */
function createSeizureRecord(recordData) {
  return callSeizureRecordFunction('create', {
    data: recordData
  })
}

/**
 * 更新发作记录
 * @param {string} recordId 记录ID
 * @param {Object} recordData 更新数据
 * @returns {Promise} 返回更新结果
 */
function updateSeizureRecord(recordId, recordData) {
  return callSeizureRecordFunction('update', {
    recordId: recordId,
    data: recordData
  })
}

/**
 * 删除发作记录
 * @param {string} recordId 记录ID
 * @returns {Promise} 返回删除结果
 */
function deleteSeizureRecord(recordId) {
  return callSeizureRecordFunction('delete', {
    recordId: recordId
  })
}

/**
 * 获取发作记录详情
 * @param {string} recordId 记录ID
 * @returns {Promise} 返回记录详情
 */
function getSeizureRecord(recordId) {
  return callSeizureRecordFunction('get', {
    recordId: recordId
  })
}

/**
 * 获取发作记录列表
 * @param {number} pageSize 每页数量
 * @param {number} pageIndex 页码
 * @returns {Promise} 返回记录列表
 */
function listSeizureRecords(pageSize = 10, pageIndex = 0) {
  return callSeizureRecordFunction('list', {
    pageSize: pageSize,
    pageIndex: pageIndex
  })
}

/**
 * 搜索发作记录
 * @param {Object} searchParams 搜索参数
 * @param {number} pageSize 每页数量
 * @param {number} pageIndex 页码
 * @returns {Promise} 返回搜索结果
 */
function searchSeizureRecords(searchParams, pageSize = 10, pageIndex = 0) {
  return callSeizureRecordFunction('search', {
    data: searchParams,
    pageSize: pageSize,
    pageIndex: pageIndex
  })
}

/**
 * 调用其他记录云函数
 * @param {string} action 操作类型：create, update, delete, get, list, search
 * @param {Object} params 参数对象
 * @returns {Promise} 返回操作结果
 */
function callOtherRecordFunction(action, params = {}) {
  return new Promise((resolve, reject) => {
    wx.cloud.callFunction({
      name: 'otherRecord',
      data: {
        action: action,
        ...params
      },
      success: (res) => {
        console.log('其他记录云函数调用结果:', res)
        if (res.result && res.result.success) {
          resolve(res.result)
        } else {
          const errorMsg = res.result ? res.result.message : '操作失败'
          reject(new Error(errorMsg))
        }
      },
      fail: (error) => {
        console.error('调用其他记录云函数失败:', error)
        reject(error)
      }
    })
  })
}

/**
 * 创建其他记录
 * @param {Object} recordData 记录数据
 * @returns {Promise} 返回创建结果
 */
function createOtherRecord(recordData) {
  return callOtherRecordFunction('create', {
    data: recordData
  })
}

/**
 * 更新其他记录
 * @param {string} recordId 记录ID
 * @param {Object} recordData 更新数据
 * @returns {Promise} 返回更新结果
 */
function updateOtherRecord(recordId, recordData) {
  return callOtherRecordFunction('update', {
    recordId: recordId,
    data: recordData
  })
}

/**
 * 删除其他记录
 * @param {string} recordId 记录ID
 * @returns {Promise} 返回删除结果
 */
function deleteOtherRecord(recordId) {
  return callOtherRecordFunction('delete', {
    recordId: recordId
  })
}

/**
 * 获取其他记录详情
 * @param {string} recordId 记录ID
 * @returns {Promise} 返回记录详情
 */
function getOtherRecord(recordId) {
  return callOtherRecordFunction('get', {
    recordId: recordId
  })
}

/**
 * 获取其他记录列表
 * @param {number} pageSize 每页数量
 * @param {number} pageIndex 页码
 * @returns {Promise} 返回记录列表
 */
function listOtherRecords(pageSize = 10, pageIndex = 0) {
  return callOtherRecordFunction('list', {
    pageSize: pageSize,
    pageIndex: pageIndex
  })
}

/**
 * 搜索其他记录
 * @param {Object} searchParams 搜索参数
 * @param {number} pageSize 每页数量
 * @param {number} pageIndex 页码
 * @returns {Promise} 返回搜索结果
 */
function searchOtherRecords(searchParams, pageSize = 10, pageIndex = 0) {
  return callOtherRecordFunction('search', {
    data: searchParams,
    pageSize: pageSize,
    pageIndex: pageIndex
  })
}

/**
 * 调用月度汇报云函数
 * @param {string} action 操作类型
 * @param {Object} params 参数对象
 * @returns {Promise} 返回操作结果
 */
function callMonthlyReportFunction(action, params = {}) {
  return new Promise((resolve, reject) => {
    wx.cloud.callFunction({
      name: 'monthlyReport',
      data: {
        action: action,
        ...params
      },
      success: (res) => {
        if (res.result && res.result.success) {
          resolve(res.result)
        } else {
          const errorMsg = res.result ? res.result.message : '操作失败'
          reject(new Error(errorMsg))
        }
      },
      fail: (error) => {
        console.error('调用月度汇报云函数失败:', error)
        reject(error)
      }
    })
  })
}

/**
 * 创建月度汇报
 * @param {Object} reportData 汇报数据
 * @returns {Promise} 返回创建结果
 */
function createMonthlyReport(reportData) {
  return callMonthlyReportFunction('create', {
    data: reportData
  })
}

/**
 * 更新月度汇报
 * @param {string} reportId 汇报ID
 * @param {Object} reportData 更新数据
 * @returns {Promise} 返回更新结果
 */
function updateMonthlyReport(reportId, reportData) {
  return callMonthlyReportFunction('update', {
    reportId: reportId,
    data: reportData,
  })
}

/**
 * 获取指定月份的汇报
 * @param {string} month 月份（YYYY-MM）
 * @returns {Promise} 返回汇报数据
 */
function getMonthlyReport(month) {
  return callMonthlyReportFunction('get', {
    month: month
  })
}

/**
 * 获取月度汇报列表
 * @param {number} pageSize 每页数量
 * @param {number} pageIndex 页码
 * @returns {Promise} 返回汇报列表
 */
function listMonthlyReports(pageSize = 10, pageIndex = 0) {
  return callMonthlyReportFunction('list', {
    pageSize: pageSize,
    pageIndex: pageIndex
  })
}

/**
 * 获取上月汇报（用于预填充）
 * @returns {Promise} 返回上月汇报数据
 */
function getLastMonthReport() {
  return callMonthlyReportFunction('getLastReport', {})
}

/**
 * 获取用户追踪药物配置
 * @returns {Promise} 返回追踪药物列表
 */
function getTrackedMedications() {
  return callMonthlyReportFunction('getTrackedMedications', {})
}

/**
 * 更新用户追踪药物配置
 * @param {Array} medications 药物配置列表
 * @returns {Promise} 返回更新结果
 */
function updateTrackedMedications(medications) {
  return callMonthlyReportFunction('updateTrackedMedications', {
    data: { medications: medications }
  })
}

/**
 * 检查指定月份是否已提交汇报
 * @param {string} month 月份（YYYY-MM），不传则检查当月
 * @returns {Promise} 返回是否已提交
 */
function checkMonthlyReportSubmitted(month) {
  return callMonthlyReportFunction('checkMonthSubmitted', {
    month: month
  })
}

/**
 * 获取管理员月度汇报统计概览
 * @param {string} month 月份（YYYY-MM），不传则统计当月
 * @returns {Promise} 返回统计数据
 */
function getAdminMonthlyStats(month) {
  return callMonthlyReportFunction('adminStats', { month })
}

/**
 * 获取管理员月度汇报详细列表
 * @param {string} month 月份（YYYY-MM）
 * @param {number} pageSize 每页数量
 * @param {number} pageIndex 页码
 * @returns {Promise} 返回用户提交详情列表
 */
function getAdminMonthlyDetail(month, pageSize = 100, pageIndex = 0) {
  return callMonthlyReportFunction('adminDetail', { month, pageSize, pageIndex })
}

/**
 * 调用反馈意见云函数
 * @param {string} action 操作类型：create, list, get, adminList, reply
 * @param {Object} params 参数对象
 * @returns {Promise} 返回操作结果
 */
function callFeedbackFunction(action, params = {}) {
  return new Promise((resolve, reject) => {
    wx.cloud.callFunction({
      name: 'feedback',
      data: {
        action: action,
        ...params
      },
      success: (res) => {
        console.log('反馈意见云函数调用结果:', res)
        if (res.result && res.result.success) {
          resolve(res.result)
        } else {
          const errorMsg = res.result ? res.result.message : '操作失败'
          reject(new Error(errorMsg))
        }
      },
      fail: (error) => {
        console.error('调用反馈意见云函数失败:', error)
        reject(error)
      }
    })
  })
}

/**
 * 提交反馈意见
 * @param {Object} feedbackData 反馈数据
 * @returns {Promise} 返回提交结果
 */
function createFeedback(feedbackData) {
  return callFeedbackFunction('create', {
    data: feedbackData
  })
}

/**
 * 获取用户反馈列表
 * @param {number} pageSize 每页数量
 * @param {number} pageIndex 页码
 * @returns {Promise} 返回反馈列表
 */
function listFeedbacks(pageSize = 10, pageIndex = 0) {
  return callFeedbackFunction('list', {
    pageSize: pageSize,
    pageIndex: pageIndex
  })
}

/**
 * 获取反馈详情
 * @param {string} feedbackId 反馈ID
 * @returns {Promise} 返回反馈详情
 */
function getFeedback(feedbackId) {
  return callFeedbackFunction('get', {
    feedbackId: feedbackId
  })
}

function adminListFeedbacks(pageSize = 20, pageIndex = 0) {
  return callFeedbackFunction('adminList', {
    pageSize,
    pageIndex
  })
}

function replyFeedback(feedbackId, reply) {
  return callFeedbackFunction('reply', {
    feedbackId,
    data: { reply }
  })
}

// ==================== 问卷相关函数 ====================

/**
 * 调用问卷云函数
 * @param {string} action 操作类型
 * @param {Object} params 参数对象
 * @returns {Promise} 返回操作结果
 */
function callQuestionnaireFunction(action, params = {}) {
  return new Promise((resolve, reject) => {
    wx.cloud.callFunction({
      name: 'questionnaire',
      data: {
        action: action,
        ...params
      },
      success: (res) => {
        console.log('问卷云函数调用结果:', res)
        if (res.result && res.result.success) {
          resolve(res.result)
        } else {
          const errorMsg = res.result ? res.result.message : '操作失败'
          reject(new Error(errorMsg))
        }
      },
      fail: (error) => {
        console.error('调用问卷云函数失败:', error)
        reject(error)
      }
    })
  })
}

/**
 * 提交/更新问卷
 * @param {Object} formData 问卷数据
 * @param {string} status 状态（draft/submitted）
 * @returns {Promise} 返回提交结果
 */
function submitQuestionnaire(formData, status = 'submitted') {
  return callQuestionnaireFunction('submit', {
    data: formData,
    status: status
  })
}

/**
 * 获取当前用户的问卷
 * @returns {Promise} 返回问卷数据
 */
function getQuestionnaire() {
  return callQuestionnaireFunction('get', {})
}

/**
 * 检查当前用户是否已提交问卷
 * @returns {Promise} 返回 { submitted: boolean }
 */
function checkQuestionnaireSubmitted() {
  return callQuestionnaireFunction('check', {})
}

/**
 * 获取问卷管理统计数据
 * @returns {Promise} 返回问卷统计
 */
function getQuestionnaireAdminStats() {
  return callQuestionnaireFunction('adminStats', {})
}

/**
 * 获取问卷管理列表
 * @param {number} pageSize 每页数量
 * @param {number} pageIndex 页码
 * @returns {Promise} 返回问卷列表
 */
function getQuestionnaireAdminList(pageSize = 100, pageIndex = 0) {
  return callQuestionnaireFunction('list', { pageSize, pageIndex })
}

/**
 * 按手机号搜索未绑定的问卷
 * @param {string} phone 手机号或微信号
 * @returns {Promise} 返回匹配的问卷列表
 */
function searchQuestionnaireByPhone(phone) {
  return callQuestionnaireFunction('searchByPhone', { phone })
}

/**
 * 家长认领绑定问卷
 * @param {string} questionnaireId 问卷记录ID
 * @param {string} childName 孩子姓名（用于二次验证）
 * @param {string} birthDate 出生日期（用于二次验证）
 * @returns {Promise} 返回绑定结果
 */
function claimQuestionnaire(questionnaireId, childName, birthDate) {
  return callQuestionnaireFunction('claim', {
    questionnaireId,
    childName,
    birthDate
  })
}

/**
 * 管理员手动绑定问卷到指定用户
 * @param {string} questionnaireId 问卷记录ID
 * @param {string} targetOpenid 目标用户openid
 * @param {string} targetUserId 目标用户ID
 * @returns {Promise} 返回绑定结果
 */
function adminBindQuestionnaire(questionnaireId, targetOpenid, targetUserId) {
  return callQuestionnaireFunction('adminBind', {
    questionnaireId,
    targetOpenid,
    targetUserId
  })
}

/**
 * 获取当前用户绑定的所有问卷列表
 * @returns {Promise} 返回问卷数组
 */
function getMyBoundQuestionnaires() {
  return callQuestionnaireFunction('getMyBoundList', {})
}

/**
 * 解绑问卷（将当前用户从问卷的 bound_users 中移除）
 * @param {string} questionnaireId 问卷记录ID
 * @returns {Promise} 返回解绑结果
 */
function unbindQuestionnaire(questionnaireId) {
  return callQuestionnaireFunction('unbind', { questionnaireId })
}

/**
 * 获取管理员概览统计数据
 * @returns {Promise} 返回概览统计
 */
function getAdminOverview() {
  return callMonthlyReportFunction('adminOverview', {})
}

// ==================== 社区相关函数 ====================

/**
 * 调用社区云函数
 * @param {string} action 操作类型
 * @param {Object} params 参数对象
 * @returns {Promise} 返回操作结果
 */
function callCommunityFunction(action, params = {}) {
  return new Promise((resolve, reject) => {
    wx.cloud.callFunction({
      name: 'community',
      data: {
        action: action,
        ...params
      },
      success: (res) => {
        console.log('社区云函数调用结果:', res)
        if (res.result && res.result.success) {
          resolve(res.result)
        } else {
          const errorMsg = res.result ? res.result.message : '操作失败'
          reject(new Error(errorMsg))
        }
      },
      fail: (error) => {
        console.error('调用社区云函数失败:', error)
        reject(error)
      }
    })
  })
}

/**
 * 发布帖子
 * @param {Object} postData 帖子数据
 * @returns {Promise} 返回发布结果
 */
function createCommunityPost(postData) {
  return callCommunityFunction('createPost', {
    data: postData
  })
}

/**
 * 获取帖子详情
 * @param {string} postId 帖子ID
 * @returns {Promise} 返回帖子详情
 */
function getCommunityPost(postId) {
  return callCommunityFunction('getPost', {
    postId: postId
  })
}

/**
 * 获取帖子列表
 * @param {Object} options 选项 { topicId, pageSize, pageIndex }
 * @returns {Promise} 返回帖子列表
 */
function listCommunityPosts(options = {}) {
  return callCommunityFunction('listPosts', {
    topicId: options.topicId || '',
    pageSize: options.pageSize || 10,
    pageIndex: options.pageIndex || 0
  })
}

/**
 * 删除帖子
 * @param {string} postId 帖子ID
 * @returns {Promise} 返回删除结果
 */
function deleteCommunityPost(postId) {
  return callCommunityFunction('deletePost', {
    postId: postId
  })
}

/**
 * 置顶/取消置顶帖子
 * @param {string} postId 帖子ID
 * @returns {Promise} 返回操作结果
 */
function togglePinCommunityPost(postId) {
  return callCommunityFunction('togglePinPost', { postId: postId })
}

/**
 * 隐藏帖子（管理员）
 * @param {string} postId 帖子ID
 * @returns {Promise} 返回操作结果
 */
function hideCommunityPost(postId) {
  return callCommunityFunction('hidePost', { postId: postId })
}

/**
 * 发布评论
 * @param {string} postId 帖子ID
 * @param {Object} commentData 评论数据
 * @returns {Promise} 返回评论结果
 */
function createCommunityComment(postId, commentData) {
  return callCommunityFunction('createComment', {
    postId: postId,
    data: commentData
  })
}

/**
 * 获取评论列表
 * @param {string} postId 帖子ID
 * @param {number} pageSize 每页数量
 * @param {number} pageIndex 页码
 * @returns {Promise} 返回评论列表
 */
function listCommunityComments(postId, pageSize = 20, pageIndex = 0) {
  return callCommunityFunction('listComments', {
    postId: postId,
    pageSize: pageSize,
    pageIndex: pageIndex
  })
}

/**
 * 删除评论
 * @param {string} commentId 评论ID
 * @param {string} postId 帖子ID
 * @returns {Promise} 返回删除结果
 */
function deleteCommunityComment(commentId, postId) {
  return callCommunityFunction('deleteComment', {
    commentId: commentId,
    postId: postId
  })
}

/**
 * 点赞/取消点赞
 * @param {string} itemId 目标ID（帖子或评论）
 * @param {string} itemType 类型 'post_like' | 'comment_like'
 * @returns {Promise} 返回点赞结果
 */
function toggleCommunityLike(itemId, itemType) {
  return callCommunityFunction('toggleLike', {
    itemId: itemId,
    itemType: itemType
  })
}

/**
 * 创建话题（管理员）
 * @param {Object} topicData 话题数据
 * @returns {Promise} 返回创建结果
 */
function createCommunityTopic(topicData) {
  return callCommunityFunction('createTopic', {
    data: topicData
  })
}

/**
 * 获取话题列表
 * @returns {Promise} 返回话题列表
 */
function listCommunityTopics() {
  return callCommunityFunction('listTopics', {})
}

/**
 * 编辑话题（管理员）
 * @param {string} topicId 话题ID
 * @param {Object} topicData 更新数据
 * @returns {Promise} 返回更新结果
 */
function updateCommunityTopic(topicId, topicData) {
  return callCommunityFunction('updateTopic', {
    topicId: topicId,
    data: topicData
  })
}

/**
 * 管理员帖子列表
 * @param {Object} options 选项 { status, pageSize, pageIndex }
 * @returns {Promise} 返回帖子列表
 */
function adminListCommunityPosts(options = {}) {
  return callCommunityFunction('adminListPosts', {
    status: options.status || '',
    pageSize: options.pageSize || 20,
    pageIndex: options.pageIndex || 0
  })
}

/**
 * 获取帖子分享数据（供海报生成用）
 * @param {string} postId 帖子ID
 * @returns {Promise} 返回分享数据
 */
function getCommunityShareData(postId) {
  return callCommunityFunction('getShareData', { postId: postId })
}

// ==================== 社区活动 ====================

function createCommunityActivity(activityData) {
  return callCommunityFunction('createActivity', { data: activityData })
}

function listCommunityActivities(options = {}) {
  return callCommunityFunction('listActivities', {
    status: options.status || '',
    pageSize: options.pageSize || 10,
    pageIndex: options.pageIndex || 0,
    includeAll: options.includeAll || false
  })
}

function getCommunityActivity(activityId) {
  return callCommunityFunction('getActivity', { activityId })
}

function updateCommunityActivity(activityId, activityData) {
  return callCommunityFunction('updateActivity', {
    activityId,
    data: activityData
  })
}

function joinCommunityActivity(activityId) {
  return callCommunityFunction('joinActivity', { activityId })
}

// 使用 CommonJS 语法导出函数
module.exports = {
  // 调药记录相关函数
  createMedicationRecord,
  updateMedicationRecord,
  deleteMedicationRecord,
  getMedicationRecord,
  listMedicationRecords,
  searchMedicationRecords,
  // 发作记录相关函数
  createSeizureRecord,
  updateSeizureRecord,
  deleteSeizureRecord,
  getSeizureRecord,
  listSeizureRecords,
  searchSeizureRecords,
  // 其他记录相关函数
  createOtherRecord,
  updateOtherRecord,
  deleteOtherRecord,
  getOtherRecord,
  listOtherRecords,
  searchOtherRecords,
  // 月度汇报相关函数
  createMonthlyReport,
  updateMonthlyReport,
  getMonthlyReport,
  listMonthlyReports,
  getLastMonthReport,
  getTrackedMedications,
  updateTrackedMedications,
  checkMonthlyReportSubmitted,
  // 管理员统计相关函数
  getAdminMonthlyStats,
  getAdminMonthlyDetail,
  // 反馈意见相关函数
  createFeedback,
  listFeedbacks,
  getFeedback,
  adminListFeedbacks,
  replyFeedback,
  // 问卷相关函数
  submitQuestionnaire,
  getQuestionnaire,
  checkQuestionnaireSubmitted,
  searchQuestionnaireByPhone,
  claimQuestionnaire,
  getMyBoundQuestionnaires,
  unbindQuestionnaire,
  // 问卷管理统计函数
  getQuestionnaireAdminStats,
  getQuestionnaireAdminList,
  adminBindQuestionnaire,
  // 管理员概览函数
  getAdminOverview,
  // 社区相关函数
  createCommunityPost,
  getCommunityPost,
  listCommunityPosts,
  deleteCommunityPost,
  togglePinCommunityPost,
  hideCommunityPost,
  createCommunityComment,
  listCommunityComments,
  deleteCommunityComment,
  toggleCommunityLike,
  createCommunityTopic,
  listCommunityTopics,
  updateCommunityTopic,
  adminListCommunityPosts,
  getCommunityShareData,
  // 社区活动相关函数
  createCommunityActivity,
  listCommunityActivities,
  getCommunityActivity,
  updateCommunityActivity,
  joinCommunityActivity,
  // 用户统计相关函数
  getUserStats,
  getTodayStats,
  // 应用配置相关函数
  getAppConfig,
  updateAppConfig
}

// ==================== 用户统计 ====================

function getUserStats() {
  return new Promise((resolve, reject) => {
    wx.cloud.callFunction({
      name: 'userStats',
      data: {
        action: 'getStats'
      },
      success: (res) => {
        if (res.result && res.result.success) {
          resolve(res.result)
        } else {
          reject(new Error(res.result ? res.result.message : '获取统计失败'))
        }
      },
      fail: reject
    })
  })
}

function getTodayStats() {
  return new Promise((resolve, reject) => {
    wx.cloud.callFunction({
      name: 'userStats',
      data: {
        action: 'getTodayStats'
      },
      success: (res) => {
        if (res.result && res.result.success) {
          resolve(res.result)
        } else {
          reject(new Error(res.result ? res.result.message : '获取今日统计失败'))
        }
      },
      fail: reject
    })
  })
}

// ==================== 应用配置 ====================

const APP_CONFIG_CACHE_KEY = 'appConfig'

// 默认配置（未拉到时的兜底值，功能默认关闭）
const DEFAULT_APP_CONFIG = {
  community_enabled: false,
  questionnaire_enabled: false
}

/**
 * 获取应用配置（先取本地缓存，后台静默拉取远程并更新）
 * @returns {Object} 当前生效的配置
 */
function getAppConfig() {
  return callFeedbackFunction('getAppConfig', {})
}

/**
 * 管理员更新应用配置
 * @param {Object} config 配置对象，如 { community_enabled: true }
 */
function updateAppConfig(config) {
  return callFeedbackFunction('updateAppConfig', { data: config })
}