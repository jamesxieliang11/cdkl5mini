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
    seizureChartPeriod: 'day',
    seizureTrendData: [],
    seizureTypeStats: [],
    recentSeizures: [],
    
    // 用药统计
    medicationChartPeriod: 'day',
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
    wx.switchTab({
      url: '/pages/user-profile/index'
    })
  },

  /**
   * 加载宝宝信息
   */
  async loadBabyInfo() {
    try {
      // 调用云函数获取用户信息
      const result = await wx.cloud.callFunction({
        name: 'getUserProfile',
        data: {}
      })
      
      const userData = result.result?.data?.patientInfo || {}
      console.log('用户信息:', userData)
      
      // 计算年龄
      let age = '未设置'
      if (userData.babyBirthday) {
        const birthDate = new Date(userData.babyBirthday)
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
          name: userData.babyName || '未设置',
          age: age,
          weight: userData.weight, // 接口中没有体重字段
          firstSeizure: userData.medicalHistory || '未记录' // 使用病史作为首次发作记录
        }
      })
    } catch (error) {
      console.error('获取用户信息失败:', error)
      // 如果云函数调用失败，显示默认信息
      this.setData({
        babyInfo: {
          name: '未设置',
          age: '未设置',
          weight: '未设置',
          firstSeizure: '未记录'
        }
      })
    }
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
    console.log(1111, trendData)
    
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
    
    console.log('计算趋势数据 - 周期:', period, '记录数量:', records.length)
    
    // 根据周期生成时间段
    if (period === 'day') {
      // 按日统计，生成最近7天
      for (let i = 6; i >= 0; i--) {
        const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
        const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0)
        const endOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999)
        
        periods.push({
          label: `${date.getMonth() + 1}/${date.getDate()}`,
          start: startOfDay.getTime(),
          end: endOfDay.getTime()
        })
      }
    } else if (period === 'week') {
      // 按周统计，生成最近的几周
      for (let i = 3; i >= 0; i--) {
        // 计算周的开始时间（周一）
        const weekStart = new Date(now)
        const dayOfWeek = weekStart.getDay() === 0 ? 7 : weekStart.getDay() // 将周日从0改为7
        weekStart.setDate(weekStart.getDate() - dayOfWeek + 1 - i * 7) // 周一
        weekStart.setHours(0, 0, 0, 0)
        
        // 计算周的结束时间（周日）
        const weekEnd = new Date(weekStart)
        weekEnd.setDate(weekEnd.getDate() + 6) // 周日
        weekEnd.setHours(23, 59, 59, 999)
        
        // 生成周标签
        const startMonth = weekStart.getMonth() + 1
        const startDate = weekStart.getDate()
        const endMonth = weekEnd.getMonth() + 1
        const endDate = weekEnd.getDate()
        
        let label
        if (startMonth === endMonth) {
          label = `${startMonth}/${startDate}-${endDate}`
        } else {
          label = `${startMonth}/${startDate}-${endMonth}/${endDate}`
        }
        
        periods.push({
          label: label,
          start: weekStart.getTime(),
          end: weekEnd.getTime()
        })
      }
    } else if (period === 'month') {
      for (let i = 11; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
        periods.push({
          label: `${date.getMonth() + 1}月`,
          start: new Date(date.getFullYear(), date.getMonth(), 1).getTime(),
          end: new Date(date.getFullYear(), date.getMonth() + 1, 1).getTime() - 1
        })
      }
    } else if (period === 'year') {
      for (let i = 4; i >= 0; i--) {
        const year = now.getFullYear() - i
        periods.push({
          label: `${year}年`,
          start: new Date(year, 0, 1).getTime(),
          end: new Date(year + 1, 0, 1).getTime() - 1
        })
      }
    }
    
    // 添加调试信息
    console.log('生成的时间段:', periods.map(p => ({
      label: p.label,
      start: new Date(p.start).toLocaleString(),
      end: new Date(p.end).toLocaleString()
    })))
    
    // 计算每个时间段的记录数量
    const counts = periods.map(period => {
      const filteredRecords = records.filter(record => {
        const recordTime = record.timestamp
        const inRange = recordTime >= period.start && recordTime <= period.end
        return inRange
      })
      
      console.log(`${period.label} 时间段内的记录:`, period, records, filteredRecords.length, 
        filteredRecords.map(r => new Date(r.timestamp).toLocaleString()))
      
      return filteredRecords.length
    })
    
    const maxCount = Math.max(...counts, 1)
    
    periods.forEach((period, index) => {
      const count = counts[index]
      
      trendData.push({
        period: period.label,
        label: period.label,
        count: count,
        height: Math.max((count / maxCount) * 100, 10) // 确保最小高度为10rpx
      })
    })
    
    console.log('最终趋势数据:', trendData)
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
   * 跳转到 AI 生成病历页面
   */
  goToAIMedicalRecord() {
    wx.navigateTo({
      url: '/pages/ai-assistant/index?scene=medical_record'
    })
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