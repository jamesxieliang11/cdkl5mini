const { createFeedback, listFeedbacks } = require('../../utils/database.js')

const FEEDBACK_TYPES = [
  { value: 'bug', label: '问题反馈', icon: 'warning-o' },
  { value: 'feature', label: '功能建议', icon: 'bulb-o' },
  { value: 'experience', label: '体验优化', icon: 'smile-o' },
  { value: 'other', label: '其他', icon: 'more-o' }
]

const TYPE_LABEL_MAP = {
  bug: '问题反馈',
  feature: '功能建议',
  experience: '体验优化',
  other: '其他'
}

Page({
  data: {
    activeTab: 0,
    feedbackTypes: FEEDBACK_TYPES,
    selectedType: '',
    content: '',
    contact: '',
    images: [],
    submitting: false,
    feedbackList: [],
    loading: false
  },

  onLoad() {
    this.loadFeedbackList()
  },

  onShow() {
    this.loadFeedbackList()
  },

  goBack() {
    wx.navigateBack()
  },

  onTabChange(event) {
    this.setData({ activeTab: event.detail.index })
    if (event.detail.index === 1) {
      this.loadFeedbackList()
    }
  },

  selectType(event) {
    this.setData({ selectedType: event.currentTarget.dataset.value })
  },

  onContentInput(event) {
    this.setData({ content: event.detail.value })
  },

  onContactInput(event) {
    this.setData({ contact: event.detail })
  },

  // 选择图片
  chooseImage() {
    const remainCount = 3 - this.data.images.length
    wx.chooseMedia({
      count: remainCount,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const newImages = res.tempFiles.map(file => file.tempFilePath)
        this.setData({
          images: [...this.data.images, ...newImages]
        })
      }
    })
  },

  // 预览图片
  previewImage(event) {
    const currentUrl = event.currentTarget.dataset.url
    wx.previewImage({
      current: currentUrl,
      urls: this.data.images
    })
  },

  // 删除图片
  deleteImage(event) {
    const index = event.currentTarget.dataset.index
    const images = [...this.data.images]
    images.splice(index, 1)
    this.setData({ images })
  },

  // 上传图片到云存储
  async uploadImages() {
    const uploadedUrls = []
    for (const tempPath of this.data.images) {
      const cloudPath = `feedback/${Date.now()}-${Math.random().toString(36).substring(2, 8)}.jpg`
      try {
        const uploadResult = await wx.cloud.uploadFile({
          cloudPath: cloudPath,
          filePath: tempPath
        })
        uploadedUrls.push(uploadResult.fileID)
      } catch (error) {
        console.error('图片上传失败:', error)
      }
    }
    return uploadedUrls
  },

  // 提交反馈
  async submitFeedback() {
    if (!this.data.selectedType) {
      wx.showToast({ title: '请选择反馈类型', icon: 'none' })
      return
    }
    if (!this.data.content.trim()) {
      wx.showToast({ title: '请填写反馈内容', icon: 'none' })
      return
    }

    this.setData({ submitting: true })

    try {
      let imageUrls = []
      if (this.data.images.length > 0) {
        wx.showLoading({ title: '上传图片中...' })
        imageUrls = await this.uploadImages()
        wx.hideLoading()
      }

      await createFeedback({
        type: this.data.selectedType,
        content: this.data.content.trim(),
        contact: this.data.contact.trim(),
        images: imageUrls
      })

      wx.showToast({ title: '提交成功', icon: 'success' })

      // 重置表单
      this.setData({
        selectedType: '',
        content: '',
        contact: '',
        images: [],
        submitting: false,
        activeTab: 1
      })

      // 刷新列表
      this.loadFeedbackList()
    } catch (error) {
      console.error('提交反馈失败:', error)
      wx.showToast({ title: '提交失败，请重试', icon: 'error' })
      this.setData({ submitting: false })
    }
  },

  // 加载反馈列表
  async loadFeedbackList() {
    if (this.data.loading) return
    this.setData({ loading: true })

    try {
      const result = await listFeedbacks(20, 0)
      if (result.data && result.data.records) {
        const feedbackList = result.data.records.map(item => ({
          ...item,
          typeLabel: TYPE_LABEL_MAP[item.type] || '其他',
          displayTime: this.formatTime(item.created_at)
        }))
        this.setData({ feedbackList })
      }
    } catch (error) {
      console.error('加载反馈列表失败:', error)
    } finally {
      this.setData({ loading: false })
    }
  },

  // 查看反馈详情（展开回复）
  viewFeedbackDetail(event) {
    const feedbackId = event.currentTarget.dataset.id
    const feedback = this.data.feedbackList.find(item => item._id === feedbackId)
    if (feedback && feedback.reply) {
      wx.showModal({
        title: '官方回复',
        content: feedback.reply,
        showCancel: false,
        confirmText: '知道了'
      })
    }
  },

  // 格式化时间
  formatTime(dateValue) {
    if (!dateValue) return ''
    const date = new Date(dateValue)
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    return `${month}-${day} ${hours}:${minutes}`
  }
})