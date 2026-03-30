const {
  streamChat,
  getSceneConfig,
  getSystemPrompt,
  getDisclaimer,
  buildMedicalRecordContext,
  buildDrugAdjustmentContext,
  fetchBabyInfo,
  fetchSeizureSummary,
  fetchMedicationSummary,
  parseTimeRangeToDays
} = require('../../utils/ai-service.js')

Page({
  data: {
    scene: 'knowledge_qa',
    sceneConfig: {},
    messages: [],
    inputValue: '',
    inputPlaceholder: '输入您的问题...',
    isAIResponding: false,
    generating: false,
    scrollToMessage: '',

    // 病历生成时间范围
    timeRangeOptions: [
      { label: '最近1个月', value: 30 },
      { label: '最近3个月', value: 90 },
      { label: '最近半年', value: 180 },
      { label: '最近1年', value: 365 }
    ],
    selectedTimeRange: 30,

    // 内部状态
    _chatHistory: [],
    _systemPrompt: '',
    _stopRequested: false
  },

  onLoad(options) {
    const scene = options.scene || 'knowledge_qa'
    const sceneConfig = getSceneConfig(scene)
    const systemPrompt = getSystemPrompt(scene)

    const placeholderMap = {
      gene_report: '描述基因报告内容或上传图片...',
      medical_record: '可以追问病历相关问题...',
      drug_adjustment: '描述您的用药疑问...',
      knowledge_qa: '输入关于 CDKL5 的问题...'
    }

    this.setData({
      scene,
      sceneConfig,
      inputPlaceholder: placeholderMap[scene] || '输入您的问题...',
      _systemPrompt: systemPrompt
    })

    // 调药场景自动加载上下文
    if (scene === 'drug_adjustment') {
      this.loadDrugContext()
    }
  },

  // ==================== 上下文加载 ====================

  async loadDrugContext() {
    try {
      wx.showLoading({ title: '加载用药数据...' })
      const contextMessage = await buildDrugAdjustmentContext()
      this.data._chatHistory.push({ role: 'user', content: contextMessage })

      this.addAIMessage('正在分析您的用药数据...')
      await this.callAI()
    } catch (error) {
      console.error('加载调药上下文失败:', error)
      wx.showToast({ title: '数据加载失败', icon: 'error' })
    } finally {
      wx.hideLoading()
    }
  },

  // ==================== 消息发送 ====================

  onInputChange(event) {
    this.setData({ inputValue: event.detail.value })
  },

  async sendMessage() {
    const content = this.data.inputValue.trim()
    if (!content || this.data.isAIResponding) return

    this.setData({ inputValue: '' })
    this.addUserMessage(content)
    this.data._chatHistory.push({ role: 'user', content })

    this.addAIMessage('')
    await this.callAI()
  },

  sendQuickQuestion(event) {
    const question = event.currentTarget.dataset.question
    this.setData({ inputValue: question })
    this.sendMessage()
  },

  // ==================== 场景特定操作 ====================

  async uploadGeneReport() {
    try {
      const chooseResult = await wx.chooseMedia({
        count: 1,
        mediaType: ['image'],
        sourceType: ['album', 'camera'],
        sizeType: ['compressed']
      })

      const tempFilePath = chooseResult.tempFiles[0].tempFilePath
      wx.showLoading({ title: '上传中...' })

      const timestamp = Date.now()
      const randomStr = Math.random().toString(36).substr(2, 9)
      const cloudPath = `gene-reports/${timestamp}-${randomStr}.jpg`

      const uploadResult = await wx.cloud.uploadFile({
        cloudPath,
        filePath: tempFilePath
      })

      wx.hideLoading()

      this.addUserMessage('请帮我解读这份基因检测报告', tempFilePath)

      const userContent = '我上传了一份基因检测报告图片，请帮我解读报告中关于 CDKL5 基因的信息。' +
        '如果图片中包含基因变异信息，请分析突变位点、变异类型、致病性评级等。' +
        `图片地址：${uploadResult.fileID}`

      this.data._chatHistory.push({ role: 'user', content: userContent })
      this.addAIMessage('')
      await this.callAI()
    } catch (error) {
      wx.hideLoading()
      if (error.errMsg && error.errMsg.includes('cancel')) return
      console.error('上传基因报告失败:', error)
      wx.showToast({ title: '上传失败，请重试', icon: 'error' })
    }
  },

  selectTimeRange(event) {
    const value = event.currentTarget.dataset.value
    this.setData({ selectedTimeRange: value })
  },

  async generateMedicalRecord() {
    if (this.data.generating) return

    this.setData({ generating: true })

    try {
      wx.showLoading({ title: '正在收集数据...' })
      const contextMessage = await buildMedicalRecordContext(this.data.selectedTimeRange)
      wx.hideLoading()

      const rangeLabel = this.data.timeRangeOptions.find(
        option => option.value === this.data.selectedTimeRange
      )?.label || '最近1个月'

      this.addUserMessage(`请生成${rangeLabel}的病历摘要`)
      this.data._chatHistory.push({ role: 'user', content: contextMessage })

      this.addAIMessage('')
      await this.callAI()
    } catch (error) {
      wx.hideLoading()
      console.error('生成病历失败:', error)
      wx.showToast({ title: '生成失败，请重试', icon: 'error' })
    } finally {
      this.setData({ generating: false })
    }
  },

  // ==================== AI 调用核心 ====================

  async callAI() {
    if (this.data.isAIResponding) return

    this.setData({ isAIResponding: true, _stopRequested: false })
    const messageIndex = this.data.messages.length - 1

    this.setData({
      [`messages[${messageIndex}].typing`]: true
    })

    try {
      await streamChat(
        this.data._systemPrompt,
        this.data._chatHistory,
        (chunk, fullText) => {
          if (this.data._stopRequested) return

          this.setData({
            [`messages[${messageIndex}].content`]: fullText,
            [`messages[${messageIndex}].typing`]: false
          })
          this.scrollToBottom()
        },
        (fullText) => {
          const disclaimer = getDisclaimer(this.data.scene)
          const finalText = fullText + '\n\n' + disclaimer

          this.setData({
            [`messages[${messageIndex}].content`]: finalText,
            [`messages[${messageIndex}].typing`]: false,
            isAIResponding: false
          })

          this.data._chatHistory.push({ role: 'assistant', content: fullText })
          this.scrollToBottom()
        },
        (error) => {
          console.error('AI 调用失败:', error)
          this.setData({
            [`messages[${messageIndex}].content`]: '抱歉，AI 服务暂时不可用，请稍后重试。',
            [`messages[${messageIndex}].typing`]: false,
            isAIResponding: false
          })
        }
      )
    } catch (error) {
      console.error('AI 调用异常:', error)
      this.setData({
        [`messages[${messageIndex}].content`]: '网络异常，请检查网络后重试。',
        [`messages[${messageIndex}].typing`]: false,
        isAIResponding: false
      })
    }
  },

  stopResponse() {
    this.setData({
      _stopRequested: true,
      isAIResponding: false
    })

    const lastIndex = this.data.messages.length - 1
    if (lastIndex >= 0) {
      this.setData({
        [`messages[${lastIndex}].typing`]: false
      })
    }
  },

  // ==================== 消息管理 ====================

  addUserMessage(content, imagePath) {
    const message = { role: 'user', content }
    if (imagePath) message.image = imagePath

    const messages = [...this.data.messages, message]
    this.setData({ messages })
    this.scrollToBottom()
  },

  addAIMessage(content) {
    const message = {
      role: 'assistant',
      content: content || '',
      typing: !content
    }
    const messages = [...this.data.messages, message]
    this.setData({ messages })
    this.scrollToBottom()
  },

  clearChat() {
    wx.showModal({
      title: '清空对话',
      content: '确定要清空当前对话记录吗？',
      success: (res) => {
        if (res.confirm) {
          this.setData({ messages: [] })
          this.data._chatHistory = []
        }
      }
    })
  },

  // ==================== 辅助功能 ====================

  scrollToBottom() {
    setTimeout(() => {
      this.setData({ scrollToMessage: 'msg-bottom' })
    }, 100)
  },

  copyMessage(event) {
    const content = event.currentTarget.dataset.content
    wx.setClipboardData({
      data: content,
      success: () => {
        wx.showToast({ title: '已复制', icon: 'success' })
      }
    })
  },

  previewImage(event) {
    const src = event.currentTarget.dataset.src
    wx.previewImage({
      current: src,
      urls: [src]
    })
  },

  goBack() {
    wx.navigateBack({
      fail: () => {
        wx.switchTab({ url: '/pages/home/index' })
      }
    })
  }
})
