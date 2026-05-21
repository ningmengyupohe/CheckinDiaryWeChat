// pages/project-template/project-template.js
Page({
    data: {
      templates: [
        {
          id: 1,
          icon: "🏃",
          name: "每日晨跑",
          frequency: "每日",
          reminderTime: "07:00",
          description: "培养晨跑习惯，开启活力一天",
          targetDays: 30
        },
        {
          id: 2,
          icon: "📚",
          name: "阅读学习",
          frequency: "每日",
          reminderTime: "21:00",
          description: "每天阅读30分钟，持续成长",
          targetDays: 21
        },
        {
          id: 3,
          icon: "💧",
          name: "喝水提醒",
          frequency: "每日",
          reminderTime: "09:00",
          description: "保持充足水分摄入，健康生活",
          targetDays: 14
        },
        {
          id: 4,
          icon: "🧘",
          name: "冥想放松",
          frequency: "每日",
          reminderTime: "22:00",
          description: "每天冥想10分钟，减轻压力",
          targetDays: 30
        },
        {
          id: 5,
          icon: "🏋️",
          name: "健身训练",
          frequency: "每周五次",
          reminderTime: "19:00",
          description: "规律健身，塑造健康体魄",
          targetDays: 60
        },
        {
          id: 6,
          icon: "🎨",
          name: "创意写作",
          frequency: "每周三次",
          reminderTime: "20:00",
          description: "培养写作习惯，记录生活灵感",
          targetDays: 21
        },
        {
          id: 7,
          icon: "🌙",
          name: "早睡早起",
          frequency: "每日",
          reminderTime: "23:00",
          description: "规律作息，改善睡眠质量",
          targetDays: 30
        },
        {
          id: 8,
          icon: "🍎",
          name: "健康饮食",
          frequency: "每日",
          reminderTime: "12:00",
          description: "均衡营养，控制饮食摄入",
          targetDays: 14
        }
      ]
    },
  
    useTemplate: function(e) {
      const templateId = e.currentTarget.dataset.id;
      const template = this.data.templates.find(item => item.id === templateId);
      
      if (!template) return;
      
      // 使用全局变量存储模板数据
      const app = getApp();
      if (!app.globalData) {
        app.globalData = {};
      }
      app.globalData.selectedTemplate = template;
      
      // 跳转到tabBar页面必须使用switchTab
      wx.switchTab({
        url: '/pages/operation/operation',
        success: () => {
          console.log('成功跳转到operation页面');
        },
        fail: (err) => {
          console.error('跳转失败:', err);
          wx.showToast({
            title: '跳转失败',
            icon: 'none'
          });
        }
      });
    },
  
    onLoad: function(options) {
      // 页面加载时执行
      console.log('project-template页面加载');
    }
  });