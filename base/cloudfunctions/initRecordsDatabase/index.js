// 初始化患者记录数据库云函数
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event, context) => {
  try {
    console.log('开始初始化患者记录数据库...')
    
    // 检查是否已经初始化过（处理集合不存在的情况）
    let existingRecords = 0
    try {
      const existingCheck = await db.collection('medication_records').count()
      existingRecords = existingCheck.total
    } catch (error) {
      // 集合不存在，继续初始化
      console.log('medication_records 集合不存在，开始创建...')
    }
    
    if (existingRecords > 0) {
      return {
        success: false,
        message: '患者记录数据库已经初始化过，无需重复初始化',
        data: {
          existingRecords: existingRecords
        }
      }
    }

    const results = {}
    
    // 1. 创建调药记录集合并插入示例数据
    console.log('创建调药记录集合...')
    const medicationRecords = [
      {
        _id: 'med_record_001',
        user_id: 'user_001',
        record_time: new Date('2025-10-10T08:00:00.000Z'),
        weight: 15.5,
        side_effects: '无明显副作用',
        medications: [
          {
            medication_name: '加奈索龙',
            dosage: 2.5,
            unit: 'mg',
            take_time: '08:00'
          },
          {
            medication_name: '维生素D3',
            dosage: 400,
            unit: 'IU',
            take_time: '08:00'
          }
        ],
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        _id: 'med_record_002',
        user_id: 'user_001',
        record_time: new Date('2025-10-09T08:00:00.000Z'),
        weight: 15.4,
        side_effects: '轻微嗜睡',
        medications: [
          {
            medication_name: '加奈索龙',
            dosage: 2.5,
            unit: 'mg',
            take_time: '08:00'
          }
        ],
        created_at: new Date(),
        updated_at: new Date()
      }
    ]

    for (const record of medicationRecords) {
      await db.collection('medication_records').add({
        data: record
      })
    }
    results.medication_records = medicationRecords.length

    // 2. 创建发作记录集合并插入示例数据
    console.log('创建发作记录集合...')
    const seizureRecords = [
      {
        _id: 'seizure_001',
        user_id: 'user_001',
        seizure_time: new Date('2025-10-09T14:30:00.000Z'),
        duration: 120,
        seizure_type: 'tonic_clonic',
        severity: 'moderate',
        triggers: '疲劳，睡眠不足',
        symptoms: '全身强直阵挛，意识丧失',
        medication_taken: false,
        rescue_medication: '',
        rescue_dosage: '',
        recovery_time: 10,
        notes: '发作后较快恢复',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        _id: 'seizure_002',
        user_id: 'user_001',
        seizure_time: new Date('2025-10-08T09:15:00.000Z'),
        duration: 45,
        seizure_type: 'focal',
        severity: 'mild',
        triggers: '情绪激动',
        symptoms: '右手抽动，意识清楚',
        medication_taken: false,
        rescue_medication: '',
        rescue_dosage: '',
        recovery_time: 3,
        notes: '局灶性发作，影响较小',
        created_at: new Date(),
        updated_at: new Date()
      }
    ]

    for (const record of seizureRecords) {
      await db.collection('seizure_records').add({
        data: record
      })
    }
    results.seizure_records = seizureRecords.length

    // 3. 创建其他记录集合并插入示例数据
    console.log('创建其他记录集合...')
    const otherRecords = [
      {
        _id: 'other_001',
        user_id: 'user_001',
        record_type: 'sleep',
        record_time: new Date('2025-10-10T07:00:00.000Z'),
        title: '夜间睡眠记录',
        content: '昨晚睡眠较好，中途醒来1次',
        sleep_hours: 9.5,
        sleep_quality: 'good',
        tags: '睡眠,夜间',
        is_important: false,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        _id: 'other_002',
        user_id: 'user_001',
        record_type: 'development',
        record_time: new Date('2025-10-09T10:00:00.000Z'),
        title: '发育评估',
        content: '今天宝宝能够独立坐立5分钟',
        development_milestone: '独立坐立',
        tags: '发育,里程碑',
        is_important: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        _id: 'other_003',
        user_id: 'user_001',
        record_type: 'hospital',
        record_time: new Date('2025-10-08T14:00:00.000Z'),
        title: '复诊记录',
        content: '定期复查，医生建议继续当前治疗方案',
        hospital_name: '北京儿童医院',
        doctor_name: '陈黎',
        diagnosis: 'CDKL5缺陷症，病情稳定',
        treatment_plan: '继续当前药物治疗，定期复查',
        tags: '复诊,治疗',
        is_important: true,
        created_at: new Date(),
        updated_at: new Date()
      }
    ]

    for (const record of otherRecords) {
      await db.collection('other_records').add({
        data: record
      })
    }
    results.other_records = otherRecords.length

    // 4. 创建记录统计集合
    console.log('创建记录统计集合...')
    const statisticsRecords = [
      {
        _id: 'stat_001',
        user_id: 'user_001',
        stat_date: '2025-10-10',
        medication_count: 1,
        seizure_count: 0,
        other_count: 1,
        total_seizure_duration: 0,
        avg_sleep_hours: 9.5,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        _id: 'stat_002',
        user_id: 'user_001',
        stat_date: '2025-10-09',
        medication_count: 1,
        seizure_count: 1,
        other_count: 1,
        total_seizure_duration: 120,
        avg_sleep_hours: 8.0,
        created_at: new Date(),
        updated_at: new Date()
      }
    ]

    for (const record of statisticsRecords) {
      await db.collection('record_statistics').add({
        data: record
      })
    }
    results.record_statistics = statisticsRecords.length

    console.log('患者记录数据库初始化完成')
    
    return {
      success: true,
      message: '患者记录数据库初始化成功',
      data: {
        ...results,
        timestamp: new Date().toISOString()
      }
    }

  } catch (error) {
    console.error('初始化患者记录数据库失败:', error)
    return {
      success: false,
      message: '患者记录数据库初始化失败',
      error: error.message,
      stack: error.stack
    }
  }
}