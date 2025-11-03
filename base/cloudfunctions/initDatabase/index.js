// 希舞之家小程序云函数 - 数据库初始化
// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV // 使用当前云环境
})

const db = cloud.database()

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  
  try {
    console.log('开始初始化数据库...')
    console.log('调用者信息:', {
      openid: wxContext.OPENID,
      appid: wxContext.APPID,
      unionid: wxContext.UNIONID,
    })

    // 检查是否已经初始化过
    const existingDepts = await db.collection('departments').count()
    if (existingDepts.total > 0) {
      return {
        success: false,
        message: '数据库已经初始化过，无需重复初始化',
        data: {
          existingRecords: existingDepts.total
        }
      }
    }

    // 1. 初始化义诊科室数据
    const deptResult = await db.collection('departments').add({
      data: [
        {
          name: '神经内科',
          description: 'CDKL5相关神经系统疾病诊疗',
          location: '1楼义诊区A',
          available_slots: 30,
          is_active: true,
          created_at: new Date()
        },
        {
          name: '脑电图检查',
          description: '脑电图检查及报告解读',
          location: '2楼检查室',
          available_slots: 20,
          is_active: true,
          created_at: new Date()
        },
        {
          name: '康复科',
          description: '儿童康复训练指导',
          location: '1楼义诊区B',
          available_slots: 25,
          is_active: true,
          created_at: new Date()
        },
        {
          name: '营养科',
          description: '营养评估及饮食指导',
          location: '1楼义诊区C',
          available_slots: 15,
          is_active: true,
          created_at: new Date()
        }
      ]
    })
    console.log('义诊科室数据初始化完成:', deptResult)

    // 2. 初始化系统配置数据
    const configResult = await db.collection('system_configs').add({
      data: [
        {
          config_key: 'emergency_phone',
          config_value: '400-123-4567',
          description: '紧急联系电话',
          created_at: new Date()
        },
        {
          config_key: 'insurance_guide_url',
          config_value: 'https://example.com/insurance-guide',
          description: '医保备案指南链接',
          created_at: new Date()
        },
        {
          config_key: 'conference_start_date',
          config_value: '2025-09-15',
          description: '大会开始日期',
          created_at: new Date()
        },
        {
          config_key: 'conference_end_date',
          config_value: '2025-09-17',
          description: '大会结束日期',
          created_at: new Date()
        },
        {
          config_key: 'queue_refresh_interval',
          config_value: '30',
          description: '排队状态刷新间隔(秒)',
          created_at: new Date()
        }
      ]
    })
    console.log('系统配置数据初始化完成:', configResult)

    // 3. 初始化专家数据
    const expertResult = await db.collection('experts').add({
      data: [
        {
          name: '陈黎',
          title: '主任医师、教授',
          hospital: '北京儿童医院',
          department: '神经内科',
          specialty: 'CDKL5缺陷症、儿童癫痫',
          clinic_time: '周二上午、周四下午',
          bio: '从事儿童神经系统疾病诊疗20余年，在CDKL5缺陷症诊断和治疗方面有丰富经验',
          avatar_url: '',
          contact_info: '',
          created_at: new Date()
        },
        {
          name: '张教授',
          title: '副主任医师',
          hospital: '上海儿童医学中心',
          department: '神经内科',
          specialty: '罕见病基因诊断',
          clinic_time: '周一全天、周三上午',
          bio: '专注于儿童罕见神经系统疾病的基因诊断和精准治疗',
          avatar_url: '',
          contact_info: '',
          created_at: new Date()
        },
        {
          name: '李医生',
          title: '主治医师',
          hospital: '广州市妇女儿童医疗中心',
          department: '康复科',
          specialty: '儿童早期干预',
          clinic_time: '周二、周四全天',
          bio: '擅长CDKL5患儿的康复训练和早期干预方案制定',
          avatar_url: '',
          contact_info: '',
          created_at: new Date()
        }
      ]
    })
    console.log('专家数据初始化完成:', expertResult)

    // 4. 初始化议程数据
    const scheduleResult = await db.collection('schedules').add({
      data: [
        {
          title: 'CDKL5缺陷症最新研究进展',
          speaker_name: '陈黎',
          start_time: new Date('2025-09-15T09:00:00'),
          end_time: new Date('2025-09-15T10:00:00'),
          location: '主会场',
          description: 'CDKL5缺陷症的最新研究成果和临床应用',
          category: 'keynote',
          is_featured: true,
          materials_url: '',
          created_at: new Date()
        },
        {
          title: '加奈索龙临床应用经验分享',
          speaker_name: '张教授',
          start_time: new Date('2025-09-15T14:30:00'),
          end_time: new Date('2025-09-15T15:30:00'),
          location: '分会场A',
          description: '加奈索龙在CDKL5患者中的临床应用案例',
          category: 'session',
          is_featured: true,
          materials_url: '',
          created_at: new Date()
        },
        {
          title: '早期诊疗规范',
          speaker_name: '李医生',
          start_time: new Date('2025-09-15T15:30:00'),
          end_time: new Date('2025-09-15T16:30:00'),
          location: '分会场B',
          description: 'CDKL5患儿早期识别和干预策略',
          category: 'session',
          is_featured: false,
          materials_url: '',
          created_at: new Date()
        },
        {
          title: '患者家庭支持网络建设',
          speaker_name: '社工团队',
          start_time: new Date('2025-09-16T10:00:00'),
          end_time: new Date('2025-09-16T11:00:00'),
          location: '主会场',
          description: '如何建立有效的患者家庭支持体系',
          category: 'workshop',
          is_featured: false,
          materials_url: '',
          created_at: new Date()
        }
      ]
    })
    console.log('议程数据初始化完成:', scheduleResult)

    // 5. 初始化资源文件数据
    const resourceResult = await db.collection('resources').add({
      data: [
        {
          name: 'CDKL5诊疗指南.pdf',
          file_url: 'https://example.com/files/cdkl5-guide.pdf',
          file_type: 'pdf',
          category: 'medical',
          description: 'CDKL5缺陷症诊疗指南',
          file_size: 2048000,
          download_count: 0,
          is_public: true,
          created_at: new Date()
        },
        {
          name: '加奈索龙用药说明.pdf',
          file_url: 'https://example.com/files/ganaxolone-guide.pdf',
          file_type: 'pdf',
          category: 'medical',
          description: '加奈索龙用药指导说明',
          file_size: 1024000,
          download_count: 0,
          is_public: true,
          created_at: new Date()
        },
        {
          name: '会议议程表.pdf',
          file_url: 'https://example.com/files/schedule.pdf',
          file_type: 'pdf',
          category: 'meeting',
          description: '大会完整议程安排',
          file_size: 512000,
          download_count: 0,
          is_public: true,
          created_at: new Date()
        },
        {
          name: '义诊预约表.doc',
          file_url: 'https://example.com/files/appointment-form.doc',
          file_type: 'doc',
          category: 'form',
          description: '义诊预约登记表',
          file_size: 256000,
          download_count: 0,
          is_public: true,
          created_at: new Date()
        }
      ]
    })
    console.log('资源文件数据初始化完成:', resourceResult)

    // 6. 初始化用户集合结构（不插入数据，仅创建集合）
    // 用户数据将通过userLogin云函数动态创建
    try {
      const userCollectionExists = await db.collection('users').count()
      console.log('用户集合检查完成，当前用户数:', userCollectionExists.total)
    } catch (error) {
      // 集合不存在时会报错，这是正常的
      console.log('用户集合将在首次登录时自动创建')
    }

    console.log('数据库初始化完成！')
    
    return {
      success: true,
      message: '数据库初始化成功',
      data: {
        departments: deptResult && deptResult.ids ? deptResult.ids.length : (deptResult && deptResult._id ? 1 : 0),
        configs: configResult && configResult.ids ? configResult.ids.length : (configResult && configResult._id ? 1 : 0),
        experts: expertResult && expertResult.ids ? expertResult.ids.length : (expertResult && expertResult._id ? 1 : 0),
        schedules: scheduleResult && scheduleResult.ids ? scheduleResult.ids.length : (scheduleResult && scheduleResult._id ? 1 : 0),
        resources: resourceResult && resourceResult.ids ? resourceResult.ids.length : (resourceResult && resourceResult._id ? 1 : 0),
        users: 0, // 用户集合在首次登录时创建
        timestamp: new Date().toISOString()
      }
    }
    
  } catch (error) {
    console.error('数据库初始化失败:', error)
    return {
      success: false,
      message: '数据库初始化失败',
      error: error.message,
      stack: error.stack
    }
  }
}