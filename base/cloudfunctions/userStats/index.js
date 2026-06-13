const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command
const $ = db.command.aggregate

const ACHIEVEMENTS = [
  { id: 'newcomer', name: '记录新手', condition: s => s.totalRecords >= 1, icon: '🌱' },
  { id: 'streak_7', name: '周周坚持', condition: s => s.streak >= 7, icon: '🔥' },
  { id: 'streak_30', name: '月度达人', condition: s => s.streak >= 30, icon: '⭐' },
  { id: 'recorder_50', name: '记录半百', condition: s => s.totalRecords >= 50, icon: '📝' },
  { id: 'recorder_100', name: '百条记录', condition: s => s.totalRecords >= 100, icon: '🏆' },
  { id: 'community_first', name: '社区初体验', condition: s => s.postCount >= 1, icon: '💬' },
  { id: 'community_10', name: '活跃家长', condition: s => s.postCount >= 10, icon: '🌟' },
  { id: 'helper', name: '热心互助', condition: s => s.commentCount >= 50, icon: '🤝' }
]

exports.main = async (event, context) => {
  const { action, userId } = event
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID

  try {
    switch (action) {
      case 'getStats':
        return await getStats(userId || openid, openid)
      case 'getTodayStats':
        return await getTodayStats(userId || openid, openid)
      default:
        return { success: false, message: '不支持的操作类型' }
    }
  } catch (error) {
    console.error('用户统计操作失败:', error)
    return { success: false, message: '操作失败: ' + error.message }
  }
}

function toDateStr(date) {
  const d = new Date(date)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

async function getAllRecordDates(userId, openid) {
  const dateSet = new Set()
  const collections = ['medication_records', 'seizure_records', 'other_records']

  for (const col of collections) {
    let skip = 0
    const limit = 100
    while (true) {
      const res = await db.collection(col)
        .where(_.or([{ user_id: userId }, { _openid: openid }]))
        .field({ record_time: true, created_at: true })
        .skip(skip)
        .limit(limit)
        .get()

      for (const rec of res.data) {
        const t = rec.record_time || rec.created_at
        if (t) dateSet.add(toDateStr(t))
      }
      if (res.data.length < limit) break
      skip += limit
    }
  }
  return dateSet
}

function calcStreak(dateSet) {
  if (dateSet.size === 0) return 0

  const today = new Date()
  const todayStr = toDateStr(today)

  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayStr = toDateStr(yesterday)

  let startDate
  if (dateSet.has(todayStr)) {
    startDate = today
  } else if (dateSet.has(yesterdayStr)) {
    startDate = yesterday
  } else {
    return 0
  }

  let streak = 0
  const d = new Date(startDate)
  while (true) {
    if (dateSet.has(toDateStr(d))) {
      streak++
      d.setDate(d.getDate() - 1)
    } else {
      break
    }
  }
  return streak
}

async function getRecordCounts(userId, openid) {
  const condition = _.or([{ user_id: userId }, { _openid: openid }])

  const [medRes, seizureRes, otherRes, reportRes] = await Promise.all([
    db.collection('medication_records').where(condition).count(),
    db.collection('seizure_records').where(condition).count(),
    db.collection('other_records').where(condition).count(),
    db.collection('monthly_reports').where(condition).count()
  ])

  return {
    medicationCount: medRes.total,
    seizureCount: seizureRes.total,
    otherCount: otherRes.total,
    monthlyReportCount: reportRes.total
  }
}

async function getCommunityStats(userId, openid) {
  const condition = _.or([{ user_id: userId }, { _openid: openid }])

  try {
    const [postRes, commentRes] = await Promise.all([
      db.collection('community_posts').where(condition).count(),
      db.collection('community_comments').where(condition).count()
    ])

    let likesReceived = 0
    try {
      const postsData = await db.collection('community_posts')
        .where(condition)
        .field({ like_count: true })
        .limit(100)
        .get()
      likesReceived = postsData.data.reduce((sum, p) => sum + (p.like_count || 0), 0)
    } catch (e) {
      console.log('计算获赞数失败:', e)
    }

    return {
      postCount: postRes.total,
      commentCount: commentRes.total,
      likesReceived
    }
  } catch (e) {
    return { postCount: 0, commentCount: 0, likesReceived: 0 }
  }
}

async function getFirstRecordDate(userId, openid) {
  const condition = _.or([{ user_id: userId }, { _openid: openid }])
  const collections = ['medication_records', 'seizure_records', 'other_records']
  let earliest = null

  for (const col of collections) {
    try {
      const res = await db.collection(col)
        .where(condition)
        .orderBy('created_at', 'asc')
        .limit(1)
        .field({ created_at: true, record_time: true })
        .get()

      if (res.data.length > 0) {
        const t = res.data[0].record_time || res.data[0].created_at
        if (t && (!earliest || new Date(t) < new Date(earliest))) {
          earliest = t
        }
      }
    } catch (e) {
      console.log(`查询 ${col} 最早记录失败:`, e)
    }
  }

  return earliest ? toDateStr(earliest) : null
}

async function getStats(userId, openid) {
  const [dateSet, counts, community, firstDate] = await Promise.all([
    getAllRecordDates(userId, openid),
    getRecordCounts(userId, openid),
    getCommunityStats(userId, openid),
    getFirstRecordDate(userId, openid)
  ])

  const totalDays = dateSet.size
  const streak = calcStreak(dateSet)
  const totalRecords = counts.medicationCount + counts.seizureCount + counts.otherCount

  const stats = {
    totalDays,
    streak,
    totalRecords,
    ...counts,
    ...community,
    firstRecordDate: firstDate
  }

  const achievements = ACHIEVEMENTS
    .filter(a => a.condition(stats))
    .map(a => ({ id: a.id, name: a.name, icon: a.icon }))

  return {
    success: true,
    data: {
      ...stats,
      achievements
    }
  }
}

async function getTodayStats(userId, openid) {
  const today = new Date()
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const todayEnd = new Date(todayStart)
  todayEnd.setDate(todayEnd.getDate() + 1)

  const condition = _.and([
    _.or([{ user_id: userId }, { _openid: openid }]),
    { created_at: _.gte(todayStart).and(_.lt(todayEnd)) }
  ])

  const [medRes, seizureRes, otherRes] = await Promise.all([
    db.collection('medication_records').where(condition).count(),
    db.collection('seizure_records').where(condition).count(),
    db.collection('other_records').where(condition).count()
  ])

  const todayCount = medRes.total + seizureRes.total + otherRes.total

  const dateSet = await getAllRecordDates(userId, openid)
  dateSet.add(toDateStr(today))
  const streak = calcStreak(dateSet)

  return {
    success: true,
    data: {
      todayCount,
      streak,
      totalDays: dateSet.size
    }
  }
}
