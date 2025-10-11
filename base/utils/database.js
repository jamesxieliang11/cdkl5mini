// 数据库操作工具类
// 封装云函数调用和数据库操作

/**
 * 初始化数据库
 * @returns {Promise} 返回初始化结果
 */
function initDatabase() {
  return new Promise((resolve, reject) => {
    wx.showLoading({
      title: '正在初始化数据库...',
      mask: true
    })

    wx.cloud.callFunction({
      name: 'initDatabase',
      data: {},
      success: (res) => {
        wx.hideLoading()
        console.log('数据库初始化结果:', res)
        
        if (res.result && res.result.success) {
          wx.showToast({
            title: '数据库初始化成功',
            icon: 'success',
            duration: 2000
          })
          resolve(res.result)
        } else {
          const errorMsg = res.result ? res.result.message : '初始化失败'
          wx.showToast({
            title: errorMsg,
            icon: 'error',
            duration: 3000
          })
          reject(new Error(errorMsg))
        }
      },
      fail: (error) => {
        wx.hideLoading()
        console.error('调用云函数失败:', error)
        wx.showToast({
          title: '网络错误，请重试',
          icon: 'error',
          duration: 3000
        })
        reject(error)
      }
    })
  })
}

/**
 * 检查数据库是否已初始化
 * @returns {Promise} 返回检查结果
 */
function checkDatabaseStatus() {
  return new Promise((resolve, reject) => {
    const db = wx.cloud.database()
    
    // 检查departments集合是否有数据
    db.collection('departments').count({
      success: (res) => {
        resolve({
          initialized: res.total > 0,
          recordCount: res.total
        })
      },
      fail: (error) => {
        console.error('检查数据库状态失败:', error)
        reject(error)
      }
    })
  })
}

/**
 * 获取义诊科室列表
 * @returns {Promise} 返回科室列表
 */
function getDepartments() {
  const db = wx.cloud.database()
  return db.collection('departments')
    .where({
      is_active: true
    })
    .orderBy('created_at', 'asc')
    .get()
}

/**
 * 获取专家列表
 * @returns {Promise} 返回专家列表
 */
function getExperts() {
  const db = wx.cloud.database()
  return db.collection('experts')
    .orderBy('created_at', 'asc')
    .get()
}

/**
 * 获取会议议程
 * @returns {Promise} 返回议程列表
 */
function getSchedules() {
  const db = wx.cloud.database()
  return db.collection('schedules')
    .orderBy('start_time', 'asc')
    .get()
}

/**
 * 获取系统配置
 * @param {string} configKey 配置键名
 * @returns {Promise} 返回配置值
 */
function getSystemConfig(configKey) {
  const db = wx.cloud.database()
  return db.collection('system_configs')
    .where({
      config_key: configKey
    })
    .get()
}

/**
 * 获取资源文件列表
 * @param {string} category 资源分类
 * @returns {Promise} 返回资源列表
 */
function getResources(category = null) {
  const db = wx.cloud.database()
  let query = db.collection('resources').where({
    is_public: true
  })
  
  if (category) {
    query = query.where({
      category: category
    })
  }
  
  return query.orderBy('created_at', 'desc').get()
}

/**
 * 初始化患者记录数据库
 * @returns {Promise} 返回初始化结果
 */
function initRecordsDatabase() {
  return new Promise((resolve, reject) => {
    wx.showLoading({
      title: '正在初始化记录数据库...',
      mask: true
    })

    wx.cloud.callFunction({
      name: 'initRecordsDatabase',
      data: {},
      success: (res) => {
        wx.hideLoading()
        console.log('记录数据库初始化结果:', res)
        
        if (res.result && res.result.success) {
          wx.showToast({
            title: '记录数据库初始化成功',
            icon: 'success',
            duration: 2000
          })
          resolve(res.result)
        } else {
          const errorMsg = res.result ? res.result.message : '初始化失败'
          wx.showToast({
            title: errorMsg,
            icon: 'error',
            duration: 3000
          })
          reject(new Error(errorMsg))
        }
      },
      fail: (error) => {
        wx.hideLoading()
        console.error('调用云函数失败:', error)
        wx.showToast({
          title: '网络错误，请重试',
          icon: 'error',
          duration: 3000
        })
        reject(error)
      }
    })
  })
}

