// 管理员 - 数据趋势概览
const { getAdminOverview } = require('../../utils/database.js')

Page({
  data: {
    loading: true,
    overview: null,
    // 计算后的趋势数据
    maxMonthlySubmitted: 0,
    maxMonthlySeizure: 0
  },

  onLoad() {
    this.loadData()
  },

  // 返回上一页
  onBack() {
    wx.navigateBack()
  },

  async loadData() {
    this.setData({ loading: true })
    try {
      const result = await getAdminOverview()
      const overview = result.data || null

      // 计算趋势数据中的最大值，用于柱状条百分比
      let maxMonthlySubmitted = 0
      let maxMonthlySeizure = 0
      if (overview && overview.monthlyTrends && overview.monthlyTrends.length > 0) {
        overview.monthlyTrends.forEach(item => {
          if ((item.submitted || 0) > maxMonthlySubmitted) maxMonthlySubmitted = item.submitted || 0
          if ((item.seizureTotal || item.seizure_total || 0) > maxMonthlySeizure) maxMonthlySeizure = item.seizureTotal || item.seizure_total || 0
        })
      }

      this.setData({
        overview,
        maxMonthlySubmitted,
        maxMonthlySeizure,
        loading: false
      })
    } catch (error) {
      console.error('加载趋势数据失败:', error)
      wx.showToast({ title: '加载失败', icon: 'error' })
      this.setData({ loading: false })
    }
  },

  onPullDownRefresh() {
    this.loadData().finally(() => wx.stopPullDownRefresh())
  }
})
