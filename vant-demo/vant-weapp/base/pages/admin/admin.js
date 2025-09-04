// 管理员页面 - 用于数据库初始化等管理操作
const { initDatabase, checkDatabaseStatus } = require('../../utils/database.js')

Page({
  data: {
    isInitialized: false,
    recordCount: 0,
    loading: false
  },

  onLoad() {
    this.checkStatus()
  },

  onShow() {
    // 设置自定义tabbar状态
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setActive('admin')
    }
  },

  // 检查数据库状态
  async checkStatus() {
    try {
      const status = await checkDatabaseStatus()
      this.setData({
        isInitialized: status.initialized,
        recordCount: status.recordCount
      })
    } catch (error) {
      console.error('检查数据库状态失败:', error)
    }
  },

  // 初始化数据库
  async onInitDatabase() {
    if (this.data.loading) return
    
    try {
      this.setData({ loading: true })
      
      const result = await initDatabase()
      console.log('初始化成功:', result)
      
      // 重新检查状态
      await this.checkStatus()
      
    } catch (error) {
      console.error('初始化失败:', error)
    } finally {
      this.setData({ loading: false })
    }
  },

  // 重新检查状态
  onRefreshStatus() {
    this.checkStatus()
  },

  // 查看初始化日志
  onViewLogs() {
    wx.navigateTo({
      url: '/pages/logs/logs'
    })
  }
})