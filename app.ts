// app.ts
interface IAppOption {
  globalData: {
    userInfo?: WechatMiniprogram.UserInfo
    userRole?: 'patient' | 'staff' | 'researcher'
    openid?: string
  }
  userInfoReadyCallback?: WechatMiniprogram.GetUserInfoSuccessCallback
}

App<IAppOption>({
  globalData: {},
  
  onLaunch() {
    // 初始化云开发
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力')
    } else {
      wx.cloud.init({
        env: 'your-cloud-env-id', // 替换为你的云环境ID
        traceUser: true,
      })
    }

    // 检查用户角色选择状态
    const userRole = wx.getStorageSync('userRole')
    if (userRole) {
      this.globalData.userRole = userRole
    }

    // 获取用户openid
    this.getOpenId()
  },

  async getOpenId() {
    try {
      const res = await wx.cloud.callFunction({
        name: 'getOpenId'
      })
      this.globalData.openid = res.result.openid
    } catch (error) {
      console.error('获取openid失败', error)
    }
  }
})
