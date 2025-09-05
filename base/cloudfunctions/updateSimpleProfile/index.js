// 更新简单用户信息云函数（工作人员/科研人员）
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const { simpleInfo } = event
  
  try {
    console.log('更新简单用户信息请求:', {
      openid: wxContext.OPENID,
      simpleInfo
    })

    const openid = wxContext.OPENID
    if (!openid) {
      return {
        success: false,
        message: '获取用户身份失败'
      }
    }

    const currentTime = new Date()
    const updateData = {
      simpleInfo: simpleInfo,
      nickName: simpleInfo.name,
      hasCompleteProfile: true,
      profileUpdatedAt: currentTime,
      updatedAt: currentTime
    }

    let existingUser
    try {
      // 查询用户是否已存在
      existingUser = await db.collection('users').where({
        openid: openid
      }).get()
    } catch (error) {
      // 如果集合不存在，先创建用户记录
      if (error.errCode === -502005 || error.message.includes('collection not exists')) {
        const newUserData = {
          openid: openid,
          userRole: 'staff', // 默认为工作人员
          avatarUrl: '',
          createdAt: currentTime,
          lastLoginTime: currentTime,
          ...updateData
        }
        
        const createResult = await db.collection('users').add({
          data: newUserData
        })
        
        console.log('新用户创建成功:', createResult)
        
        return {
          success: true,
          message: '信息保存成功',
          data: {
            ...newUserData,
            _id: createResult._id
          }
        }
      } else {
        throw error
      }
    }

    if (existingUser.data.length > 0) {
      // 用户已存在，更新信息
      const result = await db.collection('users').where({
        openid: openid
      }).update({
        data: updateData
      })
      
      console.log('用户信息更新成功:', result)
      
      return {
        success: true,
        message: '信息保存成功',
        data: {
          ...existingUser.data[0],
          ...updateData
        }
      }
    } else {
      // 用户不存在，创建新用户
      const newUserData = {
        openid: openid,
        userRole: 'staff', // 默认为工作人员
        avatarUrl: '',
        createdAt: currentTime,
        lastLoginTime: currentTime,
        ...updateData
      }
      
      const result = await db.collection('users').add({
        data: newUserData
      })
      
      console.log('新用户创建成功:', result)
      
      return {
        success: true,
        message: '信息保存成功',
        data: {
          ...newUserData,
          _id: result._id
        }
      }
    }
    
  } catch (error) {
    console.error('更新简单用户信息失败:', error)
    return {
      success: false,
      message: '保存失败，请重试',
      error: error.message
    }
  }
}