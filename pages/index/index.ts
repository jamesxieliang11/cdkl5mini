// pages/index/index.ts
import Toast from '@vant/weapp/toast/toast'

const app = getApp<IApp>()

Page({
  data: {
    userRole: 'patient' as 'patient' | 'staff' | 'researcher',
    noticeText: '欢迎参加2025 CDKL5罕见病诊疗进展研讨会！义诊现已开始，请提前办理医保备案。',
    todaySchedule: [
      {
        id: 1,
        time: '11:30-12:30',
        title: '病友注册、午餐交流',
        speaker: '',
        status: 'completed',
        statusText: '已结束'
      },
      {
        id: 2,
        time: '12:30-12:40',
        title: '开幕致辞',
        speaker: '李德发 深圳市儿童医院',
        status: 'ongoing',
        statusText: '进行中'
      },
      {
        id: 3,
        time: '12:40-13:10',
        title: '加奈索龙临床应用经验',
        speaker: '操德智 深圳市儿童医院',
        status: 'upcoming',
        statusText: '即将开始'
      },
      {
        id: 4,
        time: '14:10-17:30',
        title: '公益义诊',
        speaker: '多位专家',
        status: 'upcoming',
        statusText: '即将开始'
      }
    ]
  },

  onLoad() {
    // 检查用户角色
    const userRole = wx.getStorageSync('userRole')
    if (!userRole) {
      // 如果没有选择角色，跳转到角色选择页
      wx.redirectTo({
        url: '/pages/role-select/role-select'
      })
      return
    }
    
    this.setData({ userRole })
    this.loadTodaySchedule()
  },

  onShow() {
    // 每次显示页面时刷新数据
    this.loadTodaySchedule()
  },

  // 加载今日议程
  async loadTodaySchedule() {
    try {
      // 这里可以调用云函数获取实时议程数据
      // const res = await wx.cloud.callFunction({
      //   name: 'getSchedule',
      //   data: { date: new Date().toDateString() }
      // })
      // this.setData({ todaySchedule: res.result.data })
    } catch (error) {
      console.error('加载议程失败', error)
    }
  },

  // 跳转到义诊预约
  goToAppointment() {
    wx.switchTab({
      url: '/pages/appointment/appointment'
    })
  },

  // 跳转到医保备案
  goToInsurance() {
    wx.navigateTo({
      url: '/pages/tools/tools?tab=insurance'
    })
  },

  // 紧急联系
  emergencyContact() {
    wx.showActionSheet({
      itemList: ['拨打急救电话', '联系现场义工', '联系会务组'],
      success: (res) => {
        switch (res.tapIndex) {
          case 0:
            this.makePhoneCall('120')
            break
          case 1:
            this.makePhoneCall('13800138000') // 义工电话
            break
          case 2:
            this.makePhoneCall('13900139000') // 会务组电话
            break
        }
      }
    })
  },

  // 跳转到会议议程
  goToSchedule() {
    wx.switchTab({
      url: '/pages/schedule/schedule'
    })
  },

  // 跳转到院内导航
  goToNavigation() {
    wx.navigateTo({
      url: '/pages/tools/tools?tab=navigation'
    })
  },

  // 会议资料（科研人员）
  goToMaterials() {
    wx.navigateTo({
      url: '/pages/tools/tools?tab=materials'
    })
  },

  // 专家联系（科研人员）
  goToExperts() {
    wx.navigateTo({
      url: '/pages/tools/tools?tab=experts'
    })
  },

  // 学术交流（科研人员）
  goToDiscussion() {
    Toast('学术交流功能开发中...')
  },

  // 签到管理（工作人员）
  goToCheckin() {
    Toast('签到管理功能开发中...')
  },

  // 任务分配（工作人员）
  goToTasks() {
    Toast('任务分配功能开发中...')
  },

  // 后台管理（工作人员）
  goToAdmin() {
    Toast('后台管理功能开发中...')
  },

  // 联系会议方
  contactConference() {
    this.makePhoneCall('13900139000')
  },

  // 联系技术支持
  contactSupport() {
    this.makePhoneCall('13800138000')
  },

  // 紧急呼叫
  emergencyCall() {
    wx.showModal({
      title: '紧急求助',
      content: '是否拨打紧急联系电话？',
      confirmText: '立即拨打',
      success: (res) => {
        if (res.confirm) {
          this.makePhoneCall('13700137000')
        }
      }
    })
  },

  // 拨打电话
  makePhoneCall(phoneNumber: string) {
    wx.makePhoneCall({
      phoneNumber,
      fail: () => {
        Toast('拨打电话失败')
      }
    })
  }
})
