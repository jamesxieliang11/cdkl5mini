// pages/my-records/index.js
const { listMedicationRecords, listSeizureRecords, listOtherRecords } = require('../../utils/database.js')

Page({
  /**
   * 页面的初始数据
   */
  data: {
    activeTab: 'all',           // 当前选中的记录类型
    startDate: '',              // 开始日期
    endDate: '',                // 结束日期
    records: [],                // 记录列表
    totalCount: 0,              // 总记录数
    currentPage: 0,             // 当前页码
    pageSize: 20,               // 每页数量
    hasMore: true,              // 是否还有更多数据
    loading: false,             // 是否正在加载
    loadingMore: false          // 是否正在加载更多
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    this.initDefaultDates()
    this.loadInitialRecords()
  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {
    // 页面显示时刷新数据
    this.refreshRecords()
  },

  /**
   * 初始化默认日期（最近30天）
   */
  initDefaultDates() {
    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    
    this.setData({
      startDate: this.formatDate(thirtyDaysAgo),
      endDate: this.formatDate(now)
    })
  },

  /**
   * 格式化日期为 YYYY-MM-DD
   */
  formatDate(date) {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  },

  /**
   * 切换记录类型标签
   */
  switchTab(e) {
    const tab = e.currentTarget.dataset.tab
    this.setData({
      activeTab: tab,
      records: [],
      currentPage: 0,
      hasMore: true
    })
    this.searchRecords()
  },

  /**
   * 开始日期变化
   */
  onStartDateChange(e) {
    this.setData({
      startDate: e.detail.value
    })
  },

  /**
   * 结束日期变化
   */
  onEndDateChange(e) {
    this.setData({
      endDate: e.detail.value
    })
  },

  /**
   * 重置筛选条件
   */
  resetFilters() {
    this.setData({
      activeTab: 'all',
      records: [],
      currentPage: 0,
      hasMore: true
    })
    this.initDefaultDates()
    this.searchRecords()
  },

  /**
   * 加载初始记录
   */
  loadInitialRecords() {
    this.searchRecords()
  },

  /**
   * 刷新记录
   */
  refreshRecords() {
    this.setData({
      records: [],
      currentPage: 0,
      hasMore: true
    })
    this.searchRecords()
  },

  /**
   * 搜索记录
   */
  async searchRecords() {
    if (this.data.loading) return
    
    this.setData({ loading: true })
    
    try {
      let allRecords = []
      
      // 根据选中的类型获取数据
      if (this.data.activeTab === 'all' || this.data.activeTab === 'medication') {
        const medicationRecords = await this.fetchMedicationRecords()
        allRecords = allRecords.concat(medicationRecords)
      }
      
      if (this.data.activeTab === 'all' || this.data.activeTab === 'seizure') {
        const seizureRecords = await this.fetchSeizureRecords()
        allRecords = allRecords.concat(seizureRecords)
      }
      
      if (this.data.activeTab === 'all' || this.data.activeTab === 'other') {
        const otherRecords = await this.fetchOtherRecords()
        allRecords = allRecords.concat(otherRecords)
      }
      
      // 按时间排序
      allRecords.sort((a, b) => new Date(b.rawTime) - new Date(a.rawTime))
      
      // 分页处理
      const startIndex = this.data.currentPage * this.data.pageSize
      const endIndex = startIndex + this.data.pageSize
      const pageRecords = allRecords.slice(startIndex, endIndex)
      
      this.setData({
        records: this.data.currentPage === 0 ? pageRecords : this.data.records.concat(pageRecords),
        totalCount: allRecords.length,
        hasMore: endIndex < allRecords.length,
        loading: false
      })
      
    } catch (error) {
      console.error('搜索记录失败:', error)
      wx.showToast({
        title: '查询失败，请重试',
        icon: 'error'
      })
      this.setData({ loading: false })
    }
  },

  /**
   * 获取调药记录
   */
  async fetchMedicationRecords() {
    try {
      const result = await listMedicationRecords(100, 0)
      if (result.success && result.data.records) {
        return result.data.records
          .filter(record => this.isInDateRange(record.record_time))
          .map(record => ({
            id: record._id,
            type: 'medication',
            name: record.medications?.map(m => m.medication_name).join(', ') || '未记录',
            dosage: record.medications?.reduce((sum, m) => sum + Number(m.dosage || 0), 0) || 0,
            unit: record.medications?.[0]?.unit || '',
            takeTime: record.medications?.map(m => m.take_time).filter(Boolean)[0] || '未记录',
            datetime: this.formatRelativeTime(new Date(record.record_time).getTime()),
            rawTime: record.record_time
          }))
      }
    } catch (error) {
      console.error('获取调药记录失败:', error)
    }
    return []
  },

  /**
   * 获取发作记录
   */
  async fetchSeizureRecords() {
    try {
      const result = await listSeizureRecords(100, 0)
      if (result.success && result.data.records) {
        return result.data.records
          .filter(record => this.isInDateRange(record.record_time))
          .map(record => ({
            id: record._id,
            type: 'seizure',
            seizureType: record.seizure_type || '未知类型',
            duration: record.duration || '未知',
            datetime: this.formatRelativeTime(new Date(record.record_time).getTime()),
            rawTime: record.record_time
          }))
      }
    } catch (error) {
      console.error('获取发作记录失败:', error)
    }
    return []
  },

  /**
   * 获取其他记录
   */
  async fetchOtherRecords() {
    try {
      const result = await listOtherRecords(100, 0)
      if (result.success && result.data.records) {
        return result.data.records
          .filter(record => this.isInDateRange(record.record_time))
          .map(record => ({
            id: record._id,
            type: 'other',
            category: record.category || '其他',
            note: record.content?.substring(0, 80) + (record.content?.length > 60 ? '...' : '') || '无内容',
            datetime: this.formatRelativeTime(new Date(record.record_time).getTime()),
            rawTime: record.record_time
          }))
      }
    } catch (error) {
      console.error('获取其他记录失败:', error)
    }
    return []
  },

  /**
   * 判断记录是否在日期范围内
   */
  isInDateRange(recordTime) {
    if (!this.data.startDate || !this.data.endDate) return true
    
    const recordDate = new Date(recordTime)
    const startDate = new Date(this.data.startDate + ' 00:00:00')
    const endDate = new Date(this.data.endDate + ' 23:59:59')
    
    return recordDate >= startDate && recordDate <= endDate
  },

  /**
   * 加载更多记录
   */
  loadMoreRecords() {
    if (this.data.loadingMore || !this.data.hasMore) return
    
    this.setData({
      currentPage: this.data.currentPage + 1,
      loadingMore: true
    })
    
    this.searchRecords().finally(() => {
      this.setData({ loadingMore: false })
    })
  },

  /**
   * 格式化相对时间
   */
  formatRelativeTime(timestamp) {
    const now = Date.now()
    const diff = now - timestamp
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (days > 90) {
      return new Date(timestamp).toLocaleDateString('zh-CN')
    } else if (days > 7) {
      return `${days}天前`
    } else if (hours > 23) {
      return `${days}天前`
    } else if (minutes > 59) {
      return `${hours}小时前`
    } else if (minutes > 0) {
      return `${minutes}分钟前`
    } else {
      return '刚刚'
    }
  },

  /**
   * 查看记录详情
   */
  viewRecordDetail(e) {
    const record = e.currentTarget.dataset.record
    console.log('查看记录详情:', record)
    
    // 这里可以跳转到详情页面或显示详情弹窗
    wx.showModal({
      title: '记录详情',
      content: JSON.stringify(record, null, 2),
      showCancel: false
    })
  },

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh() {
    this.refreshRecords()
    wx.stopPullDownRefresh()
  },

  /**
   * 页面上拉触底事件的处理函数
   */
  onReachBottom() {
    this.loadMoreRecords()
  },

  /**
   * 返回主页
   */
  goToHome() {
    wx.switchTab({
      url: '/pages/home/index'
    })
  }
})