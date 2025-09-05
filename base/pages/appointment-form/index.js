// pages/appointment-form/index.js
const app = getApp()

Page({
  /**
   * 页面的初始数据
   */
  data: {
    loading: false,
    submitting: false,
    formData: {
      patientName: '',
      patientAge: '',
      gender: '',
      contactName: '',
      contactPhone: '',
      relationship: '',
      department: null,
      appointmentDate: '',
      timeSlot: null,
      symptoms: ''
    },
    genderOptions: ['男', '女'],
    genderIndex: -1,
    relationshipOptions: ['父亲', '母亲', '爷爷', '奶奶', '外公', '外婆', '其他'],
    relationshipIndex: -1,
    departmentOptions: [
      { id: 1, name: '神经内科', available: true },
      { id: 2, name: '儿科', available: true },
      { id: 3, name: '康复科', available: true },
      { id: 4, name: '遗传代谢科', available: false }
    ],
    departmentIndex: -1,
    timeSlots: [
      { id: 1, label: '上午 9:00-12:00', value: 'morning', available: true },
      { id: 2, label: '下午 14:00-17:00', value: 'afternoon', available: true }
    ],
    timeSlotIndex: -1,
    minDate: '',
    maxDate: ''
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    console.log('预约表单页面加载')
    this.initDateRange()
    this.loadUserProfile()
  },

  // 返回按钮点击处理
  onBack: function() {
    wx.navigateBack()
  },

  // 初始化日期范围
  initDateRange: function() {
    const today = new Date()
    const minDate = new Date(today.getTime() + 24 * 60 * 60 * 1000) // 明天开始
    const maxDate = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000) // 30天内
    
    this.setData({
      minDate: this.formatDate(minDate),
      maxDate: this.formatDate(maxDate)
    })
  },

  // 格式化日期
  formatDate: function(date) {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  },

  // 加载用户资料
  async loadUserProfile() {
    try {
      const userProfile = wx.getStorageSync('userProfile')
      if (userProfile && userProfile.patientInfo) {
        this.setData({
          'formData.patientName': userProfile.patientInfo.babyName || '',
          'formData.contactName': userProfile.patientInfo.parentName || '',
          'formData.contactPhone': userProfile.patientInfo.parentPhone || '',
          'formData.relationship': userProfile.patientInfo.relationship || '',
          relationshipIndex: this.data.relationshipOptions.indexOf(userProfile.patientInfo.relationship) || -1
        })
      }
    } catch (error) {
      console.error('加载用户资料失败:', error)
    }
  },

  // 表单输入处理
  onPatientNameChange: function(e) {
    this.setData({ 'formData.patientName': e.detail.value })
  },

  onPatientAgeChange: function(e) {
    this.setData({ 'formData.patientAge': e.detail.value })
  },

  onGenderChange: function(e) {
    const index = parseInt(e.detail.value)
    this.setData({
      genderIndex: index,
      'formData.gender': this.data.genderOptions[index]
    })
  },

  onContactNameChange: function(e) {
    this.setData({ 'formData.contactName': e.detail.value })
  },

  onContactPhoneChange: function(e) {
    this.setData({ 'formData.contactPhone': e.detail.value })
  },

  onRelationshipChange: function(e) {
    const index = parseInt(e.detail.value)
    this.setData({
      relationshipIndex: index,
      'formData.relationship': this.data.relationshipOptions[index]
    })
  },

  onDepartmentChange: function(e) {
    const index = parseInt(e.detail.value)
    const department = this.data.departmentOptions[index]
    if (!department.available) {
      wx.showToast({
        title: '该科室暂不可预约',
        icon: 'none'
      })
      return
    }
    this.setData({
      departmentIndex: index,
      'formData.department': department
    })
  },

  onDateChange: function(e) {
    this.setData({ 'formData.appointmentDate': e.detail.value })
  },

  onTimeSlotChange: function(e) {
    const index = parseInt(e.detail.value)
    const timeSlot = this.data.timeSlots[index]
    if (!timeSlot.available) {
      wx.showToast({
        title: '该时段暂不可预约',
        icon: 'none'
      })
      return
    }
    this.setData({
      timeSlotIndex: index,
      'formData.timeSlot': timeSlot
    })
  },

  onSymptomsChange: function(e) {
    this.setData({ 'formData.symptoms': e.detail.value })
  },

  // 表单验证
  validateForm: function() {
    const { formData } = this.data
    
    if (!formData.patientName.trim()) {
      wx.showToast({ title: '请输入患者姓名', icon: 'none' })
      return false
    }
    
    if (!formData.patientAge.trim()) {
      wx.showToast({ title: '请输入患者年龄', icon: 'none' })
      return false
    }
    
    if (!formData.gender) {
      wx.showToast({ title: '请选择性别', icon: 'none' })
      return false
    }
    
    if (!formData.contactName.trim()) {
      wx.showToast({ title: '请输入联系人姓名', icon: 'none' })
      return false
    }
    
    if (!formData.contactPhone.trim()) {
      wx.showToast({ title: '请输入联系电话', icon: 'none' })
      return false
    }
    
    if (!/^1[3-9]\d{9}$/.test(formData.contactPhone)) {
      wx.showToast({ title: '请输入正确的手机号码', icon: 'none' })
      return false
    }
    
    if (!formData.relationship) {
      wx.showToast({ title: '请选择与患者关系', icon: 'none' })
      return false
    }
    
    if (!formData.department) {
      wx.showToast({ title: '请选择就诊科室', icon: 'none' })
      return false
    }
    
    if (!formData.appointmentDate) {
      wx.showToast({ title: '请选择预约日期', icon: 'none' })
      return false
    }
    
    if (!formData.timeSlot) {
      wx.showToast({ title: '请选择预约时段', icon: 'none' })
      return false
    }
    
    return true
  },

  // 提交表单
  async submitForm() {
    if (this.data.submitting) return
    
    if (!this.validateForm()) return
    
    try {
      this.setData({ submitting: true })
      
      // 模拟提交请求
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // 生成排队号
      const queueNumber = this.generateQueueNumber()
      
      // 保存预约信息到本地
      const appointmentInfo = {
        id: Date.now().toString(),
        ...this.data.formData,
        queueNumber: queueNumber,
        status: 'confirmed',
        createTime: new Date().toISOString(),
        appointmentTime: `${this.data.formData.appointmentDate} ${this.data.formData.timeSlot.label}`
      }
      
      wx.setStorageSync('myAppointment', appointmentInfo)
      app.globalData.queueNumber = queueNumber
      
      wx.showToast({
        title: '预约成功',
        icon: 'success'
      })
      
      // 跳转到排队状态页
      setTimeout(() => {
        wx.redirectTo({
          url: `/pages/queue-status/index?appointmentId=${appointmentInfo.id}`
        })
      }, 1500)
      
    } catch (error) {
      console.error('提交预约失败:', error)
      wx.showToast({
        title: '预约失败，请重试',
        icon: 'error'
      })
    } finally {
      this.setData({ submitting: false })
    }
  },

  // 生成排队号
  generateQueueNumber: function() {
    const prefix = this.data.formData.department.name.charAt(0)
    const number = String(Math.floor(Math.random() * 100) + 1).padStart(3, '0')
    return `${prefix}${number}`
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