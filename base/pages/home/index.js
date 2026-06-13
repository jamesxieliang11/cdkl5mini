const app = getApp()
const { listMedicationRecords, listSeizureRecords, checkMonthlyReportSubmitted, checkQuestionnaireSubmitted, getTodayStats } = require('../../utils/database.js')

Page({
  data: {
    currentDate: '',
    todayMedCount: 0,
    weekSeizureCount: 0,
    showMonthlyReminder: false,
    showQuestionnaireReminder: false,
    featuresEnabled: false,
    isAdmin: false,
    streak: 0,
    totalDays: 0
  },

  onLoad() {
    this.initTodayDate()
    this.syncAppConfig()
  },

  onShow() {
    this.syncAppConfig()
    this.checkAdminRole()
    this.updateTabBarState()
    this.loadOverviewData()
    this.loadStreakData()
    this.checkMonthlyReportStatus()
    this.checkQuestionnaireStatus()
  },

  syncAppConfig() {
    const appConfig = app.globalData.appConfig || {}
    this.setData({ featuresEnabled: !!appConfig.features_enabled })
  },

  overrideFeaturesIfQuestionnaireClaimed(submitted) {
    if (submitted && !this.data.featuresEnabled) {
      this.setData({ featuresEnabled: true })
      app.globalData.appConfig = { features_enabled: true }
    }
  },

  checkAdminRole() {
    const adminRole = wx.getStorageSync('adminRole') || ''
    this.setData({ isAdmin: adminRole === 'admin' || adminRole === 'superadmin' })
  },

  updateTabBarState() {
    if (typeof this.getTabBar === 'function') {
      const tabBar = this.getTabBar()
      if (tabBar && typeof tabBar.updateState === 'function') {
        tabBar.updateState()
      }
    }
  },

  initTodayDate() {
    const now = new Date()
    const options = { month: 'long', day: 'numeric', weekday: 'long' }
    this.setData({ currentDate: now.toLocaleDateString('zh-CN', options) })
  },

  async loadOverviewData() {
    const [medResult, seizureResult] = await Promise.all([
      listMedicationRecords(10, 0).catch(() => ({ success: false })),
      listSeizureRecords(50, 0).catch(() => ({ success: false }))
    ])

    // 今日用药条数
    let todayMedCount = 0
    if (medResult.success && medResult.data?.records) {
      const todayStart = new Date().setHours(0, 0, 0, 0)
      todayMedCount = medResult.data.records.filter(
        r => new Date(r.record_time).getTime() >= todayStart
      ).length
    }

    // 近 7 日发作次数
    let weekSeizureCount = 0
    if (seizureResult.success && seizureResult.data?.records) {
      const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
      weekSeizureCount = seizureResult.data.records.filter(
        r => new Date(r.record_time).getTime() >= weekAgo
      ).length
    }

    this.setData({ todayMedCount, weekSeizureCount })
  },

  async checkMonthlyReportStatus() {
    try {
      const result = await checkMonthlyReportSubmitted()
      if (result && result.data) {
        this.setData({ showMonthlyReminder: !result.data.submitted })
      }
    } catch (e) {
      console.warn('检查月度汇报状态失败:', e)
    }
  },

  async checkQuestionnaireStatus() {
    try {
      const result = await checkQuestionnaireSubmitted()
      if (result && result.data) {
        this.setData({ showQuestionnaireReminder: !result.data.submitted })
        this.overrideFeaturesIfQuestionnaireClaimed(result.data.submitted)
      }
    } catch (e) {
      console.warn('检查问卷状态失败:', e)
    }
  },

  async loadStreakData() {
    try {
      const result = await getTodayStats()
      if (result && result.data) {
        this.setData({
          streak: result.data.streak || 0,
          totalDays: result.data.totalDays || 0
        })
      }
    } catch (e) {
      console.warn('加载打卡数据失败:', e)
    }
  },

  // 导航
  addMedicationRecord() {
    wx.navigateTo({ url: '/pages/medication-record/index' })
  },
  addSeizureRecord() {
    wx.navigateTo({ url: '/pages/seizure-record/index' })
  },
  addOtherRecord() {
    wx.navigateTo({ url: '/pages/other-record/index' })
  },
  goToMyRecords() {
    wx.switchTab({ url: '/pages/my-records/index' })
  },
  goToMonthlyReport() {
    wx.navigateTo({ url: '/pages/monthly-report/index' })
  },
  goToReports() {
    wx.navigateTo({ url: '/pages/reports/index' })
  },
  goToFeedback() {
    wx.navigateTo({ url: '/pages/feedback/index' })
  },
  goToQuestionnaire() {
    wx.navigateTo({ url: '/pages/family-questionnaire/index' })
  },
  goToBrochure() {
    wx.navigateTo({ url: '/pages/brochure/index' })
  },
  goToAdmin() {
    wx.navigateTo({ url: '/pages/admin/admin' })
  },
  goToAI(event) {
    const scene = event.currentTarget.dataset.scene
    wx.navigateTo({ url: `/pages/ai-assistant/index?scene=${scene}` })
  }
})
