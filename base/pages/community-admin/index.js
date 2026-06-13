// 社区管理页面 - 话题/帖子/评论管理
const {
  createCommunityTopic,
  listCommunityTopics,
  adminListCommunityPosts,
  deleteCommunityPost,
  togglePinCommunityPost,
  hideCommunityPost,
  listCommunityComments,
  deleteCommunityComment,
  createCommunityActivity,
  listCommunityActivities,
  updateCommunityActivity
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
    hasMoreComments: false,

    // ===== 活动管理 =====
    activities: [],
    activityListLoading: false,
    hasMoreActivities: false,
    activityPageIndex: 0,
    showActivityForm: false,
    activityTitle: '',
    activityDesc: '',
    activityType: 'general',
    activityStartDate: '',
    activityEndDate: '',
    activitySubmitting: false,
    activityTypes: [
      { value: 'general', label: '通用活动' },
      { value: 'checkin', label: '打卡挑战' },
      { value: 'topic', label: '话题活动' },
      { value: 'share', label: '分享活动' }
    ]
  },

  onLoad() {
    const today = this.formatDate(new Date())
    this.setData({ activityStartDate: today })
    this.loadTopics()
    this.loadPosts()
    this.loadActivities()
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
          await deleteCommunityPost(postId)
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
          await deleteCommunityComment(commentId, postId)
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

  // ==================== 活动管理 ====================

  async loadActivities() {
    this.setData({ activityListLoading: true })
    try {
      const result = await listCommunityActivities({
        includeAll: true,
        pageSize: 20,
        pageIndex: this.data.activityPageIndex
      })
      if (result.data) {
        const records = (result.data.records || []).map(a => ({
          ...a,
          displayStart: this.formatDate(new Date(a.start_time)),
          displayEnd: a.end_time ? this.formatDate(new Date(a.end_time)) : '长期'
        }))
        const activities = this.data.activityPageIndex === 0
          ? records
          : [...this.data.activities, ...records]
        this.setData({
          activities,
          hasMoreActivities: result.data.hasMore
        })
      }
    } catch (error) {
      console.error('加载活动失败:', error)
    } finally {
      this.setData({ activityListLoading: false })
    }
  },

  toggleActivityForm() {
    this.setData({ showActivityForm: !this.data.showActivityForm })
  },

  onActivityTitleInput(event) {
    this.setData({ activityTitle: event.detail })
  },

  onActivityDescInput(event) {
    this.setData({ activityDesc: event.detail })
  },

  onActivityTypeChange(event) {
    this.setData({ activityType: event.currentTarget.dataset.detail })
  },

  onActivityStartDateChange(event) {
    this.setData({ activityStartDate: event.detail.value })
  },

  onActivityEndDateChange(event) {
    this.setData({ activityEndDate: event.detail.value })
  },

  async submitNewActivity() {
    if (!this.data.activityTitle) {
      wx.showToast({ title: '请输入活动标题', icon: 'none' })
      return
    }

    this.setData({ activitySubmitting: true })
    try {
      await createCommunityActivity({
        title: this.data.activityTitle,
        description: this.data.activityDesc,
        type: this.data.activityType,
        startTime: this.data.activityStartDate,
        endTime: this.data.activityEndDate || null,
        status: 'active'
      })
      wx.showToast({ title: '活动创建成功', icon: 'success' })
      this.setData({
        activityTitle: '',
        activityDesc: '',
        activityType: 'general',
        activityEndDate: '',
        showActivityForm: false,
        activityPageIndex: 0
      })
      this.loadActivities()
    } catch (error) {
      console.error('创建活动失败:', error)
      wx.showToast({ title: '创建失败', icon: 'none' })
    } finally {
      this.setData({ activitySubmitting: false })
    }
  },

  async onEndActivity(event) {
    const activityId = event.currentTarget.dataset.id
    const index = event.currentTarget.dataset.index
    wx.showModal({
      title: '确认结束',
      content: '结束后活动将不再显示在社区首页',
      success: async (res) => {
        if (!res.confirm) return
        try {
          await updateCommunityActivity(activityId, { status: 'ended' })
          this.setData({ [`activities[${index}].status`]: 'ended' })
          wx.showToast({ title: '已结束', icon: 'success' })
        } catch (error) {
          console.error('结束活动失败:', error)
          wx.showToast({ title: '操作失败', icon: 'none' })
        }
      }
    })
  },

  async onReactivateActivity(event) {
    const activityId = event.currentTarget.dataset.id
    const index = event.currentTarget.dataset.index
    try {
      await updateCommunityActivity(activityId, { status: 'active' })
      this.setData({ [`activities[${index}].status`]: 'active' })
      wx.showToast({ title: '已重新开启', icon: 'success' })
    } catch (error) {
      console.error('重新开启失败:', error)
      wx.showToast({ title: '操作失败', icon: 'none' })
    }
  },

  formatDate(date) {
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const d = String(date.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
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
