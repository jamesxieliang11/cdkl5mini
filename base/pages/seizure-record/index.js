const app = getApp()
const { createSeizureRecord, getSeizureRecord, updateSeizureRecord, getTodayStats } = require('../../utils/database.js')

Page({
  data: {
    formData: {
      datetime: '',           // 记录时间
      seizureType: '',        // 发作类型
      duration: '',           // 持续时间
      triggers: '',           // 诱发因素
      symptoms: '',           // 症状表现
      images: []              // 相关图片
    },
    
    // 选择器相关
    showDatePicker: false,
    showSeizureTypePicker: false,
    showHistoryPicker: false,
    currentDate: new Date().getTime(),
    
    // 选项数据
    seizureTypeOptions: [
      { name: '强直阵挛发作', value: '强直阵挛发作' },
      { name: '失神发作', value: '失神发作' },
      { name: '肌阵挛发作', value: '肌阵挛发作' },
      { name: '局灶性发作', value: '局灶性发作' },
      { name: '复杂性发作', value: '复杂性发作' },
      { name: '其他类型', value: '其他类型' }
    ],
    
    // 历史记录
    historyRecords: [],
    historyOptions: [],
    
    // 图片上传相关
    uploadedImages: [],
    maxImageCount: 5,
    
    submitting: false,

    // 打卡成功相关
    showCheckin: false,
    checkinStreak: 0,
    checkinTodayCount: 0,
    checkinTotalDays: 0,
    showCheckinPoster: false,
    checkinPosterData: null
  },

  // 返回按钮点击处理
  onBack() {
    wx.navigateBack()
  },

  onLoad(options) {
    console.log('发作记录页面加载', options)
    // 确保所有选择器都是关闭状态
    this.setData({
      showDatePicker: false,
      showSeizureTypePicker: false,
      showHistoryPicker: false,
      isEditMode: options.mode === 'edit',
      editRecordId: options.id || null,
      loading: false
    })
    
    if (options.mode === 'edit' && options.id) {
      // 编辑模式：加载要编辑的记录
      this.loadRecordForEdit(options.id)
    } else {
      // 新建模式：初始化默认值
      this.initDefaultValues()
      // 只有新建模式才加载历史记录
      this.loadHistoryRecords()
    }
  },

  // 加载要编辑的记录数据
  async loadRecordForEdit(recordId) {
    console.log('开始加载编辑记录:', recordId)
    this.setData({ loading: true })
    
    try {
      // 检查用户信息
      const userInfo = wx.getStorageSync('userInfo')
      const userId = wx.getStorageSync('userId')
      console.log('用户信息检查:', { userInfo, userId, recordId })
      
      // 如果没有用户信息，尝试从userInfo中获取
      if (!userId && userInfo && userInfo._id) {
        wx.setStorageSync('userId', userInfo._id)
        console.log('从userInfo设置userId:', userInfo._id)
      }
      
      const result = await getSeizureRecord(recordId)
      console.log('获取发作记录详情结果:', result)
      
      if (result && result.success && result.data) {
        const record = result.data
        console.log('原始记录数据:', record)
        
        // 转换数据格式以适配表单
        const formData = {
          datetime: this.formatDateTime(record.record_time),
          seizureType: record.seizure_type || '',
          duration: record.duration ? record.duration.toString() : '',
          triggers: record.triggers || '',
          symptoms: record.symptoms || '',
          images: record.images || []
        }
        
        console.log('转换后的表单数据:', formData)
        
        this.setData({
          formData: formData,
          uploadedImages: record.images || [],
          currentDate: new Date(record.record_time).getTime(),
          loading: false
        })
        
        wx.showToast({
          title: '记录加载成功',
          icon: 'success',
          duration: 1500
        })
      } else {
        console.error('获取记录失败，result:', result)
        throw new Error((result && result.message) || '获取记录失败')
      }
    } catch (error) {
      console.error('加载编辑记录失败:', error)
      this.setData({ loading: false })
      
      wx.showModal({
        title: '加载失败',
        content: error.message || '无法加载记录数据，请重试',
        showCancel: true,
        cancelText: '返回',
        confirmText: '重试',
        success: (res) => {
          if (res.confirm) {
            this.loadRecordForEdit(recordId)
          } else {
            wx.navigateBack()
          }
        }
      })
    }
  },

  onShow() {
    // 页面显示时确保选择器都是关闭状态
    this.setData({
      showDatePicker: false,
      showSeizureTypePicker: false,
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

  // 加载历史记录（优先从云函数获取）
  async loadHistoryRecords() {
    try {
      // 获取用户ID
      const userInfo = wx.getStorageSync('userInfo')
      if (!userInfo || !userInfo.openid) {
        console.log('用户信息不存在，回退到本地存储')
        this.loadLocalHistoryRecords()
        return
      }

      // 优先从云函数获取历史记录
      const cloudResult = await wx.cloud.callFunction({
        name: 'seizureRecord',
        data: {
          action: 'list',
          userId: userInfo._id,
          pageSize: 5,
          pageIndex: 0
        }
      })
      
      let records = []
      if (cloudResult.result && cloudResult.result.success && cloudResult.result.data && cloudResult.result.data.records) {
        // 云函数获取成功，转换数据格式
        const cloudRecords = cloudResult.result.data.records
        records = cloudRecords.map(record => ({
          datetime: this.formatDateTime(record.record_time),
          seizureType: record.seizure_type || '未知类型',
          duration: record.duration ? record.duration.toString() : '',
          triggers: record.triggers || '',
          symptoms: record.symptoms || '',
          images: record.images || []
        }))
        console.log('从云函数获取发作记录成功:', records.length, '条')
      } else {
        // 云函数获取失败或无数据，回退到本地存储
        console.log('云函数获取发作记录失败，回退到本地存储')
        this.loadLocalHistoryRecords()
        return
      }
      
      const historyOptions = records.map((record, index) => ({
        name: `${record.datetime} - ${record.seizureType}`,
        value: index
      }))
      
      this.setData({
        historyRecords: records,
        historyOptions
      })
    } catch (error) {
      console.error('加载历史记录失败:', error)
      // 出错时回退到本地存储
      this.loadLocalHistoryRecords()
    }
  },

  // 从本地存储加载历史记录（备用方案）
  loadLocalHistoryRecords() {
    try {
      const records = wx.getStorageSync('epilepsyDiary_seizureRecords') || []
      const historyOptions = records.slice(0, 5).map((record, index) => ({
        name: `${record.datetime} - ${record.seizureType}`,
        value: index
      }))
      
      this.setData({
        historyRecords: records.slice(0, 5),
        historyOptions
      })
    } catch (error) {
      console.error('本地存储获取失败:', error)
      this.setData({
        historyRecords: [],
        historyOptions: []
      })
    }
  },

  // 格式化日期时间
  formatDateTime(dateTime) {
    const date = new Date(dateTime)
    return `${date.getFullYear()}-${this.formatTwoDigits(date.getMonth() + 1)}-${this.formatTwoDigits(date.getDate())} ${this.formatTwoDigits(date.getHours())}:${this.formatTwoDigits(date.getMinutes())}`
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

  // 显示发作类型选择器
  showSeizureTypePicker() {
    this.setData({
      showSeizureTypePicker: true
    })
  },

  // 选择发作类型
  onSeizureTypeSelect(event) {
    const seizureType = event.detail.value
    
    this.setData({
      'formData.seizureType': seizureType,
      showSeizureTypePicker: false
    })
  },

  // 取消发作类型选择
  onSeizureTypeCancel() {
    this.setData({ 
      showSeizureTypePicker: false 
    })
  },

  // 持续时间输入
  onDurationInput(e) {
    const duration = parseInt(e.detail)
    if (duration && duration > 1440) {
      wx.showToast({
        title: '持续时间过长',
        icon: 'none'
      })
      return
    }
    this.setData({
      'formData.duration': e.detail
    })
  },

  // 诱发因素输入
  onTriggerInput(e) {
    this.setData({
      'formData.triggers': e.detail
    })
  },

  // 症状表现输入
  onSymptomInput(e) {
    this.setData({
      'formData.symptoms': e.detail
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
        'formData.seizureType': selectedRecord.seizureType,
        'formData.duration': selectedRecord.duration,
        'formData.triggers': selectedRecord.triggers,
        'formData.symptoms': selectedRecord.symptoms,
        'formData.images': [],  // 不复制图片
        uploadedImages: [],     // 清空已上传图片
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

  // 图片上传相关方法
  
  // 选择并上传图片
  async uploadImages() {
    try {
      // 检查当前图片数量限制
      if (this.data.uploadedImages.length >= this.data.maxImageCount) {
        wx.showToast({
          title: `最多只能上传${this.data.maxImageCount}张图片`,
          icon: 'none'
        })
        return
      }

      const remainingCount = this.data.maxImageCount - this.data.uploadedImages.length
      const res = await wx.chooseImage({
        count: remainingCount,
        sizeType: ['compressed'],
        sourceType: ['album', 'camera']
      })

      if (res.tempFilePaths && res.tempFilePaths.length > 0) {
        wx.showLoading({ title: '上传中...' })
        
        const uploadPromises = res.tempFilePaths.map(async (tempFilePath, index) => {
          try {
            // 生成唯一的文件路径
            const timestamp = Date.now()
            const randomStr = Math.random().toString(36).substr(2, 9)
            const cloudPath = `seizure-images/${timestamp}-${randomStr}-${index}.jpg`
            
            const uploadRes = await wx.cloud.uploadFile({
              cloudPath: cloudPath,
              filePath: tempFilePath
            })

            return {
              fileID: uploadRes.fileID,
              cloudPath: cloudPath,
              tempFilePath: tempFilePath,
              uploadTime: new Date().toISOString()
            }
          } catch (uploadError) {
            console.error(`图片上传失败:`, uploadError)
            throw new Error(`图片上传失败`)
          }
        })

        try {
          const uploadedImages = await Promise.all(uploadPromises)
          
          this.setData({
            uploadedImages: [...this.data.uploadedImages, ...uploadedImages],
            'formData.images': [...this.data.formData.images, ...uploadedImages.map(img => ({
              fileID: img.fileID,
              cloudPath: img.cloudPath,
              uploadTime: img.uploadTime
            }))]
          })

          wx.showToast({
            title: `成功上传${uploadedImages.length}张图片`,
            icon: 'success'
          })
        } catch (uploadError) {
          wx.showModal({
            title: '上传失败',
            content: uploadError.message || '部分图片上传失败，请重试',
            showCancel: false
          })
        }
      }
    } catch (error) {
      console.error('选择图片失败:', error)
      let errorMsg = '上传失败'
      
      if (error.errMsg) {
        if (error.errMsg.includes('cancel')) {
          return // 用户取消选择，不显示错误
        } else if (error.errMsg.includes('limit')) {
          errorMsg = '图片选择超出限制'
        }
      }
      
      wx.showToast({
        title: errorMsg,
        icon: 'error'
      })
    } finally {
      wx.hideLoading()
    }
  },

  // 删除图片
  deleteImage(e) {
    const index = e.currentTarget.dataset.index
    const images = this.data.uploadedImages
    const imageToDelete = images[index]
    
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这张图片吗？',
      success: async (res) => {
        if (res.confirm) {
          try {
            wx.showLoading({ title: '删除中...' })
            
            // 从云存储中删除文件
            if (imageToDelete.fileID) {
              await wx.cloud.deleteFile({
                fileList: [imageToDelete.fileID]
              })
            }
            
            // 从页面数据中移除
            images.splice(index, 1)
            const formDataImages = this.data.formData.images
            formDataImages.splice(index, 1)
            
            this.setData({
              uploadedImages: images,
              'formData.images': formDataImages
            })
            
            wx.showToast({
              title: '删除成功',
              icon: 'success'
            })
          } catch (error) {
            console.error('删除图片失败:', error)
            wx.showToast({
              title: '删除失败',
              icon: 'error'
            })
          } finally {
            wx.hideLoading()
          }
        }
      }
    })
  },

  // 预览图片
  previewImage(e) {
    const index = e.currentTarget.dataset.index
    const urls = this.data.uploadedImages.map(img => img.tempFilePath || img.fileID)
    
    wx.previewImage({
      current: urls[index],
      urls: urls
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
      let result
      const recordData = {
        datetime: this.data.formData.datetime,
        seizureType: this.data.formData.seizureType,
        duration: parseFloat(this.data.formData.duration),
        triggers: this.data.formData.triggers,
        symptoms: this.data.formData.symptoms,
        images: this.data.uploadedImages
      }
      
      if (this.data.isEditMode && this.data.editRecordId) {
        // 更新现有记录
        console.log('更新发作记录:', this.data.editRecordId, recordData)
        result = await updateSeizureRecord(this.data.editRecordId, recordData)
      } else {
        // 创建新记录
        console.log('创建发作记录:', recordData)
        result = await createSeizureRecord(recordData)
      }
      
      if (result.success) {
        if (!this.data.isEditMode) {
          this.saveToLocalStorage()
        }
        this.setData({ submitting: false })

        if (this.data.isEditMode) {
          wx.showToast({ title: '更新成功', icon: 'success' })
          setTimeout(() => wx.navigateBack(), 1500)
        } else {
          try {
            const statsResult = await getTodayStats()
            this.setData({
              showCheckin: true,
              checkinStreak: statsResult.data.streak || 0,
              checkinTodayCount: statsResult.data.todayCount || 0,
              checkinTotalDays: statsResult.data.totalDays || 0
            })
          } catch (e) {
            this.setData({ showCheckin: true, checkinStreak: 0, checkinTodayCount: 1, checkinTotalDays: 0 })
          }
        }
      } else {
        throw new Error(result.message || '保存失败')
      }
    } catch (error) {
      console.error('提交发作记录失败:', error)
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
    const { datetime, seizureType, duration, symptoms } = this.data.formData

    if (!datetime) {
      wx.showToast({
        title: '请选择发作时间',
        icon: 'none'
      })
      return false
    }

    if (!seizureType) {
      wx.showToast({
        title: '请选择发作类型',
        icon: 'none'
      })
      return false
    }

    if (!duration) {
      wx.showToast({
        title: '请输入持续时间',
        icon: 'none'
      })
      return false
    }

    if (!symptoms) {
      wx.showToast({
        title: '请描述症状表现',
        icon: 'none'
      })
      return false
    }

    return true
  },

  // 保存到本地存储
  saveToLocalStorage() {
    const seizureRecords = wx.getStorageSync('epilepsyDiary_seizureRecords') || []
    const recordId = Date.now().toString()
    
    const newRecord = {
      id: recordId,
      ...this.data.formData,
      createTime: new Date().toISOString()
    }
    
    seizureRecords.unshift(newRecord)
    wx.setStorageSync('epilepsyDiary_seizureRecords', seizureRecords)
  },

  onCheckinClose() {
    this.setData({ showCheckin: false })
    wx.navigateBack()
  },

  onCheckinShare() {
    const userInfo = wx.getStorageSync('userInfo') || {}
    this.setData({
      showCheckin: false,
      showCheckinPoster: true,
      checkinPosterData: {
        nickName: userInfo.nickName || '希舞宝宝',
        streak: this.data.checkinStreak,
        todayCount: this.data.checkinTodayCount,
        totalDays: this.data.checkinTotalDays,
        recordType: 'seizure',
        date: new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })
      }
    })
  },

  onCheckinPosterClose() {
    this.setData({ showCheckinPoster: false })
    wx.navigateBack()
  },

  onCheckinPosterSaved() {
    wx.showToast({ title: '已保存到相册', icon: 'success' })
    this.setData({ showCheckinPoster: false })
    setTimeout(() => wx.navigateBack(), 1500)
  }
})