// 社区管理页面 - 话题/帖子/评论管理
const {
  createCommunityTopic,
  listCommunityTopics,
  adminListCommunityPosts,
  deleteCommunityPost,
  togglePinCommunityPost,
  hideCommunityPost,
  listCommunityComments,
  deleteCommunityComment
} = require('../../utils/database.js')

Page({
  data: {
    activeTab: 0,

    // ===== 话题管理 =====
    communityTopics: [],
    topicListLoading: false,
    newTopicTitle: '',
    newTopicDesc: '',
    newTopicIcon: '💬',
    topicSubmitting: false,

    // ===== 帖子管理 =====
    posts: [],
    postFilter: '',
    postPageIndex: 0,
    postListLoading: false,
    hasMorePosts: false,

    // ===== 评论管理 =====
    selectedPostForComments: null,
    comments: [],
    commentPageIndex: 0,
    commentListLoading: false,
    hasMoreComments: false
  },

  onLoad() {
    this.loadTopics()
    this.loadPosts()
  },

  goBack() {
    wx.navigateBack()
  },

  onTabChange(event) {
    this.setData({ activeTab: event.detail.index })
  },

  // ==================== 话题管理 ====================

  async loadTopics() {
    this.setData({ topicListLoading: true })
    try {
      const result = await listCommunityTopics()
      if (result.data && result.data.records) {
        this.setData({ communityTopics: result.data.records })
      }
    } catch (error) {
      console.error('加载话题失败:', error)
    } finally {
      this.setData({ topicListLoading: false })
    }
  },

  onTopicTitleInput(event) {
    this.setData({ newTopicTitle: event.detail })
  },

  onTopicDescInput(event) {
    this.setData({ newTopicDesc: event.detail })
  },

  onTopicIconInput(event) {
    this.setData({ newTopicIcon: event.detail })
  },

  async submitNewTopic() {
    if (!this.data.newTopicTitle) {
      wx.showToast({ title: '请输入话题标题', icon: 'none' })
      return
    }

    this.setData({ topicSubmitting: true })
    try {
      await createCommunityTopic({
        title: this.data.newTopicTitle,
        description: this.data.newTopicDesc,
        icon: this.data.newTopicIcon || '💬'
      })
      wx.showToast({ title: '话题发布成功', icon: 'success' })
      this.setData({ newTopicTitle: '', newTopicDesc: '', newTopicIcon: '💬' })
      this.loadTopics()
    } catch (error) {
      console.error('发布话题失败:', error)
      wx.showToast({ title: '发布失败', icon: 'none' })
    } finally {
      this.setData({ topicSubmitting: false })
    }
  },

  // ==================== 帖子管理 ====================

  onPostFilter(event) {
    const status = event.currentTarget.dataset.status
    this.setData({ postFilter: status, posts: [], postPageIndex: 0 })
    this.loadPosts()
  },

  async loadPosts() {
    this.setData({ postListLoading: true })
    try {
      const result = await adminListCommunityPosts({
        status: this.data.postFilter,
        pageSize: 15,
        pageIndex: this.data.postPageIndex
      })
      if (result.data) {
        const newPosts = (result.data.records || []).map(post => ({
          ...post,
          displayTime: this.formatTime(post.created_at)
        }))
        const posts = this.data.postPageIndex === 0
          ? newPosts
          : [...this.data.posts, ...newPosts]
        this.setData({
          posts,
          hasMorePosts: result.data.hasMore
        })
      }
    } catch (error) {
      console.error('加载帖子失败:', error)
      wx.showToast({ title: '加载失败', icon: 'none' })
    } finally {
      this.setData({ postListLoading: false })
    }
  },

  loadMorePosts() {
    if (this.data.postListLoading || !this.data.hasMorePosts) return
    this.setData({ postPageIndex: this.data.postPageIndex + 1 })
    this.loadPosts()
  },

  // 置顶/取消置顶
  async onTogglePin(event) {
    const postId = event.currentTarget.dataset.id
    const index = event.currentTarget.dataset.index
    try {
      const result = await togglePinCommunityPost(postId)
      const newPinned = result.data ? result.data.isPinned : !this.data.posts[index].is_pinned
      this.setData({ [`posts[${index}].is_pinned`]: newPinned })
      wx.showToast({ title: newPinned ? '已置顶' : '已取消置顶', icon: 'success' })
    } catch (error) {
      console.error('置顶操作失败:', error)
      wx.showToast({ title: '操作失败', icon: 'none' })
    }
  },

  // 隐藏帖子
  onHidePost(event) {
    const postId = event.currentTarget.dataset.id
    const index = event.currentTarget.dataset.index
    wx.showModal({
      title: '确认隐藏',
      content: '隐藏后帖子将不再对普通用户可见',
      success: async (res) => {
        if (!res.confirm) return
        try {
          await hideCommunityPost(postId)
          this.setData({ [`posts[${index}].status`]: 'hidden' })
          wx.showToast({ title: '已隐藏', icon: 'success' })
        } catch (error) {
          console.error('隐藏失败:', error)
          wx.showToast({ title: '操作失败', icon: 'none' })
        }
      }
    })
  },

  // 删除帖子
  onDeletePost(event) {
    const postId = event.currentTarget.dataset.id
    const index = event.currentTarget.dataset.index
    wx.showModal({
      title: '确认删除',
      content: '删除后不可恢复，确定删除该帖子吗？',
      confirmColor: '#ee0a24',
      success: async (res) => {
        if (!res.confirm) return
        try {
          await deleteCommunityPost(postId, true)
          const posts = [...this.data.posts]
          posts.splice(index, 1)
          this.setData({ posts })
          wx.showToast({ title: '已删除', icon: 'success' })
        } catch (error) {
          console.error('删除失败:', error)
          wx.showToast({ title: '删除失败', icon: 'none' })
        }
      }
    })
  },

  // ==================== 评论管理 ====================

  // 从帖子页签跳转查看评论
  onViewComments(event) {
    const postId = event.currentTarget.dataset.id
    const nickName = event.currentTarget.dataset.nick
    this.setData({
      selectedPostForComments: { postId, nickName },
      comments: [],
      commentPageIndex: 0,
      hasMoreComments: false,
      activeTab: 2
    })
    this.loadComments(postId)
  },

  async loadComments(postId) {
    const targetPostId = postId || (this.data.selectedPostForComments && this.data.selectedPostForComments.postId)
    if (!targetPostId) return

    this.setData({ commentListLoading: true })
    try {
      const result = await listCommunityComments(targetPostId, 20, this.data.commentPageIndex)
      if (result.data) {
        const newComments = (result.data.records || []).map(comment => ({
          ...comment,
          displayTime: this.formatTime(comment.created_at)
        }))
        const comments = this.data.commentPageIndex === 0
          ? newComments
          : [...this.data.comments, ...newComments]
        this.setData({
          comments,
          hasMoreComments: result.data.hasMore
        })
      }
    } catch (error) {
      console.error('加载评论失败:', error)
      wx.showToast({ title: '加载失败', icon: 'none' })
    } finally {
      this.setData({ commentListLoading: false })
    }
  },

  loadMoreComments() {
    if (this.data.commentListLoading || !this.data.hasMoreComments) return
    this.setData({ commentPageIndex: this.data.commentPageIndex + 1 })
    this.loadComments()
  },

  // 删除评论
  onDeleteComment(event) {
    const commentId = event.currentTarget.dataset.commentId
    const index = event.currentTarget.dataset.index
    const postId = this.data.selectedPostForComments.postId

    wx.showModal({
      title: '确认删除',
      content: '确定删除该评论吗？',
      confirmColor: '#ee0a24',
      success: async (res) => {
        if (!res.confirm) return
        try {
          await deleteCommunityComment(commentId, postId, true)
          const comments = [...this.data.comments]
          comments.splice(index, 1)
          this.setData({ comments })
          wx.showToast({ title: '已删除', icon: 'success' })
        } catch (error) {
          console.error('删除评论失败:', error)
          wx.showToast({ title: '删除失败', icon: 'none' })
        }
      }
    })
  },

  // ==================== 工具方法 ====================

  formatTime(dateValue) {
    if (!dateValue) return ''
    const date = new Date(dateValue)
    if (isNaN(date.getTime())) return ''

    const now = new Date()
    const diffMs = now - date
    const diffMinutes = Math.floor(diffMs / 60000)

    if (diffMinutes < 1) return '刚刚'
    if (diffMinutes < 60) return `${diffMinutes}分钟前`

    const diffHours = Math.floor(diffMinutes / 60)
    if (diffHours < 24) return `${diffHours}小时前`

    const diffDays = Math.floor(diffHours / 24)
    if (diffDays < 7) return `${diffDays}天前`

    const month = date.getMonth() + 1
    const day = date.getDate()
    return date.getFullYear() === now.getFullYear()
      ? `${month}月${day}日`
      : `${date.getFullYear()}年${month}月${day}日`
  }
})
