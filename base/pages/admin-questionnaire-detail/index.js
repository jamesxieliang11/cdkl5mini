// 管理员 - 问卷数据详情列表
const { getQuestionnaireAdminStats, getQuestionnaireAdminList } = require('../../utils/database.js')

Page({
  data: {
    loading: true,
    stats: null,
    questionnaires: [],
    pageIndex: 0,
    pageSize: 50,
    hasMore: true
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
      const [statsResult, listResult] = await Promise.all([
        getQuestionnaireAdminStats(),
        getQuestionnaireAdminList(this.data.pageSize, 0)
      ])

      this.setData({
        stats: statsResult.data || null,
        questionnaires: (listResult.data && listResult.data.list) || (listResult.data && listResult.data.records) || listResult.data || [],
        loading: false
      })
    } catch (error) {
      console.error('加载问卷详情失败:', error)
      wx.showToast({ title: '加载失败', icon: 'error' })
      this.setData({ loading: false })
    }
  },

  onPullDownRefresh() {
    this.loadData().finally(() => wx.stopPullDownRefresh())
  }
})