/**
 * 检查记录数据库状态
 * @returns {Promise} 返回检查结果
 */
function checkRecordsStatus() {
  return new Promise((resolve, reject) => {
    const db = wx.cloud.database()
    
    Promise.all([
      db.collection('medication_records').count(),
      db.collection('seizure_records').count(),
      db.collection('other_records').count(),
      db.collection('record_statistics').count()
    ]).then(results => {
      resolve({
        medication_records: results[0].total,
        seizure_records: results[1].total,
        other_records: results[2].total,
        record_statistics: results[3].total,
        total: results.reduce((sum, result) => sum + result.total, 0),
        initialized: results.some(result => result.total > 0)
      })
    }).catch(error => {
      console.error('检查记录数据库状态失败:', error)
      reject(error)
    })
  })
}

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
    data: recordData,
    userId: wx.getStorageSync('userId') || 'default_user'
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
    data: recordData,
    userId: wx.getStorageSync('userId') || 'default_user'
  })
}

/**
 * 删除调药记录
 * @param {string} recordId 记录ID
 * @returns {Promise} 返回删除结果
 */
function deleteMedicationRecord(recordId) {
  return callMedicationRecordFunction('delete', {
    recordId: recordId,
    userId: wx.getStorageSync('userId') || 'default_user'
  })
}

/**
 * 获取调药记录详情
 * @param {string} recordId 记录ID
 * @returns {Promise} 返回记录详情
 */
function getMedicationRecord(recordId) {
  return callMedicationRecordFunction('get', {
    recordId: recordId,
    userId: wx.getStorageSync('userId') || 'default_user'
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
    userId: wx.getStorageSync('userId') || 'default_user',
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
    userId: wx.getStorageSync('userId') || 'default_user',
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
    data: recordData,
    userId: wx.getStorageSync('userId') || 'default_user'
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
    data: recordData,
    userId: wx.getStorageSync('userId') || 'default_user'
  })
}

/**
 * 删除发作记录
 * @param {string} recordId 记录ID
 * @returns {Promise} 返回删除结果
 */
function deleteSeizureRecord(recordId) {
  return callSeizureRecordFunction('delete', {
    recordId: recordId,
    userId: wx.getStorageSync('userId') || 'default_user'
  })
}

/**
 * 获取发作记录详情
 * @param {string} recordId 记录ID
 * @returns {Promise} 返回记录详情
 */
function getSeizureRecord(recordId) {
  return callSeizureRecordFunction('get', {
    recordId: recordId,
    userId: wx.getStorageSync('userId') || 'default_user'
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
    userId: wx.getStorageSync('userId') || 'default_user',
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
    userId: wx.getStorageSync('userId') || 'default_user',
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
    data: recordData,
    userId: wx.getStorageSync('userId') || 'default_user'
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
    data: recordData,
    userId: wx.getStorageSync('userId') || 'default_user'
  })
}

/**
 * 删除其他记录
 * @param {string} recordId 记录ID
 * @returns {Promise} 返回删除结果
 */
function deleteOtherRecord(recordId) {
  return callOtherRecordFunction('delete', {
    recordId: recordId,
    userId: wx.getStorageSync('userId') || 'default_user'
  })
}

/**
 * 获取其他记录详情
 * @param {string} recordId 记录ID
 * @returns {Promise} 返回记录详情
 */
function getOtherRecord(recordId) {
  return callOtherRecordFunction('get', {
    recordId: recordId,
    userId: wx.getStorageSync('userId') || 'default_user'
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
    userId: wx.getStorageSync('userId') || 'default_user',
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
    userId: wx.getStorageSync('userId') || 'default_user',
    pageSize: pageSize,
    pageIndex: pageIndex
  })
}

// 使用 CommonJS 语法导出函数
module.exports = {
  initDatabase,
  checkDatabaseStatus,
  getDepartments,
  getExperts,
  getSchedules,
  getSystemConfig,
  getResources,
  initRecordsDatabase,
  checkRecordsStatus,
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
  searchOtherRecords
}