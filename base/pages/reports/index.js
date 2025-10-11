// pages/reports/index.js
const { listMedicationRecords, listSeizureRecords, listOtherRecords } = require('../../utils/database.js')

Page({
  /**
   * 页面的初始数据
   */
  data: {
    // 宝宝信息
    babyInfo: {
      name: '',
      age: '',
      weight: '',
      firstSeizure: ''
    },
    
    // 时间范围选择
    timeRangeOptions: ['最近7天', '最近30天', '最近3个月', '最近6个月', '最近1年'],
    selectedTimeRange: 1, // 默认选择最近30天
    
    // 整体概览数据
    overview: {
      seizureCount: 0,
      medicationCount: 0,
      avgSeizurePerMonth: 0,
      otherCount: 0
    },
    
    // 统计分析
    activeStatsTab: 'seizure', // 当前选中的统计类型
    
    // 发作统计
    seizureChartPeriod: 'month',
    seizureTrendData: [],
    seizureTypeStats: [],
    recentSeizures: [],
    
    // 用药统计
    medicationChartPeriod: 'month',
    medicationTrendData: [],
    medicationStats: [],
    
    // 其他统计
    otherTrendData: [],
    otherCategoryStats: [],
    
    // 原始数据
    allSeizureRecords: [],
    allMedicationRecords: [],
    allOtherRecords: [],
    
    loading: false
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    this.loadBabyInfo()
    this.loadAllData()
  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {
    // 页面显示时刷新数据
    this.loadAllData()
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
   * 编辑宝宝信息
   */
  editBabyInfo() {
    wx.navigateTo({
      url: '/pages/user-profile/index'
    })
  },

  /**
   * 加载宝宝信息
   */
  loadBabyInfo() {
    // 从本地存储获取宝宝信息
    const babyInfo = wx.getStorageSync('babyInfo') || {}
    
    // 计算年龄
    let age = '未设置'
    if (babyInfo.birthday) {
      const birthDate = new Date(babyInfo.birthday)
      const now = new Date()
      const ageInMonths = (now.getFullYear() - birthDate.getFullYear()) * 12 + (now.getMonth() - birthDate.getMonth())
      if (ageInMonths < 12) {
        age = `${ageInMonths}个月`
      } else {
        const years = Math.floor(ageInMonths / 12)
        const months = ageInMonths % 12
        age = months > 0 ? `${years}岁${months}个月` : `${years}岁`
      }
    }
    
    this.setData({
      babyInfo: {
        name: babyInfo.name || '未设置',
        age: age,
        weight: babyInfo.weight ? `${babyInfo.weight}kg` : '未设置',
        firstSeizure: babyInfo.firstSeizure || '未记录'
      }
    })
  },

  /**
   * 加载所有数据
   */
  async loadAllData() {
    this.setData({ loading: true })
    
    try {
      // 并行获取所有数据
      const [seizureResult, medicationResult, otherResult] = await Promise.all([
        this.fetchSeizureRecords(),
        this.fetchMedicationRecords(),
        this.fetchOtherRecords()
      ])
      
      this.setData({
        allSeizureRecords: seizureResult,
        allMedicationRecords: medicationResult,
        allOtherRecords: otherResult
      })
      
      // 计算统计数据
      this.calculateOverview()
      this.calculateStatistics()
      
    } catch (error) {
      console.error('加载数据失败:', error)
      wx.showToast({
        title: '数据加载失败',
        icon: 'error'
      })
    } finally {
      this.setData({ loading: false })
    }
  },

  /**
   * 获取发作记录
   */
  async fetchSeizureRecords() {
    try {
      const result = await listSeizureRecords(200, 0)
      if (result.success && result.data.records) {
        return result.data.records.map(record => ({
          id: record._id,
          type: record.seizure_type || '未知类型',
          duration: record.duration || '未知',
          datetime: record.record_time,
          timestamp: new Date(record.record_time).getTime()
        }))
      }
    } catch (error) {
      console.error('获取发作记录失败:', error)
    }
    return []
  },

  /**
   * 获取用药记录
   */
  async fetchMedicationRecords() {
    try {
      const result = await listMedicationRecords(200, 0)
      if (result.success && result.data.records) {
        return result.data.records.map(record => ({
          id: record._id,
          medications: record.medications || [],
          datetime: record.record_time,
          timestamp: new Date(record.record_time).getTime()
        }))
      }
    } catch (error) {
      console.error('获取用药记录失败:', error)
    }
    return []
  },

  /**
   * 获取其他记录
   */
  async fetchOtherRecords() {
    try {
      const result = await listOtherRecords(200, 0)
      if (result.success && result.data.records) {
        return result.data.records.map(record => ({
          id: record._id,
          category: record.category || '其他',
          content: record.content || '',
          datetime: record.record_time,
          timestamp: new Date(record.record_time).getTime()
        }))
      }
    } catch (error) {
      console.error('获取其他记录失败:', error)
    }
    return []
  },

  /**
   * 计算整体概览
   */
  calculateOverview() {
    const timeRange = this.getTimeRangeInDays()
    const cutoffTime = Date.now() - timeRange * 24 * 60 * 60 * 1000
    
    // 筛选时间范围内的记录
    const recentSeizures = this.data.allSeizureRecords.filter(record => record.timestamp >= cutoffTime)
    const recentMedications = this.data.allMedicationRecords.filter(record => record.timestamp >= cutoffTime)
    const recentOthers = this.data.allOtherRecords.filter(record => record.timestamp >= cutoffTime)
    
    // 计算月均发作次数
    const monthsInRange = Math.max(1, timeRange / 30)
    const avgSeizurePerMonth = Math.round(recentSeizures.length / monthsInRange * 10) / 10
    
    this.setData({
      overview: {
        seizureCount: recentSeizures.length,
        medicationCount: recentMedications.length,
        avgSeizurePerMonth: avgSeizurePerMonth,
        otherCount: recentOthers.length
      }
    })
  },

  /**
   * 计算统计数据
   */
  calculateStatistics() {
    this.calculateSeizureStats()
    this.calculateMedicationStats()
    this.calculateOtherStats()
  },

  /**
   * 计算发作统计
   */
  calculateSeizureStats() {
    const records = this.data.allSeizureRecords
    
    // 计算趋势数据
    const trendData = this.calculateTrendData(records, this.data.seizureChartPeriod)
    
    // 计算类型分布
    const typeStats = this.calculateTypeDistribution(records)
    
    // 最近发作记录
    const recentSeizures = records
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 5)
      .map(record => ({
        ...record,
        datetime: this.formatRelativeTime(record.timestamp)
      }))
    
    this.setData({
      seizureTrendData: trendData,
      seizureTypeStats: typeStats,
      recentSeizures: recentSeizures
    })
  },

  /**
   * 计算用药统计
   */
  calculateMedicationStats() {
    const records = this.data.allMedicationRecords
    
    // 计算趋势数据
    const trendData = this.calculateTrendData(records, this.data.medicationChartPeriod)
    
    // 计算药物使用统计
    const medicationStats = this.calculateMedicationUsage(records)
    
    this.setData({
      medicationTrendData: trendData,
      medicationStats: medicationStats
    })
  },

  /**
   * 计算其他统计
   */
  calculateOtherStats() {
    const records = this.data.allOtherRecords
    
    // 计算趋势数据
    const trendData = this.calculateTrendData(records, 'month')
    
    // 计算分类统计
    const categoryStats = this.calculateCategoryDistribution(records)
    
    this.setData({
      otherTrendData: trendData,
      otherCategoryStats: categoryStats
    })
  },

  /**
   * 计算趋势数据
   */
  calculateTrendData(records, period) {
    const now = new Date()
    const trendData = []
    let periods = []
    
    // 根据周期生成时间段
    if (period === 'week') {
      for (let i = 6; i >= 0; i--) {
        const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
        periods.push({
          label: `${date.getMonth() + 1}/${date.getDate()}`,
          start: new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime(),
          end: new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1).getTime()
        })
      }
    } else if (period === 'month') {
      for (let i = 11; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
        periods.push({
          label: `${date.getMonth() + 1}月`,
          start: new Date(date.getFullYear(), date.getMonth(), 1).getTime(),
          end: new Date(date.getFullYear(), date.getMonth() + 1, 1).getTime()
        })
      }
    } else if (period === 'year') {
      for (let i = 4; i >= 0; i--) {
        const year = now.getFullYear() - i
        periods.push({
          label: `${year}年`,
          start: new Date(year, 0, 1).getTime(),
          end: new Date(year + 1, 0, 1).getTime()
        })
      }
    }
    
    // 计算每个时间段的记录数量
    const maxCount = Math.max(...periods.map(period => {
      return records.filter(record => 
        record.timestamp >= period.start && record.timestamp < period.end
      ).length
    }), 1)
    
    periods.forEach(period => {
      const count = records.filter(record => 
        record.timestamp >= period.start && record.timestamp < period.end
      ).length
      
      trendData.push({
        period: period.label,
        label: period.label,
        count: count,
        height: (count / maxCount) * 100
      })
    })
    
    return trendData
  },

  /**
   * 计算类型分布
   */
  calculateTypeDistribution(records) {
    const typeCount = {}
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD']
    
    records.forEach(record => {
      const type = record.type || '未知类型'
      typeCount[type] = (typeCount[type] || 0) + 1
    })
    
    const total = records.length || 1
    const typeStats = Object.entries(typeCount).map(([type, count], index) => ({
      type: type,
      count: count,
      percentage: Math.round((count / total) * 100),
      color: colors[index % colors.length]
    }))
    
    return typeStats.sort((a, b) => b.count - a.count)
  },

  /**
   * 计算药物使用统计
   */
  calculateMedicationUsage(records) {
    const medicationUsage = {}
    
    records.forEach(record => {
      if (record.medications && record.medications.length > 0) {
        record.medications.forEach(med => {
          const name = med.medication_name || '未知药物'
          const dosage = parseFloat(med.dosage) || 0
          const unit = med.unit || ''
          
          if (!medicationUsage[name]) {
            medicationUsage[name] = {
              name: name,
              totalDosage: 0,
              count: 0,
              unit: unit
            }
          }
          
          medicationUsage[name].totalDosage += dosage
          medicationUsage[name].count += 1
        })
      }
    })
    
    return Object.values(medicationUsage)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10) // 只显示前10种药物
  },

  /**
   * 计算分类分布
   */
  calculateCategoryDistribution(records) {
    const categoryCount = {}
    
    records.forEach(record => {
      const category = record.category || '其他'
      categoryCount[category] = (categoryCount[category] || 0) + 1
    })
    
    return Object.entries(categoryCount).map(([category, count]) => ({
      category: category,
      count: count
    })).sort((a, b) => b.count - a.count)
  },

  /**
   * 获取时间范围天数
   */
  getTimeRangeInDays() {
    const ranges = [7, 30, 90, 180, 365]
    return ranges[this.data.selectedTimeRange] || 30
  },

  /**
   * 时间范围变化
   */
  onTimeRangeChange(e) {
    this.setData({
      selectedTimeRange: parseInt(e.detail.value)
    })
    this.calculateOverview()
  },

  /**
   * 切换统计类型
   */
  switchStatsTab(e) {
    const tab = e.currentTarget.dataset.tab
    this.setData({
      activeStatsTab: tab
    })
  },

  /**
   * 改变图表周期
   */
  changeChartPeriod(e) {
    const type = e.currentTarget.dataset.type
    const period = e.currentTarget.dataset.period
    
    if (type === 'seizure') {
      this.setData({ seizureChartPeriod: period })
      this.calculateSeizureStats()
    } else if (type === 'medication') {
      this.setData({ medicationChartPeriod: period })
      this.calculateMedicationStats()
    }
  },

  /**
   * 格式化相对时间
   */
  formatRelativeTime(timestamp) {
    const now = Date.now()
    const diff = now - timestamp
    const days = Math.floor(diff / (24 * 60 * 60 * 1000))
    const hours = Math.floor(diff / (60 * 60 * 1000))
    const minutes = Math.floor(diff / (60 * 1000))

    if (days > 0) {
      return `${days}天前`
    } else if (hours > 0) {
      return `${hours}小时前`
    } else if (minutes > 0) {
      return `${minutes}分钟前`
    } else {
      return '刚刚'
    }
  },

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh() {
    this.loadAllData().finally(() => {
      wx.stopPullDownRefresh()
    })
  }
})