const BROCHURE_FILE_ID = 'cloud://cloud1-4g0dlvsdc0db6c89.636c-cloud1-4g0dlvsdc0db6c89-1334064886/gene-reports/CDKL5宣教手册 v2.pdf'

// 手册页面图片在云存储中的路径前缀
const PAGES_CLOUD_PREFIX = 'cloud://cloud1-4g0dlvsdc0db6c89.636c-cloud1-4g0dlvsdc0db6c89-1334064886/brochure-pages/'

Page({
  data: {
    loading: true,
    errorMsg: '',
    pages: [],
    totalPages: 0,
    currentPage: 1,
    showToolbar: true
  },

  _toolbarTimer: null,

  onLoad() {
    this.loadBrochurePages()
  },

  onUnload() {
    if (this._toolbarTimer) clearTimeout(this._toolbarTimer)
  },

  goBack() {
    wx.navigateBack()
  },

  async loadBrochurePages() {
    this.setData({ loading: true, errorMsg: '' })

    try {
      // 尝试获取手册页面图片列表
      // 约定路径：brochure-pages/page-1.jpg, page-2.jpg, ...
      // 先尝试获取前60页的临时链接（一般手册不超过60页）
      const MAX_PAGES = 60
      const fileIDs = []
      for (let i = 1; i <= MAX_PAGES; i++) {
        fileIDs.push(`${PAGES_CLOUD_PREFIX}page-${i}.jpg`)
      }

      const urlResult = await wx.cloud.getTempFileURL({ fileList: fileIDs })

      // 筛选有效的页面（status === 0 表示文件存在）
      const validPages = []
      for (const file of (urlResult.fileList || [])) {
        if (file.status === 0 && file.tempFileURL) {
          const match = file.fileID.match(/page-(\d+)\.jpg$/)
          if (match) {
            validPages.push({
              pageNum: parseInt(match[1]),
              url: file.tempFileURL,
              fileID: file.fileID
            })
          }
        }
      }

      validPages.sort((a, b) => a.pageNum - b.pageNum)

      if (validPages.length === 0) {
        this.setData({
          loading: false,
          errorMsg: 'no_pages'
        })
        return
      }

      this.setData({
        loading: false,
        pages: validPages,
        totalPages: validPages.length
      })
    } catch (error) {
      console.error('加载手册页面失败:', error)
      this.setData({
        loading: false,
        errorMsg: 'load_failed'
      })
    }
  },

  onPageScroll(e) {
    // 根据滚动位置估算当前页码
    // 通过 intersection observer 会更准确，但简单场景用 scroll 事件足够
  },

  onScrollToUpper() {
    this.setData({ currentPage: 1 })
  },

  // 点击图片放大预览
  previewPage(e) {
    const { index } = e.currentTarget.dataset
    const urls = this.data.pages.map(p => p.url)
    wx.previewImage({
      current: urls[index],
      urls
    })
  },

  // 图片加载完毕后更新页码
  onPageImageLoad(e) {
    const { index } = e.currentTarget.dataset
    // 使用 IntersectionObserver 来跟踪可见页
    if (index === 0 && !this._observerSetup) {
      this._observerSetup = true
      this.setupPageObserver()
    }
  },

  setupPageObserver() {
    if (this._observer) this._observer.disconnect()

    this._observer = this.createIntersectionObserver({
      observeAll: true,
      thresholds: [0.5]
    })

    this._observer.relativeTo('.pages-scroll').observe('.page-item', (res) => {
      if (res.intersectionRatio >= 0.5) {
        const match = (res.dataset || {}).index
        if (match !== undefined) {
          const pageNum = parseInt(match) + 1
          if (pageNum !== this.data.currentPage) {
            this.setData({ currentPage: pageNum })
          }
        }
      }
    })
  },

  toggleToolbar() {
    this.setData({ showToolbar: !this.data.showToolbar })
  },

  // 下载完整 PDF
  async downloadPDF() {
    try {
      wx.showLoading({ title: '正在下载...' })

      const urlResult = await wx.cloud.getTempFileURL({
        fileList: [BROCHURE_FILE_ID]
      })

      const fileInfo = urlResult.fileList && urlResult.fileList[0]

      let filePath
      if (fileInfo && fileInfo.status === 0 && fileInfo.tempFileURL) {
        const downloadResult = await new Promise((resolve, reject) => {
          wx.downloadFile({
            url: fileInfo.tempFileURL,
            success: resolve,
            fail: reject
          })
        })
        filePath = downloadResult.tempFilePath
      } else {
        const result = await wx.cloud.downloadFile({ fileID: BROCHURE_FILE_ID })
        filePath = result.tempFilePath
      }

      wx.hideLoading()

      if (filePath) {
        wx.openDocument({
          filePath,
          fileType: 'pdf',
          showMenu: true
        })
      } else {
        wx.showToast({ title: '下载失败', icon: 'none' })
      }
    } catch (error) {
      wx.hideLoading()
      console.error('下载PDF失败:', error)
      wx.showToast({ title: '下载失败，请重试', icon: 'none' })
    }
  },

  // 无图片时的兜底：直接打开PDF
  openPDFDirect() {
    this.downloadPDF()
  }
})
