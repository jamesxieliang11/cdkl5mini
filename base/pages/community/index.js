const { listCommunityPosts, listCommunityTopics, toggleCommunityLike, deleteCommunityPost } = require('../../utils/database.js')

Page({
  data: {
    topics: [],              // 话题列表
    selectedTopicId: '',     // 当前选中话题
    posts: [],               // 帖子列表
    loading: false,          // 加载状态
    hasMore: true,           // 是否有更多
    pageIndex: 0,            // 当前页码
    pageSize: 10             // 每页数量
  },

  onLoad() {
    this.loadTopics()
    this.loadPosts()
  },

  onShow() {
    // 每次页面显示时刷新列表（从详情页/发帖页返回后同步最新数据）
    this.refreshPosts()
  },

  // 下拉刷新
  onPullDownRefresh() {
    this.refreshPosts().then(() => {
      wx.stopPullDownRefresh()
    })
  },

  // 上拉加载更多
  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) {
      this.loadMorePosts()
    }
  },

  goBack() {
    wx.navigateBack()
  },

  // 加载话题列表
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

  // 加载帖子列表
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
        this.setData({
          posts: posts,
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

  // 加载更多
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
        const newPosts = this.formatPosts(result.data.records || [])
        this.setData({
          posts: [...this.data.posts, ...newPosts],
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

  // 刷新帖子列表
  async refreshPosts() {
    this.setData({ pageIndex: 0, hasMore: true })
    await this.loadPosts()
    await this.loadTopics()
  },

  // 格式化帖子数据
  formatPosts(posts) {
    // 获取话题标题映射
    const topicMap = {}
    this.data.topics.forEach(topic => {
      topicMap[topic._id] = topic.title
    })

    return posts.map(post => ({
      ...post,
      displayTime: this.formatTime(post.created_at),
      topicTitle: post.topic_id ? (topicMap[post.topic_id] || '') : ''
    }))
  },

  // 话题选择
  onTopicSelect(event) {
    const topicId = event.currentTarget.dataset.topicId
    if (topicId === this.data.selectedTopicId) return

    this.setData({
      selectedTopicId: topicId,
      posts: [],
      pageIndex: 0,
      hasMore: true
    })
    this.loadPosts()
  },

  // 点赞帖子
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
      posts[index].isLiked = result.data.isLiked
      posts[index].like_count = posts[index].like_count + (result.data.isLiked ? 1 : -1)
      this.setData({ posts })
    } catch (error) {
      console.error('点赞失败:', error)
      wx.showToast({ title: '操作失败', icon: 'none' })
    }
  },

  // 预览图片
  previewImage(event) {
    const { urls, current } = event.currentTarget.dataset
    const imageUrls = urls.map(img => img.fileID)
    wx.previewImage({
      current: current,
      urls: imageUrls
    })
  },

  // 进入帖子详情
  goToDetail(event) {
    const postId = event.currentTarget.dataset.postId
    wx.navigateTo({
      url: `/pages/community-detail/index?id=${postId}`
    })
  },

  // 长按帖子 - 弹出操作菜单（删除）
  onPostLongPress(event) {
    const { postId, userId, index } = event.currentTarget.dataset
    const currentUserId = wx.getStorageSync('userId') || ''
    const adminRole = wx.getStorageSync('adminRole') || ''
    const isAdmin = adminRole === 'admin' || adminRole === 'superadmin'
    const isOwner = userId === currentUserId

    // 只有作者本人或管理员可以删除
    if (!isOwner && !isAdmin) return

    wx.showActionSheet({
      itemList: ['删除帖子'],
      itemColor: '#ee0a24',
      success: (res) => {
        if (res.tapIndex === 0) {
          this.confirmDeletePost(postId, index, isAdmin)
        }
      }
    })
  },

  // 确认删除帖子
  confirmDeletePost(postId, index, isAdmin) {
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这条帖子吗？',
      confirmColor: '#ee0a24',
      success: async (res) => {
        if (res.confirm) {
          try {
            await deleteCommunityPost(postId, isAdmin)
            const posts = [...this.data.posts]
            posts.splice(index, 1)
            this.setData({ posts })
            wx.showToast({ title: '已删除', icon: 'success' })
          } catch (error) {
            console.error('删除帖子失败:', error)
            wx.showToast({ title: '删除失败', icon: 'none' })
          }
        }
      }
    })
  },

  // 进入发帖页
  goToPost() {
    this._needRefresh = true
    wx.navigateTo({
      url: '/pages/community-post/index'
    })
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

    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${month}-${day}`
  }
})
