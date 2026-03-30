const app = getApp()

Page({
  data: {
    // 月份选择
    reportMonth: '',
    reportMonthDisplay: '',
    showMonthPicker: false,
    monthColumns: [],

    // 统计数据
    overview: {
      totalUsers: 0,
      totalSubmitted: 0,
      totalDrafts: 0,
      submissionRate: 0
    },
    medication: {
      ranking: [],
      compliance: { good: 0, fair: 0, poor: 0 },
      totalDosageChanged: 0,
      totalEntries: 0
    },
    seizure: {
      totalCount: 0,
      avgCount: 0,
      typeRanking: [],
      compared: { better: 0, same: 0, worse: 0 }
    },
    milestone: {
      ranking: [],
      totalChecked: 0
    },

    // 详细列表
    detailList: [],
    showDetailList: false,

    // 里程碑标签映射
    milestoneLabels: {
      gross_head_control: '能抬头',
      gross_roll_over: '能翻身',
      gross_sit: '能独坐',
      gross_crawl: '能爬行',
      gross_stand_support: '能扶站',
      gross_stand_alone: '能独站',
      gross_walk_support: '能扶走',
      gross_walk_alone: '能独走',
      fine_grasp: '能抓握物品',
      fine_transfer: '能传递物品',
      fine_pincer: '能用拇食指捏',
      fine_spoon: '能用勺子',
      lang_eye_contact: '有眼神交流',
      lang_vocalize: '能发出声音',
      lang_single_word: '能说单字',
      lang_phrases: '能说词组',
      lang_understand: '能理解简单指令',
      lang_recognize_family: '能认识家人',
      social_smile: '有社交微笑',
      social_stranger_anxiety: '能认生',
      social_separation_anxiety: '有分离焦虑',
      social_imitate: '能模仿动作'
    },

    // 状态
    loading: true,
    loadingDetail: false
  },

  onLoad() {
    this.initReportMonth()
    this.loadStats()
  },

  // 初始化月份
  initReportMonth() {
    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth() + 1
    const reportMonth = `${year}-${String(month).padStart(2, '0')}`
    const reportMonthDisplay = `${year}年${month}月`

    const monthColumns = []
    for (let i = 0; i < 12; i++) {
      const date = new Date(year, month - 1 - i, 1)
      const yearVal = date.getFullYear()
      const monthVal = date.getMonth() + 1
      monthColumns.push({
        name: `${yearVal}年${monthVal}月`,
        value: `${yearVal}-${String(monthVal).padStart(2, '0')}`
      })
    }

    this.setData({ reportMonth, reportMonthDisplay, monthColumns })
  },

  // 加载统计数据
  async loadStats() {
    this.setData({ loading: true })

    try {
      const result = await this.callMonthlyReportFunction('adminStats', {
        month: this.data.reportMonth
      })

      if (result.success) {
        const statsData = result.data

        // 处理里程碑标签
        const milestoneRanking = (statsData.milestone.ranking || []).map(item => ({
          ...item,
          label: this.data.milestoneLabels[item.id] || item.id
        }))

        this.setData({
          overview: statsData.overview,
          medication: statsData.medication,
          seizure: statsData.seizure,
          'milestone.ranking': milestoneRanking,
          'milestone.totalChecked': statsData.milestone.totalChecked
        })
      }
    } catch (error) {
      console.error('加载统计数据失败:', error)
      wx.showToast({ title: '加载失败', icon: 'error' })
    } finally {
      this.setData({ loading: false })
    }
  },

  // 加载详细列表
  async loadDetailList() {
    this.setData({ loadingDetail: true, showDetailList: true })

    try {
      const result = await this.callMonthlyReportFunction('adminDetail', {
        month: this.data.reportMonth,
        pageSize: 100,
        pageIndex: 0
      })

      if (result.success) {
        this.setData({ detailList: result.data.records })
      }
    } catch (error) {
      console.error('加载详细列表失败:', error)
    } finally {
      this.setData({ loadingDetail: false })
    }
  },

  // 调用云函数
  callMonthlyReportFunction(action, params = {}) {
    return new Promise((resolve, reject) => {
      wx.cloud.callFunction({
        name: 'monthlyReport',
        data: { action, ...params },
        success: (res) => {
          if (res.result && res.result.success) {
            resolve(res.result)
          } else {
            reject(new Error(res.result ? res.result.message : '操作失败'))
          }
        },
        fail: reject
      })
    })
  },

  // 月份选择
  showMonthPicker() {
    this.setData({ showMonthPicker: true })
  },

  onMonthPickerCancel() {
    this.setData({ showMonthPicker: false })
  },

  onMonthSelect(event) {
    const selected = event.detail
    this.setData({
      reportMonth: selected.value,
      reportMonthDisplay: selected.name,
      showMonthPicker: false,
      showDetailList: false,
      detailList: []
    })
    this.loadStats()
  },

  // 切换详细列表
  toggleDetailList() {
    if (this.data.showDetailList) {
      this.setData({ showDetailList: false })
    } else {
      this.loadDetailList()
    }
  },

  // 刷新
  onRefresh() {
    this.loadStats()
    if (this.data.showDetailList) {
      this.loadDetailList()
    }
  },

  // 返回管理员面板
  onBack() {
    wx.navigateBack()
  },

  // 获取对比标签文本
  getComparedText(value) {
    const map = { better: '减少', same: '持平', worse: '增加' }
    return map[value] || value
  },

  // 获取依从性标签文本
  getComplianceText(value) {
    const map = { good: '好', fair: '一般', poor: '差' }
    return map[value] || value
  },

  // 获取状态标签
  getStatusText(status) {
    return status === 'submitted' ? '已提交' : '草稿'
  },

  getStatusType(status) {
    return status === 'submitted' ? 'success' : 'warning'
  }
})
