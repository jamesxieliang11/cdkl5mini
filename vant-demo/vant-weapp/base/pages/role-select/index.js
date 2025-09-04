const app = getApp()

Page({
  data: {},

  onLoad: function (options) {
    console.log('角色选择页面加载')
  },

  // 选择角色
  selectRole: function(e) {
    const role = e.currentTarget.dataset.role
    console.log('选择角色:', role)
    
    // 保存角色到全局数据和本地存储
    app.setUserRole(role)
    
    // 显示选择成功提示
    wx.showToast({
      title: this.getRoleText(role) + '身份已设置',
      icon: 'success',
      duration: 1500
    })

    // 延迟跳转到首页
    setTimeout(() => {
      wx.switchTab({
        url: '/pages/home/index'
      })
    }, 1500)
  },

  // 获取角色文本
  getRoleText: function(role) {
    const roleMap = {
      'patient': '病友家庭',
      'researcher': '科研人员', 
      'staff': '工作人员'
    }
    return roleMap[role] || '未知'
  }
})