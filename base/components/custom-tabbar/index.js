Component({
  data: {
    active: 'home'
  },

  lifetimes: {
    attached() {
      // 组件初始化时根据当前页面设置active状态
      this.updateActiveByCurrentPage()
    },

    ready() {
      // 组件准备完毕后开始监听页面变化
      this.startPageListener()
    },

    detached() {
      // 组件销毁时清理定时器
      if (this.pageCheckTimer) {
        clearInterval(this.pageCheckTimer)
      }
    }
  },

  methods: {
    switchTab(event) {
      const { path } = event.currentTarget.dataset;
      
      console.log('跳转到:', path);
      
      if (path) {
        wx.switchTab({ 
          url: path,
          success: () => {
            // 跳转成功后，延迟更新状态确保页面已切换
            setTimeout(() => {
              this.updateActiveByCurrentPage()
            }, 100)
          }
        });
      }
    },
    
    // 根据当前页面路径更新active状态
    updateActiveByCurrentPage() {
      const pages = getCurrentPages()
      if (pages.length === 0) return
      
      const currentPage = pages[pages.length - 1]
      const route = currentPage.route
      
      let active = 'home' // 默认值
      
      // 根据页面路径判断应该激活哪个tab
      if (route.includes('home')) {
        active = 'home'
      } else if (route.includes('schedule')) {
        active = 'schedule'
      } else if (route.includes('admin')) {
        active = 'admin'
      }
      
      // 只有当状态发生变化时才更新
      if (this.data.active !== active) {
        console.log('页面路径变化，更新tabbar状态:', route, '->', active)
        this.setData({ active })
      }
    },

    // 开始监听页面变化
    startPageListener() {
      // 使用定时器定期检查页面变化
      this.pageCheckTimer = setInterval(() => {
        this.updateActiveByCurrentPage()
      }, 500) // 每500ms检查一次
    },

    // 设置当前激活的tab（供外部调用）
    setActive(active) {
      console.log('外部设置tabbar状态:', active)
      if (this.data.active !== active) {
        this.setData({ active })
      }
    },

    // 获取当前激活的tab
    getActive() {
      return this.data.active
    },

    // 手动触发状态更新（供页面调用）
    updateState() {
      this.updateActiveByCurrentPage()
    }
  }
});