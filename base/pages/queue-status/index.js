// pages/queue-status/index.js
const app = getApp()

Page({
  /**
   * 页面的初始数据
   */
  data: {
    // 排队信息
    queueInfo: {
      queueNumber: '', // 我的排队号
      currentNumber: '', // 当前叫号
      waitingCount: 0, // 前面等待人数
      estimatedTime: 0, // 预计等待时间（分钟）
      status: 'waiting' // waiting, calling, finished, cancelled
    },
    
    // 预约信息
    appointmentInfo: {
      patientName: '',
      department: '',
      doctorName: '',
      appointmentTime: '',
      symptoms: ''
    },
    
    // 页面状态
    isLoading: true,
    updateTimer: null,
    
    // 状态文本映射
    statusTextMap: {
      'waiting': '排队中',
      'calling': '正在叫号',
      'finished': '已完成',
      'cancelled': '已取消'
    },
    
    // 状态颜色映射
    statusColorMap: {
      'waiting': '#1989fa',
      'calling': '#ff6b35',
      'finished': '#07c160',
      'cancelled': '#ee0a24'
    }
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    // 获取传入的预约ID或排队号
    const { appointmentId, queueNumber } = options
    
    if (appointmentId) {
      this.loadAppointmentInfo(appointmentId)
    } else if (queueNumber) {
      this.setData({
        'queueInfo.queueNumber': queueNumber
      })
    }
    
    this.loadQueueStatus()
    this.startUpdateTimer()
  },

  // 返回按钮点击处理
  onBack: function() {
    wx.navigateBack()
  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {
    // 页面显示时刷新状态
    this.loadQueueStatus()
    if (!this.data.updateTimer) {
      this.startUpdateTimer()
    }
  },

  /**
   * 生命周期函数--监听页面隐藏
   */
  onHide() {
    // 页面隐藏时停止定时器
    this.stopUpdateTimer()
  },

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload() {
    // 页面卸载时清理定时器
    this.stopUpdateTimer()
  },

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh() {
    this.loadQueueStatus().then(() => {
      wx.stopPullDownRefresh()
    })
  },

  // 加载预约信息
  async loadAppointmentInfo(appointmentId) {
    try {
      // 从本地存储获取预约信息
      const myAppointment = wx.getStorageSync('myAppointment')
      if (myAppointment && myAppointment.id === appointmentId) {
        this.setData({
          appointmentInfo: {
            patientName: myAppointment.patientName,
            department: myAppointment.department.name,
            doctorName: myAppointment.doctorName || '待分配',
            appointmentTime: myAppointment.appointmentTime,
            symptoms: myAppointment.symptoms
          },
          'queueInfo.queueNumber': myAppointment.queueNumber || ''
        })
      }
    } catch (error) {
      console.error('加载预约信息失败:', error)
    }
  },

  // 加载排队状态
  async loadQueueStatus() {
    try {
      this.setData({ isLoading: true })
      
      // 模拟从服务器获取排队状态
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // 模拟排队数据
      const mockQueueData = this.generateMockQueueData()
      
      this.setData({
        queueInfo: {
          ...this.data.queueInfo,
          ...mockQueueData
        },
        isLoading: false
      })
      
    } catch (error) {
      console.error('加载排队状态失败:', error)
      this.setData({ isLoading: false })
      wx.showToast({
        title: '加载失败，请重试',
        icon: 'error'
      })
    }
  },

  // 生成模拟排队数据
  generateMockQueueData() {
    const { queueNumber } = this.data.queueInfo
    const currentQueueNumber = queueNumber || 'A001'
    
    // 解析排队号
    const prefix = currentQueueNumber.charAt(0)
    const number = parseInt(currentQueueNumber.slice(1))
    
    // 模拟当前叫号（比我的号码小1-5个号）
    const currentNumberOffset = Math.floor(Math.random() * 5) + 1
    const currentNumber = number - currentNumberOffset
    const currentNumberStr = currentNumber > 0 ? `${prefix}${String(currentNumber).padStart(3, '0')}` : `${prefix}001`
    
    // 计算等待人数
    const waitingCount = Math.max(0, number - currentNumber - 1)
    
    // 计算预计等待时间（每人约5-10分钟）
    const estimatedTime = waitingCount * (Math.floor(Math.random() * 6) + 5)
    
    // 根据等待人数确定状态
    let status = 'waiting'
    if (waitingCount === 0) {
      status = Math.random() > 0.5 ? 'calling' : 'waiting'
    }
    
    return {
      queueNumber: currentQueueNumber,
      currentNumber: currentNumberStr,
      waitingCount,
      estimatedTime,
      status
    }
  },

  // 开始定时更新
  startUpdateTimer() {
    // 每30秒更新一次排队状态
    const timer = setInterval(() => {
      this.loadQueueStatus()
    }, 30000)
    
    this.setData({
      updateTimer: timer
    })
  },

  // 停止定时更新
  stopUpdateTimer() {
    const { updateTimer } = this.data
    if (updateTimer) {
      clearInterval(updateTimer)
      this.setData({
        updateTimer: null
      })
    }
  },

  // 取消排队
  cancelQueue() {
    wx.showModal({
      title: '取消排队',
      content: '确定要取消当前排队吗？取消后需要重新预约。',
      confirmColor: '#ee0a24',
      success: (res) => {
        if (res.confirm) {
          this.performCancelQueue()
        }
      }
    })
  },

  // 执行取消排队
  async performCancelQueue() {
    try {
      wx.showLoading({ title: '取消中...' })
      
      // 模拟取消请求
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      // 更新状态
      this.setData({
        'queueInfo.status': 'cancelled'
      })
      
      // 清除本地预约信息
      wx.removeStorageSync('myAppointment')
      app.globalData.queueNumber = ''
      
      wx.showToast({
        title: '已取消排队',
        icon: 'success'
      })
      
      // 2秒后返回上一页
      setTimeout(() => {
        wx.navigateBack()
      }, 2000)
      
    } catch (error) {
      console.error('取消排队失败:', error)
      wx.showToast({
        title: '取消失败，请重试',
        icon: 'error'
      })
    } finally {
      wx.hideLoading()
    }
  },

  // 刷新状态
  refreshStatus() {
    this.loadQueueStatus()
  },

  // 联系医院
  contactHospital() {
    wx.showActionSheet({
      itemList: ['拨打医院电话', '查看医院地址'],
      success: (res) => {
        if (res.tapIndex === 0) {
          // 拨打电话
          wx.makePhoneCall({
            phoneNumber: '0755-83936999',
            fail: () => {
              wx.showToast({
                title: '拨号失败',
                icon: 'error'
              })
            }
          })
        } else if (res.tapIndex === 1) {
          // 查看地址
          wx.showModal({
            title: '医院地址',
            content: '深圳市福田区益田路7019号\n深圳市儿童医院',
            showCancel: false
          })
        }
      }
    })
  },

  // 查看预约详情
  viewAppointmentDetail() {
    const { appointmentInfo } = this.data
    const content = `患者：${appointmentInfo.patientName}\n科室：${appointmentInfo.department}\n医生：${appointmentInfo.doctorName}\n时间：${appointmentInfo.appointmentTime}\n症状：${appointmentInfo.symptoms || '无'}`
    
    wx.showModal({
      title: '预约详情',
      content: content,
      showCancel: false
    })
  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage() {
    return {
      title: 'CDKL5大会 - 义诊排队',
      path: '/pages/home/index'
    }
  }
})