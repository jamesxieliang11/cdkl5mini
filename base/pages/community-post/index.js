const { createCommunityPost, listCommunityTopics } = require('../../utils/database.js')

Page({
  data: {
    content: '',             // 帖子内容
    canSubmit: false,        // 是否可提交
    images: [],              // 图片临时路径列表
    isAnonymous: false,      // 是否匿名
    selectedTopic: null,     // 选中的话题
    topics: [],              // 话题列表
    showTopicPopup: false,   // 话题选择弹窗
    submitting: false,       // 提交中
    autoFocus: true          // 自动聚焦
  },

  onLoad() {
    this.loadTopics()
  },

  goBack() {
    wx.navigateBack()
  },

  // 加载话题列表
  async loadTopics() {
    try {
      const result = await listCommunityTopics()
      if (result.data && result.data.records) {
        this.setData({ topics: result.data.records })
      }
    } catch (error) {
      console.error('加载话题失败:', error)
    }
  },

  // 内容输入
  onContentInput(event) {
    this.setData({ content: event.detail.value })
  },

  // 选择图片
  chooseImage() {
    const remainCount = 9 - this.data.images.length
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

  // 匿名切换
  onAnonymousChange(event) {
    this.setData({ isAnonymous: event.detail })
  },

  // 显示话题选择
  showTopicPicker() {
    this.setData({ showTopicPopup: true })
  },

  // 隐藏话题选择
  hideTopicPicker() {
    this.setData({ showTopicPopup: false })
  },

  // 选择话题
  selectTopic(event) {
    const index = event.currentTarget.dataset.index
    this.setData({
      selectedTopic: this.data.topics[index],
      showTopicPopup: false
    })
  },

  // 清除话题选择
  clearTopic() {
    this.setData({
      selectedTopic: null,
      showTopicPopup: false
    })
  },

  // 上传图片到云存储
  async uploadImages() {
    const uploadedImages = []
    for (const tempPath of this.data.images) {
      const cloudPath = `community-images/${Date.now()}-${Math.random().toString(36).substring(2, 8)}.jpg`
      try {
        const uploadResult = await wx.cloud.uploadFile({
          cloudPath: cloudPath,
          filePath: tempPath
        })
        uploadedImages.push({
          fileID: uploadResult.fileID,
          cloudPath: cloudPath
        })
      } catch (error) {
        console.error('图片上传失败:', error)
      }
    }
    return uploadedImages
  },

  // 提交帖子
  async submitPost() {
    console.log('[社区发帖] 点击发布按钮, content:', this.data.content, 'canSubmit:', this.data.canSubmit)

    if (!this.data.content.trim()) {
      wx.showToast({ title: '请输入内容', icon: 'none' })
      return
    }

    this.setData({ submitting: true })
    console.log('[社区发帖] 开始提交, userId:', wx.getStorageSync('userId'))

    try {
      // 上传图片
      let images = []
      if (this.data.images.length > 0) {
        wx.showLoading({ title: '上传图片中...' })
        images = await this.uploadImages()
        wx.hideLoading()
      }

      // 获取用户信息
      const userInfo = wx.getStorageSync('userInfo') || {}

      const postData = {
        content: this.data.content.trim(),
        images: images,
        isAnonymous: this.data.isAnonymous,
        topicId: this.data.selectedTopic ? this.data.selectedTopic._id : '',
        nickName: userInfo.nickName || '希舞宝宝',
        avatarUrl: userInfo.avatarUrl || ''
      }
      console.log('[社区发帖] 提交数据:', JSON.stringify(postData))

      const result = await createCommunityPost(postData)
      console.log('[社区发帖] 提交结果:', JSON.stringify(result))

      wx.showToast({ title: '发布成功', icon: 'success' })

      // 延迟返回，让用户看到成功提示
      setTimeout(() => {
        wx.navigateBack()
      }, 1000)
    } catch (error) {
      console.error('[社区发帖] 发布失败:', error, error.message, error.stack)
      wx.showToast({ title: error.message || '发布失败，请查看控制台', icon: 'none' })
    } finally {
      this.setData({ submitting: false })
    }
  }
})
