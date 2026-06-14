const BROCHURE_FILE_ID = 'cloud://cloud1-4g0dlvsdc0db6c89.636c-cloud1-4g0dlvsdc0db6c89-1334064886/gene-reports/CDKL5宣教手册 v2.pdf'

Page({
  data: {
    loading: true,
    converting: false,
    errorMsg: '',
    pages: [],
    totalPages: 0,
    currentPage: 1,
    showToolbar: true
  },

  onLoad() {
    this.loadBrochurePages()
  },

  goBack() {
    wx.navigateBack()
  },

  async loadBrochurePages() {
    this.setData({ loading: true, errorMsg: '' })

    try {
      // 先查缓存（已转换的图片）
      const cacheResult = await wx.cloud.callFunction({
        name: 'pdfConvert',
        data: { action: 'getPages', fileID: BROCHURE_FILE_ID }
      })

      if (cacheResult.result.success && cacheResult.result.data.pages.length > 0) {
        this.setData({
          loading: false,
          pages: cacheResult.result.data.pages,
          totalPages: cacheResult.result.data.totalPages
        })
        return
      }

      // 没有缓存，触发转换
      this.setData({ loading: false, converting: true })
      await this.convertAndLoad()
    } catch (error) {
      console.error('加载手册失败:', error)
      this.setData({ loading: false, errorMsg: 'load_failed' })
    }
  },

  async convertAndLoad() {
    try {
      const result = await wx.cloud.callFunction({
        name: 'pdfConvert',
        data: { action: 'convert', fileID: BROCHURE_FILE_ID }
      })

      if (result.result.success && result.result.data.pages.length > 0) {
        this.setData({
          converting: false,
          pages: result.result.data.pages,
          totalPages: result.result.data.totalPages
        })
      } else {
        throw new Error(result.result.message || '转换失败')
      }
    } catch (error) {
      console.error('转换PDF失败:', error)
      this.setData({ converting: false, errorMsg: 'convert_failed' })
    }
  },

  previewPage(e) {
    const { index } = e.currentTarget.dataset
    const urls = this.data.pages.map(p => p.url)
    wx.previewImage({ current: urls[index], urls })
  },

  onPageImageLoad(e) {
    const { index } = e.currentTarget.dataset
    if (index === 0 && !this._observerSetup) {
      this._observerSetup = true
      this.setupPageObserver()
    }
  },

  setupPageObserver() {
    if (this._observer) this._observer.disconnect()
    this._observer = this.createIntersectionObserver({ observeAll: true, thresholds: [0.5] })
    this._observer.relativeTo('.pages-scroll').observe('.page-item', (res) => {
      if (res.intersectionRatio >= 0.5 && res.dataset && res.dataset.index !== undefined) {
        const pageNum = parseInt(res.dataset.index) + 1
        if (pageNum !== this.data.currentPage) {
          this.setData({ currentPage: pageNum })
        }
      }
    })
  },

  async downloadPDF() {
    try {
      wx.showLoading({ title: '正在下载...' })
      const result = await wx.cloud.downloadFile({ fileID: BROCHURE_FILE_ID })
      wx.hideLoading()
      if (result.tempFilePath) {
        wx.openDocument({ filePath: result.tempFilePath, fileType: 'pdf', showMenu: true })
      }
    } catch (error) {
      wx.hideLoading()
      wx.showToast({ title: '下载失败', icon: 'none' })
    }
  },

  openPDFDirect() {
    this.downloadPDF()
  },

  retryConvert() {
    this.setData({ errorMsg: '', converting: true })
    this.convertAndLoad()
  }
})
