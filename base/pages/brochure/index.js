// CDKL5 宣教手册 PDF 在云存储中的 fileID
const BROCHURE_FILE_ID = 'cloud://cloud1-4g0dlvsdc0db6c89.636c-cloud1-4g0dlvsdc0db6c89-1334064886/gene-reports/CDKL5宣教手册 v2.pdf'

Page({
  data: {
    loading: false,
    errorMsg: ''
  },

  onLoad() {
    // 页面加载时自动打开手册
    this.openBrochure()
  },

  // 返回上一页
  goBack() {
    wx.navigateBack()
  },

  // 打开宣教手册
  async openBrochure() {
    this.setData({ loading: true, errorMsg: '' })

    try {
      wx.showLoading({ title: '正在下载手册...' })

      // 方案一：通过 getTempFileURL 获取带签名的临时链接，再用 wx.downloadFile 下载
      const urlResult = await wx.cloud.getTempFileURL({
        fileList: [BROCHURE_FILE_ID]
      })

      console.log('getTempFileURL 结果:', JSON.stringify(urlResult))

      const fileInfo = urlResult.fileList && urlResult.fileList[0]
      if (!fileInfo || fileInfo.status !== 0 || !fileInfo.tempFileURL) {
        console.error('getTempFileURL 失败，尝试 cloud.downloadFile:', fileInfo)
        // 方案二：直接用 cloud.downloadFile
        await this.downloadViaCloudAPI()
        return
      }

      console.log('获取到临时链接:', fileInfo.tempFileURL)

      // 用带签名的临时链接下载
      const downloadResult = await new Promise((resolve, reject) => {
        wx.downloadFile({
          url: fileInfo.tempFileURL,
          success: resolve,
          fail: reject
        })
      })

      wx.hideLoading()

      if (downloadResult.statusCode === 200 && downloadResult.tempFilePath) {
        this.openPDF(downloadResult.tempFilePath)
      } else {
        throw new Error('下载失败，状态码: ' + downloadResult.statusCode)
      }
    } catch (error) {
      console.error('方案一失败，尝试方案二:', error)
      // 降级：直接用 cloud.downloadFile
      try {
        await this.downloadViaCloudAPI()
      } catch (fallbackError) {
        wx.hideLoading()
        console.error('所有方案均失败:', fallbackError)
        this.setData({ errorMsg: '加载手册失败，请检查网络后重试' })
        wx.showToast({ title: '加载手册失败', icon: 'none', duration: 2500 })
      }
    } finally {
      this.setData({ loading: false })
    }
  },

  // 方案二：通过 wx.cloud.downloadFile 直接下载
  async downloadViaCloudAPI() {
    console.log('尝试 cloud.downloadFile, fileID:', BROCHURE_FILE_ID)

    const result = await wx.cloud.downloadFile({
      fileID: BROCHURE_FILE_ID
    })

    console.log('cloud.downloadFile 结果:', result)
    wx.hideLoading()

    if (result.tempFilePath) {
      this.openPDF(result.tempFilePath)
    } else {
      throw new Error('cloud.downloadFile 返回空路径')
    }
  },

  // 打开 PDF 文件
  openPDF(filePath) {
    wx.openDocument({
      filePath: filePath,
      fileType: 'pdf',
      showMenu: true,
      success() {
        console.log('打开手册成功')
      },
      fail(error) {
        console.error('打开文档失败:', error)
        wx.showToast({ title: '打开文档失败', icon: 'none' })
      }
    })
  }
})
