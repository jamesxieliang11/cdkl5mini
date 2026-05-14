const { wxLogin, getUserInfo, isLoggedIn } = require('./utils/user.js')
const { getAppConfig, checkQuestionnaireSubmitted } = require('./utils/database.js')

App({
  globalData: {
    userRole: '', // 用户角色：patient（病友家庭）、staff（工作人员）、researcher（科研人员）
    userInfo: null,
    openid: '', // 用户openid
    queueNumber: '', // 排队号
    favoriteSchedules: [], // 收藏的议程
    hasNewMessage: false, // 是否有新消息
    // 应用功能配置（从云端拉取，本地缓存兜底，默认全关闭）
    appConfig: {
      features_enabled: false
    }
  },

  onLaunch() {
    // 初始化云开发
    if (wx.cloud) {
      wx.cloud.init({
        // env 参数说明：
        //   env 参数决定接下来小程序发起的云开发调用（wx.cloud.xxx）会默认请求到哪个云环境的资源
        //   此处请填入环境 ID, 环境 ID 可打开云控制台查看
        //   如不填则使用默认环境（第一个创建的环境）
        env: 'cloud1-4g0dlvsdc0db6c89', // 请替换为您的云环境ID
        traceUser: true,
      })
    }

    // 展示本地存储能力
    const logs = wx.getStorageSync('logs') || []
    logs.unshift(Date.now())
    wx.setStorageSync('logs', logs)

    // 初始化用户登录状态
    this.initUserLogin()

    // 获取收藏的议程
    const favoriteSchedules = wx.getStorageSync('favoriteSchedules') || []
    this.globalData.favoriteSchedules = favoriteSchedules

    // 初始化应用配置：先从本地缓存恢复，再静默拉取远端并更新
    this.initAppConfig()
  },

  onShow: function () {
    // 检查是否有新消息
    this.checkNewMessages()
    // 检查月度汇报提醒
    this.checkMonthlyReportReminder()
  },

  // 初始化应用配置：先从本地缓存恢复，再静默拉取远端并更新
  initAppConfig() {
    const APP_CONFIG_CACHE_KEY = 'appConfig'
    const DEFAULT_CONFIG = { features_enabled: false }

    // 先从本地缓存恢复，默认关闭所有功能
    const cachedConfig = wx.getStorageSync(APP_CONFIG_CACHE_KEY) || DEFAULT_CONFIG
    this.globalData.appConfig = { features_enabled: !!cachedConfig.features_enabled }

    // 静默拉取远端配置，有变化才更新
    getAppConfig().then(result => {
      if (!result || !result.data) return
      const remoteFeaturesEnabled = !!result.data.features_enabled
      if (remoteFeaturesEnabled !== this.globalData.appConfig.features_enabled) {
        const newConfig = { features_enabled: remoteFeaturesEnabled }
        this.globalData.appConfig = newConfig
        wx.setStorageSync(APP_CONFIG_CACHE_KEY, newConfig)
        console.log('[AppConfig] 配置已更新:', newConfig)
      }
      // 如果总开关关闭，检查用户是否已认领问卷，已认领则视为开启
      if (!this.globalData.appConfig.features_enabled) {
        this.checkQuestionnaireOverride()
      }
    }).catch(err => {
      console.log('[AppConfig] 拉取远端配置失败，使用本地缓存:', err.message)
      // 本地缓存也是关闭的，同样检查问卷状态
      if (!this.globalData.appConfig.features_enabled) {
        this.checkQuestionnaireOverride()
      }
    })
  },

  // 已认领问卷时覆盖功能开关为开启状态
  checkQuestionnaireOverride() {
    checkQuestionnaireSubmitted().then(result => {
      if (result && result.data && result.data.submitted) {
        console.log('[AppConfig] 用户已认领问卷，功能开关覆盖为开启')
        this.globalData.appConfig = { features_enabled: true }
      }
    }).catch(err => {
      console.log('[AppConfig] 检查问卷状态失败:', err.message)
    })
  },

  // 初始化用户登录状态
  async initUserLogin() {
    try {
      // 检查本地是否有用户信息
      const localUserInfo = getUserInfo()
      
      if (localUserInfo.openid && localUserInfo.userRole && wx.getStorageSync('userId')) {
        // 本地有用户信息，恢复到全局数据
        this.globalData.userInfo = localUserInfo.userInfo
        this.globalData.userRole = localUserInfo.userRole
        this.globalData.openid = localUserInfo.openid
        this.globalData.adminRole = localUserInfo.adminRole || ''
        
        console.log('用户已登录:', localUserInfo)
        
        // 后台静默刷新登录信息（确保 adminRole 等字段同步最新）
        this.performLogin(localUserInfo.userRole, false)
      } else {
        // 本地没有用户信息，需要登录
        console.log('用户未登录，执行登录')
        
        // 直接执行登录，默认使用 patient 角色
        await this.performLogin('patient')
      }
    } catch (error) {
      console.error('初始化用户登录状态失败:', error)
      // 出错时也尝试执行登录
      try {
        await this.performLogin('patient')
      } catch (loginError) {
        console.error('登录失败:', loginError)
        wx.showToast({
          title: '登录失败，请重试',
          icon: 'error'
        })
      }
    }
  },

  // 执行登录（silent=true 时不显示 loading/toast）
  async performLogin(userRole = 'patient', silent = false) {
    try {
      const loginResult = await wxLogin(userRole, false, silent)
      
      // 更新全局数据
      this.globalData.userInfo = loginResult.data
      this.globalData.userRole = loginResult.data.userRole
      this.globalData.openid = loginResult.data.openid
      this.globalData.userId = loginResult.data._id
      this.globalData.adminRole = loginResult.data.adminRole || ''
      
      console.log('登录成功, adminRole:', loginResult.data.adminRole)
      
      return loginResult
    } catch (error) {
      console.error('登录失败:', error)
      if (!silent) throw error
    }
  },

  // 设置用户角色（保持兼容性）
  setUserRole: function(role) {
    this.globalData.userRole = role
    wx.setStorageSync('userRole', role)
  },

  // 检查月度汇报提醒（每月25号之后弹窗提醒）
  checkMonthlyReportReminder: function() {
    const now = new Date()
    const dayOfMonth = now.getDate()

    // 每月25号之后才提醒
    if (dayOfMonth < 25) return

    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    const lastReminder = wx.getStorageSync('lastMonthlyReminder')

    // 同一月份只提醒一次弹窗
    if (lastReminder === currentMonth) return

    // 调用云函数检查本月是否已提交
    wx.cloud.callFunction({
      name: 'monthlyReport',
      data: {
        action: 'checkMonthSubmitted',
        month: currentMonth,
        userId: wx.getStorageSync('userId') || 'default_user'
      },
      success: (res) => {
        if (res.result && res.result.success && !res.result.data.submitted) {
          wx.showModal({
            title: '月度汇报提醒',
            content: '本月的用药和发作汇报还未提交，是否现在填写？',
            confirmText: '去填写',
            cancelText: '稍后',
            success: (modalRes) => {
              if (modalRes.confirm) {
                wx.navigateTo({ url: '/pages/monthly-report/index' })
              }
              wx.setStorageSync('lastMonthlyReminder', currentMonth)
            }
          })
        }
      },
      fail: (error) => {
        console.warn('检查月度汇报状态失败:', error)
      }
    })
  },

  // 检查新消息
  checkNewMessages: function() {
    // 这里可以调用后端API检查新消息
    // 暂时用本地存储模拟
    const lastCheckTime = wx.getStorageSync('lastCheckTime') || 0
    const currentTime = Date.now()
    
    // 模拟：如果超过5分钟没检查，就认为有新消息
    if (currentTime - lastCheckTime > 5 * 60 * 1000) {
      this.globalData.hasNewMessage = true
    }
  },

  // 添加收藏议程
  addFavoriteSchedule: function(scheduleId) {
    if (!this.globalData.favoriteSchedules.includes(scheduleId)) {
      this.globalData.favoriteSchedules.push(scheduleId)
      wx.setStorageSync('favoriteSchedules', this.globalData.favoriteSchedules)
    }
  },

  // 移除收藏议程
  removeFavoriteSchedule: function(scheduleId) {
    const index = this.globalData.favoriteSchedules.indexOf(scheduleId)
    if (index > -1) {
      this.globalData.favoriteSchedules.splice(index, 1)
      wx.setStorageSync('favoriteSchedules', this.globalData.favoriteSchedules)
    }
  }
})