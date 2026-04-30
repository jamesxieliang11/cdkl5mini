// 管理员 - 问卷数据详情列表
const { getQuestionnaireAdminStats, getQuestionnaireAdminList, adminBindQuestionnaire } = require('../../utils/database.js')

Page({
  data: {
    loading: true,
    stats: null,
    questionnaires: [],
    pageIndex: 0,
    pageSize: 50,
    hasMore: true,
    // 管理员绑定弹窗
    showBindDialog: false,
    bindTargetId: '',
    bindTargetName: '',
    bindOpenid: '',
    bindUserId: '',
    binding: false
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
  },

  // ==================== 管理员手动绑定 ====================

  // 点击"绑定"按钮，打开弹窗
  onOpenBind(event) {
    const { id, name } = event.currentTarget.dataset
    this.setData({
      showBindDialog: true,
      bindTargetId: id,
      bindTargetName: name || '未知',
      bindOpenid: '',
      bindUserId: ''
    })
  },

  onCloseBind() {
    this.setData({ showBindDialog: false })
  },

  onBindOpenidInput(event) {
    this.setData({ bindOpenid: event.detail })
  },

  onBindUserIdInput(event) {
    this.setData({ bindUserId: event.detail })
  },

  // 确认绑定
  async onConfirmBind() {
    if (!this.data.bindOpenid) {
      wx.showToast({ title: '请输入目标用户openid', icon: 'none' })
      return
    }
    this.setData({ binding: true })
    try {
      await adminBindQuestionnaire(
        this.data.bindTargetId,
        this.data.bindOpenid,
        this.data.bindUserId
      )
      wx.showToast({ title: '绑定成功', icon: 'success' })
      this.setData({ showBindDialog: false })
      // 刷新列表
      await this.loadData()
    } catch (error) {
      console.error('管理员绑定失败:', error)
      wx.showToast({ title: error.message || '绑定失败', icon: 'none' })
    } finally {
      this.setData({ binding: false })
    }
  }
})
