const {
  streamChat,
  getSceneConfig,
  getSystemPrompt,
  getDisclaimer,
  buildMedicalRecordContext,
  buildDrugAdjustmentContext,
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
    _stopRequested: false,
    _contextLoaded: false
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
      this.setData({ _contextLoaded: true })

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

    // 病历生成场景：如果还没加载用户数据上下文，先加载后再追加用户问题
    if (this.data.scene === 'medical_record' && !this.data._contextLoaded) {
      try {
        wx.showLoading({ title: '正在收集数据...' })
        const contextMessage = await buildMedicalRecordContext(this.data.selectedTimeRange)
        wx.hideLoading()
        this.data._chatHistory.push({ role: 'user', content: contextMessage })
        this.data._chatHistory.push({ role: 'user', content })
        this.setData({ _contextLoaded: true })
      } catch (error) {
        wx.hideLoading()
        console.error('加载病历上下文失败:', error)
        // 降级：不加载上下文，仅发送用户问题
        this.data._chatHistory.push({ role: 'user', content })
      }
    } else {
      this.data._chatHistory.push({ role: 'user', content })
    }

    this.addAIMessage('')
    await this.callAI()
  },

  sendQuickQuestion(event) {
    const question = event.currentTarget.dataset.question

    // 病历生成场景：从快捷问题中解析时间范围，走 generateMedicalRecord 流程
    if (this.data.scene === 'medical_record') {
      const days = parseTimeRangeToDays(question)
      this.setData({ selectedTimeRange: days })
      this.generateMedicalRecord()
      return
    }

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
      this.setData({ _contextLoaded: true })

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
            [`messages[${messageIndex}].parsedBlocks`]: this.parseMarkdown(fullText),
            [`messages[${messageIndex}].typing`]: false
          })
          this.scrollToBottom()
        },
        (fullText) => {
          const disclaimer = getDisclaimer(this.data.scene)
          const finalText = fullText + '\n\n' + disclaimer

          this.setData({
            [`messages[${messageIndex}].content`]: finalText,
            [`messages[${messageIndex}].parsedBlocks`]: this.parseMarkdown(finalText),
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
    const parsedBlocks = content ? this.parseMarkdown(content) : []
    const message = {
      role: 'assistant',
      content: content || '',
      parsedBlocks,
      typing: !content
    }
    const messages = [...this.data.messages, message]
    this.setData({ messages })
    this.scrollToBottom()
  },

  // ==================== Markdown 解析 ====================

  /**
   * 将 Markdown 文本解析为结构化 block 列表，供 wxml 渲染
   * 支持：### 标题、#### 标题、**加粗**、- 列表项、普通段落
   */
  parseMarkdown(text) {
    if (!text) return []
    const lines = text.split('\n')
    const blocks = []

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      const trimmed = line.trim()

      if (!trimmed) {
        // 空行：段落分隔，跳过
        continue
      }

      if (trimmed.startsWith('### ')) {
        blocks.push({ type: 'h3', text: trimmed.slice(4).replace(/\*\*/g, '') })
        continue
      }

      if (trimmed.startsWith('#### ')) {
        blocks.push({ type: 'h4', text: trimmed.slice(5).replace(/\*\*/g, '') })
        continue
      }

      if (trimmed.startsWith('## ')) {
        blocks.push({ type: 'h2', text: trimmed.slice(3).replace(/\*\*/g, '') })
        continue
      }

      if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        const itemText = trimmed.slice(2)
        blocks.push({ type: 'list-item', segments: this.parseInlineMarkdown(itemText) })
        continue
      }

      // 普通段落，解析行内加粗
      blocks.push({ type: 'paragraph', segments: this.parseInlineMarkdown(trimmed) })
    }

    return blocks
  },

  /**
   * 解析行内 Markdown（**加粗**），返回 [{text, bold}] 片段列表
   */
  parseInlineMarkdown(text) {
    const segments = []
    const regex = /\*\*(.+?)\*\*/g
    let lastIndex = 0
    let match

    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        segments.push({ text: text.slice(lastIndex, match.index), bold: false })
      }
      segments.push({ text: match[1], bold: true })
      lastIndex = regex.lastIndex
    }

    if (lastIndex < text.length) {
      segments.push({ text: text.slice(lastIndex), bold: false })
    }

    return segments.length > 0 ? segments : [{ text, bold: false }]
  },

  clearChat() {
    wx.showModal({
      title: '清空对话',
      content: '确定要清空当前对话记录吗？',
      success: (res) => {
        if (res.confirm) {
          this.setData({ messages: [], _contextLoaded: false })
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

  // ==================== 导出病历为图片 ====================

  exportMedicalRecord(event) {
    const content = event.currentTarget.dataset.content
    if (!content) return

    wx.showActionSheet({
      itemList: ['保存到相册', '复制文本内容'],
      success: (res) => {
        if (res.tapIndex === 0) {
          this.saveRecordAsImage(content)
        } else if (res.tapIndex === 1) {
          wx.setClipboardData({
            data: content,
            success: () => wx.showToast({ title: '已复制', icon: 'success' })
          })
        }
      }
    })
  },

  async saveRecordAsImage(content) {
    wx.showLoading({ title: '生成图片中...' })

    try {
      // 检查相册权限
      const authResult = await new Promise((resolve) => {
        wx.authorize({
          scope: 'scope.writePhotosAlbum',
          success: () => resolve(true),
          fail: () => resolve(false)
        })
      })

      if (!authResult) {
        wx.hideLoading()
        wx.showModal({
          title: '需要相册权限',
          content: '请在设置中开启相册权限，才能保存图片',
          confirmText: '去设置',
          success: (res) => {
            if (res.confirm) wx.openSetting()
          }
        })
        return
      }

      const systemInfo = wx.getSystemInfoSync()
      const canvasWidth = systemInfo.windowWidth
      const pixelRatio = systemInfo.pixelRatio

      // 解析内容为行
      const lines = this.buildImageLines(content, canvasWidth - 80)
      const lineHeight = 44
      const titleHeight = 120
      const footerHeight = 80
      const paddingVertical = 60
      const canvasHeight = titleHeight + paddingVertical + lines.length * lineHeight + footerHeight + paddingVertical

      this.setData({ exportCanvasWidth: canvasWidth, exportCanvasHeight: canvasHeight })

      await new Promise(resolve => setTimeout(resolve, 200))

      const ctx = wx.createCanvasContext('exportCanvas', this)

      // 背景
      ctx.setFillStyle('#ffffff')
      ctx.fillRect(0, 0, canvasWidth, canvasHeight)

      // 顶部装饰条
      ctx.setFillStyle('#34BFA3')
      ctx.fillRect(0, 0, canvasWidth, 8)

      // 标题区域
      ctx.setFillStyle('#f8fffe')
      ctx.fillRect(0, 8, canvasWidth, titleHeight - 8)

      ctx.setFillStyle('#34BFA3')
      ctx.setFontSize(36)
      ctx.setTextAlign('center')
      ctx.fillText('📋 病历摘要', canvasWidth / 2, 60)

      ctx.setFillStyle('#888888')
      ctx.setFontSize(24)
      const dateStr = new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })
      ctx.fillText(`生成时间：${dateStr}`, canvasWidth / 2, 100)

      // 分割线
      ctx.setStrokeStyle('#e8e8e8')
      ctx.setLineWidth(1)
      ctx.beginPath()
      ctx.moveTo(40, titleHeight)
      ctx.lineTo(canvasWidth - 40, titleHeight)
      ctx.stroke()

      // 内容区域
      let currentY = titleHeight + paddingVertical
      ctx.setTextAlign('left')

      for (const line of lines) {
        if (line.type === 'h3') {
          ctx.setFillStyle('#34BFA3')
          ctx.setFontSize(32)
          ctx.fillText(line.text, 40, currentY)
        } else if (line.type === 'h4') {
          ctx.setFillStyle('#333333')
          ctx.setFontSize(28)
          ctx.fillText(line.text, 40, currentY)
        } else if (line.type === 'list') {
          // 列表首行：绘制圆点 + 文字
          ctx.setFillStyle('#34BFA3')
          ctx.setFontSize(26)
          ctx.fillText('•', 40, currentY)
          ctx.setFillStyle('#444444')
          ctx.fillText(line.text, 64, currentY)
        } else if (line.type === 'list-cont') {
          // 列表续行：与首行文字对齐，不重复绘制圆点
          ctx.setFillStyle('#444444')
          ctx.setFontSize(26)
          ctx.fillText(line.text, 64, currentY)
        } else {
          ctx.setFillStyle('#555555')
          ctx.setFontSize(26)
          ctx.fillText(line.text, 40, currentY)
        }
        currentY += lineHeight
      }

      // 底部免责声明
      ctx.setFillStyle('#f5f5f5')
      ctx.fillRect(0, canvasHeight - footerHeight - paddingVertical, canvasWidth, footerHeight + paddingVertical)

      ctx.setFillStyle('#aaaaaa')
      ctx.setFontSize(20)
      ctx.setTextAlign('center')
      ctx.fillText('本病历摘要由 AI 生成，仅供参考，不构成医学建议', canvasWidth / 2, canvasHeight - footerHeight)
      ctx.fillText('请遵医嘱，如有疑问请咨询专业医生', canvasWidth / 2, canvasHeight - footerHeight + 32)

      ctx.draw(false, async () => {
        try {
          const tempFilePath = await new Promise((resolve, reject) => {
            wx.canvasToTempFilePath({
              canvasId: 'exportCanvas',
              x: 0,
              y: 0,
              width: canvasWidth,
              height: canvasHeight,
              destWidth: canvasWidth * pixelRatio,
              destHeight: canvasHeight * pixelRatio,
              fileType: 'jpg',
              quality: 0.95,
              success: (res) => resolve(res.tempFilePath),
              fail: reject
            }, this)
          })

          await new Promise((resolve, reject) => {
            wx.saveImageToPhotosAlbum({
              filePath: tempFilePath,
              success: resolve,
              fail: reject
            })
          })

          wx.hideLoading()
          wx.showToast({ title: '已保存到相册', icon: 'success' })
        } catch (error) {
          wx.hideLoading()
          console.error('保存图片失败:', error)
          wx.showToast({ title: '保存失败，请重试', icon: 'error' })
        }
      })
    } catch (error) {
      wx.hideLoading()
      console.error('生成图片失败:', error)
      wx.showToast({ title: '生成失败，请重试', icon: 'error' })
    }
  },

  /**
   * 将病历文本转换为适合 canvas 绘制的行列表
   * 每行包含 type 和 text，并处理长文本自动换行
   * @param {string} content - 原始 Markdown 文本
   * @param {number} maxWidth - 内容区域最大像素宽度（已减去左右 padding）
   */
  buildImageLines(content, maxWidth) {
    const blocks = this.parseMarkdown(content)
    const lines = []
    // 列表项因为有 • 符号占位，可用宽度要减去缩进量（24px）
    const listIndent = 24

    for (const block of blocks) {
      if (block.type === 'h3' || block.type === 'h2') {
        // 标题字体 32px，单行不换行（标题通常较短）
        lines.push({ type: 'h3', text: block.text })
        continue
      }

      if (block.type === 'h4') {
        lines.push({ type: 'h4', text: block.text })
        continue
      }

      // 将 segments 拼接为纯文本
      const plainText = (block.segments || []).map(s => s.text).join('')

      if (block.type === 'list-item') {
        // 列表项字体 26px，可用宽度减去缩进
        const wrappedLines = this.wrapTextByPixel(plainText, maxWidth - listIndent, 26)
        wrappedLines.forEach((wrappedLine, index) => {
          lines.push({ type: index === 0 ? 'list' : 'list-cont', text: wrappedLine })
        })
        continue
      }

      // 普通段落字体 26px
      const wrappedLines = this.wrapTextByPixel(plainText, maxWidth, 26)
      wrappedLines.forEach(wrappedLine => {
        lines.push({ type: 'paragraph', text: wrappedLine })
      })
    }

    return lines
  },

  /**
   * 按像素宽度对文本进行换行，精确处理中英文混排
   * 中文字符宽度 ≈ fontSize，ASCII 字符宽度 ≈ fontSize * 0.55
   * @param {string} text - 待换行文本
   * @param {number} maxWidthPx - 最大像素宽度
   * @param {number} fontSize - 字体大小（px）
   */
  wrapTextByPixel(text, maxWidthPx, fontSize) {
    if (!text) return []

    const chineseCharWidth = fontSize
    const asciiCharWidth = fontSize * 0.55

    const measureWidth = (str) => {
      let width = 0
      for (const char of str) {
        width += char.charCodeAt(0) > 127 ? chineseCharWidth : asciiCharWidth
      }
      return width
    }

    const result = []
    let remaining = text

    while (remaining.length > 0) {
      let lineWidth = 0
      let cutIndex = 0

      for (let i = 0; i < remaining.length; i++) {
        const charWidth = remaining.charCodeAt(i) > 127 ? chineseCharWidth : asciiCharWidth
        if (lineWidth + charWidth > maxWidthPx) {
          cutIndex = i
          break
        }
        lineWidth += charWidth
        cutIndex = i + 1
      }

      result.push(remaining.slice(0, cutIndex))
      remaining = remaining.slice(cutIndex)
    }

    return result
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
