// pages/messages/index.js
const app = getApp()

Page({
  /**
   * 页面的初始数据
   */
  data: {
    loading: true,
    messages: []
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    console.log('消息页面加载')
    this.loadMessages()
  },

  // 返回按钮点击处理
  onBack: function() {
    wx.navigateBack()
  },

  // 加载消息列表
  async loadMessages() {
    try {
      this.setData({ loading: true })
      
      // 模拟从服务器获取消息
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // 模拟消息数据
      const mockMessages = [
        {
          id: 1,
          type: 'system',
          title: '系统通知',
          content: '欢迎参加CDKL5大会，请及时关注会议安排',
          time: '2024-03-15 10:30',
          read: false
        },
        {
          id: 2,
          type: 'appointment',
          title: '预约提醒',
          content: '您的义诊预约已确认，请于明日上午9:00准时到达',
          time: '2024-03-14 16:20',
          read: true,
          relatedId: 'apt_001'
        },
        {
          id: 3,
          type: 'system',
          title: '会议资料',
          content: '最新会议资料已上传，请及时下载查看',
          time: '2024-03-14 14:15',
          read: true
        }
      ]
      
      this.setData({
        messages: mockMessages,
        loading: false
      })
      
    } catch (error) {
      console.error('加载消息失败:', error)
      this.setData({ loading: false })
      wx.showToast({
        title: '加载失败，请重试',
        icon: 'error'
      })
    }
  },

  // 消息点击处理
  onMessageTap: function(e) {
    const message = e.currentTarget.dataset.message
    
    // 标记为已读
    if (!message.read) {
      this.markAsRead(message.id)
    }
    
    // 根据消息类型进行不同处理
    if (message.type === 'appointment' && message.relatedId) {
      // 跳转到预约详情
      wx.navigateTo({
        url: `/pages/queue-status/index?appointmentId=${message.relatedId}`
      })
    } else {
      // 显示消息详情
      wx.showModal({
        title: message.title,
        content: message.content,
        showCancel: false
      })
    }
  },

  // 标记消息为已读
  markAsRead: function(messageId) {
    const messages = this.data.messages.map(msg => {
      if (msg.id === messageId) {
        return { ...msg, read: true }
      }
      return msg
    })
    
    this.setData({ messages })
  },

  // 处理预约相关操作
  handleAppointmentAction: function(e) {
    e.stopPropagation() // 阻止事件冒泡
    
    const { action, id } = e.currentTarget.dataset
    
    if (action === 'view') {
      wx.navigateTo({
        url: `/pages/queue-status/index?appointmentId=${id}`
      })
    }
  },

  /**
   * 生命周期函数--监听页面初次渲染完成
   */
  onReady() {

  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {

  },

  /**
   * 生命周期函数--监听页面隐藏
   */
  onHide() {

  },

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload() {

  },

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh() {

  },

  /**
   * 页面上拉触底事件的处理函数
   */
  onReachBottom() {

  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage() {

  }
})