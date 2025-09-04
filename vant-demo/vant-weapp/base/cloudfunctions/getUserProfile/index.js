// 获取用户详细信息云函数
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  
  try {
    const openid = wxContext.OPENID
    if (!openid) {
      return {
        success: false,
        message: '获取用户身份失败'
      }
    }

    // 查询用户信息
    let existingUser
    try {
      existingUser = await db.collection('users').where({
        openid: openid
      }).get()
    } catch (error) {
      // 如果集合不存在，返回空用户信息
      if (error.errCode === -502005 || error.message.includes('collection not exists')) {
        return {
          success: true,
          data: {
            openid: openid,
            hasCompleteProfile: false
          }
        }
      } else {
        throw error
      }
    }

    if (existingUser.data.length > 0) {
      const userData = existingUser.data[0]
      return {
        success: true,
        data: {
          ...userData,
          hasCompleteProfile: !!(userData.patientInfo && userData.patientInfo.babyName)
        }
      }
    } else {
      return {
        success: true,
        data: {
          openid: openid,
          hasCompleteProfile: false
        }
      }
    }
    
  } catch (error) {
    console.error('获取用户信息失败:', error)
    return {
      success: false,
      message: '获取用户信息失败',
      error: error.message
    }
  }
}