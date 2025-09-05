// 个人主页 - 用户信息管理
const app = getApp()

Page({
  data: {
    userRole: '',
    roleText: '',
    userInfo: {},
    // 简单信息（工作人员/科研人员）
    simpleInfo: {
      name: '',
      phone: ''
    },
    // 完整信息（病友家庭）
    patientInfo: {
      babyName: '',
      babyBirthday: '',
      parentName: '',
      parentPhone: '',
      relationship: '父亲'
    },
    loading: false,
    editing: false,
    hasCompleteProfile: false
  },

  onLoad() {
    this.initUserInfo()
  },

  onShow() {
    // 通知tabbar组件更新状态（基于当前页面URL）
    this.updateTabBarState()
    // 每次显示时刷新用户信息
    this.initUserInfo()
  },

  // 更新tabbar状态
  updateTabBarState: function() {
    if (typeof this.getTabBar === 'function') {
      const tabBar = this.getTabBar()
      if (tabBar && typeof tabBar.updateState === 'function') {
        // 触发tabbar组件根据当前页面更新状态
        tabBar.updateState()
      }
    }
  },

  // 初始化用户信息
  async initUserInfo() {
    try {
      const userRole = app.globalData.userRole || wx.getStorageSync('userRole')
      const userInfo = app.globalData.userInfo || {}
      
      this.setData({
        userRole: userRole,
        roleText: this.getRoleText(userRole),
        userInfo: userInfo,
        hasCompleteProfile: userInfo.hasCompleteProfile || false
      })

      // 加载详细用户信息
      await this.loadUserProfile()
    } catch (error) {
      console.error('初始化用户信息失败:', error)
    }
  },

  // 获取角色文本
  getRoleText: function(role) {
    const roleMap = {
      'patient': '病友家庭',
      'researcher': '科研人员',
      'staff': '工作人员'
    }
    return roleMap[role] || '未知角色'
  },

  // 加载用户详细信息
  async loadUserProfile() {
    try {
      const res = await wx.cloud.callFunction({
        name: 'getUserProfile',
        data: {}
      })

      if (res.result && res.result.success) {
        const userData = res.result.data
        
        if (this.data.userRole === 'patient') {
          // 病友家庭 - 显示完整信息
          if (userData.patientInfo) {
            this.setData({
              patientInfo: userData.patientInfo,
              hasCompleteProfile: true
            })
          }
        } else {
          // 工作人员/科研人员 - 显示简单信息
          this.setData({
            simpleInfo: {
              name: userData.nickName || userData.simpleInfo?.name || '',
              phone: userData.simpleInfo?.phone || ''
            },
            hasCompleteProfile: !!(userData.simpleInfo?.name && userData.simpleInfo?.phone)
          })
        }
      }
    } catch (error) {
      console.error('加载用户信息失败:', error)
    }
  },

  // 开始编辑
  startEdit() {
    this.setData({ editing: true })
  },

  // 取消编辑
  cancelEdit() {
    this.setData({ editing: false })
    // 重新加载数据，恢复原始状态
    this.loadUserProfile()
  },

  // 输入姓名
  onNameInput(e) {
    this.setData({
      'simpleInfo.name': e.detail.value
    })
  },

  // 输入电话
  onPhoneInput(e) {
    this.setData({
      'simpleInfo.phone': e.detail.value
    })
  },

  // 保存简单信息（工作人员/科研人员）
  async saveSimpleInfo() {
    const { simpleInfo } = this.data
    
    // 表单验证
    if (!simpleInfo.name.trim()) {
      wx.showToast({
        title: '请输入姓名',
        icon: 'error'
      })
      return
    }

    if (!simpleInfo.phone.trim()) {
      wx.showToast({
        title: '请输入联系电话',
        icon: 'error'
      })
      return
    }

    if (!/^1[3-9]\d{9}$/.test(simpleInfo.phone)) {
      wx.showToast({
        title: '请输入正确的手机号',
        icon: 'error'
      })
      return
    }

    try {
      this.setData({ loading: true })
      wx.showLoading({ title: '保存中...' })

      const res = await wx.cloud.callFunction({
        name: 'updateSimpleProfile',
        data: {
          simpleInfo: simpleInfo
        }
      })

      if (res.result && res.result.success) {
        wx.showToast({
          title: '保存成功',
          icon: 'success'
        })

        this.setData({
          editing: false,
          hasCompleteProfile: true
        })

        // 更新全局用户信息
        if (app.globalData.userInfo) {
          app.globalData.userInfo.hasCompleteProfile = true
          app.globalData.userInfo.nickName = simpleInfo.name
        }
      } else {
        throw new Error(res.result?.message || '保存失败')
      }
    } catch (error) {
      console.error('保存用户信息失败:', error)
      wx.showToast({
        title: error.message || '保存失败',
        icon: 'error'
      })
    } finally {
      this.setData({ loading: false })
      wx.hideLoading()
    }
  },

  // 跳转到完整信息编辑页面（病友家庭）
  goToCompleteProfile() {
    wx.navigateTo({
      url: '/pages/user-profile/index'
    })
  },

  // 退出登录
  logout() {
    wx.showModal({
      title: '确认退出',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          // 清除用户信息
          wx.removeStorageSync('userInfo')
          wx.removeStorageSync('openid')
          wx.removeStorageSync('userRole')
          
          // 清除全局数据
          app.globalData.userInfo = null
          app.globalData.userRole = ''
          app.globalData.openid = ''
          
          wx.showToast({
            title: '已退出登录',
            icon: 'success'
          })

          // 跳转到角色选择页面
          setTimeout(() => {
            wx.reLaunch({
              url: '/pages/role-select/index'
            })
          }, 1500)
        }
      }
    })
  }
})