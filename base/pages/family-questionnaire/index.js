// 家庭基础信息问卷页面 - 7步向导式表单
const { submitQuestionnaire, getQuestionnaire } = require('../../utils/database.js')

const TOTAL_STEPS = 7
const DRAFT_KEY = 'questionnaire_draft'

// 每步的必填字段
const REQUIRED_FIELDS = {
  1: ['child_name', 'wechat_group_nickname', 'child_gender', 'birth_date', 'region', 'parent_name', 'parent_contact', 'birth_order'],
  2: ['pregnancy_method', 'pregnancy_protection', 'delivery_method', 'misdiagnosed_as_cp'],
  3: ['mother_education', 'mother_occupation', 'father_education', 'father_occupation', 'family_member_resigned', 'monthly_income', 'treatment_cost', 'rehab_cost'],
  4: ['diagnosis_age', 'first_seizure_age', 'other_symptoms', 'mobility_method', 'swallowing_difficulty', 'sleep_disorder', 'sleep_restlessness', 'development_status'],
  5: ['gene_test_done', 'mutation_source', 'mutation_type'],
  6: ['seizure_control', 'recent_seizure_type', 'recent_seizure_duration', 'recent_seizure_intensity', 'treatment_methods', 'current_medications', 'worsening_medications', 'ineffective_medications'],
  7: ['hot_bath', 'bath_frequency', 'bath_duration', 'referral_source']
}

// 步骤标题
const STEP_TITLES = ['基本信息', '孕产信息', '家庭背景', '诊断与症状', '基因检测', '癫痫与治疗', '药浴与其他']

// 选项配置
const OPTIONS = {
  gender: ['男', '女'],
  birthOrder: ['第一胎', '第二胎', '第三胎', '第四胎及以上'],
  pregnancyMethod: ['自然怀孕', '试管婴儿', '人工授精', '其他'],
  pregnancyProtection: ['是', '否'],
  deliveryMethod: ['顺产', '剖腹产', '其他'],
  misdiagnosedAsCp: ['是', '否'],
  education: ['初中及以下', '高中/中专', '大专', '本科', '硕士', '博士及以上'],
  familyResigned: ['是，母亲辞职', '是，父亲辞职', '是，其他家庭成员辞职', '否'],
  monthlyIncome: ['3000元以下', '3000-5000元', '5000-10000元', '10000-20000元', '20000-50000元', '50000元以上'],
  treatmentCost: ['500元以下', '500-1000元', '1000-3000元', '3000-5000元', '5000-10000元', '10000元以上'],
  rehabCost: ['500元以下', '500-1000元', '1000-3000元', '3000-5000元', '5000-10000元', '10000元以上'],
  otherSymptoms: ['发育迟缓', '运动障碍', '视觉障碍', '手部刻板动作', '脊柱侧弯', '便秘', '流涎', '磨牙', '呼吸异常', '自闭倾向', '其他'],
  mobilityMethod: ['独立行走', '扶走', '爬行', '坐立', '翻身', '完全不能自主移动'],
  swallowingDifficulty: ['无困难', '轻度困难', '中度困难', '重度困难', '需要鼻饲/胃管'],
  sleepDisorder: ['无障碍', '轻度', '中度', '重度'],
  sleepRestlessness: ['无', '偶尔', '经常', '总是'],
  developmentStatus: ['严重落后', '明显落后', '轻度落后', '基本正常'],
  geneTestDone: ['是', '否'],
  mutationSource: ['新发突变', '母源遗传', '父源遗传', '不确定', '未检测'],
  mutationType: ['错义突变', '无义突变', '移码突变', '剪接位点突变', '大片段缺失/重复', '其他', '不确定'],
  seizureControl: ['已控制（无发作超过6个月）', '部分控制（发作减少）', '未控制（频繁发作）', '加重'],
  recentSeizureDuration: ['数秒', '1分钟以内', '1-5分钟', '5-10分钟', '10分钟以上'],
  recentSeizureIntensity: ['轻度', '中度', '重度'],
  treatmentMethods: ['抗癫痫药物', '生酮饮食', '迷走神经刺激(VNS)', '康复训练', '中医/针灸', '手术', '基因治疗临床试验', '其他'],
  hotBath: ['是', '否'],
  bathFrequency: ['每天', '每周2-3次', '每周1次', '偶尔', '从不'],
  bathDuration: ['10分钟以内', '10-20分钟', '20-30分钟', '30分钟以上'],
  volunteerWillingness: ['是', '否', '视情况而定'],
  referralSource: ['微信群', '病友推荐', '医生推荐', '网络搜索', '公众号', '其他']
}

