const app = getApp()
const { createOtherRecord, getOtherRecord, updateOtherRecord } = require('../../utils/database.js')

Page({
  data: {
    formData: {
      datetime: '',           // 记录时间
      category: '',           // 记录类别
      content: '',            // 记录内容
      remark: '',             // 备注信息
      images: []              // 上传的图片文件
    },
    
    // 选择器相关
    showDatePicker: false,
    showCategoryPicker: false,
    showHistoryPicker: false,
    currentDate: new Date().getTime(),
    
    // 选项数据
    categoryOptions: [
      { name: '手术记录', value: '手术记录' },
      { name: '门诊记录', value: '门诊记录' },
      { name: '住院记录', value: '住院记录' },
      { name: '检查报告', value: '检查报告' },
      { name: '化验结果', value: '化验结果' },
      { name: '用药记录', value: '用药记录' },
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
    
    submitting: false,
    
    // 图片上传相关
    maxImageCount: 9, // 最多上传图片数量
    uploadingImages: false // 图片上传状态
  },

  // 返回按钮点击处理
  onBack: function() {
    wx.switchTab({
      url: '/pages/home/index'
    })
  },

  onLoad(options) {
    console.log('其他记录页面加载', options)
    // 确保所有选择器都是关闭状态
    this.setData({
      showDatePicker: false,
      showCategoryPicker: false,
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
      
      const result = await getOtherRecord(recordId)
      console.log('获取其他记录详情结果:', result)
      
      if (result && result.success && result.data) {
        const record = result.data
        console.log('原始记录数据:', record)
        
        // 转换数据格式以适配表单
        const formData = {
          datetime: this.formatDateTime(record.record_time),
          category: record.category || '',
          content: record.content || '',
          remark: record.remark || '',
          images: record.images || []
        }
        
        console.log('转换后的表单数据:', formData)
        
        this.setData({
          formData: formData,
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
        name: 'otherRecord',
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
          category: record.category || '其他',
          content: record.content || '',
          remark: record.remark || ''
        }))
        console.log('从云函数获取其他记录成功:', records.length, '条')
      } else {
        // 云函数获取失败或无数据，回退到本地存储
        console.log('云函数获取其他记录失败，回退到本地存储')
        this.loadLocalHistoryRecords()
        return
      }
      
      const historyOptions = records.map((record, index) => ({
        name: `${record.datetime} - ${record.category}`,
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

  // 选择图片上传
  chooseImages: function() {
    const { maxImageCount } = this.data
    const images = this.data.formData.images || []
    
    if (images.length >= maxImageCount) {
      wx.showToast({
        title: `最多只能上传${maxImageCount}张图片`,
        icon: 'none'
      })
      return
    }

    wx.chooseMedia({
      count: maxImageCount - images.length,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      maxDuration: 30,
      camera: 'back',
      success: (res) => {
        if (res.tempFiles && res.tempFiles.length > 0) {
          this.uploadImages(res.tempFiles)
        }
      },
      fail: (error) => {
        console.error('选择图片失败:', error)
        wx.showToast({
          title: '选择图片失败',
          icon: 'error'
        })
      }
    })
  },

  // 上传图片到云存储
  uploadImages: async function(tempFiles) {
    this.setData({ uploadingImages: true })
    
    try {
      const uploadPromises = tempFiles.map(async (file, index) => {
        try {
          // 生成云存储路径
          const timestamp = Date.now()
          const randomStr = Math.random().toString(36).substr(2, 9)
          const fileExt = file.tempFilePath.split('.').pop().toLowerCase()
          const cloudPath = `other-record-images/${timestamp}-${randomStr}-${index}.${fileExt}`
          
          // 上传到云存储
          const uploadRes = await wx.cloud.uploadFile({
            cloudPath: cloudPath,
            filePath: file.tempFilePath
          })

          return {
            fileID: uploadRes.fileID,
            cloudPath: cloudPath,
            size: file.size,
            width: file.width,
            height: file.height,
            tempFilePath: file.tempFilePath,
            uploadTime: new Date().toISOString()
          }
        } catch (uploadError) {
          console.error('图片上传失败:', uploadError)
          throw new Error('图片上传失败')
        }
      })

      const uploadedImages = await Promise.all(uploadPromises)
      
      // 更新图片列表
      const currentImages = this.data.formData.images || []
      this.setData({
        'formData.images': [...currentImages, ...uploadedImages],
        uploadingImages: false
      })

      wx.showToast({
        title: `成功上传${uploadedImages.length}张图片`,
        icon: 'success'
      })
    } catch (error) {
      console.error('批量上传图片失败:', error)
      this.setData({ uploadingImages: false })
      wx.showToast({
        title: '图片上传失败',
        icon: 'error'
      })
    }
  },

  // 预览图片
  previewImage: function(e) {
    const index = e.currentTarget.dataset.index
    const images = this.data.formData.images
    
    if (!images || images.length === 0) return
    
    const urls = images.map(img => img.tempFilePath || img.fileID)
    
    wx.previewImage({
      urls: urls,
      current: urls[index]
    })
  },

  // 删除图片
  deleteImage: function(e) {
    const index = e.currentTarget.dataset.index
    const images = this.data.formData.images
    
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这张图片吗？',
      success: async (res) => {
        if (res.confirm) {
          try {
            const imageToDelete = images[index]
            
            // 从云存储中删除图片
            if (imageToDelete.fileID) {
              await wx.cloud.deleteFile({
                fileList: [imageToDelete.fileID]
              })
            }
            
            // 从列表中移除
            images.splice(index, 1)
            this.setData({
              'formData.images': images
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
          }
        }
      }
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
        category: this.data.formData.category,
        content: this.data.formData.content,
        remark: this.data.formData.remark,
        images: this.data.formData.images
      }
      
      if (this.data.isEditMode && this.data.editRecordId) {
        // 更新现有记录
        console.log('更新其他记录:', this.data.editRecordId, recordData)
        result = await updateOtherRecord(this.data.editRecordId, recordData)
      } else {
        // 创建新记录
        console.log('创建其他记录:', recordData)
        result = await createOtherRecord(recordData)
      }
      
      if (result.success) {
        // 只有新建模式才保存到本地存储作为备份
        if (!this.data.isEditMode) {
          this.saveToLocalStorage()
        }
        
        // 重置提交状态
        this.setData({ submitting: false })
        
        wx.showToast({
          title: this.data.isEditMode ? '更新成功' : '保存成功',
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