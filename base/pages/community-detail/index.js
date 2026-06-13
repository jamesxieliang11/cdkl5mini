const { getCommunityPost, listCommunityComments, createCommunityComment, toggleCommunityLike, deleteCommunityPost, deleteCommunityComment, getCommunityShareData } = require('../../utils/database.js')

const AVATAR_COLORS = ['#34BFA3', '#FF6B6B', '#4ECDC4', '#A78BFA', '#F97316', '#06B6D4', '#EC4899', '#8B5CF6']

function getAvatarMeta(nickName, userId) {
  const name = nickName || '希'
  const char = name[0]
  const hash = (userId || name).split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  return { avatarChar: char, avatarColor: AVATAR_COLORS[hash % AVATAR_COLORS.length] }
}

Page({
  data: {
    post: null,               // 帖子数据
    comments: [],             // 评论列表
    displayTime: '',          // 格式化后的发布时间
    pageLoading: true,        // 页面加载中
    commentLoading: false,    // 评论加载中
    hasMoreComments: false,   // 是否有更多评论
    commentPageIndex: 0,      // 评论页码
    showCommentInput: false,  // 评论输入弹窗
    commentContent: '',       // 评论内容
    canSendComment: false,    // 是否可发送评论
    commentSubmitting: false, // 评论提交中
    replyTo: null,            // 回复目标 { id, name }
    isOwner: false,           // 是否帖子作者
    isAdmin: false,           // 是否管理员
    currentUserId: '',        // 当前用户ID
    showShareSheet: false,    // 分享弹窗
    shareActions: [
      { name: '转发给好友', icon: 'chat-o' },
      { name: '生成分享海报', icon: 'photo-o' }
    ],
    showPoster: false,        // 海报组件
    posterData: null          // 海报数据
  },

  onLoad(options) {
    const postId = options.id
    if (!postId) {
      wx.showToast({ title: '帖子不存在', icon: 'none' })
      setTimeout(() => wx.navigateBack(), 1000)
      return
    }

    this._postId = postId
    const currentUserId = wx.getStorageSync('userId') || ''
    const adminRole = wx.getStorageSync('adminRole') || ''
    this.setData({
      currentUserId,
      isAdmin: adminRole === 'admin' || adminRole === 'superadmin'
    })

    this.loadPost()
    this.loadComments()
  },

  goBack() {
    wx.navigateBack()
  },

  // 加载帖子详情
  async loadPost() {
    this.setData({ pageLoading: true })
    try {
      const result = await getCommunityPost(this._postId)
      if (result.data) {
        const post = result.data
        const meta = post.is_anonymous
          ? { avatarChar: '匿', avatarColor: '#ccc' }
          : getAvatarMeta(post.nick_name, post.user_id)
        post.avatarChar = meta.avatarChar
        post.avatarColor = meta.avatarColor
        this.setData({
          post,
          displayTime: this.formatTime(post.created_at),
          isOwner: post.user_id === this.data.currentUserId
        })
      }
    } catch (error) {
      console.error('加载帖子失败:', error)
      wx.showToast({ title: '帖子加载失败', icon: 'none' })
    } finally {
      this.setData({ pageLoading: false })
    }
  },

  // 加载评论列表
  async loadComments() {
    this.setData({ commentLoading: true })
    try {
      const result = await listCommunityComments(this._postId, 20, 0)
      if (result.data) {
        const comments = result.data.records.map(comment => {
          const meta = getAvatarMeta(comment.nick_name, comment.user_id)
          return { ...comment, displayTime: this.formatTime(comment.created_at), avatarChar: meta.avatarChar, avatarColor: meta.avatarColor }
        })
        this.setData({
          comments,
          hasMoreComments: result.data.hasMore,
          commentPageIndex: 0
        })
      }
    } catch (error) {
      console.error('加载评论失败:', error)
    } finally {
      this.setData({ commentLoading: false })
    }
  },

  // 加载更多评论
  async loadMoreComments() {
    const nextPage = this.data.commentPageIndex + 1
    try {
      const result = await listCommunityComments(this._postId, 20, nextPage)
      if (result.data) {
        const newComments = result.data.records.map(comment => {
          const meta = getAvatarMeta(comment.nick_name, comment.user_id)
          return { ...comment, displayTime: this.formatTime(comment.created_at), avatarChar: meta.avatarChar, avatarColor: meta.avatarColor }
        })
        this.setData({
          comments: [...this.data.comments, ...newComments],
          hasMoreComments: result.data.hasMore,
          commentPageIndex: nextPage
        })
      }
    } catch (error) {
      console.error('加载更多评论失败:', error)
    }
  },

  // 点赞帖子
  async onLikePost() {
    if (!this.data.currentUserId) {
      wx.showToast({ title: '请先登录', icon: 'none' })
      return
    }

    try {
      const result = await toggleCommunityLike(this._postId, 'post_like')
      const post = { ...this.data.post }
      post.isLiked = result.data.isLiked
      post.like_count = post.like_count + (result.data.isLiked ? 1 : -1)
      this.setData({ post })
    } catch (error) {
      console.error('点赞失败:', error)
    }
  },

  // 点赞评论
  async onLikeComment(event) {
    if (!this.data.currentUserId) {
      wx.showToast({ title: '请先登录', icon: 'none' })
      return
    }

    const { commentId, index } = event.currentTarget.dataset
    try {
      const result = await toggleCommunityLike(commentId, 'comment_like')
      const comments = [...this.data.comments]
      comments[index].isLiked = result.data.isLiked
      comments[index].like_count = comments[index].like_count + (result.data.isLiked ? 1 : -1)
      this.setData({ comments })
    } catch (error) {
      console.error('评论点赞失败:', error)
    }
  },

  // 打开评论输入
  focusInput() {
    this.setData({ showCommentInput: true })
  },

  // 关闭评论输入
  hideCommentInput() {
    this.setData({ showCommentInput: false })
  },

  // 评论内容输入
  onCommentInput(event) {
    const commentContent = event.detail.value
    this.setData({
      commentContent,
      canSendComment: commentContent.trim().length > 0
    })
  },

  // 回复评论
  onReplyComment(event) {
    const { commentId, name } = event.currentTarget.dataset
    this.setData({
      replyTo: { id: commentId, name },
      showCommentInput: true
    })
  },

  // 取消回复
  cancelReply() {
    this.setData({ replyTo: null })
  },

  // 提交评论
  async submitComment() {
    if (!this.data.commentContent.trim()) return

    this.setData({ commentSubmitting: true })
    try {
      const userInfo = wx.getStorageSync('userInfo') || {}
      const commentData = {
        content: this.data.commentContent.trim(),
        nickName: userInfo.nickName || '希舞宝宝',
        avatarUrl: userInfo.avatarUrl || '',
        replyToId: this.data.replyTo ? this.data.replyTo.id : '',
        replyToName: this.data.replyTo ? this.data.replyTo.name : ''
      }

      const result = await createCommunityComment(this._postId, commentData)

      const newMeta = getAvatarMeta(commentData.nickName, this.data.currentUserId)
      const newComment = {
        ...result.data,
        displayTime: '刚刚',
        isLiked: false,
        avatarChar: newMeta.avatarChar,
        avatarColor: newMeta.avatarColor
      }
      const comments = [...this.data.comments, newComment]

      // 更新帖子评论数
      const post = { ...this.data.post }
      post.comment_count = (post.comment_count || 0) + 1

      this.setData({
        comments,
        post,
        commentContent: '',
        replyTo: null,
        showCommentInput: false
      })

      wx.showToast({ title: '评论成功', icon: 'success' })
    } catch (error) {
      console.error('评论失败:', error)
      wx.showToast({ title: '评论失败', icon: 'none' })
    } finally {
      this.setData({ commentSubmitting: false })
    }
  },

  // 删除评论
  onDeleteComment(event) {
    const { commentId, index } = event.currentTarget.dataset
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这条评论吗？',
      success: async (res) => {
        if (res.confirm) {
          try {
            await deleteCommunityComment(commentId, this._postId)
            const comments = [...this.data.comments]
            comments.splice(index, 1)
            const post = { ...this.data.post }
            post.comment_count = Math.max(0, (post.comment_count || 0) - 1)
            this.setData({ comments, post })
            wx.showToast({ title: '已删除', icon: 'success' })
          } catch (error) {
            wx.showToast({ title: '删除失败', icon: 'none' })
          }
        }
      }
    })
  },

  // 帖子操作（作者/管理员）
  showPostActions() {
    const actions = ['删除帖子']
    if (this.data.isAdmin) {
      actions.push(this.data.post.is_pinned ? '取消置顶' : '置顶帖子')
    }

    wx.showActionSheet({
      itemList: actions,
      success: (res) => {
        if (res.tapIndex === 0) {
          this.deletePost()
        } else if (res.tapIndex === 1) {
          this.togglePin()
        }
      }
    })
  },

  // 删除帖子
  deletePost() {
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这条帖子吗？删除后不可恢复。',
      success: async (res) => {
        if (res.confirm) {
          try {
            await deleteCommunityPost(this._postId)
            wx.showToast({ title: '已删除', icon: 'success' })
            setTimeout(() => wx.navigateBack(), 1000)
          } catch (error) {
            wx.showToast({ title: '删除失败', icon: 'none' })
          }
        }
      }
    })
  },

  // 置顶/取消置顶
  async togglePin() {
    try {
      const { togglePinCommunityPost } = require('../../utils/database.js')
      const result = await togglePinCommunityPost(this._postId)
      const post = { ...this.data.post }
      post.is_pinned = result.data.isPinned
      this.setData({ post })
      wx.showToast({ title: result.message, icon: 'success' })
    } catch (error) {
      wx.showToast({ title: '操作失败', icon: 'none' })
    }
  },

  // 预览图片
  previewImage(event) {
    const current = event.currentTarget.dataset.current
    const urls = this.data.post.images.map(img => img.fileID)
    wx.previewImage({ current, urls })
  },

  // 分享相关
  onSharePost() {
    this.setData({ showShareSheet: true })
  },

  hideShareSheet() {
    this.setData({ showShareSheet: false })
  },

  async onShareSelect(event) {
    this.setData({ showShareSheet: false })
    const { name } = event.detail

    if (name === '转发给好友') {
      wx.showToast({ title: '请点击右上角转发', icon: 'none' })
    } else if (name === '生成分享海报') {
      await this.generatePoster()
    }
  },

  // 生成海报
  async generatePoster() {
    wx.showLoading({ title: '生成海报中...' })
    try {
      const result = await getCommunityShareData(this._postId)
      this.setData({
        posterData: result.data,
        showPoster: true
      })
    } catch (error) {
      console.error('生成海报失败:', error)
      wx.showToast({ title: '生成失败', icon: 'none' })
    } finally {
      wx.hideLoading()
    }
  },

  hidePoster() {
    this.setData({ showPoster: false })
  },

  onPosterSaved() {
    wx.showToast({ title: '已保存到相册', icon: 'success' })
    this.setData({ showPoster: false })
  },

  // 原生分享
  onShareAppMessage() {
    const post = this.data.post
    if (!post) return {}

    const title = post.is_anonymous
      ? '匿名希舞宝宝的分享'
      : `${post.nick_name}的分享`
    const contentPreview = post.content.substring(0, 50)

    return {
      title: `${title}: ${contentPreview}`,
      path: `/pages/community-detail/index?id=${this._postId}`,
      imageUrl: post.images && post.images.length > 0 ? post.images[0].fileID : ''
    }
  },

  // 格式化时间
  formatTime(dateValue) {
    if (!dateValue) return ''
    const date = new Date(dateValue)
    const now = new Date()
    const diffMs = now - date
    const diffMinutes = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMinutes < 1) return '刚刚'
    if (diffMinutes < 60) return `${diffMinutes}分钟前`
    if (diffHours < 24) return `${diffHours}小时前`
    if (diffDays < 7) return `${diffDays}天前`

    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')

    if (year === now.getFullYear()) {
      return `${month}-${day} ${hours}:${minutes}`
    }
    return `${year}-${month}-${day}`
  }
})
