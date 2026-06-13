const app = getApp()
const { getCommunityActivity, joinCommunityActivity } = require('../../utils/database.js')

Page({
  data: {
    locked: false,
    loading: true,
    activity: null,
    isJoined: false,
    recentParticipants: [],
    joining: false
  },

  onLoad(options) {
    this.syncAppConfig()
    if (options.id) {
      this.activityId = options.id
      this.loadActivity()
    }
  },

  syncAppConfig() {
    const appConfig = app.globalData.appConfig || {}
    this.setData({ locked: !appConfig.features_enabled })
  },

  goBack() {
    wx.navigateBack()
  },

  async loadActivity() {
    this.setData({ loading: true })
    try {
      const result = await getCommunityActivity(this.activityId)
      if (result.data) {
        const activity = result.data
        this.setData({
          activity: {
            ...activity,
            displayStart: this.formatDate(activity.start_time),
            displayEnd: activity.end_time ? this.formatDate(activity.end_time) : '长期活动',
            isActive: activity.status === 'active'
          },
          isJoined: activity.isJoined,
          recentParticipants: activity.recentParticipants || []
        })
      }
    } catch (error) {
      console.error('加载活动失败:', error)
      wx.showToast({ title: '加载失败', icon: 'none' })
    } finally {
      this.setData({ loading: false })
    }
  },

  async onJoinActivity() {
    const userId = wx.getStorageSync('userId')
    if (!userId) {
      wx.showToast({ title: '请先登录', icon: 'none' })
      return
    }

    if (this.data.isJoined) {
      wx.showToast({ title: '您已参与该活动', icon: 'none' })
      return
    }

    this.setData({ joining: true })
    try {
      const result = await joinCommunityActivity(this.activityId)
      if (result.success) {
        this.setData({
          isJoined: true,
          'activity.participant_count': (this.data.activity.participant_count || 0) + 1
        })
        wx.showToast({ title: '参与成功！', icon: 'success' })
      } else {
        wx.showToast({ title: result.message || '参与失败', icon: 'none' })
      }
    } catch (error) {
      console.error('参与活动失败:', error)
      wx.showToast({ title: '操作失败', icon: 'none' })
    } finally {
      this.setData({ joining: false })
    }
  },

  onShareAppMessage() {
    const activity = this.data.activity
    return {
      title: activity ? `🎯 ${activity.title} - 希舞之家` : '希舞之家活动',
      path: `/pages/activity-detail/index?id=${this.activityId}`
    }
  },

  formatDate(dateValue) {
    if (!dateValue) return ''
    const date = new Date(dateValue)
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const d = String(date.getDate()).padStart(2, '0')
    return `${y}年${m}月${d}日`
  }
})
