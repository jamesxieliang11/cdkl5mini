// 用户登录管理云函数
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const { userInfo, userRole } = event
  
  try {
    console.log('用户登录请求:', {
      openid: wxContext.OPENID,
      userRole,
      userInfo
    })

    const openid = wxContext.OPENID
    if (!openid) {
      return {
        success: false,
        message: '获取用户身份失败'
      }
    }

    const currentTime = new Date()
    const userData = {
      openid: openid,
      userRole: userRole || 'patient', // 默认为病友家庭
      nickName: userInfo?.nickName || '',
      avatarUrl: userInfo?.avatarUrl || '',
      lastLoginTime: currentTime,
      updatedAt: currentTime
    }

    let existingUser
    try {
      // 查询用户是否已存在
      existingUser = await db.collection('users').where({
        openid: openid
      }).get()
    } catch (error) {
      // 如果集合不存在，说明是首次使用，直接创建新用户
      if (error.errCode === -502005 || error.message.includes('collection not exists')) {
        console.log('users 集合不存在，创建新用户')
        existingUser = { data: [] } // 模拟空查询结果
      } else {
        throw error // 其他错误继续抛出
      }
    }

    let result
    if (existingUser.data.length > 0) {
      // 用户已存在，更新信息
      result = await db.collection('users').where({
        openid: openid
      }).update({
        data: userData
      })
      
      console.log('用户信息更新成功:', result)
      
      return {
        success: true,
        message: '登录成功',
        data: {
          ...userData,
          _id: existingUser.data[0]._id,
          isNewUser: false
        }
      }
    } else {
      // 新用户，创建记录
      userData.createdAt = currentTime
      result = await db.collection('users').add({
        data: userData
      })
      
      console.log('新用户创建成功:', result)
      
      return {
        success: true,
        message: '注册成功',
        data: {
          ...userData,
          _id: result._id,
          isNewUser: true
        }
      }
    }
    
  } catch (error) {
    console.error('用户登录失败:', error)
    return {
      success: false,
      message: '登录失败',
      error: error.message
    }
  }
}