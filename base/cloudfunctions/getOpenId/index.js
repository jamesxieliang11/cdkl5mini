// 获取用户openid的云函数
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  
  try {
    return {
      success: true,
      openid: wxContext.OPENID,
      appid: wxContext.APPID,
      unionid: wxContext.UNIONID,
      timestamp: new Date().toISOString()
    }
  } catch (error) {
    console.error('获取openid失败:', error)
    return {
      success: false,
      error: error.message
    }
  }
}