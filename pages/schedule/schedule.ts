// pages/schedule/schedule.ts
import Toast from '@vant/weapp/toast/toast'

Page({
  data: {
    currentDate: '2025年1月18日 星期六',
    showDetail: false,
    selectedItem: {} as any,
    scheduleList: [
      {
        id: 1,
        time: '11:30\n12:30',
        title: '病友注册、午餐交流（自助餐、合儿童餐食）、围桌讨论',
        speaker: '陈黎 深圳市儿童医院 李夏琳 香港中文大学（深圳）教育基金会',
        speakerTitle: '主持',
        location: '会议室A',
        description: '欢迎各位病友家庭参与交流，分享经验',
        status: 'completed',
        statusText: '已结束',
        isFavorite: false
      },
      {
        id: 2,
        time: '12:30\n12:40',
        title: '开幕致辞',
        speaker: '李德发',
        speakerTitle: '深圳市儿童医院',
        location: '会议室A',
        description: '大会开幕式致辞',
        status: 'ongoing',
        statusText: '进行中',
        isFavorite: true
      },
      {
        id: 3,
        time: '12:40\n13:10',
        title: '加奈索龙临床应用经验',
        speaker: '操德智',
        speakerTitle: '深圳市儿童医院',
        location: '会议室A',
        description: '分享加奈索龙在CDKL5患者中的临床应用经验和效果评估',
        status: 'upcoming',
        statusText: '即将开始',
        isFavorite: false
      },
      {
        id: 4,
        time: '13:10\n13:40',
        title: '2025 CDKL5亚洲论坛综述：会议成果',
        speaker: '叶教授',
        speakerTitle: 'XX单位',
        location: '会议室A',
        description: '总结亚洲论坛的重要成果和未来发展方向',
        status: 'upcoming',
        statusText: '即将开始',
        isFavorite: false
      },
      {
        id: 5,
        time: '13:40\n14:10',
        title: '学术报告',
        speaker: 'Helen教授',
        speakerTitle: 'XX单位',
        location: '会议室A',
        description: 'CDKL5相关学术研究最新进展',
        status: 'upcoming',
        statusText: '即将开始',
        isFavorite: false
      },
      {
        id: 6,
        time: '14:10\n17:30',
        title: '公益义诊',
        speaker: '义诊专家及友方：陈黎 深圳市儿童医院神经内科、操德智 深圳市儿童医院癫痫中心、陈彦 深圳市儿童医院脑电图、朱凤军 深圳市儿童医院癫痫外科',
        speakerTitle: '多科室专家',
        location: '义诊区',
        description: '为CDKL5患儿提供免费专业医疗咨询和检查服务',
        status: 'upcoming',
        statusText: '即将开始',
        isFavorite: true
      }
    ]
  },

  onLoad() {
    this.loadScheduleData()
  },

  // 加载议程数据
  async loadScheduleData() {
    try {
      // 这里可以调用云函数获取最新议程数据
      // const res = await wx.cloud.callFunction({
      //   name: 'getSchedule'
      // })
      // this.setData({ scheduleList: res.result.data })
      
      // 加载用户收藏状态
      this.loadFavoriteStatus()
    } catch (error) {
      console.error('加载议程失败', error)
      Toast('加载议程失败')
    }
  },

  // 加载收藏状态
  loadFavoriteStatus() {
    const favorites = wx.getStorageSync('schedule_favorites') || []
    const scheduleList = this.data.scheduleList.map(item => ({
      ...item,
      isFavorite: favorites.includes(item.id)
    }))
    this.setData({ scheduleList })
  },

  // 查看详情
  viewDetail(e: WechatMiniprogram.BaseEvent) {
    const item = e.currentTarget.dataset.item
    this.setData({
      selectedItem: item,
      showDetail: true
    })
  },

  // 关闭详情
  closeDetail() {
    this.setData({ showDetail: false })
  },

  // 查看专家信息
  viewExpert(e: WechatMiniprogram.BaseEvent) {
    const speaker = e.currentTarget.dataset.speaker
    wx.navigateTo({
      url: `/pages/expert-detail/expert-detail?name=${encodeURIComponent(speaker)}`
    })
  },

  // 切换收藏状态
  toggleFavorite(e: WechatMiniprogram.BaseEvent) {
    const id = e.currentTarget.dataset.id
    const scheduleList = this.data.scheduleList.map(item => {
      if (item.id === id) {
        item.isFavorite = !item.isFavorite
      }
      return item
    })
    
    this.setData({ scheduleList })
    
    // 保存收藏状态到本地存储
    const favorites = scheduleList.filter(item => item.isFavorite).map(item => item.id)
    wx.setStorageSync('schedule_favorites', favorites)
    
    const item = scheduleList.find(item => item.id === id)
    Toast(item?.isFavorite ? '已收藏' : '已取消收藏')
  },

  // 添加到日历
  addToCalendar() {
    const item = this.data.selectedItem
    
    // 这里可以调用系统日历API或者提供其他方式
    wx.showModal({
      title: '添加提醒',
      content: `是否为"${item.title}"设置提醒？`,
      confirmText: '设置',
      success: (res) => {
        if (res.confirm) {
          // 实现添加日历提醒的逻辑
          Toast('提醒设置成功')
          this.closeDetail()
        }
      }
    })
  }
})
