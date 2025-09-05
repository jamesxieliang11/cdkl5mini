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

// 使用 CommonJS 语法导出函数
module.exports = {
  initDatabase,
  checkDatabaseStatus,
  getDepartments,
  getExperts,
  getSchedules,
  getSystemConfig,
  getResources
}