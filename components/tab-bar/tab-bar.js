// components/tab-bar/tab-bar.js
Component({
    properties: {
      current: {
        type: Number,
        value: 0
      }
    },
  
    methods: {
      switchTab(e) {
        const index = e.currentTarget.dataset.index;
        const path = e.currentTarget.dataset.path;
        
        if (this.properties.current === index) {
          return;
        }
        
        // 直接使用 redirectTo，因为这些都是主要页面
        wx.redirectTo({
          url: path,
          success: () => {
            console.log('导航成功:', path);
          },
          fail: (err) => {
            console.error('导航失败:', err);
            // 备用方案
            wx.navigateTo({
              url: path
            });
          }
        });
      }
    }
  })