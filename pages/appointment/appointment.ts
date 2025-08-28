// pages/appointment/appointment.ts
import Toast from '@vant/weapp/toast/toast'

Page({
  data: {
    selectedDepartment: '',
    submitting: false,
    showGender: false,
    genderColumns: ['男', '女'],
    patientInfo: {
      name: '',
      age: '',
      gender: '',
      phone: '',
      symptoms: ''
    },
    departments: [
      {
        id: 'neurology',
        name: '神经内科',
        doctor: '陈黎医生',
        icon: 'user-o',
        queueCount: 8,
        waitTime: 45
      },
      {
        id: 'eeg',
        name: '脑电图科',
        doctor: '陈彦医生',
        icon: 'chart-trending-o',
        queueCount: 5,
        waitTime: 30
      },
      {
        id: 'epilepsy',
        name: '癫痫中心',
        doctor: '操德智医生',
        icon: 'fire-o',
        queueCount: 12,
        waitTime: 60
      },
      {
        id: 'surgery',
        name: '癫痫外科',
        doctor: '朱凤军医生',
        icon: 'logistics',
        queueCount: 3,
        waitTime: 20
      }
    ],
    appointments: []
  },

  computed: {
    canSubmit(): boolean {
      const { name, age, gender, phone } = this.data.patientInfo
      return !!(name && age && gender && phone && this.data.selectedDepartment)
    }
  },

  onLoad() {
    this.loadMyAppointments()
  },

  onShow() {
    this.loadMyAppointments()
    this.updateQueueInfo()
  },

  // 选择科室
  selectDepartment(e: WechatMiniprogram.BaseEvent) {
    const id = e.currentTarget.dataset.id
    this.setData({ selectedDepartment: id })
  },

  // 输入框事件
  onNameChange(e: WechatMiniprogram.Input) {
    this.setData({
      'patientInfo.name': e.detail.value
    })
  },

  onAgeChange(e: WechatMiniprogram.Input) {
    this.setData({
      'patientInfo.age': e.detail.value
    })
  },

  onPhoneChange(e: WechatMiniprogram.Input) {
    this.setData({
      'patientInfo.phone': e.detail.value
    })
  },

  onSymptomsChange(e: WechatMiniprogram.Input) {
    this.setData({
      'patientInfo.symptoms': e.detail.value
    })
  },

  // 性别选择
  showGenderPicker() {
    this.setData({ showGender: true })
  },

  hideGenderPicker() {
    this.setData({ showGender: false })
  },

  onGenderConfirm(e: WechatMiniprogram.BaseEvent) {
    const gender = e.detail.value
    this.setData({
      'patientInfo.gender': gender,
      showGender: false
    })
  },

  // 提交预约
  async submitAppointment() {
    const { patientInfo, selectedDepartment } = this.data
    
    // 验证必填字段
    if (!patientInfo.name) {
      Toast('请输入患儿姓名')
      return
    }
    if (!patientInfo.age) {
      Toast('请输入患儿年龄')
      return
    }
    if (!patientInfo.gender) {
      Toast('请选择患儿性别')
      return
    }
    if (!patientInfo.phone) {
      Toast('请输入联系电话')
      return
    }

    this.setData({ submitting: true })

    try {
      // 调用云函数提交预约
      const res = await wx.cloud.callFunction({
        name: 'submitAppointment',
        data: {
          departmentId: selectedDepartment,
          patientInfo,
          appointmentTime: new Date().toISOString()
        }
      })

      if (res.result.success) {
        Toast('预约成功！')
        
        // 清空表单
        this.setData({
          selectedDepartment: '',
          patientInfo: {
            name: '',
            age: '',
            gender: '',
            phone: '',
            symptoms: ''
          }
        })

        // 刷新预约列表
        this.loadMyAppointments()

        // 跳转到排队状态页
        setTimeout(() => {
          wx.navigateTo({
            url: `/pages/queue-status/queue-status?appointmentId=${res.result.appointmentId}`
          })
        }, 1500)
      } else {
        Toast(res.result.message || '预约失败')
      }
    } catch (error) {
      console.error('提交预约失败', error)
      Toast('预约失败，请重试')
    } finally {
      this.setData({ submitting: false })
    }
  },

  // 加载我的预约
  async loadMyAppointments() {
    try {
      const res = await wx.cloud.callFunction({
        name: 'getMyAppointments'
      })

      if (res.result.success) {
        this.setData({ appointments: res.result.data })
      }
    } catch (error) {
      console.error('加载预约失败', error)
    }
  },

  // 更新排队信息
  async updateQueueInfo() {
    try {
      const res = await wx.cloud.callFunction({
        name: 'getQueueInfo'
      })

      if (res.result.success) {
        const departments = this.data.departments.map(dept => {
          const queueInfo = res.result.data.find((item: any) => item.departmentId === dept.id)
          if (queueInfo) {
            return {
              ...dept,
              queueCount: queueInfo.queueCount,
              waitTime: queueInfo.waitTime
            }
          }
          return dept
        })
        this.setData({ departments })
      }
    } catch (error) {
      console.error('更新排队信息失败', error)
    }
  },

  // 查看排队状态
  checkQueue(e: WechatMiniprogram.BaseEvent) {
    const appointmentId = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/queue-status/queue-status?appointmentId=${appointmentId}`
    })
  },

  // 取消预约
  async cancelAppointment(e: WechatMiniprogram.BaseEvent) {
    const appointmentId = e.currentTarget.dataset.id
    
    wx.showModal({
      title: '确认取消',
      content: '确定要取消这个预约吗？',
      success: async (res) => {
        if (res.confirm) {
          try {
            const result = await wx.cloud.callFunction({
              name: 'cancelAppointment',
              data: { appointmentId }
            })

            if (result.result.success) {
              Toast('预约已取消')
              this.loadMyAppointments()
            } else {
              Toast(result.result.message || '取消失败')
            }
          } catch (error) {
            console.error('取消预约失败', error)
            Toast('取消失败，请重试')
          }
        }
      }
    })
  }
})
