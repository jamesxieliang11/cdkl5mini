#!/usr/bin/env node
/**
 * 家庭基础信息问卷 - Excel 数据批量导入脚本
 *
 * 用法：
 *   1. 安装依赖：npm install xlsx
 *   2. 运行：node scripts/import-questionnaire.js <excel文件路径> [输出路径] [--sheet=名称]
 *
 * 说明：
 *   - 脚本自动读取 Excel 中**所有 sheet** 并合并导入（支持分表场景）
 *   - 每个 sheet 独立识别表头，即使不同 sheet 表头顺序不同也能正确映射
 *   - 跨 sheet 按 child_name + parent_contact 自动去重，保留最新一条
 *   - 可通过 --sheet=名称 指定只导入某个 sheet
 *   - 输出 JSON 文件（output/questionnaire-import.json）供云函数 import action 使用
 *
 * 云函数调用方式（可选）：
 *   将生成的 JSON 按每 50 条分批，调用云函数 questionnaire 的 import action
 */

const XLSX = require('xlsx')
const fs = require('fs')
const path = require('path')

// ==================== Excel 表头 → 数据库字段映射 ====================
const HEADER_MAP = {
  '提交时间（自动）': 'submit_time',
  '提交时间': 'submit_time',
  '孩子姓名（必填）': 'child_name',
  '孩子姓名': 'child_name',
  '微信群昵称（必须与微信群备注名一致）（必填）': 'wechat_group_nickname',
  '微信群昵称': 'wechat_group_nickname',
  '您的孩子是男孩还是女孩？（必填）': 'child_gender',
  '您的孩子是男孩还是女孩？': 'child_gender',
  '孩子性别': 'child_gender',
  '出生日期（必填）': 'birth_date',
  '出生日期': 'birth_date',
  '所在地区（省市）（必填）': 'region',
  '所在地区': 'region',
  '家长姓名（进群家属）（必填）': 'parent_name',
  '家长姓名': 'parent_name',
  '家长微信号/手机号（便于助手添加进群）（必填）': 'parent_contact',
  '家长微信号/手机号': 'parent_contact',
  '联系方式': 'parent_contact',
  '希舞宝贝是第几胎：【包括流（引）产的】（必填）': 'birth_order',
  '希舞宝贝是第几胎': 'birth_order',
  '第几胎': 'birth_order',
  '怀孕方式（必填）': 'pregnancy_method',
  '怀孕方式': 'pregnancy_method',
  '怀希舞宝贝时是否保胎（必填）': 'pregnancy_protection',
  '怀希舞宝贝时是否保胎': 'pregnancy_protection',
  '是否保胎': 'pregnancy_protection',
  '您的分娩方式是？（必填）': 'delivery_method',
  '分娩方式': 'delivery_method',
  '您的孩子是否被当作脑瘫或其他疾病做治疗或康复？（必填）': 'misdiagnosed_as_cp',
  '是否被当作脑瘫治疗': 'misdiagnosed_as_cp',
  '孩子母亲的学历：（必填）': 'mother_education',
  '孩子母亲的学历': 'mother_education',
  '母亲学历': 'mother_education',
  '孩子母亲职业：（必填）': 'mother_occupation',
  '孩子母亲职业': 'mother_occupation',
  '母亲职业': 'mother_occupation',
  '孩子父亲的学历：（必填）': 'father_education',
  '孩子父亲的学历': 'father_education',
  '父亲学历': 'father_education',
  '孩子父亲的职业：（必填）': 'father_occupation',
  '孩子父亲的职业': 'father_occupation',
  '父亲职业': 'father_occupation',
  '家庭成员有无因照顾孩子而辞职：（必填）': 'family_member_resigned',
  '家庭成员有无因照顾孩子而辞职': 'family_member_resigned',
  '家庭月收入：（必填）': 'monthly_income',
  '家庭月收入': 'monthly_income',
  '每个月花在孩子治疗疾病上的费用：（非康复和日常生活开销）（必填）': 'treatment_cost',
  '每个月花在孩子治疗疾病上的费用': 'treatment_cost',
  '每月治疗费用': 'treatment_cost',
  '每个月花在孩子康复上的费用：（非治病和日常生活开销）（必填）': 'rehab_cost',
  '每个月花在孩子康复上的费用': 'rehab_cost',
  '每月康复费用': 'rehab_cost',
  '孩子诊断为希舞症（CDKL5缺乏症）的年龄：（必填）': 'diagnosis_age',
  '诊断年龄': 'diagnosis_age',
  '癫痫首次发作年龄：（必填）': 'first_seizure_age',
  '癫痫首次发作年龄': 'first_seizure_age',
  '首次发作年龄': 'first_seizure_age',
  '您的孩子还有哪些其他症状（必填）': 'other_symptoms',
  '其他症状': 'other_symptoms',
  '孩子目前主要移动方式：（必填）': 'mobility_method',
  '主要移动方式': 'mobility_method',
  '孩子吞咽困难程度（必填）': 'swallowing_difficulty',
  '吞咽困难程度': 'swallowing_difficulty',
  '孩子睡眠障碍程度（必填）': 'sleep_disorder',
  '睡眠障碍程度': 'sleep_disorder',
  '孩子睡眠中不安静和动的太多（必填）': 'sleep_restlessness',
  '睡眠中不安静': 'sleep_restlessness',
  '宝宝的发育状态（必填）': 'development_status',
  '发育状态': 'development_status',
  '您是否已经为孩子接受了基因检测？（必填）': 'gene_test_done',
  '是否基因检测': 'gene_test_done',
  '上传基因报告照片（必填）': '_gene_report_photo',
  '基因报告照片': '_gene_report_photo',
  '基因的变异来源（必填）': 'mutation_source',
  '基因变异来源': 'mutation_source',
  '突变类型（必填）': 'mutation_type',
  '突变类型': 'mutation_type',
  '目前癫痫是否得到控制：（必填）': 'seizure_control',
  '癫痫是否控制': 'seizure_control',
  '宝宝最近的发作形式（必填）': 'recent_seizure_type',
  '最近发作形式': 'recent_seizure_type',
  '宝宝最近发作的持续时间（必填）': 'recent_seizure_duration',
  '最近发作持续时间': 'recent_seizure_duration',
  '宝宝最近的发作强度（必填）': 'recent_seizure_intensity',
  '最近发作强度': 'recent_seizure_intensity',
  '您已经为孩子采取了哪些治疗措施？（必填）': 'treatment_methods',
  '治疗措施': 'treatment_methods',
  '目前服药情况（几种，名称)（必填）': 'current_medications',
  '目前服药情况': 'current_medications',
  '服用后加重的药物（必填）': 'worsening_medications',
  '服用后加重的药物': 'worsening_medications',
  '服用后无效的药物（必填）': 'ineffective_medications',
  '服用后无效的药物': 'ineffective_medications',
  '您是否坚持给宝宝热浴？（必填）': 'hot_bath',
  '是否热浴': 'hot_bath',
  '宝宝药浴的频率为？（必填）': 'bath_frequency',
  '药浴频率': 'bath_frequency',
  '宝宝热浴的时长通常为？（必填）': 'bath_duration',
  '热浴时长': 'bath_duration',
  '您认为药浴对宝宝的情况有哪些帮助？': 'bath_benefits',
  '药浴帮助': 'bath_benefits',
  '请描述孩子的治疗效果及目前面临的困难。': 'treatment_effect_description',
  '治疗效果描述': 'treatment_effect_description',
  '是否愿意做希舞团队志愿者工作或者成为希舞CDKL5宝贝关爱之家备用人才': 'volunteer_willingness',
  '是否愿意做志愿者': 'volunteer_willingness',
  '您有什么资源或特长？如果可以的话请写上相关信息，比如新闻媒体/分子生物学/视频剪辑等等': 'resources_skills',
  '资源或特长': 'resources_skills',
  '您是通过什么渠道找到我们的？（必填）': 'referral_source',
  '渠道来源': 'referral_source'
}

