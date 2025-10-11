// 管理员面板 - 数据库管理
const app = getApp()
const { initDatabase, checkDatabaseStatus, initRecordsDatabase, checkRecordsStatus } = require('../../utils/database.js')

Page({
  data: {
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
    lastUpdateTime: ''
  },

  onLoad() {
    this.checkAllDatabaseStatus()
  },

  onShow() {
    // 通知tabbar组件更新状态（基于当前页面URL）
    this.updateTabBarState()
    // 每次显示时刷新数据库状态
    this.checkAllDatabaseStatus()
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