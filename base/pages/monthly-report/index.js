const app = getApp()
const {
  createMonthlyReport,
  updateMonthlyReport,
  getMonthlyReport,
  getLastMonthReport,
  getTrackedMedications,
  updateTrackedMedications
} = require('../../utils/database.js')

Page({
  data: {
    // 步骤控制
    currentStep: 0,
    steps: [
      { text: '用药追踪' },
      { text: '发作统计' },
      { text: '发育里程碑' }
    ],

    // 月份选择
    reportMonth: '',
    reportMonthDisplay: '',
    showMonthPicker: false,
    monthColumns: [],

    // 汇报ID（编辑模式）
    reportId: null,
    isEditMode: false,

    // Step 1: 用药追踪
    medications: [],
    showAddMedicationSheet: false,
    showFrequencyPicker: false,
    currentMedicationIndex: -1,
    frequencyOptions: [
      { name: '每日1次', value: '每日1次' },
      { name: '每日2次', value: '每日2次' },
      { name: '每日3次', value: '每日3次' },
      { name: '隔日1次', value: '隔日1次' },
      { name: '每周1次', value: '每周1次' },
      { name: '按需服用', value: '按需服用' }
    ],
    complianceOptions: ['好', '一般', '差'],
    showUnitPicker: false,
    unitOptions: [
      { name: 'mg', value: 'mg' },
      { name: 'g', value: 'g' },
      { name: 'ml', value: 'ml' },
      { name: '片', value: '片' },
      { name: '粒', value: '粒' },
      { name: '包', value: '包' },
      { name: '滴', value: '滴' }
    ],
    commonMedicationOptions: [
      { name: '别嘌醇', value: '别嘌醇', defaultDosage: '', defaultUnit: 'mg' },
      { name: '丙戊酸钠', value: '丙戊酸钠', defaultDosage: '', defaultUnit: 'mg' },
      { name: '左乙拉西坦', value: '左乙拉西坦', defaultDosage: '', defaultUnit: 'mg' },
      { name: '加奈索龙', value: '加奈索龙', defaultDosage: '', defaultUnit: 'mg' },
      { name: '氯巴占', value: '氯巴占', defaultDosage: '', defaultUnit: 'mg' },
      { name: '托吡酯', value: '托吡酯', defaultDosage: '', defaultUnit: 'mg' },
      { name: '拉莫三嗪', value: '拉莫三嗪', defaultDosage: '', defaultUnit: 'mg' },
      { name: '氯硝西泮', value: '氯硝西泮', defaultDosage: '', defaultUnit: 'mg' },
      { name: '维生素B6', value: '维生素B6', defaultDosage: '', defaultUnit: 'mg' },
      { name: '自定义药物', value: 'custom' }
    ],

    // Step 2: 发作统计
    seizureSummary: {
      total_count: '',
      seizure_types: [
        { type: '强直阵挛发作', count: '' },
        { type: '失神发作', count: '' },
        { type: '肌阵挛发作', count: '' },
        { type: '局灶性发作', count: '' },
        { type: '其他', count: '' }
      ],
      worst_episode: '',
      triggers_summary: '',
      compared_to_last_month: ''
    },
    comparedOptions: [
      { name: '减少', value: 'better' },
      { name: '持平', value: 'same' },
      { name: '增加', value: 'worse' }
    ],

    // Step 3: 发育里程碑
    milestoneCategories: [
      {
        name: '大运动',
        items: [
          { id: 'gross_head_control', label: '能抬头', checked: false },
          { id: 'gross_roll_over', label: '能翻身', checked: false },
          { id: 'gross_sit', label: '能独坐', checked: false },
          { id: 'gross_crawl', label: '能爬行', checked: false },
          { id: 'gross_stand_support', label: '能扶站', checked: false },
          { id: 'gross_stand_alone', label: '能独站', checked: false },
          { id: 'gross_walk_support', label: '能扶走', checked: false },
          { id: 'gross_walk_alone', label: '能独走', checked: false }
        ]
      },
      {
        name: '精细运动',
        items: [
          { id: 'fine_grasp', label: '能抓握物品', checked: false },
          { id: 'fine_transfer', label: '能传递物品', checked: false },
          { id: 'fine_pincer', label: '能用拇食指捏', checked: false },
          { id: 'fine_spoon', label: '能用勺子', checked: false }
        ]
      },
      {
        name: '语言认知',
        items: [
          { id: 'lang_eye_contact', label: '有眼神交流', checked: false },
          { id: 'lang_vocalize', label: '能发出声音', checked: false },
          { id: 'lang_single_word', label: '能说单字', checked: false },
          { id: 'lang_phrases', label: '能说词组', checked: false },
          { id: 'lang_understand', label: '能理解简单指令', checked: false },
          { id: 'lang_recognize_family', label: '能认识家人', checked: false }
        ]
      },
      {
        name: '社交情感',
        items: [
          { id: 'social_smile', label: '有社交微笑', checked: false },
          { id: 'social_stranger_anxiety', label: '能认生', checked: false },
          { id: 'social_separation_anxiety', label: '有分离焦虑', checked: false },
          { id: 'social_imitate', label: '能模仿动作', checked: false }
        ]
      }
    ],
    newAchievements: '',
    developmentConcerns: '',
    additionalNotes: '',

    // 状态
    submitting: false,
    loading: true
  },

  onLoad(options) {
    this.initReportMonth(options.month)
    this.loadInitialData()
  },

  // 返回首页
  onBack() {
    wx.switchTab({ url: '/pages/home/index' })
  },

  // 初始化汇报月份（支持 URL 参数指定月份，默认当月）
  initReportMonth(specifiedMonth) {
    let year, month

    if (specifiedMonth && /^\d{4}-\d{2}$/.test(specifiedMonth)) {
      const parts = specifiedMonth.split('-')
      year = parseInt(parts[0])
      month = parseInt(parts[1])
    } else {
      const now = new Date()
      year = now.getFullYear()
      month = now.getMonth() + 1
    }

    const reportMonth = `${year}-${String(month).padStart(2, '0')}`
    const reportMonthDisplay = `${year}年${month}月`

    // 生成可选月份列表（最近12个月）
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

  // 加载初始数据
  async loadInitialData() {
    this.setData({ loading: true })

    try {
      // 并行加载：追踪药物配置 + 当月已有汇报 + 上月汇报
      const [trackedResult, currentResult, lastResult] = await Promise.all([
        getTrackedMedications().catch(() => null),
        getMonthlyReport(this.data.reportMonth).catch(() => null),
        getLastMonthReport().catch(() => null)
      ])

      // 如果当月已有汇报（草稿或已提交），加载数据
      if (currentResult && currentResult.data) {
        this.loadExistingReport(currentResult.data)
        return
      }

      // 否则用追踪药物配置初始化
      let medications = []
      if (trackedResult && trackedResult.data && trackedResult.data.medications) {
        medications = trackedResult.data.medications.map(med => ({
          medication_name: med.name,
          dosage: med.dosage || '',
          unit: med.unit || 'mg',
          frequency: med.frequency || '每日1次',
          dosage_changed: false,
          previous_dosage: '',
          side_effects: '',
          compliance: 'good'
        }))
      }

      // 如果没有配置，添加默认的别嘌醇
      if (medications.length === 0) {
        medications.push({
          medication_name: '别嘌醇',
          dosage: '',
          unit: 'mg',
          frequency: '每日1次',
          dosage_changed: false,
          previous_dosage: '',
          side_effects: '',
          compliance: 'good'
        })
      }

      // 如果有上月汇报，预填充里程碑
      if (lastResult && lastResult.data && lastResult.data.milestones) {
        const lastMilestones = lastResult.data.milestones.checked_items || []
        this.prefillMilestones(lastMilestones)
      }

      this.setData({ medications })
    } catch (error) {
      console.error('加载初始数据失败:', error)
      // 使用默认数据
      this.setData({
        medications: [{
          medication_name: '别嘌醇',
          dosage: '',
          unit: 'mg',
          frequency: '每日1次',
          dosage_changed: false,
          previous_dosage: '',
          side_effects: '',
          compliance: 'good'
        }]
      })
    } finally {
      this.setData({ loading: false })
    }
  },

  // 加载已有汇报数据
  loadExistingReport(report) {
    this.setData({
      reportId: report._id,
      isEditMode: true,
      medications: report.medications || [],
      seizureSummary: report.seizure_summary || this.data.seizureSummary,
      additionalNotes: report.notes || '',
      newAchievements: report.milestones?.new_achievements || '',
      developmentConcerns: report.milestones?.concerns || '',
      loading: false
    })

    // 恢复里程碑打卡状态
    if (report.milestones && report.milestones.checked_items) {
      this.prefillMilestones(report.milestones.checked_items)
    }
  },

  // 预填充里程碑
  prefillMilestones(checkedItems) {
    const categories = this.data.milestoneCategories.map(category => ({
      ...category,
      items: category.items.map(item => ({
        ...item,
        checked: checkedItems.includes(item.id)
      }))
    }))
    this.setData({ milestoneCategories: categories })
  },

  // ========== 月份选择 ==========
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
      loading: true
    })
    // 切换月份后重新加载数据
    this.loadMonthData(selected.value)
  },

  async loadMonthData(month) {
    try {
      const result = await getMonthlyReport(month)
      if (result && result.data) {
        this.loadExistingReport(result.data)
      } else {
        // 该月无数据，重置表单
        this.resetForm()
        this.setData({ loading: false })
      }
    } catch (error) {
      console.error('加载月份数据失败:', error)
      this.resetForm()
      this.setData({ loading: false })
    }
  },

  resetForm() {
    this.setData({
      reportId: null,
      isEditMode: false,
      currentStep: 0,
      seizureSummary: {
        total_count: '',
        seizure_types: [
          { type: '强直阵挛发作', count: '' },
          { type: '失神发作', count: '' },
          { type: '肌阵挛发作', count: '' },
          { type: '局灶性发作', count: '' },
          { type: '其他', count: '' }
        ],
        worst_episode: '',
        triggers_summary: '',
        compared_to_last_month: ''
      },
      newAchievements: '',
      developmentConcerns: '',
      additionalNotes: ''
    })
    // 重置里程碑
    const categories = this.data.milestoneCategories.map(category => ({
      ...category,
      items: category.items.map(item => ({ ...item, checked: false }))
    }))
    this.setData({ milestoneCategories: categories })
  },

  // ========== 步骤导航 ==========
  nextStep() {
    if (this.data.currentStep < 2) {
      this.setData({ currentStep: this.data.currentStep + 1 })
    }
  },

  prevStep() {
    if (this.data.currentStep > 0) {
      this.setData({ currentStep: this.data.currentStep - 1 })
    }
  },

  // ========== Step 1: 用药追踪 ==========
  onMedicationNameInput(event) {
    const index = event.currentTarget.dataset.index
    this.setData({ [`medications[${index}].medication_name`]: event.detail })
  },

  onDosageInput(event) {
    const index = event.currentTarget.dataset.index
    this.setData({ [`medications[${index}].dosage`]: event.detail })
  },

  showUnitPicker(event) {
    const index = event.currentTarget.dataset.index
    this.setData({ showUnitPicker: true, currentMedicationIndex: index })
  },

  onUnitSelect(event) {
    const index = this.data.currentMedicationIndex
    this.setData({
      [`medications[${index}].unit`]: event.detail.value,
      showUnitPicker: false
    })
  },

  onUnitCancel() {
    this.setData({ showUnitPicker: false })
  },

  showFrequencyPicker(event) {
    const index = event.currentTarget.dataset.index
    this.setData({ showFrequencyPicker: true, currentMedicationIndex: index })
  },

  onFrequencySelect(event) {
    const index = this.data.currentMedicationIndex
    this.setData({
      [`medications[${index}].frequency`]: event.detail.value,
      showFrequencyPicker: false
    })
  },

  onFrequencyCancel() {
    this.setData({ showFrequencyPicker: false })
  },

  toggleDosageChanged(event) {
    const index = event.currentTarget.dataset.index
    const current = this.data.medications[index].dosage_changed
    this.setData({ [`medications[${index}].dosage_changed`]: !current })
  },

  onPreviousDosageInput(event) {
    const index = event.currentTarget.dataset.index
    this.setData({ [`medications[${index}].previous_dosage`]: event.detail })
  },

  selectCompliance(event) {
    const index = event.currentTarget.dataset.index
    const value = event.currentTarget.dataset.value
    this.setData({ [`medications[${index}].compliance`]: value })
  },

  onSideEffectsInput(event) {
    const index = event.currentTarget.dataset.index
    this.setData({ [`medications[${index}].side_effects`]: event.detail })
  },

  // 添加药物
  showAddMedication() {
    this.setData({ showAddMedicationSheet: true })
  },

  onAddMedicationSelect(event) {
    const selected = event.detail
    this.setData({ showAddMedicationSheet: false })

    if (selected.value === 'custom') {
      this.addCustomMedication()
      return
    }

    // 检查是否已存在
    const exists = this.data.medications.some(
      med => med.medication_name === selected.value
    )
    if (exists) {
      wx.showToast({ title: '该药物已添加', icon: 'none' })
      return
    }

    const newMed = {
      medication_name: selected.value,
      dosage: selected.defaultDosage || '',
      unit: selected.defaultUnit || 'mg',
      frequency: '每日1次',
      dosage_changed: false,
      previous_dosage: '',
      side_effects: '',
      compliance: 'good'
    }

    this.setData({
      medications: [...this.data.medications, newMed]
    })
  },

  onAddMedicationCancel() {
    this.setData({ showAddMedicationSheet: false })
  },

  addCustomMedication() {
    const newMed = {
      medication_name: '',
      dosage: '',
      unit: 'mg',
      frequency: '每日1次',
      dosage_changed: false,
      previous_dosage: '',
      side_effects: '',
      compliance: 'good'
    }
    this.setData({
      medications: [...this.data.medications, newMed]
    })
  },

  removeMedication(event) {
    const index = event.currentTarget.dataset.index
    if (this.data.medications.length <= 1) {
      wx.showToast({ title: '至少保留一种药物', icon: 'none' })
      return
    }
    const medications = [...this.data.medications]
    medications.splice(index, 1)
    this.setData({ medications })
  },

  // ========== Step 2: 发作统计 ==========
  onTotalCountInput(event) {
    this.setData({ 'seizureSummary.total_count': event.detail })
  },

  onSeizureTypeCountInput(event) {
    const index = event.currentTarget.dataset.index
    this.setData({
      [`seizureSummary.seizure_types[${index}].count`]: event.detail
    })
  },

  selectCompared(event) {
    const value = event.currentTarget.dataset.value
    this.setData({ 'seizureSummary.compared_to_last_month': value })
  },

  onWorstEpisodeInput(event) {
    this.setData({ 'seizureSummary.worst_episode': event.detail })
  },

  onTriggersSummaryInput(event) {
    this.setData({ 'seizureSummary.triggers_summary': event.detail })
  },

  // ========== Step 3: 发育里程碑 ==========
  toggleMilestone(event) {
    const categoryIndex = event.currentTarget.dataset.categoryIndex
    const itemIndex = event.currentTarget.dataset.itemIndex
    const path = `milestoneCategories[${categoryIndex}].items[${itemIndex}].checked`
    const current = this.data.milestoneCategories[categoryIndex].items[itemIndex].checked
    this.setData({ [path]: !current })
  },

  onNewAchievementsInput(event) {
    this.setData({ newAchievements: event.detail })
  },

  onConcernsInput(event) {
    this.setData({ developmentConcerns: event.detail })
  },

  onNotesInput(event) {
    this.setData({ additionalNotes: event.detail })
  },

  // ========== 保存与提交 ==========
  // 收集所有里程碑已打卡项
  getCheckedMilestones() {
    const checkedItems = []
    this.data.milestoneCategories.forEach(category => {
      category.items.forEach(item => {
        if (item.checked) {
          checkedItems.push(item.id)
        }
      })
    })
    return checkedItems
  },

  // 构建提交数据
  buildReportData(status) {
    return {
      report_month: this.data.reportMonth,
      medications: this.data.medications,
      seizure_summary: this.data.seizureSummary,
      milestones: {
        checked_items: this.getCheckedMilestones(),
        new_achievements: this.data.newAchievements,
        concerns: this.data.developmentConcerns
      },
      notes: this.data.additionalNotes,
      status: status
    }
  },

  // 保存草稿
  async saveDraft() {
    try {
      this.setData({ submitting: true })
      const reportData = this.buildReportData('draft')

      if (this.data.reportId) {
        await updateMonthlyReport(this.data.reportId, reportData)
      } else {
        const result = await createMonthlyReport(reportData)
        if (result.data && result.data.reportId) {
          this.setData({ reportId: result.data.reportId, isEditMode: true })
        }
      }

      wx.showToast({ title: '草稿已保存', icon: 'success' })
    } catch (error) {
      console.error('保存草稿失败:', error)
      wx.showToast({ title: '保存失败，请重试', icon: 'error' })
    } finally {
      this.setData({ submitting: false })
    }
  },

  // 提交汇报
  async submitReport() {
    // 基本验证
    if (!this.validateForm()) return

    wx.showModal({
      title: '确认提交',
      content: `确定提交${this.data.reportMonthDisplay}的月度汇报吗？提交后仍可修改。`,
      success: async (res) => {
        if (!res.confirm) return

        try {
          this.setData({ submitting: true })
          const reportData = this.buildReportData('submitted')

          if (this.data.reportId) {
            await updateMonthlyReport(this.data.reportId, reportData)
          } else {
            await createMonthlyReport(reportData)
          }

          wx.showToast({
            title: '提交成功',
            icon: 'success',
            duration: 1500
          })

          // 更新本地提醒状态
          wx.setStorageSync('lastMonthlyReportMonth', this.data.reportMonth)

          setTimeout(() => {
            wx.switchTab({ url: '/pages/home/index' })
          }, 1500)
        } catch (error) {
          console.error('提交汇报失败:', error)
          wx.showToast({ title: '提交失败，请重试', icon: 'error' })
        } finally {
          this.setData({ submitting: false })
        }
      }
    })
  },

  // 表单验证
  validateForm() {
    // 验证至少有一种药物
    if (this.data.medications.length === 0) {
      wx.showToast({ title: '请至少添加一种追踪药物', icon: 'none' })
      this.setData({ currentStep: 0 })
      return false
    }

    // 验证药物名称不为空
    for (let i = 0; i < this.data.medications.length; i++) {
      if (!this.data.medications[i].medication_name) {
        wx.showToast({ title: `请填写药物${i + 1}的名称`, icon: 'none' })
        this.setData({ currentStep: 0 })
        return false
      }
    }

    // 验证发作总次数
    if (this.data.seizureSummary.total_count === '') {
      wx.showToast({ title: '请填写本月发作总次数', icon: 'none' })
      this.setData({ currentStep: 1 })
      return false
    }

    return true
  }
})
