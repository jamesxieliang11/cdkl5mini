const app = getApp()

Page({
  data: {
    formData: {
      datetime: '',           // 记录时间
      weight: '',             // 体重
      medicines: [{           // 药物列表
        takeTime: '',         // 服药时间
        name: '',             // 药品名称
        dosage: '',           // 剂量
        unit: ''              // 单位
      }],
      sideEffects: ''         // 副作用
    }
  },

  onLoad(options) {
    console.log('调药记录页面加载')
    this.initDefaultValues()
  },

  // 初始化默认值
  initDefaultValues() {
    const now = new Date()
    const formattedDatetime = `${now.getFullYear()}-${this.formatTwoDigits(now.getMonth() + 1)}-${this.formatTwoDigits(now.getDate())} ${this.formatTwoDigits(now.getHours())}:${this.formatTwoDigits(now.getMinutes())}`

    this.setData({
      'formData.datetime': formattedDatetime
    })
  },

  // 数字两位补齐
  formatTwoDigits(num) {
    return num.toString().padStart(2, '0')
  },

  // 显示日期时间选择器
  showDateTimePicker() {
    const that = this
    wx.showActionSheet({
      itemList: ['选择日期和时间'],
      success(res) {
        if (res.tapIndex === 0) {
          that.openCustomDateTimePicker()
        }
      }
    })
  },

  // 自定义日期时间选择器
  openCustomDateTimePicker() {
    const that = this
    wx.showModal({
      title: '选择日期时间',
      editable: true,
      placeholderText: 'YYYY-MM-DD HH:mm',
      success(res) {
        if (res.confirm && res.content) {
          // 简单的日期时间格式校验
          const regex = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/
          if (regex.test(res.content)) {
            that.setData({
              'formData.datetime': res.content
            })
          } else {
            wx.showToast({
              title: '格式不正确',
              icon: 'none'
            })
          }
        }
      }
    })
  },

  // 体重输入
  onWeightBlur(e) {
    const weight = parseFloat(e.detail.value)
    if (weight && weight > 150) {
      wx.showToast({
        title: '体重数值异常',
        icon: 'none'
      })
      return
    }
    this.setData({
      'formData.weight': e.detail.value
    })
  },

  // 显示服药时间选择器
  showTakeTimePicker(e) {
    const { index } = e.currentTarget.dataset
    const that = this
    
    wx.showActionSheet({
      itemList: ['早餐前', '早餐后', '午餐前', '午餐后', '晚餐前', '晚餐后', '睡前', '自定义'],
      success(res) {
        if (res.tapIndex >= 0) {
          const times = ['早餐前', '早餐后', '午餐前', '午餐后', '晚餐前', '晚餐后', '睡前']
          if (res.tapIndex < 7) {
            that.setData({
              [`formData.medicines[${index}].takeTime`]: times[res.tapIndex]
            })
          } else {
            // 自定义时间
            wx.showModal({
              title: '自定义服药时间',
              editable: true,
              placeholderText: '例：上午8:30',
              success(result) {
                if (result.confirm && result.content) {
                  that.setData({
                    [`formData.medicines[${index}].takeTime`]: result.content
                  })
                }
              }
            })
          }
        }
      }
    })
  },

  // 药品名称输入
  onMedicineNameInput(e) {
    const { index } = e.currentTarget.dataset
    this.setData({
      [`formData.medicines[${index}].name`]: e.detail
    })
  },

  // 剂量输入
  onDosageInput(e) {
    const { index } = e.currentTarget.dataset
    this.setData({
      [`formData.medicines[${index}].dosage`]: e.detail
    })
  },

  // 单位输入
  onUnitInput(e) {
    const { index } = e.currentTarget.dataset
    this.setData({
      [`formData.medicines[${index}].unit`]: e.detail
    })
  },

  // 添加药品条目
  addMedicineItem() {
    const medicines = [...this.data.formData.medicines]
    medicines.push({
      takeTime: '',
      name: '',
      dosage: '',
      unit: ''
    })
    this.setData({
      'formData.medicines': medicines
    })
  },

  // 删除药品条目
  removeMedicine(e) {
    const { index } = e.currentTarget.dataset
    const medicines = [...this.data.formData.medicines]
    
    if (medicines.length <= 1) {
      wx.showToast({
        title: '至少保留一种药品',
        icon: 'none'
      })
      return
    }

    medicines.splice(index, 1)
    this.setData({
      'formData.medicines': medicines
    })
  },

  // 副作用输入
  onSideEffectInput(e) {
    this.setData({
      'formData.sideEffects': e.detail
    })
  },

  // 返回上一页
  goBack() {
    wx.navigateBack()
  },

  // 保存记录
  saveRecord() {
    // 表单验证
    if (!this.validateForm()) {
      return
    }

    // 保存到本地存储
    this.saveToLocalStorage()
    
    wx.showToast({
      title: '保存成功',
      icon: 'success',
      duration: 1200,
      complete: () => {
        setTimeout(() => {
          wx.navigateBack()
        }, 1300)
      }
    })
  },

  // 表单验证
  validateForm() {
    const { datetime, weight, medicines } = this.data.formData

    if (!datetime) {
      wx.showToast({
        title: '请选择记录时间',
        icon: 'none'
      })
      return false
    }

    if (!weight) {
      wx.showToast({
        title: '请输入体重',
        icon: 'none'
      })
      return false
    }

    for (let i = 0; i < medicines.length; i++) {
      const medicine = medicines[i]
      if (!medicine.takeTime) {
        wx.showToast({
          title: `请选择第${i + 1}种药的服药时间`,
          icon: 'none'
        })
        return false
      }
      if (!medicine.name) {
        wx.showToast({
          title: `请输入第${i + 1}种药的药品名称`,
          icon: 'none'
        })
        return false
      }
      if (!medicine.dosage) {
        wx.showToast({
          title: `请输入第${i + 1}种药的剂量`,
          icon: 'none'
        })
        return false
      }
      if (!medicine.unit) {
        wx.showToast({
          title: `请输入第${i + 1}种药的剂量单位`,
          icon: 'none'
        })
        return false
      }
    }

    return true
  },

  // 保存到本地存储
  saveToLocalStorage() {
    const drugRecords = wx.getStorageSync('epilepsyDiary_drugRecords') || []
    const recordId = Date.now().toString()
    
    const record = {
      id: recordId,
      type: 'drug_adjustment',
      timestamp: new Date(this.data.formData.datetime.replace(' ', 'T')).getTime(),
      ...this.data.formData
    }

    drugRecords.unshift(record)
    wx.setStorageSync('epilepsyDiary_drugRecords', drugRecords)
  }
})