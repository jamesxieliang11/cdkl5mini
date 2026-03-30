// pages/my-records/index.js
const { listMedicationRecords, listSeizureRecords, listOtherRecords, listMonthlyReports } = require('../../utils/database.js')

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
    loadingMore: false,         // 是否正在加载更多
    showDetailPopup: false,     // 是否显示详情弹窗
    detailData: {               // 详情数据
      title: '',
      record: {}
    }
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
    
    console.log('开始搜索记录...', {
      activeTab: this.data.activeTab,
      startDate: this.data.startDate,
      endDate: this.data.endDate,
      currentPage: this.data.currentPage
    })
    
    this.setData({ loading: true })
    
    try {
      let allRecords = []
      
      // 根据选中的类型获取数据
      if (this.data.activeTab === 'all' || this.data.activeTab === 'medication') {
        const medicationRecords = await this.fetchMedicationRecords()
        console.log('调药记录获取结果:', medicationRecords.length, '条')
        allRecords = allRecords.concat(medicationRecords)
      }
      
      if (this.data.activeTab === 'all' || this.data.activeTab === 'seizure') {
        const seizureRecords = await this.fetchSeizureRecords()
        console.log('发作记录获取结果:', seizureRecords.length, '条')
        allRecords = allRecords.concat(seizureRecords)
      }
      
      if (this.data.activeTab === 'all' || this.data.activeTab === 'other') {
        const otherRecords = await this.fetchOtherRecords()
        console.log('其他记录获取结果:', otherRecords.length, '条')
        allRecords = allRecords.concat(otherRecords)
      }

      if (this.data.activeTab === 'monthly') {
        const monthlyRecords = await this.fetchMonthlyReports()
        console.log('月度汇报获取结果:', monthlyRecords.length, '条')
        allRecords = allRecords.concat(monthlyRecords)
      }
      
      console.log('合并后总记录数:', allRecords.length)
      console.log('今天的记录样例:', allRecords.filter(r => r.datetime.includes('今天') || r.datetime.includes('刚刚') || r.datetime.includes('分钟前') || r.datetime.includes('小时前')))
      
      // 按时间排序
      allRecords.sort((a, b) => new Date(b.rawTime) - new Date(a.rawTime))
      
      // 分页处理
      const startIndex = this.data.currentPage * this.data.pageSize
      const endIndex = startIndex + this.data.pageSize
      const pageRecords = allRecords.slice(startIndex, endIndex)
      
      console.log('分页结果:', { startIndex, endIndex, pageRecords: pageRecords.length })
      
      this.setData({
        records: this.data.currentPage === 0 ? pageRecords : this.data.records.concat(pageRecords),
        totalCount: allRecords.length,
        hasMore: endIndex < allRecords.length,
        loading: false
      })
      
      console.log('最终显示记录数:', this.data.records.length)
      
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
          .filter(record => this.isInDateRange(record.created_at))
          .map(record => ({
            id: record._id,
            type: 'medication',
            name: record.medications?.map(m => m.medication_name).join(', ') || '未记录',
            dosage: record.medications?.reduce((sum, m) => sum + Number(m.dosage || 0), 0) || 0,
            unit: record.medications?.[0]?.unit || '',
            takeTime: record.medications?.map(m => m.take_time).filter(Boolean)[0] || '未记录',
            datetime: this.formatRelativeTime(new Date(record.created_at).getTime()),
            rawTime: record.created_at
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
      console.log('开始获取发作记录...')
      const result = await listSeizureRecords(100, 0)
      console.log('发作记录原始结果:', result)
      
      if (result.success && result.data.records) {
        const allRecords = result.data.records
        console.log('发作记录总数:', allRecords.length)
        console.log('发作记录样例:', allRecords.slice(0, 2))
        
        const filteredRecords = allRecords.filter(record => {
          const inRange = this.isInDateRange(record.created_at)
          console.log('发作记录过滤:', { id: record._id, record_time: record.record_time, inRange })
          return inRange
        })
        
        console.log('过滤后发作记录数:', filteredRecords.length)
        
        return filteredRecords.map(record => ({
          id: record._id,
          type: 'seizure',
          seizureType: record.seizure_type || '未知类型',
          duration: record.duration || '未知',
          images: record.images || [],
          datetime: this.formatRelativeTime(new Date(record.created_at).getTime()),
          rawTime: record.created_at
        }))
      } else {
        console.log('发作记录获取失败或无数据:', result)
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
      console.log('开始获取其他记录...')
      const result = await listOtherRecords(100, 0)
      console.log('其他记录原始结果:', result)
      
      if (result.success && result.data.records) {
        const allRecords = result.data.records
        console.log('其他记录总数:', allRecords.length)
        console.log('其他记录样例:', allRecords.slice(0, 2))
        
        const filteredRecords = allRecords.filter(record => {
          const inRange = this.isInDateRange(record.created_at)
          console.log('其他记录过滤:', { id: record._id, record_time: record.record_time, inRange })
          return inRange
        })
        
        console.log('过滤后其他记录数:', filteredRecords.length)
        
        return filteredRecords.map(record => ({
          id: record._id,
          type: 'other',
          category: record.category || '其他',
          note: record.content?.substring(0, 80) + (record.content?.length > 60 ? '...' : '') || '无内容',
          images: record.images || [],
          datetime: this.formatRelativeTime(new Date(record.created_at).getTime()),
          rawTime: record.created_at
        }))
      } else {
        console.log('其他记录获取失败或无数据:', result)
      }
    } catch (error) {
      console.error('获取其他记录失败:', error)
    }
    return []
  },

  /**
   * 获取月度汇报列表
   */
  async fetchMonthlyReports() {
    try {
      const result = await listMonthlyReports(100, 0)
      if (result.data && result.data.records) {
        return result.data.records.map(report => {
          const seizureCount = parseInt(report.seizure_summary?.total_count) || 0
          const medicationCount = report.medications?.length || 0
          const milestoneCount = report.milestones?.checked_items?.length || 0
          const medicationNames = (report.medications || [])
            .map(m => m.medication_name)
            .filter(Boolean)
            .join('、')

          return {
            id: report._id,
            type: 'monthly',
            reportMonth: report.report_month,
            status: report.status,
            statusText: report.status === 'submitted' ? '已提交' : '草稿',
            seizureCount,
            medicationCount,
            milestoneCount,
            medicationNames: medicationNames || '未记录',
            datetime: report.report_month,
            rawTime: report.updated_at || report.created_at
          }
        })
      }
    } catch (error) {
      console.error('获取月度汇报失败:', error)
    }
    return []
  },

  /**
   * 点击月度汇报跳转到编辑/查看
   */
  goToMonthlyReport(event) {
    const month = event.currentTarget.dataset.month
    wx.navigateTo({
      url: `/pages/monthly-report/index?month=${month}`
    })
  },

  /**
   * 判断记录是否在日期范围内
   */
  isInDateRange(recordTime) {
    if (!this.data.startDate || !this.data.endDate) return true
    
    try {
      const recordDate = new Date(recordTime)
      
      // 开始日期：当天的 00:00:00
      const startDate = new Date(this.data.startDate)
      startDate.setHours(0, 0, 0, 0)
      
      // 结束日期：当天的 23:59:59.999
      const endDate = new Date(this.data.endDate)
      endDate.setHours(23, 59, 59, 999)
      
      // 添加调试信息
      console.log('日期范围过滤:', {
        recordTime,
        recordDate: recordDate.toISOString(),
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        inRange: recordDate >= startDate && recordDate <= endDate
      })
      
      // 检查日期是否有效
      if (isNaN(recordDate.getTime()) || isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        console.warn('无效的日期:', { recordTime, startDate: this.data.startDate, endDate: this.data.endDate })
        return true // 如果日期无效，不过滤
      }
      
      return recordDate >= startDate && recordDate <= endDate
    } catch (error) {
      console.error('日期范围判断出错:', error, { recordTime })
      return true // 出错时不过滤
    }
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
    
    // 设置详情数据并显示弹窗
    const title = this.getRecordTitle(record)
    
    this.setData({
      detailData: {
        title: title,
        record: record
      },
      showDetailPopup: true
    })
  },

  /**
   * 获取记录标题
   */
  getRecordTitle(record) {
    const typeMap = {
      'medication': '💊 调药记录',
      'seizure': '⚡ 发作记录',
      'other': '📄 其他记录'
    }
    
    return typeMap[record.type] || '📋 记录详情'
  },

  /**
   * 关闭详情弹窗
   */
  closeDetailPopup() {
    this.setData({
      showDetailPopup: false,
      detailData: {
        title: '',
        record: {}
      }
    })
  },

  /**
   * 编辑当前记录
   */
  editCurrentRecord() {
    const record = this.data.detailData.record
    this.editRecord(record)
    this.closeDetailPopup()
  },

  /**
   * 编辑记录
   */
  editRecord(record) {
    // 根据记录类型跳转到对应的编辑页面
    let url = ''
    
    switch (record.type) {
      case 'medication':
        url = `/pages/medication-record/index?id=${record.id}&mode=edit`
        break
      case 'seizure':
        url = `/pages/seizure-record/index?id=${record.id}&mode=edit`
        break
      case 'other':
        url = `/pages/other-record/index?id=${record.id}&mode=edit`
        break
      default:
        wx.showToast({
          title: '暂不支持编辑此类型记录',
          icon: 'none'
        })
        return
    }
    
    wx.navigateTo({
      url: url,
      fail: () => {
        wx.showToast({
          title: '页面跳转失败',
          icon: 'error'
        })
      }
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
  },

  /**
   * 跳转到添加记录页面
   */
  goToAddRecord() {
    wx.switchTab({
      url: '/pages/home/index'
    })
  },

  /**
   * 加载更多记录
   */
  loadMoreRecords() {
    if (this.data.loadingMore || !this.data.hasMore) return
    
    this.setData({ 
      loadingMore: true,
      currentPage: this.data.currentPage + 1
    })
    
    this.searchRecords().finally(() => {
      this.setData({ loadingMore: false })
    })
  },

  /**
   * 预览图片
   */
  previewImage(e) {
    const index = e.currentTarget.dataset.index
    const images = this.data.detailData.record.images
    
    if (!images || images.length === 0) {
      wx.showToast({
        title: '图片加载失败',
        icon: 'error'
      })
      return
    }
    
    // 提取图片URL，支持多种格式
    const urls = images.map(img => {
      if (typeof img === 'string') {
        return img
      }
      return img.tempFilePath || img.fileID || img.cloudPath || img
    }).filter(url => url) // 过滤掉空值
    
    if (urls.length === 0) {
      wx.showToast({
        title: '图片URL无效',
        icon: 'error'
      })
      return
    }
    
    wx.previewImage({
      current: urls[index] || urls[0],
      urls: urls,
      fail: (error) => {
        console.error('预览图片失败:', error)
        wx.showToast({
          title: '预览失败',
          icon: 'error'
        })
      }
    })
  }
})