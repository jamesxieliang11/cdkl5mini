const { wxLogin, getUserInfo, isLoggedIn } = require('./utils/user.js')

App({
  globalData: {
    userRole: '', // 用户角色：patient（病友家庭）、staff（工作人员）、researcher（科研人员）
    userInfo: null,
    openid: '', // 用户openid
    queueNumber: '', // 排队号
    favoriteSchedules: [], // 收藏的议程
    hasNewMessage: false // 是否有新消息
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
  },

  onShow: function () {
    // 检查是否有新消息
    this.checkNewMessages()
  },

  // 初始化用户登录状态
  async initUserLogin() {
    try {
      // 检查本地是否有用户信息
      const localUserInfo = getUserInfo()
      
      if (localUserInfo.openid && localUserInfo.userRole) {
        // 本地有用户信息，恢复到全局数据
        this.globalData.userInfo = localUserInfo.userInfo
        this.globalData.userRole = localUserInfo.userRole
        this.globalData.openid = localUserInfo.openid
        
        console.log('用户已登录:', localUserInfo)
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

  // 执行登录
  async performLogin(userRole = 'patient') {
    try {
      const loginResult = await wxLogin(userRole)
      
      // 更新全局数据
      this.globalData.userInfo = loginResult.data
      this.globalData.userRole = loginResult.data.userRole
      this.globalData.openid = loginResult.data.openid
      
      console.log('登录成功:', loginResult)
      
      return loginResult
    } catch (error) {
      console.error('登录失败:', error)
      throw error
    }
  },

  // 设置用户角色（保持兼容性）
  setUserRole: function(role) {
    this.globalData.userRole = role
    wx.setStorageSync('userRole', role)
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