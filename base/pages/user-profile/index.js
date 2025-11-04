// 用户信息完善页面
const app = getApp()

Page({
  data: {
    userInfo: {},
    patientInfo: {
      babyName: '',
      babyBirthday: '',
      weight: '',
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

  // 输入宝宝体重
  onWeightInput: function(e) {
    const value = (e && e.detail) ? (e.detail || '') : ''
    this.setData({
      'patientInfo.weight': value
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
  uploadMedicalFile: function() {
    const that = this
    
    // 检查当前文件数量限制
    if (this.data.medicalFiles.length >= 10) {
      wx.showToast({
        title: '最多只能上传10个文件',
        icon: 'none'
      })
      return
    }

    // 显示选择文件类型的弹窗
    wx.showActionSheet({
      itemList: ['拍照', '从相册选择', '选择文档'],
      success: function(res) {
        if (res.tapIndex === 0) {
          // 拍照
          that.chooseImageFromCamera()
        } else if (res.tapIndex === 1) {
          // 从相册选择
          that.chooseImageFromAlbum()
        } else if (res.tapIndex === 2) {
          // 选择文档
          that.chooseDocument()
        }
      }
    })
  },

  // 拍照选择图片
  chooseImageFromCamera: function() {
    const that = this
    wx.chooseImage({
      count: Math.min(5, 10 - this.data.medicalFiles.length),
      sizeType: ['original', 'compressed'],
      sourceType: ['camera'],
      success: function(res) {
        that.handleSelectedFiles(res.tempFilePaths.map((path, index) => ({
          path: path,
          name: `camera_${Date.now()}_${index}.jpg`,
          size: 0 // 相机拍照无法获取准确大小，上传时会获取
        })))
      }
    })
  },

  // 从相册选择图片
  chooseImageFromAlbum: function() {
    const that = this
    wx.chooseImage({
      count: Math.min(5, 10 - this.data.medicalFiles.length),
      sizeType: ['original', 'compressed'],
      sourceType: ['album'],
      success: function(res) {
        that.handleSelectedFiles(res.tempFilePaths.map((path, index) => ({
          path: path,
          name: `album_${Date.now()}_${index}.${path.split('.').pop()}`,
          size: 0 // 从相册选择无法直接获取大小，上传时会获取
        })))
      }
    })
  },

  // 选择文档文件
  chooseDocument: function() {
    const that = this
    wx.chooseMessageFile({
      count: Math.min(5, 10 - this.data.medicalFiles.length),
      type: 'file',
      extension: ['pdf', 'doc', 'docx', 'txt'],
      success: function(res) {
        that.handleSelectedFiles(res.tempFiles.map(file => ({
          path: file.path,
          name: file.name,
          size: file.size
        })))
      },
      fail: function(error) {
        if (!error.errMsg || !error.errMsg.includes('cancel')) {
          wx.showToast({
            title: '请从聊天记录中选择文档',
            icon: 'none'
          })
        }
      }
    })
  },

  // 处理选中的文件
  handleSelectedFiles: async function(selectedFiles) {
    try {
      if (!selectedFiles || selectedFiles.length === 0) {
        return
      }

      // 检查文件大小限制（单个文件不超过20MB）
      const oversizedFiles = selectedFiles.filter(file => file.size > 20 * 1024 * 1024)
      if (oversizedFiles.length > 0) {
        wx.showModal({
          title: '文件过大',
          content: `以下文件超过20MB限制：\n${oversizedFiles.map(f => f.name).join('\n')}`,
          showCancel: false
        })
        return
      }

      wx.showLoading({ title: '上传中...' })
      
      const uploadPromises = selectedFiles.map(async (file, index) => {
        try {
          // 生成更安全的文件路径
          const timestamp = Date.now()
          const randomStr = Math.random().toString(36).substr(2, 9)
          const fileExt = file.name.split('.').pop().toLowerCase()
          const cloudPath = `medical-files/${timestamp}-${randomStr}-${index}.${fileExt}`
          
          const uploadRes = await wx.cloud.uploadFile({
            cloudPath: cloudPath,
            filePath: file.path
          })

          // 获取文件信息
          let fileSize = file.size
          if (!fileSize || fileSize === 0) {
            try {
              const fileInfo = await wx.getFileInfo({
                filePath: file.path
              })
              fileSize = fileInfo.size
            } catch (e) {
              fileSize = 0
            }
          }

          return {
            fileID: uploadRes.fileID,
            name: file.name,
            size: fileSize,
            formattedSize: this.formatFileSize(fileSize),
            uploadTime: new Date().toISOString(),
            cloudPath: cloudPath
          }
        } catch (uploadError) {
          console.error(`文件 ${file.name} 上传失败:`, uploadError)
          throw new Error(`${file.name} 上传失败`)
        }
      })

      try {
        const uploadedFiles = await Promise.all(uploadPromises)
        
        this.setData({
          medicalFiles: [...this.data.medicalFiles, ...uploadedFiles]
        })

        wx.showToast({
          title: `成功上传${uploadedFiles.length}个文件`,
          icon: 'success'
        })
      } catch (uploadError) {
        // 如果有文件上传失败，显示具体错误信息
        wx.showModal({
          title: '上传失败',
          content: uploadError.message || '部分文件上传失败，请重试',
          showCancel: false
        })
      }
    } catch (error) {
      console.error('处理文件失败:', error)
      wx.showToast({
        title: '文件处理失败',
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
    const fileToDelete = files[index]
    
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这个文件吗？删除后无法恢复。',
      success: async (res) => {
        if (res.confirm) {
          try {
            wx.showLoading({ title: '删除中...' })
            
            // 从云存储中删除文件
            if (fileToDelete.fileID) {
              await wx.cloud.deleteFile({
                fileList: [fileToDelete.fileID]
              })
            }
            
            // 从页面数据中移除
            files.splice(index, 1)
            this.setData({
              medicalFiles: files
            })
            
            wx.showToast({
              title: '删除成功',
              icon: 'success'
            })
          } catch (error) {
            console.error('删除文件失败:', error)
            wx.showToast({
              title: '删除失败',
              icon: 'error'
            })
          } finally {
            wx.hideLoading()
          }
        }
      }
    })
  },

  // 预览文件
  previewFile: function(e) {
    const fileID = e.currentTarget.dataset.fileid
    const fileName = e.currentTarget.dataset.filename
    
    if (!fileID) {
      wx.showToast({
        title: '文件信息错误',
        icon: 'error'
      })
      return
    }
    
    wx.showLoading({ title: '加载中...' })
    
    // 获取文件临时链接
    wx.cloud.getTempFileURL({
      fileList: [fileID],
      success: (res) => {
        wx.hideLoading()
        
        if (res.fileList && res.fileList[0]) {
          const fileInfo = res.fileList[0]
          
          if (fileInfo.status === 0 && fileInfo.tempFileURL) {
            const fileUrl = fileInfo.tempFileURL
            const fileExt = fileName.split('.').pop().toLowerCase()
            
            if (['jpg', 'jpeg', 'png', 'gif', 'bmp'].includes(fileExt)) {
              // 图片文件，使用预览图片
              wx.previewImage({
                urls: [fileUrl],
                current: fileUrl
              })
            } else {
              // 其他文件，下载到本地预览
              wx.showLoading({ title: '下载中...' })
              wx.downloadFile({
                url: fileUrl,
                success: (downloadRes) => {
                  wx.hideLoading()
                  if (downloadRes.statusCode === 200) {
                    wx.openDocument({
                      filePath: downloadRes.tempFilePath,
                      showMenu: true,
                      success: () => {
                        console.log('文档打开成功')
                      },
                      fail: (error) => {
                        console.error('文档打开失败:', error)
                        wx.showModal({
                          title: '无法预览',
                          content: '当前设备不支持预览此类型文件，建议在电脑上查看',
                          showCancel: false
                        })
                      }
                    })
                  } else {
                    wx.showToast({
                      title: '下载失败',
                      icon: 'error'
                    })
                  }
                },
                fail: (error) => {
                  wx.hideLoading()
                  console.error('文件下载失败:', error)
                  wx.showToast({
                    title: '下载失败',
                    icon: 'error'
                  })
                }
              })
            }
          } else {
            wx.showModal({
              title: '文件不存在',
              content: '文件可能已被删除或链接已过期',
              showCancel: false
            })
          }
        } else {
          wx.showToast({
            title: '获取文件链接失败',
            icon: 'error'
          })
        }
      },
      fail: (error) => {
        wx.hideLoading()
        console.error('获取文件临时链接失败:', error)
        wx.showToast({
          title: '获取文件链接失败',
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

    if (patientInfo.weight && patientInfo.weight.trim()) {
      const weight = parseFloat(patientInfo.weight.trim())
      if (isNaN(weight) || weight <= 0 || weight > 200) {
        wx.showToast({
          title: '请输入正确的体重(0-200kg)',
          icon: 'error'
        })
        return false
      }
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