// ==================== 工具函数 ====================

/**
 * 标准化表头：去除前后空格、替换换行符
 */
function normalizeHeader(header) {
  return (header || '').replace(/[\r\n]+/g, '').trim()
}

/**
 * 标准化单元格值
 */
function normalizeValue(value) {
  if (value === null || value === undefined) return ''
  if (typeof value === 'number') return String(value)
  return String(value).trim()
}

/**
 * 尝试将 Excel 日期值转换为 ISO 字符串
 */
function parseDate(value) {
  if (!value) return ''
  // Excel 序列号日期
  if (typeof value === 'number') {
    const excelEpoch = new Date(1899, 11, 30)
    const date = new Date(excelEpoch.getTime() + value * 86400000)
    return date.toISOString().split('T')[0]
  }
  // 字符串日期
  const str = String(value).trim()
  // 匹配 yyyy/mm/dd 或 yyyy-mm-dd
  const match = str.match(/(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/)
  if (match) {
    return `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}`
  }
  return str
}

// ==================== 主逻辑 ====================

/**
 * 读取 Excel 文件，返回 workbook 对象
 * 优化：跳过图片/样式/公式等非数据内容，大幅降低内存占用
 */
function readWorkbook(filePath) {
  if (!fs.existsSync(filePath)) {
    console.error(`❌ 文件不存在: ${filePath}`)
    process.exit(1)
  }

  const stats = fs.statSync(filePath)
  const sizeMB = (stats.size / 1024 / 1024).toFixed(1)
  console.log(`📂 读取文件: ${filePath} (${sizeMB} MB)`)

  if (stats.size > 100 * 1024 * 1024) {
    console.log(`⚠️  文件较大（${sizeMB}MB），正在跳过图片/样式解析以节省内存...`)
  }

  // 关键优化选项：只读取单元格文本数据，跳过所有非必要内容
  const workbook = XLSX.read(fs.readFileSync(filePath), {
    type: 'buffer',
    cellFormula: false,   // 不解析公式，只取结果值
    cellHTML: false,      // 不生成 HTML
    cellStyles: false,    // 不解析样式
    cellDates: true,      // 日期转为 JS Date 对象
    bookVBA: false,       // 不解析 VBA 宏
    bookImages: false,    // 不解析嵌入图片（关键！大幅节省内存）
    sheetStubs: false,    // 不为空单元格生成占位符
    password: '',         // 无密码
  })
  console.log(`📋 发现 ${workbook.SheetNames.length} 个工作表: ${workbook.SheetNames.join(', ')}`)
  return workbook
}

/**
 * 读取单个 sheet 的原始数据
 */
function readSheet(workbook, sheetName) {
  const sheet = workbook.Sheets[sheetName]
  if (!sheet) return []
  return XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' })
}

/**
 * 处理单个 sheet：映射表头 + 转换行数据
 * 返回 { records, headerMapping, unmapped, skippedRows }
 */
function processSheet(rawData, sheetName) {
  if (rawData.length < 2) {
    console.log(`   ⏭️  工作表 "${sheetName}" 为空或只有表头，跳过`)
    return { records: [], headerMapping: [], unmapped: [], skippedRows: 0 }
  }

  // 每个 sheet 独立映射表头（不同 sheet 可能表头顺序不同）
  const { headerMapping, unmapped } = mapHeaders(rawData[0])
  const records = transformRows(rawData, headerMapping, sheetName)

  return { records, headerMapping, unmapped, skippedRows: rawData.length - 1 - records.length }
}

function mapHeaders(rawHeaders) {
  const headerMapping = []
  const unmapped = []

  for (let i = 0; i < rawHeaders.length; i++) {
    const original = normalizeHeader(rawHeaders[i])
    if (!original) continue

    const field = HEADER_MAP[original]
    if (field) {
      headerMapping.push({ index: i, field, original })
    } else {
      unmapped.push({ index: i, header: original })
    }
  }

  return { headerMapping, unmapped }
}

function transformRows(rawData, headerMapping, sheetName) {
  const dataRows = rawData.slice(1)
  const records = []

  for (let rowIdx = 0; rowIdx < dataRows.length; rowIdx++) {
    const row = dataRows[rowIdx]
    // 跳过全空行
    if (row.every(cell => !cell && cell !== 0)) continue

    const record = {
      openid: '',
      user_id: '',
      status: 'submitted',
      gene_report_images: [],
      _source_sheet: sheetName || ''  // 记录来源 sheet，方便排查
    }

    for (const { index, field } of headerMapping) {
      let value = normalizeValue(row[index])

      // 特殊处理
      if (field === 'submit_time' || field === 'birth_date') {
        value = parseDate(row[index]) || value
      }

      // 忽略上传照片列（导入时无法处理图片文件）
      if (field === '_gene_report_photo') continue

      record[field] = value
    }

    // 必须有孩子姓名才算有效记录
    if (!record.child_name) {
      console.warn(`⚠️  跳过 [${sheetName}] 第 ${rowIdx + 2} 行：缺少孩子姓名`)
      continue
    }

    records.push(record)
  }

  return records
}

/**
 * 跨 sheet 去重：同一个孩子（child_name + parent_contact）只保留最后出现的记录
 * 因为后面的 sheet 通常是更新的数据
 */
function deduplicateRecords(records) {
  const seen = new Map()
  // 正序遍历，后出现的覆盖前面的
  for (const record of records) {
    const key = `${record.child_name || ''}_${record.parent_contact || ''}`
    if (key === '_') continue
    seen.set(key, record)
  }
  return Array.from(seen.values())
}

function writeOutput(records, outputPath) {
  const outputDir = path.dirname(outputPath)
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true })
  }

  // 写入完整 JSON（供云函数 import action 使用）
  fs.writeFileSync(outputPath, JSON.stringify(records, null, 2), 'utf-8')
  console.log(`✅ 已生成 JSON 文件: ${outputPath}`)
  console.log(`   共 ${records.length} 条记录`)

  // 同时按每 50 条分批输出（方便云函数分批调用）
  const BATCH_SIZE = 50
  if (records.length > BATCH_SIZE) {
    const batchDir = outputPath.replace('.json', '-batches')
    if (!fs.existsSync(batchDir)) {
      fs.mkdirSync(batchDir, { recursive: true })
    }
    for (let i = 0; i < records.length; i += BATCH_SIZE) {
      const batch = records.slice(i, i + BATCH_SIZE)
      const batchFile = path.join(batchDir, `batch-${Math.floor(i / BATCH_SIZE) + 1}.json`)
      fs.writeFileSync(batchFile, JSON.stringify(batch, null, 2), 'utf-8')
    }
    console.log(`   分批文件目录: ${batchDir}/ (每批 ${BATCH_SIZE} 条)`)
  }
}

