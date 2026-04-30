Component({
  properties: {
    postData: {
      type: Object,
      value: null
    }
  },

  data: {
    posterImage: ''  // 生成的海报临时路径
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
    // 绘制海报
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

          this.renderPoster(canvas, ctx, canvasWidth, canvasHeight)
        })
    },

    // 渲染海报内容
    async renderPoster(canvas, ctx, width, height) {
      const postData = this.properties.postData
      if (!postData) return

      // 背景
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, width, height)

      // 顶部品牌区域
      ctx.fillStyle = '#34BFA3'
      ctx.fillRect(0, 0, width, 120)

      // 品牌文字
      ctx.fillStyle = '#ffffff'
      ctx.font = 'bold 28px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('希舞之家', width / 2, 50)
      ctx.font = '18px sans-serif'
      ctx.fillText('希舞宝宝社区', width / 2, 85)

      // 分割线
      ctx.fillStyle = '#f0f0f0'
      ctx.fillRect(30, 140, width - 60, 1)

      // 用户信息
      ctx.textAlign = 'left'
      ctx.fillStyle = '#333333'
      ctx.font = 'bold 20px sans-serif'
      const displayName = postData.nickName || '希舞宝宝'
      ctx.fillText(displayName, 30, 180)

      // 发布时间
      ctx.fillStyle = '#999999'
      ctx.font = '14px sans-serif'
      const timeStr = this.formatPosterTime(postData.createdAt)
      ctx.fillText(timeStr, 30, 205)

      // 话题标签
      let contentStartY = 240
      if (postData.topicTitle) {
        ctx.fillStyle = '#34BFA3'
        ctx.font = '16px sans-serif'
        ctx.fillText(`# ${postData.topicTitle}`, 30, contentStartY)
        contentStartY += 35
      }

      // 帖子内容（自动换行）
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

      // 帖子图片（如果有，绘制第一张缩略图）
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
          console.error('加载帖子图片失败:', error)
          imageEndY = contentEndY
        }
      }

      // 统计信息
      ctx.fillStyle = '#999999'
      ctx.font = '14px sans-serif'
      const statsY = Math.min(imageEndY + 10, height - 220)
      ctx.fillText(`❤️ ${postData.likeCount || 0} 赞   💬 ${postData.commentCount || 0} 评论`, 30, statsY)

      // 底部区域 - 分隔线
      const bottomAreaY = height - 180
      ctx.fillStyle = '#f0f0f0'
      ctx.fillRect(30, bottomAreaY, width - 60, 1)

      // 底部 - 小程序码区域
      // 使用文字提示代替（用户可后续上传小程序码到云存储）
      ctx.fillStyle = '#666666'
      ctx.font = '16px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('打开微信扫一扫', width / 2, bottomAreaY + 50)
      ctx.fillText('进入「希舞之家」小程序查看详情', width / 2, bottomAreaY + 80)

      // 绘制小程序码占位圆
      ctx.beginPath()
      ctx.arc(width / 2, bottomAreaY + 130, 40, 0, Math.PI * 2)
      ctx.fillStyle = '#f0f0f0'
      ctx.fill()
      ctx.fillStyle = '#34BFA3'
      ctx.font = 'bold 14px sans-serif'
      ctx.fillText('小程序码', width / 2, bottomAreaY + 135)

      // 尝试加载小程序码图片（如果云存储中有）
      try {
        const qrcodeUrl = 'cloud://cloud1-4g0dlvsdc0db6c89.636c-cloud1-4g0dlvsdc0db6c89-1330686498/community-assets/qrcode.png'
        const qrcodeImg = await this.loadImage(canvas, qrcodeUrl)
        if (qrcodeImg) {
          // 清除占位圆，绘制真实小程序码
          ctx.fillStyle = '#ffffff'
          ctx.fillRect(width / 2 - 50, bottomAreaY + 85, 100, 100)
          ctx.drawImage(qrcodeImg, width / 2 - 45, bottomAreaY + 90, 90, 90)
        }
      } catch (error) {
        // 小程序码加载失败使用占位文字，不影响整体海报
        console.log('小程序码加载失败，使用占位:', error)
      }

      // 导出图片
      this.exportPoster(canvas)
    },

    // 导出海报为图片
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

    // 加载图片
    loadImage(canvas, url) {
      return new Promise((resolve, reject) => {
        // 如果是云存储文件，先获取临时链接
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

    // 文字自动换行
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

    // 格式化海报时间
    formatPosterTime(dateValue) {
      if (!dateValue) return ''
      const date = new Date(dateValue)
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      return `${year}年${month}月${day}日`
    },

    // 保存到相册
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

    // 关闭海报
    onClose() {
      this.triggerEvent('close')
    }
  }
})
