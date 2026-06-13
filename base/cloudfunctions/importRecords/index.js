const cloud = require('wx-server-sdk')
const XLSX = require('xlsx')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

async function resolveCurrentUser() {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  if (!openid) throw new Error('AUTH_FAIL')
  const res = await db.collection('users').where({ openid }).field({ _id: true, adminRole: true }).limit(1).get()
  if (!res.data || !res.data.length) throw new Error('USER_NOT_FOUND')
  return { userId: res.data[0]._id, openid, adminRole: res.data[0].adminRole || '' }
}

exports.main = async (event, context) => {
  const { action } = event

  try {
    const currentUser = await resolveCurrentUser()
    const userId = currentUser.userId

    switch (action) {
      case 'parseExcel':
        return await parseExcel(event.fileID)
      case 'batchImport':
        return await batchImport(event.recordType, event.records, userId)
      default:
        return { success: false, message: '不支持的操作类型' }
    }
  } catch (error) {
    console.error('导入记录操作失败:', error)
    return { success: false, message: '操作失败: ' + error.message }
  }
}

async function parseExcel(fileID) {
  if (!fileID) {
    return { success: false, message: '缺少文件ID' }
  }

  const fileRes = await cloud.downloadFile({ fileID })
  const buffer = fileRes.fileContent

  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true })
  const sheetName = workbook.SheetNames[0]
  if (!sheetName) {
    return { success: false, message: '文件中没有工作表' }
  }

  const sheet = workbook.Sheets[sheetName]
  const rawRows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' })

  if (!rawRows || rawRows.length === 0) {
    return { success: false, message: '文件内容为空' }
  }

  let headers = rawRows[0]
  let dataRows = rawRows.slice(1)

  // 如果第一行看起来不像表头（全是数字或日期），生成合成表头
  const looksLikeHeader = headers.some(h => typeof h === 'string' && h.trim().length > 0 && isNaN(h))
  if (!looksLikeHeader) {
    headers = headers.map((_, i) => `列${String.fromCharCode(65 + i)}`)
    dataRows = rawRows
  }

  // 清理表头
  headers = headers.map(h => {
    if (h instanceof Date) return h.toISOString().split('T')[0]
    return String(h).trim()
  })

  // 过滤空行
  dataRows = dataRows.filter(row => row.some(cell => cell !== '' && cell !== null && cell !== undefined))

  // 处理日期类型的单元格
  dataRows = dataRows.map(row => row.map(cell => {
    if (cell instanceof Date) {
      const y = cell.getFullYear()
      const m = String(cell.getMonth() + 1).padStart(2, '0')
      const d = String(cell.getDate()).padStart(2, '0')
      const hr = String(cell.getHours()).padStart(2, '0')
      const mi = String(cell.getMinutes()).padStart(2, '0')
      if (hr === '00' && mi === '00') return `${y}-${m}-${d}`
      return `${y}-${m}-${d} ${hr}:${mi}`
    }
    return cell
  }))

  const MAX_ROWS = 500
  const truncated = dataRows.length > MAX_ROWS
  if (truncated) dataRows = dataRows.slice(0, MAX_ROWS)

  return {
    success: true,
    data: {
      headers,
      rows: dataRows,
      totalRows: dataRows.length,
      sampleRows: dataRows.slice(0, 5),
      truncated,
      sheetName
    }
  }
}

async function batchImport(recordType, records, userId) {
  const validTypes = ['medication', 'seizure', 'other']
  if (!validTypes.includes(recordType)) {
    return { success: false, message: '无效的记录类型' }
  }

  if (!records || !Array.isArray(records) || records.length === 0) {
    return { success: false, message: '没有要导入的记录' }
  }

  if (records.length > 100) {
    return { success: false, message: '单次导入不能超过100条记录' }
  }

  const collectionMap = {
    medication: 'medication_records',
    seizure: 'seizure_records',
    other: 'other_records'
  }
  const collection = db.collection(collectionMap[recordType])
  const now = new Date()

  let imported = 0
  let failed = 0
  const errors = []

  const buildRecord = (raw) => {
    const base = {
      user_id: userId,
      import_source: 'excel',
      created_at: now,
      updated_at: now
    }

    const recordTime = raw.datetime ? new Date(raw.datetime) : now
    if (isNaN(recordTime.getTime())) {
      throw new Error('无效的日期: ' + raw.datetime)
    }

    if (recordType === 'medication') {
      return {
        ...base,
        record_time: recordTime,
        weight: parseFloat(raw.weight) || 0,
        medications: (raw.medications || []).map(med => ({
          medication_name: med.name || '',
          dosage: parseFloat(med.dosage) || 0,
          unit: med.unit || 'mg',
          take_time: med.takeTime || ''
        })),
        side_effects: raw.sideEffects || ''
      }
    }

    if (recordType === 'seizure') {
      return {
        ...base,
        record_time: recordTime,
        seizure_type: raw.seizureType || '未知',
        duration: parseFloat(raw.duration) || 0,
        severity: raw.severity || '',
        time_of_day: raw.timeOfDay || '',
        triggers: raw.triggers || '',
        symptoms: raw.symptoms || '',
        recovery_time: raw.recoveryTime || '',
        notes: raw.notes || '',
        images: []
      }
    }

    return {
      ...base,
      record_time: recordTime,
      category: raw.category || '其他',
      content: raw.content || '',
      remark: raw.remark || '',
      images: []
    }
  }

  // 并发限制为10
  const CONCURRENCY = 10
  for (let i = 0; i < records.length; i += CONCURRENCY) {
    const batch = records.slice(i, i + CONCURRENCY)
    const results = await Promise.allSettled(
      batch.map((raw, idx) => {
        try {
          const doc = buildRecord(raw)
          return collection.add({ data: doc })
        } catch (e) {
          return Promise.reject(e)
        }
      })
    )
    results.forEach((r, idx) => {
      if (r.status === 'fulfilled') {
        imported++
      } else {
        failed++
        errors.push({ index: i + idx, error: r.reason?.message || '未知错误' })
      }
    })
  }

  return {
    success: true,
    message: `成功导入 ${imported} 条记录${failed > 0 ? `，${failed} 条失败` : ''}`,
    data: { imported, failed, errors: errors.slice(0, 10) }
  }
}