function printSummary(records, unmapped) {
  console.log('\n📊 数据摘要:')
  console.log(`   总记录数: ${records.length}`)

  // 字段覆盖率统计
  const fieldCoverage = {}
  for (const record of records) {
    for (const [key, value] of Object.entries(record)) {
      if (key === 'openid' || key === 'user_id' || key === 'status' || key === 'gene_report_images') continue
      if (!fieldCoverage[key]) fieldCoverage[key] = { total: 0, filled: 0 }
      fieldCoverage[key].total++
      if (value) fieldCoverage[key].filled++
    }
  }

  console.log('\n📋 字段覆盖率:')
  for (const [field, { total, filled }] of Object.entries(fieldCoverage)) {
    const pct = ((filled / total) * 100).toFixed(0)
    const bar = pct >= 80 ? '🟢' : pct >= 50 ? '🟡' : '🔴'
    console.log(`   ${bar} ${field}: ${filled}/${total} (${pct}%)`)
  }

  if (unmapped.length > 0) {
    console.log('\n⚠️  未映射的表头（已忽略）:')
    for (const { index, header } of unmapped) {
      console.log(`   列 ${index + 1}: "${header}"`)
    }
  }
}

// ==================== 入口 ====================

function main() {
  const args = process.argv.slice(2)

  // 解析参数
  const positionalArgs = []
  let targetSheet = null
  for (const arg of args) {
    if (arg.startsWith('--sheet=')) {
      targetSheet = arg.replace('--sheet=', '')
    } else {
      positionalArgs.push(arg)
    }
  }

  if (positionalArgs.length === 0) {
    console.log('用法: node scripts/import-questionnaire.js <Excel文件路径> [输出路径] [--sheet=工作表名]')
    console.log('')
    console.log('示例:')
    console.log('  node scripts/import-questionnaire.js ./data/questionnaire.xlsx')
    console.log('  node scripts/import-questionnaire.js ./data/questionnaire.xlsx ./output/import.json')
    console.log('  node scripts/import-questionnaire.js ./data/questionnaire.xlsx --sheet=2024年1-2月')
    console.log('')
    console.log('说明:')
    console.log('  - 默认读取所有 sheet 并合并（按 child_name + parent_contact 去重）')
    console.log('  - 使用 --sheet=名称 可只导入指定的工作表')
    process.exit(0)
  }

  const inputPath = path.resolve(positionalArgs[0])
  const outputPath = positionalArgs[1]
    ? path.resolve(positionalArgs[1])
    : path.resolve(__dirname, '../output/questionnaire-import.json')

  // 1. 读取 Excel 工作簿
  const workbook = readWorkbook(inputPath)

  // 确定要处理的 sheet 列表
  let sheetNames = workbook.SheetNames
  if (targetSheet) {
    if (!sheetNames.includes(targetSheet)) {
      console.error(`❌ 找不到工作表 "${targetSheet}"，可用的工作表: ${sheetNames.join(', ')}`)
      process.exit(1)
    }
    sheetNames = [targetSheet]
    console.log(`🎯 只处理指定工作表: ${targetSheet}\n`)
  } else {
    console.log(`📑 将合并处理所有 ${sheetNames.length} 个工作表\n`)
  }

  // 2. 逐个 sheet 处理
  let allRecords = []
  let allUnmapped = []
  let totalRawRows = 0

  for (const sheetName of sheetNames) {
    console.log(`── 处理工作表: "${sheetName}" ──`)
    const rawData = readSheet(workbook, sheetName)

    if (rawData.length < 2) {
      console.log(`   ⏭️  为空或只有表头，跳过\n`)
      continue
    }

    const { records, headerMapping, unmapped, skippedRows } = processSheet(rawData, sheetName)
    totalRawRows += rawData.length - 1
    console.log(`   🔗 映射 ${headerMapping.length} 个字段，${records.length} 条有效记录`)
    if (unmapped.length > 0) {
      console.log(`   ⚠️  ${unmapped.length} 个表头未匹配`)
    }
    if (skippedRows > 0) {
      console.log(`   ⏭️  跳过 ${skippedRows} 行（空行或缺少姓名）`)
    }
    console.log('')

    allRecords = allRecords.concat(records)
    // 合并未映射表头（去重）
    for (const u of unmapped) {
      if (!allUnmapped.find(x => x.header === u.header)) {
        allUnmapped.push(u)
      }
    }
  }

  console.log(`📝 合并前总记录数: ${allRecords.length}（来自 ${totalRawRows} 行原始数据）`)

  // 3. 跨 sheet 去重
  const beforeDedup = allRecords.length
  const records = deduplicateRecords(allRecords)
  const dupCount = beforeDedup - records.length
  if (dupCount > 0) {
    console.log(`🔄 去重: 移除 ${dupCount} 条重复记录（同一孩子保留最新）`)
  }
  console.log(`✅ 最终记录数: ${records.length}\n`)

  // 4. 输出前移除内部标记字段
  for (const record of records) {
    delete record._source_sheet
  }

  // 5. 输出文件
  writeOutput(records, outputPath)

  // 6. 打印统计摘要
  printSummary(records, allUnmapped)

  console.log('\n🎉 导入数据准备完成！')
  console.log('下一步：')
  console.log('  方式A：在云开发控制台 → 数据库 → questionnaires → 导入 → 选择 JSON 文件')
  console.log('  方式B：调用云函数 questionnaire 的 import action，传入 records 数组')
}

main()
