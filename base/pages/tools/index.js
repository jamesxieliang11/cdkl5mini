// pages/tools/index.js
const app = getApp()

Page({
  data: {
    // 页面状态
    loading: false,
    userRole: '',
    
    // 功能卡片数据
    toolCards: [
      {
        id: 'insurance',
        title: '医保备案',
        subtitle: '异地就医备案申请',
        icon: 'shield-o',
        color: '#1989fa',
        bgColor: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        description: '快速办理异地医保备案，享受便民服务'
      },
      {
        id: 'experts',
        title: '专家通讯录',
        subtitle: '权威专家信息',
        icon: 'contact',
        color: '#07c160',
        bgColor: 'linear-gradient(135deg, #52c41a 0%, #389e0d 100%)',
        description: '查看专家信息，一键联系咨询'
      },
      {
        id: 'materials',
        title: '会议资料',
        subtitle: '学术资料下载',
        icon: 'description',
        color: '#ff6b35',
        bgColor: 'linear-gradient(135deg, #ff9500 0%, #ff6b35 100%)',
        description: '获取最新诊疗指南和学术资料'
      }
    ],

    // 医保备案相关数据
    insuranceForm: {
      patientName: '',
      idCard: '',
      phone: '',
      hospitalName: '深圳市儿童医院',
      department: '神经内科',
      doctorName: '',
      visitDate: '',
      estimatedCost: '',
      reason: 'CDKL5罕见病义诊治疗'
    },
    
    showDatePicker: false,
    
    // 备案状态
    insuranceStatus: {
      isSubmitted: false,
      status: '', // pending, approved, rejected
      submitTime: '',
      approvalTime: '',
      recordNumber: '',
      message: ''
    },

    // 专家通讯录数据
    experts: [
      {
        id: 1,
        name: '陈黎教授',
        title: '神经内科主任医师',
        hospital: '深圳市儿童医院',
        specialty: 'CDKL5缺陷障碍、罕见病诊疗',
        experience: '20年临床经验',
        phone: '0755-83936999-8001',
        email: 'chenli@szch.org.cn',
        avatar: '/images/expert1.jpg',
        rating: 4.9,
        consultations: 1200
      },
      {
        id: 2,
        name: '张教授',
        title: '遗传学专家',
        hospital: '深圳市儿童医院',
        specialty: '基因检测、遗传咨询',
        experience: '15年临床经验',
        phone: '0755-83936999-8002',
        email: 'zhang@szch.org.cn',
        avatar: '/images/expert2.jpg',
        rating: 4.8,
        consultations: 980
      },
      {
        id: 3,
        name: '李主任',
        title: '康复科主任',
        hospital: '深圳市儿童医院',
        specialty: '儿童康复、物理治疗',
        experience: '18年临床经验',
        phone: '0755-83936999-8003',
        email: 'li@szch.org.cn',
        avatar: '/images/expert3.jpg',
        rating: 4.7,
        consultations: 850
      }
    ],

    // 会议资料数据
    materials: [
      {
        id: 1,
        title: 'CDKL5缺陷障碍诊疗指南',
        type: 'PDF',
        size: '2.5MB',
        downloadUrl: '/materials/cdkl5-guide.pdf',
        description: '最新的CDKL5缺陷障碍诊疗标准和流程',
        category: '诊疗指南',
        publishDate: '2024-01-15',
        downloads: 1580,
        featured: true
      },
      {
        id: 2,
        title: '加奈索龙用药指导',
        type: 'PDF',
        size: '1.8MB',
        downloadUrl: '/materials/ganaxolone-guide.pdf',
        description: '加奈索龙的用法用量和注意事项',
        category: '用药指南',
        publishDate: '2024-02-20',
        downloads: 1200,
        featured: true
      },
      {
        id: 3,
        title: '家庭护理手册',
        type: 'PDF',
        size: '3.2MB',
        downloadUrl: '/materials/family-care.pdf',
        description: 'CDKL5患儿的日常护理和康复指导',
        category: '护理指南',
        publishDate: '2024-03-10',
        downloads: 2100,
        featured: false
      },
      {
        id: 4,
        title: '营养膳食建议',
        type: 'PDF',
        size: '1.5MB',
        downloadUrl: '/materials/nutrition-guide.pdf',
        description: 'CDKL5患儿的营养搭配和膳食建议',
        category: '营养指南',
        publishDate: '2024-03-25',
        downloads: 890,
        featured: false
      }
    ],

    // 搜索和筛选
    searchKeyword: '',
    selectedCategory: 'all'
  },

  onLoad(options) {
    this.initUserInfo()
    this.loadInsuranceStatus()
    this.loadPageData()
  },

  onShow() {
    this.updateTabBarState()
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

  // 初始化用户信息
  initUserInfo() {
    const userRole = app.globalData.userRole || wx.getStorageSync('userRole')
    const userInfo = app.globalData.userInfo || {}
    
    this.setData({
      userRole: userRole
    })

    // 如果是病友家庭，预填一些信息
    if (userRole === 'patient' && userInfo) {
      this.setData({
        'insuranceForm.patientName': userInfo.babyName || '',
        'insuranceForm.phone': userInfo.parentPhone || ''
      })
    }
  },

  // 加载页面数据
  async loadPageData() {
    try {
      this.setData({ loading: true })
      
      // 模拟加载数据
      await new Promise(resolve => setTimeout(resolve, 800))
      
      this.setData({ loading: false })
    } catch (error) {
      console.error('加载页面数据失败:', error)
      this.setData({ loading: false })
    }
  },

  // 加载医保备案状态
  async loadInsuranceStatus() {
    try {
      const savedStatus = wx.getStorageSync('insuranceStatus')
      if (savedStatus) {
        this.setData({
          insuranceStatus: savedStatus
        })
      }
    } catch (error) {
      console.error('加载医保备案状态失败:', error)
    }
  },

  // 功能卡片点击
  onToolCardTap(e) {
    const { id } = e.currentTarget.dataset
    
    switch (id) {
      case 'insurance':
        this.navigateToInsurance()
        break
      case 'experts':
        this.navigateToExperts()
        break
      case 'materials':
        this.navigateToMaterials()
        break
    }
  },

  // 跳转到医保备案
  navigateToInsurance() {
    wx.navigateTo({
      url: '/pages/insurance/index'
    })
  },

  // 跳转到专家通讯录
  navigateToExperts() {
    wx.navigateTo({
      url: '/pages/experts/index'
    })
  },

  // 跳转到会议资料
  navigateToMaterials() {
    wx.navigateTo({
      url: '/pages/materials/index'
    })
  },

  // 快速操作 - 医保备案
  quickInsuranceAction() {
    if (this.data.insuranceStatus.isSubmitted) {
      // 查看备案状态
      this.viewInsuranceStatus()
    } else {
      // 开始备案
      this.navigateToInsurance()
    }
  },

  // 查看备案状态
  viewInsuranceStatus() {
    const { insuranceStatus } = this.data
    let statusText = ''
    let statusColor = ''
    
    switch (insuranceStatus.status) {
      case 'pending':
        statusText = '审核中'
        statusColor = '#1989fa'
        break
      case 'approved':
        statusText = '已通过'
        statusColor = '#07c160'
        break
      case 'rejected':
        statusText = '已拒绝'
        statusColor = '#ee0a24'
        break
    }
    
    wx.showModal({
      title: '备案状态',
      content: `备案号：${insuranceStatus.recordNumber}\n状态：${statusText}\n提交时间：${insuranceStatus.submitTime}\n\n${insuranceStatus.message}`,
      showCancel: false,
      confirmText: '知道了',
      confirmColor: statusColor
    })
  },

  // 联系专家
  contactExpert(e) {
    const { expert } = e.currentTarget.dataset
    
    wx.showActionSheet({
      itemList: ['拨打电话', '发送邮件', '查看详情'],
      success: (res) => {
        switch (res.tapIndex) {
          case 0:
            this.callExpert(expert.phone)
            break
          case 1:
            this.emailExpert(expert.email)
            break
          case 2:
            this.viewExpertDetail(expert)
            break
        }
      }
    })
  },

  // 拨打专家电话
  callExpert(phone) {
    wx.makePhoneCall({
      phoneNumber: phone,
      fail: () => {
        wx.showToast({
          title: '拨号失败',
          icon: 'error'
        })
      }
    })
  },

  // 发送邮件给专家
  emailExpert(email) {
    wx.setClipboardData({
      data: email,
      success: () => {
        wx.showToast({
          title: '邮箱已复制',
          icon: 'success'
        })
      }
    })
  },

  // 查看专家详情
  viewExpertDetail(expert) {
    wx.navigateTo({
      url: `/pages/expert-detail/index?expertId=${expert.id}`
    })
  },

  // 下载资料
  downloadMaterial(e) {
    const { material } = e.currentTarget.dataset
    
    wx.showModal({
      title: '下载资料',
      content: `确定要下载《${material.title}》吗？\n文件大小：${material.size}`,
      success: (res) => {
        if (res.confirm) {
          this.performDownload(material)
        }
      }
    })
  },

  // 执行下载
  async performDownload(material) {
    try {
      wx.showLoading({ title: '下载中...' })
      
      // 模拟下载过程
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // 更新下载次数
      const materials = this.data.materials.map(item => {
        if (item.id === material.id) {
          return { ...item, downloads: item.downloads + 1 }
        }
        return item
      })
      
      this.setData({ materials })
      
      wx.showToast({
        title: '下载完成',
        icon: 'success'
      })
      
    } catch (error) {
      console.error('下载失败:', error)
      wx.showToast({
        title: '下载失败',
        icon: 'error'
      })
    } finally {
      wx.hideLoading()
    }
  },

  // 搜索资料
  onSearchInput(e) {
    const keyword = e.detail.value
    this.setData({
      searchKeyword: keyword
    })
    this.filterMaterials()
  },

  // 筛选分类
  onCategoryChange(e) {
    const category = e.detail.value
    this.setData({
      selectedCategory: category
    })
    this.filterMaterials()
  },

  // 筛选资料
  filterMaterials() {
    // 这里可以实现实际的筛选逻辑
    console.log('筛选条件:', {
      keyword: this.data.searchKeyword,
      category: this.data.selectedCategory
    })
  },

  // 页面分享
  onShareAppMessage() {
    return {
      title: 'CDKL5大会 - 工具中心',
      path: '/pages/tools/index',
      imageUrl: '/images/share-tools.jpg'
    }
  },

  // 下拉刷新
  onPullDownRefresh() {
    this.loadPageData().then(() => {
      wx.stopPullDownRefresh()
    })
  }
})