Component({
  properties: {
    postData: {
      type: Object,
      value: null
    },
    type: {
      type: String,
      value: 'post'
    }
  },

  data: {
    posterImage: ''
  },

  lifetimes: {
    attached() {
      if (this.properties.postData) {
        this.drawPoster()
      }
    }
  },

  observers: {
    'postData': function(newVal) {
      if (newVal) {
        this.drawPoster()
      }
    }
  },

  methods: {
    async drawPoster() {
      const query = this.createSelectorQuery()
      query.select('#posterCanvas')
        .fields({ node: true, size: true })
        .exec((res) => {
          if (!res[0] || !res[0].node) {
            console.error('Canvas 节点未找到')
            return
          }

          const canvas = res[0].node
          const ctx = canvas.getContext('2d')
          const dpr = wx.getWindowInfo().pixelRatio
          const canvasWidth = 600
          const canvasHeight = 900

          canvas.width = canvasWidth * dpr
          canvas.height = canvasHeight * dpr
          ctx.scale(dpr, dpr)

          this._canvas = canvas
          this._ctx = ctx
          this._canvasWidth = canvasWidth
          this._canvasHeight = canvasHeight

          switch (this.data.type) {
            case 'checkin':
              this.renderCheckinPoster(canvas, ctx, canvasWidth, canvasHeight)
              break
            case 'stats':
              this.renderStatsPoster(canvas, ctx, canvasWidth, canvasHeight)
              break
            case 'activity':
              this.renderActivityPoster(canvas, ctx, canvasWidth, canvasHeight)
              break
            default:
              this.renderPostPoster(canvas, ctx, canvasWidth, canvasHeight)
          }
        })
    },

    // ===================== 社区帖子海报（原有逻辑） =====================
    async renderPostPoster(canvas, ctx, width, height) {
      const postData = this.properties.postData
      if (!postData) return

      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, width, height)

      ctx.fillStyle = '#34BFA3'
      ctx.fillRect(0, 0, width, 120)

      ctx.fillStyle = '#ffffff'
      ctx.font = 'bold 28px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('希舞之家', width / 2, 50)
      ctx.font = '18px sans-serif'
      ctx.fillText('希舞宝宝社区', width / 2, 85)

      ctx.fillStyle = '#f0f0f0'
      ctx.fillRect(30, 140, width - 60, 1)

      ctx.textAlign = 'left'
      ctx.fillStyle = '#333333'
      ctx.font = 'bold 20px sans-serif'
      ctx.fillText(postData.nickName || '希舞宝宝', 30, 180)

      ctx.fillStyle = '#999999'
      ctx.font = '14px sans-serif'
      ctx.fillText(this.formatPosterTime(postData.createdAt), 30, 205)

      let contentStartY = 240
      if (postData.topicTitle) {
        ctx.fillStyle = '#34BFA3'
        ctx.font = '16px sans-serif'
        ctx.fillText(`# ${postData.topicTitle}`, 30, contentStartY)
        contentStartY += 35
      }

      ctx.fillStyle = '#333333'
      ctx.font = '18px sans-serif'
      const contentLines = this.wrapText(ctx, postData.content || '', width - 60, 18)
      const maxContentLines = 12
      const displayLines = contentLines.slice(0, maxContentLines)

      displayLines.forEach((line, index) => {
        ctx.fillText(line, 30, contentStartY + index * 28)
      })

      if (contentLines.length > maxContentLines) {
        ctx.fillStyle = '#999999'
        ctx.fillText('...', 30, contentStartY + maxContentLines * 28)
      }

      const contentEndY = contentStartY + Math.min(contentLines.length, maxContentLines) * 28 + 20

      let imageEndY = contentEndY
      if (postData.images && postData.images.length > 0) {
        try {
          const imageUrl = postData.images[0].fileID
          const imgResult = await this.loadImage(canvas, imageUrl)
          if (imgResult) {
            const imgWidth = width - 60
            const imgHeight = 200
            ctx.drawImage(imgResult, 30, contentEndY, imgWidth, imgHeight)
            imageEndY = contentEndY + imgHeight + 20
          }
        } catch (error) {
          imageEndY = contentEndY
        }
      }

      ctx.fillStyle = '#999999'
      ctx.font = '14px sans-serif'
      const statsY = Math.min(imageEndY + 10, height - 220)
      ctx.fillText(`❤️ ${postData.likeCount || 0} 赞   💬 ${postData.commentCount || 0} 评论`, 30, statsY)

      await this.drawFooter(canvas, ctx, width, height)
      this.exportPoster(canvas)
    },

    // ===================== 打卡海报 =====================
    async renderCheckinPoster(canvas, ctx, width, height) {
      const data = this.properties.postData
      if (!data) return

      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, width, height)

      // 顶部渐变区
      const gradient = ctx.createLinearGradient(0, 0, width, 160)
      gradient.addColorStop(0, '#34BFA3')
      gradient.addColorStop(1, '#2dd4a8')
      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, width, 160)

      ctx.fillStyle = '#ffffff'
      ctx.font = 'bold 32px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('🌿 希舞之家', width / 2, 60)
      ctx.font = '18px sans-serif'
      ctx.fillText('每一天都是进步', width / 2, 100)
      ctx.font = '14px sans-serif'
      ctx.globalAlpha = 0.8
      ctx.fillText(data.nickName || '希舞宝宝', width / 2, 135)
      ctx.globalAlpha = 1

      // 主体卡片区
      const cardY = 200
      ctx.fillStyle = '#f8faf9'
      this.drawRoundRect(ctx, 40, cardY, width - 80, 400, 20)
      ctx.fill()

      // 打卡成功
      ctx.fillStyle = '#34BFA3'
      ctx.font = 'bold 28px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('✅ 今日打卡成功', width / 2, cardY + 60)

      // 连续天数（大字）
      if (data.streak > 0) {
        ctx.fillStyle = '#FF6B6B'
        ctx.font = 'bold 72px sans-serif'
        ctx.fillText(String(data.streak), width / 2, cardY + 170)

        ctx.fillStyle = '#666'
        ctx.font = '20px sans-serif'
        ctx.fillText('🔥 连续记录天数', width / 2, cardY + 210)
      }

      // 今日记录
      const RECORD_LABELS = { medication: '用药', seizure: '发作', other: '其他' }
      const typeLabel = RECORD_LABELS[data.recordType] || '其他'
      ctx.fillStyle = '#999'
      ctx.font = '18px sans-serif'
      ctx.fillText(`💊 今日${typeLabel}记录 ${data.todayCount || 0} 条`, width / 2, cardY + 280)

      // 累计天数
      if (data.totalDays > 0) {
        ctx.fillText(`📊 累计记录 ${data.totalDays} 天`, width / 2, cardY + 320)
      }

      // 日期
      ctx.fillStyle = '#bbb'
      ctx.font = '16px sans-serif'
      ctx.fillText(data.date || this.formatPosterTime(new Date()), width / 2, cardY + 370)

      await this.drawFooter(canvas, ctx, width, height)
      this.exportPoster(canvas)
    },

    // ===================== 统计海报 =====================
    async renderStatsPoster(canvas, ctx, width, height) {
      const data = this.properties.postData
      if (!data) return

      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, width, height)

      // 顶部
      const gradient = ctx.createLinearGradient(0, 0, width, 140)
      gradient.addColorStop(0, '#34BFA3')
      gradient.addColorStop(1, '#2da88e')
      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, width, 140)

      ctx.fillStyle = '#ffffff'
      ctx.font = 'bold 28px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('🌿 希舞之家 · 我的记录', width / 2, 55)
      ctx.font = '16px sans-serif'
      ctx.globalAlpha = 0.9
      ctx.fillText(data.nickName || '希舞宝宝', width / 2, 90)
      if (data.firstRecordDate) {
        ctx.font = '14px sans-serif'
        ctx.fillText(`从 ${data.firstRecordDate} 加入`, width / 2, 120)
      }
      ctx.globalAlpha = 1

      // 三大数字
      const numY = 220
      const cols = [
        { value: String(data.totalDays || 0), label: '记录天数' },
        { value: String(data.streak || 0), label: '连续天数' },
        { value: String(data.totalRecords || 0), label: '总记录数' }
      ]
      const colWidth = (width - 60) / 3
      cols.forEach((col, i) => {
        const cx = 30 + colWidth * i + colWidth / 2
        ctx.fillStyle = '#333'
        ctx.font = 'bold 48px sans-serif'
        ctx.fillText(col.value, cx, numY)
        ctx.fillStyle = '#999'
        ctx.font = '16px sans-serif'
        ctx.fillText(col.label, cx, numY + 35)
      })

      // 分隔线
      ctx.fillStyle = '#f0f0f0'
      ctx.fillRect(40, numY + 60, width - 80, 1)

      // 详细记录
      const detailY = numY + 100
      const details = [
        { icon: '💊', value: String(data.medicationCount || 0), label: '用药' },
        { icon: '⚡', value: String(data.seizureCount || 0), label: '发作' },
        { icon: '📄', value: String(data.otherCount || 0), label: '其他' }
      ]
      details.forEach((d, i) => {
        const cx = 30 + colWidth * i + colWidth / 2
        ctx.fillStyle = '#333'
        ctx.font = '20px sans-serif'
        ctx.fillText(`${d.icon} ${d.value}`, cx, detailY)
        ctx.fillStyle = '#999'
        ctx.font = '14px sans-serif'
        ctx.fillText(d.label, cx, detailY + 30)
      })

      // 成就
      if (data.achievements && data.achievements.length > 0) {
        ctx.fillStyle = '#f0f0f0'
        ctx.fillRect(40, detailY + 60, width - 80, 1)

        const achY = detailY + 100
        ctx.fillStyle = '#666'
        ctx.font = '16px sans-serif'
        ctx.fillText('已解锁成就', width / 2, achY)

        const icons = data.achievements.map(a => a.icon || a).join('  ')
        ctx.font = '32px sans-serif'
        ctx.fillText(icons, width / 2, achY + 50)
      }

      // 社区数据
      if (data.postCount > 0 || data.commentCount > 0) {
        const socialY = data.achievements && data.achievements.length > 0 ? detailY + 190 : detailY + 100
        ctx.fillStyle = '#bbb'
        ctx.font = '14px sans-serif'
        ctx.fillText(`社区：${data.postCount || 0}帖 · ${data.commentCount || 0}评 · ${data.likesReceived || 0}赞`, width / 2, socialY)
      }

      await this.drawFooter(canvas, ctx, width, height)
      this.exportPoster(canvas)
    },

    // ===================== 活动海报 =====================
    async renderActivityPoster(canvas, ctx, width, height) {
      const data = this.properties.postData
      if (!data) return

      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, width, height)

      // 顶部
      const gradient = ctx.createLinearGradient(0, 0, width, 160)
      gradient.addColorStop(0, '#FF6B6B')
      gradient.addColorStop(1, '#ee5a5a')
      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, width, 160)

      ctx.fillStyle = '#ffffff'
      ctx.font = 'bold 28px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('🎯 活动参与证书', width / 2, 55)
      ctx.font = '18px sans-serif'
      ctx.fillText('希舞之家', width / 2, 90)

      // 活动名
      ctx.fillStyle = '#333'
      ctx.font = 'bold 32px sans-serif'
      ctx.fillText(data.activityTitle || '社区活动', width / 2, 260)

      // 参与者名
      ctx.fillStyle = '#666'
      ctx.font = '20px sans-serif'
      ctx.fillText(data.nickName || '希舞宝宝', width / 2, 340)
      ctx.fillText('已参与本次活动', width / 2, 380)

      // 参与统计
      if (data.participationCount > 0) {
        ctx.fillStyle = '#FF6B6B'
        ctx.font = 'bold 56px sans-serif'
        ctx.fillText(String(data.participationCount), width / 2, 480)
        ctx.fillStyle = '#999'
        ctx.font = '18px sans-serif'
        ctx.fillText('次打卡', width / 2, 520)
      }

      // 日期
      ctx.fillStyle = '#bbb'
      ctx.font = '16px sans-serif'
      ctx.fillText(data.date || this.formatPosterTime(new Date()), width / 2, 580)

      await this.drawFooter(canvas, ctx, width, height)
      this.exportPoster(canvas)
    },

    // ===================== 共用方法 =====================
    async drawFooter(canvas, ctx, width, height) {
      const bottomAreaY = height - 180
      ctx.fillStyle = '#f0f0f0'
      ctx.fillRect(30, bottomAreaY, width - 60, 1)

      ctx.fillStyle = '#666666'
      ctx.font = '16px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('打开微信扫一扫', width / 2, bottomAreaY + 50)
      ctx.fillText('进入「希舞之家」小程序', width / 2, bottomAreaY + 80)

      ctx.beginPath()
      ctx.arc(width / 2, bottomAreaY + 130, 40, 0, Math.PI * 2)
      ctx.fillStyle = '#f0f0f0'
      ctx.fill()
      ctx.fillStyle = '#34BFA3'
      ctx.font = 'bold 14px sans-serif'
      ctx.fillText('小程序码', width / 2, bottomAreaY + 135)

      try {
        const qrcodeImg = await this.loadImage(canvas, '/icons/qrcode.png')
        if (qrcodeImg) {
          ctx.fillStyle = '#ffffff'
          ctx.fillRect(width / 2 - 50, bottomAreaY + 85, 100, 100)
          ctx.drawImage(qrcodeImg, width / 2 - 45, bottomAreaY + 90, 90, 90)
        }
      } catch (error) {
        console.log('小程序码加载失败，使用占位:', error)
      }
    },

    drawRoundRect(ctx, x, y, w, h, r) {
      ctx.beginPath()
      ctx.moveTo(x + r, y)
      ctx.lineTo(x + w - r, y)
      ctx.arcTo(x + w, y, x + w, y + r, r)
      ctx.lineTo(x + w, y + h - r)
      ctx.arcTo(x + w, y + h, x + w - r, y + h, r)
      ctx.lineTo(x + r, y + h)
      ctx.arcTo(x, y + h, x, y + h - r, r)
      ctx.lineTo(x, y + r)
      ctx.arcTo(x, y, x + r, y, r)
      ctx.closePath()
    },

    exportPoster(canvas) {
      setTimeout(() => {
        wx.canvasToTempFilePath({
          canvas: canvas,
          fileType: 'jpg',
          quality: 0.9,
          success: (res) => {
            this.setData({ posterImage: res.tempFilePath })
          },
          fail: (error) => {
            console.error('导出海报失败:', error)
            wx.showToast({ title: '海报生成失败', icon: 'none' })
          }
        })
      }, 200)
    },

    loadImage(canvas, url) {
      return new Promise((resolve, reject) => {
        if (url.startsWith('cloud://')) {
          wx.cloud.getTempFileURL({
            fileList: [url],
            success: (res) => {
              if (res.fileList && res.fileList[0] && res.fileList[0].tempFileURL) {
                const img = canvas.createImage()
                img.onload = () => resolve(img)
                img.onerror = (error) => reject(error)
                img.src = res.fileList[0].tempFileURL
              } else {
                reject(new Error('获取临时链接失败'))
              }
            },
            fail: reject
          })
        } else {
          const img = canvas.createImage()
          img.onload = () => resolve(img)
          img.onerror = (error) => reject(error)
          img.src = url
        }
      })
    },

    wrapText(ctx, text, maxWidth, fontSize) {
      const lines = []
      const paragraphs = text.split('\n')

      paragraphs.forEach(paragraph => {
        let currentLine = ''
        for (let i = 0; i < paragraph.length; i++) {
          const char = paragraph[i]
          const testLine = currentLine + char
          const metrics = ctx.measureText(testLine)
          if (metrics.width > maxWidth && currentLine) {
            lines.push(currentLine)
            currentLine = char
          } else {
            currentLine = testLine
          }
        }
        if (currentLine) {
          lines.push(currentLine)
        }
      })

      return lines
    },

    formatPosterTime(dateValue) {
      if (!dateValue) return ''
      const date = new Date(dateValue)
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      return `${year}年${month}月${day}日`
    },

    savePoster() {
      if (!this.data.posterImage) {
        wx.showToast({ title: '海报未生成', icon: 'none' })
        return
      }

      wx.saveImageToPhotosAlbum({
        filePath: this.data.posterImage,
        success: () => {
          this.triggerEvent('saved')
        },
        fail: (error) => {
          if (error.errMsg.includes('auth deny') || error.errMsg.includes('authorize')) {
            wx.showModal({
              title: '需要相册权限',
              content: '请在设置中允许访问相册，才能保存海报',
              confirmText: '去设置',
              success: (res) => {
                if (res.confirm) {
                  wx.openSetting()
                }
              }
            })
          } else {
            wx.showToast({ title: '保存失败', icon: 'none' })
          }
        }
      })
    },

    onClose() {
      this.triggerEvent('close')
    }
  }
})
