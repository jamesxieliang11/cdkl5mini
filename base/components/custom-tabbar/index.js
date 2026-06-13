const {
  listMedicationRecords,
  listSeizureRecords,
  createMedicationRecord,
  createSeizureRecord,
  createOtherRecord
} = require('../../utils/database.js')

Component({
  data: {
    active: 'home',
    showCommunity: false,
    showQuickPanel: false,
    lastMedRecord: null,
    lastSeizureRecord: null,
    quickNoteCategory: '日常观察',
    quickNoteContent: '',
    quickCategories: ['日常观察', '饮食记录', '睡眠情况', '情绪状态', '康复训练', '其他'],
    submitting: false
  },

  lifetimes: {
    attached() {
      this.updateActiveByCurrentPage()
      this.syncCommunityVisible()
    }
  },

  methods: {
    switchTab(event) {
      const { path } = event.currentTarget.dataset
      if (path) {
        wx.switchTab({
          url: path,
          success: () => {
            setTimeout(() => {
              this.updateActiveByCurrentPage()
            }, 100)
          }
        })
      }
    },

    async openQuickPanel() {
      this.setData({ showQuickPanel: true })
      try {
        const [medResult, seizureResult] = await Promise.all([
          listMedicationRecords(1, 0).catch(() => ({ success: false })),
          listSeizureRecords(1, 0).catch(() => ({ success: false }))
        ])
        const lastMed = (medResult.success && medResult.data?.records?.[0]) || null
        const lastSeizure = (seizureResult.success && seizureResult.data?.records?.[0]) || null
        this.setData({ lastMedRecord: lastMed, lastSeizureRecord: lastSeizure })
      } catch (e) {
        console.log('加载历史记录失败:', e)
      }
    },

    closeQuickPanel() {
      this.setData({ showQuickPanel: false, quickNoteContent: '' })
    },

    async quickMedication() {
      const record = this.data.lastMedRecord
      if (!record || this.data.submitting) return

      this.setData({ submitting: true })
      try {
        const now = new Date()
        const datetime = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`

        const medications = (record.medications || []).map(med => ({
          name: med.medication_name || med.name || '',
          dosage: med.dosage || '',
          unit: med.unit || 'mg',
          takeTime: datetime.split(' ')[1]
        }))

        await createMedicationRecord({
          datetime,
          weight: record.weight || '',
          medications,
          sideEffects: ''
        })

        wx.showToast({ title: '用药已记录', icon: 'success' })
        this.setData({ showQuickPanel: false })
      } catch (error) {
        console.error('快速记录用药失败:', error)
        wx.showToast({ title: '记录失败', icon: 'none' })
      } finally {
        this.setData({ submitting: false })
      }
    },

    async quickSeizure() {
      const record = this.data.lastSeizureRecord
      if (!record || this.data.submitting) return

      this.setData({ submitting: true })
      try {
        const now = new Date()
        const datetime = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`

        await createSeizureRecord({
          datetime,
          seizureType: record.seizure_type || '未知',
          duration: record.duration || '1',
          symptoms: record.symptoms || '',
          triggers: record.triggers || ''
        })

        wx.showToast({ title: '发作已记录', icon: 'success' })
        this.setData({ showQuickPanel: false })
      } catch (error) {
        console.error('快速记录发作失败:', error)
        wx.showToast({ title: '记录失败', icon: 'none' })
      } finally {
        this.setData({ submitting: false })
      }
    },

    onQuickCategorySelect(e) {
      this.setData({ quickNoteCategory: e.currentTarget.dataset.cat })
    },

    onQuickNoteInput(e) {
      this.setData({ quickNoteContent: e.detail })
    },

    async submitQuickNote() {
      if (!this.data.quickNoteContent.trim() || this.data.submitting) return

      this.setData({ submitting: true })
      try {
        const now = new Date()
        const datetime = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`

        await createOtherRecord({
          datetime,
          category: this.data.quickNoteCategory,
          content: this.data.quickNoteContent.trim(),
          remark: ''
        })

        wx.showToast({ title: '已记录', icon: 'success' })
        this.setData({ showQuickPanel: false, quickNoteContent: '' })
      } catch (error) {
        console.error('快速记录失败:', error)
        wx.showToast({ title: '记录失败', icon: 'none' })
      } finally {
        this.setData({ submitting: false })
      }
    },

    goToDetailRecord(e) {
      const type = e.currentTarget.dataset.type
      const urls = {
        medication: '/pages/medication-record/index',
        seizure: '/pages/seizure-record/index',
        other: '/pages/other-record/index',
        monthly: '/pages/monthly-report/index'
      }
      this.setData({ showQuickPanel: false })
      if (urls[type]) {
        wx.navigateTo({ url: urls[type] })
      }
    },

    syncCommunityVisible() {
      const app = getApp()
      const appConfig = (app && app.globalData && app.globalData.appConfig) || {}
      this.setData({ showCommunity: !!appConfig.features_enabled })
    },

    updateActiveByCurrentPage() {
      const pages = getCurrentPages()
      if (pages.length === 0) return

      const route = pages[pages.length - 1].route
      let active = 'home'

      if (route.includes('home')) {
        active = 'home'
      } else if (route.includes('my-records')) {
        active = 'records'
      } else if (route.includes('community')) {
        active = 'community'
      } else if (route.includes('user-profile')) {
        active = 'profile'
      }

      if (this.data.active !== active) {
        this.setData({ active })
      }
    },

    updateState() {
      this.updateActiveByCurrentPage()
      this.syncCommunityVisible()
    }
  }
})
