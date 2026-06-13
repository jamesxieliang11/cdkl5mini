const { parseExcelFile, batchImportRecords } = require('../../utils/database.js')

const FIELD_LABELS = {
  medication: {
    datetime: '记录时间',
    weight: '体重(kg)',
    medicationName: '药物名称',
    dosage: '剂量',
    unit: '单位',
    takeTime: '服药时间',
    sideEffects: '副作用'
  },
  seizure: {
    datetime: '记录时间',
    seizureType: '发作类型',
    duration: '持续时间(分)',
    severity: '严重程度',
    timeOfDay: '发作时段',
    triggers: '诱发因素',
    symptoms: '症状描述',
    recoveryTime: '恢复时间',
    notes: '备注'
  },
  other: {
    datetime: '记录时间',
    category: '分类',
    content: '内容',
    remark: '备注'
  }
}

const IMPORT_SYSTEM_PROMPT = `你是一个专业的数据分析助手，专注于医疗健康记录的数据映射。分析 Excel 表格的列头和样本数据，判断记录类型并映射字段。

系统支持三种记录类型：

1. 调药记录（medication）：
   - datetime: 记录时间（必填）
   - weight: 体重(kg)
   - medicationName: 药物名称（必填）
   - dosage: 剂量（必填）
   - unit: 单位（如 mg, ml）
   - takeTime: 服药时间（如早餐前、早餐后）
   - sideEffects: 副作用

2. 发作记录（seizure）：
   - datetime: 记录/发作时间（必填）
   - seizureType: 发作类型（必填，如强直阵挛、失神、肌阵挛等）
   - duration: 持续时间（分钟）（必填）
   - severity: 严重程度
   - timeOfDay: 发作时段
   - triggers: 诱发因素
   - symptoms: 症状描述
   - recoveryTime: 恢复时间
   - notes: 备注

3. 其他记录（other）：
   - datetime: 记录时间（必填）
   - category: 分类（必填）
   - content: 内容（必填）
   - remark: 备注

请仅返回如下格式的 JSON，不要返回任何其他文本：
{
  "record_type": "medication 或 seizure 或 other",
  "confidence": "high 或 medium 或 low",
  "mapping": {
    "Excel列名": "目标字段名",
    ...
  },
  "medication_mode": "single_row 或 multi_column（仅 medication 类型需要）",
  "notes": "对映射的说明"
}`