Page({
  data: {
    currentStep: 1,
    totalSteps: TOTAL_STEPS,
    stepTitle: STEP_TITLES[0],
    progressPercent: Math.round(100 / TOTAL_STEPS),
    isEdit: false,
    loading: false,
    submitting: false,

    // 表单数据
    formData: {
      child_name: '',
      wechat_group_nickname: '',
      child_gender: '',
      birth_date: '',
      region: '',
      parent_name: '',
      parent_contact: '',
      birth_order: '',
      pregnancy_method: '',
      pregnancy_protection: '',
      delivery_method: '',
      misdiagnosed_as_cp: '',
      mother_education: '',
      mother_occupation: '',
      father_education: '',
      father_occupation: '',
      family_member_resigned: '',
      monthly_income: '',
      treatment_cost: '',
      rehab_cost: '',
      diagnosis_age: '',
      first_seizure_age: '',
      other_symptoms: '',
      mobility_method: '',
      swallowing_difficulty: '',
      sleep_disorder: '',
      sleep_restlessness: '',
      development_status: '',
      gene_test_done: '',
      gene_report_images: [],
      mutation_source: '',
      mutation_type: '',
      seizure_control: '',
      recent_seizure_type: '',
      recent_seizure_duration: '',
      recent_seizure_intensity: '',
      treatment_methods: '',
      current_medications: '',
      worsening_medications: '',
      ineffective_medications: '',
      hot_bath: '',
      bath_frequency: '',
      bath_duration: '',
      bath_benefits: '',
      treatment_effect_description: '',
      volunteer_willingness: '',
      resources_skills: '',
      referral_source: ''
    },

    // 多选临时状态
    selectedSymptoms: [],
    selectedTreatments: [],

    // 图片上传
    geneReportFiles: [],

    // 选项配置
    options: OPTIONS,

    // 日期选择
    currentDate: '',

    // 地区选择
    regionArray: [
      ['北京市','天津市','河北省','山西省','内蒙古','辽宁省','吉林省','黑龙江省','上海市','江苏省','浙江省','安徽省','福建省','江西省','山东省','河南省','湖北省','湖南省','广东省','广西','海南省','重庆市','四川省','贵州省','云南省','西藏','陕西省','甘肃省','青海省','宁夏','新疆','香港','澳门','台湾']
    ]
  },

  onLoad(options) {
    const today = new Date()
    const currentDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
    this.setData({ currentDate })

    // 尝试恢复草稿
    this.loadDraft()
    // 尝试加载已提交的问卷
    this.loadExistingQuestionnaire()
  },

  // ==================== 数据加载 ====================

  // 加载本地草稿
  loadDraft() {
    const draft = wx.getStorageSync(DRAFT_KEY)
    if (draft && draft.formData) {
      this.setData({
        formData: { ...this.data.formData, ...draft.formData },
        currentStep: draft.currentStep || 1,
        selectedSymptoms: draft.selectedSymptoms || [],
        selectedTreatments: draft.selectedTreatments || []
      })
      this.updateStepUI()
    }
  },

  // 加载已提交的问卷（编辑模式）
  async loadExistingQuestionnaire() {
    try {
      this.setData({ loading: true })
      const result = await getQuestionnaire()
      if (result.data) {
        const q = result.data
        this.setData({
          isEdit: true,
          formData: { ...this.data.formData, ...q },
          selectedSymptoms: q.other_symptoms ? q.other_symptoms.split('、') : [],
          selectedTreatments: q.treatment_methods ? q.treatment_methods.split('、') : [],
          geneReportFiles: (q.gene_report_images || []).map((fileID, i) => ({
            url: fileID,
            name: `报告${i + 1}`
          }))
        })
      }
    } catch (error) {
      console.log('未找到已有问卷，进入新建模式')
    } finally {
      this.setData({ loading: false })
    }
  },

  // 保存草稿到本地
  saveDraft() {
    wx.setStorageSync(DRAFT_KEY, {
      formData: this.data.formData,
      currentStep: this.data.currentStep,
      selectedSymptoms: this.data.selectedSymptoms,
      selectedTreatments: this.data.selectedTreatments
    })
  },

  // ==================== 步骤导航 ====================

  updateStepUI() {
    this.setData({
      stepTitle: STEP_TITLES[this.data.currentStep - 1],
      progressPercent: Math.round((this.data.currentStep / TOTAL_STEPS) * 100)
    })
  },

  nextStep() {
    if (!this.validateCurrentStep()) return
    if (this.data.currentStep < TOTAL_STEPS) {
      this.setData({ currentStep: this.data.currentStep + 1 })
      this.updateStepUI()
      this.saveDraft()
      wx.pageScrollTo({ scrollTop: 0, duration: 200 })
    }
  },

  prevStep() {
    if (this.data.currentStep > 1) {
      this.setData({ currentStep: this.data.currentStep - 1 })
      this.updateStepUI()
      this.saveDraft()
      wx.pageScrollTo({ scrollTop: 0, duration: 200 })
    }
  },

  // ==================== 表单验证 ====================

  validateCurrentStep() {
    const step = this.data.currentStep
    const fields = REQUIRED_FIELDS[step]
    if (!fields) return true

    for (const field of fields) {
      const value = this.data.formData[field]
      if (!value || (typeof value === 'string' && !value.trim())) {
        const fieldName = this.getFieldLabel(field)
        wx.showToast({ title: `请填写${fieldName}`, icon: 'none' })
        return false
      }
    }
    return true
  },

  getFieldLabel(field) {
    const labels = {
      child_name: '孩子姓名', wechat_group_nickname: '微信群昵称',
      child_gender: '性别', birth_date: '出生日期', region: '所在地区',
      parent_name: '家长姓名', parent_contact: '联系方式', birth_order: '第几胎',
      pregnancy_method: '怀孕方式', pregnancy_protection: '是否保胎',
      delivery_method: '分娩方式', misdiagnosed_as_cp: '是否被当作脑瘫治疗',
      mother_education: '母亲学历', mother_occupation: '母亲职业',
      father_education: '父亲学历', father_occupation: '父亲职业',
      family_member_resigned: '家庭成员辞职情况', monthly_income: '家庭月收入',
      treatment_cost: '治疗费用', rehab_cost: '康复费用',
      diagnosis_age: '诊断年龄', first_seizure_age: '癫痫首发年龄',
      other_symptoms: '其他症状', mobility_method: '移动方式',
      swallowing_difficulty: '吞咽困难程度', sleep_disorder: '睡眠障碍程度',
      sleep_restlessness: '睡眠不安', development_status: '发育状态',
      gene_test_done: '基因检测', mutation_source: '变异来源', mutation_type: '突变类型',
      seizure_control: '癫痫控制情况', recent_seizure_type: '最近发作形式',
      recent_seizure_duration: '发作持续时间', recent_seizure_intensity: '发作强度',
      treatment_methods: '治疗措施', current_medications: '目前服药情况',
      worsening_medications: '加重药物', ineffective_medications: '无效药物',
      hot_bath: '是否热浴', bath_frequency: '药浴频率',
      bath_duration: '热浴时长', referral_source: '渠道来源'
    }
    return labels[field] || field
  },

  // ==================== 通用输入处理 ====================

  onFieldInput(e) {
    const field = e.currentTarget.dataset.field
    const value = typeof e.detail === 'object' ? (e.detail.value || e.detail) : e.detail
    this.setData({ [`formData.${field}`]: value })
  },

  onRadioChange(e) {
    const field = e.currentTarget.dataset.field
    this.setData({ [`formData.${field}`]: e.detail })
  },

  onPickerChange(e) {
    const field = e.currentTarget.dataset.field
    const options = e.currentTarget.dataset.options
    const idx = e.detail.value
    if (options && Array.isArray(this.data.options[options])) {
      this.setData({ [`formData.${field}`]: this.data.options[options][idx] })
    }
  },

  onDateChange(e) {
    const field = e.currentTarget.dataset.field
    this.setData({ [`formData.${field}`]: e.detail.value })
  },

  onRegionChange(e) {
    this.setData({ 'formData.region': e.detail.value.join(' ') })
  },

  // 多选：其他症状
  onSymptomsChange(e) {
    const selected = e.detail
    this.setData({
      selectedSymptoms: selected,
      'formData.other_symptoms': selected.join('、')
    })
  },

  // 多选：治疗措施
  onTreatmentsChange(e) {
    const selected = e.detail
    this.setData({
      selectedTreatments: selected,
      'formData.treatment_methods': selected.join('、')
    })
  },

  // ==================== 图片上传（基因报告） ====================

  onGeneReportUpload(e) {
    const { file } = e.detail
    this.uploadGeneReportImage(file)
  },

  async uploadGeneReportImage(file) {
    try {
      wx.showLoading({ title: '上传中...' })
      const timestamp = Date.now()
      const randomStr = Math.random().toString(36).substr(2, 9)
      const cloudPath = `questionnaire-images/${timestamp}-${randomStr}.jpg`

      const uploadRes = await wx.cloud.uploadFile({
        cloudPath,
        filePath: file.url || file.path || file.tempFilePath
      })

      const currentFiles = this.data.geneReportFiles
      const currentImages = this.data.formData.gene_report_images || []
      currentFiles.push({ url: uploadRes.fileID, name: `报告${currentFiles.length + 1}` })
      currentImages.push(uploadRes.fileID)

      this.setData({
        geneReportFiles: currentFiles,
        'formData.gene_report_images': currentImages
      })
      wx.showToast({ title: '上传成功', icon: 'success' })
    } catch (error) {
      console.error('上传基因报告图片失败:', error)
      wx.showToast({ title: '上传失败', icon: 'error' })
    } finally {
      wx.hideLoading()
    }
  },

  onGeneReportDelete(e) {
    const { index } = e.detail
    const files = [...this.data.geneReportFiles]
    const images = [...(this.data.formData.gene_report_images || [])]
    files.splice(index, 1)
    images.splice(index, 1)
    this.setData({
      geneReportFiles: files,
      'formData.gene_report_images': images
    })
  },

  // ==================== 提交 ====================

  async onSubmit() {
    if (!this.validateCurrentStep()) return
    if (this.data.submitting) return

    this.setData({ submitting: true })
    try {
      wx.showLoading({ title: '提交中...' })
      await submitQuestionnaire(this.data.formData, 'submitted')

      // 清除本地草稿
      wx.removeStorageSync(DRAFT_KEY)

      wx.showToast({ title: '提交成功', icon: 'success' })
      setTimeout(() => {
        wx.navigateBack({ fail: () => wx.switchTab({ url: '/pages/home/index' }) })
      }, 1500)
    } catch (error) {
      console.error('提交问卷失败:', error)
      wx.showToast({ title: error.message || '提交失败', icon: 'error' })
    } finally {
      this.setData({ submitting: false })
      wx.hideLoading()
    }
  },

  // 保存草稿到云端
  async saveDraftToCloud() {
    try {
      wx.showLoading({ title: '保存草稿...' })
      await submitQuestionnaire(this.data.formData, 'draft')
      this.saveDraft()
      wx.showToast({ title: '草稿已保存', icon: 'success' })
    } catch (error) {
      console.error('保存草稿失败:', error)
      wx.showToast({ title: '保存失败', icon: 'error' })
    } finally {
      wx.hideLoading()
    }
  },

  // ==================== 导航 ====================

  onBack() {
    if (this.data.currentStep > 1) {
      this.prevStep()
    } else {
      this.saveDraft()
      wx.navigateBack({
        fail: () => wx.switchTab({ url: '/pages/home/index' })
      })
    }
  }
})
