Component({
  data: {
    active: 'home'
  },

  methods: {
    onChange(event) {
      const { detail } = event;
      this.setData({ active: detail });
      console.log(111, detail)
      
      // 页面跳转逻辑
      const pageMap = {
        'home': '/pages/home/index',
        'schedule': '/pages/schedule/index',
        'appointment': '/pages/appointment/index',
        'admin': '/pages/admin/admin'
      };
      
      const url = pageMap[detail];
      if (url) {
        wx.switchTab({ url });
      }
    },
    
    // 设置当前激活的tab
    setActive(active) {
      console.log(222, active)
      // this.setData({ active });
    }
  }
});