const { adminListFeedbacks, replyFeedback } = require('../../utils/database.js')

const TYPE_MAP = {
  bug: '问题反馈',
  feature: '功能建议',
  other: '其他',
  complaint: '投诉'
}

Page({
  data: {
    feedbacks: [],
    filteredFeedbacks: [],
    loading: false,
    hasMore: true,
    pageIndex: 0,
    pageSize: 20,
    statusFilter: '',
    expandedId: '',
    replyContent: '',
    replying: false
  },

  onLoad() {
    this.loadFeedbacks()
  },

  goBack() {
    wx.navigateBack()
  },

  async loadFeedbacks() {
    if (this.data.loading) return
    this.setData({ loading: true })
    try {
      const result = await adminListFeedbacks(this.data.pageSize, this.data.pageIndex)
      if (result && result.data) {
        const records = result.data.records || []
        const list = records.map(item => ({
          ...item,
          typeLabel: TYPE_MAP[item.type] || item.type || '反馈',
          displayTime: this.formatTime(item.created_at),
          displayReplyTime: item.reply_time ? this.formatTime(item.reply_time) : ''
        }))
        const feedbacks = this.data.pageIndex === 0 ? list : this.data.feedbacks.concat(list)
        this.setData({
          feedbacks,
          hasMore: !!result.data.hasMore
        })
        this.applyFilter()
      }
    } catch (error) {
      console.error('加载反馈列表失败:', error)
      wx.showToast({ title: '加载失败', icon: 'none' })
    } finally {
      this.setData({ loading: false })
    }
  },

  loadMore() {
    this.setData({ pageIndex: this.data.pageIndex + 1 })
    this.loadFeedbacks()
  },

  onFilterChange(e) {
    const status = e.currentTarget.dataset.status
    this.setData({ statusFilter: status })
    this.applyFilter()
  },

  applyFilter() {
    const { feedbacks, statusFilter } = this.data
    const filtered = statusFilter
      ? feedbacks.filter(f => f.status === statusFilter)
      : feedbacks
    this.setData({ filteredFeedbacks: filtered })
  },

  expandReply(e) {
    const id = e.currentTarget.dataset.id
    const item = this.data.feedbacks.find(f => f._id === id)
    this.setData({
      expandedId: id,
      replyContent: item && item.reply ? item.reply : ''
    })
  },

  cancelReply() {
    this.setData({ expandedId: '', replyContent: '' })
  },

  onReplyInput(e) {
    this.setData({ replyContent: e.detail })
  },

  async submitReply(e) {
    const feedbackId = e.currentTarget.dataset.id
    const index = e.currentTarget.dataset.index
    const { replyContent } = this.data
    if (!replyContent.trim()) return

    this.setData({ replying: true })
    try {
      await replyFeedback(feedbackId, replyContent.trim())
      const now = new Date()
      this.setData({
        [`feedbacks[${this.findFeedbackIndex(feedbackId)}].reply`]: replyContent.trim(),
        [`feedbacks[${this.findFeedbackIndex(feedbackId)}].reply_time`]: now,
        [`feedbacks[${this.findFeedbackIndex(feedbackId)}].displayReplyTime`]: this.formatTime(now),
        [`feedbacks[${this.findFeedbackIndex(feedbackId)}].status`]: 'replied',
        expandedId: '',
        replyContent: ''
      })
      this.applyFilter()
      wx.showToast({ title: '回复成功', icon: 'success' })
    } catch (error) {
      console.error('回复失败:', error)
      wx.showToast({ title: '回复失败', icon: 'none' })
    } finally {
      this.setData({ replying: false })
    }
  },

  findFeedbackIndex(id) {
    return this.data.feedbacks.findIndex(f => f._id === id)
  },

  previewImage(e) {
    const { url, urls } = e.currentTarget.dataset
    wx.previewImage({ current: url, urls })
  },

  formatTime(date) {
    if (!date) return ''
    const d = typeof date === 'string' ? new Date(date) : date
    if (isNaN(d.getTime())) return ''
    const Y = d.getFullYear()
    const M = String(d.getMonth() + 1).padStart(2, '0')
    const D = String(d.getDate()).padStart(2, '0')
    const h = String(d.getHours()).padStart(2, '0')
    const m = String(d.getMinutes()).padStart(2, '0')
    return `${Y}-${M}-${D} ${h}:${m}`
  }
})
