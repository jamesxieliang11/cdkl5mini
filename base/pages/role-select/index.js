const app = getApp()
const { wxLogin } = require('../../utils/user.js')

Page({
  data: {
    loading: false
  },

  onLoad: function (options) {
    console.log('角色选择页面加载')
  },

  // 选择角色
  async selectRole(e) {
    if (this.data.loading) return
    
    const role = e.currentTarget.dataset.role
    console.log('选择角色:', role)
    
    try {
      this.setData({ loading: true })
      
      // 执行完整的登录流程
      const loginResult = await wxLogin(role)
      
      // 保存角色到全局数据（保持兼容性）
      app.setUserRole(role)
      
      // 更新全局用户信息
      app.globalData.userInfo = loginResult.data
      app.globalData.openid = loginResult.data.openid
      
      console.log('登录成功:', loginResult)
      
      // 显示成功提示
      wx.showToast({
        title: this.getRoleText(role) + '身份设置成功',
        icon: 'success',
        duration: 1500
      })

      // 延迟跳转到首页
      setTimeout(() => {
        wx.switchTab({
          url: '/pages/home/index'
        })
      }, 1500)
      
    } catch (error) {
      console.error('角色选择和登录失败:', error)
      
      // 如果是用户取消授权，不显示错误提示
      if (error.message && error.message.includes('cancel')) {
        wx.showToast({
          title: '需要授权才能继续使用',
          icon: 'none',
          duration: 2000
        })
      } else {
        wx.showToast({
          title: '登录失败，请重试',
          icon: 'error',
          duration: 2000
        })
      }
    } finally {
      this.setData({ loading: false })
    }
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