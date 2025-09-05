const app = getApp()

Page({
  data: {
    myAppointment: null, // 我的预约信息
    
    departments: [
      {
        id: 1,
        name: '神经内科',
        doctor: '陈黎主任',
        time: '09:00-12:00',
        icon: 'medical-o',
        color: '#1989fa',
        queueCount: 8,
        description: '主治CDKL5缺陷障碍、儿童癫痫等神经系统疾病'
      },
      {
        id: 2,
        name: '脑电图检查',
        doctor: '王医生',
        time: '14:00-17:00',
        icon: 'chart-trending-o',
        color: '#07c160',
        queueCount: 5,
        description: '提供专业的脑电图检查和分析服务'
      },
      {
        id: 3,
        name: '康复咨询',
        doctor: '李治疗师',
        time: '15:00-16:30',
        icon: 'like-o',
        color: '#ff976a',
        queueCount: 12,
        description: '儿童神经康复、运动治疗指导'
      },
      {
        id: 4,
        name: '遗传咨询',
        doctor: '张教授',
        time: '10:00-11:30',
        icon: 'records',
        color: '#ed6a0c',
        queueCount: 3,
        description: '基因检测咨询、遗传病风险评估'
      }
    ]
  },

  onLoad: function (options) {
    console.log('义诊预约页面加载')
    this.checkMyAppointment()
  },

  onShow: function () {
    this.checkMyAppointment()
    this.updateQueueStatus()
    // 设置自定义tabbar状态
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      // this.getTabBar().setActive('appointment')
    }
  },

  // 检查我的预约
  checkMyAppointment: function() {
    const appointment = wx.getStorageSync('myAppointment')
    if (appointment) {
      this.setData({
        myAppointment: appointment
      })
    }
  },

  // 更新排队状态
  updateQueueStatus: function() {
    // 模拟更新排队人数
    const departments = this.data.departments.map(dept => {
      // 随机变化排队人数（模拟实时更新）
      const change = Math.floor(Math.random() * 3) - 1 // -1, 0, 1
      dept.queueCount = Math.max(0, dept.queueCount + change)
      return dept
    })
    
    this.setData({
      departments: departments
    })
  },

  // 选择科室
  selectDepartment: function(e) {
    const department = e.currentTarget.dataset.department
    
    // 检查是否已有预约
    if (this.data.myAppointment) {
      wx.showModal({
        title: '提示',
        content: '您已有预约，是否取消当前预约并重新预约？',
        success: (res) => {
          if (res.confirm) {
            this.cancelAppointment(() => {
              this.goToAppointmentForm(department)
            })
          }
        }
      })
      return
    }

    this.goToAppointmentForm(department)
  },

  // 跳转到预约表单
  goToAppointmentForm: function(department) {
    const departmentData = encodeURIComponent(JSON.stringify(department))
    wx.navigateTo({
      url: `/pages/appointment-form/index?department=${departmentData}`
    })
  },

  // 获取状态文本
  getStatusText: function(status) {
    const statusMap = {
      'waiting': '排队中',
      'calling': '正在叫号',
      'finished': '已完成',
      'cancelled': '已取消'
    }
    return statusMap[status] || '未知状态'
  },

  // 查看排队状态
  checkQueue: function() {
    if (!this.data.myAppointment) {
      wx.showToast({
        title: '暂无预约信息',
        icon: 'none'
      })
      return
    }

    wx.navigateTo({
      url: '/pages/queue-status/index'
    })
  },

  // 取消预约
  cancelAppointment: function(callback) {
    wx.showModal({
      title: '取消预约',
      content: '确定要取消当前预约吗？',
      success: (res) => {
        if (res.confirm) {
          // 清除预约信息
          wx.removeStorageSync('myAppointment')
          app.globalData.queueNumber = ''
          
          this.setData({
            myAppointment: null
          })

          wx.showToast({
            title: '预约已取消',
            icon: 'success'
          })

          // 执行回调
          if (callback && typeof callback === 'function') {
            callback()
          }
        }
      }
    })
  },

  // 联系社工
  contactSocialWorker: function() {
    wx.showModal({
      title: '联系小马甲义工',
      content: '小马甲义工可协助您办理住院手续、提供就医指导。是否拨打服务电话：138-0000-0000？',
      success: (res) => {
        if (res.confirm) {
          wx.makePhoneCall({
            phoneNumber: '138-0000-0000',
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

  // 拨打咨询热线
  callHotline: function() {
    wx.makePhoneCall({
      phoneNumber: '400-123-4567',
      fail: () => {
        wx.showToast({
          title: '拨号失败',
          icon: 'error'
        })
      }
    })
  },

  // 拨打医院总机
  callHospital: function() {
    wx.makePhoneCall({
      phoneNumber: '0755-83936999',
      fail: () => {
        wx.showToast({
          title: '拨号失败',
          icon: 'error'
        })
      }
    })
  },

  // 打开地图导航
  openMap: function() {
    wx.openLocation({
      latitude: 22.5431,
      longitude: 114.0579,
      name: '深圳市儿童医院',
      address: '广东省深圳市福田区益田路7019号',
      fail: () => {
        wx.showToast({
          title: '打开地图失败',
          icon: 'error'
        })
      }
    })
  },

  // 页面下拉刷新
  onPullDownRefresh: function() {
    this.updateQueueStatus()
    this.checkMyAppointment()
    
    setTimeout(() => {
      wx.stopPullDownRefresh()
    }, 1000)
  }
})