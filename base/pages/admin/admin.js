// 管理员面板 - 数据库管理 + 权限管理
const app = getApp()
const { initDatabase, checkDatabaseStatus, initRecordsDatabase, checkRecordsStatus } = require('../../utils/database.js')

Page({
  data: {
    // 权限
    adminRole: '',
    isAdmin: false,
    isSuperAdmin: false,

    // 基础数据库状态
    basicDbStatus: {
      initialized: false,
      recordCount: 0,
      loading: false
    },
    // 记录数据库状态
    recordsDbStatus: {
      initialized: false,
      medication_records: 0,
      seizure_records: 0,
      other_records: 0,
      record_statistics: 0,
      total: 0,
      loading: false
    },
    // 操作状态
    initializing: false,
    lastUpdateTime: '',

    // 用户管理
    showUserManagement: false,
    userList: [],
    loadingUsers: false
  },

  onLoad() {
    this.checkAdminPermission()
    this.checkAllDatabaseStatus()
  },

  onShow() {
    // 通知tabbar组件更新状态（基于当前页面URL）
    this.updateTabBarState()
    // 每次显示时刷新数据库状态
    this.checkAdminPermission()
    this.checkAllDatabaseStatus()
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

  // 检查所有数据库状态
  async checkAllDatabaseStatus() {
    await Promise.all([
      this.checkBasicDatabaseStatus(),
      this.checkRecordsDatabaseStatus()
    ])
    
    this.setData({
      lastUpdateTime: new Date().toLocaleTimeString()
    })
  },

  // 检查基础数据库状态
  async checkBasicDatabaseStatus() {
    this.setData({
      'basicDbStatus.loading': true
    })

    try {
      const status = await checkDatabaseStatus()
      this.setData({
        'basicDbStatus.initialized': status.initialized,
        'basicDbStatus.recordCount': status.recordCount,
        'basicDbStatus.loading': false
      })
    } catch (error) {
      console.error('检查基础数据库状态失败:', error)
      this.setData({
        'basicDbStatus.loading': false
      })
    }
  },

  // 检查记录数据库状态
  async checkRecordsDatabaseStatus() {
    this.setData({
      'recordsDbStatus.loading': true
    })

    try {
      const status = await checkRecordsStatus()
      this.setData({
        'recordsDbStatus.initialized': status.initialized,
        'recordsDbStatus.medication_records': status.medication_records,
        'recordsDbStatus.seizure_records': status.seizure_records,
        'recordsDbStatus.other_records': status.other_records,
        'recordsDbStatus.record_statistics': status.record_statistics,
        'recordsDbStatus.total': status.total,
        'recordsDbStatus.loading': false
      })
    } catch (error) {
      console.error('检查记录数据库状态失败:', error)
      this.setData({
        'recordsDbStatus.loading': false
      })
    }
  },

  // 初始化基础数据库
  async initBasicDatabase() {
    if (this.data.initializing) return

    wx.showModal({
      title: '确认初始化',
      content: '确定要初始化基础数据库吗？这将创建义诊科室、专家信息、会议议程等基础数据。',
      success: async (res) => {
        if (res.confirm) {
          this.setData({ initializing: true })
          
          try {
            await initDatabase()
            await this.checkBasicDatabaseStatus()
          } catch (error) {
            console.error('初始化基础数据库失败:', error)
          } finally {
            this.setData({ initializing: false })
          }
        }
      }
    })
  },

  // 初始化记录数据库
  async initRecordsDb() {
    if (this.data.initializing) return

    wx.showModal({
      title: '确认初始化',
      content: '确定要初始化记录数据库吗？这将创建调药记录、发作记录、其他记录等数据表。',
      success: async (res) => {
        if (res.confirm) {
          this.setData({ initializing: true })
          
          try {
            await initRecordsDatabase()
            await this.checkRecordsDatabaseStatus()
          } catch (error) {
            console.error('初始化记录数据库失败:', error)
          } finally {
            this.setData({ initializing: false })
          }
        }
      }
    })
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

  // 刷新数据库状态
  async refreshStatus() {
    await this.checkAllDatabaseStatus()
    wx.showToast({
      title: '状态已刷新',
      icon: 'success'
    })
  },

  // 获取状态文本
  getStatusText(initialized) {
    return initialized ? '已初始化' : '未初始化'
  },

  // 获取状态颜色
  getStatusColor(initialized) {
    return initialized ? '#07c160' : '#ee0a24'
  }
})