Page({
  data: {
    currentStep: 0,
    selectedFile: null,
    fileID: '',
    uploading: false,

    analyzing: false,
    aiProgress: '',

    headers: [],
    allRows: [],
    sampleRows: [],
    totalRows: 0,
    truncated: false,

    recordType: '',
    confidence: '',
    aiNote: '',
    medicationMode: '',
    columnMapping: {},
    mappingList: [],
    previewHeaders: [],
    previewRows: [],

    showMappingSheet: false,
    editingColumnIndex: -1,
    editingColumnName: '',
    mappingFieldOptions: [],

    importing: false,
    importProgress: 0,
    importTotal: 0,
    importedCount: 0,
    importResult: null
  },

  goBack() {
    wx.navigateBack()
  },

  chooseFile() {
    wx.chooseMessageFile({
      count: 1,
      type: 'file',
      extension: ['xlsx', 'xls', 'csv'],
      success: (res) => {
        const file = res.tempFiles[0]
        this.setData({
          selectedFile: {
            name: file.name,
            size: file.size < 1024 ? file.size + ' B'
              : file.size < 1048576 ? (file.size / 1024).toFixed(1) + ' KB'
              : (file.size / 1048576).toFixed(1) + ' MB',
            path: file.path
          }
        })
      }
    })
  },

  async startAnalysis() {
    if (!this.data.selectedFile || this.data.uploading) return

    this.setData({ uploading: true })
    try {
      wx.showLoading({ title: '上传文件中...' })
      const timestamp = Date.now()
      const randomStr = Math.random().toString(36).substr(2, 6)
      const ext = this.data.selectedFile.name.split('.').pop()
      const cloudPath = `imports/${timestamp}-${randomStr}.${ext}`

      const uploadRes = await wx.cloud.uploadFile({
        cloudPath,
        filePath: this.data.selectedFile.path
      })

      wx.showLoading({ title: '解析表格中...' })
      const parseRes = await parseExcelFile(uploadRes.fileID)
      wx.hideLoading()

      this.setData({
        fileID: uploadRes.fileID,
        headers: parseRes.data.headers,
        allRows: parseRes.data.rows,
        sampleRows: parseRes.data.sampleRows,
        totalRows: parseRes.data.totalRows,
        truncated: parseRes.data.truncated || false,
        uploading: false
      })

      this.analyzeWithAI()
    } catch (error) {
      wx.hideLoading()
      this.setData({ uploading: false })
      wx.showToast({ title: error.message || '文件解析失败', icon: 'none' })
    }
  },

  async analyzeWithAI() {
    this.setData({ currentStep: 1, analyzing: true, aiProgress: '' })

    const { headers, sampleRows } = this.data
    const userMessage = `Excel 列头: ${JSON.stringify(headers)}\n\n样本数据（前${sampleRows.length}行）:\n${
      sampleRows.map((row, i) => `第${i + 1}行: ${JSON.stringify(row)}`).join('\n')
    }`

    try {
      const model = wx.cloud.extend.AI.createModel('hunyuan-exp')
      const response = await model.streamText({
        data: {
          model: 'hunyuan-exp',
          messages: [
            { role: 'system', content: IMPORT_SYSTEM_PROMPT },
            { role: 'user', content: userMessage }
          ]
        }
      })

      let fullText = ''
      for await (let chunk of response.textStream) {
        fullText += chunk
        this.setData({ aiProgress: fullText })
      }

      const jsonMatch = fullText.match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error('AI 未返回有效结果')

      const result = JSON.parse(jsonMatch[0])
      this.applyAIMapping(result)
    } catch (error) {
      console.error('AI 分析失败:', error)
      this.setData({ currentStep: 2, analyzing: false })
      wx.showToast({ title: 'AI 分析失败，请手动选择', icon: 'none', duration: 2000 })
    }
  },

  applyAIMapping(result) {
    const recordType = result.record_type || 'other'
    const mapping = result.mapping || {}
    const confidence = result.confidence || 'low'
    const aiNote = result.notes || ''
    const medicationMode = result.medication_mode || ''

    this.setData({
      currentStep: 2,
      analyzing: false,
      recordType,
      confidence,
      aiNote,
      medicationMode,
      columnMapping: mapping
    })

    this.buildMappingList()
    this.buildPreview()
  },

  buildMappingList() {
    const { headers, sampleRows, columnMapping, recordType } = this.data
    const labels = FIELD_LABELS[recordType] || {}

    const mappingList = headers.map((col, i) => {
      const targetField = columnMapping[col] || ''
      return {
        excelCol: col,
        sample: sampleRows[0] ? String(sampleRows[0][i] || '') : '',
        targetField,
        targetLabel: labels[targetField] || (targetField ? targetField : '')
      }
    })

    this.setData({ mappingList })
  },

  buildPreview() {
    const { sampleRows, mappingList } = this.data
    const mappedCols = mappingList.filter(m => m.targetField)
    const previewHeaders = mappedCols.map(m => m.targetLabel || m.targetField)
    const colIndices = mappedCols.map(m => this.data.headers.indexOf(m.excelCol))

    const previewRows = sampleRows.map(row =>
      colIndices.map(i => String(row[i] !== undefined ? row[i] : ''))
    )

    this.setData({ previewHeaders, previewRows })
  },

  selectRecordType(e) {
    const type = e.currentTarget.dataset.type
    if (type === this.data.recordType) return

    const { columnMapping } = this.data
    this.setData({
      recordType: type,
      columnMapping: {},
      confidence: '',
      aiNote: '',
      medicationMode: type === 'medication' ? 'single_row' : ''
    })

    this.buildMappingList()
    this.buildPreview()
  },

  editMapping(e) {
    const index = e.currentTarget.dataset.index
    const item = this.data.mappingList[index]
    const { recordType } = this.data
    const labels = FIELD_LABELS[recordType] || {}

    const options = [
      { name: '未映射（跳过）', value: '' },
      ...Object.entries(labels).map(([field, label]) => ({
        name: label,
        value: field
      }))
    ]

    this.setData({
      showMappingSheet: true,
      editingColumnIndex: index,
      editingColumnName: item.excelCol,
      mappingFieldOptions: options
    })
  },

  onMappingSelect(e) {
    const { editingColumnIndex } = this.data
    const selectedValue = e.detail.value
    const item = this.data.mappingList[editingColumnIndex]

    const newMapping = { ...this.data.columnMapping }
    if (selectedValue) {
      newMapping[item.excelCol] = selectedValue
    } else {
      delete newMapping[item.excelCol]
    }

    this.setData({
      columnMapping: newMapping,
      showMappingSheet: false
    })

    this.buildMappingList()
    this.buildPreview()
  },

  closeMappingSheet() {
    this.setData({ showMappingSheet: false })
  },

  reAnalyze() {
    this.analyzeWithAI()
  },

  async startImport() {
    const { recordType, allRows, columnMapping, headers, medicationMode } = this.data
    if (!recordType) return

    const records = this.transformRows(allRows, columnMapping, headers, recordType, medicationMode)
    if (records.length === 0) {
      wx.showToast({ title: '没有可导入的有效数据', icon: 'none' })
      return
    }

    this.setData({
      currentStep: 3,
      importing: true,
      importProgress: 0,
      importTotal: records.length,
      importedCount: 0
    })

    const BATCH_SIZE = 100
    let totalImported = 0
    let totalFailed = 0
    const errors = []

    const batches = []
    for (let i = 0; i < records.length; i += BATCH_SIZE) {
      batches.push(records.slice(i, i + BATCH_SIZE))
    }

    for (let i = 0; i < batches.length; i++) {
      try {
        const result = await batchImportRecords(recordType, batches[i])
        totalImported += result.data.imported
        totalFailed += result.data.failed
        if (result.data.errors) errors.push(...result.data.errors)
      } catch (err) {
        totalFailed += batches[i].length
        errors.push({ batch: i, error: err.message })
      }

      this.setData({
        importProgress: Math.round(((i + 1) / batches.length) * 100),
        importedCount: totalImported
      })
    }

    this.setData({
      importing: false,
      importResult: { imported: totalImported, failed: totalFailed, errors }
    })
  },

  transformRows(rows, mapping, headers, recordType, medicationMode) {
    // 反转映射：targetField → header index
    const fieldToIndex = {}
    for (const [col, field] of Object.entries(mapping)) {
      const idx = headers.indexOf(col)
      if (idx >= 0) fieldToIndex[field] = idx
    }

    const getVal = (row, field) => {
      const idx = fieldToIndex[field]
      if (idx === undefined) return ''
      const val = row[idx]
      return val !== undefined && val !== null ? String(val) : ''
    }

    if (recordType === 'medication') {
      const rawRecords = rows.map(row => ({
        datetime: getVal(row, 'datetime'),
        weight: getVal(row, 'weight'),
        medicationName: getVal(row, 'medicationName'),
        dosage: getVal(row, 'dosage'),
        unit: getVal(row, 'unit') || 'mg',
        takeTime: getVal(row, 'takeTime'),
        sideEffects: getVal(row, 'sideEffects')
      })).filter(r => r.datetime && r.medicationName)

      if (medicationMode === 'single_row') {
        return this.groupMedicationRows(rawRecords)
      }

      return rawRecords.map(r => ({
        datetime: r.datetime,
        weight: r.weight,
        sideEffects: r.sideEffects,
        medications: [{
          name: r.medicationName,
          dosage: r.dosage,
          unit: r.unit,
          takeTime: r.takeTime
        }]
      }))
    }

    if (recordType === 'seizure') {
      return rows.map(row => ({
        datetime: getVal(row, 'datetime'),
        seizureType: getVal(row, 'seizureType'),
        duration: getVal(row, 'duration'),
        severity: getVal(row, 'severity'),
        timeOfDay: getVal(row, 'timeOfDay'),
        triggers: getVal(row, 'triggers'),
        symptoms: getVal(row, 'symptoms'),
        recoveryTime: getVal(row, 'recoveryTime'),
        notes: getVal(row, 'notes')
      })).filter(r => r.datetime)
    }

    return rows.map(row => ({
      datetime: getVal(row, 'datetime'),
      category: getVal(row, 'category') || '其他',
      content: getVal(row, 'content'),
      remark: getVal(row, 'remark')
    })).filter(r => r.datetime && r.content)
  },

  groupMedicationRows(rows) {
    const groups = {}
    for (const row of rows) {
      const key = `${row.datetime}__${row.weight}`
      if (!groups[key]) {
        groups[key] = {
          datetime: row.datetime,
          weight: row.weight,
          sideEffects: row.sideEffects || '',
          medications: []
        }
      }
      groups[key].medications.push({
        name: row.medicationName,
        dosage: row.dosage,
        unit: row.unit,
        takeTime: row.takeTime
      })
      if (row.sideEffects && !groups[key].sideEffects.includes(row.sideEffects)) {
        groups[key].sideEffects += (groups[key].sideEffects ? '，' : '') + row.sideEffects
      }
    }
    return Object.values(groups)
  },

  goToRecords() {
    wx.switchTab({ url: '/pages/my-records/index' })
  },

  importMore() {
    this.setData({
      currentStep: 0,
      selectedFile: null,
      fileID: '',
      headers: [],
      allRows: [],
      sampleRows: [],
      totalRows: 0,
      truncated: false,
      recordType: '',
      confidence: '',
      aiNote: '',
      medicationMode: '',
      columnMapping: {},
      mappingList: [],
      previewHeaders: [],
      previewRows: [],
      importResult: null,
      importProgress: 0,
      importedCount: 0
    })
  }
})
