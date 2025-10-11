const app = getApp()
const { createMedicationRecord } = require('../../utils/database.js')

Page({
  data: {
    formData: {
      datetime: '',           // 记录时间
      weight: '',             // 体重
      medications: [{         // 药物列表
        takeTime: '',         // 服用时间
        name: '',             // 药物名称
        dosage: '',           // 药量
        unit: 'mg'            // 单位
      }],
      sideEffects: ''         // 副作用
    },
    
    // 选择器相关
    showDatePicker: false,
    showMedicationTimePicker: false,
    showUnitPicker: false,
    showHistoryPicker: false,
    currentDate: new Date().getTime(),
    currentTime: '08:00',
    currentMedicationIndex: 0,
    
    // 选项数据
    unitOptions: [
      { name: 'mg', value: 'mg' },
      { name: 'g', value: 'g' },
      { name: 'ml', value: 'ml' },
      { name: '片', value: '片' },
      { name: '粒', value: '粒' },
      { name: '包', value: '包' },
      { name: '滴', value: '滴' }
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
    console.log('调药记录页面加载')
    // 确保所有选择器都是关闭状态
    this.setData({
      showDatePicker: false,
      showMedicationTimePicker: false,
      showUnitPicker: false,
      showHistoryPicker: false
    })
    this.initDefaultValues()
    this.loadHistoryRecords()
  },

  onShow() {
    // 页面显示时确保选择器都是关闭状态
    this.setData({
      showDatePicker: false,
      showMedicationTimePicker: false,
      showUnitPicker: false,
      showHistoryPicker: false
    })
  },

  // 初始化默认值
  initDefaultValues() {
    const now = new Date()
    const formattedDatetime = `${now.getFullYear()}-${this.formatTwoDigits(now.getMonth() + 1)}-${this.formatTwoDigits(now.getDate())} ${this.formatTwoDigits(now.getHours())}:${this.formatTwoDigits(now.getMinutes())}`
    const formattedTime = `${this.formatTwoDigits(now.getHours())}:${this.formatTwoDigits(now.getMinutes())}`

    this.setData({
      'formData.datetime': formattedDatetime,
      'formData.medications[0].takeTime': formattedTime,
      currentDate: now.getTime(),
      currentTime: formattedTime
    })
  },

  // 数字两位补齐
  formatTwoDigits(num) {
    return num.toString().padStart(2, '0')
  },

  // 加载历史记录
  loadHistoryRecords() {
    try {
      const records = wx.getStorageSync('medicationRecords') || []
      const historyOptions = records.slice(0, 5).map((record, index) => ({
        name: `${record.datetime} - ${record.medications.length}种药物`,
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

  // 显示药物服用时间选择器（使用 Vant 选择器）
  showMedicationTimePicker(event) {
    const index = event.currentTarget.dataset.index
    const currentTime = this.data.formData.medications[index].takeTime || '08:00'
    
    // 对于 type="time" 的 van-datetime-picker，直接使用时间字符串
    this.setData({
      currentTime: currentTime,
      currentMedicationIndex: index,
      showMedicationTimePicker: true
    })
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

  // 药物服用时间选择确认
  onMedicationTimeConfirm(event) {
    // 对于 type="time"，event.detail 直接是时间字符串格式 "HH:mm"
    const selectedTime = event.detail
    
    const index = this.data.currentMedicationIndex
    this.setData({
      [`formData.medications[${index}].takeTime`]: selectedTime,
      showMedicationTimePicker: false
    })
  },

  // 药物服用时间选择取消
  onMedicationTimeCancel() {
    this.setData({
      showMedicationTimePicker: false
    })
  },

  // 体重输入
  onWeightInput(event) {
    this.setData({
      'formData.weight': event.detail
    })
  },

  // 药物名称输入
  onMedicationNameInput(event) {
    const index = event.currentTarget.dataset.index
    this.setData({
      [`formData.medications[${index}].name`]: event.detail
    })
  },

  // 药量输入
  onDosageInput(event) {
    const index = event.currentTarget.dataset.index
    this.setData({
      [`formData.medications[${index}].dosage`]: event.detail
    })
  },

  // 显示单位选择器
  showUnitPicker(event) {
    const index = event.currentTarget.dataset.index
    this.setData({
      showUnitPicker: true,
      currentMedicationIndex: index
    })
  },

  // 选择单位
  onUnitSelect(event) {
    const unit = event.detail.value
    const index = this.data.currentMedicationIndex
    
    this.setData({
      [`formData.medications[${index}].unit`]: unit,
      showUnitPicker: false
    })
  },

  // 取消单位选择
  onUnitCancel() {
    this.setData({ showUnitPicker: false })
  },

  // 副作用输入
  onSideEffectsInput(event) {
    this.setData({
      'formData.sideEffects': event.detail
    })
  },

  // 添加药物
  addMedication() {
    const medications = [...this.data.formData.medications]
    
    medications.push({
      takeTime: this.data.currentTime,
      name: '',
      dosage: '',
      unit: 'mg'
    })
    
    this.setData({
      'formData.medications': medications
    })
  },

  // 删除药物
  removeMedication(event) {
    const index = event.currentTarget.dataset.index
    const medications = [...this.data.formData.medications]
    medications.splice(index, 1)
    
    this.setData({
      'formData.medications': medications
    })
  },

  // 显示历史记录选择器
  showHistoryPicker() {
    this.setData({ showHistoryPicker: true })
  },

  // 选择历史记录
  onHistorySelect(event) {
    const index = event.detail.value
    const historyRecord = this.data.historyRecords[index]
    
    if (historyRecord) {
      // 复制历史记录，但更新时间为当前时间
      const now = new Date()
      const formattedDatetime = `${now.getFullYear()}-${this.formatTwoDigits(now.getMonth() + 1)}-${this.formatTwoDigits(now.getDate())} ${this.formatTwoDigits(now.getHours())}:${this.formatTwoDigits(now.getMinutes())}`
      
      this.setData({
        'formData.weight': historyRecord.weight,
        'formData.medications': historyRecord.medications,
        'formData.sideEffects': historyRecord.sideEffects,
        'formData.datetime': formattedDatetime,
        showHistoryPicker: false
      })
      
      wx.showToast({
        title: '已复制历史记录',
        icon: 'success'
      })
    }
  },

  // 取消历史记录选择
  onHistoryCancel() {
    this.setData({ showHistoryPicker: false })
  },

  // 提交记录
  async submitRecord() {
    // 验证必填字段
    if (!this.data.formData.datetime) {
      wx.showToast({
        title: '请选择记录时间',
        icon: 'none'
      })
      return
    }

    if (!this.data.formData.weight) {
      wx.showToast({
        title: '请输入体重',
        icon: 'none'
      })
      return
    }

    // 验证药物信息
    const medications = this.data.formData.medications
    for (let i = 0; i < medications.length; i++) {
      const med = medications[i]
      if (!med.name || !med.dosage || !med.takeTime) {
        wx.showToast({
          title: `请完善药物${i + 1}的信息`,
          icon: 'none'
        })
        return
      }
    }

    this.setData({ submitting: true })

    try {
      // 调用云函数保存记录
      const result = await createMedicationRecord(this.data.formData)
      
      console.log('调药记录保存成功:', result)
      
      wx.showToast({
        title: '保存成功',
        icon: 'success'
      })

      // 同时保存到本地存储作为备份（用于历史记录快捷选择）
      try {
        const records = wx.getStorageSync('medicationRecords') || []
        const newRecord = {
          id: result.data.recordId || Date.now(),
          ...this.data.formData,
          createTime: new Date().toISOString()
        }
        
        records.unshift(newRecord)
        // 只保留最近10条记录作为历史记录
        if (records.length > 10) {
          records.splice(10)
        }
        wx.setStorageSync('medicationRecords', records)
      } catch (localError) {
        console.warn('本地存储备份失败:', localError)
      }

      // 延迟返回上一页
      setTimeout(() => {
        wx.navigateBack()
      }, 1500)

    } catch (error) {
      console.error('保存记录失败:', error)
      wx.showToast({
        title: error.message || '保存失败，请重试',
        icon: 'none'
      })
    } finally {
      this.setData({ submitting: false })
    }
  }
})