const app = getApp()

Page({
  data: {
    activeTab: '',
    searchKeyword: '',
    filteredSchedules: [],
    favoriteCount: 0,
    
    scheduleDays: [
      {
        date: '2024-03-15',
        title: '3月15日',
        schedules: [
          {
            id: 1,
            time: '09:00-09:30',
            title: '大会开幕式',
            speaker: '大会主席',
            location: '主会场',
            description: 'CDKL5大会正式开幕，介绍大会议程和重要嘉宾',
            status: 'finished',
            isHighlight: true,
            isFavorite: false
          },
          {
            id: 2,
            time: '09:30-10:30',
            title: 'CDKL5基因突变机制研究进展',
            speaker: '张教授',
            location: '主会场',
            description: '深入探讨CDKL5基因突变的分子机制及其对神经发育的影响',
            status: 'finished',
            isHighlight: false,
            isFavorite: false
          },
          {
            id: 3,
            time: '10:45-11:45',
            title: '罕见病诊疗规范与临床实践',
            speaker: '李主任',
            location: '主会场',
            description: '分享罕见病诊疗的标准化流程和临床经验',
            status: 'finished',
            isHighlight: false,
            isFavorite: false
          },
          {
            id: 4,
            time: '14:00-15:00',
            title: '加奈索龙临床应用研究',
            speaker: '陈黎教授',
            location: '主会场',
            description: '详细介绍加奈索龙在CDKL5缺陷障碍治疗中的临床应用效果',
            status: 'ongoing',
            isHighlight: true,
            isFavorite: false
          },
          {
            id: 5,
            time: '15:15-16:15',
            title: '康复治疗新进展',
            speaker: '王治疗师',
            location: '分会场A',
            description: '介绍最新的康复治疗技术和方法',
            status: 'upcoming',
            isHighlight: false,
            isFavorite: false
          }
        ]
      },
      {
        date: '2024-03-16',
        title: '3月16日',
        schedules: [
          {
            id: 6,
            time: '09:00-10:00',
            title: '基因治疗前沿技术',
            speaker: '赵博士',
            location: '主会场',
            description: '探讨基因治疗在罕见病治疗中的最新进展',
            status: 'upcoming',
            isHighlight: true,
            isFavorite: false
          },
          {
            id: 7,
            time: '10:15-11:15',
            title: '家庭护理与心理支持',
            speaker: '刘护士长',
            location: '分会场B',
            description: '为患儿家庭提供专业的护理指导和心理支持',
            status: 'upcoming',
            isHighlight: false,
            isFavorite: false
          },
          {
            id: 8,
            time: '14:00-15:00',
            title: '药物研发与临床试验',
            speaker: '周研究员',
            location: '主会场',
            description: '介绍CDKL5相关药物的研发进展和临床试验结果',
            status: 'upcoming',
            isHighlight: false,
            isFavorite: false
          },
          {
            id: 9,
            time: '15:15-16:00',
            title: '患者家庭经验分享',
            speaker: '患者家属代表',
            location: '分会场A',
            description: '患者家庭分享治疗经验和生活感悟',
            status: 'upcoming',
            isHighlight: false,
            isFavorite: false
          },
          {
            id: 10,
            time: '16:15-17:00',
            title: '大会总结与展望',
            speaker: '大会主席',
            location: '主会场',
            description: '总结大会成果，展望未来发展方向',
            status: 'upcoming',
            isHighlight: true,
            isFavorite: false
          }
        ]
      }
    ]
  },

  onLoad: function (options) {
    console.log('议程页面加载')
    this.initData()
  },

  onShow: function () {
    this.updateFavoriteStatus()
    // 设置自定义tabbar状态
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setActive('schedule')
    }
  },

  // 初始化数据
  initData: function() {
    // 设置默认激活的标签页为今天
    const today = new Date()
    const todayStr = today.toISOString().split('T')[0]
    
    let activeTab = this.data.scheduleDays[0].date
    for (let day of this.data.scheduleDays) {
      if (day.date === todayStr) {
        activeTab = day.date
        break
      }
    }

    this.setData({
      activeTab: activeTab
    })

    this.updateFavoriteStatus()
  },

  // 更新收藏状态
  updateFavoriteStatus: function() {
    const favoriteSchedules = app.globalData.favoriteSchedules || []
    let favoriteCount = 0
    
    // 更新议程收藏状态
    const scheduleDays = this.data.scheduleDays.map(day => {
      day.schedules = day.schedules.map(schedule => {
        const isFavorite = favoriteSchedules.includes(schedule.id)
        if (isFavorite) {
          favoriteCount++
        }
        return {
          ...schedule,
          isFavorite: isFavorite
        }
      })
      return day
    })

    this.setData({
      scheduleDays: scheduleDays,
      favoriteCount: favoriteCount
    })
  },

  // 标签页切换
  onTabChange: function(e) {
    this.setData({
      activeTab: e.detail.name,
      searchKeyword: '',
      filteredSchedules: []
    })
  },

  // 搜索输入
  onSearchChange: function(e) {
    const keyword = e.detail
    this.setData({
      searchKeyword: keyword
    })
    
    if (keyword.trim()) {
      this.performSearch(keyword)
    } else {
      this.setData({
        filteredSchedules: []
      })
    }
  },

  // 执行搜索
  onSearch: function(e) {
    const keyword = e.detail
    if (keyword.trim()) {
      this.performSearch(keyword)
    }
  },

  // 搜索逻辑
  performSearch: function(keyword) {
    const allSchedules = []
    
    // 收集所有议程
    this.data.scheduleDays.forEach(day => {
      day.schedules.forEach(schedule => {
        allSchedules.push(schedule)
      })
    })

    // 过滤匹配的议程
    const filteredSchedules = allSchedules.filter(schedule => {
      return schedule.title.toLowerCase().includes(keyword.toLowerCase()) ||
             schedule.speaker.toLowerCase().includes(keyword.toLowerCase()) ||
             schedule.description.toLowerCase().includes(keyword.toLowerCase())
    })

    this.setData({
      filteredSchedules: filteredSchedules
    })
  },

  // 切换收藏状态
  toggleFavorite: function(e) {
    const scheduleId = e.currentTarget.dataset.id
    const schedule = this.findScheduleById(scheduleId)
    
    if (!schedule) return

    if (schedule.isFavorite) {
      // 取消收藏
      app.removeFavoriteSchedule(scheduleId)
      wx.showToast({
        title: '已取消收藏',
        icon: 'none',
        duration: 1000
      })
    } else {
      // 添加收藏
      app.addFavoriteSchedule(scheduleId)
      wx.showToast({
        title: '已添加收藏',
        icon: 'success',
        duration: 1000
      })
    }

    this.updateFavoriteStatus()
  },

  // 根据ID查找议程
  findScheduleById: function(id) {
    for (let day of this.data.scheduleDays) {
      for (let schedule of day.schedules) {
        if (schedule.id === id) {
          return schedule
        }
      }
    }
    return null
  },

  // 跳转到议程详情
  goToDetail: function(e) {
    const scheduleId = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/expert-detail/index?scheduleId=${scheduleId}`
    })
  },

  // 跳转到专家详情
  goToExpertDetail: function(e) {
    const expertName = e.currentTarget.dataset.expert
    wx.navigateTo({
      url: `/pages/expert-detail/index?expertName=${encodeURIComponent(expertName)}`
    })
  },

  // 显示收藏列表
  showFavorites: function() {
    if (this.data.favoriteCount === 0) {
      wx.showToast({
        title: '暂无收藏内容',
        icon: 'none'
      })
      return
    }

    const favoriteSchedules = app.globalData.favoriteSchedules || []
    const favoriteList = []
    
    this.data.scheduleDays.forEach(day => {
      day.schedules.forEach(schedule => {
        if (favoriteSchedules.includes(schedule.id)) {
          favoriteList.push(schedule)
        }
      })
    })

    // 显示收藏列表
    const titles = favoriteList.map(item => item.title)
    wx.showActionSheet({
      itemList: titles,
      success: (res) => {
        const selectedSchedule = favoriteList[res.tapIndex]
        this.goToDetail({
          currentTarget: {
            dataset: {
              id: selectedSchedule.id
            }
          }
        })
      }
    })
  }
})