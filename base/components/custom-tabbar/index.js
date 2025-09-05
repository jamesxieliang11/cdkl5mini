Component({
  data: {
    active: 'home'
  },

  methods: {
    switchTab(event) {
      const { path, index } = event.currentTarget.dataset;
      const tabNames = ['home', 'schedule', 'admin'];
      const active = tabNames[index];
      
      this.setData({ active });
      console.log('切换到:', active, path);
      
      if (path) {
        wx.switchTab({ url: path });
      }
    },
    
    // onChange(event) {
    //   const { detail } = event;
    //   this.setData({ active: detail });
    //   console.log(111, detail)
      
    //   // 页面跳转逻辑
    //   const pageMap = {
    //     'home': '/pages/home/index',
    //     'schedule': '/pages/schedule/index',
    //     'appointment': '/pages/appointment/index',
    //     'admin': '/pages/admin/admin'
    //   };
      
    //   const url = pageMap[detail];
    //   if (url) {
    //     wx.switchTab({ url });
    //   }
    // },
    
    // 设置当前激活的tab
    setActive(active) {
      console.log(222, active)
      // this.setData({ active });
    }
  }
});