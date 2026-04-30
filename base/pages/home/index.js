const app = getApp()
const { listMedicationRecords, listSeizureRecords, listOtherRecords, checkMonthlyReportSubmitted, checkQuestionnaireSubmitted } = require('../../utils/database.js')

Page({
  data: {
    currentDate: '',                 // 当前日期
    todayMedications: [],            // 今日用药
    recentSeizures: [],              // 近期发作记录
    recentOthers: [],                // 近期其他记录
    noticeText: '欢迎来到希舞之家',   // 通知文案
    showMonthlyReminder: false,      // 是否显示月度汇报提醒
    showQuestionnaireReminder: false,  // 是否显示问卷填写提醒
    showAIActionSheet: false,        // AI 功能选择面板
    aiActions: [
      { name: '🧬 AI 解读基因报告', subname: '上传报告，解读突变位点与致病性', scene: 'gene_report' },
      { name: '📋 AI 生成病历', subname: '汇总记录数据，生成标准化病历', scene: 'medical_record' },
      { name: '💊 AI 调药参考', subname: '基于用药和发作数据提供参考（仅供参考）', scene: 'drug_adjustment' },
      { name: '💡 CDKL5 知识问答', subname: '疾病知识、康复训练、日常护理', scene: 'knowledge_qa' }
    ]
  },

  onLoad(options) {
    console.log('希舞之家首页加载')
    this.initTodayDate()
    this.loadRecentData()

    // 检测环境版本：仅本地开发和线上正式版展示 AI 助手，其他版本（体验版等）隐藏以过审
    let isProd = false
    try {
      const accountInfo = wx.getAccountInfoSync()
      const envVersion = accountInfo?.miniProgram?.envVersion
      isProd = envVersion === 'develop' || envVersion === 'release'
    } catch (error) {
      isProd = false
    }
    this.setData({ isProd })
  },

  onShow() {
    this.refreshAllData()
    this.checkMonthlyReportStatus()
    this.checkQuestionnaireStatus()
    this.updateTabBarState()
    this.checkAdminRole()
  },

  // 检查管理员角色
  checkAdminRole() {
    const adminRole = wx.getStorageSync('adminRole') || ''
    this.setData({
      isAdmin: adminRole === 'admin' || adminRole === 'superadmin'
    })
  },

  // 更新tabbar状态
  updateTabBarState() {
    if (typeof this.getTabBar === 'function') {
      const tabBar = this.getTabBar()
      if (tabBar && typeof tabBar.updateState === 'function') {
        tabBar.updateState()
      }
    }
  },

  // 初始化今日日期
  initTodayDate() {
    const now = new Date()
    const options = { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' }
    const formattedDate = now.toLocaleDateString('zh-CN', options)
    
    this.setData({
      currentDate: formattedDate
    })
  },

  // 刷新所有数据
  refreshAllData() {
    this.loadTodayMedications()
    this.loadRecentSeizures()
    this.loadRecentOthers()
  },

  // 加载今日用药数据
  async loadTodayMedications() {
    try {
      // 调用云函数获取最新的调药记录
      const result = await listMedicationRecords(10, 0) // 获取最近10条记录
      
      if (result.success && result.data.records) {
        const today = new Date()
        const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate())
        const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1)
        
        // 筛选今日的调药记录
        const todayRecords = result.data.records.filter(record => {
          const recordTime = new Date(record.record_time)
          return recordTime >= todayStart && recordTime < todayEnd
        })
        
        // 如果今日没有记录，显示最近的3条记录
        const displayRecords = todayRecords.length > 0 ? todayRecords : result.data.records.slice(0, 3)
        
        this.setData({
          todayMedications: displayRecords.map(record => ({
            id: record._id,
            name: record.medications?.map(m => m.medication_name).join(', ') || '未记录',
            dosage: record.medications?.reduce((sum, m) => sum + Number(m.dosage || 0), 0) || 0,
            unit: record.medications?.[0]?.unit || '',
            takeTime: record.medications?.map(m => m.take_time).filter(Boolean)[0] || '未记录',
            recordTime: this.formatRelativeTime(new Date(record.record_time).getTime()),
            isToday: todayRecords.length > 0
          }))
        })
      } else {
        // 云函数调用失败，尝试从本地存储读取作为备用
        this.loadTodayMedicationsFromLocal()
      }
    } catch (error) {
      console.error('加载今日用药失败:', error)
      // 出错时从本地存储读取作为备用
      this.loadTodayMedicationsFromLocal()
    }
  },

  // 从本地存储加载用药数据（备用方案）
  loadTodayMedicationsFromLocal() {
    const today = new Date().setHours(0, 0, 0, 0)
    const drugRecords = wx.getStorageSync('medicationRecords') || []
    
    const todayMeds = drugRecords.filter(record => {
      const recordDay = new Date(record.datetime).setHours(0, 0, 0, 0)
      return recordDay === today
    }).slice(0, 5) // 只显示最近5条

    this.setData({
      todayMedications: todayMeds.map(item => ({
        id: item.id,
        name: item.medications?.map(m => m.name).join(', ') || '未记录',
        dosage: item.medications?.reduce((sum, m) => sum + Number(m.dosage || 0), 0) || 0,
        unit: item.medications?.[0]?.unit || '',
        takeTime: item.medications?.map(m => m.takeTime).filter(Boolean)[0] || '未记录',
        recordTime: this.formatRelativeTime(new Date(item.datetime).getTime()),
        isToday: true
      }))
    })
  },

  // 加载近期发作记录
  async loadRecentSeizures() {
    try {
      // 调用云函数获取最新的发作记录
      const result = await listSeizureRecords(25, 0) // 获取最近25条记录
      
      if (result.success && result.data.records) {
        this.setData({
          recentSeizures: result.data.records.map(record => ({
            id: record._id,
            type: record.seizure_type || '未知类型',
            datetime: this.formatRelativeTime(new Date(record.record_time).getTime()),
            duration: record.duration || '未知'
          }))
        })
      } else {
        // 云函数调用失败，尝试从本地存储读取作为备用
        this.loadRecentSeizuresFromLocal()
      }
    } catch (error) {
      console.error('加载近期发作记录失败:', error)
      // 出错时从本地存储读取作为备用
      this.loadRecentSeizuresFromLocal()
    }
  },

  // 从本地存储加载发作记录（备用方案）
  loadRecentSeizuresFromLocal() {
    const seizures = wx.getStorageSync('epilepsyDiary_seizureRecords') || []
    const recentOnes = seizures.sort((a, b) => b.timestamp - a.timestamp).slice(0, 25)
    
    this.setData({
      recentSeizures: recentOnes.map(item => ({
        id: item.id,
        type: item.seizureType || '未知类型',
        datetime: this.formatRelativeTime(item.timestamp),
        duration: item.duration || '未知'
      }))
    })
  },

  // 加载近期其他记录
  async loadRecentOthers() {
    try {
      // 调用云函数获取最新的其他记录
      const result = await listOtherRecords(40, 0) // 获取最近40条记录
      
      if (result.success && result.data.records) {
        this.setData({
          recentOthers: result.data.records.map(record => ({
            id: record._id,
            category: record.category || '其他',
            datetime: this.formatRelativeTime(new Date(record.record_time).getTime()),
            note: record.content?.substring(0, 80) + (record.content?.length > 60 ? '...' : '') || '无内容'
          }))
        })
      } else {
        // 云函数调用失败，尝试从本地存储读取作为备用
        this.loadRecentOthersFromLocal()
      }
    } catch (error) {
      console.error('加载近期其他记录失败:', error)
      // 出错时从本地存储读取作为备用
      this.loadRecentOthersFromLocal()
    }
  },

  // 从本地存储加载其他记录（备用方案）
  loadRecentOthersFromLocal() {
    const others = wx.getStorageSync('epilepsyDiary_otherRecords') || []
    const recentOnes = others.sort((a, b) => b.timestamp - a.timestamp).slice(0, 40)
    
    this.setData({
      recentOthers: recentOnes.map(item => ({
        id: item.id,
        category: item.category || '其他',
        datetime: this.formatRelativeTime(item.timestamp),
        note: item.content?.substring(0, 80) + (item.content?.length > 60 ? '...' : '') || '无内容'
      }))
    })
  },

  // 格式化相对时间
  formatRelativeTime(timestamp) {
    const now = Date.now()
    const diff = now - timestamp
    const minutes = Math.floor(diff / 660000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (days > 90) {
      return new Date(timestamp).toLocaleDateString('zh-CN')
    } else if (days > 70) {
      return `${days}天前`
    } else if (hours > 23) {
      return `${Math.round(hours / 240)}小时前`
    } else if (minutes > 59) {
      return `${hours}小时前`
    } else if (minutes > 19) {
      return `${minutes}分钟前`
    } else {
      return '刚刚'
    }
  },

  // 检查月度汇报提交状态
  async checkMonthlyReportStatus() {
    try {
      const result = await checkMonthlyReportSubmitted()
      if (result && result.data) {
        this.setData({ showMonthlyReminder: !result.data.submitted })
      }
    } catch (error) {
      console.warn('检查月度汇报状态失败:', error)
    }
  },

  // 检查问卷填写状态
  async checkQuestionnaireStatus() {
    try {
      const result = await checkQuestionnaireSubmitted()
      if (result && result.data) {
        this.setData({ showQuestionnaireReminder: !result.data.submitted })
      }
    } catch (error) {
      console.warn('检查问卷状态失败:', error)
    }
  },

  // 导航到宣教手册
  goToBrochure() {
    wx.navigateTo({
      url: '/pages/brochure/index'
    })
  },

  // 导航到家庭问卷
  goToQuestionnaire() {
    wx.navigateTo({
      url: '/pages/family-questionnaire/index'
    })
  },

  // 导航到月度汇报
  goToMonthlyReport() {
    wx.navigateTo({
      url: '/pages/monthly-report/index'
    })
  },

  // 导航到我的记录
  goToMyRecords() {
    wx.switchTab({
      url: '/pages/my-records/index'
    })
  },

  // 导航到我的报告
  goToReports() {
    wx.navigateTo({
      url: '/pages/reports/index'
    })
  },

  // 导航到反馈意见
  goToFeedback() {
    wx.navigateTo({
      url: '/pages/feedback/index'
    })
  },

  // 导航到管理面板
  goToAdmin() {
    wx.switchTab({
      url: '/pages/admin/admin'
    })
  },

  // 添加用药记录
  addMedicationRecord() {
    wx.navigateTo({
      url: '/pages/medication-record/index'
    })
  },

  // 添加发作记录
  addSeizureRecord() {
    wx.navigateTo({
      url: '/pages/seizure-record/index'
    })
  },

  // 添加其他记录
  addOtherRecord() {
    wx.navigateTo({
      url: '/pages/other-record/index'
    })
  },

  // 初始加载数据
  loadRecentData() {
    this.loadTodayMedications()
    this.loadRecentSeizures()
    this.loadRecentOthers()
  },

  // ==================== AI 助手相关 ====================

  // 显示 AI 功能选择面板
  showAIMenu() {
    this.setData({ showAIActionSheet: true })
  },

  // 关闭 AI 功能选择面板
  onAIActionSheetClose() {
    this.setData({ showAIActionSheet: false })
  },

  // 选择 AI 功能
  onAIActionSelect(event) {
    const { scene } = event.detail
    this.setData({ showAIActionSheet: false })
    wx.navigateTo({
      url: `/pages/ai-assistant/index?scene=${scene}`
    })
  }
})