// 用户信息管理工具类
// 封装用户登录、信息获取等功能

/**
 * 获取用户openid
 * @returns {Promise} 返回openid信息
 */
function getOpenId() {
  return new Promise((resolve, reject) => {
    wx.showLoading({
      title: '获取用户信息...',
      mask: true
    })

    wx.cloud.callFunction({
      name: 'getOpenId',
      data: {},
      success: (res) => {
        wx.hideLoading()
        console.log('获取openid结果:', res)
        
        if (res.result && res.result.success) {
          resolve(res.result)
        } else {
          const errorMsg = res.result ? res.result.error : '获取用户信息失败'
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
        console.error('调用getOpenId云函数失败:', error)
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
 * 用户登录
 * @param {Object} params 登录参数
 * @param {Object} params.userInfo 用户信息
 * @param {string} params.userRole 用户角色
 * @returns {Promise} 返回登录结果
 */
function userLogin(params = {}) {
  return new Promise((resolve, reject) => {
    const { userInfo, userRole, silent } = params
    
    if (!silent) {
      wx.showLoading({
        title: '登录中...',
        mask: true
      })
    }

    wx.cloud.callFunction({
      name: 'userLogin',
      data: {
        userInfo: userInfo,
        userRole: userRole
      },
      success: (res) => {
        if (!silent) wx.hideLoading()
        console.log('用户登录结果:', res)
        
        if (res.result && res.result.success) {
          // 保存用户信息到本地存储
          const userData = res.result.data
          wx.setStorageSync('userInfo', userData)
          wx.setStorageSync('openid', userData.openid)
          wx.setStorageSync('userRole', userData.userRole)
          wx.setStorageSync('userId', userData._id)
          wx.setStorageSync('adminRole', userData.adminRole || '')
          
          if (!silent) {
            wx.showToast({
              title: res.result.message,
              icon: 'success',
              duration: 2000
            })
          }
          resolve(res.result)
        } else {
          const errorMsg = res.result ? res.result.message : '登录失败'
          if (!silent) {
            wx.showToast({
              title: errorMsg,
              icon: 'error',
              duration: 3000
            })
          }
          reject(new Error(errorMsg))
        }
      },
      fail: (error) => {
        if (!silent) {
          wx.hideLoading()
          console.error('调用userLogin云函数失败:', error)
          wx.showToast({
            title: '网络错误，请重试',
            icon: 'error',
            duration: 3000
          })
        }
        reject(error)
      }
    })
  })
}

/**
 * 获取用户信息
 * @returns {Object} 用户信息
 */
function getUserInfo() {
  const userInfo = wx.getStorageSync('userInfo')
  const openid = wx.getStorageSync('openid')
  const userRole = wx.getStorageSync('userRole')
  const userId = wx.getStorageSync('userId')
  const adminRole = wx.getStorageSync('adminRole')
  
  return {
    userInfo: userInfo || null,
    openid: openid || '',
    userRole: userRole || '',
    userId: userId || '',
    adminRole: adminRole || ''
  }
}

/**
 * 检查用户是否已登录
 * @returns {boolean} 是否已登录
 */
function isLoggedIn() {
  const openid = wx.getStorageSync('openid')
  const userRole = wx.getStorageSync('userRole')
  return !!(openid && userRole)
}

/**
 * 用户退出登录
 */
function logout() {
  wx.removeStorageSync('userInfo')
  wx.removeStorageSync('openid')
  wx.removeStorageSync('userRole')
  wx.removeStorageSync('userId') // 清除用户ID
  wx.removeStorageSync('adminRole') // 清除管理员角色
  
  // 清除全局数据
  const app = getApp()
  if (app && app.globalData) {
    app.globalData.userInfo = null
    app.globalData.userRole = ''
  }
  
  wx.showToast({
    title: '已退出登录',
    icon: 'success'
  })
}

/**
 * 微信授权登录
 * @param {string} userRole 用户角色
 * @param {boolean} needUserInfo 是否需要获取用户详细信息，默认false
 * @returns {Promise} 返回登录结果
 */
function wxLogin(userRole = 'patient', needUserInfo = false, silent = false) {
  return new Promise((resolve, reject) => {
    // 先调用wx.login获取code
    wx.login({
      success: async (loginRes) => {
        if (loginRes.code) {
          try {
            // 获取用户信息（仅在需要且用户主动触发时）
            let userInfo = null
            if (needUserInfo) {
              try {
                const userInfoRes = await new Promise((resolve, reject) => {
                  wx.getUserProfile({
                    desc: '用于完善用户资料',
                    success: resolve,
                    fail: reject
                  })
                })
                userInfo = userInfoRes.userInfo
              } catch (error) {
                console.log('用户取消授权或获取用户信息失败:', error)
              }
            }
            
            // 调用登录云函数
            const loginResult = await userLogin({
              userInfo: userInfo,
              userRole: userRole,
              silent: silent
            })
            
            resolve(loginResult)
          } catch (error) {
            reject(error)
          }
        } else {
          reject(new Error('微信登录失败'))
        }
      },
      fail: (error) => {
        reject(error)
      }
    })
  })
}

/**
 * 获取用户详细信息（需要在用户点击事件中调用）
 * @returns {Promise} 返回用户信息
 */
function getUserProfile() {
  return new Promise((resolve, reject) => {
    wx.getUserProfile({
      desc: '用于完善用户资料',
      success: (res) => {
        resolve(res.userInfo)
      },
      fail: (error) => {
        reject(error)
      }
    })
  })
}

// 使用 CommonJS 语法导出函数
module.exports = {
  getOpenId,
  userLogin,
  getUserInfo,
  isLoggedIn,
  logout,
  wxLogin,
  getUserProfile
}