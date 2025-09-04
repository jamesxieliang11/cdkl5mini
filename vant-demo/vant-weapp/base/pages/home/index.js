const app = getApp()

Page({
  data: {
    userRole: '',
    roleText: '',
    noticeText: '欢迎参加CDKL5大会！请关注最新议程安排。',
    
    // 病友家庭数据
    patientSchedule: [
      {
        id: 1,
        department: '神经内科义诊',
        time: '09:00-12:00',
        doctor: '陈黎主任',
        status: '进行中',
        icon: 'medical-o'
      },
      {
        id: 2,
        department: '脑电图检查',
        time: '14:00-17:00',
        doctor: '王医生',
        status: '可预约',
        icon: 'chart-trending-o'
      },
      {
        id: 3,
        department: '康复咨询',
        time: '15:00-16:30',
        doctor: '李治疗师',
        status: '可预约',
        icon: 'like-o'
      }
    ],

    // 科研人员数据
    researcherFocus: [
      {
        id: 1,
        title: '加奈索龙临床应用研究',
        speaker: '陈黎教授',
        time: '明天 14:30'
      },
      {
        id: 2,
        title: 'CDKL5基因治疗进展',
        speaker: '张教授',
        time: '后天 10:00'
      },
      {
        id: 3,
        title: '罕见病诊疗规范',
        speaker: '李主任',
        time: '后天 15:30'
      }
    ],

    // 工作人员数据
    staffTasks: [
      {
        id: 1,
        task: '义诊现场签到管理',
        deadline: '今天 08:30',
        status: '进行中',
        priority: 'high'
      },
      {
        id: 2,
        task: '会议资料分发',
        deadline: '今天 13:00',
        status: '待开始',
        priority: 'normal'
      },
      {
        id: 3,
        task: '晚宴座位安排',
        deadline: '今天 17:00',
        status: '待开始',
        priority: 'normal'
      }
    ]
  },

  onLoad: function (options) {
    console.log('首页加载')
    this.initUserRole()
  },

  onShow: function () {
    // 每次显示页面时更新用户角色
    this.initUserRole()
    // 检查新消息
    this.checkMessages()
    // 设置自定义tabbar状态
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      // this.getTabBar().setActive('home')
    }
  },

  // 初始化用户角色
  initUserRole: function() {
    const userRole = app.globalData.userRole || wx.getStorageSync('userRole')
    if (!userRole) {
      // 如果没有角色，跳转到角色选择页面
      wx.reLaunch({
        url: '/pages/role-select/index'
      })
      return
    }

    this.setData({
      userRole: userRole,
      roleText: this.getRoleText(userRole)
    })

    // 根据角色设置不同的通知内容
    this.setNoticeByRole(userRole)
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

  // 根据角色设置通知
  setNoticeByRole: function(role) {
    const noticeMap = {
      'patient': '今日义诊正在进行中，请关注排队状态。如有紧急情况请点击紧急联系。',
      'researcher': '会议资料已更新，请及时下载。专家交流群已开放，欢迎加入讨论。',
      'staff': '请注意今日工作安排，及时完成签到管理和任务分配工作。'
    }
    
    this.setData({
      noticeText: noticeMap[role] || '欢迎参加CDKL5大会！'
    })
  },

  // 检查消息
  checkMessages: function() {
    // 这里可以调用后端API检查新消息
    // 暂时模拟检查逻辑
    const hasNewMessage = app.globalData.hasNewMessage
    if (hasNewMessage) {
      wx.showTabBarRedDot({
        index: 4 // 消息tab的索引
      })
    }
  },

  // 切换角色
  changeRole: function() {
    wx.showModal({
      title: '切换身份',
      content: '确定要重新选择身份吗？',
      success: (res) => {
        if (res.confirm) {
          // 清除角色信息
          app.globalData.userRole = ''
          wx.removeStorageSync('userRole')
          
          // 跳转到角色选择页面
          wx.reLaunch({
            url: '/pages/role-select/index'
          })
        }
      }
    })
  },

  // 紧急联系
  emergencyCall: function() {
    wx.showModal({
      title: '紧急联系',
      content: '是否拨打24小时医疗咨询热线：400-123-4567？',
      success: (res) => {
        if (res.confirm) {
          wx.makePhoneCall({
            phoneNumber: '400-123-4567',
            fail: () => {
              wx.showToast({
                title: '拨号失败',
                icon: 'error'
              })
            }
          })
        }
      }
    })
  },

  // 导航方法
  goToAppointment: function() {
    wx.switchTab({
      url: '/pages/appointment/index'
    })
  },

  goToSchedule: function() {
    wx.switchTab({
      url: '/pages/schedule/index'
    })
  },

  goToMessages: function() {
    wx.switchTab({
      url: '/pages/messages/index'
    })
  },

  goToTools: function() {
    wx.switchTab({
      url: '/pages/tools/index'
    })
  },

  goToInsurance: function() {
    wx.navigateTo({
      url: '/pages/tools/index?tab=insurance'
    })
  },

  goToQueue: function() {
    wx.navigateTo({
      url: '/pages/queue-status/index'
    })
  },

  goToSocialWork: function() {
    wx.showModal({
      title: '社工服务',
      content: '是否联系"小马甲"义工协调住院事宜？',
      success: (res) => {
        if (res.confirm) {
          wx.makePhoneCall({
            phoneNumber: '138-0000-0000'
          })
        }
      }
    })
  },

  goToMaterials: function() {
    wx.navigateTo({
      url: '/pages/tools/index?tab=materials'
    })
  },

  goToExperts: function() {
    wx.navigateTo({
      url: '/pages/tools/index?tab=experts'
    })
  },

  goToDiscussion: function() {
    wx.showToast({
      title: '功能开发中',
      icon: 'none'
    })
  },

  goToCheckin: function() {
    wx.showToast({
      title: '功能开发中',
      icon: 'none'
    })
  },

  goToTasks: function() {
    wx.showToast({
      title: '功能开发中',
      icon: 'none'
    })
  },

  goToStats: function() {
    wx.showToast({
      title: '功能开发中',
      icon: 'none'
    })
  },

  goToSettings: function() {
    wx.showToast({
      title: '功能开发中',
      icon: 'none'
    })
  },

  goToHelp: function() {
    wx.showModal({
      title: '帮助中心',
      content: '如需帮助，请联系大会组委会：\n电话：021-12345678\n邮箱：help@cdkl5.org',
      showCancel: false
    })
  },

  goToScheduleDetail: function(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/expert-detail/index?scheduleId=${id}`
    })
  },

  goToTaskDetail: function(e) {
    const id = e.currentTarget.dataset.id
    wx.showToast({
      title: '任务详情功能开发中',
      icon: 'none'
    })
  }
})