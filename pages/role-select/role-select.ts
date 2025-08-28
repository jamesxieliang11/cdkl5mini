// pages/role-select/role-select.ts
const app = getApp<IApp>()

Page({
  data: {},

  onLoad() {
    // 如果已经选择过角色，直接跳转到首页
    const userRole = wx.getStorageSync('userRole')
    if (userRole) {
      wx.switchTab({
        url: '/pages/index/index'
      })
    }
  },

  selectRole(e: WechatMiniprogram.BaseEvent) {
    const role = e.currentTarget.dataset.role
    
    // 保存用户角色
    wx.setStorageSync('userRole', role)
    app.globalData.userRole = role

    // 显示选择成功提示
    wx.showToast({
      title: '身份设置成功',
      icon: 'success',
      duration: 1500
    })

    // 延迟跳转到首页
    setTimeout(() => {
      wx.switchTab({
        url: '/pages/index/index'
      })
    }, 1500)
  }
})
