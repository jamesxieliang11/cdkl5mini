// 管理员面板 - 概览统计 + 权限管理
const app = getApp()
const { 
  getAdminOverview, getQuestionnaireAdminStats, getAdminMonthlyStats,
  getAppConfig, updateAppConfig
} = require('../../utils/database.js')

Page({
  data: {
    // 权限
    adminRole: '',
    isAdmin: false,
    isSuperAdmin: false,

    // 全局概览数据
    overviewData: {
      totalUsers: 0,
      activeUsers: 0,
      recordCounts: { seizure: 0, medication: 0, other: 0, total: 0 },
      monthlyTrends: []
    },
    overviewLoading: false,

    // 问卷统计数据
    questionnaireStats: {
      totalUsers: 0,
      submittedCount: 0,
      completionRate: 0,
      genderDistribution: {},
      regionTop10: [],
      seizureControlDistribution: {},
      diagnosisAgeDistribution: {}
    },
    questionnaireLoading: false,

    // 月度汇报概览
    currentMonthStats: null,
    monthlyStatsLoading: false,

    // 应用功能开关
    appConfig: {
      features_enabled: false
    },
    appConfigLoading: false,
    appConfigSaving: false
  },
  onLoad() {
    this.checkAdminPermission()
    // 管理员加载看板数据
    if (this.data.isAdmin) {
      this.loadOverviewData()
      this.loadQuestionnaireStats()
      this.loadCurrentMonthStats()
      this.loadAppConfig()
    }
  },

  onShow() {
    // 通知tabbar组件更新状态（基于当前页面URL）
    this.updateTabBarState()
    this.checkAdminPermission()
    // 管理员加载看板数据
    if (this.data.isAdmin) {
      this.loadOverviewData()
      this.loadQuestionnaireStats()
      this.loadCurrentMonthStats()
      this.loadAppConfig()
    }
  },

  // 检查管理员权限
  checkAdminPermission() {
    const adminRole = wx.getStorageSync('adminRole') || ''
    const isAdmin = adminRole === 'admin' || adminRole === 'superadmin'
    const isSuperAdmin = adminRole === 'superadmin'
    this.setData({ adminRole, isAdmin, isSuperAdmin })
  },

  // 更新tabbar状态
  updateTabBarState: function() {
    if (typeof this.getTabBar === 'function') {
      const tabBar = this.getTabBar()
      if (tabBar && typeof tabBar.updateState === 'function') {
        // 触发tabbar组件根据当前页面更新状态
        tabBar.updateState()
      }
    }
  },

  // 跳转到月度汇报统计看板
  goToMonthlyStats() {
    if (!this.data.isAdmin) {
      wx.showToast({ title: '需要管理员权限', icon: 'none' })
      return
    }
    wx.navigateTo({
      url: '/pages/admin-monthly-stats/index'
    })
  },

  // 跳转到问卷详情列表
  goToQuestionnaireDetail() {
    if (!this.data.isAdmin) {
      wx.showToast({ title: '需要管理员权限', icon: 'none' })
      return
    }
    wx.navigateTo({
      url: '/pages/admin-questionnaire-detail/index'
    })
  },

  // 跳转到数据趋势
  goToOverviewDetail() {
    if (!this.data.isAdmin) {
      wx.showToast({ title: '需要管理员权限', icon: 'none' })
      return
    }
    wx.navigateTo({
      url: '/pages/admin-overview-detail/index'
    })
  },

  // 切换用户管理面板
  toggleUserManagement() {
    if (!this.data.isSuperAdmin) {
      wx.showToast({ title: '仅超级管理员可操作', icon: 'none' })
      return
    }
    if (!this.data.showUserManagement) {
      this.loadUserList()
    }
    this.setData({ showUserManagement: !this.data.showUserManagement })
  },

  // 加载用户列表
  async loadUserList() {
    this.setData({ loadingUsers: true })
    try {
      const result = await new Promise((resolve, reject) => {
        wx.cloud.callFunction({
          name: 'monthlyReport',
          data: { action: 'listUsers', pageSize: 200, pageIndex: 0 },
          success: (res) => res.result && res.result.success ? resolve(res.result) : reject(new Error('获取失败')),
          fail: reject
        })
      })
      this.setData({ userList: result.data.users })
    } catch (error) {
      console.error('加载用户列表失败:', error)
      wx.showToast({ title: '加载失败', icon: 'error' })
    } finally {
      this.setData({ loadingUsers: false })
    }
  },

  // 设置/取消管理员
  toggleAdminRole(event) {
    const targetUserId = event.currentTarget.dataset.userid
    const currentRole = event.currentTarget.dataset.role
    const userName = event.currentTarget.dataset.name
    const newRole = currentRole === 'admin' ? '' : 'admin'
    const actionText = newRole === 'admin' ? '设为管理员' : '取消管理员'

    wx.showModal({
      title: '确认操作',
      content: `确定将「${userName}」${actionText}吗？`,
      success: async (res) => {
        if (!res.confirm) return
        try {
          const result = await new Promise((resolve, reject) => {
            wx.cloud.callFunction({
              name: 'monthlyReport',
              data: {
                action: 'setAdminRole',
                data: { targetUserId, adminRole: newRole },
                userId: wx.getStorageSync('userId') || 'default_user'
              },
              success: (res) => res.result && res.result.success ? resolve(res.result) : reject(new Error(res.result?.message || '操作失败')),
              fail: reject
            })
          })
          wx.showToast({ title: result.message, icon: 'success' })
          this.loadUserList()
        } catch (error) {
          wx.showToast({ title: error.message || '操作失败', icon: 'none' })
        }
      }
    })
  },

  // 加载全局概览数据
  async loadOverviewData() {
    this.setData({ overviewLoading: true })
    try {
      const result = await getAdminOverview()
      if (result.data) {
        this.setData({ overviewData: result.data })
      }
    } catch (error) {
      console.error('加载概览数据失败:', error)
    } finally {
      this.setData({ overviewLoading: false })
    }
  },

  // 加载问卷统计
  async loadQuestionnaireStats() {
    this.setData({ questionnaireLoading: true })
    try {
      const result = await getQuestionnaireAdminStats()
      if (result.data) {
        this.setData({ questionnaireStats: result.data })
      }
    } catch (error) {
      console.error('加载问卷统计失败:', error)
    } finally {
      this.setData({ questionnaireLoading: false })
    }
  },

  // 加载当月汇报统计
  async loadCurrentMonthStats() {
    this.setData({ monthlyStatsLoading: true })
    try {
      const now = new Date()
      const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
      const result = await getAdminMonthlyStats(currentMonth)
      if (result.data) {
        this.setData({ currentMonthStats: result.data })
      }
    } catch (error) {
      console.error('加载月度统计失败:', error)
    } finally {
      this.setData({ monthlyStatsLoading: false })
    }
  },

  // ==================== 应用功能开关 ====================

  // 加载应用配置
  async loadAppConfig() {
    this.setData({ appConfigLoading: true })
    try {
      const result = await getAppConfig()
      if (result && result.data) {
        this.setData({
          appConfig: { features_enabled: !!result.data.features_enabled }
        })
      }
    } catch (error) {
      console.error('加载应用配置失败:', error)
    } finally {
      this.setData({ appConfigLoading: false })
    }
  },

  // 切换功能总开关
  async onToggleAppConfig(event) {
    const newValue = event.detail

    // 乐观更新 UI
    this.setData({ 'appConfig.features_enabled': newValue, appConfigSaving: true })

    try {
      await updateAppConfig({ features_enabled: newValue })

      // 同步更新全局状态和本地缓存
      const newConfig = { features_enabled: newValue }
      app.globalData.appConfig = newConfig
      wx.setStorageSync('appConfig', newConfig)

      wx.showToast({ title: '设置已保存', icon: 'success' })
    } catch (error) {
      // 回滚 UI
      this.setData({ 'appConfig.features_enabled': !newValue })
      console.error('保存应用配置失败:', error)
      wx.showToast({ title: '保存失败', icon: 'none' })
    } finally {
      this.setData({ appConfigSaving: false })
    }
  },

  // 跳转到社区管理页面
  goToCommunityAdmin() {
    wx.navigateTo({ url: '/pages/community-admin/index' })
  },

  goToFeedbackAdmin() {
    wx.navigateTo({ url: '/pages/admin-feedback/index' })
  },

})