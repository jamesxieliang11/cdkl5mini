App({
  globalData: {
    userRole: '', // 用户角色：patient（病友家庭）、staff（工作人员）、researcher（科研人员）
    userInfo: null,
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

    // 登录
    wx.login({
      success: res => {
        // 发送 res.code 到后台换取 openId, sessionKey, unionId
      }
    })

    // 检查用户是否已选择角色
    const userRole = wx.getStorageSync('userRole')
    if (userRole) {
      this.globalData.userRole = userRole
    } else {
      // 首次进入，跳转到角色选择页面
      wx.reLaunch({
        url: '/pages/role-select/index'
      })
    }

    // 获取收藏的议程
    const favoriteSchedules = wx.getStorageSync('favoriteSchedules') || []
    this.globalData.favoriteSchedules = favoriteSchedules
  },

  onShow: function () {
    // 检查是否有新消息
    this.checkNewMessages()
  },

  // 设置用户角色
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