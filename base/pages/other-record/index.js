const app = getApp()
const { createOtherRecord } = require('../../utils/database.js')

Page({
  data: {
    formData: {
      datetime: '',           // 记录时间
      category: '',           // 记录类别
      content: '',            // 记录内容
      remark: ''              // 备注信息
    },
    
    // 选择器相关
    showDatePicker: false,
    showCategoryPicker: false,
    showHistoryPicker: false,
    currentDate: new Date().getTime(),
    
    // 选项数据
    categoryOptions: [
      { name: '日常观察', value: '日常观察' },
      { name: '饮食记录', value: '饮食记录' },
      { name: '睡眠记录', value: '睡眠记录' },
      { name: '体温测量', value: '体温测量' },
      { name: '血压监测', value: '血压监测' },
      { name: '心情变化', value: '心情变化' },
      { name: '特殊事件', value: '特殊事件' },
      { name: '其他', value: '其他' }
    ],
    
    // 历史记录
    historyRecords: [],
    historyOptions: [],
    
    submitting: false
  },

  // 返回按钮点击处理
  onBack: function() {
    wx.switchTab({
      url: '/pages/home/index'
    })
  },

  onLoad(options) {
    console.log('其他记录页面加载')
    // 确保所有选择器都是关闭状态
    this.setData({
      showDatePicker: false,
      showCategoryPicker: false,
      showHistoryPicker: false
    })
    this.initDefaultValues()
    this.loadHistoryRecords()
  },

  onShow() {
    // 页面显示时确保选择器都是关闭状态
    this.setData({
      showDatePicker: false,
      showCategoryPicker: false,
      showHistoryPicker: false
    })
  },

  // 初始化默认值
  initDefaultValues() {
    const now = new Date()
    const formattedDatetime = `${now.getFullYear()}-${this.formatTwoDigits(now.getMonth() + 1)}-${this.formatTwoDigits(now.getDate())} ${this.formatTwoDigits(now.getHours())}:${this.formatTwoDigits(now.getMinutes())}`

    this.setData({
      'formData.datetime': formattedDatetime,
      currentDate: now.getTime()
    })
  },

  // 加载历史记录
  loadHistoryRecords() {
    try {
      const records = wx.getStorageSync('epilepsyDiary_otherRecords') || []
      const historyOptions = records.slice(0, 5).map((record, index) => ({
        name: `${record.datetime} - ${record.category}`,
        value: index
      }))
      
      this.setData({
        historyRecords: records.slice(0, 5),
        historyOptions
      })
    } catch (error) {
      console.error('加载历史记录失败:', error)
    }
  },

  // 数字两位补齐
  formatTwoDigits(num) {
    return num.toString().padStart(2, '0')
  },

  // 显示日期时间选择器（使用 Vant 选择器）
  showDateTimePicker() {
    console.log('showDateTimePicker 被调用')
    console.log('当前 formData.datetime:', this.data.formData.datetime)
    
    // 将当前日期时间字符串转换为时间戳
    if (this.data.formData.datetime) {
      const currentDateTime = new Date(this.data.formData.datetime.replace(' ', 'T')).getTime()
      console.log('转换后的时间戳:', currentDateTime)
      this.setData({
        currentDate: currentDateTime,
        showDatePicker: true
      })
    } else {
      this.setData({
        currentDate: new Date().getTime(),
        showDatePicker: true
      })
    }
    
    console.log('设置后的 showDatePicker:', this.data.showDatePicker)
  },

  // 日期时间选择确认
  onDateTimeConfirm(event) {
    const selectedDate = new Date(event.detail)
    const formattedDatetime = `${selectedDate.getFullYear()}-${this.formatTwoDigits(selectedDate.getMonth() + 1)}-${this.formatTwoDigits(selectedDate.getDate())} ${this.formatTwoDigits(selectedDate.getHours())}:${this.formatTwoDigits(selectedDate.getMinutes())}`
    
    this.setData({
      'formData.datetime': formattedDatetime,
      showDatePicker: false
    })
  },

  // 日期时间选择取消
  onDateTimeCancel() {
    this.setData({
      showDatePicker: false
    })
  },

  // 显示记录类别选择器
  showCategoryPicker() {
    this.setData({
      showCategoryPicker: true
    })
  },

  // 选择记录类别
  onCategorySelect(event) {
    const category = event.detail.value
    
    this.setData({
      'formData.category': category,
      showCategoryPicker: false
    })
  },

  // 取消记录类别选择
  onCategoryCancel() {
    this.setData({ 
      showCategoryPicker: false 
    })
  },

  // 记录内容输入
  onContentInput(e) {
    this.setData({
      'formData.content': e.detail
    })
  },

  // 备注信息输入
  onRemarkInput(e) {
    this.setData({
      'formData.remark': e.detail
    })
  },

  // 显示历史记录选择器
  showHistoryPicker() {
    this.setData({
      showHistoryPicker: true
    })
  },

  // 选择历史记录
  onHistorySelect(event) {
    const index = event.detail.value
    const selectedRecord = this.data.historyRecords[index]

    if (selectedRecord) {
      // 更新时间戳为当前时间
      const now = new Date()
      const formattedNow = `${now.getFullYear()}-${this.formatTwoDigits(now.getMonth() + 1)}-${this.formatTwoDigits(now.getDate())} ${this.formatTwoDigits(now.getHours())}:${this.formatTwoDigits(now.getMinutes())}`

      this.setData({
        'formData.datetime': formattedNow,
        'formData.category': selectedRecord.category,
        'formData.content': selectedRecord.content,
        'formData.remark': selectedRecord.remark,
        showHistoryPicker: false
      })

      wx.showToast({
        title: '已填充历史记录',
        icon: 'success'
      })
    }
  },

  // 取消历史记录选择
  onHistoryCancel() {
    this.setData({ 
      showHistoryPicker: false 
    })
  },

  // 提交记录
  async submitRecord() {
    // 表单验证
    if (!this.validateForm()) {
      return
    }

    this.setData({ submitting: true })

    try {
      // 调用其他记录新增接口
      const result = await createOtherRecord(this.data.formData)
      
      if (result.success) {
        // 同时保存到本地存储作为备份
        this.saveToLocalStorage()
        
        // 重置提交状态
        this.setData({ submitting: false })
        
        wx.showToast({
          title: '保存成功',
          icon: 'success',
          duration: 1500,
          success: () => {
            // Toast显示后立即返回上一页
            setTimeout(() => {
              wx.navigateBack({
                delta: 1,
                success: () => {
                  console.log('成功返回上一页')
                },
                fail: (error) => {
                  console.error('返回上一页失败:', error)
                  // 如果返回失败，尝试跳转到首页
                  wx.switchTab({
                    url: '/pages/index/index'
                  })
                }
              })
            }, 500)
          }
        })
      } else {
        throw new Error(result.message || '保存失败')
      }
    } catch (error) {
      console.error('提交其他记录失败:', error)
      this.setData({ submitting: false })
      
      wx.showModal({
        title: '保存失败',
        content: error.message || '网络错误，请重试',
        showCancel: true,
        cancelText: '取消',
        confirmText: '重试',
        success: (res) => {
          if (res.confirm) {
            this.submitRecord()
          }
        }
      })
    }
  },

  // 表单验证
  validateForm() {
    const { datetime, category, content } = this.data.formData

    if (!datetime) {
      wx.showToast({
        title: '请选择记录时间',
        icon: 'none'
      })
      return false
    }

    if (!category) {
      wx.showToast({
        title: '请选择记录类别',
        icon: 'none'
      })
      return false
    }

    if (!content) {
      wx.showToast({
        title: '请输入记录内容',
        icon: 'none'
      })
      return false
    }

    return true
  },

  // 保存到本地存储
  saveToLocalStorage() {
    const otherRecords = wx.getStorageSync('epilepsyDiary_otherRecords') || []
    const recordId = Date.now().toString()
    
    const newRecord = {
      id: recordId,
      ...this.data.formData,
      createTime: new Date().toISOString()
    }
    
    otherRecords.unshift(newRecord)
    wx.setStorageSync('epilepsyDiary_otherRecords', otherRecords)
  }
})