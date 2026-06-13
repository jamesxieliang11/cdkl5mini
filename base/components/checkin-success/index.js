const RECORD_TYPE_LABELS = {
  medication: '用药记录',
  seizure: '发作记录',
  other: '记录'
}

Component({
  properties: {
    show: { type: Boolean, value: false },
    recordType: { type: String, value: 'medication' },
    streak: { type: Number, value: 0 },
    todayCount: { type: Number, value: 0 },
    totalDays: { type: Number, value: 0 }
  },

  computed: {},

  observers: {
    'recordType': function(val) {
      this.setData({ recordTypeLabel: RECORD_TYPE_LABELS[val] || '记录' })
    }
  },

  data: {
    recordTypeLabel: '用药记录'
  },

  methods: {
    noop() {},

    onClose() {
      this.triggerEvent('close')
    },

    onShare() {
      this.triggerEvent('share')
    }
  }
})
