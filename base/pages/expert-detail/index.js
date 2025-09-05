const app = getApp()

Page({
  data: {
    expertInfo: {},
    relatedSchedules: []
  },

  onLoad: function (options) {
    console.log('专家详情页面加载', options)
    
    if (options.expertName) {
      this.loadExpertByName(decodeURIComponent(options.expertName))
    } else if (options.scheduleId) {
      this.loadExpertBySchedule(options.scheduleId)
    } else {
      wx.showToast({
        title: '参数错误',
        icon: 'error'
      })
      setTimeout(() => {
        wx.navigateBack()
      }, 1500)
    }
  },

  // 返回按钮点击处理
  onBack: function() {
    wx.navigateBack()
  },

  // 根据专家姓名加载信息
  loadExpertByName: function(expertName) {
    const expertInfo = this.getExpertInfo(expertName)
    if (expertInfo) {
      this.setData({
        expertInfo: expertInfo
      })
      this.loadRelatedSchedules(expertName)
    } else {
      wx.showToast({
        title: '专家信息未找到',
        icon: 'error'
      })
      setTimeout(() => {
        wx.navigateBack()
      }, 1500)
    }
  },

  // 根据议程ID加载专家信息
  loadExpertBySchedule: function(scheduleId) {
    const schedule = this.findScheduleById(parseInt(scheduleId))
    if (schedule) {
      const expertInfo = this.getExpertInfo(schedule.speaker)
      if (expertInfo) {
        this.setData({
          expertInfo: expertInfo
        })
        this.loadRelatedSchedules(schedule.speaker)
      }
    }
  },

  // 获取专家信息
  getExpertInfo: function(expertName) {
    const expertsData = {
      '陈黎教授': {
        name: '陈黎',
        title: '主任医师 / 教授',
        hospital: '深圳市儿童医院',
        department: '神经内科',
        position: '科室主任',
        specialty: 'CDKL5缺陷障碍、儿童癫痫、神经发育障碍',
        experience: 25,
        phone: '0755-83936999',
        avatar: '/icons/doctor-avatar.png',
        clinicSchedule: [
          {
            day: '周一上午',
            time: '08:00-12:00',
            location: '神经内科门诊'
          },
          {
            day: '周三下午',
            time: '14:00-17:00',
            location: '专家门诊'
          },
          {
            day: '周五上午',
            time: '08:00-12:00',
            location: '特需门诊'
          }
        ],
        researchAreas: ['CDKL5基因研究', '儿童癫痫', '神经发育障碍', '罕见病诊疗'],
        researchDescription: '长期从事儿童神经系统疾病的临床诊疗和科研工作，在CDKL5缺陷障碍的诊断和治疗方面具有丰富经验。主持多项国家级科研项目，发表SCI论文50余篇，获得省部级科技进步奖3项。',
        achievements: [
          {
            id: 1,
            title: '国家自然科学基金重点项目',
            description: 'CDKL5基因突变致病机制研究',
            year: '2023'
          },
          {
            id: 2,
            title: '中华医学科技奖二等奖',
            description: '儿童罕见病诊疗技术创新',
            year: '2022'
          },
          {
            id: 3,
            title: '深圳市科技进步奖一等奖',
            description: '神经发育障碍精准诊疗体系',
            year: '2021'
          }
        ]
      },
      '张教授': {
        name: '张明华',
        title: '主任医师 / 教授',
        hospital: '北京儿童医院',
        department: '遗传代谢科',
        position: '科室副主任',
        specialty: '遗传代谢病、基因治疗、分子诊断',
        experience: 20,
        phone: '010-59616161',
        avatar: '/icons/doctor-avatar.png',
        clinicSchedule: [
          {
            day: '周二上午',
            time: '08:00-12:00',
            location: '遗传代谢科门诊'
          },
          {
            day: '周四下午',
            time: '14:00-17:00',
            location: '专家门诊'
          }
        ],
        researchAreas: ['基因治疗', '遗传代谢病', '分子诊断', '精准医学'],
        researchDescription: '专注于遗传代谢病的基因治疗研究，在CDKL5基因突变机制方面有深入研究。参与制定多项罕见病诊疗指南，是国内基因治疗领域的知名专家。',
        achievements: [
          {
            id: 1,
            title: '国家重点研发计划项目',
            description: '罕见病基因治疗关键技术研究',
            year: '2023'
          },
          {
            id: 2,
            title: '中国医师协会优秀医师奖',
            description: '在遗传代谢病诊疗方面的突出贡献',
            year: '2022'
          }
        ]
      },
      '李主任': {
        name: '李建国',
        title: '主任医师',
        hospital: '上海交通大学医学院附属新华医院',
        department: '儿科',
        position: '儿科主任',
        specialty: '罕见病诊疗、儿童神经系统疾病',
        experience: 18,
        phone: '021-25078999',
        avatar: '/icons/doctor-avatar.png',
        clinicSchedule: [
          {
            day: '周一下午',
            time: '14:00-17:00',
            location: '儿科门诊'
          },
          {
            day: '周五上午',
            time: '08:00-12:00',
            location: '罕见病门诊'
          }
        ],
        researchAreas: ['罕见病诊疗', '儿童神经病学', '临床规范化'],
        researchDescription: '长期致力于儿童罕见病的临床诊疗工作，参与制定多项罕见病诊疗规范。在CDKL5缺陷障碍的临床管理方面有丰富经验。',
        achievements: [
          {
            id: 1,
            title: '上海市医学科技奖',
            description: '儿童罕见病诊疗规范化研究',
            year: '2022'
          }
        ]
      },
      '王治疗师': {
        name: '王丽华',
        title: '主管治疗师',
        hospital: '深圳市康复医院',
        department: '儿童康复科',
        position: '康复治疗师',
        specialty: '儿童神经康复、运动治疗、作业治疗',
        experience: 15,
        phone: '0755-25533018',
        avatar: '/icons/therapist-avatar.png',
        clinicSchedule: [
          {
            day: '周一至周五',
            time: '08:00-17:00',
            location: '儿童康复科'
          }
        ],
        researchAreas: ['儿童神经康复', '运动发育', '感觉统合'],
        researchDescription: '专业从事儿童神经康复治疗，在CDKL5患儿的康复训练方面有独特的治疗方案和丰富经验。',
        achievements: [
          {
            id: 1,
            title: '广东省康复医学会优秀治疗师',
            description: '在儿童神经康复领域的杰出贡献',
            year: '2023'
          }
        ]
      }
    }

    return expertsData[expertName] || null
  },

  // 加载相关议程
  loadRelatedSchedules: function(expertName) {
    // 这里应该从议程数据中筛选该专家的相关议程
    // 为了演示，我们模拟一些数据
    const allSchedules = [
      {
        id: 1,
        title: 'CDKL5基因突变机制研究进展',
        speaker: '张教授',
        time: '3月15日 09:30-10:30',
        location: '主会场'
      },
      {
        id: 4,
        title: '加奈索龙临床应用研究',
        speaker: '陈黎教授',
        time: '3月15日 14:00-15:00',
        location: '主会场'
      },
      {
        id: 3,
        title: '罕见病诊疗规范与临床实践',
        speaker: '李主任',
        time: '3月15日 10:45-11:45',
        location: '主会场'
      },
      {
        id: 5,
        title: '康复治疗新进展',
        speaker: '王治疗师',
        time: '3月15日 15:15-16:15',
        location: '分会场A'
      }
    ]

    const relatedSchedules = allSchedules.filter(schedule => 
      schedule.speaker === expertName
    )

    this.setData({
      relatedSchedules: relatedSchedules
    })
  },

  // 根据ID查找议程
  findScheduleById: function(id) {
    // 这里应该从全局数据或缓存中查找
    // 为了演示，我们返回一个模拟数据
    const schedules = [
      { id: 1, speaker: '张教授' },
      { id: 2, speaker: '张教授' },
      { id: 3, speaker: '李主任' },
      { id: 4, speaker: '陈黎教授' },
      { id: 5, speaker: '王治疗师' }
    ]
    
    return schedules.find(schedule => schedule.id === id)
  },

  // 拨打电话
  makeCall: function() {
    const phone = this.data.expertInfo.phone
    if (phone) {
      wx.showModal({
        title: '拨打电话',
        content: `是否拨打 ${phone}？`,
        success: (res) => {
          if (res.confirm) {
            wx.makePhoneCall({
              phoneNumber: phone,
              fail: () => {
                wx.showToast({
                  title: '拨号失败',
                  icon: 'error'
                })
              }
            })
          }
        }
      })
    }
  },

  // 发送消息
  sendMessage: function() {
    wx.showModal({
      title: '在线咨询',
      content: '该功能正在开发中，您可以通过电话联系专家或前往医院现场咨询。',
      showCancel: false
    })
  },

  // 跳转到议程详情
  goToSchedule: function(e) {
    const scheduleId = e.currentTarget.dataset.id
    wx.navigateBack()
    
    // 延迟跳转，确保页面返回完成
    setTimeout(() => {
      wx.switchTab({
        url: '/pages/schedule/index'
      })
    }, 100)
  }
})