// 用户信息完善页面
const app = getApp()

Page({
  data: {
    userInfo: {},
    patientInfo: {
      babyName: '',
      babyBirthday: '',
      parentName: '',
      parentPhone: '',
      relationship: '父亲',
      medicalHistory: '',
      notes: ''
    },
    relationshipOptions: ['父亲', '母亲', '爷爷', '奶奶', '外公', '外婆', '其他'],
    relationshipIndex: 0,
    medicalFiles: [], // 上传的病历文件
    loading: false,
    isEdit: false, // 是否为编辑模式
    currentDate: '' // 当前日期，用于限制生日选择
  },

  onLoad: function (options) {
    console.log('用户信息完善页面加载')
    
    // 设置当前日期
    const today = new Date()
    const currentDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
    this.setData({
      currentDate: currentDate
    })
    
    this.loadUserProfile()
  },

  // 返回按钮点击处理
  onBack: function() {
    wx.switchTab({
      url: '/pages/home/index'
    })
  },

  // 格式化文件大小
  formatFileSize: function(size) {
    if (size > 1024 * 1024) {
      return (size / 1024 / 1024).toFixed(1) + 'MB'
    } else {
      return (size / 1024).toFixed(1) + 'KB'
    }
  },

  // 处理文件数据，添加格式化的大小
  processFileData: function(files) {
    return files.map(file => ({
      ...file,
      formattedSize: this.formatFileSize(file.size)
    }))
  },

  // 加载用户信息
  async loadUserProfile() {
    try {
      wx.showLoading({ title: '加载中...' })
      
      const res = await wx.cloud.callFunction({
        name: 'getUserProfile',
        data: {}
      })

      if (res.result && res.result.success) {
        const userData = res.result.data
        if (userData.patientInfo) {
          // 用户已有详细信息，进入编辑模式
          const processedFiles = this.processFileData(userData.medicalFiles || [])
          this.setData({
            patientInfo: userData.patientInfo,
            medicalFiles: processedFiles,
            isEdit: true,
            relationshipIndex: this.data.relationshipOptions.indexOf(userData.patientInfo.relationship) || 0
          })
        }
      }
    } catch (error) {
      console.error('加载用户信息失败:', error)
    } finally {
      wx.hideLoading()
    }
  },

  // 显示日期选择器
  showDatePicker: function() {
    // 这个方法用于触发日期选择器，实际的选择器在 wxml 中的 picker 组件
    console.log('显示日期选择器')
  },

  // 输入宝宝姓名
  onBabyNameInput: function(e) {
    const value = (e && e.detail) ? (e.detail || '') : ''
    console.log('输入宝宝姓名:', e)
    this.setData({
      'patientInfo.babyName': value
    })
  },

  // 选择宝宝生日
  onBabyBirthdayChange: function(e) {
    console.log(e)
    const value = (e && e.detail) ? (e.detail.value || '') : ''
    this.setData({
      'patientInfo.babyBirthday': value
    })
  },

  // 输入家长姓名
  onParentNameInput: function(e) {
    const value = (e && e.detail) ? (e.detail || '') : ''
    this.setData({
      'patientInfo.parentName': value
    })
  },

  // 输入家长电话
  onParentPhoneInput: function(e) {
    const value = (e && e.detail) ? (e.detail || '') : ''
    this.setData({
      'patientInfo.parentPhone': value
    })
  },

  // 选择关系
  onRelationshipChange: function(e) {
    const value = (e && e.detail) ? (e.detail.value || 0) : 0
    const index = parseInt(value)
    this.setData({
      relationshipIndex: index,
      'patientInfo.relationship': this.data.relationshipOptions[index] || this.data.relationshipOptions[0]
    })
  },

  // 输入病史
  onMedicalHistoryInput: function(e) {
    const value = (e && e.detail) ? (e.detail || '') : ''
    this.setData({
      'patientInfo.medicalHistory': value
    })
  },

  // 输入备注
  onNotesInput: function(e) {
    const value = (e && e.detail) ? (e.detail || '') : ''
    this.setData({
      'patientInfo.notes': value
    })
  },

  // 上传病历文件
  uploadMedicalFile: async function() {
    try {
      const res = await wx.chooseMessageFile({
        count: 5,
        type: 'file',
        extension: ['pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png']
      })

      if (res.tempFiles && res.tempFiles.length > 0) {
        wx.showLoading({ title: '上传中...' })
        
        const uploadPromises = res.tempFiles.map(async (file) => {
          const cloudPath = `medical-files/${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${file.name.split('.').pop()}`
          
          const uploadRes = await wx.cloud.uploadFile({
            cloudPath: cloudPath,
            filePath: file.path
          })

          return {
            fileID: uploadRes.fileID,
            name: file.name,
            size: file.size,
            formattedSize: this.formatFileSize(file.size),
            uploadTime: new Date().toISOString()
          }
        })

        const uploadedFiles = await Promise.all(uploadPromises)
        
        this.setData({
          medicalFiles: [...this.data.medicalFiles, ...uploadedFiles]
        })

        wx.showToast({
          title: '上传成功',
          icon: 'success'
        })
      }
    } catch (error) {
      console.error('上传文件失败:', error)
      wx.showToast({
        title: '上传失败',
        icon: 'error'
      })
    } finally {
      wx.hideLoading()
    }
  },

  // 删除文件
  deleteFile: function(e) {
    const index = e.currentTarget.dataset.index
    const files = this.data.medicalFiles
    
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这个文件吗？',
      success: (res) => {
        if (res.confirm) {
          files.splice(index, 1)
          this.setData({
            medicalFiles: files
          })
        }
      }
    })
  },

  // 预览文件
  previewFile: function(e) {
    const fileID = e.currentTarget.dataset.fileid
    const fileName = e.currentTarget.dataset.filename
    
    // 获取文件临时链接
    wx.cloud.getTempFileURL({
      fileList: [fileID],
      success: (res) => {
        if (res.fileList && res.fileList[0] && res.fileList[0].tempFileURL) {
          const fileUrl = res.fileList[0].tempFileURL
          const fileExt = fileName.split('.').pop().toLowerCase()
          
          if (['jpg', 'jpeg', 'png', 'gif'].includes(fileExt)) {
            // 图片文件，使用预览图片
            wx.previewImage({
              urls: [fileUrl]
            })
          } else {
            // 其他文件，下载到本地
            wx.downloadFile({
              url: fileUrl,
              success: (downloadRes) => {
                wx.openDocument({
                  filePath: downloadRes.tempFilePath,
                  success: () => {
                    console.log('打开文档成功')
                  },
                  fail: (error) => {
                    console.error('打开文档失败:', error)
                    wx.showToast({
                      title: '无法打开文件',
                      icon: 'error'
                    })
                  }
                })
              }
            })
          }
        }
      },
      fail: (error) => {
        console.error('获取文件链接失败:', error)
        wx.showToast({
          title: '文件加载失败',
          icon: 'error'
        })
      }
    })
  },

  // 表单验证
  validateForm: function() {
    const { patientInfo } = this.data
    
    if (!patientInfo.babyName || !patientInfo.babyName.trim()) {
      wx.showToast({
        title: '请输入宝宝姓名',
        icon: 'error'
      })
      return false
    }

    if (!patientInfo.babyBirthday) {
      wx.showToast({
        title: '请选择宝宝生日',
        icon: 'error'
      })
      return false
    }

    if (!patientInfo.parentName || !patientInfo.parentName.trim()) {
      wx.showToast({
        title: '请输入家长姓名',
        icon: 'error'
      })
      return false
    }

    if (!patientInfo.parentPhone || !patientInfo.parentPhone.trim()) {
      wx.showToast({
        title: '请输入联系电话',
        icon: 'error'
      })
      return false
    }

    if (!/^1[3-9]\d{9}$/.test(patientInfo.parentPhone.trim())) {
      wx.showToast({
        title: '请输入正确的手机号',
        icon: 'error'
      })
      return false
    }

    return true
  },

  // 提交表单
  submitForm: async function() {
    if (this.data.loading) return
    
    if (!this.validateForm()) return

    try {
      this.setData({ loading: true })
      wx.showLoading({ title: '保存中...' })

      // 提交时移除格式化的大小字段，只保留原始数据
      const medicalFilesToSubmit = this.data.medicalFiles.map(file => ({
        fileID: file.fileID,
        name: file.name,
        size: file.size,
        uploadTime: file.uploadTime
      }))

      const res = await wx.cloud.callFunction({
        name: 'updateUserProfile',
        data: {
          patientInfo: this.data.patientInfo,
          medicalFiles: medicalFilesToSubmit
        }
      })

      if (res.result && res.result.success) {
        wx.showToast({
          title: '保存成功',
          icon: 'success'
        })

        // 更新全局用户信息
        const app = getApp()
        if (app.globalData.userInfo) {
          app.globalData.userInfo.hasCompleteProfile = true
        }

        // 延迟跳转
        setTimeout(() => {
          wx.switchTab({
            url: '/pages/home/index'
          })
        }, 1500)
      } else {
        throw new Error(res.result?.message || '保存失败')
      }
    } catch (error) {
      console.error('保存用户信息失败:', error)
      wx.showToast({
        title: error.message || '保存失败',
        icon: 'error'
      })
    } finally {
      this.setData({ loading: false })
      wx.hideLoading()
    }
  },

  // 跳过完善信息
  skipProfile: function() {
    wx.showModal({
      title: '跳过完善信息',
      content: '跳过后可在个人中心随时完善信息，确定跳过吗？',
      success: (res) => {
        if (res.confirm) {
          wx.switchTab({
            url: '/pages/home/index'
          })
        }
      }
    })
  }
})