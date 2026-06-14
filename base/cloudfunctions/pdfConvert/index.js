const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event) => {
  const { action, fileID } = event

  try {
    switch (action) {
      case 'convert':
        return await convertPDF(fileID)
      case 'getPages':
        return await getPages(fileID)
      default:
        return { success: false, message: '不支持的操作' }
    }
  } catch (error) {
    console.error('PDF操作失败:', error)
    return { success: false, message: error.message }
  }
}

// 获取已转换的页面图片列表
async function getPages(fileID) {
  const cacheKey = getCacheKey(fileID)

  // 从数据库查缓存
  const cacheResult = await db.collection('app_config')
    .where({ _id: cacheKey })
    .limit(1)
    .get()

  if (cacheResult.data.length > 0) {
    const cached = cacheResult.data[0]
    // 获取临时链接
    const urlResult = await cloud.getTempFileURL({ fileList: cached.pageFileIDs })
    const pages = urlResult.fileList
      .filter(f => f.status === 0 && f.tempFileURL)
      .map(f => {
        const match = f.fileID.match(/page-(\d+)\.jpg$/)
        return { pageNum: match ? parseInt(match[1]) : 0, url: f.tempFileURL }
      })
      .sort((a, b) => a.pageNum - b.pageNum)

    if (pages.length > 0) {
      return { success: true, data: { pages, totalPages: pages.length, fromCache: true } }
    }
  }

  return { success: true, data: { pages: [], totalPages: 0, fromCache: false } }
}

// 转换 PDF 为图片
async function convertPDF(fileID) {
  if (!fileID) return { success: false, message: '缺少 fileID' }

  // 下载 PDF
  console.log('下载PDF:', fileID)
  const fileRes = await cloud.downloadFile({ fileID })
  const pdfBuffer = fileRes.fileContent

  // 动态加载 pdfjs-dist 和 canvas
  const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js')
  const { createCanvas } = require('canvas')

  // 解析 PDF
  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(pdfBuffer) })
  const pdfDoc = await loadingTask.promise
  const numPages = pdfDoc.numPages
  console.log('PDF页数:', numPages)

  const SCALE = 2 // 2x 渲染，足够清晰
  const pageFileIDs = []

  for (let i = 1; i <= numPages; i++) {
    console.log(`渲染第 ${i}/${numPages} 页`)
    const page = await pdfDoc.getPage(i)
    const viewport = page.getViewport({ scale: SCALE })

    const canvas = createCanvas(viewport.width, viewport.height)
    const ctx = canvas.getContext('2d')

    // 白色背景
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, viewport.width, viewport.height)

    await page.render({ canvasContext: ctx, viewport }).promise

    const jpegBuffer = canvas.toBuffer('image/jpeg', { quality: 0.85 })

    // 上传到云存储
    const cloudPath = `brochure-pages/page-${i}.jpg`
    const uploadRes = await cloud.uploadFile({
      cloudPath,
      fileContent: jpegBuffer
    })
    pageFileIDs.push(uploadRes.fileID)
    console.log(`第 ${i} 页上传完成:`, uploadRes.fileID)
  }

  // 缓存结果到数据库
  const cacheKey = getCacheKey(fileID)
  try {
    await db.collection('app_config').doc(cacheKey).set({
      data: {
        _id: cacheKey,
        type: 'pdf_cache',
        sourceFileID: fileID,
        pageFileIDs,
        totalPages: numPages,
        convertedAt: new Date()
      }
    })
  } catch (e) {
    console.log('缓存写入失败（非致命）:', e.message)
  }

  // 获取临时链接
  const urlResult = await cloud.getTempFileURL({ fileList: pageFileIDs })
  const pages = urlResult.fileList
    .filter(f => f.status === 0 && f.tempFileURL)
    .map(f => {
      const match = f.fileID.match(/page-(\d+)\.jpg$/)
      return { pageNum: match ? parseInt(match[1]) : 0, url: f.tempFileURL }
    })
    .sort((a, b) => a.pageNum - b.pageNum)

  return {
    success: true,
    data: { pages, totalPages: numPages, fromCache: false }
  }
}

function getCacheKey(fileID) {
  // 简单哈希作为缓存键
  let hash = 0
  for (let i = 0; i < fileID.length; i++) {
    hash = ((hash << 5) - hash) + fileID.charCodeAt(i)
    hash |= 0
  }
  return 'pdf_cache_' + Math.abs(hash)
}
