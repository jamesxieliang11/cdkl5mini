const app = getApp()
const { listCommunityPosts, listCommunityTopics, toggleCommunityLike, deleteCommunityPost, listCommunityActivities } = require('../../utils/database.js')

const AVATAR_COLORS = ['#34BFA3', '#FF6B6B', '#4ECDC4', '#A78BFA', '#F97316', '#06B6D4', '#EC4899', '#8B5CF6']

function getAvatarMeta(nickName, userId) {
  const name = nickName || '希'
  const char = name[0]
  const hash = (userId || name).split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  return { avatarChar: char, avatarColor: AVATAR_COLORS[hash % AVATAR_COLORS.length] }
}

Page({
  data: {
    locked: false,
    activities: [],
    topics: [],
    selectedTopicId: '',
    posts: [],
    leftPosts: [],
    rightPosts: [],
    loading: false,
    hasMore: true,
    pageIndex: 0,
    pageSize: 10
  },

  onLoad() {
    this.syncAppConfig()
    if (!this.data.locked) {
      this.loadTopics()
      this.loadPosts()
      this.loadActivities()
    }
  },

  onShow() {
    this.syncAppConfig()
    this.updateTabBarState()
    if (!this.data.locked) {
      this.refreshPosts()
      this.loadActivities()
    }
  },

  syncAppConfig() {
    const appConfig = app.globalData.appConfig || {}
    this.setData({ locked: !appConfig.features_enabled })
  },

  updateTabBarState() {
    if (typeof this.getTabBar === 'function') {
      const tabBar = this.getTabBar()
      if (tabBar && typeof tabBar.updateState === 'function') {
        tabBar.updateState()
      }
    }
  },

  onPullDownRefresh() {
    this.refreshPosts().then(() => {
      wx.stopPullDownRefresh()
    })
  },

  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) {
      this.loadMorePosts()
    }
  },

  async loadActivities() {
    try {
      const result = await listCommunityActivities({ status: 'active', pageSize: 5 })
      if (result.data && result.data.records) {
        const activities = result.data.records.map(a => ({
          ...a,
          displayTime: this.formatActivityTime(a.start_time, a.end_time)
        }))
        this.setData({ activities })
      }
    } catch (error) {
      console.log('加载活动跳过:', error.message || error)
    }
  },

  formatActivityTime(startTime, endTime) {
    if (!endTime) return '长期活动'
    const end = new Date(endTime)
    const now = new Date()
    const diffDays = Math.ceil((end - now) / 86400000)
    if (diffDays <= 0) return '即将结束'
    if (diffDays <= 3) return `剩余${diffDays}天`
    const m = String(end.getMonth() + 1).padStart(2, '0')
    const d = String(end.getDate()).padStart(2, '0')
    return `${m}-${d} 截止`
  },

  goToActivity(event) {
    const activityId = event.currentTarget.dataset.id
    wx.navigateTo({ url: `/pages/activity-detail/index?id=${activityId}` })
  },

  async loadTopics() {
    try {
      const result = await listCommunityTopics()
      if (result.data && result.data.records) {
        this.setData({ topics: result.data.records })
      }
    } catch (error) {
      console.error('加载话题失败:', error)
    }
  },

  async loadPosts() {
    if (this.data.loading) return
    this.setData({ loading: true })

    try {
      const result = await listCommunityPosts({
        topicId: this.data.selectedTopicId,
        pageSize: this.data.pageSize,
        pageIndex: 0
      })

      if (result.data) {
        const posts = this.formatPosts(result.data.records || [])
        const { left, right } = this.splitToColumns(posts)
        this.setData({
          posts,
          leftPosts: left,
          rightPosts: right,
          hasMore: result.data.hasMore,
          pageIndex: 0
        })
      }
    } catch (error) {
      console.error('加载帖子失败:', error)
      wx.showToast({ title: '加载失败', icon: 'none' })
    } finally {
      this.setData({ loading: false })
    }
  },

  async loadMorePosts() {
    if (this.data.loading) return
    this.setData({ loading: true })

    const nextPage = this.data.pageIndex + 1
    try {
      const result = await listCommunityPosts({
        topicId: this.data.selectedTopicId,
        pageSize: this.data.pageSize,
        pageIndex: nextPage
      })

      if (result.data) {
        const newPosts = this.formatPosts(result.data.records || [], this.data.posts.length)
        const allPosts = [...this.data.posts, ...newPosts]
        const { left, right } = this.splitToColumns(allPosts)
        this.setData({
          posts: allPosts,
          leftPosts: left,
          rightPosts: right,
          hasMore: result.data.hasMore,
          pageIndex: nextPage
        })
      }
    } catch (error) {
      console.error('加载更多失败:', error)
    } finally {
      this.setData({ loading: false })
    }
  },

  async refreshPosts() {
    this.setData({ pageIndex: 0, hasMore: true, posts: [], leftPosts: [], rightPosts: [] })
    await this.loadPosts()
    await this.loadTopics()
  },

  formatPosts(posts, startIndex = 0) {
    const topicMap = {}
    this.data.topics.forEach(topic => {
      topicMap[topic._id] = topic.title
    })

    return posts.map((post, i) => {
      const displayName = post.is_anonymous ? '匿名' : (post.nick_name || '希舞宝宝')
      const meta = post.is_anonymous
        ? { avatarChar: '匿', avatarColor: '#ccc' }
        : getAvatarMeta(post.nick_name, post.user_id)

      return {
        ...post,
        _originalIndex: startIndex + i,
        displayTime: this.formatTime(post.created_at),
        topicTitle: post.topic_id ? (topicMap[post.topic_id] || '') : '',
        displayName,
        avatarChar: meta.avatarChar,
        avatarColor: meta.avatarColor
      }
    })
  },

  splitToColumns(posts) {
    const left = []
    const right = []
    posts.forEach((post, i) => {
      if (i % 2 === 0) left.push(post)
      else right.push(post)
    })
    return { left, right }
  },

  onTopicSelect(event) {
    const topicId = event.currentTarget.dataset.topicId
    if (topicId === this.data.selectedTopicId) return

    this.setData({
      selectedTopicId: topicId,
      posts: [],
      leftPosts: [],
      rightPosts: [],
      pageIndex: 0,
      hasMore: true
    })
    this.loadPosts()
  },

  async onLikePost(event) {
    const { postId, index } = event.currentTarget.dataset
    const userId = wx.getStorageSync('userId')
    if (!userId) {
      wx.showToast({ title: '请先登录', icon: 'none' })
      return
    }

    try {
      const result = await toggleCommunityLike(postId, 'post_like')
      const posts = [...this.data.posts]
      const idx = parseInt(index)
      if (posts[idx]) {
        posts[idx].isLiked = result.data.isLiked
        posts[idx].like_count = posts[idx].like_count + (result.data.isLiked ? 1 : -1)
        const { left, right } = this.splitToColumns(posts)
        this.setData({ posts, leftPosts: left, rightPosts: right })
      }
    } catch (error) {
      console.error('点赞失败:', error)
      wx.showToast({ title: '操作失败', icon: 'none' })
    }
  },

  previewImage(event) {
    const { urls, current } = event.currentTarget.dataset
    const imageUrls = urls.map(img => img.fileID)
    wx.previewImage({ current, urls: imageUrls })
  },

  goToDetail(event) {
    const postId = event.currentTarget.dataset.postId
    wx.navigateTo({ url: `/pages/community-detail/index?id=${postId}` })
  },

  onPostLongPress(event) {
    const { postId, userId, index } = event.currentTarget.dataset
    const currentUserId = wx.getStorageSync('userId') || ''
    const adminRole = wx.getStorageSync('adminRole') || ''
    const isAdmin = adminRole === 'admin' || adminRole === 'superadmin'
    const isOwner = userId === currentUserId

    if (!isOwner && !isAdmin) return

    wx.showActionSheet({
      itemList: ['删除帖子'],
      itemColor: '#ee0a24',
      success: (res) => {
        if (res.tapIndex === 0) {
          this.confirmDeletePost(postId, parseInt(index))
        }
      }
    })
  },

  confirmDeletePost(postId, index) {
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这条帖子吗？',
      confirmColor: '#ee0a24',
      success: async (res) => {
        if (res.confirm) {
          try {
            await deleteCommunityPost(postId)
            const posts = [...this.data.posts]
            posts.splice(index, 1)
            // 重新计算 _originalIndex
            posts.forEach((p, i) => { p._originalIndex = i })
            const { left, right } = this.splitToColumns(posts)
            this.setData({ posts, leftPosts: left, rightPosts: right })
            wx.showToast({ title: '已删除', icon: 'success' })
          } catch (error) {
            console.error('删除帖子失败:', error)
            wx.showToast({ title: '删除失败', icon: 'none' })
          }
        }
      }
    })
  },

  goToPost() {
    wx.navigateTo({ url: '/pages/community-post/index' })
  },

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

    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${month}-${day}`
  }
})
